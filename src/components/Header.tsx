"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Menu hanya memuat tempat yang benar-benar ada. Tidak ada tautan ke halaman
 * yang belum dibuat.
 */
const MENU = [
  { href: "/", label: "Beranda" },
  { href: "/cara-kerja", label: "Cara kerjanya" },
  { href: "/cari", label: "Cari rumah" },
];

export default function Header({ jejak }: { jejak?: string }) {
  const sekarang = usePathname();

  return (
    <header className="border-b border-garis bg-hutan text-di-atas-hutan">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="min-w-0">
          <span className="judul block truncate text-base font-semibold sm:text-lg">
            Cari Rumah Subsidi
          </span>
          <span className="block truncate text-xs opacity-75">
            {jejak ?? "Kabupaten Mojokerto"}
          </span>
        </Link>

        <nav aria-label="Menu utama" className="flex shrink-0 items-center gap-1">
          {MENU.map((m) => {
            const aktif = m.href === "/" ? sekarang === "/" : sekarang.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={aktif ? "page" : undefined}
                className={[
                  "inline-flex min-h-11 items-center rounded-[var(--radius-kecil)] px-3 text-sm transition sm:min-h-9",
                  aktif ? "bg-white/15 font-semibold" : "opacity-85 hover:bg-white/10",
                ].join(" ")}
              >
                {m.label}
              </Link>
            );
          })}
          <Link
            href="/admin/login"
            className="ml-1 inline-flex min-h-11 items-center rounded-[var(--radius-kecil)] border border-current/30 px-3 text-sm transition hover:bg-white/10 sm:min-h-9"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
