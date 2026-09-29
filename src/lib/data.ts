import mentah from "@/data/perumahan.json";
import type { Kriteria, Moda, Perumahan } from "./tipe";
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
  /** Detik. Google Routes API, pola lalu lintas Senin 07.00 WIB. Ibadah dari OpenRouteService. */
  waktu: Record<Moda, Waktu & { ibadah: number | null }>;
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
    nama: "Dekat puskesmas",
    satuan: "menit",
    benefit: false,
    bobotDasar: 0.27,
    inti: true,
    keterangan: "Cepat sampai ke puskesmas atau klinik",
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
    keterangan: "Waktu tempuh ke rumah ibadah terdekat, agama apa pun",
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
