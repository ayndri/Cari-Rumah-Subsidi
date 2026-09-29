"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/perumahan", label: "Data Perumahan" },
  { href: "/admin/fasilitas", label: "Data Fasilitas" },
  { href: "/admin/kriteria", label: "Kriteria & Bobot" },
  { href: "/admin/uji", label: "Uji Penerimaan" },
];

export default function SidebarAdmin() {
  const sekarang = usePathname();

  return (
    <nav
      aria-label="Menu admin"
      className="flex gap-1 overflow-x-auto rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-2 lg:h-fit lg:flex-col lg:overflow-visible"
    >
      {MENU.map((m) => {
        const aktif = sekarang === m.href;
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={aktif ? "page" : undefined}
            className={[
              "shrink-0 rounded-[var(--radius-kecil)] px-3 py-2 text-sm transition lg:shrink",
              aktif
                ? "bg-hutan font-semibold text-di-atas-hutan"
                : "text-teks-redup hover:bg-permukaan-2 hover:text-teks",
            ].join(" ")}
          >
            {m.label}
          </Link>
        );
      })}
      {/* Tautan biasa, bukan Link: route handler ini menghapus cookie lalu mengalihkan. */}
      <a
        href="/api/admin/keluar"
        className="shrink-0 rounded-[var(--radius-kecil)] px-3 py-2 text-sm text-teks-redup transition hover:bg-permukaan-2 hover:text-teks lg:mt-2 lg:shrink lg:border-t lg:border-garis lg:pt-3"
      >
        Keluar
      </a>
    </nav>
  );
}
