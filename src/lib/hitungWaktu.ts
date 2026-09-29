import { kandidatTerdekat } from "./penyimpanan";
import type { WaktuModa } from "./perubahan";

/**
 * Waktu tempuh untuk perumahan yang ditambahkan atau dipindah lokasinya oleh admin.
 *
 * Caranya sama dengan data penelitian, supaya perumahan baru dinilai setara dengan 84
 * perumahan lain (Subbab 4.1.3 naskah):
 *   1. delapan fasilitas terdekat menurut jarak garis lurus untuk tiap jenis, dicari di
 *      tabel `fasilitas_umum` dengan operator jarak PostGIS (<->) dan indeks GiST,
 *   2. yang tercepat dipilih dengan TomTom Routing, sepeda motor, kondisi lengang,
 *   3. waktu tempuh ke fasilitas itu dihitung dengan Google Routes API untuk sepeda motor
 *      (TWO_WHEELER) dan mobil (DRIVE), pola lalu lintas Senin 07.00 WIB.
 * Satu perumahan memakai 24 permintaan TomTom dan 6 permintaan Google, sekitar 10–20 detik.
 *
 * Sarana peribadatan (kriteria tambahan) tidak dihitung; nilainya kosong, sehingga
 * perumahan baru tidak ikut diperingkatkan selama kriteria itu dinyalakan.
 */
const JENIS = ["sekolah", "pasar", "faskes"] as const;
type Jenis = (typeof JENIS)[number];
const KANDIDAT = 8;
const PUSAT_KAB: [number, number] = [-7.51528, 112.56639];
const BERANGKAT_TOMTOM = "2026-10-05T07:00:00+07:00";
const BERANGKAT_GOOGLE = "2026-10-05T00:00:00Z";

export class GalatHitung extends Error {}

export function haversineM(a: [number, number], b: [number, number]): number {
  const r = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const d1 = rad(b[0] - a[0]);
  const d2 = rad(b[1] - a[1]);
  const h = Math.sin(d1 / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(d2 / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

async function tomtomLengang(asal: [number, number], tujuan: [number, number], kunci: string): Promise<number> {
  const koordinat = `${asal[0]},${asal[1]}:${tujuan[0]},${tujuan[1]}`;
  const url = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${koordinat}/json`);
  url.search = new URLSearchParams({
    key: kunci, travelMode: "motorcycle", routeType: "fastest", traffic: "true",
    departAt: BERANGKAT_TOMTOM, computeTravelTimeFor: "all",
  }).toString();
  // TomTom membatasi sekitar lima permintaan per detik. Jawaban 429 berarti terlalu cepat,
  // bukan kuota habis, jadi dicoba ulang dengan jeda yang makin panjang.
  let res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  for (let coba = 1; res.status === 429 && coba <= 4; coba++) {
    await new Promise((r) => setTimeout(r, 700 * coba));
    res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  }
  if (res.status === 429) throw new GalatHitung("TomTom sedang membatasi laju permintaan. Coba simpan lagi sebentar.");
  if (res.status === 403) throw new GalatHitung("TomTom menolak kunci API atau kuota hari ini habis.");
  if (!res.ok) throw new GalatHitung(`TomTom menjawab ${res.status}.`);
  const s = (await res.json()).routes?.[0]?.summary;
  if (!s) throw new GalatHitung("TomTom tidak menemukan rute.");
  return Number(s.noTrafficTravelTimeInSeconds ?? s.travelTimeInSeconds);
}

async function googleDetik(asal: [number, number], tujuan: [number, number], moda: "TWO_WHEELER" | "DRIVE", kunci: string) {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": kunci,
      "X-Goog-FieldMask": "routes.duration",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: asal[0], longitude: asal[1] } } },
      destination: { location: { latLng: { latitude: tujuan[0], longitude: tujuan[1] } } },
      travelMode: moda,
      routingPreference: "TRAFFIC_AWARE",
      departureTime: BERANGKAT_GOOGLE,
    }),
  });
  if (res.status === 429) throw new GalatHitung("Kuota harian Google Routes habis. Coba lagi besok setelah pukul 14.00 WIB.");
  if (!res.ok) throw new GalatHitung(`Google Routes menjawab ${res.status}.`);
  const durasi = (await res.json()).routes?.[0]?.duration as string | undefined;
  if (!durasi) throw new GalatHitung("Google tidak menemukan rute ke salah satu fasilitas.");
  return Math.round(parseFloat(durasi));
}

/** Menjalankan tugas dengan paling banyak `n` sekaligus, supaya tidak membanjiri layanan. */
async function bertahap<T>(tugas: (() => Promise<T>)[], n: number): Promise<T[]> {
  const hasil: T[] = new Array(tugas.length);
  let berikut = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (berikut < tugas.length) {
        const i = berikut++;
        hasil[i] = await tugas[i]();
      }
    }),
  );
  return hasil;
}

export async function hitungWaktuTempuh(lat: number, lon: number): Promise<{
  waktu: { motor: WaktuModa; mobil: WaktuModa };
  jarakPusatKm: number;
}> {
  const kunciTomTom = process.env.TOMTOM_API_KEY;
  const kunciGoogle = process.env.GOOGLE_MAPS_API_KEY;
  if (!kunciTomTom || !kunciGoogle) {
    throw new GalatHitung("Kunci TomTom atau Google belum diisi di server, jadi waktu tempuh tidak bisa dihitung.");
  }
  const asal: [number, number] = [lat, lon];

  // 1-2. fasilitas tercepat per jenis menurut TomTom
  const tujuan = {} as Record<Jenis, [number, number]>;
  for (const j of JENIS) {
    const dekat = await kandidatTerdekat(j, lat, lon, KANDIDAT);
    const waktu = await bertahap(dekat.map((t) => () => tomtomLengang(asal, t, kunciTomTom)), 2);
    tujuan[j] = dekat[waktu.indexOf(Math.min(...waktu))];
  }

  // 3. waktu Google Senin 07.00 untuk kedua moda
  const pasangan = JENIS.flatMap((j) => (["TWO_WHEELER", "DRIVE"] as const).map((m) => ({ j, m })));
  const detik = await bertahap(pasangan.map(({ j, m }) => () => googleDetik(asal, tujuan[j], m, kunciGoogle)), 3);
  const ambil = (m: "TWO_WHEELER" | "DRIVE", j: Jenis) => detik[pasangan.findIndex((x) => x.j === j && x.m === m)];

  return {
    waktu: {
      motor: { sekolah: ambil("TWO_WHEELER", "sekolah"), pasar: ambil("TWO_WHEELER", "pasar"), faskes: ambil("TWO_WHEELER", "faskes"), ibadah: null },
      mobil: { sekolah: ambil("DRIVE", "sekolah"), pasar: ambil("DRIVE", "pasar"), faskes: ambil("DRIVE", "faskes"), ibadah: null },
    },
    jarakPusatKm: Math.round(haversineM(asal, PUSAT_KAB) / 10) / 100,
  };
}
