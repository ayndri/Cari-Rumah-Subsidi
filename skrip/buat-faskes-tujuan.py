# -*- coding: utf-8 -*-
"""
buat-faskes-tujuan.py — Nama dan jenis fasilitas kesehatan tujuan tiap perumahan.

    python skrip/buat-faskes-tujuan.py

Kriteria "dekat fasilitas kesehatan" memakai faskes TERCEPAT dari delapan kandidat
terdekat, apa pun jenisnya: puskesmas, pustu, klinik, rumah sakit, bidan, atau apotek.
Titik di cache penelitian hanya berisi koordinat, jadi jenisnya dibaca dari tag
OpenStreetMap yang diambil ulang 30 September 2026 (cache_faskes_osm.json).

Cara menemukan tujuannya: dari cache TomTom (sepeda motor, lengang), dicari kandidat
yang jarak dan waktunya sama persis dengan kolom waktu_faskes_motor_lengang_s pada
dataset. Rute Google memakai tujuan yang sama (lihat buat_dataset_google.py).

Titik yang tercatat sebagai laboratorium atau apotek dan berjarak kurang dari 150 m
dari sebuah rumah sakit dianggap bagian rumah sakit itu. Contohnya "Instalasi
Laboratorium" yang berada 65 m dari RS Dian Husada.

Keluaran: src/data/faskes-tujuan.json, { id perumahan: { nama, jenis } }.
"""
from __future__ import annotations

import csv
import json
import math
from collections import Counter
from pathlib import Path

DIR = Path(__file__).resolve().parent
AKAR = DIR.parent
INDUK = AKAR.parent
DATASET = INDUK / "dataset_google_motor_mobil.csv"
CACHE_TOMTOM = INDUK / "cache_tomtom_motor.json"
TITIK = INDUK / "pengujian_metode" / "cache_titik_fasilitas.json"
OSM = INDUK / "pengujian_metode" / "cache_faskes_osm.json"
PERUMAHAN = AKAR / "src" / "data" / "perumahan.json"
TUJUAN = AKAR / "src" / "data" / "faskes-tujuan.json"

BATAS_COCOK_M = 40
BATAS_BAGIAN_RS_M = 150


def jarak_m(a, b):
    f1, f2 = math.radians(a[0]), math.radians(b[0])
    df, dl = f2 - f1, math.radians(b[1] - a[1])
    h = math.sin(df / 2) ** 2 + math.cos(f1) * math.cos(f2) * math.sin(dl / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def koordinat(e):
    return (e["lat"], e["lon"]) if "lat" in e else (e["center"]["lat"], e["center"]["lon"])


def jenis(tag: dict) -> str:
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


def jalankan() -> None:
    osm = [e for e in json.loads(OSM.read_text(encoding="utf-8"))["elements"] if e.get("tags")]
    rs = [e for e in osm if jenis(e["tags"]) == "Rumah sakit" and e["tags"].get("name")]
    cache = json.loads(CACHE_TOMTOM.read_text(encoding="utf-8"))
    titik = {"%.6f,%.6f" % tuple(t) for t in json.loads(TITIK.read_text(encoding="utf-8"))["titik"]["faskes"]}
    # perumahan.json disusun dari dataset yang sama dengan urutan baris yang sama;
    # beberapa perumahan berbagi koordinat, jadi dicocokkan per baris, bukan per titik.
    perumahan = json.loads(PERUMAHAN.read_text(encoding="utf-8"))
    baris = list(csv.DictReader(DATASET.open(encoding="utf-8-sig")))
    if len(perumahan) != len(baris):
        raise SystemExit("perumahan.json dan dataset beda jumlah baris; jalankan buat-data.py dulu")

    hasil, gagal = {}, []
    for p, r in zip(perumahan, baris):
        asal = "%.6f,%.6f" % (float(r["latitude"]), float(r["longitude"]))
        sama = (p["latitude"], p["longitude"]) == (float(r["latitude"]), float(r["longitude"]))
        id_ = p["id"] if sama else None
        jr, wl = float(r["jarak_faskes_motor_lengang_m"]), float(r["waktu_faskes_motor_lengang_s"])
        cocok = [k.split("|")[1] for k, v in cache.items()
                 if k.startswith(asal + "|") and k.split("|")[1] in titik
                 and abs(v["jarak"] - jr) < 1 and abs(v["lengang"] - wl) < 1]
        if not id_ or not cocok:
            gagal.append(r["nama_perumahan"])
            continue
        tujuan = tuple(map(float, cocok[0].split(",")))
        e = min(osm, key=lambda x: jarak_m(tujuan, koordinat(x)))
        if jarak_m(tujuan, koordinat(e)) > BATAS_COCOK_M:
            gagal.append(r["nama_perumahan"])
            continue
        j, nama = jenis(e["tags"]), e["tags"].get("name", "").strip()
        if j in ("Laboratorium", "Apotek"):
            induk = min(rs, key=lambda x: jarak_m(koordinat(e), koordinat(x)))
            if jarak_m(koordinat(e), koordinat(induk)) < BATAS_BAGIAN_RS_M:
                j, nama = "Rumah sakit", induk["tags"]["name"].strip()
        hasil[id_] = {"nama": nama or "Tanpa nama di peta", "jenis": j}

    TUJUAN.write_text(json.dumps(hasil, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Ditulis  : {TUJUAN.relative_to(AKAR)}, {len(hasil)} perumahan")
    print("Jenis    :", dict(Counter(v["jenis"] for v in hasil.values()).most_common()))
    if gagal:
        print(f"Tidak cocok ({len(gagal)}):", ", ".join(gagal))


if __name__ == "__main__":
    jalankan()
