/**
 * perbarui-database.mjs — menyamakan Neon dengan data penelitian setelah dataset diperbarui.
 *
 * isi-database.mjs sengaja tidak menimpa baris yang sudah ada. Skrip ini dipakai kalau data
 * penelitiannya sendiri yang berubah, misalnya koreksi titik pasar 1 Oktober 2026:
 *   - titik fasilitas_umum diganti seluruhnya dari src/data/titik-fasilitas.json
 *   - waktu_tempuh perumahan penelitian diganti dari src/data/perumahan.json, KECUALI
 *     perumahan yang lokasinya dipindah admin (waktunya hasil hitung ulang admin)
 *   - baris ibadah dikosongkan: waktu per agama hanya disimpan di perumahan.json
 *
 * Pakai:  node skrip/perbarui-database.mjs   (DATABASE_URL dibaca dari .env.local)
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const url =
  process.env.DATABASE_URL ?? readFileSync(".env.local", "utf-8").match(/^DATABASE_URL=(\S+)/m)?.[1];
if (!url) throw new Error("DATABASE_URL belum diisi");
const sql = neon(url);
const perumahan = JSON.parse(readFileSync("src/data/perumahan.json", "utf-8"));
const titik = JSON.parse(readFileSync("src/data/titik-fasilitas.json", "utf-8"));

// Perumahan penelitian yang lokasinya tidak diubah admin.
const lokasi = await sql`
  SELECT id, ST_Y(lokasi::geometry) AS lat, ST_X(lokasi::geometry) AS lon
  FROM perumahan WHERE sumber = 'penelitian'`;
const asli = new Map(perumahan.map((p) => [p.id, p]));
const tetap = lokasi
  .filter((r) => {
    const p = asli.get(r.id);
    return p && Math.abs(p.latitude - r.lat) < 1e-6 && Math.abs(p.longitude - r.lon) < 1e-6;
  })
  .map((r) => r.id);
const dipindah = lokasi.map((r) => r.id).filter((id) => !tetap.includes(id));

const baris = [];
for (const id of tetap) {
  const p = asli.get(id);
  for (const moda of ["motor", "mobil"]) {
    for (const f of ["sekolah", "pasar", "faskes"]) baris.push([id, moda, f, p.waktu[moda][f]]);
  }
}
const kol = (i) => baris.map((b) => b[i]);
const diganti = await sql.query(
  `UPDATE waktu_tempuh w SET detik = t.detik, layanan = 'Google Routes API'
   FROM unnest($1::text[], $2::text[], $3::text[], $4::integer[]) AS t(id, moda, fasilitas, detik)
   WHERE w.perumahan_id = t.id AND w.moda = t.moda AND w.fasilitas = t.fasilitas AND w.detik IS DISTINCT FROM t.detik
   RETURNING w.perumahan_id`,
  [kol(0), kol(1), kol(2), kol(3)],
);
const ibadah = await sql`
  UPDATE waktu_tempuh SET detik = NULL, layanan = 'TomTom Routing'
  WHERE fasilitas = 'ibadah' AND detik IS NOT NULL RETURNING perumahan_id`;

const t = Object.entries(titik).flatMap(([jenis, daftar]) => daftar.map(([lat, lon]) => [jenis, lat, lon]));
await sql.transaction([
  sql`DELETE FROM fasilitas_umum`,
  sql.query(
    `INSERT INTO fasilitas_umum (jenis, lokasi)
     SELECT jenis, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
     FROM unnest($1::text[], $2::float8[], $3::float8[]) AS t(jenis, lat, lon)`,
    [t.map((x) => x[0]), t.map((x) => x[1]), t.map((x) => x[2])],
  ),
]);
const jumlah = await sql`SELECT jenis, count(*)::int AS n FROM fasilitas_umum GROUP BY jenis ORDER BY jenis`;

console.log(`waktu_tempuh: ${diganti.length} nilai diganti, ${ibadah.length} baris ibadah dikosongkan`);
console.log(`lokasi dipindah admin (dilewati): ${dipindah.length ? dipindah.join(", ") : "tidak ada"}`);
console.log("fasilitas_umum:", Object.fromEntries(jumlah.map((r) => [r.jenis, r.n])));
