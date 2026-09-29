# Arah Desain — WebGIS Rekomendasi Rumah Subsidi

Ditetapkan pemilik produk (Dewi Nur Ayundari), 15 September 2026.

## Design Read

Ini dibaca sebagai: **alat bantu memilih rumah** untuk **calon pembeli rumah subsidi (MBR)
di Kabupaten Mojokerto**, dengan bahasa visual **hijau hangat yang membumi**, dial
**ENERGY 3 / RHYTHM 3 / MOTION 2** pada halaman pembuka dan **ENERGY 2 / RHYTHM 2 /
MOTION 1** pada halaman perhitungan.

Kenapa dua set dial:

- **Halaman pembuka harus mengajak.** Judul serif besar, ilustrasi selebar halaman
  bertepi lengkung, satu blok hijau penuh, dan tiap bagian muncul saat tergulir. Pemilik
  produk memilih arah ini dari contoh halaman properti yang lebih berani.
- **Halaman perhitungan harus tenang.** Di situ orang sedang membandingkan angka dan
  membuat keputusan besar. Gerakan dan hiasan justru mengganggu, jadi tidak ada satu pun
  di sana selain hover dan fokus.
- **MOTION 2 berarti muncul saat tergulir, bukan gerak terus-menerus.** Tiap elemen
  bergerak sekali lalu diam. Tidak ada yang berdenyut, melayang, atau berulang. Pengguna
  yang menyetel gerak minimum di perangkatnya langsung melihat isinya tanpa animasi.

## Identitas

Rumah subsidi adalah rumah tapak di lingkungan yang masih banyak kebunnya, dibeli orang
yang menabung bertahun-tahun. Tampilannya harus terasa seperti tempat tinggal, bukan
dasbor analitik.

**Motif identitas:** setiap hasil disertai **satu kalimat alasan dalam bahasa sehari-hari**,
misalnya "Rumahnya termasuk luas, 36 m², dan 4 menit ke puskesmas." Kalau ada kekurangan
yang menonjol, kekurangannya ikut disebut. Angka skor tidak ditampilkan mentah; yang dibaca
pengguna adalah kalimatnya.

## Palet

Dua warna inti, satu aksen, sisanya netral hangat.

| Peran | Warna | Alasan |
|---|---|---|
| Inti, hijau hutan | `#2e4a35` | Kepala halaman, tombol tindakan utama, pilihan yang sedang aktif |
| Inti, hijau daun | `#46683b` | Tautan dan penanda hal yang berhubungan dengan lingkungan sekitar rumah |
| Aksen, amber | `#8a5a12` | Hanya untuk menandai pilihan teratas dan kotak hal yang belum selesai. Bukan warna tombol biasa |
| Netral, krem kehijauan | `#f5f4ec` | Latar. Lebih rendah silau daripada putih murni, penting karena banyak calon pembeli membuka lewat HP di luar ruangan |
| Netral, gading | `#fffef9` | Permukaan kartu, sedikit lebih terang dari latar supaya batasnya terbaca tanpa bayangan |

Amber muncul paling banyak di dua tempat per layar. Begitu ia dipakai untuk tombol biasa
ia berhenti menjadi penanda, dan itu sudah sempat terjadi sekali lalu dikembalikan.

## Satu mode saja

Sistem ini hanya punya mode terang. Sakelar terang dan gelap sempat dibuat, lalu dibuang
atas keputusan pemilik produk.

Alasannya bisa dipertanggungjawabkan: penggunanya membuka ini siang hari untuk mencari
rumah, dan sistemnya akan diperagakan lewat proyektor saat sidang, tempat mode gelap
justru sulit dibaca. Mode gelap tidak dibiarkan setengah jadi, melainkan dihapus seluruhnya
beserta token warnanya, dan `color-scheme: light` dipasang supaya tampilan tidak ikut
berubah mengikuti setelan sistem pengguna.

## Tipografi

| Peran | Huruf | Alasan |
|---|---|---|
| Judul dan angka besar | **Fraunces** | Serif dengan sumbu lunak. Memberi kesan cetakan dan kehangatan brosur, bukan dasbor |
| Teks dan antarmuka | **Public Sans** | Dirancang untuk dokumen layanan publik, terbaca pada ukuran kecil. Isinya data resmi yang harus terbaca di HP murah |

Tidak memakai Inter, Geist, atau Space Grotesk. Bukan karena huruf itu jelek, tapi karena
dipilih tanpa alasan selain kebiasaan.

## Susunan halaman

| Alamat | Isi |
|---|---|
| `/` | Halaman pembuka. Menjelaskan kenapa alat ini ada, apa yang dibandingkan, dari mana datanya, dan apa yang belum selesai |
| `/cara-kerja` | Penjelasan kriteria dasar dan tambahan, asal bobot, kenapa yang disajikan lima besar, sumber data, dan daftar hal yang belum selesai |
| `/cari` | Halaman perhitungan. Pemilihan kepentingan, daftar hasil, dan peta |
| `/perumahan/[id]` | Rincian satu perumahan, termasuk angka skor asli untuk keperluan naskah |
| `/admin/*` | Panel pengelolaan kriteria, data perumahan, dan data fasilitas |

Menu di kepala halaman hanya memuat Beranda, Cara kerjanya, Cari rumah, dan Admin. Tidak
ada tautan ke halaman yang belum dibuat.

Halaman `/cara-kerja` dibuat karena dua hal tidak muat di halaman pembuka: penjelasan
kriteria yang bisa ditambah dan dikurangi sendiri oleh pengguna, dan penjelasan asal
urutannya. Keduanya perlu tempat sendiri supaya halaman pembuka tidak berubah jadi
kuliah metode.

## Cara pengguna menyatakan kebutuhannya

Satu pertanyaan per baris: **tidak penting, penting, atau paling penting**. Tidak ada
angka bobot di layar, tidak ada pengurutan dengan panah, tidak ada perbandingan
berpasangan.

Versi pertama memakai panah kiri-kanan untuk menggeser urutan dan menampilkan angka
bobot seperti 0,46. Keduanya dibuang setelah dinilai tidak bisa dipakai orang awam:
calon pembeli rumah tidak akan menebak arti panah itu, dan angka 0,46 tidak berarti
apa-apa bagi mereka.

Terjemahannya ke bobot tetap memakai Rank Order Centroid, tapi kriteria yang setingkat
berbagi rata jatah bobotnya. Kalau pengguna menandai dua hal sama-sama paling penting
lalu sistem diam-diam memberi bobot berbeda, hasilnya terasa tidak jujur.

Skor TOPSIS juga tidak ditampilkan sebagai angka mentah. Di halaman pencarian ia muncul
sebagai persen kecocokan beserta keterangan bahwa itu perbandingan antardaftar, bukan
nilai mutlak. Angka aslinya tetap ada di halaman rincian.

## Bentuk

- **Sudut membulat kecil (6px) untuk hampir semua elemen, 12px hanya untuk kartu hasil.**
  Perbedaan itu yang menandai mana yang bisa diklik sebagai tujuan utama.
- **Tanpa bayangan.** Pemisahan dikerjakan garis dan warna latar. Halaman ini punya lantai,
  tidak ada yang melayang.
- **Tanpa blur, tanpa cahaya, tanpa gradien.** Tidak ada satu pun yang bisa dijelaskan
  fungsinya di sini.

## Foto

Halaman pembuka memakai tiga foto rumah subsidi yang disediakan pemilik produk: deretan
rumah di sebuah perumahan, teras depan, dan fasad dengan dinding roster.

Satu aturan yang mengikat pemakaiannya: **tidak ada foto yang dipasangkan dengan nama
perumahan mana pun.** Foto-foto itu rumah subsidi sungguhan, tapi bukan foto perumahan
tertentu di Kabupaten Mojokerto. Menempelkannya ke "Griya Asri Permai" akan membuat
pengguna mengira itu rumah yang akan mereka beli. Jadi foto dipakai untuk menjelaskan
gagasan, bukan mewakili satu alternatif, dan keterangannya ditulis terbuka di bagian
"Yang belum selesai".

Foto dipotong asimetris di dua sudut supaya halaman tidak terasa seperti formulir dinas.
Bentuk itu melunakkan, tidak menutupi isi, dan dipakai sekali per halaman.

Pembagiannya: dua foto di halaman pembuka (deretan rumah dan teras), satu foto di halaman
penjelasan (fasad roster). Halaman pembuka sempat memuat ketiganya dan terasa penuh.

## Pemisah melengkung antarbagian

Bagian-bagian pada halaman pembuka dan halaman penjelasan dipisah lengkungan landai, bukan
garis lurus. Tugasnya memberi tahu mata bahwa satu bagian selesai dan bagian berikutnya
dimulai, tanpa kesan formulir.

Dua aturan yang mengikat. Pertama, bentuknya landai, bukan gelombang ramai, supaya tidak
menarik perhatian lebih besar daripada isinya. Kedua, halaman perhitungan tidak memakainya
sama sekali: di sana orang sedang membandingkan angka, dan hiasan apa pun mengganggu.

## Yang sengaja tidak dipakai

- Kartu fitur seragam berisi ikon bulat. Isi tiap bagian berbeda bobotnya, jadi bentuknya
  juga berbeda.
- Ikon dekoratif dan emoji.
- Testimoni, deretan logo, dan angka pencapaian. Tidak satu pun dari itu yang nyata di sini.
- Angka statistik ringkasan di bagian atas halaman pencarian. Yang dibutuhkan pengguna
  adalah daftar, bukan hitungan.

## Batas kejujuran

Datanya sudah data sebenarnya: 84 perumahan subsidi di 14 kecamatan dari SiKumbang
Tapera. Yang masih sementara adalah bobot bawaannya, yang memakai matriks Subbab 3.2.6
proposal sampai kuesioner AHP ditutup.

Kriteria yang datanya belum dihitung tidak bisa dinyalakan sama sekali, bukan sekadar
diberi tanda. Kalau bisa dinyalakan, seluruh perumahan akan tersaring keluar dan
daftarnya kosong tanpa penjelasan.

Petanya sudah peta jalan OpenStreetMap lewat Leaflet, bukan lagi bidang kosong berisi
titik. Atribusi OpenStreetMap wajib tampil dan tidak boleh dilepas; itu syarat lisensinya,
bukan pilihan desain.

Nama perumahan dan pengembang dirapikan dari huruf kapital semua menjadi huruf biasa saat
data dikonversi. Bentuk badan usaha seperti PT dan CV tetap kapital. Data aslinya tidak
diubah, yang berubah hanya cara menampilkannya.
Setiap layar yang menampilkannya wajib menyebut itu dengan jelas, bukan di catatan kaki
yang tersembunyi. Daftar terbuka berisi apa saja yang belum selesai ada di `/cara-kerja`,
dan halaman pencarian tetap menyebut sendiri bahwa datanya masih contoh.

## Pembaruan 28 September 2026: halaman pembuka gaya portal

Atas permintaan pemilik produk, halaman pembuka disusun seperti situs properti umum,
karena situs ini akan dibuka masyarakat, bukan hanya untuk sidang:

- Pembuka dibelah dua: blok hijau berisi judul, foto deretan rumah di sampingnya. Teks
  tidak ditaruh di atas foto supaya kontrasnya terjamin.
- Kotak pencarian menumpang di tepi bawah pembuka: kecamatan, hal yang paling penting,
  dan kendaraan. Ia mengirim ke `/cari?kec=&utama=&moda=`, lalu alamatnya dibersihkan.
- Kartu tiga perumahan teratas memakai potongan peta OpenStreetMap lokasinya, bukan foto,
  sesuai aturan foto di atas. Urutannya dihitung dari bobot bawaan, bukan dipilih tangan.
- Tetap tanpa testimoni, tanpa angka pencapaian, tanpa bayangan.
