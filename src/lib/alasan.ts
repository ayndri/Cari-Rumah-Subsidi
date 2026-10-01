import { keMenit } from "./data";
import type { BarisPeringkat, Kriteria, KunciKriteria, Perumahan } from "./tipe";

/**
 * Motif identitas produk ini (lihat DESIGN.md): tiap hasil disertai satu kalimat
 * alasan dalam bahasa sehari-hari, dan kalau ada kelemahan yang menonjol,
 * kelemahannya ikut disebut.
 *
 * Alasannya sederhana: pembeli rumah subsidi tidak butuh dibujuk, mereka butuh
 * tahu apa yang mereka tukar. Sistem yang cuma memuji setiap pilihan teratas
 * tidak membantu siapa pun memutuskan.
 */

type Posisi = { kunci: KunciKriteria; urutan: number; dari: number; seri: number };

function posisiTiapKriteria(
  perumahan: Perumahan,
  semua: Perumahan[],
  kriteriaAktif: Kriteria[],
): Posisi[] {
  return kriteriaAktif.map((k) => {
    const nilai = semua
      .map((p) => p.nilai[k.kunci])
      .filter((v): v is number => typeof v === "number");
    const nilaiSaya = perumahan.nilai[k.kunci];
    if (typeof nilaiSaya !== "number") {
      return { kunci: k.kunci, urutan: Number.POSITIVE_INFINITY, dari: nilai.length, seri: 0 };
    }
    const lebihBaik = nilai.filter((v) => (k.benefit ? v > nilaiSaya : v < nilaiSaya)).length;
    const seri = nilai.filter((v) => v === nilaiSaya).length;
    return { kunci: k.kunci, urutan: lebihBaik + 1, dari: nilai.length, seri };
  });
}

/** Kriteria waktu tempuh bernilai detik; kalimatnya menyebut menit. */
const KRITERIA_WAKTU: KunciKriteria[] = ["sekolah", "pasar", "faskes", "ibadah", "tempatKerja"];

function untukDibaca(kunci: KunciKriteria, nilai: number): number {
  return KRITERIA_WAKTU.includes(kunci) ? keMenit(nilai) : nilai;
}

function frasaUnggul(kunci: KunciKriteria, detikAtauNilai: number, paling: boolean): string {
  const nilai = untukDibaca(kunci, detikAtauNilai);
  switch (kunci) {
    case "luasBangunan":
      return paling ? "rumahnya paling luas" : `rumahnya termasuk luas, ${nilai} m²`;
    case "luasLahan":
      return paling ? "tanahnya paling lega" : `tanahnya lega, ${nilai} m²`;
    case "sekolah":
      return `cuma ${nilai} menit ke sekolah`;
    case "pasar":
      return `${nilai} menit ke pasar`;
    case "faskes":
      return `${nilai} menit ke fasilitas kesehatan`;
    case "pusatKab":
      return `${nilai} km ke pusat kabupaten`;
    case "halaman":
      return "halamannya termasuk lega";
    case "ibadah":
      return `${nilai} menit ke tempat ibadah`;
    case "tempatKerja":
      return `${nilai} menit ke tempat kerjamu`;
  }
}

function frasaLemah(kunci: KunciKriteria, detikAtauNilai: number): string {
  const nilai = untukDibaca(kunci, detikAtauNilai);
  switch (kunci) {
    case "luasBangunan":
      return `rumahnya termasuk kecil, ${nilai} m²`;
    case "luasLahan":
      return `tanahnya termasuk sempit, ${nilai} m²`;
    case "sekolah":
      return `sekolah agak jauh, ${nilai} menit`;
    case "pasar":
      return `pasar agak jauh, ${nilai} menit`;
    case "faskes":
      return `fasilitas kesehatan agak jauh, ${nilai} menit`;
    case "pusatKab":
      return `agak jauh dari pusat kabupaten, ${nilai} km`;
    case "halaman":
      return "halamannya termasuk sempit";
    case "ibadah":
      return `tempat ibadah agak jauh, ${nilai} menit`;
    case "tempatKerja":
      return `tempat kerjamu agak jauh, ${nilai} menit`;
  }
}

function besarkan(kalimat: string): string {
  return kalimat.charAt(0).toUpperCase() + kalimat.slice(1);
}

/**
 * Menghasilkan satu sampai dua kalimat. Kalimat pertama menyebut paling banyak
 * dua keunggulan, kalimat kedua hanya muncul kalau ada kelemahan yang benar-benar
 * menonjol (peringkat paling buncit pada kriteria yang dipakai).
 */
export function susunAlasan(
  baris: BarisPeringkat,
  semuaHasil: BarisPeringkat[],
  kriteriaAktif: Kriteria[],
): string {
  const semua = semuaHasil.map((b) => b.perumahan);
  if (semua.length < 3) return "";

  const posisi = posisiTiapKriteria(baris.perumahan, semua, kriteriaAktif);
  const urutanBobot = kriteriaAktif.map((k) => k.kunci);
  const urut = (a: Posisi, b: Posisi) =>
    urutanBobot.indexOf(a.kunci) - urutanBobot.indexOf(b.kunci);

  const unggul = posisi
    .filter((p) => Number.isFinite(p.urutan) && p.urutan <= Math.max(2, p.dari / 2))
    .sort((a, b) => a.urutan / a.dari - b.urutan / b.dari || urut(a, b))
    .slice(0, 2)
    .sort(urut);

  const lemah = posisi
    .filter((p) => p.urutan === p.dari && p.dari > 2)
    .sort(urut)
    .slice(0, 1);

  const bagianUnggul = unggul.map((p) =>
    frasaUnggul(
      p.kunci,
      baris.perumahan.nilai[p.kunci] as number,
      p.urutan === 1 && p.seri === 1,
    ),
  );

  const kalimat: string[] = [];
  if (bagianUnggul.length === 1) kalimat.push(`${besarkan(bagianUnggul[0])}.`);
  if (bagianUnggul.length === 2)
    kalimat.push(`${besarkan(bagianUnggul[0])}, dan ${bagianUnggul[1]}.`);

  if (lemah.length === 1) {
    const frasa = frasaLemah(lemah[0].kunci, baris.perumahan.nilai[lemah[0].kunci] as number);
    kalimat.push(kalimat.length ? `Tapi ${frasa}.` : `${besarkan(frasa)}.`);
  }

  return kalimat.join(" ");
}
