import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";

// Alasan pemilihan huruf ada di DESIGN.md.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "Cari Rumah Subsidi, Kabupaten Mojokerto",
  description:
    "Membandingkan perumahan subsidi di Kabupaten Mojokerto berdasarkan luas rumah, luas tanah, dan waktu tempuh ke sekolah, pasar, serta fasilitas kesehatan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${fraunces.variable} ${publicSans.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
