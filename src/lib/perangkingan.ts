import type { BarisPeringkat, Kriteria, Perumahan, TingkatPenting } from "./tipe";

/**
 * Perangkingan AHP-TOPSIS beserta penyesuaian bobot oleh pengguna.
 *
 * Padanan Python-nya ada di `pengujian_metode/mcdm.py`; angka kedua versi
 * harus sama. Rumus ROC dipilih setelah diuji pada 84 perumahan dan seluruh
 * 120 urutan kepentingan yang mungkin. Lihat `uji_bobot_pengurutan.py`.
 */

/**
 * Rank Order Centroid. Mengubah urutan kepentingan menjadi bobot, tanpa
 * meminta pengguna menyebut angka apa pun.
 *
 * Untuk lima kriteria hasilnya 0,457 - 0,257 - 0,157 - 0,090 - 0,040.
 */
export function bobotROC(jumlah: number): number[] {
  const w = Array.from({ length: jumlah }, (_, i) => {
    let jumlahHarmonik = 0;
    for (let k = i + 1; k <= jumlah; k++) jumlahHarmonik += 1 / k;
    return jumlahHarmonik / jumlah;
  });
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((v) => v / total);
}

/** Bobot AHP untuk kriteria yang sedang aktif, dinormalisasi ulang agar berjumlah 1. */
export function bobotDariAHP(kriteriaAktif: Kriteria[]): number[] {
  const total = kriteriaAktif.reduce((a, k) => a + k.bobotDasar, 0);
  if (total === 0) return kriteriaAktif.map(() => 1 / kriteriaAktif.length);
  return kriteriaAktif.map((k) => k.bobotDasar / total);
}

/**
 * Bobot dari urutan kepentingan yang disusun pengguna.
 * `kriteriaAktif` sudah dalam urutan paling penting lebih dahulu.
 */
export function bobotDariUrutan(kriteriaAktif: Kriteria[]): number[] {
  return bobotROC(kriteriaAktif.length);
}

/**
 * Bobot dari tingkat kepentingan yang dipilih pengguna.
 *
 * Pengguna hanya menjawab "penting" atau "paling penting" per kriteria, tanpa
 * menyebut angka dan tanpa mengurutkan satu per satu. Terjemahannya ke bobot
 * tetap memakai ROC, tapi kriteria yang setingkat berbagi rata jatah bobotnya.
 *
 * Kenapa berbagi rata: kalau pengguna menandai dua hal sama-sama paling penting,
 * lalu sistem diam-diam memberi bobot berbeda pada keduanya, hasilnya terasa
 * tidak jujur. ROC murni akan melakukan itu.
 *
 * Contoh lima kriteria, dua ditandai paling penting:
 *   ROC       = 0,457  0,257  0,157  0,090  0,040
 *   dua teratas berbagi 0,714 -> 0,357 masing-masing
 *   tiga sisanya berbagi 0,287 -> 0,096 masing-masing
 */
export function bobotDariKepentingan(
  kriteriaAktif: Kriteria[],
  tingkat: Record<string, TingkatPenting>,
): number[] {
  const n = kriteriaAktif.length;
  if (n === 0) return [];

  const roc = bobotROC(n);
  const urutanTingkat: TingkatPenting[] = ["paling", "penting"];

  const hasil = new Array<number>(n).fill(0);
  let posisi = 0;
  for (const t of urutanTingkat) {
    const anggota = kriteriaAktif
      .map((k, i) => ({ k, i }))
      .filter(({ k }) => (tingkat[k.kunci] ?? "penting") === t);
    if (anggota.length === 0) continue;

    const jatah = roc.slice(posisi, posisi + anggota.length).reduce((a, b) => a + b, 0);
    const rata = jatah / anggota.length;
    anggota.forEach(({ i }) => (hasil[i] = rata));
    posisi += anggota.length;
  }

  const total = hasil.reduce((a, b) => a + b, 0);
  return total === 0 ? hasil.map(() => 1 / n) : hasil.map((v) => v / total);
}

/** Normalisasi vektor: tiap nilai dibagi akar jumlah kuadrat kolomnya. */
function normalisasiVektor(matriks: number[][]): number[][] {
  const jumlahKolom = matriks[0]?.length ?? 0;
  const pembagi = Array.from({ length: jumlahKolom }, (_, j) =>
    Math.sqrt(matriks.reduce((a, baris) => a + baris[j] ** 2, 0)) || 1,
  );
  return matriks.map((baris) => baris.map((v, j) => v / pembagi[j]));
}

/**
 * TOPSIS. Alternatif terbaik adalah yang paling dekat ke solusi ideal positif
 * sekaligus paling jauh dari solusi ideal negatif.
 */
export function hitungPeringkat(
  daftar: Perumahan[],
  kriteriaAktif: Kriteria[],
  bobot: number[],
): BarisPeringkat[] {
  if (daftar.length === 0 || kriteriaAktif.length === 0) return [];

  // Perumahan yang salah satu nilainya belum ada tidak bisa dibandingkan setara.
  const terpakai = daftar.filter((p) =>
    kriteriaAktif.every((k) => typeof p.nilai[k.kunci] === "number"),
  );
  if (terpakai.length === 0) return [];

  const X = terpakai.map((p) => kriteriaAktif.map((k) => p.nilai[k.kunci] as number));
  const R = normalisasiVektor(X);
  const V = R.map((baris) => baris.map((v, j) => v * bobot[j]));

  const idealPositif = kriteriaAktif.map((k, j) => {
    const kolom = V.map((baris) => baris[j]);
    return k.benefit ? Math.max(...kolom) : Math.min(...kolom);
  });
  const idealNegatif = kriteriaAktif.map((k, j) => {
    const kolom = V.map((baris) => baris[j]);
    return k.benefit ? Math.min(...kolom) : Math.max(...kolom);
  });

  const skor = V.map((baris) => {
    const dPlus = Math.sqrt(baris.reduce((a, v, j) => a + (v - idealPositif[j]) ** 2, 0));
    const dMinus = Math.sqrt(baris.reduce((a, v, j) => a + (v - idealNegatif[j]) ** 2, 0));
    const penyebut = dPlus + dMinus;
    return penyebut === 0 ? 0 : dMinus / penyebut;
  });

  return terpakai
    .map((perumahan, i) => ({ perumahan, skor: skor[i], peringkat: 0 }))
    .sort((a, b) => b.skor - a.skor)
    .map((baris, i) => ({ ...baris, peringkat: i + 1 }));
}
