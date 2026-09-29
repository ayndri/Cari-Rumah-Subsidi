"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Formulir login admin. Pesan galat dari server ditampilkan apa adanya di bawah tombol. */
export default function FormMasuk() {
  const router = useRouter();
  const [pesan, setPesan] = useState("");
  const [memproses, setMemproses] = useState(false);

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setMemproses(true);
    setPesan("");
    try {
      const res = await fetch("/api/admin/masuk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: data.get("nama"), sandi: data.get("sandi") }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const isi = (await res.json().catch(() => ({}))) as { pesan?: string };
      setPesan(isi.pesan ?? "Gagal masuk.");
    } catch {
      setPesan("Server tidak bisa dihubungi. Coba lagi sebentar.");
    }
    setMemproses(false);
  }

  return (
    <form onSubmit={kirim} className="mt-5 flex flex-col gap-3" noValidate>
      <div>
        <label htmlFor="nama" className="block text-sm font-medium">
          Nama pengguna
        </label>
        <input
          id="nama"
          name="nama"
          type="text"
          autoComplete="username"
          required
          className="mt-1 w-full rounded-[var(--radius-kecil)] border border-garis bg-permukaan-2 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="sandi" className="block text-sm font-medium">
          Kata sandi
        </label>
        <input
          id="sandi"
          name="sandi"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-[var(--radius-kecil)] border border-garis bg-permukaan-2 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={memproses}
        className="mt-2 rounded-[var(--radius-kecil)] bg-hutan px-3 py-2.5 text-center text-sm font-semibold text-di-atas-hutan transition hover:opacity-90 disabled:opacity-60"
      >
        {memproses ? "Memeriksa…" : "Masuk"}
      </button>

      <p role="alert" aria-live="polite" className="min-h-5 text-center text-sm font-medium text-amber">
        {pesan}
      </p>
    </form>
  );
}
