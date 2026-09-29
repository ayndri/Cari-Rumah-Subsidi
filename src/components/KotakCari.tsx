import { KECAMATAN, KRITERIA, MODA } from "@/lib/data";

/**
 * Kotak pencarian di bawah pembuka halaman depan.
 *
 * Form biasa yang mengirim ke /cari lewat alamat (?kec=&utama=&moda=), jadi
 * tetap bekerja sebelum JavaScript termuat. Tiga pertanyaan saja, karena hanya
 * tiga itu yang bisa dijawab orang dalam sekali lihat. Sisanya diatur di
 * halaman pencarian.
 */

const PILIHAN_UTAMA = KRITERIA.filter((k) => k.inti);

const kelasIsian =
  "mt-1 min-h-12 w-full rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 text-base text-teks";

export default function KotakCari({ className = "" }: { className?: string }) {
  return (
    <form
      action="/cari"
      method="get"
      aria-label="Cari rumah subsidi"
      className={`grid gap-3 rounded-[var(--radius-kartu)] border border-garis-kuat bg-permukaan p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1.2fr_1fr_auto] lg:items-end ${className}`}
    >
      <label className="block">
        <span className="text-sm font-medium">Di kecamatan mana</span>
        <select name="kec" defaultValue="" className={kelasIsian}>
          <option value="">Semua 14 kecamatan</option>
          {KECAMATAN.slice(1).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Yang paling penting buatmu</span>
        <select name="utama" defaultValue="" className={kelasIsian}>
          {/* Bobot bawaan berasal dari kuesioner calon pembeli, bukan dibagi rata. */}
          <option value="">Ikuti penilaian calon pembeli lain</option>
          {PILIHAN_UTAMA.map((k) => (
            <option key={k.kunci} value={k.kunci}>
              {k.nama}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Sehari-hari pergi naik</span>
        <select name="moda" defaultValue="motor" className={kelasIsian}>
          {MODA.map((m) => (
            <option key={m.nilai} value={m.nilai}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-kecil)] bg-hutan px-6 text-base font-semibold text-di-atas-hutan transition hover:opacity-90 sm:col-span-2 lg:col-span-1"
      >
        Tampilkan rumahnya
      </button>
    </form>
  );
}
