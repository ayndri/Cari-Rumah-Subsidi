import kandidatMentah from "@/data/kandidat-uji.json";
import { KRITERIA, semuaBaris } from "./data";
import { bobotDariAHP, bobotDariKepentingan, hitungPeringkat } from "./perangkingan";
import { barisKePerumahan, gabungBaris, kriteriaBerlaku, type Perubahan } from "./perubahan";
import type { BarisPeringkat, Moda, TingkatPenting } from "./tipe";

/**
 * Uji penerimaan (UAT) di halaman /uji. Rancangannya ada di Subbab 4.5.3 dan Lampiran 3 naskah,
 * panduan pelaksanaannya di fix/07-uji-penerimaan/PANDUAN-UAT.md.
 *
 * Sepuluh kandidat dan kode hurufnya dibuat oleh fix/07-uji-penerimaan/pilih_kandidat.py,
 * sama dengan kartu cetak. Jangan diubah setelah uji dimulai.
 */
export const KANDIDAT = kandidatMentah as { kode: string; id: string }[];
export const KODE = KANDIDAT.map((k) => k.kode);

/**
 * Harga pada kartu Bagian A disamakan untuk seluruh kandidat. Harga bukan kriteria sistem, dan
 * responden uji coba awal mengurutkan menurut harga, sehingga urutannya tidak bisa dicocokkan dengan
 * pembobotan sistem. Nilainya harga tertinggi di antara kesepuluh kandidat, dan kartu menyebut
 * terang-terangan bahwa harga disetarakan. Data harga di website dan dataset tidak diubah.
 */
export const HARGA_SETARA = 166_000_000;

/** Kriteria yang boleh diatur responden. Tempat kerja sengaja tidak ikut: kartu tidak memuatnya. */
export const KRITERIA_UJI = KRITERIA.filter((k) => !k.butuhTitikAcuan);

/** System Usability Scale versi bahasa Indonesia (Sharfina & Santoso, 2016). */
export const SUS = [
  "Saya berpikir akan menggunakan sistem ini lagi.",
  "Saya merasa sistem ini rumit untuk digunakan.",
  "Saya merasa sistem ini mudah digunakan.",
  "Saya membutuhkan bantuan dari orang lain atau teknisi dalam menggunakan sistem ini.",
  "Saya merasa fitur-fitur sistem ini berjalan dengan semestinya.",
  "Saya merasa ada banyak hal yang tidak konsisten (tidak serasi) pada sistem ini.",
  "Saya merasa orang lain akan memahami cara menggunakan sistem ini dengan cepat.",
  "Saya merasa sistem ini membingungkan.",
  "Saya merasa tidak ada hambatan dalam menggunakan sistem ini.",
  "Saya perlu membiasakan diri terlebih dahulu sebelum menggunakan sistem ini.",
];

export const PERCAYA = [
  "Rekomendasi dari sistem sesuai dengan pertimbangan saya sendiri.",
  "Alasan yang ditampilkan di setiap rekomendasi membantu saya memahami kenapa perumahan itu disarankan.",
  "Saya akan memakai sistem ini ketika benar-benar mencari rumah subsidi.",
];

/** Pilihan jawaban data diri. Teksnya sama dengan Google Form supaya CSV ekspor bisa diolah olah_uat.py. */
export const PILIHAN = {
  usia: ["Di bawah 25 tahun", "25–34 tahun", "35–44 tahun", "45 tahun ke atas"],
  punyaRumah: ["Belum", "Sudah"],
  rencana: ["Ya, sedang mencari", "Ya, dalam beberapa tahun ke depan", "Tidak"],
  pernahKuesioner: ["Pernah", "Belum pernah"],
} as const;

export type Identitas = {
  nama: string;
  usia: string;
  pekerjaan: string;
  punyaRumah: string;
  rencana: string;
  pernahKuesioner: string;
};

/** Yang dikirim peramban. Urutan sistem tidak ikut dikirim; server menghitungnya sendiri. */
export type KirimanUji = {
  setuju: boolean;
  identitas: Identitas;
  /** kode -> urutan 1..10 menurut responden (Bagian A) */
  urutan: Record<string, number>;
  alasan: string;
  moda: Moda;
  tingkat: Record<string, TingkatPenting>;
  /** Lima teratas yang tampil di layar responden, untuk dicocokkan dengan hitungan server. */
  limaDilihat: string[];
  sus: number[];
  percaya: number[];
  komentar: string;
  detik: number;
};

export type HasilSistem = {
  /** kode -> urutan 1..10 menurut sistem, di antara kesepuluh kandidat */
  urutanSistem: Record<string, number>;
  /** kode -> peringkat di antara seluruh perumahan yang diperingkatkan */
  peringkatPenuh: Record<string, number>;
  limaTeratas: { id: string; nama: string }[];
  jumlahDiperingkat: number;
};

export type JawabanUji = KirimanUji & HasilSistem & { id: number; waktu: string };

/**
 * Peringkat yang dilihat responden di halaman cari dengan pengaturan ini: semua kecamatan,
 * tanpa tempat kerja. Aturan bobotnya sama dengan halaman cari: bobot AHP selama tidak ada
 * yang ditandai paling penting, bobot ROC berjenjang begitu ada.
 */
export function peringkatUntuk(moda: Moda, tingkat: Record<string, TingkatPenting>, pr: Perubahan): BarisPeringkat[] {
  const aktif = kriteriaBerlaku(KRITERIA, pr).filter(
    (k) => (tingkat[k.kunci] ?? "abaikan") !== "abaikan" && !k.butuhTitikAcuan,
  );
  const adaPaling = aktif.some((k) => tingkat[k.kunci] === "paling");
  const bobot = adaPaling ? bobotDariKepentingan(aktif, tingkat) : bobotDariAHP(aktif);
  const semua = gabungBaris(semuaBaris(), pr).map((b) => barisKePerumahan(b, moda, null));
  return hitungPeringkat(semua, aktif, bobot);
}

export function hasilSistem(moda: Moda, tingkat: Record<string, TingkatPenting>, pr: Perubahan): HasilSistem {
  const pr_ = peringkatUntuk(moda, tingkat, pr);
  const posisi = new Map(pr_.map((b) => [b.perumahan.id, b.peringkat]));
  const peringkatPenuh = Object.fromEntries(KANDIDAT.map((k) => [k.kode, posisi.get(k.id) ?? -1]));
  const urut = [...KANDIDAT].sort(
    (a, b) => (posisi.get(a.id) ?? Infinity) - (posisi.get(b.id) ?? Infinity),
  );
  return {
    urutanSistem: Object.fromEntries(urut.map((k, i) => [k.kode, i + 1])),
    peringkatPenuh,
    limaTeratas: pr_.slice(0, 5).map((b) => ({ id: b.perumahan.id, nama: b.perumahan.nama })),
    jumlahDiperingkat: pr_.length,
  };
}

/** Korelasi peringkat Spearman untuk dua urutan tanpa nilai kembar. */
export function spearman(a: Record<string, number>, b: Record<string, number>): number {
  const n = Object.keys(a).length;
  const d2 = Object.keys(a).reduce((s, k) => s + (a[k] - b[k]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

export function top3(a: Record<string, number>, b: Record<string, number>): number {
  return Object.keys(a).filter((k) => a[k] <= 3 && b[k] <= 3).length;
}

/** Butir ganjil positif, butir genap negatif (Brooke, 1996). */
export function skorSUS(jawab: number[]): number {
  return 2.5 * jawab.reduce((s, x, i) => s + (i % 2 === 0 ? x - 1 : 5 - x), 0);
}

const teks = (v: unknown, maks: number) => (typeof v === "string" ? v.trim().slice(0, maks) : "");
const skala = (v: unknown, n: number) =>
  Array.isArray(v) && v.length === n && v.every((x) => Number.isInteger(x) && x >= 1 && x <= 5);

/** Memeriksa kiriman dari peramban. Mengembalikan pesan salah, atau kiriman yang sudah dirapikan. */
export function periksaKiriman(v: unknown): { salah: string } | { isi: KirimanUji } {
  const x = (v ?? {}) as Record<string, unknown>;
  const idn = (x.identitas ?? {}) as Record<string, unknown>;
  if (x.setuju !== true) return { salah: "Persetujuan belum diberikan." };

  const identitas: Identitas = {
    nama: teks(idn.nama, 60),
    usia: teks(idn.usia, 40),
    pekerjaan: teks(idn.pekerjaan, 60),
    punyaRumah: teks(idn.punyaRumah, 40),
    rencana: teks(idn.rencana, 60),
    pernahKuesioner: teks(idn.pernahKuesioner, 40),
  };
  if (!identitas.nama || !identitas.pekerjaan) return { salah: "Nama dan pekerjaan wajib diisi." };
  for (const f of ["usia", "punyaRumah", "rencana", "pernahKuesioner"] as const) {
    if (!(PILIHAN[f] as readonly string[]).includes(identitas[f])) return { salah: "Data diri belum lengkap." };
  }

  const urutan = (x.urutan ?? {}) as Record<string, unknown>;
  const nilai = KODE.map((k) => urutan[k]);
  const lengkap = nilai.every((n) => Number.isInteger(n)) &&
    [...(nilai as number[])].sort((a, b) => a - b).every((n, i) => n === i + 1) &&
    Object.keys(urutan).length === KODE.length;
  if (!lengkap) return { salah: "Urutan Bagian A belum lengkap." };

  if (x.moda !== "motor" && x.moda !== "mobil") return { salah: "Moda tidak dikenal." };
  const t = (x.tingkat ?? {}) as Record<string, unknown>;
  const tingkat: Record<string, TingkatPenting> = {};
  for (const k of KRITERIA_UJI) {
    const n = t[k.kunci] ?? "abaikan";
    if (n !== "abaikan" && n !== "penting" && n !== "paling") return { salah: "Tingkat kepentingan tidak dikenal." };
    tingkat[k.kunci] = n;
  }
  const menyala = Object.values(tingkat).filter((n) => n !== "abaikan").length;
  if (menyala < 2 || menyala > 7) return { salah: "Jumlah hal yang dinilai harus antara 2 dan 7." };

  if (!skala(x.sus, SUS.length) || !skala(x.percaya, PERCAYA.length)) {
    return { salah: "Semua pernyataan di Bagian C wajib dijawab." };
  }
  const lima = Array.isArray(x.limaDilihat) ? x.limaDilihat.slice(0, 5).map((s) => teks(s, 80)) : [];

  return {
    isi: {
      setuju: true,
      identitas,
      urutan: urutan as Record<string, number>,
      alasan: teks(x.alasan, 1000),
      moda: x.moda,
      tingkat,
      limaDilihat: lima,
      sus: x.sus as number[],
      percaya: x.percaya as number[],
      komentar: teks(x.komentar, 2000),
      detik: Number.isFinite(x.detik) ? Math.max(0, Math.min(86400, Math.round(x.detik as number))) : 0,
    },
  };
}

// ------------------------------------------------------------------ ekspor CSV
/**
 * Judul kolom sama dengan ekspor Google Form dari fix/07-uji-penerimaan/buat_form_uat.gs,
 * sehingga olah_uat.py bisa mengolah keduanya tanpa diubah.
 */
const LABEL_TINGKAT: Record<TingkatPenting, string> = {
  abaikan: "Tidak penting",
  penting: "Penting",
  paling: "Paling penting",
};

function sel(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function keCSV(semua: JawabanUji[]): string {
  const kepala = [
    "Timestamp", "ID", "Persetujuan", "Nama atau inisial", "Usia", "Pekerjaan",
    "Apakah Anda sudah memiliki rumah sendiri?",
    "Apakah Anda sedang mencari atau berencana membeli rumah subsidi?",
    "Apakah Anda sebelumnya pernah mengisi kuesioner perbandingan kriteria rumah subsidi dari peneliti ini?",
    ...KODE.map((k) => `Urutan pilihan Anda [Perumahan ${k}]`),
    "Apa yang paling menentukan urutan Anda tadi?",
    "Moda yang dipilih",
    ...KRITERIA_UJI.map((k) => `Seberapa penting setiap hal menurut pengaturan terakhir Anda di website [${k.nama}]`),
    "Nama perumahan di urutan pertama rekomendasi website",
    'Apakah kecamatan tetap "Semua kecamatan" dan tempat kerja tidak diisi?',
    ...SUS.map((s, i) => `SUS ${i + 1}. ${s}`),
    ...PERCAYA.map((s, i) => `Rekomendasi ${i + 1}. ${s}`),
    "Apa yang paling membantu atau paling membingungkan dari website ini?",
    "Urutan sistem website",
    "Durasi (detik)",
  ];
  const baris = semua.map((j) => [
    j.waktu, j.id, "Saya bersedia ikut uji coba ini", j.identitas.nama, j.identitas.usia, j.identitas.pekerjaan,
    j.identitas.punyaRumah, j.identitas.rencana, j.identitas.pernahKuesioner,
    ...KODE.map((k) => j.urutan[k]),
    j.alasan,
    j.moda === "motor" ? "Sepeda motor" : "Mobil",
    ...KRITERIA_UJI.map((k) => LABEL_TINGKAT[j.tingkat[k.kunci] ?? "abaikan"]),
    j.limaTeratas[0]?.nama ?? "",
    "Ya",
    ...j.sus, ...j.percaya,
    j.komentar,
    [...KODE].sort((a, b) => j.urutanSistem[a] - j.urutanSistem[b]).join(""),
    j.detik,
  ]);
  return [kepala, ...baris].map((r) => r.map(sel).join(",")).join("\r\n") + "\r\n";
}
