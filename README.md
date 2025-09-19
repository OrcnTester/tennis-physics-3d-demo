# 🎾 Tennis Physics — 3D Web Demo

**x–y (side view) + x–z (top view)** tennis ball flight simulation.  
Supports RK4/Euler integration, drag + Magnus (spin), spin decay, 3D wind, and single bounce.  
Also includes **OTM (optimize)** to automatically tune shots to target **x ≈ 19 m** and desired **z**.

> Demo file: `tennis_web_demo_3d.html`  
> No extra setup required — just double click. 😎

---

## 🚀 How to Run?

1. Save the `tennis_web_demo_3d.html` file.
2. Double click to open (Chrome/Edge recommended).
3. Adjust sliders on the left or click a **Preset** button.
4. Use **Simulate** to run instantly, or **Optimize** to auto-find the best shot.
5. Export trajectories with **CSV Export** (`t, x, y, z`).

---

## 🧭 UI and Outputs

- **Left panel** → Parameters (velocity, angles, spin, wind, integrator, bounce, etc.)
- **Right panel** →  
  - Two canvases:  
    - **x–y** → side view (height vs distance)  
    - **x–z** → top view (lateral deviation, court width)  
  - Console-style log: peak, landing, net clearance, out warnings  
  - Stats box: Peak y, Landing x/z, Net y@x=11.885

**Warnings:**
- ⚠️ Court out (length): x > 23.77 m
- ⚠️ Court out (width): |z| > courtW/2
- ✖ Net touch: failed to clear net
- ✔ Net clear: cleared safely

---

## 🎛️ Parameters

| Parameter | Description |
|-----------|-------------|
| **v0 (m/s)** | Launch velocity. 22–26 rally, higher for serve. |
| **Elev (°)** | Elevation angle. 3–10° practical. |
| **Azim φ (°)** | Azimuth (side angle). Negative=left, positive=right. |
| **z0 (m)** | Initial lateral offset (0 = center line). |
| **CD** | Drag coefficient (0.35–0.50 typical). |
| **CL** | Base lift coefficient (scaled by spin). |
| **spinX/Y/Z** | Spin components: `spinZ` topspin/backspin, `spinX` slice, `spinY` kick/tilt. |
| **tau (s)** | Spin decay time constant (3–6). |
| **Wind X/Y/Z (m/s)** | Constant wind vector. |
| **GustY amp (m/s)** | Small gust in Y for realism. |
| **Δt (s)** | Time step. 0.005 for visuals, 0.003–0.006 for accuracy. |
| **y0 (m)** | Initial height (~2.5 m). |
| **Integrator** | `Euler` or `RK4`. |
| **Bounce** | Enable single bounce (0/1). |
| **e** | Restitution (0.55–0.75). |
| **μ** | Friction factor. |
| **Target X/Z** | OTM target coordinates. |
| **Z Weight** | Weight for target Z in optimization. |
| **Court W (m)** | Court width (Singles: 8.23, Doubles: 10.97). |

---

## 🔘 Buttons

- **Simulate** → Run trajectory with current params.
- **Optimize** → OTM: scan v0, Elev, Azim.  
  Conditions: Net clearance ≥ 0.20 m, landing x within `[netX+0.5, baseline-0.57]`, inside court.  
- **CSV Export** → Download `trajectory3d.csv`.  
- **Presets** →  
  - Topspin Cross  
  - Flat Serve  
  - Kick Serve  

---

## 🧪 Example Scenarios

- **Safe rally (~19 m):**
  ```
  v0 ~24, elev 3.5–6°, spinZ 120–150, RK4, dt 0.004–0.006
  ```

- **Cross-court (z≈-2 m):**
  ```
  Preset “Topspin Cross” + Optimize targetZ=-2.0, zWeight=12
  ```

- **Serves:**
  - Flat: v0↑, elev 7–9°, low spinZ  
  - Slice: add spinX ±  
  - Kick: spinY ↑ + spinZ mid-high, tau 4–6  

---

## 🧠 Physics Model (short)

- m=0.057 kg, r=0.033 m, A≈0.0034 m², ρ=1.225 kg/m³  
- **Drag**: `Fd = -0.5 ρ A CD |v_rel| v_rel`  
- **Magnus**: `Fm ∝ (ω × v_rel) |v_rel|`,  
  `CL_eff = CL * min(1.2, |ω|R/|v_rel|)`  
  `ω(t)=ω0 e^(-t/τ)`  
- **Gravity**: g=(0, -9.81, 0)  
- **Bounce**: vy← -e·vy, vx,z←(1-μ)·vx,z  

---

## 🧯 Troubleshooting

- **Always landing out?** → v0 too high + low elev. Fix: lower v0 (22–26), elev ~3.5–6°, add topspin.  
- **Hitting net?** → Raise elev by 0.5–1° or +1 m/s v0. Reduce spinZ if it drops too fast.  
- **OTM too slow?** → Narrow ranges (v0: 22–26, elev: 3–8, azim: -4–4). Keep step=0.5.  

---

## 📦 File Layout

- `tennis_web_demo_3d.html` → single file (UI + physics + draw + OTM).  

---

## 📤 CSV Format

```
t,x,y,z
0.000000,0.000000,2.500000,0.000000
0.005000,0.139...,2.53...,0.01...
...
```

---

## 📌 Roadmap

- Serve origin presets (deuce/ad court)  
- Multi-bounce + spin-surface interactions  
- Target overlay (mini x–z map)  
- JSON import/export for sharing presets  

---

## ✨ License

Fork, try, tweak. PR/issues welcome → **“code + court craft” together rock.** 🎾
