"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { TempatKerja } from "@/lib/tipe";

type HasilCari = TempatKerja;

/**
 * Kotak pencarian tempat kerja.
 *
 * Saran baru diambil setelah pengguna berhenti mengetik 450 ms dan minimal tiga
 * huruf, supaya satu kata tidak menghabiskan belasan permintaan kuota. Pilihan
 * bisa dipakai dengan tetikus maupun papan ketik (panah, Enter, Esc).
 */
export default function CariTempatKerja({
  terpilih,
  sedangMenghitung,
  onPilih,
  onHapus,
}: {
  terpilih: TempatKerja | null;
  sedangMenghitung: boolean;
  onPilih: (t: TempatKerja) => void;
  onHapus: () => void;
}) {
  const [teks, setTeks] = useState("");
  const [saran, setSaran] = useState<HasilCari[]>([]);
  const [status, setStatus] = useState<"diam" | "mencari" | "kosong" | "galat">("diam");
  const [pesan, setPesan] = useState("");
  const [sorot, setSorot] = useState(-1);
  const [terbuka, setTerbuka] = useState(false);
  const idDaftar = useId();
  const permintaan = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = teks.trim();
    if (q.length < 3) {
      permintaan.current?.abort();
      return;
    }
    const jeda = setTimeout(async () => {
      permintaan.current?.abort();
      const pengendali = new AbortController();
      permintaan.current = pengendali;
      setStatus("mencari");
      try {
        const res = await fetch(`/api/tempat-kerja/cari?q=${encodeURIComponent(q)}`, {
          signal: pengendali.signal,
        });
        const data = (await res.json()) as { hasil?: HasilCari[]; pesan?: string };
        if (!res.ok) {
          setSaran([]);
          setPesan(data.pesan ?? "Pencarian gagal.");
          setStatus("galat");
          return;
        }
        const hasil = data.hasil ?? [];
        setSaran(hasil);
        setSorot(hasil.length ? 0 : -1);
        setStatus(hasil.length ? "diam" : "kosong");
        setTerbuka(true);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setSaran([]);
        setPesan("Pencarian gagal. Periksa sambungan internetmu.");
        setStatus("galat");
      }
    }, 450);
    return () => clearTimeout(jeda);
  }, [teks]);

  function pilih(h: HasilCari) {
    onPilih(h);
    setTeks("");
    setSaran([]);
    setTerbuka(false);
    setStatus("diam");
  }

  if (terpilih) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-kecil)] border border-garis bg-permukaan-2 px-3 py-2">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{terpilih.nama}</span>
          <span className="block truncate text-xs text-teks-redup">
            {sedangMenghitung ? "Menghitung waktu tempuh dari 84 perumahan…" : terpilih.alamat}
          </span>
        </span>
        <button
          type="button"
          onClick={onHapus}
          className="inline-flex min-h-11 items-center text-sm text-daun underline underline-offset-2 sm:min-h-9"
        >
          Ganti tempat kerja
        </button>
      </div>
    );
  }

  const tampilDaftar = terbuka && saran.length > 0;

  return (
    <div className="relative">
      <label htmlFor={`${idDaftar}-input`} className="sr-only">
        Cari lokasi tempat kerjamu
      </label>
      <input
        id={`${idDaftar}-input`}
        type="search"
        autoComplete="off"
        value={teks}
        placeholder="Nama kantor, pabrik, atau alamat tempat kerjamu"
        onChange={(e) => {
          setTeks(e.target.value);
          if (e.target.value.trim().length < 3) {
            setSaran([]);
            setStatus("diam");
          }
        }}
        onFocus={() => setTerbuka(true)}
        onBlur={() => setTimeout(() => setTerbuka(false), 150)}
        onKeyDown={(e) => {
          if (!tampilDaftar) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSorot((s) => (s + 1) % saran.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSorot((s) => (s - 1 + saran.length) % saran.length);
          } else if (e.key === "Enter" && sorot >= 0) {
            e.preventDefault();
            pilih(saran[sorot]);
          } else if (e.key === "Escape") {
            setTerbuka(false);
          }
        }}
        role="combobox"
        aria-expanded={tampilDaftar}
        aria-controls={idDaftar}
        aria-activedescendant={tampilDaftar && sorot >= 0 ? `${idDaftar}-${sorot}` : undefined}
        className="min-h-11 w-full rounded-[var(--radius-kecil)] border border-garis bg-permukaan px-3 text-sm placeholder:text-teks-redup sm:min-h-10"
      />

      {tampilDaftar && (
        <ul
          id={idDaftar}
          role="listbox"
          className="absolute inset-x-0 top-full z-[1000] mt-1 max-h-72 overflow-y-auto rounded-[var(--radius-kecil)] border border-garis bg-permukaan shadow-lg"
        >
          {saran.map((h, i) => (
            <li
              key={`${h.lat},${h.lon},${i}`}
              id={`${idDaftar}-${i}`}
              role="option"
              aria-selected={i === sorot}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pilih(h)}
              onMouseEnter={() => setSorot(i)}
              className={[
                "cursor-pointer px-3 py-2.5",
                i === sorot ? "bg-permukaan-2" : "",
              ].join(" ")}
            >
              <span className="block text-sm font-medium">{h.nama}</span>
              <span className="block text-xs text-teks-redup">{h.alamat}</span>
            </li>
          ))}
        </ul>
      )}

      <p aria-live="polite" className="mt-1.5 text-xs text-teks-redup">
        {status === "mencari" && "Mencari…"}
        {status === "kosong" && "Tidak ketemu. Coba nama lain atau nama jalannya."}
        {status === "galat" && <span className="text-amber">{pesan}</span>}
        {status === "diam" && teks.trim().length < 3 && "Ketik minimal tiga huruf."}
      </p>
    </div>
  );
}
