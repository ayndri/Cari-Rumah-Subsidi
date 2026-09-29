import type { Kriteria, KunciKriteria, Moda, Perumahan } from "./tipe";
import type { PerumahanLengkap } from "./data";

/**
 * Perubahan yang disimpan admin di atas data penelitian.
 *
 * Data penelitian (`src/data/perumahan.json`) tidak pernah ditimpa. Yang disimpan hanya
 * selisihnya: nilai yang diubah, perumahan yang dihapus, perumahan yang ditambahkan, dan
 * bobot kriteria tambahan. Dengan begitu angka naskah tetap dapat direproduksi dari
 * dataset, dan setiap perubahan admin dapat dibatalkan.
 *
 * Berkas ini dipakai di peramban dan di server, jadi tidak boleh menyentuh sistem berkas.
 * Membaca dan menulis berkasnya ada di `penyimpanan.ts`.
 */
export type WaktuModa = { sekolah: number; pasar: number; faskes: number; ibadah: number | null };

/** Bagian yang boleh diubah admin. Lokasi dan waktu tempuh hanya berubah bersama-sama. */
export type UbahanPerumahan = {
  nama?: string;
  developer?: string;
  kecamatan?: string;
  desa?: string;
  luasBangunan?: number;
  luasLahan?: number;
  harga?: number;
  latitude?: number;
  longitude?: number;
  jarakPusatKm?: number;
  waktu?: Record<Moda, WaktuModa>;
};

/** Perumahan yang ditambahkan admin. Bentuknya sama dengan satu baris data penelitian. */
export type PerumahanTambahan = PerumahanLengkap & { ditambahPada: string };

export type Riwayat = { waktu: string; aksi: string; nama: string };

export type Perubahan = {
  perumahan: Record<string, UbahanPerumahan>;
  /** id perumahan data penelitian yang dihapus admin; dapat dipulihkan. */
  nonaktif: string[];
  tambahan: PerumahanTambahan[];
  /** Bobot dasar kriteria tambahan yang diubah admin. Kriteria inti tidak bisa diubah. */
  bobotTambahan: Partial<Record<KunciKriteria, number>>;
  riwayat: Riwayat[];
  diubahPada: string | null;
};

export const PERUBAHAN_KOSONG: Perubahan = {
  perumahan: {},
  nonaktif: [],
  tambahan: [],
  bobotTambahan: {},
  riwayat: [],
  diubahPada: null,
};

/** 18 kecamatan Kabupaten Mojokerto, untuk pilihan pada formulir tambah dan edit. */
export const KECAMATAN_MOJOKERTO = [
  "Bangsal", "Dawarblandong", "Dlanggu", "Gedeg", "Gondang", "Jatirejo", "Jetis", "Kemlagi",
  "Kutorejo", "Mojoanyar", "Mojosari", "Ngoro", "Pacet", "Pungging", "Puri", "Sooko", "Trawas",
  "Trowulan",
];

/** Batas nilai yang boleh disimpan admin. Dipakai di formulir dan diperiksa lagi di server. */
export const BATAS = {
  luasBangunan: { min: 1, maks: 500 },
  luasLahan: { min: 1, maks: 2000 },
  harga: { min: 1, maks: 5_000_000_000 },
  bobot: { min: 0.01, maks: 0.5 },
  // Kotak kasar Kabupaten Mojokerto. Titik di luar ini hampir pasti salah ketik.
  latitude: { min: -7.85, maks: -7.3 },
  longitude: { min: 112.3, maks: 112.8 },
} as const;

/** Satu baris lengkap setelah perubahan admin diterapkan. */
export function terapkanKeBaris(p: PerumahanLengkap, pr: Perubahan): PerumahanLengkap {
  const u = pr.perumahan[p.id];
  if (!u) return p;
  const lb = u.luasBangunan ?? p.luasBangunan;
  const lt = u.luasLahan ?? p.luasLahan;
  return {
    ...p,
    nama: u.nama ?? p.nama,
    developer: u.developer ?? p.developer,
    kecamatan: u.kecamatan ?? p.kecamatan,
    desa: u.desa ?? p.desa,
    harga: u.harga ?? p.harga,
    luasBangunan: lb,
    luasLahan: lt,
    rasioLahan: lb > 0 ? Math.round((lt / lb) * 100) / 100 : p.rasioLahan,
    latitude: u.latitude ?? p.latitude,
    longitude: u.longitude ?? p.longitude,
    jarakPusatKm: u.jarakPusatKm ?? p.jarakPusatKm,
    waktu: u.waktu ?? p.waktu,
  };
}

/** Seluruh baris yang berlaku: data penelitian yang tidak dihapus, lalu tambahan admin. */
export function gabungBaris(asli: PerumahanLengkap[], pr: Perubahan): PerumahanLengkap[] {
  const mati = new Set(pr.nonaktif);
  return [
    ...asli.filter((p) => !mati.has(p.id)).map((p) => terapkanKeBaris(p, pr)),
    ...pr.tambahan.map((t) => terapkanKeBaris(t, pr)),
  ];
}

/** Mengubah satu baris lengkap menjadi bentuk yang dipakai perangkingan untuk satu moda. */
export function barisKePerumahan(
  p: PerumahanLengkap,
  moda: Moda,
  waktuKerja?: Record<string, number | null> | null,
): Perumahan {
  return {
    id: p.id,
    nama: p.nama,
    developer: p.developer,
    kecamatan: p.kecamatan,
    harga: p.harga,
    latitude: p.latitude,
    longitude: p.longitude,
    nilai: {
      luasBangunan: p.luasBangunan,
      luasLahan: p.luasLahan,
      sekolah: p.waktu[moda].sekolah,
      pasar: p.waktu[moda].pasar,
      faskes: p.waktu[moda].faskes,
      pusatKab: p.jarakPusatKm,
      halaman: p.rasioLahan,
      ibadah: p.waktu[moda].ibadah,
      tempatKerja: waktuKerja?.[p.id] ?? null,
    },
  };
}

/** Daftar kriteria dengan bobot tambahan dari admin. Kriteria inti tetap bobot kuesioner. */
export function kriteriaBerlaku(semua: Kriteria[], pr: Perubahan): Kriteria[] {
  return semua.map((k) => {
    const b = pr.bobotTambahan[k.kunci];
    return !k.inti && typeof b === "number" ? { ...k, bobotDasar: b } : k;
  });
}
