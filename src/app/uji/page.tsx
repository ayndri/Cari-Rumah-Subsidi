"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import { AGAMA, keMenit, MODA, semuaBaris } from "@/lib/data";
import { gabungBaris, PERUBAHAN_KOSONG, type Perubahan } from "@/lib/perubahan";
import { KUNCI_SIMPAN, KUNCI_UJI, SEMUA_KECAMATAN, SIMPANAN_AWAL, type Simpanan } from "@/lib/pilihan";
import type { Agama, Moda, TingkatPenting } from "@/lib/tipe";
import {
  HARGA_SETARA,
  KANDIDAT,
  KRITERIA_UJI,
  PERCAYA,
  PILIHAN,
  SUS,
  peringkatUntuk,
  type Identitas,
  type KirimanUji,
} from "@/lib/uji";

/**
 * Uji penerimaan, satu responden per tab. Urutannya dikunci:
 *   pembuka -> urutkan (Bagian A) -> pengaturan (Bagian B, di halaman cari) -> cek -> nilai (Bagian C) -> selesai
 *
 * Bagian A harus selesai sebelum halaman cari dibuka, supaya urutan responden tidak terpengaruh
 * rekomendasi sistem. Pengaturan Bagian B dibaca langsung dari simpanan halaman cari, jadi tidak
 * ada yang perlu disalin dengan tangan.
 */
type Tahap = "pembuka" | "urutkan" | "pengaturan" | "cek" | "nilai" | "selesai";

type Keadaan = {
  tahap: Tahap;
  setuju: boolean;
  identitas: Identitas;
  /** kode kandidat, dari yang paling ingin dipilih */
  urutan: string[];
  alasan: string;
  mulai: number;
  moda: Moda | null;
  tingkat: Record<string, TingkatPenting> | null;
  agama: Agama | null;
  limaDilihat: string[];
  sus: (number | null)[];
  percaya: (number | null)[];
  komentar: string;
  idTersimpan: number | null;
};

const AWAL: Keadaan = {
  tahap: "pembuka",
  setuju: false,
  identitas: { nama: "", usia: "", pekerjaan: "", punyaRumah: "", rencana: "", pernahKuesioner: "" },
  urutan: [],
  alasan: "",
  mulai: 0,
  moda: null,
  tingkat: null,
  agama: null,
  limaDilihat: [],
  sus: SUS.map(() => null),
  percaya: PERCAYA.map(() => null),
  komentar: "",
  idTersimpan: null,
};

const juta = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const km = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

function bacaCari(): Simpanan | null {
  try {
    return JSON.parse(sessionStorage.getItem(KUNCI_SIMPAN) ?? "null") as Simpanan | null;
  } catch {
    return null;
  }
}

const kotak = "rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4 sm:p-5";
const tombolUtama =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-kecil)] bg-hutan px-5 text-sm font-semibold text-di-atas-hutan transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const tombolKedua =
  "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-kecil)] border border-garis-kuat px-4 text-sm transition hover:bg-permukaan-2";

export default function UjiPenerimaan() {
  const router = useRouter();
  const [k, setK] = useState<Keadaan>(AWAL);
  const [siap, setSiap] = useState(false);
  const [perubahan, setPerubahan] = useState<Perubahan>(PERUBAHAN_KOSONG);
  const [cari, setCari] = useState<Simpanan | null>(null);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    fetch("/api/perubahan", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((isi: Perubahan | null) => isi && setPerubahan(isi))
      .catch(() => {});
  }, []);

  // Dipulihkan setelah hidrasi. Kembali dari halaman cari berarti Bagian B selesai.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage hanya ada di peramban */
    try {
      const s = JSON.parse(sessionStorage.getItem(KUNCI_UJI) ?? "null") as Keadaan | null;
      if (s) setK({ ...AWAL, ...s, tahap: s.tahap === "pengaturan" ? "cek" : s.tahap });
    } catch {
      // Simpanan rusak: mulai dari awal.
    }
    setCari(bacaCari());
    setSiap(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!siap) return;
    try {
      sessionStorage.setItem(KUNCI_UJI, JSON.stringify(k));
    } catch {
      // Tanpa penyimpanan, uji tetap bisa selesai asal tab tidak ditutup.
    }
  }, [siap, k]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [k.tahap]);

  const ubah = (b: Partial<Keadaan>) => setK((lama) => ({ ...lama, ...b }));

  const baris = useMemo(() => {
    const semua = new Map(gabungBaris(semuaBaris(), perubahan).map((p) => [p.id, p]));
    return KANDIDAT.map((c) => ({ kode: c.kode, p: semua.get(c.id) }));
  }, [perubahan]);

  function mulaiBaru() {
    try {
      sessionStorage.removeItem(KUNCI_UJI);
      sessionStorage.removeItem(KUNCI_SIMPAN);
    } catch {}
    setCari(null);
    setGalat("");
    setK(AWAL);
  }

  function keBagianB() {
    // Halaman cari dimulai dari pengaturan bawaan untuk setiap responden.
    try {
      sessionStorage.setItem(KUNCI_SIMPAN, JSON.stringify(SIMPANAN_AWAL));
      sessionStorage.setItem(KUNCI_UJI, JSON.stringify({ ...k, tahap: "pengaturan" }));
    } catch {}
    router.push("/cari");
  }

  async function kirim() {
    if (!k.moda || !k.tingkat) return;
    setMengirim(true);
    setGalat("");
    const isi: KirimanUji = {
      setuju: k.setuju,
      identitas: k.identitas,
      urutan: Object.fromEntries(k.urutan.map((kode, i) => [kode, i + 1])),
      alasan: k.alasan,
      moda: k.moda,
      tingkat: k.tingkat,
      agama: k.agama,
      limaDilihat: k.limaDilihat,
      sus: k.sus as number[],
      percaya: k.percaya as number[],
      komentar: k.komentar,
      detik: (Date.now() - k.mulai) / 1000,
    };
    try {
      const r = await fetch("/api/uji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isi),
      });
      const d = (await r.json()) as { id?: number; pesan?: string };
      if (!r.ok || !d.id) throw new Error(d.pesan ?? "Jawaban belum tersimpan.");
      try {
        sessionStorage.removeItem(KUNCI_SIMPAN);
      } catch {}
      ubah({ tahap: "selesai", idTersimpan: d.id });
    } catch (e) {
      setGalat((e as Error).message || "Jawaban belum tersimpan. Periksa internet lalu coba lagi.");
    } finally {
      setMengirim(false);
    }
  }

  if (!siap) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header jejak="Uji coba" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header jejak="Uji coba" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <Langkah tahap={k.tahap} />

        {k.tahap === "pembuka" && <Pembuka k={k} ubah={ubah} />}
        {k.tahap === "urutkan" && <Urutkan k={k} ubah={ubah} baris={baris} lanjut={keBagianB} />}
        {k.tahap === "cek" && (
          <Cek
            cari={cari}
            perubahan={perubahan}
            kembali={() => {
              try {
                sessionStorage.setItem(KUNCI_UJI, JSON.stringify({ ...k, tahap: "pengaturan" }));
              } catch {}
              router.push("/cari");
            }}
            benar={(moda, tingkat, agama, lima) => ubah({ tahap: "nilai", moda, tingkat, agama, limaDilihat: lima })}
          />
        )}
        {k.tahap === "nilai" && <Nilai k={k} ubah={ubah} kirim={kirim} mengirim={mengirim} galat={galat} />}
        {k.tahap === "selesai" && (
          <section className={kotak}>
            <h1 className="judul text-2xl font-semibold">Terima kasih, jawabanmu sudah tersimpan.</h1>
            <p className="mt-2 text-sm text-teks-redup">
              Nomor jawaban: {k.idTersimpan}. Kamu boleh menutup halaman ini.
            </p>
            <button type="button" onClick={mulaiBaru} className={`${tombolKedua} mt-5`}>
              Mulai untuk responden berikutnya
            </button>
          </section>
        )}

        {k.tahap !== "pembuka" && k.tahap !== "selesai" && (
          <p className="mt-8 text-xs text-teks-redup">
            Salah mulai atau ganti responden?{" "}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => {
                if (window.confirm("Hapus semua isian di tab ini dan mulai dari awal?")) mulaiBaru();
              }}
            >
              Mulai dari awal
            </button>
          </p>
        )}
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ penanda langkah
function Langkah({ tahap }: { tahap: Tahap }) {
  const daftar: { t: Tahap[]; label: string }[] = [
    { t: ["pembuka"], label: "Data diri" },
    { t: ["urutkan"], label: "A. Urutkan" },
    { t: ["pengaturan", "cek"], label: "B. Pakai website" },
    { t: ["nilai"], label: "C. Penilaian" },
  ];
  const aktif = daftar.findIndex((d) => d.t.includes(tahap));
  if (tahap === "selesai") return null;
  return (
    <ol className="mb-5 flex flex-wrap gap-2 text-xs" aria-label="Langkah uji coba">
      {daftar.map((d, i) => (
        <li
          key={d.label}
          aria-current={i === aktif ? "step" : undefined}
          className={[
            "rounded-full px-3 py-1",
            i === aktif ? "bg-hutan font-semibold text-di-atas-hutan" : i < aktif ? "bg-permukaan-2 text-teks" : "text-teks-redup",
          ].join(" ")}
        >
          {d.label}
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------ pembuka dan data diri
function Pilih({
  label, nilai, pilihan, onUbah,
}: { label: string; nilai: string; pilihan: readonly string[]; onUbah: (v: string) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {pilihan.map((p) => (
          <label
            key={p}
            className={[
              "inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-kecil)] border px-3 text-sm sm:min-h-9",
              nilai === p ? "border-hutan bg-hutan text-di-atas-hutan" : "border-garis-kuat hover:bg-permukaan-2",
            ].join(" ")}
          >
            <input type="radio" className="sr-only" checked={nilai === p} onChange={() => onUbah(p)} />
            {p}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Pembuka({ k, ubah }: { k: Keadaan; ubah: (b: Partial<Keadaan>) => void }) {
  const i = k.identitas;
  const set = (b: Partial<Identitas>) => ubah({ identitas: { ...i, ...b } });
  const lengkap =
    k.setuju && i.nama.trim() && i.pekerjaan.trim() && i.usia && i.punyaRumah && i.rencana && i.pernahKuesioner;

  return (
    <section className={kotak}>
      <h1 className="judul text-2xl font-semibold">Uji coba website rekomendasi rumah subsidi</h1>
      <div className="mt-3 flex flex-col gap-2 text-sm text-teks-redup">
        <p>
          Terima kasih sudah bersedia mencoba. Waktunya sekitar 15 menit, dengan tiga bagian: (A) kamu
          mengurutkan sepuluh perumahan, (B) kamu memakai website, (C) kamu menilai website.
        </p>
        <p>
          Jawaban hanya dipakai untuk penelitian tugas akhir Dewi Nur Ayundari (Teknik Informatika, Untag
          Surabaya) dan tidak disebarkan beserta namamu. Tidak ada jawaban benar atau salah.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div>
          <label htmlFor="nama" className="text-sm font-medium">Nama atau inisial</label>
          <input id="nama" value={i.nama} maxLength={60} onChange={(e) => set({ nama: e.target.value })}
            className="mt-1 min-h-11 w-full rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 text-sm" />
        </div>
        <Pilih label="Usia" nilai={i.usia} pilihan={PILIHAN.usia} onUbah={(v) => set({ usia: v })} />
        <div>
          <label htmlFor="pekerjaan" className="text-sm font-medium">Pekerjaan</label>
          <input id="pekerjaan" value={i.pekerjaan} maxLength={60} onChange={(e) => set({ pekerjaan: e.target.value })}
            className="mt-1 min-h-11 w-full rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 text-sm" />
        </div>
        <Pilih label="Apakah kamu sudah memiliki rumah sendiri?" nilai={i.punyaRumah}
          pilihan={PILIHAN.punyaRumah} onUbah={(v) => set({ punyaRumah: v })} />
        <Pilih label="Apakah kamu sedang mencari atau berencana membeli rumah subsidi?" nilai={i.rencana}
          pilihan={PILIHAN.rencana} onUbah={(v) => set({ rencana: v })} />
        <Pilih label="Pernahkah kamu mengisi kuesioner perbandingan kriteria rumah subsidi dari peneliti ini?"
          nilai={i.pernahKuesioner} pilihan={PILIHAN.pernahKuesioner} onUbah={(v) => set({ pernahKuesioner: v })} />

        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={k.setuju} onChange={(e) => ubah({ setuju: e.target.checked })}
            className="mt-0.5 size-5 accent-[var(--hutan)]" />
          <span>Saya bersedia ikut uji coba ini.</span>
        </label>
      </div>

      <button type="button" disabled={!lengkap} className={`${tombolUtama} mt-5`}
        onClick={() => ubah({ tahap: "urutkan", mulai: Date.now() })}>
        Mulai Bagian A
      </button>
    </section>
  );
}

// ------------------------------------------------------------------ Bagian A
type Baris = { kode: string; p: ReturnType<typeof semuaBaris>[number] | undefined };

function Kartu({ b, nomor, onKetuk }: { b: Baris; nomor: number | null; onKetuk: () => void }) {
  const p = b.p;
  if (!p) {
    return (
      <div className={`${kotak} text-sm text-amber`}>
        Perumahan {b.kode} tidak ditemukan di data. Hubungi peneliti sebelum melanjutkan.
      </div>
    );
  }
  const waktu = (m: Moda, f: "sekolah" | "pasar" | "faskes" | "ibadah") => {
    // Kartu tidak tahu agama responden, jadi tempat ibadah ditampilkan yang terdekat dari
    // agama apa pun, sama dengan kartu yang dipakai responden sebelum 1 Oktober 2026.
    const w = p.waktu[m];
    const d = f === "ibadah" ? Math.min(...Object.values(w.ibadah ?? {})) : w[f];
    return Number.isFinite(d) ? `${keMenit(d)} menit` : "–";
  };
  return (
    <button
      type="button"
      onClick={onKetuk}
      aria-pressed={nomor !== null}
      aria-label={`Perumahan ${b.kode}, ${p.nama}${nomor ? `, urutan ${nomor}` : ""}`}
      className={[
        "relative w-full rounded-[var(--radius-kartu)] border bg-permukaan p-4 text-left transition",
        nomor ? "border-hutan ring-2 ring-hutan" : "border-garis hover:border-garis-kuat",
      ].join(" ")}
    >
      <span className="absolute top-3 right-4 text-xl font-bold text-hutan">{b.kode}</span>
      {nomor && (
        <span className="absolute top-3 right-12 inline-flex size-8 items-center justify-center rounded-full bg-hutan text-sm font-bold text-di-atas-hutan">
          {nomor}
        </span>
      )}
      <span className="block pr-20 font-semibold">{p.nama}</span>
      <span className="block text-xs text-teks-redup">
        Desa {p.desa.toLowerCase().replace(/\b\w/g, (h) => h.toUpperCase())}, Kec. {p.kecamatan}
      </span>
      <span className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <span><span className="block text-xs text-teks-redup">Luas rumah</span><b>{p.luasBangunan} m²</b></span>
        <span><span className="block text-xs text-teks-redup">Luas tanah</span><b>{p.luasLahan} m²</b></span>
        <span>
          <span className="block text-xs text-teks-redup">Harga (disetarakan)</span>
          <b>Rp {juta.format(HARGA_SETARA / 1e6)} juta</b>
        </span>
        <span>
          <span className="block text-xs text-teks-redup">Ke pusat kabupaten</span>
          <b>{p.jarakPusatKm === null ? "–" : `${km.format(p.jarakPusatKm)} km`}</b>
        </span>
      </span>
      <span className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 border-t border-garis pt-2 text-xs">
        <span className="text-teks-redup">Waktu tempuh ke</span>
        <span className="text-teks-redup">Motor</span>
        <span className="text-teks-redup">Mobil</span>
        {([["sekolah", "Sekolah"], ["pasar", "Pasar / pertokoan"], ["faskes", "Fasilitas kesehatan"], ["ibadah", "Tempat ibadah"]] as const).map(
          ([f, nama]) => (
            <span key={f} className="contents">
              <span>{nama}</span>
              <span className="tabular-nums">{waktu("motor", f)}</span>
              <span className="tabular-nums">{waktu("mobil", f)}</span>
            </span>
          ),
        )}
      </span>
    </button>
  );
}

function Urutkan({
  k, ubah, baris, lanjut,
}: { k: Keadaan; ubah: (b: Partial<Keadaan>) => void; baris: Baris[]; lanjut: () => void }) {
  const u = k.urutan;
  const ketuk = (kode: string) =>
    ubah({ urutan: u.includes(kode) ? u.filter((x) => x !== kode) : [...u, kode] });
  const geser = (i: number, arah: -1 | 1) => {
    const j = i + arah;
    if (j < 0 || j >= u.length) return;
    const baru = [...u];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    ubah({ urutan: baru });
  };
  const nama = (kode: string) => baris.find((b) => b.kode === kode)?.p?.nama ?? kode;
  const semuaAda = baris.every((b) => b.p);

  return (
    <section>
      <div className={kotak}>
        <h1 className="judul text-2xl font-semibold">Bagian A. Urutkan sepuluh perumahan</h1>
        <p className="mt-2 text-sm text-teks-redup">
          Bayangkan kamu sedang memilih rumah untuk ditinggali. <b className="text-teks">Ketuk perumahan
          yang paling ingin kamu pilih lebih dulu</b>, lalu yang berikutnya, sampai kesepuluhnya bernomor.
          Ketuk lagi untuk membatalkan. Waktu tempuh adalah perkiraan hari Senin pukul 07.00 ke fasilitas
          terdekat. <b className="text-teks">Harga sengaja disamakan untuk semua perumahan</b>, jadi
          bandingkan luas dan waktu tempuhnya saja. Website belum dibuka pada bagian ini.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {baris.map((b) => (
          <Kartu key={b.kode} b={b} nomor={u.includes(b.kode) ? u.indexOf(b.kode) + 1 : null} onKetuk={() => ketuk(b.kode)} />
        ))}
      </div>

      <div className={`${kotak} mt-4`}>
        <h2 className="text-sm font-semibold">Urutanmu ({u.length} dari {baris.length})</h2>
        {u.length === 0 ? (
          <p className="mt-2 text-sm text-teks-redup">Belum ada yang dipilih.</p>
        ) : (
          <ol className="mt-2 flex flex-col gap-1">
            {u.map((kode, i) => (
              <li key={kode} className="flex items-center gap-2 border-b border-garis py-1.5 text-sm last:border-0">
                <span className="w-6 text-right font-semibold tabular-nums">{i + 1}.</span>
                <span className="w-5 font-bold text-hutan">{kode}</span>
                <span className="min-w-0 flex-1 truncate">{nama(kode)}</span>
                <button type="button" aria-label={`Naikkan ${kode}`} disabled={i === 0} onClick={() => geser(i, -1)}
                  className="inline-flex size-11 items-center justify-center rounded-[var(--radius-kecil)] border border-garis-kuat disabled:opacity-30 sm:size-9">↑</button>
                <button type="button" aria-label={`Turunkan ${kode}`} disabled={i === u.length - 1} onClick={() => geser(i, 1)}
                  className="inline-flex size-11 items-center justify-center rounded-[var(--radius-kecil)] border border-garis-kuat disabled:opacity-30 sm:size-9">↓</button>
              </li>
            ))}
          </ol>
        )}

        <label htmlFor="alasan" className="mt-4 block text-sm font-medium">
          Apa yang paling menentukan urutanmu tadi? <span className="font-normal text-teks-redup">(tidak wajib)</span>
        </label>
        <textarea id="alasan" rows={2} maxLength={1000} value={k.alasan} onChange={(e) => ubah({ alasan: e.target.value })}
          className="mt-1 w-full rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 py-2 text-sm" />

        <button type="button" disabled={u.length !== baris.length || !semuaAda} onClick={lanjut} className={`${tombolUtama} mt-4`}>
          Urutan sudah pas, buka website (Bagian B)
        </button>
        <p className="mt-2 text-xs text-teks-redup">
          Setelah ini urutan tidak bisa diubah lagi. Di website, pilih kendaraan dan atur seberapa penting tiap hal
          sesukamu, lalu tekan tombol kuning <b>Sudah, lanjut ke Bagian C</b> di bagian atas.
        </p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Bagian B: memeriksa pengaturan
const LABEL_TINGKAT: Record<TingkatPenting, string> = {
  abaikan: "Tidak dinilai",
  penting: "Penting",
  paling: "Paling penting",
};

function Cek({
  cari, perubahan, kembali, benar,
}: {
  cari: Simpanan | null;
  perubahan: Perubahan;
  kembali: () => void;
  benar: (moda: Moda, tingkat: Record<string, TingkatPenting>, agama: Agama | null, lima: string[]) => void;
}) {
  const s = cari ?? SIMPANAN_AWAL;
  const agama = s.agama ?? null;
  // Sama dengan halaman cari: tempat ibadah tidak dihitung selama agama belum dipilih.
  const tingkat = Object.fromEntries(
    KRITERIA_UJI.map((k) => [
      k.kunci,
      (k.butuhAgama && !agama ? "abaikan" : (s.tingkat[k.kunci] ?? "abaikan")) as TingkatPenting,
    ]),
  );
  const lima = peringkatUntuk(s.moda, tingkat, perubahan, agama).slice(0, 5).map((b) => b.perumahan.nama);
  const namaAgama = AGAMA.find((a) => a.nilai === agama)?.label;
  const masalah: string[] = [];
  if (s.kecamatan !== SEMUA_KECAMATAN) masalah.push(`Kecamatan masih ${s.kecamatan}. Kembalikan ke Semua Kecamatan.`);
  if (s.tempatKerja) masalah.push("Tempat kerja masih terisi. Hapus dulu tempat kerjanya.");
  const namaModa = MODA.find((m) => m.nilai === s.moda)?.label ?? s.moda;

  return (
    <section className={kotak}>
      <h1 className="judul text-2xl font-semibold">Bagian B. Ini pengaturan terakhirmu?</h1>
      <p className="mt-2 text-sm text-teks-redup">
        Pengaturan ini dibaca langsung dari halaman pencarian yang barusan kamu pakai.
      </p>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-teks-redup">Kendaraan</dt>
        <dd className="font-medium">{namaModa}</dd>
        {KRITERIA_UJI.map((k) => (
          <div key={k.kunci} className="contents">
            <dt className="text-teks-redup">{k.nama}</dt>
            <dd className={tingkat[k.kunci] === "abaikan" ? "text-teks-redup" : "font-medium"}>
              {LABEL_TINGKAT[tingkat[k.kunci]]}
              {k.butuhAgama && tingkat[k.kunci] !== "abaikan" && namaAgama && ` (${namaAgama})`}
            </dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-5 text-sm font-semibold">Lima rekomendasi yang tampil untukmu</h2>
      <ol className="mt-1 list-decimal pl-5 text-sm">
        {lima.map((n) => <li key={n}>{n}</li>)}
      </ol>

      {masalah.length > 0 && (
        <div role="alert" className="mt-4 rounded-[var(--radius-kecil)] border border-amber/40 bg-amber-latar p-3 text-sm">
          {masalah.map((m) => <p key={m}>{m}</p>)}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={masalah.length > 0} className={tombolUtama} onClick={() => benar(s.moda, tingkat, tingkat.ibadah === "abaikan" ? null : agama, lima)}>
          Benar, lanjut ke Bagian C
        </button>
        <button type="button" className={tombolKedua} onClick={kembali}>
          Kembali ke pencarian
        </button>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Bagian C
function Skala({
  nomor, teks, nilai, onUbah,
}: { nomor: string; teks: string; nilai: number | null; onUbah: (v: number) => void }) {
  return (
    <fieldset className="border-b border-garis py-3 last:border-0">
      <legend className="text-sm">
        <span className="font-semibold">{nomor}.</span> {teks}
      </legend>
      <div className="mt-2 grid grid-cols-5 gap-1.5 sm:max-w-sm">
        {[1, 2, 3, 4, 5].map((v) => (
          <label key={v}
            className={[
              "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-[var(--radius-kecil)] border text-sm font-medium",
              nilai === v ? "border-hutan bg-hutan text-di-atas-hutan" : "border-garis-kuat hover:bg-permukaan-2",
            ].join(" ")}>
            <input type="radio" className="sr-only" checked={nilai === v} onChange={() => onUbah(v)} aria-label={`${nomor}: ${v}`} />
            {v}
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-teks-redup sm:max-w-sm">
        <span>Sangat tidak setuju</span>
        <span>Sangat setuju</span>
      </div>
    </fieldset>
  );
}

function Nilai({
  k, ubah, kirim, mengirim, galat,
}: { k: Keadaan; ubah: (b: Partial<Keadaan>) => void; kirim: () => void; mengirim: boolean; galat: string }) {
  const lengkap = k.sus.every((x) => x !== null) && k.percaya.every((x) => x !== null);
  const kurang = k.sus.filter((x) => x === null).length + k.percaya.filter((x) => x === null).length;
  return (
    <section className={kotak}>
      <h1 className="judul text-2xl font-semibold">Bagian C. Penilaian website</h1>
      <p className="mt-2 text-sm text-teks-redup">
        Pilih 1 (sangat tidak setuju) sampai 5 (sangat setuju), menurut pengalamanmu barusan.
      </p>

      <div className="mt-3">
        {SUS.map((t, i) => (
          <Skala key={t} nomor={`${i + 1}`} teks={t} nilai={k.sus[i]}
            onUbah={(v) => ubah({ sus: k.sus.map((x, j) => (j === i ? v : x)) })} />
        ))}
      </div>
      <h2 className="mt-5 text-sm font-semibold">Tentang rekomendasinya</h2>
      <div>
        {PERCAYA.map((t, i) => (
          <Skala key={t} nomor={`R${i + 1}`} teks={t} nilai={k.percaya[i]}
            onUbah={(v) => ubah({ percaya: k.percaya.map((x, j) => (j === i ? v : x)) })} />
        ))}
      </div>

      <label htmlFor="komentar" className="mt-4 block text-sm font-medium">
        Apa yang paling membantu atau paling membingungkan dari website ini?{" "}
        <span className="font-normal text-teks-redup">(tidak wajib)</span>
      </label>
      <textarea id="komentar" rows={3} maxLength={2000} value={k.komentar} onChange={(e) => ubah({ komentar: e.target.value })}
        className="mt-1 w-full rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 py-2 text-sm" />

      {galat && <p role="alert" className="mt-3 text-sm text-amber">{galat}</p>}
      <button type="button" disabled={!lengkap || mengirim} onClick={kirim} className={`${tombolUtama} mt-4`}>
        {mengirim ? "Mengirim…" : "Kirim jawaban"}
      </button>
      {!lengkap && <p className="mt-2 text-xs text-teks-redup">Masih ada {kurang} pernyataan yang belum dijawab.</p>}
    </section>
  );
}
