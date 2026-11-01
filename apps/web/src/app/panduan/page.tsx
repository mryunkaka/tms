import type { Metadata } from 'next';

const title = 'Panduan perjalanan';
const description = 'Panduan mencari perjalanan, membuat booking, dan mengecek status booking di TMS.';

export const metadata: Metadata = {
  title: `${title} | TMS`,
  description,
  alternates: { canonical: '/panduan' },
  openGraph: { title: `${title} | TMS`, description, type: 'article' },
};

export default function GuidePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: 'id-ID',
  };

  return <main className="site-main detail-main">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <header className="detail-hero"><p className="eyebrow">Informasi penggunaan</p><h1>{title}</h1><p>Langkah singkat untuk mencari perjalanan, mengirim booking, dan melihat statusnya.</p></header>
    <div className="detail-content">
      <article className="detail-section"><h2>Cari perjalanan</h2><ol><li>Pilih destinasi atau biarkan pilihan destinasi kosong untuk melihat semua yang tersedia.</li><li>Gunakan tanggal, durasi, atau budget untuk menyaring perjalanan.</li><li>Buka detail trip untuk melihat jadwal, harga, ketersediaan kursi, dan informasi yang diisi operator.</li></ol></article>
      <article className="detail-section"><h2>Membuat booking</h2><ol><li>Pilih jadwal yang tersedia pada halaman detail trip.</li><li>Isi jumlah peserta, data peserta, dan kontak pemesan pada formulir.</li><li>Harga dan kapasitas divalidasi server. Setelah booking dibuat, simpan kode dan perhatikan batas hold yang ditampilkan.</li></ol><p>Pembayaran online belum tersedia pada tahap ini. Booking yang belum dibayar berakhir otomatis saat batas hold terlewati.</p></article>
      <article className="detail-section"><h2>Cek status booking</h2><p>Buka menu Cek booking, lalu masukkan kode booking serta email dan nomor telepon pemesan yang dipakai saat memesan. Kontak digunakan untuk verifikasi dan tidak ditampilkan pada hasil.</p></article>
      <section className="detail-section"><h2>Panduan destinasi</h2><p>TBD: diisi pemilik bisnis. Informasi lokasi dan rekomendasi perjalanan hanya akan ditampilkan setelah diverifikasi operator.</p></section>
    </div>
  </main>;
}
