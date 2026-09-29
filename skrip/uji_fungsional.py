# -*- coding: utf-8 -*-
"""
uji_fungsional.py — pengujian black-box sistem WebGIS lewat peramban sungguhan.

Skenario U1–U6 mengikuti Tabel 3.5 naskah. U7 ke atas menguji fitur panel admin yang
dibangun setelah tabel itu disusun: dashboard, pencarian, pengurutan, halaman tabel,
tambah, edit, hapus, pulihkan, bobot tambahan, dan keamanan. Setiap skenario dijalankan
lewat antarmuka: mengisi formulir, menekan tombol, lalu membaca yang tampil di layar.
Harapan hasil dihitung terpisah dari dataset, bukan disalin dari keluaran sistem.

Data disimpan di Neon (PostgreSQL + PostGIS). Pengujian hanya berjalan bila belum ada
perubahan admin, supaya data sungguhan tidak tertimpa. Setiap perubahan uji dikembalikan
lewat antarmuka, lalu catatan riwayat uji dihapus di akhir (skrip/bersihkan-riwayat-uji.mjs).

Skenario tambah perumahan memanggil TomTom (24 permintaan) dan Google (6 permintaan).

Syarat: server berjalan (npx next start -p 3123), Microsoft Edge terpasang.
Pakai:  python skrip/uji_fungsional.py
Keluaran:
  ../fix/03-hasil-pengujian/hasil_uji_fungsional.json
  ../fix/05-gambar-naskah/tangkapan-2026-09-29-google/*.png

Dewi Nur Ayundari (1462300065) — Teknik Informatika Untag Surabaya
"""
from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from playwright.sync_api import sync_playwright

AKAR = Path(__file__).resolve().parent.parent          # webgis/
INDUK = AKAR.parent                                     # d:/pengujian
BASE = "http://localhost:3123"
GAMBAR = INDUK / "fix" / "05-gambar-naskah" / "tangkapan-2026-09-29-google"
HASIL = INDUK / "fix" / "03-hasil-pengujian" / "hasil_uji_fungsional.json"

sys.path.insert(0, str(INDUK / "pengujian_metode"))
from mcdm import peringkat, topsis  # noqa: E402

env = (AKAR / ".env.local").read_text(encoding="utf-8")
NAMA = re.search(r"^ADMIN_USERNAME=(\S+)", env, re.M).group(1)
SANDI = re.search(r"^ADMIN_PASSWORD=(\S+)", env, re.M).group(1)

# ------------------------------------------------------------------ harapan dari dataset
rows = list(csv.DictReader(open(INDUK / "dataset_google_motor_mobil.csv", encoding="utf-8-sig")))
W = np.array([0.207, 0.240, 0.164, 0.119, 0.270])
B = np.array([True, True, False, False, False])


def lima_besar(moda: str, kec: str | None = None) -> list[str]:
    rr = [r for r in rows if kec is None or r["kecamatan"].lower() == kec.lower()]
    X = np.array([[float(r["luas_bangunan_m2"]), float(r["luas_lahan_m2"])]
                  + [float(r["waktu_%s_%s_g_s" % (j, moda)]) for j in ("sekolah", "pasar", "faskes")] for r in rr])
    rk = peringkat(topsis(X, W, B)["skor"])
    return [rr[i]["nama_perumahan"].lower() for i in np.argsort(rk)[:5]]


SOOKO = sum(1 for r in rows if r["kecamatan"].lower() == "sooko")
HARGA_MIN = min(int(float(r["harga"])) for r in rows)
hasil: list[dict] = []


def catat(kode, use_case, skenario, harapan, teramati, lolos):
    hasil.append({"kode": kode, "use_case": use_case, "skenario": skenario, "harapan": harapan,
                  "teramati": teramati, "status": "Sesuai" if lolos else "Tidak sesuai"})
    print("[%s] %-6s %s — %s" % ("OK" if lolos else "GAGAL", kode, skenario, teramati), flush=True)


def penanda(halaman) -> dict[int, str]:
    """Peringkat -> nama, dibaca dari atribut judul penanda di peta."""
    halaman.wait_for_selector(".leaflet-marker-icon", timeout=20000)
    halaman.wait_for_timeout(800)
    out = {}
    for t in halaman.locator(".leaflet-marker-icon").evaluate_all("els => els.map(e => e.getAttribute('title'))"):
        m = re.match(r"(.+), peringkat (\d+)$", t or "")
        if m:
            out[int(m.group(2))] = m.group(1).lower()
    return out


def foto(halaman, nama, penuh=False):
    GAMBAR.mkdir(parents=True, exist_ok=True)
    halaman.wait_for_timeout(1200)
    halaman.screenshot(path=str(GAMBAR / nama), full_page=penuh)


def status_tampil(halaman, teks, batas=15000):
    halaman.wait_for_selector("[role=status]:has-text('%s')" % teks, timeout=batas)


def baris(halaman, nama):
    return halaman.locator("tbody tr", has_text=nama).first


import requests  # noqa: E402

awal = requests.get(BASE + "/api/perubahan", timeout=30).json()
if awal["perumahan"] or awal["nonaktif"] or awal["tambahan"] or awal["bobotTambahan"]:
    sys.exit("[BERHENTI] basis data sudah berisi perubahan admin; pengujian tidak dijalankan "
             "supaya data itu tidak tertimpa.")
MULAI = datetime.now(timezone.utc).isoformat()

try:
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel="msedge", headless=True)
        ctx = br.new_context(viewport={"width": 1366, "height": 860}, locale="id-ID")
        pg = ctx.new_page()
        pub = ctx.new_page()

        # ---------------- U1 login
        pg.goto(BASE + "/admin/perumahan")
        catat("U1-a", "Login (Admin)", "Membuka panel admin tanpa login",
              "Dialihkan ke halaman login", "Terbuka: " + pg.url.replace(BASE, ""), pg.url.endswith("/admin/login"))
        pg.fill("#nama", NAMA)
        pg.fill("#sandi", "salah-sekali")
        pg.click("button[type=submit]")
        pg.wait_for_selector("text=Nama pengguna atau kata sandi salah.")
        foto(pg, "u1-login-gagal.png")
        catat("U1-b", "Login (Admin)", "Login dengan kata sandi salah",
              "Ditolak dengan pesan kesalahan", "Tampil pesan 'Nama pengguna atau kata sandi salah.'",
              pg.url.endswith("/admin/login"))
        pg.fill("#sandi", SANDI)
        pg.click("button[type=submit]")
        pg.wait_for_url(BASE + "/admin", timeout=15000)
        catat("U1-c", "Login (Admin)", "Login dengan kredensial benar",
              "Masuk ke dashboard admin", "Terbuka: " + pg.url.replace(BASE, ""), pg.url == BASE + "/admin")

        # ---------------- U7 dashboard
        teks = pg.inner_text("main")
        foto(pg, "u7-dashboard.png", penuh=True)
        ok = "Perumahan aktif" in teks and "84" in teks and "Lima besar saat ini" in teks and "Garden Mansion" in teks
        catat("U7", "Dashboard (Admin)", "Membuka dashboard",
              "Ringkasan 84 perumahan dan lima besar tampil", "Ringkasan dan lima besar tampil" if ok else teks[:100], ok)

        # ---------------- U6 meninjau data
        pg.goto(BASE + "/admin/perumahan")
        pg.wait_for_selector("text=Menampilkan 1–10 dari 84 perumahan")
        n_baris = pg.locator("tbody tr").count()
        foto(pg, "u6-admin-perumahan.png", penuh=True)
        catat("U6-a", "Meninjau data (Admin)", "Membuka daftar perumahan",
              "84 perumahan, 10 per halaman", "Tertulis 1–10 dari 84, %d baris" % n_baris, n_baris == 10)
        pg.goto(BASE + "/admin/fasilitas")
        teks = pg.inner_text("main")
        foto(pg, "u6-admin-fasilitas.png")
        ok = all(x in teks for x in ("1.466", "180", "446", "276"))
        catat("U6-b", "Meninjau data (Admin)", "Membuka data fasilitas",
              "Jumlah titik sama dengan Tabel 4.1", "1.466; 180; 446; 276" if ok else teks[:100], ok)
        pg.goto(BASE + "/admin/kriteria")
        teks = pg.inner_text("main")
        foto(pg, "u6-admin-kriteria.png", penuh=True)
        ok = all(x in teks for x in ("0,2070", "0,2400", "0,1640", "0,1190", "0,2700"))
        catat("U6-c", "Meninjau data (Admin)", "Membuka kriteria dan bobot",
              "Bobot inti sama dengan Tabel 4.5", "0,2070; 0,2400; 0,1640; 0,1190; 0,2700" if ok else teks[:100], ok)

        # ---------------- U8 cari, urut, halaman
        pg.goto(BASE + "/admin/perumahan")
        pg.fill("#cari", "Sooko")
        pg.wait_for_timeout(300)
        ok = pg.locator("text=dari %d perumahan" % SOOKO).count() > 0
        catat("U8-a", "Kelola data (Admin)", "Mencari kata Sooko",
              "%d perumahan Kecamatan Sooko" % SOOKO, "Tertulis %d perumahan" % SOOKO if ok else "Jumlah tidak cocok", ok)
        pg.fill("#cari", "")
        pg.click("th button:has-text('Harga')")
        pg.wait_for_timeout(300)
        sel = pg.locator("tbody tr").first.locator("td").nth(5).inner_text()
        ok = int(re.sub(r"[^0-9]", "", sel)) == HARGA_MIN
        catat("U8-b", "Kelola data (Admin)", "Mengurutkan kolom harga",
              "Harga termurah di baris pertama", "Baris pertama " + sel.replace("\xa0", " "), ok)
        pg.click("th button:has-text('Rk')")
        pg.click("nav[aria-label='Halaman tabel'] button:has-text('Berikutnya')")
        pg.wait_for_timeout(300)
        ok = pg.locator("text=Menampilkan 11–20 dari 84 perumahan").count() > 0
        catat("U8-c", "Kelola data (Admin)", "Pindah ke halaman berikutnya",
              "Baris 11–20 tampil", "Tertulis 11–20 dari 84" if ok else "Tidak berpindah", ok)

        # ---------------- U2–U5 halaman publik
        pub.goto(BASE + "/cari")
        pm = penanda(pub)
        foto(pub, "u2-cari-motor.png")
        catat("U2", "Melihat peta sebaran", "Membuka halaman peta",
              "84 titik perumahan tampil", "%d penanda tampil" % len(pm), len(pm) == 84)
        dapat = [pm[i] for i in range(1, 6)]
        catat("U4-a", "Melihat rekomendasi", "Lima besar moda sepeda motor",
              "Sama dengan Tabel 4.7", "; ".join(d.title() for d in dapat), dapat == lima_besar("motor"))
        pub.click("button:has-text('Mobil')")
        pub.wait_for_timeout(1200)
        pmb = penanda(pub)
        foto(pub, "u4-cari-mobil.png")
        dapat_m = [pmb[i] for i in range(1, 6)]
        catat("U4-b", "Melihat rekomendasi", "Mengganti moda ke mobil",
              "Lima besar mengikuti waktu tempuh mobil", "; ".join(d.title() for d in dapat_m), dapat_m == lima_besar("mobil"))
        pub.click("button:has-text('Sepeda motor')")
        pub.select_option("#kecamatan", label="Sooko")
        pub.wait_for_timeout(1200)
        pk = penanda(pub)
        foto(pub, "u3-filter-sooko.png")
        ok = len(pk) == SOOKO and [pk[i] for i in range(1, 6)] == lima_besar("motor", "Sooko")
        catat("U3", "Filter wilayah", "Memilih Kecamatan Sooko",
              "Hanya %d perumahan Sooko yang diperingkatkan" % SOOKO, "%d penanda, lima besar sesuai: %s" % (len(pk), ok), ok)
        pub.select_option("#kecamatan", index=0)
        pub.wait_for_timeout(800)
        pub.click("a:has-text('Lihat rincian')")
        pub.wait_for_url("**/perumahan/**", timeout=15000)
        teks = pub.inner_text("main")
        foto(pub, "u5-rincian.png", penuh=True)
        ok = "Garden Mansion" in teks and "0,8518" in teks
        catat("U5-a", "Melihat detail perumahan", "Membuka rincian peringkat pertama",
              "Rincian Garden Mansion, skor 0,8518", "Judul dan skor tampil" if ok else teks[:100], ok)
        r = pub.goto(BASE + "/perumahan/tidak-ada")
        catat("U5-b", "Melihat detail perumahan", "Membuka alamat perumahan yang tidak ada",
              "Halaman tidak ditemukan (404)", "Kode %d" % r.status, r.status == 404)

        # ---------------- U9 edit lewat formulir
        pg.goto(BASE + "/admin/perumahan")
        pg.fill("#cari", "Garden Mansion")
        baris(pg, "Garden Mansion").locator("button:has-text('Edit')").click()
        pg.fill("#f-luasBangunan", "0")
        pg.click("dialog[open] button[type=submit]")
        ok = pg.locator("#g-luasBangunan").count() == 1
        foto(pg, "u9-form-edit.png")
        catat("U9-a", "Kelola data (Admin)", "Menyimpan luas bangunan 0 m²",
              "Ditolak dengan pesan", "Tampil pesan pada kolom luas bangunan" if ok else "Tidak ada pesan", ok)
        pg.fill("#f-luasBangunan", "40")
        pg.click("dialog[open] button[type=submit]")
        status_tampil(pg, "Tersimpan.")
        pub.goto(BASE + "/perumahan/garden-mansion")
        ok = "40 m²" in pub.inner_text("main")
        catat("U9-b", "Kelola data (Admin)", "Menyimpan luas bangunan 40 m²",
              "Tersimpan dan tampil di halaman rincian", "Rincian menampilkan 40 m²" if ok else "Nilai lama masih tampil", ok)
        baris(pg, "Garden Mansion").locator("button:has-text('Edit')").click()
        pg.click("dialog[open] button:has-text('Kembalikan ke data penelitian')")
        status_tampil(pg, "Kembali ke data penelitian")
        pub.goto(BASE + "/perumahan/garden-mansion")
        ok = "36 m²" in pub.inner_text("main")
        catat("U9-c", "Kelola data (Admin)", "Mengembalikan ke data penelitian",
              "Luas kembali 36 m²", "Rincian menampilkan 36 m²" if ok else "Nilai belum kembali", ok)

        # ---------------- U10 hapus dan pulihkan
        baris(pg, "Garden Mansion").locator("button:has-text('Hapus')").click()
        pg.click("dialog[open] button:has-text('Ya, hapus')")
        status_tampil(pg, "Dihapus.")
        pub.goto(BASE + "/cari")
        pn = penanda(pub)
        r = pub.goto(BASE + "/perumahan/garden-mansion")
        ok = len(pn) == 83 and "garden mansion" not in pn.values() and r.status == 404
        catat("U10-a", "Kelola data (Admin)", "Menghapus satu perumahan",
              "Hilang dari peta dan peringkat", "%d penanda, rincian kode %d" % (len(pn), r.status), ok)
        pg.select_option("#saring", "dihapus")
        baris(pg, "Garden Mansion").locator("button:has-text('Pulihkan')").click()
        status_tampil(pg, "Dipulihkan.")
        pub.goto(BASE + "/cari")
        ok = len(penanda(pub)) == 84
        catat("U10-b", "Kelola data (Admin)", "Memulihkan perumahan yang dihapus",
              "Kembali tampil di peta", "84 penanda" if ok else "Belum kembali", ok)

        # ---------------- U11 tambah perumahan
        pg.goto(BASE + "/admin/perumahan")
        pg.click("button:has-text('+ Tambah perumahan')")
        pg.fill("#f-nama", "Perumahan Uji Coba")
        pg.select_option("#f-kecamatan", "Sooko")
        pg.fill("#f-harga", "166000000")
        pg.fill("#f-luasBangunan", "30")
        pg.fill("#f-luasLahan", "60")
        pg.fill("#f-latitude", "-7,9")
        pg.fill("#f-longitude", "112,45")
        pg.click("dialog[open] button[type=submit]")
        ok = pg.locator("#g-latitude").count() == 1
        catat("U11-a", "Kelola data (Admin)", "Menambah perumahan dengan koordinat di luar kabupaten",
              "Ditolak dengan pesan", "Tampil pesan pada kolom lintang" if ok else "Tidak ditolak", ok)
        pg.fill("#f-latitude", "-7.48600, 112.43500")   # tempel gaya Google Maps
        foto(pg, "u11-form-tambah.png")
        pg.click("dialog[open] button[type=submit]")
        status_tampil(pg, "ditambahkan", batas=120000)
        pub.goto(BASE + "/cari")
        pn = penanda(pub)
        r = pub.goto(BASE + "/perumahan/perumahan-uji-coba")
        teks = pub.inner_text("main") if r.ok else ""
        ok = len(pn) == 85 and "perumahan uji coba" in pn.values() and "menit" in teks
        foto(pub, "u11-rincian-tambahan.png", penuh=True)
        catat("U11-b", "Kelola data (Admin)", "Menambah perumahan baru",
              "Waktu tempuh dihitung, tampil di peta dan rincian", "%d penanda, rincian kode %d" % (len(pn), r.status), ok)
        pg.goto(BASE + "/admin/perumahan")
        pg.fill("#cari", "Uji Coba")
        baris(pg, "Perumahan Uji Coba").locator("button:has-text('Hapus')").click()
        pg.click("dialog[open] button:has-text('Ya, hapus')")
        status_tampil(pg, "dihapus")
        pub.goto(BASE + "/cari")
        ok = len(penanda(pub)) == 84
        catat("U11-c", "Kelola data (Admin)", "Menghapus perumahan tambahan",
              "Terhapus permanen, peta kembali 84 titik", "84 penanda" if ok else "Masih ada", ok)

        # ---------------- U12 bobot tambahan
        pg.goto(BASE + "/admin/kriteria")
        item = pg.locator("li", has_text="Dekat pusat").first
        item.locator("button:has-text('Ubah')").click()
        item.locator("input").fill("0,9")
        item.locator("button:has-text('Simpan')").click()
        pg.wait_for_selector("text=Bobot harus di antara")
        item.locator("input").fill("0,2")
        item.locator("button:has-text('Simpan')").click()
        pg.wait_for_selector("text=Tersimpan.")
        isi = pg.request.get(BASE + "/api/perubahan").json()
        ok = abs(isi["bobotTambahan"].get("pusatKab", 0) - 0.2) < 1e-9
        catat("U12", "Kelola data (Admin)", "Mengubah bobot kriteria tambahan",
              "Nilai 0,9 ditolak, 0,2 tersimpan", "0,9 ditolak; tersimpan %s" % isi["bobotTambahan"], ok)
        pg.request.put(BASE + "/api/admin/kriteria", data={"kunci": "pusatKab", "bobot": None})
        pg.goto(BASE + "/admin")
        foto(pg, "u7-dashboard-riwayat.png", penuh=True)

        # ---------------- U13 API tanpa sesi
        anon = pw.request.new_context()
        r = anon.post(BASE + "/api/admin/perumahan", data={"nama": "Tanpa login"})
        catat("U13", "Keamanan", "Menambah data lewat API tanpa login",
              "Ditolak (401)", "Kode %d" % r.status, r.status == 401)

        # ---------------- U14 keluar
        pg.goto(BASE + "/admin/perumahan")
        pg.click("a:has-text('Keluar')")
        pg.wait_for_url("**/admin/login**")
        pg.goto(BASE + "/admin")
        catat("U14", "Logout (Admin)", "Keluar lalu membuka panel lagi",
              "Dialihkan ke halaman login", "Terbuka: " + pg.url.replace(BASE, ""), pg.url.endswith("/admin/login"))

        # ---------------- tangkapan layar tambahan untuk naskah
        pg.goto(BASE + "/admin/login")
        foto(pg, "login.png")
        for alamat, nama in (("/", "beranda.png"), ("/cara-kerja", "cara-kerja.png")):
            pub.goto(BASE + alamat)
            foto(pub, nama)
        br.close()
finally:
    subprocess.run(["node", "skrip/bersihkan-riwayat-uji.mjs", MULAI], cwd=AKAR, check=False)

HASIL.parent.mkdir(parents=True, exist_ok=True)
json.dump({"tanggal": datetime.now().isoformat(timespec="seconds"), "alamat": BASE,
           "peramban": "Microsoft Edge (Playwright, tanpa tampilan)", "skenario": hasil},
          open(HASIL, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
lolos = sum(1 for h in hasil if h["status"] == "Sesuai")
print("\n%d dari %d skenario sesuai. Hasil: %s" % (lolos, len(hasil), HASIL))
