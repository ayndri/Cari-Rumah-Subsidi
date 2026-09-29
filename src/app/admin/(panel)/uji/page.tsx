import { daftarJawabanUji } from "@/lib/penyimpanan";
import { KODE, skorSUS, spearman, top3 } from "@/lib/uji";
import TombolHapusUji from "@/components/TombolHapusUji";

export const metadata = { title: "Uji penerimaan, Panel admin" };

const dua = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const satu = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const rerata = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/**
 * Ringkasan cepat untuk memantau jalannya uji. Angka untuk naskah tetap dihitung ulang
 * oleh fix/07-uji-penerimaan/olah_uat.py dari berkas CSV, yang memeriksa hitungan ini.
 */
export default async function KelolaUji() {
  const semua = await daftarJawabanUji();
  const baris = semua.map((j) => ({
    j,
    rho: spearman(j.urutan, j.urutanSistem),
    t3: top3(j.urutan, j.urutanSistem),
    sus: skorSUS(j.sus),
    cocok: j.limaDilihat.join("|").toLowerCase() === j.limaTeratas.map((x) => x.nama).join("|").toLowerCase(),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Uji Penerimaan</h1>
          <p className="mt-0.5 text-sm text-teks-redup">
            Jawaban responden dari halaman <a href="/uji" className="underline underline-offset-2">/uji</a>.
            Hapus jawaban percobaan sebelum mengunduh data akhir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/uji?format=csv"
            className="inline-flex min-h-9 items-center rounded-[var(--radius-kecil)] bg-hutan px-4 text-sm font-semibold text-di-atas-hutan">
            Unduh CSV
          </a>
          <a href="/api/admin/uji?format=json"
            className="inline-flex min-h-9 items-center rounded-[var(--radius-kecil)] border border-garis-kuat px-4 text-sm">
            Unduh JSON
          </a>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        {[
          ["Responden", String(baris.length)],
          ["Rerata Spearman", baris.length ? dua.format(rerata(baris.map((b) => b.rho))) : "–"],
          ["Rerata Top-3", baris.length ? dua.format(rerata(baris.map((b) => b.t3))) : "–"],
          ["Rerata SUS", baris.length ? satu.format(rerata(baris.map((b) => b.sus))) : "–"],
        ].map(([l, v]) => (
          <div key={l} className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
            <p className="text-xs text-teks-redup">{l}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
        {baris.length === 0 ? (
          <p className="text-sm text-teks-redup">Belum ada jawaban.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-garis text-left text-xs tracking-wide text-teks-redup uppercase">
                  <th className="py-2 pr-3 font-semibold">No</th>
                  <th className="py-2 pr-3 font-semibold">Waktu</th>
                  <th className="py-2 pr-3 font-semibold">Nama</th>
                  <th className="py-2 pr-3 font-semibold">Moda</th>
                  <th className="py-2 pr-3 font-semibold">Urutan responden</th>
                  <th className="py-2 pr-3 font-semibold">Urutan sistem</th>
                  <th className="py-2 pr-3 text-right font-semibold">ρ</th>
                  <th className="py-2 pr-3 text-right font-semibold">Top-3</th>
                  <th className="py-2 pr-3 text-right font-semibold">SUS</th>
                  <th className="py-2 pr-3 font-semibold">Layar = server</th>
                  <th className="py-2 font-semibold"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody>
                {baris.map(({ j, rho, t3, sus, cocok }) => (
                  <tr key={j.id} className="border-b border-garis align-top">
                    <td className="py-2.5 pr-3 tabular-nums text-teks-redup">{j.id}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{waktu.format(new Date(j.waktu))}</td>
                    <td className="py-2.5 pr-3 font-medium">{j.identitas.nama}</td>
                    <td className="py-2.5 pr-3">{j.moda === "motor" ? "Motor" : "Mobil"}</td>
                    <td className="py-2.5 pr-3 font-mono">{[...KODE].sort((a, b) => j.urutan[a] - j.urutan[b]).join("")}</td>
                    <td className="py-2.5 pr-3 font-mono">{[...KODE].sort((a, b) => j.urutanSistem[a] - j.urutanSistem[b]).join("")}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{dua.format(rho)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{t3}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{satu.format(sus)}</td>
                    <td className={["py-2.5 pr-3", cocok ? "text-daun" : "font-semibold text-amber"].join(" ")}>
                      {cocok ? "Cocok" : "Periksa"}
                    </td>
                    <td className="py-2.5"><TombolHapusUji id={j.id} nama={j.identitas.nama} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
