import type { NextRequest } from "next/server";
import type { TempatKerja } from "@/lib/tipe";

/**
 * Mencari lokasi tempat kerja dari teks yang diketik pengguna.
 *
 * Memakai TomTom Search API. Kuncinya dibaca di server dari `TOMTOM_API_KEY`
 * (berkas `.env.local`) dan tidak pernah dikirim ke peramban.
 *
 * Pencarian dibatasi 60 km dari pusat Kabupaten Mojokerto. Radius itu sudah
 * mencakup Surabaya, Sidoarjo, dan Jombang, tempat sebagian besar penghuni
 * rumah subsidi Mojokerto bekerja.
 */

const PUSAT = { lat: -7.47, lon: 112.44 };
const RADIUS_M = 60_000;

type HasilTomTom = {
  type: string;
  poi?: { name?: string };
  address?: { freeformAddress?: string; municipality?: string };
  position: { lat: number; lon: number };
};

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return Response.json({ hasil: [] });
  if (q.length > 100) return Response.json({ pesan: "Kata kuncinya terlalu panjang." }, { status: 400 });

  const kunci = process.env.TOMTOM_API_KEY;
  if (!kunci) {
    return Response.json(
      { pesan: "Pencarian lokasi belum disiapkan di server ini (TOMTOM_API_KEY kosong)." },
      { status: 503 },
    );
  }

  const url = new URL(`https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json`);
  url.search = new URLSearchParams({
    key: kunci,
    countrySet: "ID",
    language: "id-ID",
    limit: "6",
    typeahead: "true",
    lat: String(PUSAT.lat),
    lon: String(PUSAT.lon),
    radius: String(RADIUS_M),
  }).toString();

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`TomTom Search ${res.status}`);
    const data = (await res.json()) as { results?: HasilTomTom[] };

    const hasil: TempatKerja[] = (data.results ?? []).map((r) => {
      const alamat = r.address?.freeformAddress ?? "";
      return {
        nama: r.poi?.name ?? alamat.split(",")[0] ?? q,
        alamat,
        lat: r.position.lat,
        lon: r.position.lon,
      };
    });
    return Response.json({ hasil });
  } catch (e) {
    console.error("cari tempat kerja:", e);
    return Response.json(
      { pesan: "Layanan pencarian lokasi sedang tidak bisa dihubungi. Coba lagi sebentar." },
      { status: 502 },
    );
  }
}
