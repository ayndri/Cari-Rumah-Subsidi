"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { BarisPeringkat, TempatKerja } from "@/lib/tipe";

/**
 * Peta sebaran perumahan.
 *
 * Memakai Leaflet langsung, bukan pembungkus React-nya, supaya tidak ada
 * ketergantungan tambahan yang harus dicocokkan versinya, dan supaya penanda
 * bisa digambar dengan token warna yang sama seperti bagian lain halaman.
 *
 * Petak petanya dari OpenStreetMap. Atribusinya wajib ditampilkan dan tidak
 * boleh dilepas, itu syarat lisensinya.
 */

const PUSAT_MOJOKERTO: [number, number] = [-7.47, 112.44];

function penanda(peringkat: number): L.DivIcon {
  const teratas = peringkat === 1;
  const limaBesar = peringkat <= 5;

  if (!limaBesar) {
    return L.divIcon({
      className: "",
      html: `<span style="display:block;width:11px;height:11px;border-radius:9999px;background:var(--teks-redup);border:2px solid var(--permukaan)"></span>`,
      iconSize: [11, 11],
      iconAnchor: [5.5, 5.5],
    });
  }

  const ukuran = teratas ? 30 : 24;
  const latar = teratas ? "var(--amber)" : "var(--hutan)";
  const teks = teratas ? "var(--di-atas-amber)" : "var(--di-atas-hutan)";
  return L.divIcon({
    className: "",
    html:
      `<span style="display:grid;place-items:center;width:${ukuran}px;height:${ukuran}px;` +
      `border-radius:9999px;background:${latar};color:${teks};border:2px solid var(--permukaan);` +
      `font:600 ${teratas ? 13 : 12}px/1 var(--font-public-sans),sans-serif">${peringkat}</span>`,
    iconSize: [ukuran, ukuran],
    iconAnchor: [ukuran / 2, ukuran / 2],
  });
}

/** Kotak, bukan bulatan, supaya tidak tertukar dengan penanda perumahan. */
const PENANDA_KERJA = L.divIcon({
  className: "",
  html:
    `<span style="display:grid;place-items:center;width:40px;height:28px;border-radius:6px;` +
    `background:var(--teks);color:var(--permukaan);border:2px solid var(--permukaan);` +
    `font:600 11px/1 var(--font-public-sans),sans-serif">Kerja</span>`,
  iconSize: [40, 28],
  iconAnchor: [20, 14],
});

function lolos(teks: string): string {
  return teks.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export default function PetaLeaflet({
  peringkat,
  idTerpilih,
  onPilih,
  tempatKerja = null,
}: {
  peringkat: BarisPeringkat[];
  idTerpilih: string | null;
  onPilih: (id: string) => void;
  tempatKerja?: TempatKerja | null;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const peta = useRef<L.Map | null>(null);
  const lapisan = useRef<L.LayerGroup | null>(null);
  const penandaPerId = useRef<Map<string, L.Marker>>(new Map());

  // Peta dibuat sekali; isinya yang diperbarui setiap daftar berubah.
  useEffect(() => {
    if (!wadah.current || peta.current) return;

    const m = L.map(wadah.current, {
      center: PUSAT_MOJOKERTO,
      zoom: 11,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; kontributor <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);

    // Gulir halaman tidak boleh terperangkap di peta; perbesar lewat Ctrl atau tombol.
    m.on("focus", () => m.scrollWheelZoom.enable());
    m.on("blur", () => m.scrollWheelZoom.disable());

    lapisan.current = L.layerGroup().addTo(m);
    peta.current = m;

    return () => {
      m.remove();
      peta.current = null;
      lapisan.current = null;
    };
  }, []);

  useEffect(() => {
    const m = peta.current;
    const grup = lapisan.current;
    if (!m || !grup) return;

    grup.clearLayers();
    penandaPerId.current.clear();

    if (peringkat.length === 0) return;

    for (const b of peringkat) {
      const { perumahan } = b;
      const tanda = L.marker([perumahan.latitude, perumahan.longitude], {
        icon: penanda(b.peringkat),
        title: `${perumahan.nama}, peringkat ${b.peringkat}`,
        zIndexOffset: b.peringkat <= 5 ? 1000 - b.peringkat : 0,
        keyboard: true,
        alt: `${perumahan.nama}, peringkat ${b.peringkat} dari ${peringkat.length}`,
      });

      tanda.bindPopup(
        `<strong>${perumahan.nama}</strong><br>` +
          `Kec. ${perumahan.kecamatan}<br>` +
          `Peringkat ${b.peringkat} &middot; kecocokan ${Math.round(b.skor * 100)}%<br>` +
          `<a href="/perumahan/${perumahan.id}">Lihat rincian</a>`,
        { closeButton: true },
      );
      tanda.on("click", () => onPilih(perumahan.id));
      tanda.addTo(grup);
      penandaPerId.current.set(perumahan.id, tanda);
    }

    const batas = L.latLngBounds(
      peringkat.map((b) => [b.perumahan.latitude, b.perumahan.longitude] as [number, number]),
    );
    if (tempatKerja) {
      L.marker([tempatKerja.lat, tempatKerja.lon], {
        icon: PENANDA_KERJA,
        title: `Tempat kerja: ${tempatKerja.nama}`,
        alt: `Tempat kerja: ${tempatKerja.nama}`,
        zIndexOffset: 2000,
        keyboard: true,
      })
        .bindPopup(`<strong>Tempat kerjamu</strong><br>${lolos(tempatKerja.nama)}`)
        .addTo(grup);
      batas.extend([tempatKerja.lat, tempatKerja.lon]);
    }
    m.fitBounds(batas, { padding: [36, 36], maxZoom: 14 });
  }, [peringkat, onPilih, tempatKerja]);

  // Memilih dari daftar menggeser peta ke penanda yang bersangkutan.
  useEffect(() => {
    const m = peta.current;
    if (!m || !idTerpilih) return;
    const tanda = penandaPerId.current.get(idTerpilih);
    if (!tanda) return;
    m.panTo(tanda.getLatLng(), { animate: true });
    tanda.openPopup();
  }, [idTerpilih]);

  return (
    <div className="relative h-full overflow-hidden rounded-[var(--radius-kartu)] border border-garis">
      <div ref={wadah} className="h-full w-full" />
      {peringkat.length === 0 && (
        <p className="absolute inset-0 z-[500] grid place-items-center bg-permukaan-2/90 px-6 text-center text-sm text-teks-redup">
          Tidak ada perumahan yang cocok dengan penyaringan saat ini.
        </p>
      )}
    </div>
  );
}
