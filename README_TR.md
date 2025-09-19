# 🎾 Tennis Physics — 3D Web Demo

**x–y (yan görünüm) + x–z (üstten görünüm)** ile tenis topu uçuşu simülasyonu.  
RK4/Euler integrasyonu, drag + Magnus (spin), spin çürümesi, 3D rüzgâr ve tek sekme desteği.  
Ayrıca **OTM (optimize)** ile hedef **x ≈ 19 m** ve hedef **z**’ye otomatik ayarlama.

> Demo dosyası: `tennis_web_demo_3d.html`  
> Açmak için ekstra kurulum gerekmez — sadece çift tıklayın. 😎

---

## 🚀 Nasıl Çalıştırılır?

1. `tennis_web_demo_3d.html` dosyasını kaydet.
2. Dosyaya **çift tıkla** (Chrome/Edge önerilir).
3. Soldaki slider’ları ayarla veya **Preset** butonlarından birine bas.
4. **Simüle** ile anlık sonucu gör, veya **Optimize** ile otomatik en iyi atışı bul.
5. **CSV Export** ile eğriyi indir (`t, x, y, z`).

---

## 🧭 Arayüz ve Çıktılar

- **Sol panel** → Parametreler (hız, açı, spin, rüzgâr, integrator, bounce vs.)
- **Sağ panel** →  
  - İki canvas:  
    - **x–y** → yan görünüm (yükseklik vs mesafe)  
    - **x–z** → üstten görünüm (yana sapma, court genişliği)  
  - Console log: Ayrıntılı özet (peak, iniş, net clearance, out uyarıları)  
  - Stats kutusu: Peak y, Landing x/z, Net y@x=11.885

**Uyarılar:**
- ⚠️ Court out (length): x > 23.77 m
- ⚠️ Court out (width): |z| > courtW/2
- ✖ Net touch: fileye takıldı
- ✔ Net clear: fileyi geçti

---

## 🎛️ Parametreler

| Parametre | Açıklama |
|-----------|----------|
| **v0 (m/s)** | Fırlatma hızı. Rally için 22–26, servis için daha yüksek. |
| **Elev (°)** | Yükseliş açısı. 3–10° arası tipik. |
| **Azim φ (°)** | Yatay sapma. Negatif: sola, pozitif: sağa. |
| **z0 (m)** | Başlangıç yan konumu (0 orta çizgi). |
| **CD** | Sürükleme katsayısı (0.35–0.50 tipik). |
| **CL** | Temel lift katsayısı (spin ile ölçeklenir). |
| **spinX/Y/Z** | Spin bileşenleri: `spinZ` topspin, `spinX` slice, `spinY` kick. |
| **tau (s)** | Spin çürüme zamanı (3–6). |
| **Wind X/Y/Z (m/s)** | Rüzgâr bileşenleri. |
| **GustY amp (m/s)** | Y’de hafif salınım (maç hissi). |
| **Δt (s)** | Zaman adımı. Görsel için 0.005, hassasiyet için 0.003–0.006. |
| **y0 (m)** | Başlangıç yüksekliği (~2.5 m). |
| **Integrator** | `Euler` veya `RK4`. |
| **Bounce** | Tek sekme (0/1). |
| **e** | Restitution (0.55–0.75). |
| **μ** | Sürtünme katsayısı. |
| **Target X/Z** | OTM hedef koordinatları. |
| **Z Weight** | OTM’de hedef Z önemi. |
| **Court W (m)** | Kort genişliği (Singles: 8.23, Doubles: 10.97). |

---

## 🔘 Butonlar

- **Simüle** → Parametrelerle uçuşu hesaplar ve çizer.
- **Optimize** → OTM: v0, Elev, Azim arar.  
  Koşullar: Net marj ≥ 0.20 m, iniş x aralığı `[netX+0.5, baseline-0.57]`, court içinde.
- **CSV Export** → `trajectory3d.csv` indirir.
- **Preset’ler** →  
  - Topspin Cross  
  - Flat Serve  
  - Kick Serve  

---

## 🧪 Örnek Senaryolar

- **Güvenli rally (içeri ~19 m):**
  ```
  v0 ~24, elev 3.5–6°, spinZ 120–150, RK4, dt 0.004–0.006
  ```

- **Cross-court (z≈-2 m):**
  ```
  Preset “Topspin Cross” + Optimize targetZ=-2.0, zWeight=12
  ```

- **Servisler:**
  - Flat: v0↑, elev 7–9°, spinZ düşük  
  - Slice: spinX ± ile yön oyunu  
  - Kick: spinY ↑ + spinZ orta-yüksek, tau 4–6  

---

## 🧠 Fizik Modeli (kısa)

- m=0.057 kg, r=0.033 m, A≈0.0034 m², ρ=1.225 kg/m³  
- **Drag**: `Fd = -0.5 ρ A CD |v_rel| v_rel`  
- **Magnus**: `Fm ∝ (ω × v_rel) |v_rel|`,  
  `CL_eff = CL * min(1.2, |ω|R/|v_rel|)`  
  `ω(t)=ω0 e^(-t/τ)`  
- **Yerçekimi**: g=(0, -9.81, 0)  
- **Sekme**: vy← -e·vy, vx,z←(1-μ)·vx,z  

---

## 🧯 Troubleshooting

- **Sürekli out mu?** → v0 çok yüksek + açı düşük. Çözüm: v0 22–26, elev 3.5–6°, spinZ artır.  
- **Net’e mi takılıyor?** → Elev’i +0.5–1° artır veya v0 +1 m/s.  
- **OTM çok yavaş mı?** → Aralıkları daralt (v0: 22–26, elev: 3–8, azim: -4–4).  

---

## 📦 Dosya Yapısı

- `tennis_web_demo_3d.html` → tek dosya (UI + fizik + çizim + OTM).  

---

## 📤 CSV Formatı

```
t,x,y,z
0.000000,0.000000,2.500000,0.000000
0.005000,0.139...,2.53...,0.01...
...
```

---

## 📌 Yol Haritası

- Serve origin preset (deuce/ad court)  
- Çoklu sekme + spin-zemin etkileşimi  
- Hedef nişangâh overlay (x–z mini harita)  
- JSON import/export (param preset paylaşımı)  

---

## ✨ Lisans

Forkla, dene, uyarla. PR/issue aç → **“code + court craft” birlikte güzel.** 🎾
