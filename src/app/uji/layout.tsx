import type { Metadata } from "next";

// Halaman untuk responden yang diundang, bukan untuk pengunjung umum.
export const metadata: Metadata = {
  title: "Uji coba, Cari Rumah Subsidi",
  robots: { index: false, follow: false },
};

export default function LayoutUji({ children }: { children: React.ReactNode }) {
  return children;
}
