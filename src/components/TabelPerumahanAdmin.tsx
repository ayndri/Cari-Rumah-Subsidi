"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BarisAdmin, StatusBaris } from "@/lib/dataAdmin";
import FormPerumahan, { type NilaiForm } from "./FormPerumahan";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const menit = (detik: number) => Math.max(1, Math.round(detik / 60));

type Kolom = "peringkat" | "nama" | "kecamatan" | "luasBangunan" | "luasLahan" | "harga" | "faskes";
type Saring = "aktif" | StatusBaris | "semua";

const LABEL_STATUS: Record<StatusBaris, string> = {
  asli: "Data penelitian",
  diubah: "Diubah admin",
  tambahan: "Ditambah admin",
  dihapus: "Dihapus",
};
const WARNA_STATUS: Record<StatusBaris, string> = {
  asli: "text-teks-redup",
  diubah: "text-daun",
  tambahan: "text-daun font-semibold",
  dihapus: "text-amber",
};
const PILIHAN_SARING: { nilai: Saring; label: string }[] = [
  { nilai: "aktif", label: "Semua yang aktif" },
  { nilai: "asli", label: "Data penelitian" },
  { nilai: "diubah", label: "Diubah admin" },
  { nilai: "tambahan", label: "Ditambah admin" },
  { nilai: "dihapus", label: "Dihapus" },
  { nilai: "semua", label: "Semua, termasuk yang dihapus" },
];
const KOLOM: { kunci: Kolom; label: string; kanan?: boolean }[] = [
  { kunci: "peringkat", label: "Rk" },
  { kunci: "nama", label: "Nama perumahan" },
  { kunci: "kecamatan", label: "Kecamatan" },
  { kunci: "luasBangunan", label: "LB (m²)", kanan: true },
  { kunci: "luasLahan", label: "LT (m²)", kanan: true },
  { kunci: "harga", label: "Harga", kanan: true },
  { kunci: "faskes", label: "Sekolah · Pasar · Faskes", kanan: true },
];

type Pesan = { teks: string; galat: boolean } | null;

/**
 * Tabel data perumahan di panel admin.
 *
 * Datanya selalu dari server (`baris`). Setelah menyimpan, halaman diminta memuat ulang
 * data server, sehingga yang tampil tidak pernah berbeda dari yang tersimpan.
 */
export default function TabelPerumahanAdmin({ baris }: { baris: BarisAdmin[] }) {
  const router = useRouter();
  const [cari, setCari] = useState("");
  const [saring, setSaring] = useState<Saring>("aktif");
  const [urut, setUrut] = useState<{ kolom: Kolom; naik: boolean }>({ kolom: "peringkat", naik: true });
  const [perHalaman, setPerHalaman] = useState(10);
  const [halaman, setHalaman] = useState(1);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);

  const [form, setForm] = useState<{ mode: "tambah" } | { mode: "edit"; baris: BarisAdmin } | null>(null);
  const [hapus, setHapus] = useState<BarisAdmin | null>(null);
  const dialogHapus = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (hapus) dialogHapus.current?.showModal();
    else dialogHapus.current?.close();
  }, [hapus]);

  const hitungStatus = useMemo(() => {
    const c: Record<string, number> = { aktif: 0, semua: baris.length };
    for (const b of baris) {
      c[b.status] = (c[b.status] ?? 0) + 1;
      if (b.status !== "dihapus") c.aktif++;
    }
    return c;
  }, [baris]);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    let d = baris.filter((b) =>
      saring === "semua" ? true : saring === "aktif" ? b.status !== "dihapus" : b.status === saring,
    );
    if (q) d = d.filter((b) => `${b.nama} ${b.kecamatan} ${b.developer} ${b.desa}`.toLowerCase().includes(q));
    const arah = urut.naik ? 1 : -1;
    return [...d].sort((a, b) => {
      const x = a[urut.kolom];
      const y = b[urut.kolom];
      if (x === null) return 1;
      if (y === null) return -1;
      return (typeof x === "string" ? x.localeCompare(y as string, "id") : (x as number) - (y as number)) * arah;
    });
  }, [baris, cari, saring, urut]);

  const jumlahHalaman = Math.max(1, Math.ceil(tersaring.length / perHalaman));
  const hal = Math.min(halaman, jumlahHalaman);
  const tampil = tersaring.slice((hal - 1) * perHalaman, hal * perHalaman);

  function aturUrut(kolom: Kolom) {
    setUrut((u) => (u.kolom === kolom ? { kolom, naik: !u.naik } : { kolom, naik: true }));
    setHalaman(1);
  }

  async function kirim(method: string, isi: object): Promise<boolean> {
    setSibuk(true);
    try {
      const res = await fetch("/api/admin/perumahan", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isi),
      });
      const jawab = (await res.json().catch(() => ({}))) as { pesan?: string };
      setPesan({ teks: jawab.pesan ?? (res.ok ? "Tersimpan." : "Gagal menyimpan."), galat: !res.ok });
      if (res.ok) router.refresh();
      return res.ok;
    } catch {
      setPesan({ teks: "Server tidak bisa dihubungi.", galat: true });
      return false;
    } finally {
      setSibuk(false);
    }
  }

  async function simpanForm(nilai: NilaiForm): Promise<string | null> {
    const isi = {
      ...nilai,
      harga: Number(nilai.harga),
      luasBangunan: Number(nilai.luasBangunan.replace(",", ".")),
      luasLahan: Number(nilai.luasLahan.replace(",", ".")),
      latitude: Number(nilai.latitude.replace(",", ".")),
      longitude: Number(nilai.longitude.replace(",", ".")),
    };
    const ok =
      form?.mode === "edit" ? await kirim("PUT", { id: form.baris.id, ...isi }) : await kirim("POST", isi);
    if (ok) {
      setForm(null);
      return null;
    }
    return "gagal";
  }

  const nomorHalaman = Array.from({ length: jumlahHalaman }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === jumlahHalaman || Math.abs(n - hal) <= 1,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="cari" className="text-xs font-medium text-teks-redup">
              Cari
            </label>
            <input
              id="cari"
              type="search"
              value={cari}
              onChange={(e) => {
                setCari(e.target.value);
                setHalaman(1);
              }}
              placeholder="Nama, kecamatan, desa, atau pengembang"
              className="mt-1 w-full rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="saring" className="text-xs font-medium text-teks-redup">
              Tampilkan
            </label>
            <select
              id="saring"
              value={saring}
              onChange={(e) => {
                setSaring(e.target.value as Saring);
                setHalaman(1);
              }}
              className="mt-1 block rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 py-2 text-sm"
            >
              {PILIHAN_SARING.map((p) => (
                <option key={p.nilai} value={p.nilai}>
                  {p.label} ({hitungStatus[p.nilai] ?? 0})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="per-halaman" className="text-xs font-medium text-teks-redup">
              Baris per halaman
            </label>
            <select
              id="per-halaman"
              value={perHalaman}
              onChange={(e) => {
                setPerHalaman(Number(e.target.value));
                setHalaman(1);
              }}
              className="mt-1 block rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 py-2 text-sm"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setForm({ mode: "tambah" })}
            className="rounded-[var(--radius-kecil)] bg-amber px-4 py-2 text-sm font-semibold text-di-atas-amber transition hover:opacity-90"
          >
            + Tambah perumahan
          </button>
        </div>

        {pesan && (
          <p
            role="status"
            className={[
              "mt-3 rounded-[var(--radius-kecil)] px-3 py-2 text-sm",
              pesan.galat ? "bg-amber-latar font-medium text-amber" : "bg-permukaan-2 text-daun",
            ].join(" ")}
          >
            {pesan.teks}
          </p>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-garis text-left text-xs tracking-wide text-teks-redup uppercase">
                {KOLOM.map((k) => {
                  const aktif = urut.kolom === k.kunci;
                  return (
                    <th
                      key={k.kunci}
                      aria-sort={aktif ? (urut.naik ? "ascending" : "descending") : "none"}
                      className={["py-2 pr-3 font-semibold", k.kanan ? "text-right" : ""].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => aturUrut(k.kunci)}
                        className={["inline-flex items-center gap-1 uppercase hover:text-teks", aktif ? "text-teks" : ""].join(" ")}
                      >
                        {k.label}
                        <span aria-hidden="true">{aktif ? (urut.naik ? "▲" : "▼") : "↕"}</span>
                      </button>
                    </th>
                  );
                })}
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((b) => (
                <tr key={b.id} className={["border-b border-garis align-top", b.status === "dihapus" ? "opacity-60" : ""].join(" ")}>
                  <td className="py-2.5 pr-3 tabular-nums text-teks-redup">{b.peringkat ?? "–"}</td>
                  <td className="py-2.5 pr-3">
                    {b.status === "dihapus" ? (
                      <span className="font-medium">{b.nama}</span>
                    ) : (
                      <Link href={`/perumahan/${b.id}`} className="font-medium hover:underline" target="_blank">
                        {b.nama}
                      </Link>
                    )}
                    <span className="block text-xs text-teks-redup">{b.developer}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-teks-redup">
                    {b.kecamatan}
                    {b.desa && <span className="block text-xs">{b.desa}</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{b.luasBangunan}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{b.luasLahan}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums whitespace-nowrap">{rupiah.format(b.harga)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums whitespace-nowrap text-teks-redup">
                    {menit(b.sekolah)} · {menit(b.pasar)} · {menit(b.faskes)} mnt
                  </td>
                  <td className={["py-2.5 pr-3 text-xs whitespace-nowrap", WARNA_STATUS[b.status]].join(" ")}>
                    {LABEL_STATUS[b.status]}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="flex flex-wrap gap-1">
                      {b.status === "dihapus" ? (
                        <button type="button" disabled={sibuk} onClick={() => kirim("PATCH", { id: b.id })}
                          className="rounded px-2 py-1 text-xs font-medium text-daun hover:bg-permukaan-2 disabled:opacity-40">
                          Pulihkan
                        </button>
                      ) : (
                        <>
                          <button type="button" disabled={sibuk} onClick={() => setForm({ mode: "edit", baris: b })}
                            className="rounded px-2 py-1 text-xs font-medium text-daun hover:bg-permukaan-2 disabled:opacity-40">
                            Edit
                          </button>
                          <button type="button" disabled={sibuk} onClick={() => setHapus(b)}
                            className="rounded px-2 py-1 text-xs font-medium text-amber hover:bg-permukaan-2 disabled:opacity-40">
                            Hapus
                          </button>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
              {tampil.length === 0 && (
                <tr>
                  <td colSpan={KOLOM.length + 2} className="py-8 text-center text-sm text-teks-redup">
                    Tidak ada perumahan yang cocok dengan pencarian ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <nav aria-label="Halaman tabel" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-teks-redup" aria-live="polite">
            {tersaring.length === 0
              ? "0 perumahan"
              : `Menampilkan ${(hal - 1) * perHalaman + 1}–${Math.min(hal * perHalaman, tersaring.length)} dari ${tersaring.length} perumahan`}
          </p>
          <span className="flex items-center gap-1">
            <button type="button" disabled={hal <= 1} onClick={() => setHalaman(hal - 1)}
              className="rounded border border-garis px-2.5 py-1 disabled:opacity-40">
              ‹ Sebelumnya
            </button>
            {nomorHalaman.map((n, i) => (
              <span key={n} className="flex items-center gap-1">
                {i > 0 && n - nomorHalaman[i - 1] > 1 && <span className="px-1 text-teks-redup">…</span>}
                <button
                  type="button"
                  aria-current={n === hal ? "page" : undefined}
                  onClick={() => setHalaman(n)}
                  className={[
                    "min-w-8 rounded border px-2 py-1 tabular-nums",
                    n === hal ? "border-hutan bg-hutan font-semibold text-di-atas-hutan" : "border-garis",
                  ].join(" ")}
                >
                  {n}
                </button>
              </span>
            ))}
            <button type="button" disabled={hal >= jumlahHalaman} onClick={() => setHalaman(hal + 1)}
              className="rounded border border-garis px-2.5 py-1 disabled:opacity-40">
              Berikutnya ›
            </button>
          </span>
        </nav>
      </div>

      <p className="text-xs leading-relaxed text-teks-redup">
        Kolom waktu tempuh memakai sepeda motor menurut Google pada Senin pukul 07.00, dalam menit.
        Peringkat memakai bobot bawaan hasil kuesioner.
      </p>

      {form && (
        <FormPerumahan
          judul={form.mode === "tambah" ? "Tambah perumahan" : `Edit ${form.baris.nama}`}
          awal={form.mode === "edit" ? form.baris : null}
          sibuk={sibuk}
          galat={pesan?.galat ? pesan.teks : ""}
          onSimpan={simpanForm}
          onKembalikan={
            form.mode === "edit" && form.baris.status === "diubah"
              ? async () => {
                  if (await kirim("PUT", { id: form.baris.id, kembalikan: true })) setForm(null);
                }
              : undefined
          }
          onTutup={() => {
            setForm(null);
            setPesan(null);
          }}
        />
      )}

      <dialog
        ref={dialogHapus}
        onClose={() => setHapus(null)}
        className="m-auto w-[min(92vw,440px)] rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-5 text-teks backdrop:bg-black/40"
      >
        {hapus && (
          <>
            <h2 className="text-base font-semibold">Hapus {hapus.nama}?</h2>
            <p className="mt-2 text-sm leading-relaxed text-teks-redup">
              {hapus.status === "tambahan"
                ? "Perumahan ini ditambahkan admin dan akan dihapus permanen."
                : "Perumahan ini tidak lagi tampil di peta dan peringkat. Karena berasal dari data penelitian, perumahan ini tetap dapat dipulihkan lewat pilihan Tampilkan: Dihapus."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setHapus(null)} className="rounded px-3 py-2 text-sm font-medium hover:bg-permukaan-2">
                Batal
              </button>
              <button
                type="button"
                disabled={sibuk}
                onClick={async () => {
                  const b = hapus;
                  setHapus(null);
                  await kirim("DELETE", { id: b.id });
                }}
                className="rounded bg-amber px-3 py-2 text-sm font-semibold text-di-atas-amber disabled:opacity-60"
              >
                Ya, hapus
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
