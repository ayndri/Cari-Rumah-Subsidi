/**
 * Potongan peta OpenStreetMap statis yang berpusat di satu titik.
 *
 * Dipakai sebagai gambar kartu perumahan di halaman pembuka, menggantikan foto.
 * Foto rumah subsidi yang ada bukan foto perumahan tertentu, jadi tidak boleh
 * ditempel ke nama perumahan (lihat DESIGN.md). Peta lokasinya sendiri jujur:
 * memang itu letak perumahannya.
 *
 * Tidak memuat Leaflet. Petaknya dihitung di server lalu disusun sebagai gambar
 * biasa, jadi kartu tetap ringan dan tidak butuh JavaScript. Petaknya diambil
 * dari tile.openstreetmap.org, sedikit dan malas-muat, sesuai kebijakan
 * pemakaiannya, dan atribusinya wajib tampil.
 */

const UKURAN_PETAK = 256;
// Lebih lebar dari kartu mana pun, supaya petak menutup penuh sampai tepi.
const LEBAR = 640;
const TINGGI = 260;

function kePiksel(lat: number, lon: number, zoom: number) {
  const skala = UKURAN_PETAK * 2 ** zoom;
  const x = ((lon + 180) / 360) * skala;
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * skala;
  return { x, y };
}

export default function PetaMini({
  latitude,
  longitude,
  zoom = 15,
  className = "",
}: {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
}) {
  const { x, y } = kePiksel(latitude, longitude, zoom);
  const kiri = Math.floor((x - LEBAR / 2) / UKURAN_PETAK);
  const kanan = Math.floor((x + LEBAR / 2) / UKURAN_PETAK);
  const atas = Math.floor((y - TINGGI / 2) / UKURAN_PETAK);
  const bawah = Math.floor((y + TINGGI / 2) / UKURAN_PETAK);

  const petak: { tx: number; ty: number }[] = [];
  for (let tx = kiri; tx <= kanan; tx++) for (let ty = atas; ty <= bawah; ty++) petak.push({ tx, ty });

  return (
    <div aria-hidden className={`relative overflow-hidden bg-permukaan-2 ${className}`}>
      {/* Titik perumahan selalu di tengah kotak, apa pun lebar kartunya. */}
      <div className="absolute top-1/2 left-1/2">
        {petak.map(({ tx, ty }) => (
          // eslint-disable-next-line @next/next/no-img-element -- petak peta eksternal, sudah berukuran tetap 256px
          <img
            key={`${tx}-${ty}`}
            src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`}
            alt=""
            width={UKURAN_PETAK}
            height={UKURAN_PETAK}
            loading="lazy"
            decoding="async"
            className="absolute max-w-none select-none"
            style={{ left: tx * UKURAN_PETAK - x, top: ty * UKURAN_PETAK - y }}
          />
        ))}
        <span className="absolute -top-[11px] -left-[11px] block h-[22px] w-[22px] rounded-full border-[3px] border-permukaan bg-hutan" />
      </div>
      <span className="absolute right-0 bottom-0 bg-permukaan/90 px-1.5 py-0.5 text-[11px] text-teks-redup">
        © OpenStreetMap
      </span>
    </div>
  );
}
