import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sesi admin tanpa basis data: cookie berisi waktu kedaluwarsa dan tanda tangan HMAC.
 *
 * Kredensial dan kunci tanda tangan dibaca dari lingkungan server (`.env.local`):
 *   ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET
 * Kalau salah satunya kosong, login ditolak seluruhnya, bukan diloloskan.
 */
export const NAMA_COOKIE = "sesi_admin";
export const UMUR_SESI_DETIK = 8 * 60 * 60;

function kunci(): string | null {
  const s = process.env.ADMIN_SECRET;
  return s && s.length >= 16 ? s : null;
}

function tanda(isi: string, k: string): string {
  return createHmac("sha256", k).update(isi).digest("hex");
}

function samaPersis(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function loginTersedia(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && kunci());
}

/** Memeriksa nama pengguna dan kata sandi. Keduanya selalu dibandingkan supaya waktunya sama. */
export function kredensialBenar(nama: string, sandi: string): boolean {
  if (!loginTersedia()) return false;
  const namaBenar = samaPersis(nama, process.env.ADMIN_USERNAME as string);
  const sandiBenar = samaPersis(sandi, process.env.ADMIN_PASSWORD as string);
  return namaBenar && sandiBenar;
}

export function buatToken(): string {
  const k = kunci();
  if (!k) throw new Error("ADMIN_SECRET belum diisi");
  const habis = String(Math.floor(Date.now() / 1000) + UMUR_SESI_DETIK);
  return `${habis}.${tanda(habis, k)}`;
}

export function tokenSah(token: string | undefined): boolean {
  const k = kunci();
  if (!k || !token) return false;
  const [habis, ttd] = token.split(".");
  if (!habis || !ttd || !samaPersis(ttd, tanda(habis, k))) return false;
  return Number(habis) > Date.now() / 1000;
}

/** Dipakai di komponen server dan route handler. */
export async function adaSesiAdmin(): Promise<boolean> {
  return tokenSah((await cookies()).get(NAMA_COOKIE)?.value);
}
