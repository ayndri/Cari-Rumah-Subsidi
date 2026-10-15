"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KUNCI_UJI } from "@/lib/pilihan";

/**
 * Tampil di halaman cari hanya ketika responden uji penerimaan sedang di Bagian B.
 * Pengunjung biasa tidak pernah melihatnya.
 *
 * Responden sempat mencari tombol "simpan" yang memang tidak ada, karena pilihan di halaman
 * cari tersimpan sendiri. Bilah ini karena itu menyebutnya terang-terangan dan memberi langkah
 * bernomor. Di layar ponsel hanya ringkasannya yang tampil supaya bilah tidak menutupi isi.
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
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6 sm:py-2.5">
        <div className="min-w-0 text-sm">
          <p className="md:hidden">
            <span className="font-semibold">Bagian B.</span> Atur pilihanmu, <b>tersimpan otomatis</b>.
          </p>
          <p className="hidden md:block">
            <span className="font-semibold">Uji coba, Bagian B: coba websitenya.</span>{" "}
            Pilihanmu <b>tersimpan otomatis</b>, tidak perlu menekan simpan.
          </p>
          <ol className="mt-1 hidden flex-wrap gap-x-5 text-teks-redup md:flex">
            <li><b className="text-teks">1.</b> Pilih kendaraan: sepeda motor atau mobil.</li>
            <li><b className="text-teks">2.</b> Atur seberapa penting tiap hal di kolom kiri.</li>
            <li><b className="text-teks">3.</b> Kalau sudah, tekan tombol di kanan.</li>
          </ol>
          <p className="mt-1 hidden text-xs text-teks-redup md:block">
            Kecamatan biarkan Semua Kecamatan, dan tempat kerja jangan diisi.
          </p>
        </div>
        <Link
          href="/uji"
          className="inline-flex min-h-11 shrink-0 items-center rounded-[var(--radius-kecil)] bg-amber px-4 text-sm font-semibold text-di-atas-amber sm:min-h-9"
        >
          <span className="md:hidden">Selesai</span>
          <span className="hidden md:inline">Selesai, periksa pilihanku</span>
        </Link>
      </div>
    </div>
  );
}
