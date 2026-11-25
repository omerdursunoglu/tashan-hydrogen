# Tokat Taşhan (Voyvoda Han, 1631) — 3B Mimari Simülasyon

> Tokat Taşhan (Voyvoda Han, 1631) yapısına odaklanan; birinci şahıs (First-Person) bakış açısıyla gezilebilir, yüksek detaylı ve mimari doğrulukta 3B WebGL simülasyonu.

🔗 **Canlı Demo (GitHub Pages):** [https://omerdursunoglu.github.io/tashan-hydrogen/](https://omerdursunoglu.github.io/tashan-hydrogen/)

---

## 🏛️ Mimari Özellikler & Gerçekçilik

- **Ölçüler:** `ARCHITECTURE_SPEC.md` belgesindeki tarihî röleve ölçülerine tam sadakat (dış boyutlar: ~80.80 m × 52.60 m; avlu ayak aksı: ~53.35 m × 28.20 m).
- **İki Katlı Revak Sistemi:** Zemin ve üst katta sivri/yuvarlak Osmanlı kemerleri, pahlı kaideler, kilit taşları (keystone) ve beşik/çapraz tonozlu koridor tavanları.
- **Köşk Mescit & Taçkapı:** Doğu cephesindeki anıtsal taçkapı girişi ve avluya taşan kubbeli Köşk Mescit.
- **Dükkân Cepheleri:** Derinlikli taş söveler, eskitilmiş ahşap kanatlı kapılar ve dövme demir kepenk parmaklıkları.
- **Avlu & Peyzaj:** Arnavut kaldırımı döşemesi, sekizgen taş şadırvan havuzu, taş bordürlü yeşil alanlar, yapraklı ulu çınarlar, çay bahçesi oturma alanları ve demir fenerler.
- **Çatı Sistemi:** 4 yöne eğimli alaturka kiremit çatı, ahşap saçak altları ve mertek çıkıntıları.

---

## 🎮 Kontroller

| Eylem | Tuş / Giriş |
|---|---|
| **Bakış** | Fare (Ekrana tıklayarak Pointer Lock modunu başlatın) |
| **Yürüme** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| **Hızlı Yürüyüş** | <kbd>Shift</kbd> |
| **İmleci Serbest Bırak** | <kbd>ESC</kbd> |
| **Günün Saati** | Sağ üst menüden: *Öğle*, *Altın Saat*, *Akşam Fenerleri* |

Kullanıcı zemin kat avlusundan doğu girişinin iki yanındaki simetrik taş merdivenleri yürüyerek çıkabilir, 2. kat revak koridorlarında dolaşıp avluyu yukarıdan seyredebilir. Duvar ve kemer çarpışmaları `three-mesh-bvh` ile fiziksel olarak engellenmektedir.

---

## 🛠️ Teknoloji Yığını

- **Motor & Çekirdek:** [Three.js](https://threejs.org/) (r172)
- **Paketleyici & Sunucu:** [Vite](https://vite.dev/)
- **Fizik & Çarpışma:** [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)
- **Görüntü İşleme (Post-processing):** `postprocessing`
  - `N8AOPostPass` (Kemer içleri ve taş köşeleri için gerçekçi Ambient Occlusion)
  - `BloomEffect` (Fener ve güneş parıltısı)
  - `ToneMappingEffect` (`ACESFilmicToneMapping`)
  - `SMAAEffect` (Anti-aliasing)
- **Kaplamalar & Işıklandırma:** Poly Haven CC0 PBR (Kesme taş, tuğla, Arnavut kaldırımı, alaturka kiremit, ahşap, sıva, demir ve 2K Golden Hour HDRI)

---

## 💻 Yerel Geliştirme

Projeyi yerel makinenizde çalıştırmak için:

```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev

# Üretim derlemesi alın
npm run build

# Derlemeyi yerel olarak önizleyin
npm run preview
```

---

## 📄 Lisans

Bu proje Tokat'ın tarihî mirasını dijital ortamda yaşatmak amacıyla geliştirilmiştir. Kullanılan dokular ve HDRI haritaları CC0 lisanslıdır.
