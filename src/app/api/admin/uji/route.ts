import { NextResponse } from "next/server";
import { daftarJawabanUji, hapusJawabanUji } from "@/lib/penyimpanan";
import { adaSesiAdmin } from "@/lib/sesi";
import { keCSV } from "@/lib/uji";

/**
 * Jawaban uji penerimaan untuk admin.
 *
 *   GET ?format=csv    berkas CSV berjudul kolom sama dengan Google Form, untuk olah_uat.py
 *   GET ?format=json   seluruh isi, termasuk urutan sistem dan lima teratas yang dilihat
 *   DELETE ?id=12      menghapus satu jawaban, misalnya percobaan sebelum uji dimulai
 */
export async function GET(request: Request) {
  if (!(await adaSesiAdmin())) return NextResponse.json({ pesan: "Sesi admin tidak ada." }, { status: 401 });
  const semua = await daftarJawabanUji();
  const format = new URL(request.url).searchParams.get("format");
  const tanggal = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    // BOM supaya Excel membaca huruf seperti "–" dengan benar.
    return new Response("﻿" + keCSV(semua), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jawaban-uji-${tanggal}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(JSON.stringify(semua, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(format === "json" ? { "Content-Disposition": `attachment; filename="jawaban-uji-${tanggal}.json"` } : {}),
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(request: Request) {
  if (!(await adaSesiAdmin())) return NextResponse.json({ pesan: "Sesi admin tidak ada." }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ pesan: "id tidak sah." }, { status: 400 });
  const ada = await hapusJawabanUji(id);
  return ada
    ? NextResponse.json({ pesan: "Terhapus." })
    : NextResponse.json({ pesan: "Jawaban tidak ditemukan." }, { status: 404 });
}
