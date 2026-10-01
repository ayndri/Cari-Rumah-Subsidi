import mentah from "@/data/perumahan.json";
import tujuanMentah from "@/data/fasilitas-tujuan.json";
import type { Agama, Kriteria, Moda, Perumahan } from "./tipe";
import type { WaktuIbadah } from "./perubahan";
import { barisKePerumahan } from "./perubahan";

/**
 * Data penelitian yang sebenarnya: 84 perumahan subsidi di 14 kecamatan
 * Kabupaten Mojokerto, dari pangkalan data SiKumbang Tapera.
 *
 * Berkas `src/data/perumahan.json` dihasilkan oleh `skrip/buat-data.py` dari
 * `dataset_google_motor_mobil.csv` pada folder induk. Jangan diubah
 * dengan tangan; jalankan ulang skripnya kalau datasetnya diperbarui.
 */

type Waktu = { sekolah: number; pasar: number; faskes: number };

type BarisMentah = {
  id: string;
  nama: string;
  developer: string;
  kecamatan: string;
  desa: string;
  harga: number;
  latitude: number;
  longitude: number;
  luasBangunan: number;
  luasLahan: number;
  jarakPusatKm: number | null;
  rasioLahan: number | null;
  /**
   * Detik. Google Routes API, pola lalu lintas Senin 07.00 WIB. Ibadah per agama dari TomTom
   * Routing sepeda motor, waktu berangkat yang sama; moda mobil memakai nilai yang sama.
   */
  waktu: Record<Moda, Waktu & { ibadah: WaktuIbadah }>;
};

const BARIS = mentah as BarisMentah[];

/** Waktu tempuh disimpan dalam detik; pengguna membacanya dalam menit. */
export function keMenit(detik: number): number {
  return Math.max(1, Math.round(detik / 60));
}

/**
 * Bobot dasar kelima kriteria inti adalah bobot gabungan kuesioner AHP kelompok
 * MBR (n = 10, CR = 0,0051), sama dengan Tabel 4.5 naskah. Kalau kuesioner
 * bertambah, ganti kelima angka ini bersamaan dengan tabelnya.
 *
 * Kriteria tambahan tidak punya bobot dari kuesioner lapangan. Angkanya berasal
 * dari matriks perbandingan yang diisi admin sebagai expert judgment, sesuai
 * rancangan pada dokumen tanggapan revisi.
 */
export const KRITERIA: Kriteria[] = [
  {
    kunci: "luasBangunan",
    nama: "Rumahnya luas",
    satuan: "m²",
    benefit: true,
    bobotDasar: 0.207,
    inti: true,
    keterangan: "Luas bangunan rumahnya",
  },
  {
    kunci: "luasLahan",
    nama: "Tanahnya luas",
    satuan: "m²",
    benefit: true,
    bobotDasar: 0.24,
    inti: true,
    keterangan: "Luas tanah yang kamu dapat",
  },
  {
    kunci: "sekolah",
    nama: "Dekat sekolah",
    satuan: "menit",
    benefit: false,
    bobotDasar: 0.164,
    inti: true,
    keterangan: "Cepat sampai ke sekolah terdekat",
  },
  {
    kunci: "pasar",
    nama: "Dekat pasar",
    satuan: "menit",
    benefit: false,
    bobotDasar: 0.119,
    inti: true,
    keterangan: "Cepat sampai ke pasar atau pertokoan",
  },
  {
    kunci: "faskes",
    nama: "Dekat fasilitas kesehatan",
    satuan: "menit",
    benefit: false,
    bobotDasar: 0.27,
    inti: true,
    keterangan: "Cepat sampai ke puskesmas, klinik, atau RS",
  },
  {
    kunci: "pusatKab",
    nama: "Dekat pusat kabupaten",
    satuan: "km",
    benefit: false,
    bobotDasar: 0.1,
    inti: false,
    keterangan: "Dekat ke pusat pemerintahan dan keramaian kabupaten",
  },
  {
    kunci: "halaman",
    nama: "Halamannya lega",
    satuan: "kali",
    benefit: true,
    bobotDasar: 0.08,
    inti: false,
    keterangan: "Sisa tanah di luar bangunan, dibanding luas rumahnya",
  },
  {
    kunci: "ibadah",
    nama: "Dekat tempat ibadah",
    satuan: "menit",
    benefit: false,
    bobotDasar: 0.09,
    inti: false,
    butuhAgama: true,
    keterangan: "Ke tempat ibadah terdekat sesuai agama yang kamu pilih",
  },
  {
    kunci: "tempatKerja",
    nama: "Dekat tempat kerja",
    satuan: "menit",
    benefit: false,
    bobotDasar: 0.12,
    inti: false,
    butuhTitikAcuan: true,
    keterangan: "Cari lokasinya dulu, lalu pilih seberapa penting",
  },
];

/**
 * Menyusun daftar perumahan beserta nilai tiap kriteria untuk satu moda.
 *
 * Waktu tempuh berbeda antarmoda, jadi peringkatnya pun berbeda. Waktu tempuh
 * masuk dalam detik supaya hasilnya sama dengan Tabel 4.7. Nilai kriteria
 * yang datanya belum ada diisi null, dan perumahan yang salah satu kriteria
 * aktifnya bernilai null tidak ikut diperingkatkan.
 *
 * `waktuKerja` berisi detik dari tiap perumahan ke tempat kerja pengguna untuk
 * moda ini. Dihitung saat pengguna memilih lokasinya, lewat /api/tempat-kerja/waktu.
 */
export function perumahanUntukModa(
  moda: Moda,
  waktuKerja?: Record<string, number | null> | null,
): Perumahan[] {
  return BARIS.map((p) => barisKePerumahan(p, moda, waktuKerja));
}

export const JUMLAH_PERUMAHAN = BARIS.length;

export type PerumahanLengkap = BarisMentah;

/** Seluruh kolom satu perumahan, termasuk yang tidak ikut diperingkatkan. */
export function detailPerumahan(id: string): PerumahanLengkap | undefined {
  return BARIS.find((p) => p.id === id);
}

/** Seluruh baris lengkap, untuk halaman yang menerapkan perubahan admin di server. */
export function semuaBaris(): PerumahanLengkap[] {
  return BARIS;
}

export type FasilitasTujuan = { nama: string; jenis: string };
type JenisTujuan = "sekolah" | "pasar" | "faskes";

const TUJUAN = tujuanMentah as Record<
  string,
  Partial<Record<JenisTujuan, FasilitasTujuan>> & { ibadah?: Partial<Record<Agama, string>> }
>;
const TITIK_ASLI = new Map(BARIS.map((p) => [p.id, [p.latitude, p.longitude]]));

/**
 * Fasilitas yang dipakai sebagai tujuan rute: yang tercepat dicapai dari delapan
 * kandidat terdekat, apa pun jenisnya. Dihasilkan `skrip/buat-fasilitas-tujuan.py`.
 *
 * Tidak ada untuk perumahan tambahan dari panel admin, dan tidak dipakai lagi kalau
 * admin memindahkan titiknya, karena waktunya dihitung ulang dan tujuannya bisa lain.
 */
export function fasilitasTujuan(
  p: { id: string; latitude: number; longitude: number },
  jenis: JenisTujuan,
): FasilitasTujuan | undefined {
  const asli = TITIK_ASLI.get(p.id);
  if (!asli || asli[0] !== p.latitude || asli[1] !== p.longitude) return undefined;
  return TUJUAN[p.id]?.[jenis];
}

/** Nama tempat ibadah tujuan untuk agama yang dipilih, dengan syarat yang sama. */
export function ibadahTujuan(
  p: { id: string; latitude: number; longitude: number },
  agama: Agama,
): string | undefined {
  const asli = TITIK_ASLI.get(p.id);
  if (!asli || asli[0] !== p.latitude || asli[1] !== p.longitude) return undefined;
  return TUJUAN[p.id]?.ibadah?.[agama];
}

export function semuaId(): string[] {
  return BARIS.map((p) => p.id);
}

/**
 * Posisi satu perumahan di antara seluruh 84 perumahan untuk satu kolom,
 * beserta nilai terbaik dan rata-ratanya. Dipakai di halaman rincian untuk
 * menjelaskan kelebihan dan kekurangannya dengan pembanding, bukan angka telanjang.
 */
export function posisiDiAntaraSemua(
  nilai: number,
  ambil: (p: PerumahanLengkap) => number | null,
  benefit: boolean,
  daftar: PerumahanLengkap[] = BARIS,
): { urutan: number; dari: number; rata: number; terbaik: number } {
  const semua = daftar.map(ambil).filter((v): v is number => typeof v === "number");
  const lebihBaik = semua.filter((v) => (benefit ? v > nilai : v < nilai)).length;
  return {
    urutan: lebihBaik + 1,
    dari: semua.length,
    rata: semua.reduce((a, b) => a + b, 0) / semua.length,
    terbaik: benefit ? Math.max(...semua) : Math.min(...semua),
  };
}

export const KECAMATAN = [
  "Semua Kecamatan",
  ...Array.from(new Set(BARIS.map((p) => p.kecamatan))).sort((a, b) =>
    a.localeCompare(b, "id"),
  ),
];

/** Urutan pilihan agama. Label tempat ibadahnya dipakai pada kartu dan halaman rincian. */
export const AGAMA: { nilai: Agama; label: string; tempat: string }[] = [
  { nilai: "islam", label: "Islam", tempat: "masjid atau musala" },
  { nilai: "kristen", label: "Kristen", tempat: "gereja" },
  { nilai: "katolik", label: "Katolik", tempat: "gereja Katolik" },
  { nilai: "hindu", label: "Hindu", tempat: "pura" },
  { nilai: "buddha", label: "Buddha", tempat: "vihara" },
  { nilai: "konghucu", label: "Konghucu", tempat: "klenteng" },
];

export const MODA: { nilai: Moda; label: string; keterangan: string }[] = [
  {
    nilai: "motor",
    label: "Sepeda motor",
    keterangan: "Rute sepeda motor dari Google, pola lalu lintas Senin 07.00",
  },
  {
    nilai: "mobil",
    label: "Mobil",
    keterangan: "Rute mobil dari Google, pola lalu lintas Senin 07.00",
  },
];
