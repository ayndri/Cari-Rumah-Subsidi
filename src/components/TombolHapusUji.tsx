"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TombolHapusUji({ id, nama }: { id: number; nama: string }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);

  async function hapus() {
    if (!window.confirm(`Hapus jawaban nomor ${id} (${nama})? Ini tidak bisa dibatalkan.`)) return;
    setSibuk(true);
    const res = await fetch(`/api/admin/uji?id=${id}`, { method: "DELETE" });
    setSibuk(false);
    if (res.ok) router.refresh();
    else window.alert("Gagal menghapus.");
  }

  return (
    <button type="button" onClick={hapus} disabled={sibuk}
      className="inline-flex min-h-9 items-center rounded-[var(--radius-kecil)] border border-garis-kuat px-3 text-xs text-amber disabled:opacity-40">
      Hapus
    </button>
  );
}
