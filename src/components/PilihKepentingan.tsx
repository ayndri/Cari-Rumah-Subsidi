"use client";

import { AGAMA } from "@/lib/data";
import type { Agama, Kriteria, KunciKriteria, TingkatPenting } from "@/lib/tipe";

/**
 * Pengguna hanya menjawab satu pertanyaan per baris: seberapa penting hal ini
 * buat kamu. Tidak ada angka bobot, tidak ada pengurutan dengan panah, tidak
 * ada perbandingan berpasangan.
 *
 * Versi sebelumnya memakai panah kiri-kanan untuk menggeser urutan dan
 * menampilkan angka bobot seperti 0,46. Keduanya dibuang: calon pembeli rumah
 * tidak akan menebak arti panah itu, dan angka bobot tidak berarti apa-apa
 * bagi mereka.
 *
 * Tampil sebagai kolom samping yang ringkas: lima hal dasar selalu terlihat,
 * hal tambahan dilipat supaya hasil dan peta tidak terdorong ke bawah layar.
 */

const PILIHAN: { nilai: TingkatPenting; label: string }[] = [
  { nilai: "abaikan", label: "Tidak penting" },
  { nilai: "penting", label: "Penting" },
  { nilai: "paling", label: "Paling penting" },
];

function Baris({
  k,
  nilai,
  terkunci,
  catatan,
  onUbah,
  agama,
  onUbahAgama,
}: {
  k: Kriteria;
  nilai: TingkatPenting;
  terkunci: boolean;
  catatan?: string;
  onUbah: (kunci: KunciKriteria, nilai: TingkatPenting) => void;
  agama?: Agama | null;
  onUbahAgama?: (agama: Agama | null) => void;
}) {
  return (
    <li className="py-3">
      <p
        className={[
          "text-sm font-medium",
          nilai === "abaikan" ? "text-teks-redup line-through" : "",
        ].join(" ")}
      >
        {k.nama}
      </p>
      {catatan && <p className="text-xs text-teks-redup">{catatan}</p>}
      {k.butuhAgama && onUbahAgama && (
        <label className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-teks-redup">
          Agamamu
          <select
            value={agama ?? ""}
            onChange={(e) => onUbahAgama((e.target.value || null) as Agama | null)}
            className="min-h-11 flex-1 rounded-[var(--radius-kecil)] border border-garis bg-permukaan px-2 text-sm text-teks sm:min-h-9"
          >
            <option value="">Pilih dulu</option>
            {AGAMA.map((a) => (
              <option key={a.nilai} value={a.nilai}>
                {a.label} ({a.tempat})
              </option>
            ))}
          </select>
        </label>
      )}
      <fieldset className="mt-1.5 grid grid-cols-3 gap-1 rounded-[var(--radius-kecil)] bg-permukaan-2 p-1">
        <legend className="sr-only">Seberapa penting {k.nama}</legend>
        {PILIHAN.map((p) => {
          const dipilih = nilai === p.nilai;
          return (
            <button
              key={p.nilai}
              type="button"
              onClick={() => onUbah(k.kunci, p.nilai)}
              aria-pressed={dipilih}
              disabled={terkunci}
              className={[
                "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-kecil)] px-1 text-[13px] leading-tight whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9",
                dipilih
                  ? p.nilai === "paling"
                    ? "bg-amber font-semibold text-di-atas-amber"
                    : "bg-pilih font-semibold text-di-atas-pilih"
                  : "text-teks-redup hover:bg-garis hover:text-teks",
              ].join(" ")}
            >
              {p.label}
            </button>
          );
        })}
      </fieldset>
    </li>
  );
}

export default function PilihKepentingan({
  semuaKriteria,
  tingkat,
  onUbah,
  onSetelUlang,
  adaPerubahan,
  titikAcuanSiap,
  catatanTitikAcuan,
  agama,
  onUbahAgama,
}: {
  semuaKriteria: Kriteria[];
  tingkat: Record<string, TingkatPenting>;
  onUbah: (kunci: KunciKriteria, nilai: TingkatPenting) => void;
  onSetelUlang: () => void;
  adaPerubahan: boolean;
  /** Waktu tempuh ke titik acuan sudah ada untuk moda yang sedang dipilih. */
  titikAcuanSiap?: boolean;
  /** Keterangan singkat di bawah nama kriteria yang butuh titik acuan. */
  catatanTitikAcuan?: string;
  /** Agama untuk kriteria tempat ibadah; kriteria itu terkunci sampai agama dipilih. */
  agama?: Agama | null;
  onUbahAgama?: (agama: Agama | null) => void;
}) {
  // Yang datanya belum ada sama sekali tidak ditampilkan; menyalakannya akan
  // mengosongkan daftar tanpa penjelasan.
  const dasar = semuaKriteria.filter((k) => k.inti);
  const tambahan = semuaKriteria.filter((k) => !k.inti && !k.butuhData);
  const tambahanMenyala = tambahan.filter((k) => (tingkat[k.kunci] ?? "abaikan") !== "abaikan");

  const baris = (k: Kriteria) => (
    <Baris
      key={k.kunci}
      k={k}
      nilai={tingkat[k.kunci] ?? (k.inti ? "penting" : "abaikan")}
      terkunci={(Boolean(k.butuhTitikAcuan) && !titikAcuanSiap) || (Boolean(k.butuhAgama) && !agama)}
      catatan={k.butuhTitikAcuan ? catatanTitikAcuan : k.butuhAgama && !agama ? "Pilih agamamu dulu." : undefined}
      onUbah={onUbah}
      agama={agama}
      onUbahAgama={onUbahAgama}
    />
  );

  return (
    <section
      aria-labelledby="judul-kepentingan"
      className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4"
    >
      <h2 id="judul-kepentingan" className="judul text-lg font-semibold">
        Apa yang penting buat kamu?
      </h2>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm text-teks-redup">Daftarnya langsung berubah.</p>
        {adaPerubahan && (
          <button
            type="button"
            onClick={onSetelUlang}
            className="inline-flex min-h-11 items-center text-sm text-daun underline underline-offset-2 sm:min-h-9"
          >
            Kembalikan seperti semula
          </button>
        )}
      </div>

      <ul className="mt-2 divide-y divide-garis border-t border-garis">{dasar.map(baris)}</ul>

      {tambahan.length > 0 && (
        <details open={tambahanMenyala.length > 0} className="group border-t border-garis">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 text-sm font-medium text-daun">
            <span>
              Tambah hal lain
              {tambahanMenyala.length > 0 && (
                <span className="font-normal text-teks-redup">
                  {" "}
                  ({tambahanMenyala.length} dipakai)
                </span>
              )}
            </span>
            <span aria-hidden className="text-teks-redup transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ul className="divide-y divide-garis border-t border-garis">{tambahan.map(baris)}</ul>
        </details>
      )}
    </section>
  );
}
