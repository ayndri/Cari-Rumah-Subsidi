"use client";

import Link from "next/link";
import { susunAlasan } from "@/lib/alasan";
import { keMenit } from "@/lib/data";
import type { BarisPeringkat, Kriteria, KunciKriteria, StatusData } from "@/lib/tipe";

/**
 * Daftar hasil.
 *
 * Yang teratas sengaja dibuat berbeda bentuknya, bukan cuma beda warna: dialah
 * satu-satunya hal yang paling ingin dibaca pengguna di halaman ini.
 *
 * Sistem tidak mengklaim satu perumahan sebagai yang terbaik mutlak. Pengujian
 * ketahanan (Subbab 4.4) menunjukkan peringkat pertama bisa berpindah saat
 * kemacetan disimulasikan makin parah, sedangkan lima besarnya jauh lebih bertahan.
 * Karena itu yang disajikan lima besar.
 *
 * Angka tanpa pembanding tidak menjawab apa-apa ("9 menit itu cepat atau
 * lambat?"), jadi tiap angka diberi garis kecil yang menunjukkan posisinya di
 * antara seluruh perumahan yang sedang dibandingkan.
 */

type Ukuran = {
  kunci: KunciKriteria;
  label: string;
  benefit: boolean;
  tampil: (v: number) => string;
};

const UKURAN: Ukuran[] = [
  { kunci: "luasBangunan", label: "Rumah", benefit: true, tampil: (v) => `${v} m²` },
  { kunci: "luasLahan", label: "Tanah", benefit: true, tampil: (v) => `${v} m²` },
  { kunci: "sekolah", label: "Ke sekolah", benefit: false, tampil: (v) => `${keMenit(v)} mnt` },
  { kunci: "pasar", label: "Ke pasar", benefit: false, tampil: (v) => `${keMenit(v)} mnt` },
  { kunci: "faskes", label: "Ke faskes", benefit: false, tampil: (v) => `${keMenit(v)} mnt` },
  { kunci: "tempatKerja", label: "Ke tempat kerja", benefit: false, tampil: (v) => `${keMenit(v)} mnt` },
];

function ukuranDipakai(kriteriaAktif: Kriteria[]): Ukuran[] {
  const kerja = kriteriaAktif.some((k) => k.kunci === "tempatKerja");
  return UKURAN.filter((u) => u.kunci !== "tempatKerja" || kerja);
}

const rupiah = (n: number) =>
  n > 0
    ? `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n / 1_000_000)} juta`
    : "Harga belum tercatat";

/** Bagian perumahan lain yang lebih buruk pada ukuran ini, 0 sampai 1. */
function posisi(nilai: number, semua: number[], benefit: boolean): number {
  if (semua.length < 2) return 1;
  const lebihBuruk = semua.filter((v) => (benefit ? v < nilai : v > nilai)).length;
  return lebihBuruk / (semua.length - 1);
}

/** Satu nilai beserta garis posisinya. */
function Angka({
  ukuran,
  nilai,
  semua,
}: {
  ukuran: Ukuran;
  nilai: number | null;
  semua: number[];
}) {
  if (typeof nilai !== "number") {
    return (
      <div className="min-w-0">
        <dt className="truncate text-xs text-teks-redup">{ukuran.label}</dt>
        <dd className="text-sm font-semibold">–</dd>
      </div>
    );
  }
  const p = posisi(nilai, semua, ukuran.benefit);
  const persen = Math.round(p * 100);
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-teks-redup">{ukuran.label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{ukuran.tampil(nilai)}</dd>
      <dd
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-permukaan-2"
        title={`Lebih baik dari ${persen}% perumahan di daftar`}
      >
        {/* Satu warna saja; amber disimpan untuk pilihan teratas (DESIGN.md). */}
        <span className="block h-full rounded-full bg-daun" style={{ width: `${Math.max(6, persen)}%` }} />
        <span className="sr-only">Lebih baik dari {persen}% perumahan di daftar</span>
      </dd>
    </div>
  );
}

function DeretAngka({
  baris,
  ukuran,
  kolom,
  besar = false,
}: {
  baris: BarisPeringkat;
  ukuran: Ukuran[];
  kolom: Record<string, number[]>;
  besar?: boolean;
}) {
  return (
    <dl
      className={[
        "grid grid-cols-3 gap-x-4 gap-y-3",
        besar ? "mt-4 border-t border-amber/30 pt-3" : "mt-3 border-t border-garis pt-3",
      ].join(" ")}
    >
      {ukuran.map((u) => (
        <Angka key={u.kunci} ukuran={u} nilai={baris.perumahan.nilai[u.kunci]} semua={kolom[u.kunci]} />
      ))}
    </dl>
  );
}

/** "a", "a dan b", "a, b, dan c" */
function daftarKata(kata: string[]): string {
  if (kata.length <= 1) return kata.join("");
  if (kata.length === 2) return `${kata[0]} dan ${kata[1]}`;
  return `${kata.slice(0, -1).join(", ")}, dan ${kata.at(-1)}`;
}

/**
 * Kalau peringkat 1 dan 2 hampir seri, pengguna perlu tahu dua hal: bahwa
 * selisihnya kecil, dan apa yang sebenarnya dipertukarkan.
 */
function CatatanBedaTipis({
  satu,
  dua,
  ukuran,
}: {
  satu: BarisPeringkat;
  dua: BarisPeringkat | undefined;
  ukuran: Ukuran[];
}) {
  if (!dua || satu.skor - dua.skor >= 0.02) return null;
  const unggul: string[] = [];
  const kalah: string[] = [];
  for (const u of ukuran) {
    const a = satu.perumahan.nilai[u.kunci];
    const b = dua.perumahan.nilai[u.kunci];
    if (typeof a !== "number" || typeof b !== "number" || a === b) continue;
    const lebihBaik = u.benefit ? a > b : a < b;
    (lebihBaik ? unggul : kalah).push(u.label.replace(/^Ke /, "").toLowerCase());
  }
  return (
    <p className="mt-3 rounded-[var(--radius-kecil)] bg-permukaan px-3 py-2 text-sm leading-relaxed">
      <span className="font-semibold">Beda tipis dengan {dua.perumahan.nama}</span> (
      {Math.round(dua.skor * 100)}%).
      {unggul.length > 0 && ` Unggul di ${daftarKata(unggul)}.`}
      {kalah.length > 0 && ` Kalah di ${daftarKata(kalah)}.`} Coba bandingkan keduanya.
    </p>
  );
}

export default function HasilRekomendasi({
  status,
  peringkat,
  kriteriaAktif,
  idTerpilih,
  kecamatan,
  onPilih,
  onSetelUlangKecamatan,
  onCobaLagi,
}: {
  status: StatusData;
  peringkat: BarisPeringkat[];
  kriteriaAktif: Kriteria[];
  idTerpilih: string | null;
  kecamatan: string;
  onPilih: (id: string) => void;
  onSetelUlangKecamatan: () => void;
  onCobaLagi: () => void;
}) {
  if (status === "memuat") {
    return (
      <Bingkai>
        <p className="py-10 text-center text-sm text-teks-redup">
          Sebentar, sedang membandingkan perumahannya…
        </p>
      </Bingkai>
    );
  }

  if (status === "gagal") {
    return (
      <Bingkai>
        <div className="py-8 text-center">
          <p className="font-medium">Datanya gagal dimuat.</p>
          <p className="mt-1 text-sm text-teks-redup">
            Sambungan ke server terputus, jadi daftarnya belum bisa ditampilkan.
          </p>
          <button
            type="button"
            onClick={onCobaLagi}
            className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-kecil)] bg-hutan px-4 text-sm font-medium text-di-atas-hutan transition hover:opacity-90"
          >
            Muat ulang data
          </button>
        </div>
      </Bingkai>
    );
  }

  if (peringkat.length === 0) {
    return (
      <Bingkai>
        <div className="py-8 text-center">
          <p className="font-medium">Belum ada yang cocok di sini.</p>
          <p className="mt-1 text-sm text-teks-redup">
            Tidak ada perumahan subsidi di {kecamatan} pada data ini.
          </p>
          <button
            type="button"
            onClick={onSetelUlangKecamatan}
            className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-kecil)] bg-hutan px-4 text-sm font-medium text-di-atas-hutan transition hover:opacity-90"
          >
            Lihat seluruh kecamatan
          </button>
        </div>
      </Bingkai>
    );
  }

  const ukuran = ukuranDipakai(kriteriaAktif);
  const kolom: Record<string, number[]> = Object.fromEntries(
    ukuran.map((u) => [
      u.kunci,
      peringkat.map((b) => b.perumahan.nilai[u.kunci]).filter((v): v is number => typeof v === "number"),
    ]),
  );

  const [teratas, ...berikutnya] = peringkat.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      <KartuTeratas
        baris={teratas}
        kedua={peringkat[1]}
        semua={peringkat}
        kriteriaAktif={kriteriaAktif}
        ukuran={ukuran}
        kolom={kolom}
        onPilih={onPilih}
      />

      <ol className="flex flex-col gap-3">
        {berikutnya.map((b) => (
          <li key={b.perumahan.id}>
            <KartuBiasa
              baris={b}
              semua={peringkat}
              kriteriaAktif={kriteriaAktif}
              ukuran={ukuran}
              kolom={kolom}
              dipilih={b.perumahan.id === idTerpilih}
              onPilih={onPilih}
            />
          </li>
        ))}
      </ol>

      <p className="flex items-center gap-2 px-1 text-xs text-teks-redup">
        <span aria-hidden className="relative h-1.5 w-8 shrink-0 overflow-hidden rounded-full bg-permukaan-2">
          <span className="absolute inset-y-0 left-0 w-3/4 rounded-full bg-daun" />
        </span>
        Makin panjang garisnya, makin baik dibanding {peringkat.length} perumahan lain di daftar.
      </p>

    </div>
  );
}

function Bingkai({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan px-4">
      {children}
    </div>
  );
}

function KartuTeratas({
  baris,
  kedua,
  semua,
  kriteriaAktif,
  ukuran,
  kolom,
  onPilih,
}: {
  baris: BarisPeringkat;
  kedua: BarisPeringkat | undefined;
  semua: BarisPeringkat[];
  kriteriaAktif: Kriteria[];
  ukuran: Ukuran[];
  kolom: Record<string, number[]>;
  onPilih: (id: string) => void;
}) {
  const alasan = susunAlasan(baris, semua, kriteriaAktif);
  const p = baris.perumahan;
  return (
    <article className="rounded-[var(--radius-kartu)] border border-amber bg-amber-latar p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber">Paling cocok buat kamu</p>
          <h3 className="judul mt-1 text-2xl font-semibold">
            <button
              type="button"
              onClick={() => onPilih(p.id)}
              className="inline-flex min-h-11 items-center text-left hover:underline sm:min-h-0"
            >
              {p.nama}
            </button>
          </h3>
          <p className="mt-0.5 text-sm text-teks-redup">
            Kec. {p.kecamatan} · {p.developer}
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="judul block text-3xl leading-none font-semibold text-amber tabular-nums">
            {Math.round(baris.skor * 100)}%
          </span>
          <span className="text-xs text-teks-redup">kecocokan</span>
        </p>
      </div>

      {alasan && <p className="mt-3 text-[15px] leading-relaxed">{alasan}</p>}

      <CatatanBedaTipis satu={baris} dua={kedua} ukuran={ukuran} />

      <DeretAngka baris={baris} ukuran={ukuran} kolom={kolom} besar />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href={`/perumahan/${p.id}`}
          className="inline-flex min-h-11 items-center rounded-[var(--radius-kecil)] bg-amber px-4 text-sm font-semibold text-di-atas-amber transition hover:opacity-90"
        >
          Lihat rincian {p.nama}
        </Link>
        <p className="judul text-lg font-semibold">{rupiah(p.harga)}</p>
      </div>
      <p className="mt-2 text-xs leading-snug text-teks-redup">
        Kecocokan dibanding {semua.length} perumahan di daftar, bukan nilai mutlak.
      </p>
    </article>
  );
}

function KartuBiasa({
  baris,
  semua,
  kriteriaAktif,
  ukuran,
  kolom,
  dipilih,
  onPilih,
}: {
  baris: BarisPeringkat;
  semua: BarisPeringkat[];
  kriteriaAktif: Kriteria[];
  ukuran: Ukuran[];
  kolom: Record<string, number[]>;
  dipilih: boolean;
  onPilih: (id: string) => void;
}) {
  const alasan = susunAlasan(baris, semua, kriteriaAktif);
  const p = baris.perumahan;
  return (
    <article
      className={[
        "rounded-[var(--radius-kartu)] border bg-permukaan p-4 transition",
        dipilih ? "border-daun" : "border-garis hover:border-garis-kuat",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="judul w-7 shrink-0 text-2xl leading-none font-semibold text-daun tabular-nums">
          {baris.peringkat}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="min-w-0 font-semibold">
              <button
                type="button"
                onClick={() => onPilih(p.id)}
                className="inline-flex min-h-11 items-center text-left hover:underline sm:min-h-0"
              >
                {p.nama}
              </button>
            </h3>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {Math.round(baris.skor * 100)}%
            </span>
          </div>
          <p className="text-sm text-teks-redup">
            Kec. {p.kecamatan} · {rupiah(p.harga)}
          </p>
          {alasan && <p className="mt-1.5 text-sm leading-relaxed">{alasan}</p>}

          <DeretAngka baris={baris} ukuran={ukuran} kolom={kolom} />

          <Link
            href={`/perumahan/${p.id}`}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-daun underline underline-offset-2 sm:min-h-9"
          >
            Rincian
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Urutan lengkap dalam bentuk tabel, supaya perumahan di luar lima besar pun
 * bisa dibandingkan angkanya, bukan hanya namanya. Dipasang selebar halaman di
 * bawah susunan tiga kolom, karena kolom tengah terlalu sempit untuk tabel.
 */
export function TabelUrutan({
  peringkat,
  kriteriaAktif,
  idTerpilih,
  onPilih,
}: {
  peringkat: BarisPeringkat[];
  kriteriaAktif: Kriteria[];
  idTerpilih: string | null;
  onPilih: (id: string) => void;
}) {
  if (peringkat.length <= 5) return null;
  // Dipadatkan: luas digabung satu kolom, satuan pindah ke judul kolom.
  const waktu = ukuranDipakai(kriteriaAktif).filter((u) => !u.benefit);
  return (
    <details className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-medium">
        <span>Lihat urutan lengkap {peringkat.length} perumahan</span>
        <span className="text-xs font-normal text-teks-redup">tabel</span>
      </summary>
      <div className="overflow-x-auto border-t border-garis">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-garis text-left align-bottom text-xs text-teks-redup">
              <th className="py-2 pr-2 pl-4 font-semibold">#</th>
              <th className="py-2 pr-3 font-semibold">Perumahan</th>
              <th className="py-2 pr-3 text-right font-semibold">
                Rumah/tanah
                <span className="block font-normal">m²</span>
              </th>
              {waktu.map((u) => {
                const nama = u.label.replace(/^Ke /, "");
                return (
                  <th key={u.kunci} className="py-2 pr-3 text-right font-semibold">
                    {nama.charAt(0).toUpperCase() + nama.slice(1)}
                    <span className="block font-normal">menit</span>
                  </th>
                );
              })}
              <th className="py-2 pr-3 text-right font-semibold">
                Harga
                <span className="block font-normal">juta</span>
              </th>
              <th className="py-2 pr-4 text-right font-semibold">Cocok</th>
            </tr>
          </thead>
          <tbody>
            {peringkat.map((b) => {
              const p = b.perumahan;
              return (
                <tr
                  key={p.id}
                  className={[
                    "border-b border-garis last:border-b-0",
                    p.id === idTerpilih ? "bg-permukaan-2" : "",
                  ].join(" ")}
                >
                  <td className="py-2 pr-2 pl-4 tabular-nums text-teks-redup">{b.peringkat}</td>
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      onClick={() => onPilih(p.id)}
                      className="text-left font-medium hover:underline"
                    >
                      {p.nama}
                    </button>
                    <span className="block text-xs text-teks-redup">
                      {p.kecamatan} ·{" "}
                      <Link href={`/perumahan/${p.id}`} className="text-daun underline underline-offset-2">
                        rincian
                      </Link>
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                    {p.nilai.luasBangunan}/{p.nilai.luasLahan}
                  </td>
                  {waktu.map((u) => {
                    const v = p.nilai[u.kunci];
                    return (
                      <td key={u.kunci} className="py-2 pr-3 text-right tabular-nums">
                        {typeof v === "number" ? keMenit(v) : "–"}
                      </td>
                    );
                  })}
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {p.harga > 0 ? Math.round(p.harga / 1_000_000) : "–"}
                  </td>
                  <td className="py-2 pr-4 text-right font-semibold tabular-nums">
                    {Math.round(b.skor * 100)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
