import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import {
  detailPerumahan,
  keMenit,
  KRITERIA,
  MODA,
  posisiDiAntaraSemua,
  semuaBaris,
  type PerumahanLengkap,
} from "@/lib/data";
import { bacaPerubahan } from "@/lib/penyimpanan";
import { barisKePerumahan, gabungBaris, terapkanKeBaris } from "@/lib/perubahan";
import { bobotDariAHP, hitungPeringkat } from "@/lib/perangkingan";
import PetaSatuTitikKlien from "@/components/PetaSatuTitikKlien";

/** Dirender tiap permintaan supaya perubahan dari panel admin langsung terlihat. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = detailPerumahan(id);
  if (!p) return {};
  return {
    title: `${p.nama}, Kec. ${p.kecamatan}`,
    description: `Rincian ${p.nama} di Desa ${p.desa}, Kecamatan ${p.kecamatan}: luas rumah ${p.luasBangunan} m², luas tanah ${p.luasLahan} m², beserta waktu tempuh ke sekolah, pasar, dan puskesmas terdekat.`,
  };
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const angka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** Kolom yang dibandingkan terhadap seluruh perumahan lain pada bagian kelebihan. */
const PEMBANDING: {
  label: string;
  satuan: string;
  benefit: boolean;
  ambil: (p: PerumahanLengkap) => number | null;
}[] = [
  { label: "Luas rumah", satuan: "m²", benefit: true, ambil: (p) => p.luasBangunan },
  { label: "Luas tanah", satuan: "m²", benefit: true, ambil: (p) => p.luasLahan },
  { label: "Waktu ke sekolah", satuan: "menit", benefit: false, ambil: (p) => p.waktu.motor.sekolah / 60 },
  { label: "Waktu ke pasar", satuan: "menit", benefit: false, ambil: (p) => p.waktu.motor.pasar / 60 },
  { label: "Waktu ke puskesmas", satuan: "menit", benefit: false, ambil: (p) => p.waktu.motor.faskes / 60 },
  { label: "Jarak ke pusat kabupaten", satuan: "km", benefit: false, ambil: (p) => p.jarakPusatKm },
];

const TUJUAN = [
  { label: "Sekolah terdekat", kunci: "sekolah" as const },
  { label: "Pasar atau pertokoan", kunci: "pasar" as const },
  { label: "Puskesmas atau klinik", kunci: "faskes" as const },
];

export default async function DetailPerumahan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pr = await bacaPerubahan();
  const asli = detailPerumahan(id) ?? pr.tambahan.find((t) => t.id === id);
  if (!asli || pr.nonaktif.includes(id)) notFound();
  const p = terapkanKeBaris(asli, pr);
  const aktif = gabungBaris(semuaBaris(), pr);

  const kriteriaInti = KRITERIA.filter((k) => k.inti);
  const peringkat = hitungPeringkat(
    aktif.map((b) => barisKePerumahan(b, "motor")),
    kriteriaInti,
    bobotDariAHP(kriteriaInti),
  );
  const baris = peringkat.find((b) => b.perumahan.id === id);

  const banding = PEMBANDING.map((k) => {
    const nilai = k.ambil(p);
    if (nilai === null) return null;
    return { ...k, nilai, posisi: posisiDiAntaraSemua(nilai, k.ambil, k.benefit, aktif) };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Sepertiga teratas dianggap menonjol, sepertiga terbawah dianggap perlu dipertimbangkan.
  const unggul = banding.filter((b) => b.posisi.urutan <= b.posisi.dari / 3);
  const lemah = banding.filter((b) => b.posisi.urutan > (b.posisi.dari * 2) / 3);

  const hargaPerM2 = p.luasBangunan > 0 ? p.harga / p.luasBangunan : 0;
  const alamat = [p.desa && `Desa ${p.desa}`, `Kecamatan ${p.kecamatan}`, "Kabupaten Mojokerto"]
    .filter(Boolean)
    .join(", ");
  const koordinat = `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header jejak="Rincian perumahan" />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-5 sm:px-6">
        <Link
          href="/cari"
          className="inline-flex min-h-11 items-center text-sm text-daun underline underline-offset-4 sm:min-h-9"
        >
          ← Kembali ke pencarian
        </Link>

        <div className="mt-3 rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="judul text-2xl font-semibold sm:text-3xl">{p.nama}</h1>
              <p className="mt-1 text-teks-redup">{alamat}</p>
              <p className="mt-0.5 text-sm text-teks-redup">Dikembangkan oleh {p.developer}</p>
            </div>

            {baris && (
              <div className="rounded-[var(--radius-kecil)] border border-amber bg-amber-latar px-4 py-3">
                <p className="text-xs text-teks-redup">Peringkat dengan bobot bawaan</p>
                <p className="judul text-2xl font-semibold text-amber">
                  #{baris.peringkat}
                  <span className="text-base font-normal text-teks-redup">
                    {" "}
                    dari {peringkat.length}
                  </span>
                </p>
                <p className="text-xs text-teks-redup">Skor preferensi{" "}
                  {baris.skor.toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</p>
              </div>
            )}
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: "Harga", v: rupiah.format(p.harga) },
              { k: "Luas rumah", v: `${angka.format(p.luasBangunan)} m²` },
              { k: "Luas tanah", v: `${angka.format(p.luasLahan)} m²` },
              { k: "Sisa halaman", v: `${angka.format(p.luasLahan - p.luasBangunan)} m²` },
            ].map((x) => (
              <div key={x.k} className="rounded-[var(--radius-kecil)] bg-permukaan-2 px-4 py-3">
                <dt className="text-sm text-teks-redup">{x.k}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{x.v}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 text-sm text-teks-redup">
            Setara {rupiah.format(hargaPerM2)} per meter persegi bangunan.
          </p>
        </div>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
          <div className="flex flex-col gap-4">
            <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-5">
              <h2 className="judul text-lg font-semibold">Kelebihan dan kekurangannya</h2>
              <p className="mt-1 text-sm text-teks-redup">
                Dibandingkan dengan {aktif.length} perumahan subsidi lain di Kabupaten
                Mojokerto.
              </p>

              {unggul.length > 0 && (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-daun">Yang menonjol</h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {unggul.map((b) => (
                      <li
                        key={b.label}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-[var(--radius-kecil)] bg-permukaan-2 px-4 py-2.5"
                      >
                        <span className="font-medium">{b.label}</span>
                        <span className="text-sm text-teks-redup">
                          <span className="font-semibold tabular-nums text-teks">
                            {angka.format(b.nilai)} {b.satuan}
                          </span>{" "}
                          · peringkat {b.posisi.urutan} dari {b.posisi.dari} · rata-rata{" "}
                          {angka.format(b.posisi.rata)} {b.satuan}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {lemah.length > 0 && (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-amber">
                    Yang perlu kamu pertimbangkan
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {lemah.map((b) => (
                      <li
                        key={b.label}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-[var(--radius-kecil)] bg-amber-latar px-4 py-2.5"
                      >
                        <span className="font-medium">{b.label}</span>
                        <span className="text-sm text-teks-redup">
                          <span className="font-semibold tabular-nums text-teks">
                            {angka.format(b.nilai)} {b.satuan}
                          </span>{" "}
                          · peringkat {b.posisi.urutan} dari {b.posisi.dari} · terbaik{" "}
                          {angka.format(b.posisi.terbaik)} {b.satuan}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {unggul.length === 0 && lemah.length === 0 && (
                <p className="mt-4 text-sm leading-relaxed text-teks-redup">
                  Perumahan ini berada di tengah-tengah pada semua hal yang dibandingkan,
                  tidak ada yang menonjol maupun tertinggal jauh.
                </p>
              )}
            </section>

            <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-5">
              <h2 className="judul text-lg font-semibold">Waktu tempuh dari sini</h2>
              <p className="mt-1 text-sm text-teks-redup">
                Lewat jaringan jalan menuju fasilitas terdekat, dengan pola lalu lintas Senin
                pukul 07.00.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b border-garis text-left text-xs tracking-wide text-teks-redup uppercase">
                      <th className="py-2 pr-3 font-semibold">Tujuan</th>
                      {MODA.map((m) => (
                        <th key={m.nilai} className="py-2 pr-3 text-right font-semibold">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TUJUAN.map((t) => (
                      <tr key={t.kunci} className="border-b border-garis">
                        <td className="py-2.5 pr-3">{t.label}</td>
                        {MODA.map((m) => (
                          <td
                            key={m.nilai}
                            className="py-2.5 pr-3 text-right font-medium whitespace-nowrap tabular-nums"
                          >
                            {keMenit(p.waktu[m.nilai][t.kunci])} menit
                          </td>
                        ))}
                      </tr>
                    ))}
                    {p.jarakPusatKm !== null && (
                      <tr>
                        <td className="py-2.5 pr-3">Pusat kabupaten</td>
                        <td
                          className="py-2.5 pr-3 text-right font-medium tabular-nums"
                          colSpan={MODA.length}
                        >
                          {angka.format(p.jarakPusatKm)} km
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-teks-redup">
                Waktu sepeda motor dan mobil dihitung dengan Google, yang punya profil
                khusus kendaraan roda dua untuk Indonesia. Sepeda motor rata-rata sekitar 9%
                lebih cepat daripada mobil pada jam berangkat kerja.
              </p>
            </section>
          </div>

          <section className="overflow-hidden rounded-[var(--radius-kartu)] border border-garis bg-permukaan">
            <div className="h-[300px] sm:h-[360px]">
              <PetaSatuTitikKlien latitude={p.latitude} longitude={p.longitude} nama={p.nama} />
            </div>

            <div className="border-t border-garis p-5">
              <h2 className="judul text-lg font-semibold">Lokasinya</h2>
              <p className="mt-1 leading-relaxed text-teks-redup">{alamat}</p>
              <p className="mt-1 text-sm tabular-nums text-teks-redup">{koordinat}</p>

              <div className="mt-4 flex flex-col gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-kecil)] bg-hutan px-4 text-sm font-semibold text-di-atas-hutan transition hover:opacity-90"
                >
                  Buka di Google Maps
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-kecil)] border border-hutan px-4 text-sm font-semibold text-hutan transition hover:bg-permukaan-2"
                >
                  Petunjuk arah dari lokasimu
                </a>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-teks-redup">
                Kedua tautan membuka Google Maps di tab baru. Titiknya berasal dari koordinat
                SiKumbang Tapera, jadi bisa menunjuk gerbang kawasan, bukan unit rumah
                tertentu.
              </p>
            </div>
          </section>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-teks-redup">
          Peringkat di halaman ini dihitung dengan bobot bawaan hasil kuesioner dan waktu
          tempuh sepeda motor pada pola lalu lintas Senin pukul 07.00. Angkanya berubah kalau kamu mengubah jawaban di halaman
          pencarian.
        </p>
      </main>
    </div>
  );
}
