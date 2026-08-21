# Design System — SensorHub Dashboard

Referensi visual: dashboard monitoring "Grow Room" bertema gelap dengan sidebar
navigasi ikon, kartu statistik ber-sparkline/progress/gauge, dan aksen warna
cerah di atas latar gelap netral.

## 1. Warna

| Token             | Hex       | Pemakaian                                  |
|--------------------|-----------|---------------------------------------------|
| `bg-app`           | `#12141a` | Latar utama aplikasi                        |
| `bg-sidebar`       | `#15171f` | Latar sidebar navigasi                      |
| `bg-card`          | `#1b1e27` | Latar kartu/panel                           |
| `bg-card-hover`    | `#22252f` | Hover / elemen sekunder di dalam kartu      |
| `border-subtle`    | `#2a2d38` | Garis pemisah tipis antar elemen            |
| `text-primary`     | `#f1f3f7` | Judul, angka besar                          |
| `text-secondary`   | `#9aa1b2` | Label, caption, teks pendukung              |
| `accent-teal`      | `#22d3ee` | Data suhu, grafik primer, nav aktif         |
| `accent-pink`      | `#ec4899` | Data sekunder / highlight                   |
| `accent-orange`    | `#fb923c` | Peringatan ringan / data tersier            |
| `accent-green`     | `#4ade80` | Status "terhubung", tren naik positif       |
| `accent-red`       | `#f87171` | Status "terputus", error, tren turun negatif|

Prinsip: warna aksen dipakai *sparingly* — satu warna dominan per kartu/metric,
bukan seluruh kartu diwarnai. Latar tetap netral gelap supaya angka & grafik
yang menonjol.

## 2. Tipografi

- Font: font sistem default (sans-serif), tidak perlu custom font loading.
- Angka besar (metric value): **28–40px, bold (700–800)**, warna `text-primary`.
- Label kartu (mis. "TEMPERATURE"): 11px, uppercase, letter-spacing 0.5px,
  warna `text-secondary`, bold.
- Body/caption: 12–13px, `text-secondary`.
- Judul section: 15–18px, semi-bold, `text-primary`.

## 3. Layout

- Sidebar navigasi tetap (fixed), lebar ~220px, ikon + label, item aktif
  diberi latar `bg-card-hover` dan aksen kiri warna `accent-teal`.
- Konten utama: grid kartu, gap 16–20px, border-radius kartu **16–20px**.
- Kartu besar (grafik utama) mengambil 2/3 lebar; kartu ringkasan
  (humidity, dsb.) 1/3 lebar di sampingnya — pola "hero + sidebar stat".
- Kartu kecil di bawahnya: grid 3 kolom, masing-masing punya:
  label, badge tren (▲/▼ + %), nilai besar, dan elemen visual mini
  (progress bar / sparkline / gauge arc) di kanan-bawah kartu.

## 4. Komponen

### Sidebar Navigation
- Setiap item: ikon (emoji sebagai pengganti icon set) + label.
- Grup "Master Data" bisa di-expand/collapse, berisi sub-item:
  - Master Konfigurasi Koneksi
  - Master Setup Sensor
- Item aktif: latar sedikit lebih terang + garis aksen kiri 3px.

### Status Pill
- Terhubung: latar hijau transparan (`accent-green` @ 15% opacity), teks hijau.
- Terputus: latar merah transparan, teks merah.

### Kartu Metric (mini card)
- Baris atas: label kecil (kiri) + badge tren (kanan, opsional).
- Tengah: nilai besar.
- Bawah: elemen visual pendukung (progress bar horizontal, sparkline garis,
  atau gauge arc setengah lingkaran) + caption kecil.

### Master Data Table
- Ditampilkan sebagai tabel editable (tambah/hapus/ubah baris langsung).
- Kolom relasi (mis. Sensor → Koneksi) memakai dropdown/select, bukan
  input bebas, supaya konsisten dengan data induk.

## 5. Prinsip Interaksi

- Data real-time (pembacaan sensor) tidak menghalangi pengaturan master data
  — dua hal ini dipisah ke halaman/menu berbeda.
- Perubahan di Master Data langsung tersedia untuk dipakai di halaman
  Dashboard tanpa perlu reload manual.
- Status koneksi selalu terlihat di level kartu sensor, bukan cuma di log.
