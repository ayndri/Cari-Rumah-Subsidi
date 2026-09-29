import Link from "next/link";
import { KRITERIA } from "@/lib/data";
import { barisAdmin } from "@/lib/dataAdmin";
import { bacaPerubahan } from "@/lib/penyimpanan";
import { bobotDariAHP } from "@/lib/perangkingan";

export const metadata = { title: "Dashboard, Panel admin" };

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const satuDesimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const tiga = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

const TITIK = { Sekolah: 1466, Perniagaan: 180, "Fasilitas kesehatan": 446 };

function median(v: number[]) {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Daftar batang satu seri: tiap baris membawa label dan nilainya sendiri. */
function DaftarBatang({ data, format }: { data: { label: string; nilai: number }[]; format: (n: number) => string }) {
  const maks = Math.max(...data.map((d) => d.nilai), 1);
  return (
    <ul className="flex flex-col gap-1.5">
      {data.map((d) => (
        <li key={d.label} title={`${d.label}: ${format(d.nilai)}`}
          className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_3.5rem] items-center gap-2 text-sm">
          <span className="truncate text-teks-redup">{d.label}</span>
          <span className="h-3 rounded-r-[4px] bg-daun" style={{ width: `${(d.nilai / maks) * 100}%` }} />
          <span className="text-right tabular-nums">{format(d.nilai)}</span>
        </li>
      ))}
    </ul>
  );
}

function Kartu({ label, nilai, catatan }: { label: string; nilai: string; catatan?: string }) {
  return (
    <div className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
      <p className="text-xs font-medium text-teks-redup">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{nilai}</p>
      {catatan && <p className="mt-0.5 text-xs text-teks-redup">{catatan}</p>}
    </div>
  );
}

export default async function Dashboard() {
  const pr = await bacaPerubahan();
  const semua = barisAdmin(pr);
  const aktif = semua.filter((b) => b.status !== "dihapus");
  const jumlah = (s: string) => semua.filter((b) => b.status === s).length;

  const perKecamatan = Object.entries(
    aktif.reduce<Record<string, number>>((a, b) => ({ ...a, [b.kecamatan]: (a[b.kecamatan] ?? 0) + 1 }), {}),
  )
    .map(([label, nilai]) => ({ label, nilai }))
    .sort((a, b) => b.nilai - a.nilai || a.label.localeCompare(b.label, "id"));

  const inti = KRITERIA.filter((k) => k.inti);
  const bobot = bobotDariAHP(inti);
  const teratas = [...aktif].filter((b) => b.peringkat !== null).sort((a, b) => a.peringkat! - b.peringkat!).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="mt-0.5 text-sm text-teks-redup">
            Ringkasan data yang sedang dipakai sistem.{" "}
            {pr.diubahPada ? `Perubahan terakhir ${waktu.format(new Date(pr.diubahPada))} WIB.` : "Belum ada perubahan dari admin."}
          </p>
        </div>
        <Link href="/admin/perumahan"
          className="rounded-[var(--radius-kecil)] bg-hutan px-3 py-2 text-sm font-semibold text-di-atas-hutan hover:opacity-90">
          Kelola data perumahan
        </Link>
      </div>

      <section aria-label="Ringkasan jumlah" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kartu label="Perumahan aktif" nilai={String(aktif.length)} catatan={`di ${perKecamatan.length} kecamatan`} />
        <Kartu label="Ditambah admin" nilai={String(jumlah("tambahan"))} catatan="di luar data penelitian" />
        <Kartu label="Diubah admin" nilai={String(jumlah("diubah"))} catatan="dapat dikembalikan" />
        <Kartu label="Dihapus" nilai={String(jumlah("dihapus"))} catatan="dapat dipulihkan" />
      </section>

      <section aria-label="Nilai tengah" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kartu label="Harga, nilai tengah" nilai={rupiah.format(median(aktif.map((b) => b.harga)))} />
        <Kartu label="Luas bangunan, nilai tengah" nilai={`${satuDesimal.format(median(aktif.map((b) => b.luasBangunan)))} m²`} />
        <Kartu label="Luas lahan, nilai tengah" nilai={`${satuDesimal.format(median(aktif.map((b) => b.luasLahan)))} m²`} />
        <Kartu label="Waktu ke faskes, nilai tengah" nilai={`${satuDesimal.format(median(aktif.map((b) => b.faskes)) / 60)} menit`}
          catatan="sepeda motor, Senin 07.00" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
          <h2 className="text-sm font-semibold">Lima besar saat ini</h2>
          <p className="mt-0.5 text-xs text-teks-redup">Bobot bawaan kuesioner, moda sepeda motor.</p>
          <ol className="mt-3 flex flex-col divide-y divide-garis">
            {teratas.map((b) => (
              <li key={b.id} className="flex items-baseline gap-3 py-2 text-sm">
                <span className="w-5 font-semibold tabular-nums text-daun">{b.peringkat}</span>
                <Link href={`/perumahan/${b.id}`} target="_blank" className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {b.nama}
                </Link>
                <span className="text-xs text-teks-redup">Kec. {b.kecamatan}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
          <h2 className="text-sm font-semibold">Bobot kriteria inti</h2>
          <p className="mt-0.5 text-xs text-teks-redup">Kuesioner AHP kelompok MBR, CR 0,0051.</p>
          <div className="mt-3">
            <DaftarBatang data={inti.map((k, i) => ({ label: k.nama, nilai: bobot[i] }))} format={(n) => tiga.format(n)} />
          </div>
        </section>

        <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
          <h2 className="text-sm font-semibold">Perumahan per kecamatan</h2>
          <p className="mt-0.5 text-xs text-teks-redup">Hanya perumahan yang aktif.</p>
          <div className="mt-3">
            <DaftarBatang data={perKecamatan} format={(n) => String(n)} />
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
            <h2 className="text-sm font-semibold">Titik fasilitas umum</h2>
            <p className="mt-0.5 text-xs text-teks-redup">OpenStreetMap, diambil Juni 2026.</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              {Object.entries(TITIK).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-teks-redup">{k}</dt>
                  <dd className="font-semibold tabular-nums">{v.toLocaleString("id-ID")}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex-1 rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
            <h2 className="text-sm font-semibold">Riwayat perubahan</h2>
            {pr.riwayat.length === 0 ? (
              <p className="mt-2 text-sm text-teks-redup">Belum ada perubahan. Data yang tampil sama persis dengan data penelitian.</p>
            ) : (
              <ul className="mt-2 flex flex-col divide-y divide-garis">
                {pr.riwayat.slice(0, 8).map((r, i) => (
                  <li key={i} className="py-1.5 text-sm">
                    <span className="font-medium">{r.aksi}</span> <span className="text-teks-redup">— {r.nama}</span>
                    <span className="block text-xs text-teks-redup">{waktu.format(new Date(r.waktu))} WIB</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
