/**
 * isi-database.mjs — membuat tabel di Neon (PostgreSQL + PostGIS) dan mengisi data penelitian.
 *
 * Aman dijalankan berulang: tabel dibuat bila belum ada, dan data penelitian hanya disisipkan
 * bila barisnya belum ada, sehingga perubahan admin yang sudah tersimpan tidak tertimpa.
 * Untuk mengulang dari awal:  node skrip/isi-database.mjs --ulang
 *
 * Sumber:
 *   src/data/perumahan.json        84 perumahan + waktu tempuh (hasil skrip/buat-data.py)
 *   src/data/titik-fasilitas.json  titik sekolah, pasar, faskes dari OpenStreetMap
 *
 * Tabel:
 *   perumahan        satu baris per perumahan, lokasi sebagai geography(Point, 4326)
 *   waktu_tempuh     detik per perumahan, moda, dan jenis fasilitas
 *   fasilitas_umum   titik fasilitas; dipakai mencari kandidat terdekat dengan operator <->
 *   bobot_tambahan   bobot kriteria tambahan yang diubah admin
 *   riwayat          catatan perubahan admin, tampil di dashboard
 *   percobaan_login  penahanan login setelah gagal berturut-turut
 *
 * Pakai:  node skrip/isi-database.mjs   (DATABASE_URL dibaca dari .env.local)
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const url =
  process.env.DATABASE_URL ?? readFileSync(".env.local", "utf-8").match(/^DATABASE_URL=(\S+)/m)?.[1];
if (!url) throw new Error("DATABASE_URL belum diisi");
const sql = neon(url);

const perumahan = JSON.parse(readFileSync("src/data/perumahan.json", "utf-8"));
const titik = JSON.parse(readFileSync("src/data/titik-fasilitas.json", "utf-8"));

if (process.argv.includes("--ulang")) {
  await sql`DROP TABLE IF EXISTS waktu_tempuh, perumahan, fasilitas_umum, bobot_tambahan, riwayat, percobaan_login`;
  console.log("Tabel lama dihapus.");
}

await sql`CREATE EXTENSION IF NOT EXISTS postgis`;
await sql`
  CREATE TABLE IF NOT EXISTS perumahan (
    id             text PRIMARY KEY,
    nama           text NOT NULL,
    developer      text NOT NULL,
    kecamatan      text NOT NULL,
    desa           text NOT NULL DEFAULT '',
    harga          bigint NOT NULL CHECK (harga > 0),
    luas_bangunan  numeric NOT NULL CHECK (luas_bangunan > 0),
    luas_lahan     numeric NOT NULL CHECK (luas_lahan > 0),
    lokasi         geography(Point, 4326) NOT NULL,
    jarak_pusat_km numeric,
    sumber         text NOT NULL CHECK (sumber IN ('penelitian', 'admin')),
    dihapus        boolean NOT NULL DEFAULT false,
    dibuat_pada    timestamptz NOT NULL DEFAULT now(),
    diubah_pada    timestamptz
  )`;
await sql`CREATE INDEX IF NOT EXISTS perumahan_lokasi_idx ON perumahan USING gist (lokasi)`;
await sql`
  CREATE TABLE IF NOT EXISTS waktu_tempuh (
    perumahan_id text NOT NULL REFERENCES perumahan (id) ON DELETE CASCADE,
    moda         text NOT NULL CHECK (moda IN ('motor', 'mobil')),
    fasilitas    text NOT NULL CHECK (fasilitas IN ('sekolah', 'pasar', 'faskes', 'ibadah')),
    detik        integer CHECK (detik > 0),
    layanan      text NOT NULL,
    PRIMARY KEY (perumahan_id, moda, fasilitas)
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS fasilitas_umum (
    id     serial PRIMARY KEY,
    jenis  text NOT NULL CHECK (jenis IN ('sekolah', 'pasar', 'faskes')),
    lokasi geography(Point, 4326) NOT NULL,
    sumber text NOT NULL DEFAULT 'OpenStreetMap, Juni 2026'
  )`;
await sql`CREATE INDEX IF NOT EXISTS fasilitas_lokasi_idx ON fasilitas_umum USING gist (lokasi)`;
await sql`
  CREATE TABLE IF NOT EXISTS bobot_tambahan (
    kunci       text PRIMARY KEY,
    bobot       numeric NOT NULL CHECK (bobot >= 0.01 AND bobot <= 0.5),
    diubah_pada timestamptz NOT NULL DEFAULT now()
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS riwayat (
    id    bigserial PRIMARY KEY,
    waktu timestamptz NOT NULL DEFAULT now(),
    aksi  text NOT NULL,
    nama  text NOT NULL
  )`;
await sql`
  CREATE TABLE IF NOT EXISTS percobaan_login (
    ip             text PRIMARY KEY,
    gagal          integer NOT NULL DEFAULT 0,
    ditahan_sampai timestamptz
  )`;

// ---------------------------------------------------------------- perumahan penelitian
const k = (f) => perumahan.map(f);
const hasil = await sql.query(
  `INSERT INTO perumahan (id, nama, developer, kecamatan, desa, harga, luas_bangunan, luas_lahan,
                          lokasi, jarak_pusat_km, sumber)
   SELECT id, nama, developer, kecamatan, desa, harga, lb, lt,
          ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, jp, 'penelitian'
   FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::bigint[],
               $7::numeric[], $8::numeric[], $9::float8[], $10::float8[], $11::numeric[])
        AS t(id, nama, developer, kecamatan, desa, harga, lb, lt, lat, lon, jp)
   ON CONFLICT (id) DO NOTHING
   RETURNING id`,
  [k((p) => p.id), k((p) => p.nama), k((p) => p.developer), k((p) => p.kecamatan), k((p) => p.desa ?? ""),
   k((p) => p.harga), k((p) => p.luasBangunan), k((p) => p.luasLahan), k((p) => p.latitude),
   k((p) => p.longitude), k((p) => p.jarakPusatKm)],
);
console.log(`perumahan: ${hasil.length} baris baru dari ${perumahan.length}`);

const baris = [];
for (const p of perumahan) {
  for (const moda of ["motor", "mobil"]) {
    for (const f of ["sekolah", "pasar", "faskes", "ibadah"]) {
      baris.push([p.id, moda, f, p.waktu[moda][f], f === "ibadah" ? "OpenRouteService" : "Google Routes API"]);
    }
  }
}
const kolom = (i) => baris.map((b) => b[i]);
const wt = await sql.query(
  `INSERT INTO waktu_tempuh (perumahan_id, moda, fasilitas, detik, layanan)
   SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::integer[], $5::text[])
   ON CONFLICT DO NOTHING RETURNING perumahan_id`,
  [kolom(0), kolom(1), kolom(2), kolom(3), kolom(4)],
);
console.log(`waktu_tempuh: ${wt.length} baris baru dari ${baris.length}`);

// ---------------------------------------------------------------- titik fasilitas
const [{ n }] = await sql`SELECT count(*)::int AS n FROM fasilitas_umum`;
if (n === 0) {
  const t = Object.entries(titik).flatMap(([jenis, daftar]) => daftar.map(([lat, lon]) => [jenis, lat, lon]));
  await sql.query(
    `INSERT INTO fasilitas_umum (jenis, lokasi)
     SELECT jenis, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
     FROM unnest($1::text[], $2::float8[], $3::float8[]) AS t(jenis, lat, lon)`,
    [t.map((x) => x[0]), t.map((x) => x[1]), t.map((x) => x[2])],
  );
  console.log(`fasilitas_umum: ${t.length} titik disisipkan`);
} else {
  console.log(`fasilitas_umum: sudah berisi ${n} titik, dilewati`);
}

const ringkas = await sql`
  SELECT (SELECT count(*) FROM perumahan)::int AS perumahan,
         (SELECT count(*) FROM waktu_tempuh)::int AS waktu,
         (SELECT count(*) FROM fasilitas_umum)::int AS fasilitas`;
console.log("Isi sekarang:", ringkas[0]);
