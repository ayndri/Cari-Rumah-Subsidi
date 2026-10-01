# -*- coding: utf-8 -*-
"""
buat-data.py — Mengubah dataset penelitian menjadi JSON yang dipakai aplikasi.

Dijalankan ulang setiap kali dataset diperbarui:

    python skrip/buat-data.py

Sumbernya `dataset_google_motor_mobil.csv` pada folder induk, hasil `buat_dataset_google.py`.
Berkas itu berisi seluruh atribut perumahan ditambah waktu tempuh Google dan TomTom.

Asal tiap angka waktu tempuh:

  motor  sekolah, pasar, faskes  Google Routes API travelMode TWO_WHEELER, TRAFFIC_AWARE,
                                 berangkat Senin 07.00 WIB. Sama dengan Tabel 4.7 naskah.
  mobil  sekolah, pasar, faskes  Google Routes API travelMode DRIVE, pengaturan sama.
  motor, mobil  ibadah           TomTom Routing sepeda motor, Senin 07.00, per agama
                                 (enrich_ibadah_agama.py). Mobil memakai nilai yang sama
                                 karena TomTom memberi waktu identik untuk kedua moda.
                                 Kriteria tambahan saja.

Fasilitas tujuan tiap rute adalah fasilitas tercepat menurut TomTom (8 kandidat terdekat).
Moda sepeda tidak ada: Google Routes API tidak menyediakan rute sepeda untuk wilayah ini.

Waktu disimpan dalam DETIK, bukan menit. Perangkingan harus memakai angka yang sama
dengan Tabel 4.7 naskah; kalau dibulatkan ke menit dulu, peringkat 2 sampai 4
bertukar tempat. Pembulatan ke menit hanya dilakukan saat ditampilkan.

Moda jalan kaki tidak ikut dibawa. Dari 84 perumahan, 61 di antaranya tidak dapat
dirutekan menuju pasar maupun fasilitas kesehatan dengan profil pejalan kaki,
sehingga kolomnya akan berisi campuran jarak rute dan garis lurus dan tidak lagi
setara antaralternatif.

Dewi Nur Ayundari (1462300065) — Teknik Informatika Untag Surabaya
"""
from __future__ import annotations

import csv
import json
import re
import unicodedata
from pathlib import Path

DIR = Path(__file__).resolve().parent
AKAR = DIR.parent
SUMBER = AKAR.parent / "dataset_google_motor_mobil.csv"
TUJUAN = AKAR / "src" / "data" / "perumahan.json"
# Titik fasilitas yang sama dengan perhitungan penelitian, dipakai panel admin untuk
# menghitung waktu tempuh perumahan yang ditambahkan.
SUMBER_TITIK = AKAR.parent / "pengujian_metode" / "cache_titik_fasilitas.json"
TUJUAN_TITIK = AKAR / "src" / "data" / "titik-fasilitas.json"
SUMBER_IBADAH = AKAR.parent / "dataset_ibadah_agama.csv"
META_IBADAH = AKAR.parent / "metadata_ibadah_agama.json"
TUJUAN_IBADAH = AKAR / "src" / "data" / "titik-ibadah.json"
AGAMA = ("islam", "kristen", "katolik", "hindu", "buddha", "konghucu")

INTI = ("sekolah", "pasar", "faskes")

# Kolom CSV untuk tiap moda dan fasilitas inti.
KOLOM = {
    "motor": {f: f"waktu_{f}_motor_g_s" for f in INTI},
    "mobil": {f: f"waktu_{f}_mobil_g_s" for f in INTI},
}


def slug(teks: str) -> str:
    teks = unicodedata.normalize("NFKD", teks).encode("ascii", "ignore").decode()
    teks = re.sub(r"[^a-zA-Z0-9]+", "-", teks).strip("-").lower()
    return teks or "perumahan"


# Nama pada SiKumbang tersimpan huruf kapital semua. Dibiarkan begitu, nama
# perumahan terbaca seperti berteriak dan tombol jadi panjang. Yang tetap
# kapital hanya bentuk badan usaha dan singkatan pendek.
SINGKATAN = {"PT", "CV", "UD", "PT.", "CV.", "UD.", "KPR", "BTN", "RT", "RW"}


def rapikan(teks: str) -> str:
    kata = teks.strip().split()
    hasil = []
    for k in kata:
        polos = k.strip(".,")
        if k.upper() in SINGKATAN or polos.upper() in SINGKATAN:
            hasil.append(k.upper())
        elif polos.isdigit() or not polos.isalpha():
            hasil.append(k)
        else:
            hasil.append(k.capitalize())
    teks = " ".join(hasil)
    # SiKumbang kadang mencatat bentuk badan usaha dua kali ("PT PT. Abadi ...").
    return re.sub(r"^(PT|CV|UD)\.?\s+\1\.?\s+", r"\1 ", teks)


def angka(nilai: str | None) -> float | None:
    if nilai is None or not str(nilai).strip():
        return None
    try:
        return float(nilai)
    except ValueError:
        return None


def detik(nilai: str | None) -> int | None:
    v = angka(nilai)
    return None if v is None or v <= 0 else round(v)


def jalankan() -> None:
    if not SUMBER.exists():
        raise SystemExit(f"Dataset tidak ditemukan: {SUMBER}")

    with SUMBER.open(encoding="utf-8-sig", newline="") as f:
        baris = list(csv.DictReader(f))
    with SUMBER_IBADAH.open(encoding="utf-8-sig", newline="") as f:
        ibadah = list(csv.DictReader(f))
    if [r["nama_perumahan"] for r in ibadah] != [r["nama_perumahan"] for r in baris]:
        raise SystemExit("dataset_ibadah_agama.csv tidak sejajar dengan dataset utama")

    hasil = []
    dilewati = []
    dipakai_id: set[str] = set()

    for r, ri in zip(baris, ibadah):
        nama = (r.get("nama_perumahan") or "").strip()
        wajib = {
            "luasBangunan": angka(r.get("luas_bangunan_m2")),
            "luasLahan": angka(r.get("luas_lahan_m2")),
            "latitude": angka(r.get("latitude")),
            "longitude": angka(r.get("longitude")),
        }
        waktu = {m: {f: detik(r.get(k)) for f, k in kolom.items()} for m, kolom in KOLOM.items()}
        per_agama = {a: detik(ri.get(f"waktu_ibadah_{a}_s")) for a in AGAMA}

        kurang = (
            [k for k, v in wajib.items() if v is None]
            + [f"{m}.{f}" for m in KOLOM for f in INTI if waktu[m][f] is None]
            + [f"ibadah.{a}" for a, v in per_agama.items() if v is None]
        )
        for m in KOLOM:
            waktu[m]["ibadah"] = dict(per_agama)
        if not nama or kurang:
            dilewati.append(f"{nama or '(tanpa nama)'}: {', '.join(kurang) or 'nama kosong'}")
            continue

        # id harus unik; beberapa perumahan bernama sama di kecamatan berbeda
        dasar = slug(nama)
        id_ = dasar
        n = 2
        while id_ in dipakai_id:
            id_ = f"{dasar}-{n}"
            n += 1
        dipakai_id.add(id_)

        hasil.append(
            {
                "id": id_,
                "nama": rapikan(nama),
                "developer": rapikan(r.get("developer") or "") or "Tidak tercatat",
                "kecamatan": rapikan(r.get("kecamatan") or "") or "Tidak tercatat",
                "desa": rapikan(r.get("desa") or ""),
                "harga": int(angka(r.get("harga")) or 0),
                "latitude": wajib["latitude"],
                "longitude": wajib["longitude"],
                "luasBangunan": wajib["luasBangunan"],
                "luasLahan": wajib["luasLahan"],
                "jarakPusatKm": angka(r.get("jarak_pusat_kab_km")),
                "rasioLahan": angka(r.get("rasio_lahan_per_bangunan")),
                "waktu": waktu,
            }
        )

    TUJUAN.parent.mkdir(parents=True, exist_ok=True)
    TUJUAN.write_text(json.dumps(hasil, indent=1, ensure_ascii=False), encoding="utf-8")

    titik = json.loads(SUMBER_TITIK.read_text(encoding="utf-8"))["titik"]
    TUJUAN_TITIK.write_text(
        json.dumps({f: [[round(t[0], 6), round(t[1], 6)] for t in titik[f]] for f in INTI}),
        encoding="utf-8",
    )

    meta = json.loads(META_IBADAH.read_text(encoding="utf-8"))
    TUJUAN_IBADAH.write_text(json.dumps({"titik": meta["titik_per_agama"]}, ensure_ascii=False), encoding="utf-8")

    kecamatan = sorted({p["kecamatan"] for p in hasil})
    print(f"Sumber   : {SUMBER.name}, {len(baris)} baris")
    print(f"Terpakai : {len(hasil)} perumahan di {len(kecamatan)} kecamatan")
    if dilewati:
        print(f"Dilewati : {len(dilewati)} karena datanya tidak lengkap")
        for d in dilewati[:5]:
            print(f"           {d}")
    print(f"Keluaran : {TUJUAN.relative_to(AKAR)}")


if __name__ == "__main__":
    jalankan()
