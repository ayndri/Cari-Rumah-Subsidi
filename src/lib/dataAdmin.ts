import { KRITERIA, semuaBaris } from "./data";
import { bobotDariAHP, hitungPeringkat } from "./perangkingan";
import { barisKePerumahan, gabungBaris, terapkanKeBaris, type Perubahan } from "./perubahan";

/** Status satu baris di panel admin. */
export type StatusBaris = "asli" | "diubah" | "tambahan" | "dihapus";

export type BarisAdmin = {
  id: string;
  nama: string;
  developer: string;
  kecamatan: string;
  desa: string;
  harga: number;
  luasBangunan: number;
  luasLahan: number;
  latitude: number;
  longitude: number;
  /** Detik, sepeda motor, Google Senin 07.00. */
  sekolah: number;
  pasar: number;
  faskes: number;
  /** Peringkat saat ini dengan bobot bawaan, moda sepeda motor. null bila dihapus. */
  peringkat: number | null;
  status: StatusBaris;
};

/** Seluruh baris untuk panel admin, termasuk yang dihapus, beserta peringkat saat ini. */
export function barisAdmin(pr: Perubahan): BarisAdmin[] {
  const inti = KRITERIA.filter((k) => k.inti);
  const aktif = gabungBaris(semuaBaris(), pr);
  const rk = new Map(
    hitungPeringkat(aktif.map((b) => barisKePerumahan(b, "motor")), inti, bobotDariAHP(inti)).map((b) => [
      b.perumahan.id,
      b.peringkat,
    ]),
  );
  const mati = new Set(pr.nonaktif);
  const tambahan = new Set(pr.tambahan.map((t) => t.id));
  const semua = [...semuaBaris(), ...pr.tambahan].map((b) => terapkanKeBaris(b, pr));

  return semua.map((b) => ({
    id: b.id,
    nama: b.nama,
    developer: b.developer,
    kecamatan: b.kecamatan,
    desa: b.desa,
    harga: b.harga,
    luasBangunan: b.luasBangunan,
    luasLahan: b.luasLahan,
    latitude: b.latitude,
    longitude: b.longitude,
    sekolah: b.waktu.motor.sekolah,
    pasar: b.waktu.motor.pasar,
    faskes: b.waktu.motor.faskes,
    peringkat: rk.get(b.id) ?? null,
    status: mati.has(b.id) ? "dihapus" : tambahan.has(b.id) ? "tambahan" : pr.perumahan[b.id] ? "diubah" : "asli",
  }));
}
