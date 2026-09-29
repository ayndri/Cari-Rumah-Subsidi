"use client";

import { useState } from "react";
import { BATAS } from "@/lib/perubahan";

type Item = { kunci: string; nama: string; keterangan: string; bawaan: number; sekarang: number };

const empat = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 });

/** Menyunting bobot dasar kriteria tambahan satu per satu, dengan pilihan kembali ke bawaan. */
export default function EditorBobotTambahan({ awal }: { awal: Item[] }) {
  const [daftar, setDaftar] = useState(awal);
  const [edit, setEdit] = useState<string | null>(null);
  const [nilai, setNilai] = useState("");
  const [pesan, setPesan] = useState<{ kunci: string; teks: string; galat: boolean } | null>(null);
  const [sibuk, setSibuk] = useState(false);

  async function kirim(kunci: string, bobot: number | null) {
    setSibuk(true);
    try {
      const res = await fetch("/api/admin/kriteria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kunci, bobot }),
      });
      const jawab = (await res.json().catch(() => ({}))) as { pesan?: string };
      if (res.ok) {
        setDaftar((l) => l.map((i) => (i.kunci === kunci ? { ...i, sekarang: bobot ?? i.bawaan } : i)));
        setEdit(null);
      }
      setPesan({ kunci, teks: jawab.pesan ?? (res.ok ? "Tersimpan." : "Gagal menyimpan."), galat: !res.ok });
    } catch {
      setPesan({ kunci, teks: "Server tidak bisa dihubungi.", galat: true });
    }
    setSibuk(false);
  }

  function simpan(kunci: string) {
    const b = Number(nilai.replace(",", "."));
    if (!(b >= BATAS.bobot.min && b <= BATAS.bobot.maks)) {
      setPesan({ kunci, teks: `Bobot harus di antara 0,01 dan 0,5.`, galat: true });
      return;
    }
    kirim(kunci, b);
  }

  return (
    <ul className="mt-3 flex flex-col gap-2">
      {daftar.map((k) => (
        <li key={k.kunci} className="rounded-[var(--radius-kecil)] bg-permukaan-2 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="block text-sm font-medium">{k.nama}</span>
              <span className="block text-xs text-teks-redup">{k.keterangan}</span>
            </span>
            {edit === k.kunci ? (
              <span className="flex items-center gap-2">
                <input
                  aria-label={`Bobot ${k.nama}`}
                  inputMode="decimal"
                  value={nilai}
                  onChange={(e) => setNilai(e.target.value)}
                  className="w-20 rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-2 py-1 text-right text-sm tabular-nums"
                />
                <button type="button" disabled={sibuk} onClick={() => simpan(k.kunci)}
                  className="rounded bg-hutan px-2 py-1 text-xs font-semibold text-di-atas-hutan disabled:opacity-60">
                  Simpan
                </button>
                <button type="button" disabled={sibuk} onClick={() => setEdit(null)}
                  className="rounded px-2 py-1 text-xs font-medium text-teks-redup hover:bg-garis">
                  Batal
                </button>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="text-sm tabular-nums">{empat.format(k.sekarang)}</span>
                {k.sekarang !== k.bawaan && (
                  <button type="button" disabled={sibuk} onClick={() => kirim(k.kunci, null)}
                    className="rounded px-2 py-1 text-xs font-medium text-teks-redup hover:bg-garis">
                    Kembalikan {empat.format(k.bawaan)}
                  </button>
                )}
                <button type="button" disabled={sibuk}
                  onClick={() => { setEdit(k.kunci); setNilai(String(k.sekarang).replace(".", ",")); setPesan(null); }}
                  className="rounded px-2 py-1 text-xs font-medium text-daun hover:bg-garis">
                  Ubah
                </button>
              </span>
            )}
          </div>
          {pesan?.kunci === k.kunci && (
            <p role="status" className={["mt-1 text-xs", pesan.galat ? "font-medium text-amber" : "text-daun"].join(" ")}>
              {pesan.teks}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
