import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Muncul from "@/components/Muncul";
import Lengkung from "@/components/Lengkung";
import KotakCari from "@/components/KotakCari";
import PetaMini from "@/components/PetaMini";
import { KRITERIA, keMenit, semuaBaris } from "@/lib/data";
import { bacaPerubahan } from "@/lib/penyimpanan";
import { barisKePerumahan, gabungBaris } from "@/lib/perubahan";
import { bobotDariAHP, hitungPeringkat } from "@/lib/perangkingan";
import { susunAlasan } from "@/lib/alasan";

import fotoDeret from "@/assets/image/Desain-Rumah-Subsidi.jpg";
import fotoTeras from "@/assets/image/Pintu-Rumah-Subsidi-2.webp";

/**
 * Halaman pembuka.
 *
 * Susunannya mengikuti portal properti umum: pembuka besar, kotak pencarian
 * yang menumpang di tepi bawahnya, lalu contoh hasil. Bedanya ada pada
 * kejujuran isinya:
 *
 * - Foto rumah subsidi sungguhan, tapi bukan foto perumahan tertentu, jadi
 *   tidak pernah dipasangkan dengan nama perumahan. Kartu perumahan memakai
 *   potongan peta lokasinya sendiri.
 * - Tidak ada testimoni, deretan logo, atau angka pencapaian. Semua angka
 *   berasal dari dataset penelitian dan bisa ditelusuri.
 * - Tiga perumahan teratas dihitung saat build dengan bobot bawaan yang sama
 *   dengan halaman pencarian, bukan dipilih tangan.
 */

const ANGKA = [
  { nilai: "84", satuan: "perumahan subsidi", dari: "Terdaftar di SiKumbang Tapera" },
  { nilai: "14", satuan: "kecamatan", dari: "Tersebar di Kabupaten Mojokerto" },
  { nilai: "2.092", satuan: "titik fasilitas", dari: "1.466 sekolah, 180 pasar, 446 faskes" },
  { nilai: "0", satuan: "rupiah, tanpa daftar", dari: "Tidak ada data pribadi yang diminta" },
];

const LANGKAH = [
  {
    judul: "Bilang apa yang penting",
    isi: "Tiap hal cuma punya tiga jawaban: tidak penting, penting, atau paling penting. Tidak ada angka yang perlu kamu isi.",
  },
  {
    judul: "Daftarnya langsung berubah",
    isi: "Begitu kamu mengubah jawaban, urutan perumahannya dihitung ulang saat itu juga. Tidak ada tombol kirim.",
  },
  {
    judul: "Lihat lima besarnya",
    isi: "Tiap hasil disertai alasannya dalam bahasa biasa, termasuk kalau ada kekurangan yang perlu kamu tahu.",
  },
];

const rupiahJuta = (n: number) => `Rp ${Math.round(n / 1_000_000)} juta`;

/** Dirender tiap permintaan supaya perubahan dari panel admin ikut terlihat di tiga teratas. */
export const dynamic = "force-dynamic";

export default async function Beranda() {
  const pr = await bacaPerubahan();
  const dasar = KRITERIA.filter((k) => k.inti);
  const tambahan = KRITERIA.filter((k) => !k.inti);

  const peringkat = hitungPeringkat(gabungBaris(semuaBaris(), pr).map((b) => barisKePerumahan(b, "motor")), dasar, bobotDariAHP(dasar));
  const teratas = peringkat.slice(0, 3).map((b) => ({
    ...b,
    alasan: susunAlasan(b, peringkat, dasar),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Header jejak="Beranda" />

      <main className="flex-1">
        {/* ---------- Pembuka dan kotak pencarian ---------- */}
        <section className="px-4 pt-5 sm:px-6 sm:pt-8">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid overflow-hidden rounded-[var(--radius-kartu)] rounded-tr-[48px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:rounded-tr-[96px]">
              <div className="bg-hutan px-6 pt-9 pb-9 text-di-atas-hutan sm:px-10 sm:pt-12 lg:pb-28">
                <Muncul>
                  <p className="text-sm opacity-85">Rumah subsidi di Kabupaten Mojokerto</p>
                  <h1 className="judul mt-3 text-[2.6rem] leading-[1.02] font-semibold sm:text-6xl">
                    Cari rumah yang cocok buat hidupmu
                  </h1>
                </Muncul>
                <Muncul jeda={110}>
                  <p className="mt-5 max-w-md text-lg leading-relaxed opacity-90">
                    Harganya sudah dipatok pemerintah, jadi hampir sama di mana pun. Yang
                    beda adalah luas rumahnya dan berapa lama kamu di jalan tiap hari.
                  </p>
                </Muncul>
              </div>

              <div className="relative min-h-[240px] sm:min-h-[320px]">
                <Image
                  src={fotoDeret}
                  alt="Deretan rumah subsidi satu lantai beratap pelana di sebuah perumahan, dengan jalan paving dan halaman berumput di depannya."
                  placeholder="blur"
                  priority
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Menumpang di tepi bawah pembuka: satu-satunya tindakan utama di layar ini. */}
            <div className="relative z-10 -mt-12 px-2 sm:px-6 lg:-mt-16 lg:px-10">
              <KotakCari />
              <p className="mt-2 px-1 text-sm text-teks-redup">
                Punya tempat kerja tetap? Kamu bisa mencari lokasinya di halaman berikutnya.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Angka yang bisa ditelusuri ---------- */}
        <section className="mx-auto max-w-[1180px] px-4 pt-10 pb-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-y-6 border-y border-garis py-6 lg:grid-cols-4">
            {ANGKA.map((a, i) => (
              <div
                key={a.satuan}
                className={[
                  "px-3 sm:px-5",
                  i % 2 === 1 ? "border-l border-garis" : "",
                  i === 2 ? "lg:border-l" : "",
                ].join(" ")}
              >
                <dt className="sr-only">{a.satuan}</dt>
                <dd>
                  <span className="judul block text-4xl font-semibold text-hutan">{a.nilai}</span>
                  <span className="mt-1 block font-medium">{a.satuan}</span>
                  <span className="block text-sm text-teks-redup">{a.dari}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------- Contoh hasil ---------- */}
        <section className="mx-auto max-w-[1180px] px-4 pt-10 pb-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <Muncul>
              <h2 className="judul text-3xl font-semibold sm:text-4xl">
                Yang membedakan bukan harganya
              </h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-teks-redup">
                Ini tiga perumahan teratas menurut penilaian calon pembeli yang mengisi
                kuesioner, kalau kamu naik sepeda motor. Harganya sama, yang beda luas dan
                jaraknya.
              </p>
            </Muncul>
            <Link
              href="/cari"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-daun underline underline-offset-4"
            >
              Lihat urutan seluruh 84 perumahan
            </Link>
          </div>

          <ol className="mt-7 grid gap-5 md:grid-cols-3">
            {teratas.map((b, i) => {
              const p = b.perumahan;
              const pertama = b.peringkat === 1;
              return (
                <li key={p.id}>
                  <Muncul jeda={i * 110} className="h-full">
                    <article
                      className={[
                        "flex h-full flex-col overflow-hidden rounded-[var(--radius-kartu)] border bg-permukaan",
                        pertama ? "border-amber" : "border-garis",
                      ].join(" ")}
                    >
                      <div className="relative">
                        <PetaMini
                          latitude={p.latitude}
                          longitude={p.longitude}
                          className="h-[170px]"
                        />
                        <span
                          className={[
                            "absolute top-3 left-3 rounded-[var(--radius-kecil)] px-2.5 py-1 text-sm font-semibold",
                            pertama ? "bg-amber text-di-atas-amber" : "bg-hutan text-di-atas-hutan",
                          ].join(" ")}
                        >
                          Peringkat {b.peringkat}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="judul text-xl leading-snug font-semibold">{p.nama}</h3>
                        <p className="mt-0.5 text-sm text-teks-redup">Kec. {p.kecamatan}</p>
                        <p className="mt-3 leading-relaxed">{b.alasan}</p>

                        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-garis pt-4 text-sm">
                          <div>
                            <dt className="text-teks-redup">Rumah / tanah</dt>
                            <dd className="font-semibold tabular-nums">
                              {p.nilai.luasBangunan}/{p.nilai.luasLahan} m²
                            </dd>
                          </div>
                          <div>
                            <dt className="text-teks-redup">Ke puskesmas</dt>
                            <dd className="font-semibold tabular-nums">
                              {keMenit(p.nilai.faskes as number)} menit
                            </dd>
                          </div>
                          <div>
                            <dt className="text-teks-redup">Ke sekolah</dt>
                            <dd className="font-semibold tabular-nums">
                              {keMenit(p.nilai.sekolah as number)} menit
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                          <span className="judul text-lg font-semibold">{rupiahJuta(p.harga)}</span>
                          <Link
                            href={`/perumahan/${p.id}`}
                            className="inline-flex min-h-11 items-center rounded-[var(--radius-kecil)] bg-hutan px-4 text-sm font-semibold text-di-atas-hutan transition hover:opacity-90"
                          >
                            Lihat rinciannya
                            <span className="sr-only"> {p.nama}</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  </Muncul>
                </li>
              );
            })}
          </ol>
        </section>

        <Lengkung bentuk="cekung" atas="bg-latar" bawah="text-permukaan" />

        {/* ---------- Kriteria dasar dan tambahan ---------- */}
        <section className="bg-permukaan">
          <div className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-6">
            <Muncul>
              <h2 className="judul text-3xl font-semibold sm:text-4xl">
                Lima hal dasar, dan kamu boleh menambah
              </h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-teks-redup">
                Kelimanya dipakai sejak awal karena berlaku untuk hampir semua rumah
                tangga. Tapi kebutuhan orang berbeda, jadi kamu boleh mematikan yang tidak
                penting buatmu dan menyalakan yang lain.
              </p>
            </Muncul>

            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
              <ul className="divide-y divide-garis border-y border-garis">
                {dasar.map((k, i) => (
                  <li key={k.kunci}>
                    <Muncul jeda={i * 70}>
                      <div className="flex items-baseline gap-4 py-4">
                        <span className="judul w-8 shrink-0 text-lg font-semibold text-daun">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-lg font-medium">{k.nama}</span>
                          <span className="block text-sm text-teks-redup">
                            {k.keterangan}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-teks-redup">{k.satuan}</span>
                      </div>
                    </Muncul>
                  </li>
                ))}
              </ul>

              <Muncul arah="kanan" jeda={140} className="h-full">
                <div className="h-full rounded-[var(--radius-kartu)] border border-garis bg-latar p-5">
                  <h3 className="font-medium">Bisa kamu tambah sendiri</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-teks-redup">
                    Tidak menyala sejak awal. Nyalakan kalau memang penting buat
                    keluargamu.
                  </p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {tambahan.map((k) => (
                      <li
                        key={k.kunci}
                        className="flex items-baseline justify-between gap-2 border-b border-garis pb-2 last:border-b-0"
                      >
                        <span className="text-sm font-medium">{k.nama}</span>
                        {k.butuhData && (
                          <span className="shrink-0 text-xs text-amber">belum tersedia</span>
                        )}
                        {k.butuhTitikAcuan && (
                          <span className="shrink-0 text-xs text-teks-redup">isi lokasinya</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/cara-kerja"
                    className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-daun underline underline-offset-4"
                  >
                    Baca cara sistem ini menilai
                  </Link>
                </div>
              </Muncul>
            </div>
          </div>
        </section>

        <Lengkung bentuk="landai" atas="bg-permukaan" bawah="text-latar" />

        {/* ---------- Cara memakainya ---------- */}
        <section className="mx-auto max-w-[1180px] px-4 pb-12 sm:px-6">
          <Muncul>
            <h2 className="judul text-3xl font-semibold sm:text-4xl">Cara memakainya</h2>
          </Muncul>

          {/* Garis penghubung menandai bahwa ketiganya satu alur, bukan tiga fitur terpisah. */}
          <ol className="relative mt-7 grid gap-6 sm:grid-cols-3 sm:gap-8">
            <span
              aria-hidden
              className="absolute top-5 right-[16%] left-[16%] hidden border-t-2 border-dashed border-garis-kuat sm:block"
            />
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="relative">
                <Muncul jeda={i * 110}>
                  <span className="judul relative grid h-10 w-10 place-items-center rounded-full bg-hutan text-lg font-semibold text-di-atas-hutan sm:mx-auto">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 text-lg font-medium sm:text-center">{l.judul}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-teks-redup sm:text-center">
                    {l.isi}
                  </p>
                </Muncul>
              </li>
            ))}
          </ol>

          <Muncul jeda={120}>
            <p className="mx-auto mt-8 max-w-3xl leading-relaxed text-teks-redup sm:text-center">
              Sistem sengaja menyajikan lima besar, bukan satu pemenang tunggal. Pengujian
              menunjukkan urutan teratas bisa bergeser kalau kemacetan makin parah, sedangkan
              lima besarnya jauh lebih bertahan.
            </p>
          </Muncul>
        </section>

        {/* ---------- Ajakan ---------- */}
        <section className="mx-auto w-full max-w-[1180px] px-4 pb-12 sm:px-6">
          <Muncul>
            <div className="grid overflow-hidden rounded-[var(--radius-kartu)] rounded-bl-[48px] bg-hutan text-di-atas-hutan md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:rounded-bl-[96px]">
              <div className="px-6 py-10 sm:px-12 sm:py-14">
                <h2 className="judul max-w-xl text-3xl leading-tight font-semibold sm:text-5xl">
                  Mulai dari apa yang penting buat kamu
                </h2>
                <p className="mt-4 max-w-md leading-relaxed opacity-90">
                  Tidak perlu tahu istilah apa pun. Jawab beberapa pertanyaan singkat, lalu
                  lihat rumah mana yang paling masuk akal buat keluargamu.
                </p>
                <Link
                  href="/cari"
                  className="mt-7 inline-flex min-h-12 items-center rounded-[var(--radius-kecil)] bg-permukaan px-7 text-base font-semibold text-hutan transition hover:opacity-90"
                >
                  Mulai cari rumah
                </Link>
                <p className="mt-2 text-sm opacity-85">Gratis, tanpa daftar, tanpa isi data pribadi.</p>
              </div>
              <div className="relative min-h-[220px]">
                <Image
                  src={fotoTeras}
                  alt="Teras depan sebuah rumah subsidi satu lantai, dengan pintu, jendela lebar, dan tanaman dalam pot."
                  placeholder="blur"
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="object-cover"
                />
              </div>
            </div>
          </Muncul>
        </section>
      </main>

      <footer className="border-t border-garis bg-permukaan">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-end gap-x-10 px-4 py-4 text-sm text-teks-redup sm:px-6">
          <nav aria-label="Tautan bawah" className="flex flex-wrap gap-x-5">
            <Link href="/cari" className="inline-flex min-h-11 items-center hover:text-teks">
              Cari rumah
            </Link>
            <Link href="/cara-kerja" className="inline-flex min-h-11 items-center hover:text-teks">
              Cara kerjanya
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
