import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Muncul from "@/components/Muncul";
import Lengkung from "@/components/Lengkung";
import { JUMLAH_PERUMAHAN, KRITERIA } from "@/lib/data";

import fotoRoster from "@/assets/image/Menambahkan-Dinding-Roster-pada-Bagian-Depan-Rumah-Subsidi.webp";

/**
 * Halaman penjelasan.
 *
 * Dibuat karena dua hal tidak muat di halaman pembuka: bagaimana kriteria bisa
 * ditambah dan dikurangi sendiri oleh pengguna, dan bagaimana urutannya
 * sebenarnya dihitung. Keduanya perlu dijelaskan dengan jujur, termasuk
 * batasannya, tanpa menjejalkan istilah ke halaman pembuka.
 *
 * Foto di sini rumah subsidi sungguhan, bukan foto perumahan tertentu, dan
 * tidak dipasangkan dengan nama perumahan mana pun.
 */

const SUMBER = [
  { apa: "Data perumahan subsidi", dari: "SiKumbang Tapera", catatan: "84 perumahan di 14 kecamatan" },
  {
    apa: "Titik sekolah, pasar, dan fasilitas kesehatan",
    dari: "OpenStreetMap",
    catatan: "1.466 sekolah, 172 pasar, 446 fasilitas kesehatan, lewat Overpass API; delapan titik yang salah tag sebagai pasar (bengkel, toko pakaian, toko elektronik) dibuang",
  },
  {
    apa: "Waktu tempuh sepeda motor dan mobil",
    dari: "Google Routes API",
    catatan: "Profil roda dua dan mobil, pola lalu lintas Senin 07.00",
  },
  {
    apa: "Penelusuran fasilitas terdekat",
    dari: "TomTom Routing",
    catatan: "Delapan kandidat terdekat per jenis fasilitas, dipilih yang tercepat",
  },
];

export const metadata = {
  title: "Cara kerjanya, Cari Rumah Subsidi",
  description:
    "Penjelasan kriteria dasar dan kriteria tambahan, cara bobot ditentukan dari kuesioner AHP, dan cara perumahan diurutkan dengan TOPSIS.",
};

export default function CaraKerja() {
  const dasar = KRITERIA.filter((k) => k.inti);
  const tambahan = KRITERIA.filter((k) => !k.inti);

  return (
    <div className="flex min-h-screen flex-col">
      <Header jejak="Cara kerjanya" />

      <main className="flex-1">
        <section className="bg-permukaan">
          <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 sm:py-14">
            <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
              <Muncul>
                <p className="text-sm tracking-[0.18em] text-daun uppercase">
                  Supaya tidak ada yang disembunyikan
                </p>
                <h1 className="judul mt-3 text-3xl leading-tight font-semibold text-hutan sm:text-5xl">
                  Cara sistem ini menilai
                </h1>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-teks-redup">
                  Kamu berhak tahu kenapa satu perumahan muncul di atas dan yang lain di
                  bawah. Halaman ini menjelaskannya tanpa istilah yang bikin pusing,
                  berikut hal-hal yang belum bisa dilakukan sistem.
                </p>
              </Muncul>

              <Muncul arah="kanan" jeda={140}>
                <div className="overflow-hidden rounded-[var(--radius-kartu)] rounded-tl-[22%] rounded-br-[22%] border border-garis">
                  <Image
                    src={fotoRoster}
                    alt="Tampak depan rumah subsidi dengan dinding roster di samping pintu masuk dan tanaman di halaman sempitnya."
                    placeholder="blur"
                    priority
                    sizes="(max-width: 768px) 100vw, 420px"
                    className="h-[240px] w-full object-cover sm:h-[320px]"
                  />
                </div>
              </Muncul>
            </div>
          </div>
        </section>

        <Lengkung bentuk="landai" atas="bg-permukaan" bawah="text-latar" />

        {/* ---------- Kriteria dasar dan tambahan ---------- */}
        <section className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-6">
          <Muncul>
            <h2 className="judul text-2xl font-semibold sm:text-3xl">
              Lima yang dasar, sisanya kamu yang pilih
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-teks-redup">
              Lima hal di bawah ini dipakai sejak awal karena berlaku untuk hampir semua
              rumah tangga. Tapi kebutuhan orang berbeda, jadi kamu boleh mematikan yang
              tidak penting buatmu dan menambah yang lain dari daftar tambahan.
            </p>
          </Muncul>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Muncul arah="kiri">
              <div className="h-full rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-5">
                <h3 className="font-medium">Lima kriteria dasar</h3>
                <p className="mt-1 text-sm leading-relaxed text-teks-redup">
                  Diturunkan dari SNI 03-1733-2004 tentang sarana lingkungan perumahan dan
                  dari penelitian pemilihan hunian.
                </p>
                <ul className="mt-4 divide-y divide-garis border-y border-garis">
                  {dasar.map((k) => (
                    <li key={k.kunci} className="flex items-baseline gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{k.nama}</span>
                        <span className="block text-sm text-teks-redup">{k.keterangan}</span>
                      </span>
                      <span className="shrink-0 text-sm text-teks-redup">{k.satuan}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Muncul>

            <Muncul arah="kanan" jeda={110}>
              <div className="h-full rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-5">
                <h3 className="font-medium">Kriteria tambahan yang bisa kamu nyalakan</h3>
                <p className="mt-1 text-sm leading-relaxed text-teks-redup">
                  Tidak menyala sejak awal. Nyalakan kalau memang penting buat keluargamu.
                </p>
                <ul className="mt-4 divide-y divide-garis border-y border-garis">
                  {tambahan.map((k) => (
                    <li key={k.kunci} className="flex items-baseline gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{k.nama}</span>
                        <span className="block text-sm text-teks-redup">{k.keterangan}</span>
                      </span>
                      {k.butuhData && (
                        <span className="shrink-0 text-sm text-amber">belum tersedia</span>
                      )}
                      {k.butuhTitikAcuan && (
                        <span className="shrink-0 text-sm text-teks-redup">isi lokasinya</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-teks-redup">
                  Kriteria yang menyala dibatasi paling banyak tujuh. Lebih dari itu, yang
                  ada di urutan bawah hampir tidak mengubah hasil, jadi menambahnya tidak
                  banyak menolong.
                </p>
              </div>
            </Muncul>
          </div>
        </section>

        <Lengkung bentuk="cekung" atas="bg-latar" bawah="text-permukaan" />

        {/* ---------- Cara bobot ditentukan ---------- */}
        <section className="bg-permukaan">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6">
            <Muncul>
              <h2 className="judul text-2xl font-semibold sm:text-3xl">
                Dari mana urutannya datang
              </h2>
            </Muncul>

            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  judul: "Bobot bawaan dari kuesioner",
                  isi: "Calon pembeli dan orang yang bekerja di bidang perumahan subsidi mengisi kuesioner perbandingan. Jawaban mereka diolah jadi bobot bawaan dengan metode AHP, dan penilaian yang tidak konsisten dibuang.",
                },
                {
                  judul: "Kamu boleh menggeser bobotnya",
                  isi: "Begitu kamu menandai sesuatu sebagai paling penting, bobotnya dihitung ulang dari pilihanmu. Hal yang kamu tandai sama pentingnya akan mendapat bobot yang sama persis.",
                },
                {
                  judul: "Perumahan diurutkan dengan TOPSIS",
                  isi: "Tiap perumahan diukur seberapa dekat ke kondisi paling ideal sekaligus seberapa jauh dari yang paling buruk. Hasilnya yang kamu lihat sebagai angka kecocokan.",
                },
              ].map((l, i) => (
                <li key={l.judul}>
                  <Muncul jeda={i * 110}>
                    <div className="h-full rounded-[var(--radius-kartu)] border border-garis bg-latar p-5">
                      <span className="judul text-3xl font-semibold text-daun">{i + 1}</span>
                      <h3 className="mt-1 text-lg font-medium">{l.judul}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-teks-redup">{l.isi}</p>
                    </div>
                  </Muncul>
                </li>
              ))}
            </ol>

            <Muncul jeda={140}>
              <p className="mt-5 max-w-3xl leading-relaxed text-teks-redup">
                Kamu tidak pernah diminta mengisi perbandingan berpasangan di layar. Cara
                itu memang dipakai pada kuesioner, tapi menuntut orang membandingkan
                puluhan pasangan satu per satu, dan itu tidak masuk akal untuk seseorang
                yang sekadar ingin mencari rumah.
              </p>
            </Muncul>
          </div>
        </section>

        <Lengkung bentuk="landai" atas="bg-permukaan" bawah="text-latar" />

        {/* ---------- Waktu tempuh dan batasannya ---------- */}
        <section className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Muncul arah="kiri">
              <div className="h-full rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-5">
                <h2 className="judul text-xl font-semibold sm:text-2xl">
                  Diukur lewat jalan, bukan garis lurus
                </h2>
                <p className="mt-3 leading-relaxed text-teks-redup">
                  Dua perumahan bisa sama-sama berjarak dua kilometer dari pasar di peta,
                  tapi berbeda tujuh menit waktu tempuhnya karena jalannya memutar. Yang
                  dipakai di sini adalah rute yang benar-benar bisa dilewati kendaraan,
                  menuju fasilitas tercepat di antara delapan yang terdekat.
                </p>
              </div>
            </Muncul>

            <Muncul arah="kanan" jeda={110}>
              <div className="h-full rounded-[var(--radius-kartu)] border border-amber bg-amber-latar p-5">
                <h2 className="judul text-xl font-semibold sm:text-2xl">
                  Kenapa lima besar, bukan satu
                </h2>
                <p className="mt-3 leading-relaxed text-teks-redup">
                  Nilai tiga perumahan teratas hampir sama. Peringkat pertama juga bisa
                  berganti kalau waktu tempuh diambil dari layanan peta lain atau tanpa pola
                  lalu lintas Senin pagi. Karena itu sistem menyajikan lima, dan tidak mengklaim
                  satu perumahan sebagai yang terbaik mutlak.
                </p>
              </div>
            </Muncul>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <Muncul arah="kiri">
              <h2 className="judul text-xl font-semibold sm:text-2xl">Datanya dari mana</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {SUMBER.map((s) => (
                  <li
                    key={s.apa}
                    className="rounded-[var(--radius-kecil)] border border-garis bg-permukaan px-4 py-3"
                  >
                    <span className="block font-medium">{s.apa}</span>
                    <span className="block text-sm text-daun">{s.dari}</span>
                    <span className="block text-sm text-teks-redup">{s.catatan}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-teks-redup">
                OpenStreetMap dikerjakan sukarelawan, jadi kelengkapannya bisa berbeda
                antarwilayah, terutama di daerah pinggiran.
              </p>
            </Muncul>

            <Muncul arah="kanan" jeda={110}>
              <div className="h-full rounded-[var(--radius-kartu)] border border-amber bg-amber-latar p-5">
                <h2 className="judul text-xl font-semibold sm:text-2xl">Yang belum selesai</h2>
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-teks-redup">
                  <li>
                    Bobot bawaannya berasal dari sepuluh calon pembeli. Kuesioner masih
                    dibuka, jadi angkanya bisa bergeser sedikit.
                  </li>
                  <li>
                    Waktu ke tempat ibadah dihitung ke tempat ibadah agamamu dengan rute
                    sepeda motor TomTom, bukan Google. Data OpenStreetMap jauh lebih lengkap
                    untuk masjid daripada gereja, pura, vihara, dan klenteng, dan gereja yang
                    tidak mencantumkan denominasi dianggap gereja Kristen.
                  </li>
                  <li>
                    Foto di situs ini rumah subsidi sungguhan, tapi bukan foto perumahan
                    tertentu di Kabupaten Mojokerto. Karena itu tidak ada foto yang
                    dipasangkan dengan nama perumahan mana pun.
                  </li>
                  <li>
                    Waktu ke tempat kerja untuk sepeda motor memakai rute mobil TomTom,
                    karena layanan hitung massalnya tidak punya profil sepeda motor.
                  </li>
                  <li>
                    Waktu tempuh Google diambil dengan kunci uji coba, dan fasilitas tujuannya
                    ditentukan dari penelusuran TomTom. Pilihan sepeda tidak tersedia karena
                    Google tidak punya rute sepeda untuk wilayah ini.
                  </li>
                </ul>
              </div>
            </Muncul>
          </div>

          <Muncul jeda={160}>
            <div className="mt-10 text-center">
              <Link
                href="/cari"
                className="inline-flex min-h-14 items-center rounded-full bg-hutan px-8 text-base font-semibold text-di-atas-hutan transition hover:scale-[1.03]"
              >
                Coba sekarang
              </Link>
            </div>
          </Muncul>
        </section>
      </main>

      <footer className="border-t border-garis bg-permukaan">
        <div className="mx-auto max-w-[1180px] px-4 py-6 text-sm leading-relaxed text-teks-redup sm:px-6">
          Sistem Pendukung Keputusan Spasial untuk rekomendasi pemilihan rumah subsidi di
          Kabupaten Mojokerto. Tugas akhir Dewi Nur Ayundari, Teknik Informatika
          Universitas 17 Agustus 1945 Surabaya.
        </div>
      </footer>
    </div>
  );
}
