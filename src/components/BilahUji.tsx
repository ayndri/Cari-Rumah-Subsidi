"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KUNCI_UJI } from "@/lib/pilihan";

/**
 * Tampil di halaman cari hanya ketika responden uji penerimaan sedang di Bagian B.
 * Pengunjung biasa tidak pernah melihatnya.
 */
export default function BilahUji() {
  const [aktif, setAktif] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem(KUNCI_UJI) ?? "null") as { tahap?: string } | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage baru ada setelah hidrasi
      setAktif(s?.tahap === "pengaturan");
    } catch {
      setAktif(false);
    }
  }, []);

  if (!aktif) return null;
  return (
    <div className="sticky top-0 z-[1000] border-b border-amber/40 bg-amber-latar">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <p className="text-sm">
          <span className="font-semibold">Uji coba, Bagian B.</span> Pilih kendaraan dan atur seberapa
          penting tiap hal sesukamu. Biarkan kecamatan pada Semua Kecamatan dan jangan isi tempat kerja.
        </p>
        <Link
          href="/uji"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-kecil)] bg-amber px-4 text-sm font-semibold text-di-atas-amber sm:min-h-9"
        >
          Sudah, lanjut ke Bagian C
        </Link>
      </div>
    </div>
  );
}
