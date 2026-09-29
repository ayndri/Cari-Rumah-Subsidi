"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Memunculkan isinya saat tergulir ke layar.
 *
 * Tujuannya satu: mengarahkan perhatian ke satu bagian pada satu waktu di
 * halaman pembuka yang panjang, bukan menghias. Karena itu gerakannya sekali
 * jalan dan tidak pernah berulang, tidak ada yang berdenyut, dan tidak ada
 * yang bergerak sebelum pengguna sampai ke sana.
 *
 * Pengguna yang menyetel gerak minimum di sistemnya langsung melihat isinya
 * tanpa animasi sama sekali.
 */
export default function Muncul({
  children,
  jeda = 0,
  arah = "bawah",
  className = "",
}: {
  children: React.ReactNode;
  /** milidetik, untuk memberi urutan antarelemen bersebelahan */
  jeda?: number;
  arah?: "bawah" | "kiri" | "kanan";
  className?: string;
}) {
  const acuan = useRef<HTMLDivElement>(null);
  const [tampil, setTampil] = useState(false);
  // Geser mendatar hanya dipakai di layar lebar. Di layar sempit ia membuat
  // halaman meluber ke samping selagi elemennya belum muncul.
  const [layarLebar, setLayarLebar] = useState(false);

  useEffect(() => {
    const el = acuan.current;
    if (!el) return;

    setLayarLebar(window.matchMedia("(min-width: 1024px)").matches);

    const gerakMinimum = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (gerakMinimum) return setTampil(true);

    const pengamat = new IntersectionObserver(
      ([masuk]) => {
        if (masuk.isIntersecting) {
          setTampil(true);
          pengamat.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, []);

  const mendatar = layarLebar && arah !== "bawah";
  const awal = mendatar
    ? `translateX(${arah === "kiri" ? "-18px" : "18px"})`
    : "translateY(20px)";

  return (
    <div
      ref={acuan}
      className={className}
      style={{
        opacity: tampil ? 1 : 0,
        transform: tampil ? "none" : awal,
        transition: `opacity 620ms cubic-bezier(0.22, 0.61, 0.36, 1) ${jeda}ms, transform 620ms cubic-bezier(0.22, 0.61, 0.36, 1) ${jeda}ms`,
      }}
    >
      {children}
    </div>
  );
}
