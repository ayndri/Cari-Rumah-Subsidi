import mentah from "@/data/perumahan.json";
import type { WaktuKerja } from "@/lib/tipe";

/**
 * Waktu tempuh dari ke-84 perumahan menuju satu titik tempat kerja.
 *
 * Tidak bisa dihitung di muka seperti sekolah atau pasar, karena tempat kerja
 * tiap orang berbeda. Karena itu dihitung saat pengguna memilih lokasinya,
 * satu permintaan matriks per moda: 84 asal, 1 tujuan.
 *
 * Asal angkanya: TomTom Matrix Routing v2, travelMode car, untuk sepeda motor dan
 * mobil sekaligus. Kriteria inti memakai Google, tetapi kunci uji coba Google tidak
 * menyediakan perhitungan massal, dan memanggil 84 rute per pencarian terlalu lambat.
 * Seluruh 84 perumahan dihitung dengan cara yang sama, jadi perbandingan
 * antarperumahan untuk kriteria ini tetap setara.
 *
 * Hasil disimpan di memori server per titik (dibulatkan sekitar 10 m), supaya
 * memilih ulang lokasi yang sama tidak membakar kuota.
 */

type Titik = { id: string; latitude: number; longitude: number };
const PERUMAHAN = (mentah as Titik[]).map(({ id, latitude, longitude }) => ({ id, latitude, longitude }));

// Kotak kasar Jawa Timur. Di luar itu bukan tempat kerja yang masuk akal untuk
// penghuni Mojokerto, dan menolaknya mencegah endpoint dipakai sembarangan.
const BATAS = { latMin: -8.9, latMaks: -6.6, lonMin: 110.8, lonMaks: 114.7 };

const simpanan = new Map<string, WaktuKerja>();

async function motorTomTom(lat: number, lon: number): Promise<Record<string, number | null>> {
  const kunci = process.env.TOMTOM_API_KEY;
  if (!kunci) throw new Error("TOMTOM_API_KEY kosong");

  const res = await fetch(`https://api.tomtom.com/routing/matrix/2?key=${kunci}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      origins: PERUMAHAN.map((p) => ({ point: { latitude: p.latitude, longitude: p.longitude } })),
      destinations: [{ point: { latitude: lat, longitude: lon } }],
      options: { departAt: "any", traffic: "historical", travelMode: "car", routeType: "fastest" },
    }),
  });
  if (!res.ok) throw new Error(`TomTom Matrix ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as {
    data?: { originIndex: number; routeSummary?: { travelTimeInSeconds: number } }[];
  };
  const hasil: Record<string, number | null> = Object.fromEntries(PERUMAHAN.map((p) => [p.id, null]));
  for (const sel of data.data ?? []) {
    const p = PERUMAHAN[sel.originIndex];
    if (p && sel.routeSummary) hasil[p.id] = sel.routeSummary.travelTimeInSeconds;
  }
  return hasil;
}

export async function POST(request: Request) {
  let lat: number, lon: number;
  try {
    const isi = (await request.json()) as { lat?: unknown; lon?: unknown };
    lat = Number(isi.lat);
    lon = Number(isi.lon);
  } catch {
    return Response.json({ pesan: "Permintaan tidak terbaca." }, { status: 400 });
  }
  if (
    !Number.isFinite(lat) || !Number.isFinite(lon) ||
    lat < BATAS.latMin || lat > BATAS.latMaks || lon < BATAS.lonMin || lon > BATAS.lonMaks
  ) {
    return Response.json(
      { pesan: "Lokasinya di luar Jawa Timur, jadi tidak dihitung." },
      { status: 400 },
    );
  }

  const kunciSimpan = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const lama = simpanan.get(kunciSimpan);
  if (lama) return Response.json(lama);

  const [motor] = await Promise.allSettled([motorTomTom(lat, lon)]);
  const hasil: WaktuKerja = {
    motor: motor.status === "fulfilled" ? motor.value : null,
    mobil: motor.status === "fulfilled" ? motor.value : null,
    catatan: [],
  };
  if (motor.status === "rejected") {
    console.error("waktu kerja motor:", motor.reason);
    hasil.catatan.push("Waktu tempuh sepeda motor dan mobil ke tempat kerja belum bisa dihitung.");
  }
  if (!hasil.motor) {
    return Response.json(
      { pesan: "Waktu tempuh ke tempat kerja belum bisa dihitung. Layanan peruteannya belum disiapkan atau sedang tidak bisa dihubungi." },
      { status: 503 },
    );
  }

  simpanan.set(kunciSimpan, hasil);
  return Response.json(hasil);
}
