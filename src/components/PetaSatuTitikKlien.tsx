"use client";

import dynamic from "next/dynamic";

/**
 * Pembungkus agar peta bisa dipakai dari halaman yang dirender di server.
 *
 * Leaflet menyentuh `window` begitu modulnya dimuat, jadi ia harus dimuat hanya
 * di peramban. `next/dynamic` dengan `ssr: false` hanya boleh dipanggil dari
 * komponen client, dan berkas inilah yang menjadi batasnya.
 */
const Peta = dynamic(() => import("./PetaSatuTitik"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-permukaan-2">
      <p className="text-sm text-teks-redup">Memuat peta…</p>
    </div>
  ),
});

export default function PetaSatuTitikKlien(props: {
  latitude: number;
  longitude: number;
  nama: string;
}) {
  return <Peta {...props} />;
}
