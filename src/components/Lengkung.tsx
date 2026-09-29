/**
 * Pemisah melengkung antarbagian halaman.
 *
 * Tugasnya satu: memberi tahu mata bahwa satu bagian sudah selesai dan bagian
 * berikutnya dimulai, tanpa perlu garis lurus yang terasa seperti formulir.
 * Karena itu bentuknya landai, bukan gelombang ramai.
 *
 * Butuh dua warna supaya terbaca: latar pemisahnya mengikuti warna bagian di
 * atasnya, dan lengkungannya diisi warna bagian di bawahnya. Kalau keduanya
 * sama, lengkungannya tidak akan kelihatan sama sekali.
 *
 * Dipakai hanya di halaman pembuka dan halaman penjelasan. Halaman perhitungan
 * tetap memakai garis lurus supaya tidak ada yang mengalihkan perhatian dari
 * angka.
 */

const BENTUK = {
  // landai turun ke kanan, dipakai sesudah bagian yang isinya padat
  landai: "M0,0 C320,74 620,10 900,38 C1130,60 1300,26 1440,12 L1440,80 L0,80 Z",
  // cekung di tengah, dipakai sebelum bagian yang menonjol
  cekung: "M0,14 C260,70 560,80 760,56 C1000,28 1240,2 1440,22 L1440,80 L0,80 Z",
} as const;

export default function Lengkung({
  bentuk = "landai",
  atas,
  bawah,
}: {
  bentuk?: keyof typeof BENTUK;
  /** kelas latar bagian di atas pemisah, misalnya "bg-permukaan" */
  atas: string;
  /** kelas warna teks bagian di bawah pemisah, misalnya "text-latar" */
  bawah: string;
}) {
  return (
    <div aria-hidden className={`${atas} ${bawah} -mt-px leading-[0]`}>
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className="block h-[44px] w-full sm:h-[76px]"
      >
        <path d={BENTUK[bentuk]} className="fill-current" />
      </svg>
    </div>
  );
}
