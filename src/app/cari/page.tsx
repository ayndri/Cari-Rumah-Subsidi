"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import PilihKepentingan from "@/components/PilihKepentingan";
import CariTempatKerja from "@/components/CariTempatKerja";
import dynamic from "next/dynamic";
import HasilRekomendasi, { TabelUrutan } from "@/components/HasilRekomendasi";
import { AGAMA, KECAMATAN, KRITERIA, MODA, semuaBaris } from "@/lib/data";
import { bobotDariAHP, bobotDariKepentingan, hitungPeringkat } from "@/lib/perangkingan";
import { barisKePerumahan, gabungBaris, kriteriaBerlaku, PERUBAHAN_KOSONG, type Perubahan } from "@/lib/perubahan";
import { KUNCI_SIMPAN, SEMUA_KECAMATAN, TINGKAT_AWAL, type Simpanan } from "@/lib/pilihan";
import BilahUji from "@/components/BilahUji";
import type {
  Agama,
  KunciKriteria,
  Moda,
  StatusData,
  TempatKerja,
  TingkatPenting,
  WaktuKerja,
} from "@/lib/tipe";

/**
 * Leaflet membaca `window` saat modulnya dimuat, jadi peta hanya dirender di
 * peramban. Selama memuat, tempatnya tetap dipesan supaya tata letaknya tidak
 * melompat.
 */
const PetaLeaflet = dynamic(() => import("@/components/PetaLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center rounded-[var(--radius-kartu)] border border-garis bg-permukaan-2">
      <p className="text-sm text-teks-redup">Memuat peta…</p>
    </div>
  ),
});

const BATAS_KRITERIA = 7;

/**
 * Pilihan dari kotak pencarian halaman depan (?kec=&utama=&moda=). Kalau ada,
 * ia mengalahkan pilihan tersimpan, karena itu permintaan terbaru pengguna.
 */
function bacaAlamat(): Partial<Simpanan> | null {
  const q = new URLSearchParams(window.location.search);
  if (![...q.keys()].some((k) => ["kec", "utama", "moda"].includes(k))) return null;

  const hasil: Partial<Simpanan> = { tingkat: { ...TINGKAT_AWAL } };
  const kec = q.get("kec");
  if (kec && KECAMATAN.includes(kec)) hasil.kecamatan = kec;
  const moda = q.get("moda");
  if (MODA.some((m) => m.nilai === moda)) hasil.moda = moda as Moda;
  const utama = KRITERIA.find((k) => k.inti && k.kunci === q.get("utama"));
  if (utama) hasil.tingkat = { ...TINGKAT_AWAL, [utama.kunci]: "paling" };
  return hasil;
}

function bacaSimpanan(): Simpanan | null {
  try {
    const mentah = sessionStorage.getItem(KUNCI_SIMPAN);
    if (!mentah) return null;
    const s = JSON.parse(mentah) as Simpanan;
    // Data yang sudah tidak cocok dengan versi aplikasi sekarang diabaikan saja.
    if (!MODA.some((m) => m.nilai === s.moda) || !KECAMATAN.includes(s.kecamatan)) return null;
    return s;
  } catch {
    return null;
  }
}

export default function CariRumah() {
  const [tingkat, setTingkat] = useState<Record<string, TingkatPenting>>(TINGKAT_AWAL);
  const [moda, setModa] = useState<Moda>("motor");
  const [kecamatan, setKecamatan] = useState(SEMUA_KECAMATAN);
  const [idTerpilih, setIdTerpilih] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusData>("siap");
  // Perubahan dari panel admin (luas, harga, perumahan nonaktif, bobot tambahan).
  // Selama belum termuat, data penelitian dipakai apa adanya.
  const [perubahan, setPerubahan] = useState<Perubahan>(PERUBAHAN_KOSONG);

  useEffect(() => {
    let batal = false;
    fetch("/api/perubahan", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((isi: Perubahan | null) => {
        if (!batal && isi) setPerubahan(isi);
      })
      .catch(() => {
        // Tanpa perubahan admin, halaman tetap berjalan dengan data penelitian.
      });
    return () => {
      batal = true;
    };
  }, []);

  const kriteria = useMemo(() => kriteriaBerlaku(KRITERIA, perubahan), [perubahan]);

  const [tempatKerja, setTempatKerja] = useState<TempatKerja | null>(null);
  const [waktuKerja, setWaktuKerja] = useState<WaktuKerja | null>(null);
  const [agama, setAgama] = useState<Agama | null>(null);
  const [menghitungKerja, setMenghitungKerja] = useState(false);
  const [galatKerja, setGalatKerja] = useState("");
  // Kalau pengguna mengganti lokasi sebelum hitungan lama selesai, jawaban lama dibuang.
  const nomorPermintaan = useRef(0);

  // Dipulihkan setelah hidrasi: halaman ini dirender statis, dan sessionStorage
  // baru ada di peramban. Sebelum pemulihan selesai, tidak ada yang disimpan,
  // supaya nilai bawaan tidak menimpa pilihan lama.
  const [siapSimpan, setSiapSimpan] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- alamat dan sessionStorage hanya bisa dibaca setelah hidrasi */
    const dariAlamat = bacaAlamat();
    let pilihanBaru: Simpanan | null = null;
    if (dariAlamat) {
      // Langsung disimpan sebelum alamatnya dibersihkan. Kalau efek ini jalan lagi
      // (React menjalankannya dua kali saat pengembangan), yang terbaca tetap
      // pilihan baru ini, bukan simpanan lama.
      pilihanBaru = {
        tingkat: dariAlamat.tingkat ?? TINGKAT_AWAL,
        moda: dariAlamat.moda ?? "motor",
        kecamatan: dariAlamat.kecamatan ?? SEMUA_KECAMATAN,
        idTerpilih: null,
        tempatKerja: null,
        waktuKerja: null,
        agama: null,
      };
      try {
        sessionStorage.setItem(KUNCI_SIMPAN, JSON.stringify(pilihanBaru));
      } catch {
        // Tanpa penyimpanan, pilihan tetap dipasang untuk kunjungan ini.
      }
      // Alamat dibersihkan supaya kembali dari rincian tidak menimpa perubahan berikutnya.
      window.history.replaceState(window.history.state, "", "/cari");
    }

    const s = pilihanBaru ?? bacaSimpanan();
    if (s) {
      setTingkat({ ...TINGKAT_AWAL, ...s.tingkat });
      setModa(s.moda);
      setKecamatan(s.kecamatan);
      setIdTerpilih(s.idTerpilih);
      setTempatKerja(s.waktuKerja ? s.tempatKerja : null);
      setWaktuKerja(s.tempatKerja ? s.waktuKerja : null);
      setAgama(AGAMA.some((a) => a.nilai === s.agama) ? (s.agama as Agama) : null);
    }
    // Peragaan untuk penguji: /cari?keadaan=memuat atau ?keadaan=gagal.
    // Tidak ada tombolnya di layar supaya pengunjung umum tidak bingung.
    const keadaan = new URLSearchParams(window.location.search).get("keadaan");
    if (keadaan === "memuat" || keadaan === "gagal") setStatus(keadaan);

    setSiapSimpan(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!siapSimpan) return;
    const isi: Simpanan = { tingkat, moda, kecamatan, idTerpilih, tempatKerja, waktuKerja, agama };
    try {
      sessionStorage.setItem(KUNCI_SIMPAN, JSON.stringify(isi));
    } catch {
      // Mode privat atau penyimpanan penuh: fitur ini dilewati tanpa mengganggu halaman.
    }
  }, [siapSimpan, tingkat, moda, kecamatan, idTerpilih, tempatKerja, waktuKerja, agama]);

  /** Waktu tempuh ke tempat kerja untuk moda yang sedang dipilih, kalau sudah ada. */
  const waktuKerjaModa = waktuKerja?.[moda] ?? null;
  const kerjaSiap = waktuKerjaModa !== null;

  const adaPerubahan = useMemo(
    () => KRITERIA.some((k) => tingkat[k.kunci] !== TINGKAT_AWAL[k.kunci]),
    [tingkat],
  );

  const kriteriaAktif = useMemo(
    () =>
      kriteria.filter(
        (k) =>
          (tingkat[k.kunci] ?? "abaikan") !== "abaikan" &&
          (!k.butuhTitikAcuan || kerjaSiap) &&
          (!k.butuhAgama || agama !== null),
      ),
    [kriteria, tingkat, kerjaSiap, agama],
  );

  /**
   * Selama pengguna belum menandai apa pun sebagai paling penting, sistem
   * memakai bobot hasil kuesioner AHP apa adanya, dinormalisasi ulang terhadap
   * kriteria yang menyala. Begitu ada yang ditandai, bobotnya dihitung dari
   * tingkat kepentingan itu.
   */
  const adaPaling = useMemo(
    () => kriteriaAktif.some((k) => tingkat[k.kunci] === "paling"),
    [kriteriaAktif, tingkat],
  );

  const bobot = useMemo(
    () =>
      adaPaling ? bobotDariKepentingan(kriteriaAktif, tingkat) : bobotDariAHP(kriteriaAktif),
    [adaPaling, kriteriaAktif, tingkat],
  );

  /** Waktu tempuh berbeda antarmoda, jadi daftarnya disusun ulang saat moda diganti. */
  const semuaPerumahan = useMemo(
    () =>
      gabungBaris(semuaBaris(), perubahan).map((b) => barisKePerumahan(b, moda, waktuKerjaModa, agama)),
    [moda, waktuKerjaModa, perubahan, agama],
  );

  // Kecamatan dari data penelitian, ditambah kecamatan perumahan yang ditambahkan admin.
  const pilihanKecamatan = useMemo(() => {
    const lain = semuaPerumahan.map((p) => p.kecamatan).filter((k) => !KECAMATAN.includes(k));
    return [SEMUA_KECAMATAN, ...Array.from(new Set([...KECAMATAN.slice(1), ...lain])).sort((a, b) => a.localeCompare(b, "id"))];
  }, [semuaPerumahan]);

  const peringkat = useMemo(() => {
    const kandidat =
      kecamatan === SEMUA_KECAMATAN
        ? semuaPerumahan
        : semuaPerumahan.filter((p) => p.kecamatan === kecamatan);
    return hitungPeringkat(kandidat, kriteriaAktif, bobot);
  }, [kecamatan, kriteriaAktif, bobot, semuaPerumahan]);

  function ubahTingkat(kunci: KunciKriteria, nilai: TingkatPenting) {
    setTingkat((lama) => {
      const sekarang = lama[kunci] ?? "abaikan";
      if (sekarang === nilai) return lama;

      const jumlahAktif = KRITERIA.filter(
        (k) => (lama[k.kunci] ?? "abaikan") !== "abaikan",
      ).length;

      // Lebih dari tujuh kriteria membuat yang di bawah nyaris tidak berpengaruh.
      if (sekarang === "abaikan" && jumlahAktif >= BATAS_KRITERIA) return lama;
      // Di bawah dua kriteria tidak ada yang bisa dibandingkan.
      if (nilai === "abaikan" && jumlahAktif <= 2) return lama;

      return { ...lama, [kunci]: nilai };
    });
  }

  async function pilihTempatKerja(t: TempatKerja) {
    const nomor = ++nomorPermintaan.current;
    setTempatKerja(t);
    setWaktuKerja(null);
    setGalatKerja("");
    setMenghitungKerja(true);
    try {
      const res = await fetch("/api/tempat-kerja/waktu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: t.lat, lon: t.lon }),
      });
      const data = (await res.json()) as WaktuKerja & { pesan?: string };
      if (nomor !== nomorPermintaan.current) return;
      if (!res.ok) throw new Error(data.pesan ?? "Waktu tempuh belum bisa dihitung.");
      setWaktuKerja(data);
      // Orang yang repot mencari lokasi kerjanya jelas menganggapnya penting.
      ubahTingkat("tempatKerja", "penting");
    } catch (e) {
      if (nomor !== nomorPermintaan.current) return;
      setTempatKerja(null);
      setGalatKerja((e as Error).message || "Waktu tempuh belum bisa dihitung.");
    } finally {
      if (nomor === nomorPermintaan.current) setMenghitungKerja(false);
    }
  }

  function hapusTempatKerja() {
    nomorPermintaan.current++;
    setTempatKerja(null);
    setWaktuKerja(null);
    setMenghitungKerja(false);
    setGalatKerja("");
    setTingkat((lama) => ({ ...lama, tempatKerja: "abaikan" }));
  }

  const jumlahTakTerutekan = waktuKerjaModa
    ? Object.values(waktuKerjaModa).filter((v) => v === null).length
    : 0;

  const namaModa = MODA.find((m) => m.nilai === moda)?.label.toLowerCase() ?? moda;

  let keteranganKerja = "";
  if (galatKerja) keteranganKerja = galatKerja;
  else if (!tempatKerja) keteranganKerja = "";
  else if (waktuKerja && !kerjaSiap)
    keteranganKerja = `Untuk moda ${namaModa} belum bisa dihitung, jadi tempat kerja tidak ikut dinilai.`;
  else if (kerjaSiap)
    keteranganKerja =
      (moda === "motor"
        ? "Dihitung dengan rute mobil TomTom, karena layanan hitung massalnya tidak punya profil sepeda motor."
        : "Dihitung dengan rute mobil TomTom.") +
      (jumlahTakTerutekan > 0
        ? ` ${jumlahTakTerutekan} perumahan tidak bisa dirutekan ke sana dan tidak ikut diurutkan selama kriteria ini menyala.`
        : "");

  return (
    <div className="flex min-h-screen flex-col">
      <Header jejak="Cari rumah" />
      <BilahUji />

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-1">
          <h1 className="judul text-2xl font-semibold sm:text-3xl">
            Rumah subsidi mana yang cocok buat kamu?
          </h1>
          <p className="text-sm text-teks-redup">
            {semuaPerumahan.length} perumahan subsidi di Kabupaten Mojokerto, harganya hampir sama.
            Yang dibandingkan luas dan waktu tempuhnya.
          </p>
        </div>

        {/* Bilah pencarian: bentuknya sama dengan kotak cari di halaman depan. */}
        <section
          aria-label="Saring pencarian"
          className="mt-4 grid gap-4 rounded-[var(--radius-kartu)] border border-garis-kuat bg-permukaan p-4 md:grid-cols-[minmax(0,220px)_auto_minmax(0,1fr)] md:items-start"
        >
          <div>
            <label htmlFor="kecamatan" className="text-sm font-medium">
              Kecamatan
            </label>
            <select
              id="kecamatan"
              value={kecamatan}
              onChange={(e) => setKecamatan(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-[var(--radius-kecil)] border border-garis-kuat bg-permukaan px-3 text-sm"
            >
              {pilihanKecamatan.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Sehari-hari pergi naik</legend>
            <div className="mt-1 flex gap-1 rounded-[var(--radius-kecil)] bg-permukaan-2 p-1">
              {MODA.map((m) => (
                <button
                  key={m.nilai}
                  type="button"
                  onClick={() => setModa(m.nilai)}
                  aria-pressed={moda === m.nilai}
                  title={m.keterangan}
                  className={[
                    "inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-kecil)] px-3 text-sm whitespace-nowrap transition sm:min-h-9",
                    moda === m.nilai
                      ? "bg-pilih font-semibold text-di-atas-pilih"
                      : "text-teks-redup hover:bg-garis hover:text-teks",
                  ].join(" ")}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div id="tempat-kerja">
            <p className="text-sm font-medium">
              Tempat kerjamu <span className="font-normal text-teks-redup">(tidak wajib)</span>
            </p>
            <div className="mt-1">
              <CariTempatKerja
                terpilih={tempatKerja}
                sedangMenghitung={menghitungKerja}
                onPilih={pilihTempatKerja}
                onHapus={hapusTempatKerja}
              />
            </div>
            {keteranganKerja && (
              <p
                aria-live="polite"
                className={["mt-1 text-xs", galatKerja ? "text-amber" : "text-teks-redup"].join(" ")}
              >
                {keteranganKerja}
              </p>
            )}
          </div>
        </section>

        {/* Di HP daftar hasil ada di bawah panel kepentingan; jalan pintas ke sana. */}
        <a
          href="#judul-hasil"
          className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-daun underline underline-offset-4 lg:hidden"
        >
          Lihat hasilnya
        </a>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-4 lg:row-span-2 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:[scrollbar-width:thin] xl:row-span-1">
            <PilihKepentingan
              semuaKriteria={kriteria}
              tingkat={tingkat}
              adaPerubahan={adaPerubahan}
              onUbah={ubahTingkat}
              onSetelUlang={() => setTingkat(TINGKAT_AWAL)}
              titikAcuanSiap={kerjaSiap}
              agama={agama}
              onUbahAgama={(a) => {
                setAgama(a);
                // Tanpa agama kriteria ini tidak bisa dihitung, jadi dimatikan sekalian.
                if (!a) setTingkat((lama) => ({ ...lama, ibadah: "abaikan" }));
              }}
              catatanTitikAcuan={
                kerjaSiap && tempatKerja
                  ? `Dari ${tempatKerja.nama}`
                  : "Isi tempat kerjamu di bilah atas dulu."
              }
            />
          </aside>

          <section
            aria-labelledby="judul-hasil"
            className="flex flex-col gap-3 lg:col-start-2 lg:row-start-2 xl:row-start-1"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 id="judul-hasil" className="judul scroll-mt-4 text-lg font-semibold">
                Rumah yang cocok
              </h2>
              {status === "siap" && peringkat.length > 0 && (
                <p className="text-sm text-teks-redup">
                  Lima teratas dari {peringkat.length} perumahan
                  {kecamatan !== SEMUA_KECAMATAN ? ` di ${kecamatan}` : ""}
                </p>
              )}
            </div>
            {/* Pengingat dasar penilaian, karena panel kepentingan bisa tak terlihat saat menggulir. */}
            <p className="-mt-2 text-sm text-teks-redup">
              {adaPaling ? (
                <>
                  Paling penting buatmu:{" "}
                  <span className="font-medium text-teks">
                    {kriteriaAktif
                      .filter((k) => tingkat[k.kunci] === "paling")
                      .map((k) => k.nama.toLowerCase())
                      .join(", ")}
                  </span>
                </>
              ) : (
                "Mengikuti penilaian calon pembeli yang mengisi kuesioner"
              )}
              {" · "}
              {kriteriaAktif.length} hal dinilai · {namaModa}
            </p>

            <HasilRekomendasi
              status={status}
              peringkat={peringkat}
              kriteriaAktif={kriteriaAktif}
              idTerpilih={idTerpilih}
              kecamatan={kecamatan}
              onPilih={setIdTerpilih}
              onSetelUlangKecamatan={() => setKecamatan(SEMUA_KECAMATAN)}
              onCobaLagi={() => setStatus("siap")}
              agama={agama}
            />
          </section>

          <section
            aria-label="Peta sebaran perumahan"
            className="h-[55vh] min-h-[320px] lg:col-start-2 lg:row-start-1 lg:h-[380px] xl:sticky xl:top-4 xl:col-start-3 xl:h-[calc(100vh-2rem)]"
          >
            <PetaLeaflet
              peringkat={status === "siap" ? peringkat : []}
              idTerpilih={idTerpilih}
              onPilih={setIdTerpilih}
              tempatKerja={tempatKerja}
            />
          </section>
        </div>

        {status === "siap" && (
          <div className="mt-6">
            <TabelUrutan
              peringkat={peringkat}
              kriteriaAktif={kriteriaAktif}
              idTerpilih={idTerpilih}
              onPilih={setIdTerpilih}
            />
          </div>
        )}

      </main>
    </div>
  );
}
