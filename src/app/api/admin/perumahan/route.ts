import { NextResponse } from "next/server";
import { semuaBaris } from "@/lib/data";
import { GalatHitung, hitungWaktuTempuh } from "@/lib/hitungWaktu";
import {
  cariPerumahan,
  hapusPerumahan,
  idTerpakai,
  kembalikanPerumahan,
  pulihkanPerumahan,
  tambahPerumahan,
  ubahPerumahan,
  type IsianPerumahan,
} from "@/lib/penyimpanan";
import { BATAS, KECAMATAN_MOJOKERTO } from "@/lib/perubahan";
import { adaSesiAdmin } from "@/lib/sesi";

/**
 * Pengelolaan data perumahan oleh admin. Data disimpan di tabel `perumahan` dan
 * `waktu_tempuh` pada Neon (PostgreSQL + PostGIS).
 *
 *   POST   { nama, developer, kecamatan, desa, harga, luasBangunan, luasLahan, latitude, longitude }
 *          menambah perumahan; waktu tempuhnya dihitung saat itu juga
 *   PUT    { id, ...isian yang sama }   mengubah; bila lokasi berubah, waktu tempuh dihitung ulang
 *   PUT    { id, kembalikan: true }     kembali ke nilai data penelitian
 *   DELETE { id }                       menghapus (data penelitian dapat dipulihkan)
 *   PATCH  { id }                       memulihkan perumahan data penelitian yang dihapus
 */
export const maxDuration = 60;

const ASLI = new Map(semuaBaris().map((p) => [p.id, p]));

type Isian = IsianPerumahan & { latitude: number; longitude: number };

function tolak(pesan: string, status = 400) {
  return NextResponse.json({ pesan }, { status });
}

async function bacaIsi(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Memeriksa seluruh isian formulir. Mengembalikan pesan galat pertama atau isian yang bersih. */
function periksa(isi: Record<string, unknown>): string | Isian {
  const t = (k: string) => (typeof isi[k] === "string" ? (isi[k] as string).trim() : "");
  const n = (k: string) => (typeof isi[k] === "number" ? (isi[k] as number) : Number(isi[k]));
  const dalam = (v: number, b: { min: number; maks: number }) => Number.isFinite(v) && v >= b.min && v <= b.maks;

  const hasil: Isian = {
    nama: t("nama"), developer: t("developer") || "Tidak tercatat", kecamatan: t("kecamatan"), desa: t("desa"),
    harga: Math.round(n("harga")), luasBangunan: n("luasBangunan"), luasLahan: n("luasLahan"),
    latitude: n("latitude"), longitude: n("longitude"),
  };
  if (hasil.nama.length < 3 || hasil.nama.length > 80) return "Nama perumahan harus 3–80 karakter.";
  if (hasil.developer.length > 80) return "Nama pengembang paling banyak 80 karakter.";
  if (!KECAMATAN_MOJOKERTO.includes(hasil.kecamatan)) return "Pilih salah satu kecamatan di Kabupaten Mojokerto.";
  if (hasil.desa.length > 60) return "Nama desa paling banyak 60 karakter.";
  if (!dalam(hasil.harga, BATAS.harga)) return "Harga harus lebih dari nol.";
  if (!dalam(hasil.luasBangunan, BATAS.luasBangunan)) return "Luas bangunan harus 1–500 m².";
  if (!dalam(hasil.luasLahan, BATAS.luasLahan)) return "Luas lahan harus 1–2.000 m².";
  if (!dalam(hasil.latitude, BATAS.latitude) || !dalam(hasil.longitude, BATAS.longitude)) {
    return "Koordinat berada di luar Kabupaten Mojokerto. Periksa lintang (sekitar −7,5) dan bujur (sekitar 112,5).";
  }
  return hasil;
}

function slug(teks: string) {
  return teks.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "perumahan";
}

async function hitung(lat: number, lon: number) {
  try {
    return await hitungWaktuTempuh(lat, lon);
  } catch (e) {
    return e instanceof GalatHitung ? e.message : "Waktu tempuh gagal dihitung.";
  }
}

export async function POST(request: Request) {
  if (!(await adaSesiAdmin())) return tolak("Sesi admin tidak ada.", 401);
  const isi = await bacaIsi(request);
  if (!isi) return tolak("Permintaan tidak dapat dibaca.");
  const hasil = periksa(isi);
  if (typeof hasil === "string") return tolak(hasil);

  const h = await hitung(hasil.latitude, hasil.longitude);
  if (typeof h === "string") return tolak(h, 502);

  const terpakai = await idTerpakai();
  const dasar = slug(hasil.nama);
  let id = dasar;
  for (let i = 2; terpakai.has(id); i++) id = `${dasar}-${i}`;

  await tambahPerumahan(id, hasil, { latitude: hasil.latitude, longitude: hasil.longitude, ...h });
  return NextResponse.json({ pesan: "Perumahan ditambahkan dan waktu tempuhnya sudah dihitung.", id });
}

export async function PUT(request: Request) {
  if (!(await adaSesiAdmin())) return tolak("Sesi admin tidak ada.", 401);
  const isi = await bacaIsi(request);
  const id = typeof isi?.id === "string" ? isi.id : "";
  const info = id ? await cariPerumahan(id) : null;
  if (!isi || !info) return tolak("Perumahan tidak ditemukan.", 404);

  if (isi.kembalikan === true) {
    const asli = ASLI.get(id);
    if (!asli) return tolak("Perumahan tambahan tidak punya data penelitian untuk dikembalikan.");
    await kembalikanPerumahan(asli);
    return NextResponse.json({ pesan: "Kembali ke data penelitian." });
  }

  const hasil = periksa(isi);
  if (typeof hasil === "string") return tolak(hasil);

  const pindah = Math.abs(hasil.latitude - info.lat) > 1e-6 || Math.abs(hasil.longitude - info.lon) > 1e-6;
  let lokasi = null;
  if (pindah) {
    const h = await hitung(hasil.latitude, hasil.longitude);
    if (typeof h === "string") return tolak(h, 502);
    lokasi = { latitude: hasil.latitude, longitude: hasil.longitude, ...h };
  }
  await ubahPerumahan(id, hasil, lokasi, pindah ? "Mengubah data dan lokasi" : "Mengubah data");
  return NextResponse.json({
    pesan: pindah ? "Tersimpan. Lokasi berubah, waktu tempuh sudah dihitung ulang." : "Tersimpan.",
  });
}

export async function DELETE(request: Request) {
  if (!(await adaSesiAdmin())) return tolak("Sesi admin tidak ada.", 401);
  const isi = await bacaIsi(request);
  const id = typeof isi?.id === "string" ? isi.id : "";
  const info = id ? await cariPerumahan(id) : null;
  if (!info) return tolak("Perumahan tidak ditemukan.", 404);
  await hapusPerumahan(id, info.sumber, info.nama);
  return NextResponse.json({
    pesan: info.sumber === "admin" ? "Perumahan tambahan dihapus." : "Dihapus. Data penelitian ini dapat dipulihkan.",
  });
}

export async function PATCH(request: Request) {
  if (!(await adaSesiAdmin())) return tolak("Sesi admin tidak ada.", 401);
  const isi = await bacaIsi(request);
  const id = typeof isi?.id === "string" ? isi.id : "";
  const info = id ? await cariPerumahan(id) : null;
  if (!info || info.sumber !== "penelitian") return tolak("Perumahan tidak ditemukan.", 404);
  await pulihkanPerumahan(id, info.nama);
  return NextResponse.json({ pesan: "Dipulihkan." });
}
