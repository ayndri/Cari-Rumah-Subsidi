import { redirect } from "next/navigation";
import Header from "@/components/Header";
import SidebarAdmin from "@/components/SidebarAdmin";
import { adaSesiAdmin } from "@/lib/sesi";

/** Semua halaman panel hanya bisa dibuka setelah login. Tanpa sesi, diarahkan ke login. */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (!(await adaSesiAdmin())) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col">
      <Header jejak="Panel admin" />
      <div className="mx-auto grid w-full max-w-[1400px] flex-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <SidebarAdmin />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
