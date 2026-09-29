import { NextResponse } from "next/server";
import { NAMA_COOKIE } from "@/lib/sesi";

/** Menghapus cookie sesi lalu kembali ke halaman login. */
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/admin/login?keluar=1", request.url), 303);
  res.cookies.set(NAMA_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
