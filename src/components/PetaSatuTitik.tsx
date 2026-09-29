"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Peta untuk satu perumahan pada halaman rincian.
 *
 * Perbesarannya lebih rapat daripada peta sebaran supaya jalan di sekitar
 * perumahan ikut terbaca, karena yang ingin diketahui pengunjung halaman ini
 * bukan posisinya di kabupaten, tapi keadaan lingkungan sekitarnya.
 */
export default function PetaSatuTitik({
  latitude,
  longitude,
  nama,
}: {
  latitude: number;
  longitude: number;
  nama: string;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const peta = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!wadah.current || peta.current) return;

    const m = L.map(wadah.current, {
      center: [latitude, longitude],
      zoom: 15,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; kontributor <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);

    L.marker([latitude, longitude], {
      icon: L.divIcon({
        className: "",
        html:
          '<span style="display:block;width:20px;height:20px;border-radius:9999px;' +
          'background:var(--amber);border:3px solid var(--permukaan)"></span>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
      alt: nama,
    })
      .addTo(m)
      .bindPopup(`<strong>${nama}</strong>`);

    m.on("focus", () => m.scrollWheelZoom.enable());
    m.on("blur", () => m.scrollWheelZoom.disable());
    peta.current = m;

    return () => {
      m.remove();
      peta.current = null;
    };
  }, [latitude, longitude, nama]);

  return <div ref={wadah} className="h-full w-full" />;
}
