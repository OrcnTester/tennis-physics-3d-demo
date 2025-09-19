#!/usr/bin/env node
// Tennis Physics CLI — 3D (x,y,z) Euler/RK4 + Net & Court checks + OTM + Spin Decay + Wind3D + Bounce + Export
// Orçun 3D final 😎
//
// Örnekler:
//  node index.js --v0 30 --deg 7 --phi 5 --CD 0.40 --CL 0.10 --spinZ 120 --integrator rk4
//  node index.js --v0 28 --deg 6 --CD 0.40 --CL 0.10 --spinZ 120 --windX -1.5 --gustA 0.5 --gustF 1.2
//  node index.js --v0 22 --deg 8 --CD 0.35 --CL 0.08 --spinZ 100 --bounces 1 --e 0.65 --mu 0.10 --out traj.json
//  node index.js --optimize --vmin 22 --vmax 34 --dmin 3 --dmax 14 --pmin -6 --pmax 6 --CD 0.40 --CL 0.10 --integrator rk4

import fs from 'node:fs';


// ---------- Arg parse ----------
function parseArgs() {
    const m = new Map(); const a = process.argv.slice(2);
    for (let i = 0; i < a.length; i++) {
        const k = a[i];
        if (k.startsWith('--')) {
            const key = k.replace(/^--/, '');
            const val = (i + 1 < a.length && !a[i + 1].startsWith('--')) ? a[++i] : 'true';
            m.set(key, val);
        }
    } return m;
}
const args = parseArgs();

// ---------- Physical constants & defaults ----------
const P = {
    rho: parseFloat(args.get('rho') ?? 1.225),   // air density (kg/m^3)
    A: parseFloat(args.get('A') ?? 0.0034),  // ball cross-section (m^2)
    CD: parseFloat(args.get('CD') ?? 0.47),    // drag coeff
    CL: parseFloat(args.get('CL') ?? 0.20),    // base lift coeff (scaled by spin)
    m: parseFloat(args.get('m') ?? 0.057),   // mass (kg)
    g: parseFloat(args.get('g') ?? 9.81),    // gravity (m/s^2)
    dt: parseFloat(args.get('dt') ?? 0.005),   // timestep (s)
    y0: parseFloat(args.get('y0') ?? 2.5),     // initial height (m)
    netX: parseFloat(args.get('netX') ?? 11.885),  // net plane x
    netH: parseFloat(args.get('netH') ?? 0.914),   // net height
    courtL: 23.77,                                  // length (baseline to baseline)
    courtW: 8.23,                                   // singles width (x baseline)
    R: parseFloat(args.get('R') ?? 0.033),   // ball radius (m)
};

// court genişliği override (singles varsayılan 8.23, doubles için 10.97)
P.courtW = parseFloat(args.get('courtW') ?? P.courtW);

// OTM’e hedef Z ve ağırlık
const targetZ = parseFloat(args.get('targetz') ?? 0.0);     // hedef yanal nokta (m) - orta çizgi = 0
const zweight = parseFloat(args.get('zweight') ?? 8.0);     // z hatasına verilen ağırlık

const measure = String(args.get('measure') ?? 'final').toLowerCase(); // 'first' | 'final'


// ---------- Shot & env params ----------
const v0 = parseFloat(args.get('v0') ?? 28.0); // speed (m/s)
const deg = parseFloat(args.get('deg') ?? 6.0);  // elevation angle (deg)
const phi = parseFloat(args.get('phi') ?? 0.0);  // azimuth angle (deg) (+z to the right)
const z0 = parseFloat(args.get('z0') ?? 0.0);  // initial lateral position (m)

// Spin vector (rps-scale). If only --spin given, map to spinZ.
const spinX0 = parseFloat(args.get('spinX') ?? 0);
const spinY0 = parseFloat(args.get('spinY') ?? 0);
const spinZ0 = parseFloat(args.get('spinZ') ?? (args.has('spin') ? parseFloat(args.get('spin')) : 100));
const tau = parseFloat(args.get('tau') ?? 4.0); // spin decay time constant (s)

// Wind 3D (constant) + optional Y-gust
const windX = parseFloat(args.get('windX') ?? args.get('wind') ?? 0);
const windY = parseFloat(args.get('windY') ?? 0);
const windZ = parseFloat(args.get('windZ') ?? 0);
const gustA = parseFloat(args.get('gustA') ?? args.get('gust') ?? 0);
const gustF = parseFloat(args.get('gustF') ?? 0.8);
const gustPhi = parseFloat(args.get('gustPhi') ?? Math.PI / 3);

// Bounce model
const bouncesMax = parseInt(args.get('bounces') ?? 0, 10); // 0 default, 1 = single bounce
const e_rest = parseFloat(args.get('e') ?? 0.65); // restitution
const mu_slide = parseFloat(args.get('mu') ?? 0.10); // tangential loss

// Output export
const outPath = args.get('out') ?? ''; // .csv or .json

// Integrator & OTM
const integrator = String(args.get('integrator') || 'euler').toLowerCase();
const optimize = args.has('optimize');
const vmin = parseFloat(args.get('vmin') ?? 24);
const vmax = parseFloat(args.get('vmax') ?? 34);
const dmin = parseFloat(args.get('dmin') ?? 3);
const dmax = parseFloat(args.get('dmax') ?? 14);
const pmin = parseFloat(args.get('pmin') ?? -6);  // phi range for OTM
const pmax = parseFloat(args.get('pmax') ?? 6);
const vstep = parseFloat(args.get('vstep') ?? 0.5);
const dstep = parseFloat(args.get('dstep') ?? 0.5);
const pstep = parseFloat(args.get('pstep') ?? 0.5);
const margin = parseFloat(args.get('margin') ?? 0.20);
const targetX = parseFloat(args.get('targetx') ?? 19.0);
const minLand = P.netX + 0.5;
const maxLand = Math.min(P.courtL - 0.57, 23.2);

// ---------- 3D Vec utils ----------
const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
const add3 = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub3 = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul3 = (a, k) => v3(a.x * k, a.y * k, a.z * k);
const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const mag3 = a => Math.hypot(a.x, a.y, a.z);
const cross3 = (a, b) => v3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
);

// ---------- Wind & Spin ----------
function wind3(t) {
    const wy = gustA ? gustA * Math.sin(2 * Math.PI * gustF * t + gustPhi) : windY;
    return v3(windX, wy, windZ);
}
function omega(t) {
    const g = Math.exp(-t / Math.max(1e-6, tau));
    return v3(spinX0 * g, spinY0 * g, spinZ0 * g);
}

// ---------- Forces ----------
function drag3(vrel) {
    const s = 0.5 * P.rho * P.A * P.CD * mag3(vrel);
    return v3(-s * vrel.x, -s * vrel.y, -s * vrel.z);
}
// Magnus: Fm ~ k * (ω̂ × vrel), where k = 0.5 * rho * A * CL_eff * |vrel|
// CL_eff = CL * clamp(|ω| R / |vrel|, 0..1.2)
function magnus3(vrel, t) {
    const speed = Math.max(1e-6, mag3(vrel));
    const omg = omega(t);
    const omgMag = mag3(omg);
    if (omgMag < 1e-8) return v3(0, 0, 0);
    const S = Math.min(1.2, (omgMag * P.R) / speed);
    const CL_eff = P.CL * S;
    const k = 0.5 * P.rho * P.A * CL_eff * speed;
    const ohat = mul3(omg, 1 / omgMag);
    const c = cross3(ohat, vrel);
    return mul3(c, k);
}

// ---------- Derivative & Integrators ----------
function deriv(state) {
    const w = wind3(state.t);
    const vrel = sub3(state.v, w);
    const FD = drag3(vrel);
    const FM = magnus3(vrel, state.t);
    const F = add3(FD, FM);
    const a = add3(v3(F.x / P.m, F.y / P.m, F.z / P.m), v3(0, -P.g, 0)); // a = g + (F/m)
    return { dx: state.v, dv: a };
}

function stepEuler(s, h) {
    const k = deriv(s);
    return { x: add3(s.x, mul3(k.dx, h)), v: add3(s.v, mul3(k.dv, h)), t: s.t + h, bleft: s.bleft };
}
function stepRK4(s, h) {
    const k1 = deriv(s);
    const s2 = { x: add3(s.x, mul3(k1.dx, h / 2)), v: add3(s.v, mul3(k1.dv, h / 2)), t: s.t + h / 2, bleft: s.bleft };
    const k2 = deriv(s2);
    const s3 = { x: add3(s.x, mul3(k2.dx, h / 2)), v: add3(s.v, mul3(k2.dv, h / 2)), t: s.t + h / 2, bleft: s.bleft };
    const k3 = deriv(s3);
    const s4 = { x: add3(s.x, mul3(k3.dx, h)), v: add3(s.v, mul3(k3.dv, h)), t: s.t + h, bleft: s.bleft };
    const k4 = deriv(s4);
    const x = add3(s.x, add3(mul3(k1.dx, h / 6), add3(mul3(k2.dx, h / 3), add3(mul3(k3.dx, h / 3), mul3(k4.dx, h / 6)))));
    const v = add3(s.v, add3(mul3(k1.dv, h / 6), add3(mul3(k2.dv, h / 3), add3(mul3(k3.dv, h / 3), mul3(k4.dv, h / 6)))));
    return { x, v, t: s.t + h, bleft: s.bleft };
}

// ---------- Simulation (3D) ----------
function simulate({ v0, deg, phi, z0, integrator }) {
    let firstTouchIndex = -1; // sekme varsa ilk yere değdiği index
    const h = P.dt, rad = deg * Math.PI / 180, phir = phi * Math.PI / 180;
    const vx = v0 * Math.cos(rad) * Math.cos(phir);
    const vz = v0 * Math.cos(rad) * Math.sin(phir);
    const vy = v0 * Math.sin(rad);
    let s = { x: v3(0, P.y0, z0), v: v3(vx, vy, vz), t: 0, bleft: bouncesMax };

    const X = [s.x], V = [s.v], T = [s.t];
    let landed = -1, bounced = false;
    const step = (integrator === 'rk4') ? stepRK4 : stepEuler;

    for (let i = 1; i < 120000; i++) {
        s = step(s, h);

        // ground / bounce
        if (s.x.y <= 0) {
            if (firstTouchIndex < 0) firstTouchIndex = i;

            if (s.bleft > 0 && s.v.y < 0) {
                s.x.y = 0;
                s.v.y = -e_rest * s.v.y;       // normal
                s.v.x = s.v.x * (1 - mu_slide); // tangential
                s.v.z = s.v.z * (1 - mu_slide);
                s.bleft -= 1;
                bounced = true;
            } else {
                landed = i;
                X.push(s.x); V.push(s.v); T.push(s.t);
                break;
            }
        }

        X.push(s.x); V.push(s.v); T.push(s.t);
        if (s.x.x > P.courtL + 5) { landed = i; break; }
    }

    return { X, V, T, landed, bounced, firstTouchIndex };
}

// ---------- Metrics ----------
function maxY(X, n) { let m = -Infinity; for (let i = 0; i < n; i++) m = Math.max(m, X[i].y); return m; }
function lastXZ(X, n) { const p = X[Math.max(0, n - 1)]; return { x: p.x, z: p.z }; }
function yAtX3D(X, n, q) {
    for (let i = 1; i < n; i++) {
        const a = X[i - 1], b = X[i];
        if (a.x <= q && q <= b.x) {
            const t = (q - a.x) / (b.x - a.x);
            return a.y + t * (b.y - a.y);
        }
    } return NaN;
}

// ---------- Export ----------
function exportData(outPath, X, T) {
    if (!outPath) return;
    const n = X.length;
    if (outPath.toLowerCase().endsWith('.csv')) {
        const lines = ['t,x,y,z'];
        for (let i = 0; i < n; i++) lines.push(`${T[i].toFixed(6)},${X[i].x.toFixed(6)},${X[i].y.toFixed(6)},${X[i].z.toFixed(6)}`);
        fs.writeFileSync(outPath, lines.join('\n'));
        console.log(`💾 CSV yazıldı: ${outPath}`);
    } else if (outPath.toLowerCase().endsWith('.json')) {
        const arr = X.map((p, i) => ({ t: +T[i].toFixed(6), x: +p.x.toFixed(6), y: +p.y.toFixed(6), z: +p.z.toFixed(6) }));
        fs.writeFileSync(outPath, JSON.stringify(arr, null, 2));
        console.log(`💾 JSON yazıldı: ${outPath}`);
    } else {
        console.log(`⚠️ Bilinmeyen uzantı: ${outPath} (desteklenen: .csv, .json)`);
    }
}
// ---------- Report ----------
function report(sim, params) {
  // Önce sim'den alanları çek
  const { X, T, landed, bounced, firstTouchIndex } = sim;

  // Hangi noktayı raporlayacağımızı seç (ilk temas mı final mi?)
  const pickIndex = (() => {
    if (measure === 'first' && typeof firstTouchIndex === 'number' && firstTouchIndex > 0) {
      return firstTouchIndex;
    }
    return (landed > 0) ? landed : X.length;
  })();
  const n = Math.max(1, pickIndex); // koruma

  // Metriği etiketle
  const measLabel = (measure === 'first') ? 'FIRST CONTACT' : 'FINAL LANDING';

  // İstatistikler
  const peak = maxY(X, n);
  const { x: landx, z: landz } = lastXZ(X, n);
  const yNet = yAtX3D(X, n, P.netX);

  console.log(`\n=== Trajectory (${params.integrator === 'rk4' ? 'RK4' : 'Euler'}) — 3D ===`);
  console.log("x(t+Δt) = x(t) + v(t)·Δt");
  console.log("v(t+Δt) = v(t) + a(t)·Δt,  a(t) = g + (Fd + Fm)/m\n");
  console.log(`Launch: v0=${params.v0.toFixed(2)} m/s @ elev=${params.deg.toFixed(1)}°, azim=${params.phi.toFixed(1)}°, y0=${P.y0.toFixed(2)} m, z0=${params.z0.toFixed(2)} m`);
  console.log(`Wind: (x=${windX.toFixed(2)}, y=${windY.toFixed(2)} + gustA=${gustA.toFixed(2)} @ ${gustF.toFixed(2)}Hz, z=${windZ.toFixed(2)})`);
  console.log(`[${measLabel}]`);
  console.log(`Peak y ≈ ${peak.toFixed(2)} m`);
  console.log(`Landing ≈ x:${landx.toFixed(2)} m, z:${landz.toFixed(2)} m`);

  // Court-out checks
  const halfW = P.courtW / 2;
  if (landx > P.courtL) {
    console.log(`⚠️ Court out (length): x=${landx.toFixed(2)} m > ${P.courtL}`);
  }
  if (Math.abs(landz) > halfW) {
    console.log(`⚠️ Court out (width): |z|=${Math.abs(landz).toFixed(2)} m > ${halfW}`);
  }

  // Net check
  if (!Number.isFinite(yNet)) {
    console.log(`Net check: ball lands before net plane (x=${P.netX.toFixed(3)})`);
  } else {
    console.log(`Net check: y(x=${P.netX.toFixed(3)}) = ${yNet.toFixed(2)} ${yNet > P.netH ? '>' : '<='} ${P.netH}`);
  }

  if (bounced) console.log(`⤴️ Bounce: e=${e_rest}, μ=${mu_slide} (single)`);

  // Final raporda, ilk teması ayrıca bilgi amaçlı göster (opsiyonel)
  if (typeof firstTouchIndex === 'number' && firstTouchIndex > 0 && measure !== 'first') {
    const p = X[firstTouchIndex];
    console.log(`First contact at x=${p.x.toFixed(2)} m, z=${p.z.toFixed(2)} m (use --measure first to report this point)`);
  }

  // Export (seçilen n'e kadar)
  exportData(outPath, X.slice(0, n), T.slice(0, n));

  return { peak, landx, landz, yNet };
}


// ---------- OTM (3D: v0, deg, phi) ----------
function costFn3D(result, v0) {
    const { landx, landz, yNet } = result;
    // must clear net by margin
    const netPenalty = (!Number.isFinite(yNet) || (yNet - P.netH) < margin) ? 1e6 : 0;
    // stay in singles court width
    const widthPenalty = (Math.abs(landz) <= P.courtW / 2) ? 0 : 5e5 + (Math.abs(landz) - P.courtW / 2) * 1e4;
    // target landing x in-court
    const inCourt = (landx >= minLand && landx <= maxLand);
    const landPenalty = inCourt ? (landx - targetX) ** 2 : 1e5 + Math.abs(landx - targetX) * 100;

    const zAimPenalty = zweight * (landz - targetZ) ** 2;

    // energy preference
    const energy = 0.5 * v0 * v0;
    const A = 1.0, B = 10.0, C = 0.5, D = 1.0, E = 1.0;
    return A * netPenalty + B * landPenalty + C * energy + D * widthPenalty + E * zAimPenalty;
}
function optimize3D() {
    let best = null;
    for (let V = vmin; V <= vmax + 1e-9; V += vstep) {
        for (let D = dmin; D <= dmax + 1e-9; D += dstep) {
            for (let PHL = pmin; PHL <= pmax + 1e-9; PHL += pstep) {
                const sim = simulate({ v0: V, deg: D, phi: PHL, z0, integrator });
                const { X, landed } = sim;
                const n = (landed > 0) ? landed : X.length;
                const { x: landx, z: landz } = lastXZ(X, n);
                const yNet = yAtX3D(X, n, P.netX);
                const score = costFn3D({ landx, landz, yNet }, V);
                if (!best || score < best.score) {
                    best = { V, D, PHL, score, landx, landz, yNet };
                }
            }
        }
    }
    return best;
}

// ---------- Run ----------
if (optimize) {
    console.log(">>> OTM (3D) başlıyor...");
    console.log(`Aralıklar: v0=[${vmin}, ${vmax}] step=${vstep} | elev=[${dmin}, ${dmax}] step=${dstep} | azim=[${pmin}, ${pmax}] step=${pstep}`);
    console.log(`Koşul: Net marj ≥ ${margin.toFixed(2)} m, Hedef iniş x ≈ ${targetX} m, singles width içinde\n`);
    const best = optimize3D();
    if (!best) { console.log("OTM: uygun çözüm yok."); process.exit(0); }
    console.log(`OTM Sonuç: v0=${best.V.toFixed(2)} m/s, elev=${best.D.toFixed(1)}°, azim=${best.PHL.toFixed(1)}°, ` +
        `land≈(x:${best.landx.toFixed(2)}, z:${best.landz.toFixed(2)}), ` +
        (Number.isFinite(best.yNet) ? `y_net≈${best.yNet.toFixed(2)} m` : `y_net=NaN`) +
        `, score=${best.score.toFixed(1)}`);
    const sim = simulate({ v0: best.V, deg: best.D, phi: best.PHL, z0, integrator });
    report(sim, { v0: best.V, deg: best.D, phi: best.PHL, z0, integrator });
} else {
    const sim = simulate({ v0, deg, phi, z0, integrator });
    report(sim, { v0, deg, phi, z0, integrator });
}
