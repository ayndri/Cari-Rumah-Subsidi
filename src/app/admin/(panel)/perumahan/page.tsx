import TabelPerumahanAdmin from "@/components/TabelPerumahanAdmin";
import { barisAdmin } from "@/lib/dataAdmin";
import { bacaPerubahan } from "@/lib/penyimpanan";

export const metadata = { title: "Data perumahan, Panel admin" };

export default async function KelolaPerumahan() {
  const baris = barisAdmin(await bacaPerubahan());
  const aktif = baris.filter((b) => b.status !== "dihapus").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Kelola Data Perumahan</h1>
        <p className="mt-0.5 text-sm text-teks-redup">
          {aktif} perumahan aktif. Data penelitian dari SiKumbang Tapera tidak pernah ditimpa;
          perubahan admin disimpan terpisah dan dapat dikembalikan.
        </p>
      </div>
      <TabelPerumahanAdmin baris={baris} />
    </div>
  );
}
