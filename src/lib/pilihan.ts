import { KECAMATAN, KRITERIA } from "./data";
import type { Moda, TempatKerja, TingkatPenting, WaktuKerja } from "./tipe";

/**
 * Pilihan pengguna di halaman cari. Dipakai bersama oleh halaman cari dan halaman uji
 * penerimaan, yang membaca pengaturan terakhir responden dari tempat yang sama.
 */

export const SEMUA_KECAMATAN = KECAMATAN[0];

/**
 * Kelima kriteria dari proposal menyala sejak awal supaya pengguna langsung
 * melihat hasil tanpa mengisi apa pun. Kriteria katalog dimulai dari mati.
 */
export const TINGKAT_AWAL: Record<string, TingkatPenting> = Object.fromEntries(
  KRITERIA.map((k) => [k.kunci, k.inti ? "penting" : "abaikan"]),
);

/**
 * Pilihan pengguna disimpan per tab di sessionStorage, supaya kembali dari
 * halaman rincian (lewat tautan maupun tombol back) tidak mengulang dari awal.
 * Waktu tempuh ke tempat kerja ikut disimpan agar tidak menghitung ulang ke API.
 */
export const KUNCI_SIMPAN = "cari-rumah:pilihan:v1";

export type Simpanan = {
  tingkat: Record<string, TingkatPenting>;
  moda: Moda;
  kecamatan: string;
  idTerpilih: string | null;
  tempatKerja: TempatKerja | null;
  waktuKerja: WaktuKerja | null;
};

export const SIMPANAN_AWAL: Simpanan = {
  tingkat: TINGKAT_AWAL,
  moda: "motor",
  kecamatan: SEMUA_KECAMATAN,
  idTerpilih: null,
  tempatKerja: null,
  waktuKerja: null,
};

/**
 * Keadaan uji penerimaan di tab ini (halaman /uji). Selama responden berada di Bagian B,
 * halaman cari menampilkan bilah untuk kembali ke /uji.
 */
export const KUNCI_UJI = "cari-rumah:uji:v1";
