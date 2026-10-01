# -*- coding: utf-8 -*-
"""
uji_halaman_uji.py — pengujian menyeluruh halaman uji penerimaan (/uji) lewat peramban sungguhan.

Tiga responden buatan menjalani seluruh alur dengan pengaturan berbeda, ditambah satu kasus
salah (kecamatan disaring). Untuk tiap responden diperiksa:
  1. Lima teratas di halaman cari (dibaca dari penanda peta) sama dengan yang ditampilkan /uji.
  2. Urutan sistem yang disimpan server sama dengan hitungan Python yang terpisah
     (fix/07-uji-penerimaan/perangkingan_web.py), bukan disalin dari keluaran website.
  3. Ekspor CSV admin dapat diolah olah_uat.py tanpa baris [PERIKSA] atau [DILEWATI].
Jawaban uji dihapus lagi di akhir, jadi tabel kembali kosong untuk responden sungguhan.

Syarat: server berjalan (npx next start -p 3123), Microsoft Edge terpasang.
Pakai:  python skrip/uji_halaman_uji.py
"""
from __future__ import annotations

import json
import random
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

AKAR = Path(__file__).resolve().parent.parent
INDUK = AKAR.parent
UAT = INDUK / "fix" / "07-uji-penerimaan"
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3123"
GAMBAR = INDUK / "fix" / "05-gambar-naskah" / "tangkapan-2026-09-29-uji"
sys.path.insert(0, str(UAT))
from perangkingan_web import peringkat  # noqa: E402

env = (AKAR / ".env.local").read_text(encoding="utf-8")
NAMA = re.search(r"^ADMIN_USERNAME=(\S+)", env, re.M).group(1)
SANDI = re.search(r"^ADMIN_PASSWORD=(\S+)", env, re.M).group(1)
KANDIDAT = json.loads((AKAR / "src" / "data" / "kandidat-uji.json").read_text(encoding="utf-8"))
ID = {k["kode"]: k["id"] for k in KANDIDAT}
KUNCI = {"Rumahnya luas": "luasBangunan", "Tanahnya luas": "luasLahan", "Dekat sekolah": "sekolah",
         "Dekat pasar": "pasar", "Dekat fasilitas kesehatan": "faskes", "Dekat pusat kabupaten": "pusatKab",
         "Halamannya lega": "halaman", "Dekat tempat ibadah": "ibadah"}
LABEL = {"abaikan": "Tidak penting", "penting": "Penting", "paling": "Paling penting"}

RESPONDEN = [
    {"nama": "UJI-OTOMATIS-1", "moda": "Sepeda motor", "ubah": {}},
    {"nama": "UJI-OTOMATIS-2", "moda": "Mobil",
     "ubah": {"Dekat fasilitas kesehatan": "paling", "Dekat pasar": "abaikan", "Dekat tempat ibadah": "penting"}},
    {"nama": "UJI-OTOMATIS-3", "moda": "Sepeda motor",
     "ubah": {"Tanahnya luas": "paling", "Rumahnya luas": "paling", "Halamannya lega": "penting",
              "Dekat pusat kabupaten": "penting"}},
]

hasil: list[tuple[str, bool, str]] = []


def catat(nama, lolos, ket=""):
    hasil.append((nama, lolos, ket))
    print("[%s] %s %s" % ("OK" if lolos else "GAGAL", nama, ket), flush=True)


def lima_peta(pg) -> list[str]:
    pg.wait_for_selector(".leaflet-marker-icon", timeout=20000)
    pg.wait_for_timeout(900)
    out = {}
    for t in pg.locator(".leaflet-marker-icon").evaluate_all("els => els.map(e => e.getAttribute('title'))"):
        m = re.match(r"(.+), peringkat (\d+)$", t or "")
        if m:
            out[int(m.group(2))] = m.group(1)
    return [out[i] for i in range(1, 6)]


def isi_identitas(pg, nama):
    pg.goto(BASE + "/uji")
    pg.fill("#nama", nama)
    pg.fill("#pekerjaan", "Pengujian otomatis")
    for teks in ("25–34 tahun", "Belum", "Ya, sedang mencari", "Belum pernah"):
        pg.locator("label", has_text=re.compile("^" + re.escape(teks) + "$")).first.click()
    pg.locator("label:has-text('Saya bersedia')").click()
    pg.click("button:has-text('Mulai Bagian A')")


def urutkan(pg, urutan):
    for kode in urutan:
        pg.locator(f"button[aria-label^='Perumahan {kode},']").click()
    pg.click("button:has-text('Urutan sudah pas')")
    pg.wait_for_url("**/cari")


def atur_cari(pg, r):
    pg.wait_for_selector("text=Uji coba, Bagian B.")
    pg.click(f"button:has-text('{r['moda']}')")
    if any(k in r["ubah"] for k in ("Dekat pusat kabupaten", "Halamannya lega", "Dekat tempat ibadah")):
        pg.click("summary:has-text('Tambah hal lain')")
    for nama, t in r["ubah"].items():
        pg.locator("li", has=pg.locator(f"p:text-is('{nama}')")).locator(f"button:text-is('{LABEL[t]}')").click()


def tingkat_dari(r):
    t = {k: ("penting" if k in ("luasBangunan", "luasLahan", "sekolah", "pasar", "faskes") else "abaikan")
         for k in KUNCI.values()}
    for nama, v in r["ubah"].items():
        t[KUNCI[nama]] = v
    return t


def nilai_c(pg):
    for i in range(1, 11):
        pg.locator(f"input[aria-label='{i}: {random.randint(1, 5)}']").check(force=True)
    for i in range(1, 4):
        pg.locator(f"input[aria-label='R{i}: {random.randint(1, 5)}']").check(force=True)
    pg.click("button:has-text('Kirim jawaban')")
    pg.wait_for_selector("text=Terima kasih, jawabanmu sudah tersimpan.", timeout=20000)


random.seed(20260929)
GAMBAR.mkdir(parents=True, exist_ok=True)
id_uji: list[int] = []
with sync_playwright() as pw:
    br = pw.chromium.launch(channel="msedge", headless=True)

    for n, r in enumerate(RESPONDEN):
        ctx = br.new_context(viewport={"width": 1366, "height": 860}, locale="id-ID")
        pg = ctx.new_page()
        urutan = list(ID)
        random.shuffle(urutan)
        isi_identitas(pg, r["nama"])
        if n == 0:
            pg.screenshot(path=str(GAMBAR / "uji-bagian-a.png"), full_page=False)
        urutkan(pg, urutan)
        atur_cari(pg, r)
        dilihat = lima_peta(pg)
        if n == 1:
            pg.screenshot(path=str(GAMBAR / "uji-bagian-b-cari.png"))
        pg.click("a:has-text('Sudah, lanjut ke Bagian C')")
        pg.wait_for_selector("text=Ini pengaturan terakhirmu?")
        cek = pg.locator("ol.list-decimal li").all_inner_texts()
        catat(f"{r['nama']} lima teratas /cari = /uji", cek == dilihat, f"{dilihat}")

        py = peringkat("motor" if r["moda"] == "Sepeda motor" else "mobil", tingkat_dari(r))
        nama_py = [p["nama"] for p in py[:5]]
        catat(f"{r['nama']} lima teratas /cari = Python", [x.lower() for x in dilihat] == [x.lower() for x in nama_py],
              f"{nama_py}")
        pg.click("button:has-text('Benar, lanjut ke Bagian C')")
        nilai_c(pg)
        id_uji.append(int(re.search(r"Nomor jawaban: (\d+)", pg.inner_text("main")).group(1)))
        ctx.close()

    # Kasus salah: kecamatan disaring, Bagian B tidak boleh diteruskan.
    ctx = br.new_context(viewport={"width": 390, "height": 844}, locale="id-ID", is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    isi_identitas(pg, "UJI-OTOMATIS-SALAH")
    urutkan(pg, list(ID))
    pg.select_option("#kecamatan", "Sooko")
    pg.click("a:has-text('Sudah, lanjut ke Bagian C')")
    pg.wait_for_selector("text=Ini pengaturan terakhirmu?")
    pg.screenshot(path=str(GAMBAR / "uji-bagian-b-salah-hp.png"), full_page=True)
    tombol = pg.locator("button:has-text('Benar, lanjut ke Bagian C')")
    catat("Kecamatan disaring ditolak", tombol.is_disabled() and pg.locator("text=Kecamatan masih Sooko").count() == 1)
    pg.click("button:has-text('Kembali ke pencarian')")
    pg.wait_for_url("**/cari")
    pg.select_option("#kecamatan", "Semua Kecamatan")
    pg.click("a:has-text('Sudah, lanjut ke Bagian C')")
    pg.wait_for_selector("text=Ini pengaturan terakhirmu?")
    catat("Setelah dibetulkan boleh lanjut", pg.locator("button:has-text('Benar, lanjut ke Bagian C')").is_enabled())
    pg.click("button:has-text('Benar, lanjut ke Bagian C')")
    pg.screenshot(path=str(GAMBAR / "uji-bagian-c-hp.png"))
    nilai_c(pg)
    id_uji.append(int(re.search(r"Nomor jawaban: (\d+)", pg.inner_text("main")).group(1)))
    ctx.close()

    # Kiriman tanpa login dan kiriman rusak.
    anon = pw.request.new_context()
    catat("Ekspor tanpa login ditolak", anon.get(BASE + "/api/admin/uji?format=csv").status == 401)
    catat("Kiriman rusak ditolak", anon.post(BASE + "/api/uji", data={"setuju": True}).status == 400)

    # Admin: unduh CSV, olah dengan olah_uat.py, lalu hapus jawaban uji.
    ctx = br.new_context(viewport={"width": 1366, "height": 860}, locale="id-ID")
    pg = ctx.new_page()
    pg.goto(BASE + "/admin/login")
    pg.fill("#nama", NAMA)
    pg.fill("#sandi", SANDI)
    pg.click("button[type=submit]")
    pg.wait_for_url(BASE + "/admin", timeout=15000)
    pg.goto(BASE + "/admin/uji")
    pg.screenshot(path=str(GAMBAR / "uji-admin.png"), full_page=True)
    catat("Admin menampilkan semua jawaban uji", all(pg.locator(f"tbody td:first-child:text-is('{i}')").count() == 1 for i in id_uji))
    catat("Admin: layar = server", pg.locator("td:text-is('Periksa')").count() == 0)
    csv = pg.request.get(BASE + "/api/admin/uji?format=csv").text()
    jalur = Path(sys.argv[2]) if len(sys.argv) > 2 else AKAR / ".next" / "uji-ekspor.csv"
    jalur.write_text(csv, encoding="utf-8")
    keluar = subprocess.run([sys.executable, "olah_uat.py", str(jalur)], cwd=UAT, capture_output=True, text=True,
                            encoding="utf-8")
    ring = json.loads((UAT / "hasil_uat.json").read_text(encoding="utf-8"))["ringkasan"]
    (UAT / "hasil_uat.json").unlink()  # hasil dari responden buatan tidak boleh tertinggal
    catat("olah_uat.py mengolah semua baris", ring["n"] == len(id_uji) and ring["dilewati"] == 0, f"n={ring['n']}")
    catat("Urutan sistem website = Python", ring["urutan_sistem_cocok_dengan_website"] == len(id_uji))
    catat("Peringkat 1 website = Python", ring["peringkat1_cocok_dengan_layar"] == len(id_uji))
    catat("Tanpa [PERIKSA]/[DILEWATI]", "[PERIKSA]" not in keluar.stdout and "[DILEWATI]" not in keluar.stdout,
          keluar.stdout[-300:] if "[PERIKSA]" in keluar.stdout else "")

    pg.on("dialog", lambda d: d.accept())
    for i in id_uji:
        pg.locator("tbody tr", has=pg.locator(f"td:first-child:text-is('{i}')")).locator("button:has-text('Hapus')").click()
        pg.wait_for_timeout(1200)
    pg.goto(BASE + "/admin/uji")
    catat("Jawaban uji terhapus", pg.locator("text=Belum ada jawaban.").count() == 1)
    br.close()

lolos = sum(1 for _, ok, _ in hasil if ok)
print(f"\n{lolos}/{len(hasil)} lolos")
sys.exit(0 if lolos == len(hasil) else 1)
