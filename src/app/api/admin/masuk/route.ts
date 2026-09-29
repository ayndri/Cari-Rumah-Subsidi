import { NextResponse } from "next/server";
import { catatGagalLogin, hapusCatatanLogin, sedangDitahan } from "@/lib/penyimpanan";
import { buatToken, kredensialBenar, loginTersedia, NAMA_COOKIE, UMUR_SESI_DETIK } from "@/lib/sesi";

/**
 * Login admin. Menerima { nama, sandi } dan memasang cookie sesi bila benar.
 *
 * Percobaan gagal dicatat per alamat IP di tabel `percobaan_login`, supaya berlaku di semua
 * instans server. Setelah lima kali gagal, alamat itu ditahan satu menit.
 */
const GAGAL_MAKS = 5;
const TAHAN_DETIK = 60;

export async function POST(request: Request) {
  if (!loginTersedia()) {
    return NextResponse.json(
      { pesan: "Login admin belum disiapkan di server ini." },
      { status: 503 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "lokal";
  if (await sedangDitahan(ip)) {
    return NextResponse.json(
      { pesan: "Terlalu banyak percobaan gagal. Coba lagi satu menit lagi." },
      { status: 429 },
    );
  }

  let nama = "";
  let sandi = "";
  try {
    const isi = (await request.json()) as { nama?: unknown; sandi?: unknown };
    nama = typeof isi.nama === "string" ? isi.nama.trim() : "";
    sandi = typeof isi.sandi === "string" ? isi.sandi : "";
  } catch {
    return NextResponse.json({ pesan: "Permintaan tidak dapat dibaca." }, { status: 400 });
  }

  if (!nama || !sandi) {
    return NextResponse.json({ pesan: "Nama pengguna dan kata sandi wajib diisi." }, { status: 400 });
  }

  if (!kredensialBenar(nama, sandi)) {
    await catatGagalLogin(ip, GAGAL_MAKS, TAHAN_DETIK);
    return NextResponse.json({ pesan: "Nama pengguna atau kata sandi salah." }, { status: 401 });
  }

  await hapusCatatanLogin(ip);
  const res = NextResponse.json({ pesan: "Berhasil masuk." });
  res.cookies.set(NAMA_COOKIE, buatToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && request.url.startsWith("https"),
    path: "/",
    maxAge: UMUR_SESI_DETIK,
  });
  return res;
}
