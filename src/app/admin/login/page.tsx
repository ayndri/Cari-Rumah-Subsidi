import Header from "@/components/Header";
import { redirect } from "next/navigation";
import FormMasuk from "@/components/FormMasuk";
import { adaSesiAdmin } from "@/lib/sesi";

export const metadata = { title: "Masuk admin, Cari Rumah Subsidi" };

export default async function LoginAdmin({
  searchParams,
}: {
  searchParams: Promise<{ keluar?: string }>;
}) {
  const { keluar } = await searchParams;
  if (!keluar && (await adaSesiAdmin())) redirect("/admin");

  return (
    <div className="flex min-h-screen flex-col">
      <Header jejak="Panel admin" />

      <main className="grid flex-1 place-items-center px-4 py-10">
        <div className="w-full max-w-sm rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-6">
          <h1 className="text-center text-lg font-semibold">Masuk ke Panel Admin</h1>
          <p className="mt-0.5 text-center text-xs text-teks-redup">Khusus administrator sistem</p>
          {keluar && (
            <p className="mt-4 rounded-[var(--radius-kecil)] bg-permukaan-2 px-3 py-2 text-center text-sm text-teks-redup">
              Kamu sudah keluar.
            </p>
          )}
          <FormMasuk />
        </div>
      </main>
    </div>
  );
}
