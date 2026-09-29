import { NextResponse } from "next/server";
import { KRITERIA } from "@/lib/data";
import { aturBobotTambahan } from "@/lib/penyimpanan";
import { BATAS } from "@/lib/perubahan";
import { adaSesiAdmin } from "@/lib/sesi";

/**
 * Mengubah bobot dasar satu kriteria tambahan.
 *
 *   PUT { kunci, bobot }        bobot baru, antara 0,01 dan 0,5
 *   PUT { kunci, bobot: null }  kembali ke bobot bawaan
 *
 * Bobot lima kriteria inti ditolak: nilainya hasil kuesioner AHP (Tabel 4.5 naskah)
 * dan hanya boleh berubah lewat perhitungan ulang kuesioner.
 */
const TAMBAHAN = new Set(KRITERIA.filter((k) => !k.inti).map((k) => k.kunci as string));
const NAMA: Record<string, string> = Object.fromEntries(KRITERIA.map((k) => [k.kunci, `Kriteria “${k.nama}”`]));

export async function PUT(request: Request) {
  if (!(await adaSesiAdmin())) return NextResponse.json({ pesan: "Sesi admin tidak ada." }, { status: 401 });
  let isi: { kunci?: unknown; bobot?: unknown };
  try {
    isi = await request.json();
  } catch {
    return NextResponse.json({ pesan: "Permintaan tidak dapat dibaca." }, { status: 400 });
  }
  const kunci = typeof isi.kunci === "string" ? isi.kunci : "";
  if (!TAMBAHAN.has(kunci)) {
    return NextResponse.json(
      { pesan: "Hanya bobot kriteria tambahan yang bisa diubah. Bobot inti berasal dari kuesioner." },
      { status: 400 },
    );
  }

  if (isi.bobot === null) {
    await aturBobotTambahan(kunci, null, NAMA[kunci]);
    return NextResponse.json({ pesan: "Kembali ke bobot bawaan." });
  }

  const b = Number(isi.bobot);
  if (!Number.isFinite(b) || b < BATAS.bobot.min || b > BATAS.bobot.maks) {
    return NextResponse.json(
      { pesan: `Bobot harus di antara ${BATAS.bobot.min} dan ${BATAS.bobot.maks}.` },
      { status: 400 },
    );
  }
  await aturBobotTambahan(kunci, Math.round(b * 10000) / 10000, NAMA[kunci]);
  return NextResponse.json({ pesan: "Tersimpan." });
}
