import { neon } from "@neondatabase/serverless";
import { semuaBaris, type PerumahanLengkap } from "./data";
import {
  PERUBAHAN_KOSONG,
  type Perubahan,
  type PerumahanTambahan,
  type UbahanPerumahan,
  type WaktuModa,
} from "./perubahan";
import type { KunciKriteria, Moda } from "./tipe";

/**
 * Penyimpanan di Neon (PostgreSQL + PostGIS). Tabelnya dibuat oleh `skrip/isi-database.mjs`.
 *
 * Data penelitian tetap ada di `src/data/perumahan.json` sebagai acuan. Tabel `perumahan`
 * menyimpan keadaan yang berlaku; perubahan admin dihitung dengan membandingkan keduanya,
 * sehingga "kembalikan ke data penelitian" cukup menyalin ulang nilai dari berkas acuan.
 *
 * Halaman lain tetap menerima bentuk `Perubahan` yang sama seperti sebelumnya.
 */
function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL belum diisi");
  return neon(url);
}

const ASLI = new Map(semuaBaris().map((p) => [p.id, p]));
const MODA: Moda[] = ["motor", "mobil"];
const FASILITAS = ["sekolah", "pasar", "faskes", "ibadah"] as const;

type BarisDb = {
  id: string; nama: string; developer: string; kecamatan: string; desa: string; harga: string;
  luas_bangunan: string; luas_lahan: string; lat: number; lon: number; jarak_pusat_km: string | null;
  sumber: "penelitian" | "admin"; dihapus: boolean; dibuat_pada: string; diubah_pada: string | null;
};
type BarisWaktu = { perumahan_id: string; moda: Moda; fasilitas: string; detik: number | null };

function waktuDari(rows: BarisWaktu[]) {
  const per = new Map<string, Record<Moda, WaktuModa>>();
  for (const r of rows) {
    const w = per.get(r.perumahan_id) ?? {
      motor: { sekolah: 0, pasar: 0, faskes: 0, ibadah: null },
      mobil: { sekolah: 0, pasar: 0, faskes: 0, ibadah: null },
    };
    (w[r.moda] as Record<string, number | null>)[r.fasilitas] = r.detik;
    per.set(r.perumahan_id, w);
  }
  return per;
}

const sama = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** Keadaan yang berlaku, dalam bentuk perubahan terhadap data penelitian. */
export async function bacaPerubahan(): Promise<Perubahan> {
  if (!process.env.DATABASE_URL) return PERUBAHAN_KOSONG;
  const q = sql();
  const [rows, waktu, bobot, riwayat] = await Promise.all([
    q`SELECT id, nama, developer, kecamatan, desa, harga, luas_bangunan, luas_lahan,
             ST_Y(lokasi::geometry) AS lat, ST_X(lokasi::geometry) AS lon, jarak_pusat_km,
             sumber, dihapus, dibuat_pada, diubah_pada
      FROM perumahan ORDER BY dibuat_pada, id`,
    q`SELECT perumahan_id, moda, fasilitas, detik FROM waktu_tempuh`,
    q`SELECT kunci, bobot FROM bobot_tambahan`,
    q`SELECT waktu, aksi, nama FROM riwayat ORDER BY waktu DESC, id DESC LIMIT 50`,
  ]);
  const w = waktuDari(waktu as BarisWaktu[]);
  const hasil: Perubahan = {
    perumahan: {},
    nonaktif: [],
    tambahan: [],
    bobotTambahan: Object.fromEntries(bobot.map((b) => [b.kunci, Number(b.bobot)])) as Partial<Record<KunciKriteria, number>>,
    riwayat: riwayat.map((r) => ({ waktu: new Date(r.waktu).toISOString(), aksi: r.aksi, nama: r.nama })),
    diubahPada: riwayat[0] ? new Date(riwayat[0].waktu).toISOString() : null,
  };

  for (const r of rows as BarisDb[]) {
    const kini = {
      nama: r.nama, developer: r.developer, kecamatan: r.kecamatan, desa: r.desa,
      harga: Number(r.harga), luasBangunan: Number(r.luas_bangunan), luasLahan: Number(r.luas_lahan),
      latitude: Number(r.lat), longitude: Number(r.lon),
      jarakPusatKm: r.jarak_pusat_km === null ? null : Number(r.jarak_pusat_km),
      waktu: w.get(r.id)!,
    };
    if (r.sumber === "admin") {
      if (r.dihapus) continue;
      const tambahan: PerumahanTambahan = {
        id: r.id, ...kini,
        rasioLahan: Math.round((kini.luasLahan / kini.luasBangunan) * 100) / 100,
        ditambahPada: new Date(r.dibuat_pada).toISOString(),
      };
      hasil.tambahan.push(tambahan);
      continue;
    }
    const a = ASLI.get(r.id);
    if (!a) continue;
    if (r.dihapus) hasil.nonaktif.push(r.id);
    const u: UbahanPerumahan = {};
    for (const f of ["nama", "developer", "kecamatan", "desa"] as const) if (kini[f] !== a[f]) u[f] = kini[f];
    for (const f of ["harga", "luasBangunan", "luasLahan"] as const) if (!sama(kini[f], a[f])) u[f] = kini[f];
    if (!sama(kini.latitude, a.latitude) || !sama(kini.longitude, a.longitude)) {
      Object.assign(u, {
        latitude: kini.latitude, longitude: kini.longitude,
        jarakPusatKm: kini.jarakPusatKm ?? undefined, waktu: kini.waktu,
      });
    }
    if (Object.keys(u).length) hasil.perumahan[r.id] = u;
  }
  return hasil;
}

// ------------------------------------------------------------------ operasi admin
export type IsianPerumahan = {
  nama: string; developer: string; kecamatan: string; desa: string;
  harga: number; luasBangunan: number; luasLahan: number;
};
export type LokasiBaru = {
  latitude: number; longitude: number; jarakPusatKm: number;
  waktu: { motor: WaktuModa; mobil: WaktuModa };
};

function sisipWaktu(id: string, waktu: { motor: WaktuModa; mobil: WaktuModa }) {
  const q = sql();
  return MODA.flatMap((m) =>
    FASILITAS.map((f) => q`
      INSERT INTO waktu_tempuh (perumahan_id, moda, fasilitas, detik, layanan)
      VALUES (${id}, ${m}, ${f}, ${waktu[m][f]}, ${f === "ibadah" ? "OpenRouteService" : "Google Routes API"})
      ON CONFLICT (perumahan_id, moda, fasilitas) DO UPDATE SET detik = EXCLUDED.detik, layanan = EXCLUDED.layanan`),
  );
}

function catatQ(aksi: string, nama: string) {
  return sql()`INSERT INTO riwayat (aksi, nama) VALUES (${aksi}, ${nama})`;
}

export type InfoPerumahan = { sumber: "penelitian" | "admin"; dihapus: boolean; nama: string; lat: number; lon: number };

export async function cariPerumahan(id: string): Promise<InfoPerumahan | null> {
  const r = await sql()`
    SELECT sumber, dihapus, nama, ST_Y(lokasi::geometry) AS lat, ST_X(lokasi::geometry) AS lon
    FROM perumahan WHERE id = ${id}`;
  if (!r[0]) return null;
  return { sumber: r[0].sumber, dihapus: r[0].dihapus, nama: r[0].nama, lat: Number(r[0].lat), lon: Number(r[0].lon) };
}

export async function idTerpakai(): Promise<Set<string>> {
  return new Set((await sql()`SELECT id FROM perumahan`).map((r) => r.id as string));
}

export async function tambahPerumahan(id: string, isi: IsianPerumahan, lokasi: LokasiBaru) {
  const q = sql();
  await q.transaction([
    q`INSERT INTO perumahan (id, nama, developer, kecamatan, desa, harga, luas_bangunan, luas_lahan,
                             lokasi, jarak_pusat_km, sumber, diubah_pada)
      VALUES (${id}, ${isi.nama}, ${isi.developer}, ${isi.kecamatan}, ${isi.desa}, ${isi.harga},
              ${isi.luasBangunan}, ${isi.luasLahan},
              ST_SetSRID(ST_MakePoint(${lokasi.longitude}, ${lokasi.latitude}), 4326)::geography,
              ${lokasi.jarakPusatKm}, 'admin', now())`,
    ...sisipWaktu(id, lokasi.waktu),
    catatQ("Menambah perumahan", isi.nama),
  ]);
}

export async function ubahPerumahan(id: string, isi: IsianPerumahan, lokasi: LokasiBaru | null, aksi: string) {
  const q = sql();
  const perintah = [
    q`UPDATE perumahan SET nama = ${isi.nama}, developer = ${isi.developer}, kecamatan = ${isi.kecamatan},
        desa = ${isi.desa}, harga = ${isi.harga}, luas_bangunan = ${isi.luasBangunan},
        luas_lahan = ${isi.luasLahan}, diubah_pada = now() WHERE id = ${id}`,
  ];
  if (lokasi) {
    perintah.push(q`
      UPDATE perumahan SET lokasi = ST_SetSRID(ST_MakePoint(${lokasi.longitude}, ${lokasi.latitude}), 4326)::geography,
        jarak_pusat_km = ${lokasi.jarakPusatKm} WHERE id = ${id}`);
    perintah.push(...sisipWaktu(id, lokasi.waktu));
  }
  perintah.push(catatQ(aksi, isi.nama));
  await q.transaction(perintah);
}

/** Menyalin ulang nilai data penelitian ke baris perumahan dan waktu tempuhnya. */
export async function kembalikanPerumahan(a: PerumahanLengkap) {
  const q = sql();
  await q.transaction([
    q`UPDATE perumahan SET nama = ${a.nama}, developer = ${a.developer}, kecamatan = ${a.kecamatan},
        desa = ${a.desa}, harga = ${a.harga}, luas_bangunan = ${a.luasBangunan}, luas_lahan = ${a.luasLahan},
        lokasi = ST_SetSRID(ST_MakePoint(${a.longitude}, ${a.latitude}), 4326)::geography,
        jarak_pusat_km = ${a.jarakPusatKm}, diubah_pada = now() WHERE id = ${a.id}`,
    ...sisipWaktu(a.id, a.waktu),
    catatQ("Mengembalikan ke data penelitian", a.nama),
  ]);
}

export async function hapusPerumahan(id: string, sumber: "penelitian" | "admin", nama: string) {
  const q = sql();
  await q.transaction([
    sumber === "admin"
      ? q`DELETE FROM perumahan WHERE id = ${id}`
      : q`UPDATE perumahan SET dihapus = true, diubah_pada = now() WHERE id = ${id}`,
    catatQ(sumber === "admin" ? "Menghapus perumahan tambahan" : "Menghapus perumahan", nama),
  ]);
}

export async function pulihkanPerumahan(id: string, nama: string) {
  const q = sql();
  await q.transaction([
    q`UPDATE perumahan SET dihapus = false, diubah_pada = now() WHERE id = ${id}`,
    catatQ("Memulihkan perumahan", nama),
  ]);
}

export async function aturBobotTambahan(kunci: string, bobot: number | null, nama: string) {
  const q = sql();
  await q.transaction([
    bobot === null
      ? q`DELETE FROM bobot_tambahan WHERE kunci = ${kunci}`
      : q`INSERT INTO bobot_tambahan (kunci, bobot) VALUES (${kunci}, ${bobot})
          ON CONFLICT (kunci) DO UPDATE SET bobot = EXCLUDED.bobot, diubah_pada = now()`,
    catatQ(bobot === null ? "Mengembalikan bobot bawaan" : `Mengubah bobot menjadi ${String(bobot).replace(".", ",")}`, nama),
  ]);
}

// ------------------------------------------------------------------ PostGIS
/** n fasilitas terdekat menurut jarak garis lurus, memakai indeks GiST dan operator <->. */
export async function kandidatTerdekat(jenis: string, lat: number, lon: number, n: number): Promise<[number, number][]> {
  const r = await sql()`
    SELECT ST_Y(lokasi::geometry) AS lat, ST_X(lokasi::geometry) AS lon
    FROM fasilitas_umum WHERE jenis = ${jenis}
    ORDER BY lokasi <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
    LIMIT ${n}`;
  return r.map((x) => [Number(x.lat), Number(x.lon)]);
}

// ------------------------------------------------------------------ penahanan login
export async function sedangDitahan(ip: string): Promise<boolean> {
  const r = await sql()`SELECT 1 FROM percobaan_login WHERE ip = ${ip} AND ditahan_sampai > now()`;
  return r.length > 0;
}

/** Menambah hitungan gagal. Setelah `batas` kali, alamat itu ditahan `tahanDetik` detik. */
export async function catatGagalLogin(ip: string, batas: number, tahanDetik: number) {
  await sql()`
    WITH lama AS (SELECT gagal, ditahan_sampai FROM percobaan_login WHERE ip = ${ip}),
    baru AS (
      SELECT CASE WHEN (SELECT ditahan_sampai FROM lama) <= now() THEN 1
                  ELSE COALESCE((SELECT gagal FROM lama), 0) + 1 END AS gagal
    )
    INSERT INTO percobaan_login (ip, gagal, ditahan_sampai)
    SELECT ${ip}, gagal, CASE WHEN gagal >= ${batas} THEN now() + make_interval(secs => ${tahanDetik}) END FROM baru
    ON CONFLICT (ip) DO UPDATE SET gagal = EXCLUDED.gagal, ditahan_sampai = EXCLUDED.ditahan_sampai`;
}

export async function hapusCatatanLogin(ip: string) {
  await sql()`DELETE FROM percobaan_login WHERE ip = ${ip}`;
}
