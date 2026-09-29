import { NextResponse } from "next/server";
import { bacaPerubahan } from "@/lib/penyimpanan";

/**
 * Perubahan admin untuk halaman publik yang dirender di peramban (halaman cari).
 * Isinya bukan rahasia: nilai luas, harga, perumahan nonaktif, dan bobot tambahan.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await bacaPerubahan(), { headers: { "Cache-Control": "no-store" } });
}
