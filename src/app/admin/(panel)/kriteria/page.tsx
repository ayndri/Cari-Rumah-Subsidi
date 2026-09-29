import EditorBobotTambahan from "@/components/EditorBobotTambahan";
import { KRITERIA } from "@/lib/data";
import { bobotDariAHP } from "@/lib/perangkingan";
import { bacaPerubahan } from "@/lib/penyimpanan";

export const metadata = { title: "Kriteria dan bobot, Panel admin" };

const empatDesimal = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export default async function KelolaKriteria() {
  const pr = await bacaPerubahan();
  const inti = KRITERIA.filter((k) => k.inti);
  const katalog = KRITERIA.filter((k) => !k.inti).map((k) => ({
    kunci: k.kunci,
    nama: k.nama,
    keterangan: k.keterangan,
    bawaan: k.bobotDasar,
    sekarang: pr.bobotTambahan[k.kunci] ?? k.bobotDasar,
  }));
  const bobotInti = bobotDariAHP(inti);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Kriteria &amp; Bobot (AHP)</h1>
        <p className="mt-0.5 text-sm text-teks-redup">
          Bobot lima kriteria inti berasal dari kuesioner perbandingan berpasangan dan tidak
          bisa diubah di sini. Bobot kriteria tambahan ditetapkan admin.
        </p>
      </div>

      <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
        <h2 className="text-sm font-semibold">Kriteria inti</h2>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-garis text-left text-xs tracking-wide text-teks-redup uppercase">
                <th className="py-2 pr-3 font-semibold">Kode</th>
                <th className="py-2 pr-3 font-semibold">Kriteria</th>
                <th className="py-2 pr-3 font-semibold">Tipe</th>
                <th className="py-2 pr-3 text-right font-semibold">Bobot</th>
              </tr>
            </thead>
            <tbody>
              {inti.map((k, i) => (
                <tr key={k.kunci} className="border-b border-garis">
                  <td className="py-2.5 pr-3 text-teks-redup">C{i + 1}</td>
                  <td className="py-2.5 pr-3 font-medium">{k.nama}</td>
                  <td className="py-2.5 pr-3 text-teks-redup">
                    {k.benefit ? "Benefit" : "Cost"}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    {empatDesimal.format(bobotInti[i])}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 pr-3" />
                <td className="py-2.5 pr-3 font-semibold">Total</td>
                <td className="py-2.5 pr-3" />
                <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">1,0000</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 rounded-[var(--radius-kecil)] border border-daun bg-permukaan-2 px-3 py-2.5">
          <p className="text-sm font-semibold text-daun">
            Consistency Ratio (CR) = 0,0051 ≤ 0,1
          </p>
          <p className="mt-0.5 text-xs text-teks-redup">
            Gabungan 10 responden MBR dengan rata-rata geometrik. Penilaian konsisten, bobot
            dapat dipakai.
          </p>
        </div>

        <div className="mt-3 rounded-[var(--radius-kecil)] bg-amber-latar px-3 py-2.5">
          <p className="text-xs leading-relaxed text-amber">
            Kuesioner MBR masih dibuka. Kalau jawaban bertambah, bobot di atas dihitung ulang
            dan Tabel 4.5 naskah ikut diperbarui.
          </p>
        </div>

      </section>

      <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
        <h2 className="text-sm font-semibold">Kriteria tambahan</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-teks-redup">
          Kriteria yang bisa dinyalakan pengguna di halaman pencarian. Bobotnya penilaian ahli
          oleh admin, antara 0,01 dan 0,5, lalu dinormalisasi ulang bersama kriteria yang
          sedang menyala sehingga jumlahnya tetap 1.
        </p>
        <EditorBobotTambahan awal={katalog} />
      </section>
    </div>
  );
}
