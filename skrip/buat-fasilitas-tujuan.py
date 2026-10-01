# -*- coding: utf-8 -*-
"""
buat-fasilitas-tujuan.py — Nama dan jenis fasilitas tujuan tiap perumahan.

    python skrip/buat-fasilitas-tujuan.py

Tiap kriteria waktu tempuh memakai fasilitas TERCEPAT dari delapan kandidat terdekat,
apa pun jenisnya:
  sekolah  amenity school | kindergarten  (TK, SD, SMP, SMA, madrasah)
  pasar    amenity marketplace | shop supermarket
  faskes   amenity clinic | hospital | doctors, healthcare=*  (puskesmas, klinik, RS, bidan, apotek)

Titik di cache penelitian hanya berisi koordinat, jadi nama dan jenisnya dibaca dari
tag OpenStreetMap yang diambil ulang 30 September 2026 (pengujian_metode/cache_<f>_osm.json).

Cara menemukan tujuannya: dari cache TomTom (sepeda motor, lengang), dicari kandidat yang
jarak dan waktunya sama persis dengan kolom jarak/waktu_<f>_motor_lengang pada dataset.
Rute Google, motor maupun mobil, memakai tujuan yang sama (lihat buat_dataset_google.py).

Titik faskes yang tercatat sebagai laboratorium atau apotek dan berjarak kurang dari
150 m dari sebuah rumah sakit dianggap bagian rumah sakit itu. Contohnya "Instalasi
Laboratorium" yang berada 65 m dari RS Dian Husada.

Keluaran: src/data/fasilitas-tujuan.json,
  { id perumahan: { sekolah: {nama, jenis}, pasar: {...}, faskes: {...},
                    ibadah: {islam: nama, kristen: nama, ...} } }
"""
from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter
from pathlib import Path

DIR = Path(__file__).resolve().parent
AKAR = DIR.parent
INDUK = AKAR.parent
DATASET = INDUK / "dataset_google_motor_mobil.csv"
CACHE_TOMTOM = INDUK / "cache_tomtom_motor.json"
TITIK = INDUK / "pengujian_metode" / "cache_titik_fasilitas.json"
OSM = {f: INDUK / "pengujian_metode" / f"cache_{f}_osm.json" for f in ("sekolah", "pasar", "faskes")}
PERUMAHAN = AKAR / "src" / "data" / "perumahan.json"
TUJUAN = AKAR / "src" / "data" / "fasilitas-tujuan.json"
IBADAH = INDUK / "dataset_ibadah_agama.csv"
AGAMA = ("islam", "kristen", "katolik", "hindu", "buddha", "konghucu")

BATAS_COCOK_M = 40
BATAS_BAGIAN_RS_M = 150


def jarak_m(a, b):
    f1, f2 = math.radians(a[0]), math.radians(b[0])
    df, dl = f2 - f1, math.radians(b[1] - a[1])
    h = math.sin(df / 2) ** 2 + math.cos(f1) * math.cos(f2) * math.sin(dl / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def koordinat(e):
    return (e["lat"], e["lon"]) if "lat" in e else (e["center"]["lat"], e["center"]["lon"])


def jenis_faskes(tag: dict) -> str:
    nama = tag.get("name", "").lower()
    amenity, hc = tag.get("amenity", ""), tag.get("healthcare", "")
    if "pustu" in nama or "pembantu" in nama:
        return "Puskesmas pembantu"
    if "puskesmas" in nama:
        return "Puskesmas"
    if amenity == "hospital" or hc == "hospital" or "rumah sakit" in nama or nama.startswith(("rs ", "rs.", "rsu")):
        return "Rumah sakit"
    if hc == "midwife" or "bidan" in nama:
        return "Bidan"
    if hc == "laboratory":
        return "Laboratorium"
    if amenity == "pharmacy" or hc == "pharmacy" or "apotek" in nama or "apotik" in nama:
        return "Apotek"
    if amenity == "doctors" or hc in ("doctor", "dentist"):
        return "Praktik dokter"
    return "Klinik"


def jenis_sekolah(tag: dict) -> str:
    awal = re.split(r"[\s.]+", tag.get("name", "").strip().upper(), maxsplit=1)[0]
    if awal in ("TK", "TKN", "RA", "PAUD", "KB", "TPA") or tag.get("amenity") == "kindergarten":
        return "TK/PAUD"
    if awal.startswith(("SD", "MI")):
        return "SD/MI"
    if awal.startswith(("SMP", "SLTP", "MTS")):
        return "SMP/MTs"
    if awal.startswith(("SMA", "SMK", "SMU", "MA")):
        return "SMA/SMK/MA"
    return "Sekolah"


def jenis_pasar(tag: dict) -> str:
    return "Pasar" if tag.get("amenity") == "marketplace" else "Swalayan"


JENIS = {"sekolah": jenis_sekolah, "pasar": jenis_pasar, "faskes": jenis_faskes}


def jalankan() -> None:
    osm = {f: [e for e in json.loads(p.read_text(encoding="utf-8"))["elements"] if e.get("tags")]
           for f, p in OSM.items()}
    rs = [e for e in osm["faskes"] if jenis_faskes(e["tags"]) == "Rumah sakit" and e["tags"].get("name")]
    cache = json.loads(CACHE_TOMTOM.read_text(encoding="utf-8"))
    titik_semua = json.loads(TITIK.read_text(encoding="utf-8"))["titik"]
    titik = {f: {"%.6f,%.6f" % tuple(t) for t in titik_semua[f]} for f in OSM}

    # perumahan.json disusun dari dataset yang sama dengan urutan baris yang sama;
    # beberapa perumahan berbagi koordinat, jadi dicocokkan per baris, bukan per titik.
    perumahan = json.loads(PERUMAHAN.read_text(encoding="utf-8"))
    baris = list(csv.DictReader(DATASET.open(encoding="utf-8-sig")))
    if len(perumahan) != len(baris):
        raise SystemExit("perumahan.json dan dataset beda jumlah baris; jalankan buat-data.py dulu")

    hasil: dict[str, dict] = {}
    gagal: list[str] = []
    for p, r in zip(perumahan, baris):
        if (p["latitude"], p["longitude"]) != (float(r["latitude"]), float(r["longitude"])):
            raise SystemExit(f"urutan tidak cocok: {p['nama']} / {r['nama_perumahan']}")
        asal = "%.6f,%.6f" % (float(r["latitude"]), float(r["longitude"]))
        hasil[p["id"]] = {}
        for f in OSM:
            jr, wl = float(r[f"jarak_{f}_motor_lengang_m"]), float(r[f"waktu_{f}_motor_lengang_s"])
            cocok = [k.split("|")[1] for k, v in cache.items()
                     if k.startswith(asal + "|") and k.split("|")[1] in titik[f]
                     and abs(v["jarak"] - jr) < 1 and abs(v["lengang"] - wl) < 1]
            if not cocok:
                gagal.append(f"{r['nama_perumahan']} ({f})")
                continue
            tujuan = tuple(map(float, cocok[0].split(",")))
            e = min(osm[f], key=lambda x: jarak_m(tujuan, koordinat(x)))
            if jarak_m(tujuan, koordinat(e)) > BATAS_COCOK_M:
                gagal.append(f"{r['nama_perumahan']} ({f})")
                continue
            j, nama = JENIS[f](e["tags"]), e["tags"].get("name", "").strip()
            if f == "faskes" and j in ("Laboratorium", "Apotek"):
                induk = min(rs, key=lambda x: jarak_m(koordinat(e), koordinat(x)))
                if jarak_m(koordinat(e), koordinat(induk)) < BATAS_BAGIAN_RS_M:
                    j, nama = "Rumah sakit", induk["tags"]["name"].strip()
            hasil[p["id"]][f] = {"nama": nama or "Tanpa nama di peta", "jenis": j}

    # Tempat ibadah per agama dicatat langsung oleh enrich_ibadah_agama.py.
    ibadah = list(csv.DictReader(IBADAH.open(encoding="utf-8-sig")))
    if [r["nama_perumahan"] for r in ibadah] != [r["nama_perumahan"] for r in baris]:
        raise SystemExit("dataset_ibadah_agama.csv tidak sejajar dengan dataset utama")
    for p, r in zip(perumahan, ibadah):
        hasil[p["id"]]["ibadah"] = {a: r[f"tujuan_ibadah_{a}"] for a in AGAMA}

    TUJUAN.write_text(json.dumps(hasil, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Ditulis  : {TUJUAN.relative_to(AKAR)}, {len(hasil)} perumahan")
    for f in OSM:
        print(f"{f:8} :", dict(Counter(v[f]["jenis"] for v in hasil.values() if f in v).most_common()))
    if gagal:
        print(f"Tidak cocok ({len(gagal)}):", ", ".join(gagal))


if __name__ == "__main__":
    jalankan()
