/**
 * bersihkan-riwayat-uji.mjs — menghapus catatan riwayat dan penahanan login yang dibuat
 * pengujian fungsional sejak waktu tertentu. Data perumahan tidak disentuh; skrip uji
 * sendiri sudah mengembalikan setiap perubahan lewat antarmuka.
 *
 * Pakai:  node skrip/bersihkan-riwayat-uji.mjs 2026-09-29T03:00:00Z
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const sejak = process.argv[2];
if (!sejak) throw new Error("Waktu mulai pengujian (ISO) wajib diberikan");
const url =
  process.env.DATABASE_URL ?? readFileSync(".env.local", "utf-8").match(/^DATABASE_URL=(\S+)/m)?.[1];
const sql = neon(url);
const r = await sql`DELETE FROM riwayat WHERE waktu >= ${sejak} RETURNING id`;
await sql`DELETE FROM percobaan_login`;
console.log(`Riwayat uji dihapus: ${r.length} baris`);
