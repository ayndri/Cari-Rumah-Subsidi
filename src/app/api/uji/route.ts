import { NextResponse } from "next/server";
import { bacaPerubahan, simpanJawabanUji } from "@/lib/penyimpanan";
import { hasilSistem, periksaKiriman } from "@/lib/uji";

/**
 * Menyimpan satu jawaban uji penerimaan.
 *
 * Urutan sistem dihitung di sini dari moda dan tingkat kepentingan responden, dengan data dan
 * perubahan admin yang berlaku saat itu, bukan dipercaya dari peramban. Lima teratas yang
 * tampil di layar responden ikut disimpan untuk dicocokkan dengan hitungan ini.
 */
export async function POST(request: Request) {
  const mentah = await request.text();
  if (mentah.length > 20_000) return NextResponse.json({ pesan: "Kiriman terlalu besar." }, { status: 413 });

  let v: unknown;
  try {
    v = JSON.parse(mentah);
  } catch {
    return NextResponse.json({ pesan: "Kiriman tidak dapat dibaca." }, { status: 400 });
  }
  const hasil = periksaKiriman(v);
  if ("salah" in hasil) return NextResponse.json({ pesan: hasil.salah }, { status: 400 });

  try {
    const pr = await bacaPerubahan();
    const sistem = hasilSistem(hasil.isi.moda, hasil.isi.tingkat, pr);
    if (Object.values(sistem.peringkatPenuh).some((p) => p < 0)) {
      return NextResponse.json(
        { pesan: "Ada perumahan kandidat yang sedang dinonaktifkan admin. Hubungi peneliti." },
        { status: 409 },
      );
    }
    const id = await simpanJawabanUji({ ...hasil.isi, ...sistem });
    return NextResponse.json({ id });
  } catch (e) {
    console.error("simpan uji:", e);
    return NextResponse.json(
      { pesan: "Jawaban belum tersimpan karena server sedang bermasalah. Coba kirim lagi." },
      { status: 503 },
    );
  }
}
