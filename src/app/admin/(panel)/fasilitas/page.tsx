import titik from "@/data/titik-fasilitas.json";
import ibadah from "@/data/titik-ibadah.json";
import { AGAMA } from "@/lib/data";

/**
 * Jumlah titik dibaca dari berkas yang sama dengan perhitungan, sehingga selalu sama dengan
 * Tabel 4.1 naskah. Delapan titik pasar yang salah tag di OpenStreetMap sudah dibuang
 * (pengujian_metode/titik_pasar_dikecualikan.json).
 */
const OSM = "OpenStreetMap lewat Overpass API";
const FASILITAS = [
  { jenis: "Sekolah", jumlah: titik.sekolah.length, sumber: OSM },
  { jenis: "Pasar / perniagaan", jumlah: titik.pasar.length, sumber: `${OSM}, 8 titik salah tag dibuang` },
  { jenis: "Fasilitas kesehatan", jumlah: titik.faskes.length, sumber: OSM },
  ...AGAMA.map((a) => ({
    jenis: `Tempat ibadah ${a.label} (kriteria tambahan)`,
    jumlah: (ibadah.titik as Record<string, number>)[a.nilai] ?? 0,
    sumber: OSM,
  })),
];
const angka = new Intl.NumberFormat("id-ID");

export const metadata = { title: "Data fasilitas, Panel admin" };

export default function KelolaFasilitas() {
  const total = FASILITAS.reduce((a, f) => a + f.jumlah, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Data Fasilitas Umum</h1>
        <p className="mt-0.5 text-sm text-teks-redup">
          {angka.format(total)} titik fasilitas, diambil Juni 2026, tag diperiksa ulang 30 September 2026
        </p>
      </div>

      <div className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-garis text-left text-xs tracking-wide text-teks-redup uppercase">
                <th className="py-2 pr-3 font-semibold">Jenis</th>
                <th className="py-2 pr-3 text-right font-semibold">Jumlah titik</th>
                <th className="py-2 pr-3 font-semibold">Sumber</th>
              </tr>
            </thead>
            <tbody>
              {FASILITAS.map((f) => (
                <tr key={f.jenis} className="border-b border-garis">
                  <td className="py-2.5 pr-3 font-medium">{f.jenis}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{angka.format(f.jumlah)}</td>
                  <td className="py-2.5 pr-3 text-teks-redup">{f.sumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
        <h2 className="text-sm font-semibold">Catatan keterbatasan data</h2>
        <p className="mt-1 text-xs leading-relaxed text-teks-redup">
          Data OpenStreetMap bersifat kolaboratif sehingga kelengkapannya bisa berbeda
          antarwilayah, terutama di daerah pinggiran. Tiap nilai waktu tempuh disertai penanda
          metode perhitungan, dan tanggal pengambilan data dicatat supaya hasilnya bisa
          direplikasi.
        </p>
      </div>
    </div>
  );
}
