/** Tipe data bersama untuk seluruh halaman. */

export type KunciKriteria =
  | "luasBangunan"
  | "luasLahan"
  | "sekolah"
  | "pasar"
  | "faskes"
  | "pusatKab"
  | "halaman"
  | "ibadah"
  | "tempatKerja";

/**
 * Moda perjalanan yang tersedia.
 *
 * Sepeda tidak ada karena Google Routes API tidak menyediakan rute sepeda untuk
 * wilayah ini. Jalan kaki tidak ada karena 61 dari 84 perumahan tidak dapat
 * dirutekan menuju pasar maupun fasilitas kesehatan dengan profil pejalan kaki.
 */
export type Moda = "motor" | "mobil";

export type Kriteria = {
  kunci: KunciKriteria;
  nama: string;
  satuan: string;
  /** true = makin besar makin baik. false = makin kecil makin baik. */
  benefit: boolean;
  /**
   * Bobot dasar. Untuk lima kriteria inti berasal dari kuesioner AHP kelompok MBR;
   * untuk kriteria katalog berasal dari matriks perbandingan yang diisi admin.
   * Selalu dinormalisasi ulang terhadap kriteria yang sedang aktif.
   */
  bobotDasar: number;
  /** Kriteria inti selalu tersedia. Kriteria katalog bersifat pilihan. */
  inti: boolean;
  /** Butuh pengguna menunjuk titik acuan di peta lebih dulu. */
  butuhTitikAcuan?: boolean;
  /** Datanya belum dihitung untuk seluruh perumahan. */
  butuhData?: boolean;
  keterangan: string;
};

export type Perumahan = {
  id: string;
  nama: string;
  developer: string;
  kecamatan: string;
  harga: number;
  latitude: number;
  longitude: number;
  nilai: Record<KunciKriteria, number | null>;
};

export type BarisPeringkat = {
  perumahan: Perumahan;
  skor: number;
  peringkat: number;
};

/**
 * Seberapa penting sebuah kriteria menurut pengguna.
 * Tiga tingkat saja: orang awam bisa menjawab "penting atau tidak", tapi tidak
 * bisa menjawab "seberapa penting dalam angka".
 */
export type TingkatPenting = "abaikan" | "penting" | "paling";

export type ModeBobot = "ahp" | "urutan";

export type StatusData = "memuat" | "siap" | "gagal";

/** Lokasi tempat kerja yang dipilih pengguna lewat pencarian. */
export type TempatKerja = { nama: string; alamat: string; lat: number; lon: number };

/** Detik dari tiap perumahan (menurut id) ke tempat kerja, per moda. null = belum bisa dihitung. */
export type WaktuKerja = {
  motor: Record<string, number | null> | null;
  mobil: Record<string, number | null> | null;
  catatan: string[];
};
