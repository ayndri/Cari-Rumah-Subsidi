# Cari Rumah Subsidi

Sistem pendukung keputusan spasial (WebGIS) untuk memilih rumah subsidi di Kabupaten Mojokerto.
Pengguna menyatakan hal yang penting baginya, lalu sistem mengurutkan 84 perumahan subsidi dengan
metode **AHP–TOPSIS** berdasarkan luas bangunan, luas lahan, dan waktu tempuh ke sekolah,
perniagaan, serta fasilitas kesehatan.

Aplikasi ini bagian dari tugas akhir Dewi Nur Ayundari (1462300065), Program Studi Teknik
Informatika, Universitas 17 Agustus 1945 Surabaya.

## Fitur

**Halaman publik**

- Peta sebaran 84 perumahan subsidi beserta nomor peringkatnya.
- Lima rekomendasi teratas yang berubah seketika saat pengguna mengganti pilihan.
- Pilihan moda perjalanan: sepeda motor atau mobil.
- Tiga tingkat kepentingan per kriteria (tidak penting, penting, paling penting), diterjemahkan
  menjadi bobot dengan Rank Order Centroid. Tanpa pilihan, dipakai bobot hasil kuesioner AHP.
- Kriteria tambahan: dekat pusat kabupaten, halaman lega, dekat tempat ibadah, dan dekat tempat kerja.
- Penyaringan per kecamatan.
- Halaman rincian tiap perumahan, termasuk posisinya dibanding perumahan lain.

**Panel admin**

- Login dengan sesi bertanda tangan, dan penahanan setelah lima kali gagal.
- Dashboard ringkasan data, lima besar saat ini, sebaran per kecamatan, dan riwayat perubahan.
- Tabel perumahan dengan pencarian, penyaringan status, pengurutan per kolom, dan halaman.
- Tambah, ubah, hapus, dan pulihkan perumahan. Waktu tempuh perumahan baru dihitung otomatis.
- Pengaturan bobot kriteria tambahan.

## Teknologi

| Bagian | Yang dipakai |
|---|---|
| Aplikasi | Next.js 16, React 19, TypeScript |
| Tampilan | Tailwind CSS 4 |
| Peta | Leaflet 1.9, peta dasar OpenStreetMap |
| Basis data | PostgreSQL 18 + PostGIS 3.6 di Neon |
| Waktu tempuh | Google Routes API (sepeda motor dan mobil), TomTom Routing (penelusuran fasilitas terdekat) |
| Data | SiKumbang Tapera (perumahan), OpenStreetMap lewat Overpass API (fasilitas) |

## Cara kerja perhitungan

1. **Data.** 84 perumahan subsidi di 14 kecamatan dari SiKumbang Tapera. Titik fasilitas diambil
   dari OpenStreetMap: 1.466 sekolah, 180 perniagaan, dan 446 fasilitas kesehatan.
2. **Waktu tempuh.** Untuk tiap perumahan dan jenis fasilitas, delapan fasilitas terdekat menurut
   jarak garis lurus dirutekan dengan TomTom, lalu yang tercepat dipilih. Waktu tempuh ke fasilitas
   itu dihitung dengan Google Routes API untuk sepeda motor (`TWO_WHEELER`) dan mobil (`DRIVE`),
   dengan pola lalu lintas Senin pukul 07.00 WIB.
3. **Bobot.** Bobot lima kriteria inti berasal dari kuesioner perbandingan berpasangan AHP kelompok
   calon pembeli (CR 0,0051): luas bangunan 0,207; luas lahan 0,240; sekolah 0,164;
   perniagaan 0,119; fasilitas kesehatan 0,270.
4. **Peringkat.** TOPSIS dengan normalisasi vektor, dijalankan di peramban atas seluruh perumahan
   yang aktif.

Data penelitian disimpan sebagai berkas acuan di `src/data/perumahan.json`. Perubahan dari panel
admin disimpan di basis data dan selalu dapat dikembalikan ke data acuan.

## Menjalankan di komputer sendiri

Syarat: Node.js 20 atau lebih baru, dan satu basis data PostgreSQL dengan ekstensi PostGIS
(misalnya proyek Neon gratis).

```bash
npm install
cp contoh-env.txt .env.local      # lalu isi nilainya
node skrip/isi-database.mjs       # membuat tabel dan mengisi data penelitian
npm run dev                       # http://localhost:3000
```

`skrip/isi-database.mjs` aman dijalankan berulang. Skrip itu tidak menimpa perubahan admin yang
sudah tersimpan. Untuk mengulang dari awal, jalankan `node skrip/isi-database.mjs --ulang`.

## Variabel lingkungan

| Nama | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL. Di Neon, pakai yang *pooled*. |
| `TOMTOM_API_KEY` | Kunci TomTom, untuk menelusuri fasilitas terdekat dan waktu ke tempat kerja. |
| `GOOGLE_MAPS_API_KEY` | Kunci Google Routes API, untuk waktu tempuh perumahan yang ditambahkan admin. |
| `ADMIN_USERNAME` | Nama pengguna panel admin. |
| `ADMIN_PASSWORD` | Kata sandi panel admin. |
| `ADMIN_SECRET` | Kunci tanda tangan sesi, minimal 16 karakter acak. |

Tanpa `DATABASE_URL`, halaman publik tetap berjalan dengan data penelitian, tetapi panel admin
tidak dapat menyimpan.

## Deploy ke Vercel

1. Impor repositori ini di Vercel.
2. Isi seluruh variabel lingkungan di atas pada **Settings → Environment Variables**.
3. Pilih region fungsi **Singapore (`sin1`)** pada **Settings → Functions**, supaya dekat dengan
   basis data dan pengguna.
4. Jalankan `node skrip/isi-database.mjs` sekali dari komputer sendiri untuk mengisi basis data.

## Struktur folder

```
src/
  app/            halaman (beranda, cari, rincian, cara kerja, admin) dan API
  components/     komponen antarmuka
  data/           data penelitian: perumahan.json dan titik-fasilitas.json
  lib/            perangkingan AHP–TOPSIS, akses basis data, sesi admin, perhitungan waktu tempuh
skrip/
  buat-data.py            menyusun src/data dari dataset penelitian
  isi-database.mjs        membuat tabel dan mengisi basis data
  uji_fungsional.py       pengujian black-box lewat peramban (Playwright)
```

`skrip/buat-data.py` dan `skrip/uji_fungsional.py` membaca dataset dan hasil analisis di folder
induk penelitian, sehingga hanya berjalan di lingkungan penelitian aslinya.

## Keterbatasan

- Kunci Google yang dipakai adalah kunci uji coba dengan batas permintaan harian. Satu perumahan
  baru memakai 6 permintaan Google dan 24 permintaan TomTom.
- Waktu tempuh ke tempat ibadah untuk perumahan yang ditambahkan admin belum dihitung.
- Perumahan yang lokasinya ditentukan dari koordinat SiKumbang dapat menunjuk gerbang kawasan,
  bukan unit rumah tertentu.
