"use client";

import { useEffect, useRef, useState } from "react";
import type { BarisAdmin } from "@/lib/dataAdmin";
import { BATAS, KECAMATAN_MOJOKERTO } from "@/lib/perubahan";

export type NilaiForm = {
  nama: string;
  developer: string;
  kecamatan: string;
  desa: string;
  harga: string;
  luasBangunan: string;
  luasLahan: string;
  latitude: string;
  longitude: string;
};

const koma = (n: number) => String(n).replace(".", ",");

/** Pemeriksaan di peramban. Server memeriksa ulang dengan aturan yang sama. */
function periksa(v: NilaiForm): Partial<Record<keyof NilaiForm, string>> {
  const angka = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
  const desimal = (s: string) => Number(s.replace(",", "."));
  const e: Partial<Record<keyof NilaiForm, string>> = {};
  if (v.nama.trim().length < 3) e.nama = "Minimal 3 karakter.";
  if (!KECAMATAN_MOJOKERTO.includes(v.kecamatan)) e.kecamatan = "Pilih kecamatan.";
  const h = angka(v.harga);
  if (!(h >= BATAS.harga.min && h <= BATAS.harga.maks)) e.harga = "Isi harga dalam rupiah, tanpa titik.";
  const lb = desimal(v.luasBangunan);
  if (!(lb >= BATAS.luasBangunan.min && lb <= BATAS.luasBangunan.maks)) e.luasBangunan = "1–500 m².";
  const lt = desimal(v.luasLahan);
  if (!(lt >= BATAS.luasLahan.min && lt <= BATAS.luasLahan.maks)) e.luasLahan = "1–2.000 m².";
  const la = desimal(v.latitude);
  if (!(la >= BATAS.latitude.min && la <= BATAS.latitude.maks)) e.latitude = "Sekitar −7,3 sampai −7,85.";
  const lo = desimal(v.longitude);
  if (!(lo >= BATAS.longitude.min && lo <= BATAS.longitude.maks)) e.longitude = "Sekitar 112,3 sampai 112,8.";
  return e;
}

/**
 * Formulir tambah dan edit perumahan, tampil sebagai dialog.
 *
 * Koordinat bisa ditempel sekaligus dari Google Maps ("-7.51, 112.46") ke kolom lintang;
 * bujurnya diisikan otomatis. Bila koordinat berubah, server menghitung ulang waktu tempuh.
 */
export default function FormPerumahan({
  judul,
  awal,
  sibuk,
  galat,
  onSimpan,
  onKembalikan,
  onTutup,
}: {
  judul: string;
  awal: BarisAdmin | null;
  sibuk: boolean;
  galat: string;
  onSimpan: (v: NilaiForm) => Promise<string | null>;
  onKembalikan?: () => void;
  onTutup: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [v, setV] = useState<NilaiForm>({
    nama: awal?.nama ?? "",
    developer: awal && awal.developer !== "Tidak tercatat" ? awal.developer : "",
    kecamatan: awal?.kecamatan ?? "",
    desa: awal?.desa ?? "",
    harga: awal ? String(awal.harga) : "",
    luasBangunan: awal ? koma(awal.luasBangunan) : "",
    luasLahan: awal ? koma(awal.luasLahan) : "",
    latitude: awal ? koma(awal.latitude) : "",
    longitude: awal ? koma(awal.longitude) : "",
  });
  const [salah, setSalah] = useState<Partial<Record<keyof NilaiForm, string>>>({});
  const [sudahKirim, setSudahKirim] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const lokasiBaru =
    !awal ||
    Number(v.latitude.replace(",", ".")) !== awal.latitude ||
    Number(v.longitude.replace(",", ".")) !== awal.longitude;

  function ubah(k: keyof NilaiForm, nilai: string) {
    // pesan salah pada kolom yang sedang diubah tidak berlaku lagi
    setSalah((l) => ({ ...l, [k]: undefined, ...(k === "latitude" ? { longitude: undefined } : {}) }));
    // tempel "-7.51384, 112.46006" dari Google Maps ke kolom lintang
    if (k === "latitude") {
      const m = nilai.match(/^\s*(-?\d+[.,]\d+)\s*,\s*(\d+[.,]\d+)\s*$/);
      if (m) {
        setV((l) => ({ ...l, latitude: m[1].replace(".", ","), longitude: m[2].replace(".", ",") }));
        return;
      }
    }
    setV((l) => ({ ...l, [k]: nilai }));
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const s = periksa(v);
    setSalah(s);
    if (Object.keys(s).length) return;
    setSudahKirim(true);
    const bersih = { ...v, harga: v.harga.replace(/\./g, "") };
    await onSimpan(bersih);
  }

  const isian = (k: keyof NilaiForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`f-${k}`} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={`f-${k}`}
        value={v[k]}
        onChange={(e) => ubah(k, e.target.value)}
        aria-invalid={Boolean(salah[k])}
        aria-describedby={salah[k] ? `g-${k}` : undefined}
        className={[
          "mt-1 w-full rounded-[var(--radius-kecil)] border bg-permukaan px-3 py-2 text-sm",
          salah[k] ? "border-amber" : "border-garis-kuat",
        ].join(" ")}
        {...props}
      />
      {salah[k] && (
        <p id={`g-${k}`} className="mt-0.5 text-xs font-medium text-amber">
          {salah[k]}
        </p>
      )}
    </div>
  );

  return (
    <dialog
      ref={dialog}
      onClose={onTutup}
      className="m-auto w-[min(94vw,640px)] rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-0 text-teks backdrop:bg-black/40"
    >
      <form onSubmit={kirim} noValidate className="flex max-h-[90vh] flex-col">
        <div className="border-b border-garis px-5 py-4">
          <h2 className="text-base font-semibold">{judul}</h2>
          {awal?.status === "asli" || awal?.status === "diubah" ? (
            <p className="mt-0.5 text-xs text-teks-redup">
              Data penelitian tidak ditimpa. Perubahan disimpan terpisah dan dapat dikembalikan.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{isian("nama", "Nama perumahan", { autoFocus: true, maxLength: 80 })}</div>
          {isian("developer", "Pengembang (tidak wajib)", { maxLength: 80 })}
          <div>
            <label htmlFor="f-kecamatan" className="text-xs font-medium">
              Kecamatan
            </label>
            <select
              id="f-kecamatan"
              value={v.kecamatan}
              onChange={(e) => ubah("kecamatan", e.target.value)}
              aria-invalid={Boolean(salah.kecamatan)}
              className={[
                "mt-1 w-full rounded-[var(--radius-kecil)] border bg-permukaan px-3 py-2 text-sm",
                salah.kecamatan ? "border-amber" : "border-garis-kuat",
              ].join(" ")}
            >
              <option value="">Pilih kecamatan</option>
              {KECAMATAN_MOJOKERTO.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            {salah.kecamatan && <p className="mt-0.5 text-xs font-medium text-amber">{salah.kecamatan}</p>}
          </div>
          {isian("desa", "Desa (tidak wajib)", { maxLength: 60 })}
          {isian("harga", "Harga (Rp)", { inputMode: "numeric", placeholder: "166000000" })}
          {isian("luasBangunan", "Luas bangunan (m²)", { inputMode: "decimal" })}
          {isian("luasLahan", "Luas lahan (m²)", { inputMode: "decimal" })}
          {isian("latitude", "Lintang", { inputMode: "decimal", placeholder: "-7,51384" })}
          {isian("longitude", "Bujur", { inputMode: "decimal", placeholder: "112,46006" })}
          <p className="text-xs leading-relaxed text-teks-redup sm:col-span-2">
            Koordinat bisa disalin dari Google Maps (klik kanan pada titik, lalu salin angkanya) dan
            ditempel ke kolom lintang; bujurnya terisi sendiri.
            {lokasiBaru && (
              <strong className="mt-1 block font-medium text-teks">
                Waktu tempuh ke sekolah, pasar, dan faskes akan dihitung dengan TomTom dan Google.
                Prosesnya sekitar 10–20 detik.
              </strong>
            )}
          </p>
        </div>

        {galat && sudahKirim && (
          <p role="alert" className="mx-5 mb-2 rounded-[var(--radius-kecil)] bg-amber-latar px-3 py-2 text-sm font-medium text-amber">
            {galat}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-garis px-5 py-3">
          <span>
            {onKembalikan && (
              <button type="button" disabled={sibuk} onClick={onKembalikan}
                className="rounded px-3 py-2 text-sm font-medium text-teks-redup hover:bg-permukaan-2 disabled:opacity-60">
                Kembalikan ke data penelitian
              </button>
            )}
          </span>
          <span className="flex gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="rounded px-3 py-2 text-sm font-medium hover:bg-permukaan-2">
              Batal
            </button>
            <button type="submit" disabled={sibuk}
              className="rounded bg-hutan px-4 py-2 text-sm font-semibold text-di-atas-hutan disabled:opacity-60">
              {sibuk ? (lokasiBaru ? "Menghitung waktu tempuh…" : "Menyimpan…") : "Simpan"}
            </button>
          </span>
        </div>
      </form>
    </dialog>
  );
}
