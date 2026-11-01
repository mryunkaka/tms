# Design Brief

## Tujuan dan nada merek

Membantu wisatawan menemukan dan membandingkan perjalanan ke berbagai daerah yang dikelola satu operator, lalu memesan dengan rasa aman. Kotabaru adalah daerah awal. Nada Bahasa Indonesia yang ramah, jelas, lokal, dan praktis. Jangan menyatakan fakta destinasi yang belum disahkan operator; tandai `TBD: diisi pemilik bisnis` pada konten internal sampai bahan tersedia.

**ASUMSI visual:** identitas warna belum tersedia; token berikut adalah titik awal netral yang dapat diganti setelah aset/brand guide localway.id diverifikasi. Jangan memakai logo atau foto akun Instagram tanpa hak dan persetujuan.

## Pengguna dan prinsip UX

Target utama customer menggunakan ponsel dengan koneksi bervariasi; admin mengelola jadwal, pembayaran, manifest di desktop maupun ponsel.

- Mobile-first; harga, tanggal, ketersediaan, dan tindakan booking mudah ditemukan.
- Satu langkah memiliki satu keputusan utama; tampilkan total biaya sebelum konfirmasi.
- Status booking dan pembayaran memakai label teks, tidak hanya warna.
- Tahan kuota dengan jelas dan tampilkan waktu kedaluwarsa pembayaran.
- Hindari form panjang: data pemesan dan peserta dijelaskan, validasi dekat field.
- Konten, error, mata uang, tanggal dan instruksi dalam Bahasa Indonesia.

## Design tokens (proposal awal)

Warna CSS HSL compatible Tailwind; verifikasi contrast ratio WCAG AA sebelum implementasi. Dark mode untuk browsing opsional, tetapi form dan panel admin menghormati preferensi sistem.

| Token | Nilai awal | Penggunaan |
|---|---|---|
| Primary | `#0B6E69` | Tombol utama, tautan aksi |
| Primary foreground | `#FFFFFF` | Teks pada primary |
| Accent | `#E5A23B` | Harga/penanda perhatian, bukan status saja |
| Background | `#F7F8F6` | Latar halaman |
| Surface | `#FFFFFF` | Kartu dan dialog |
| Text | `#17211F` | Teks utama |
| Muted | `#5A6A66` | Teks sekunder |
| Border | `#D8E1DE` | Garis pembatas |
| Destructive | `#B42318` | Aksi/pesan destruktif |
| Success | `#147D4A` | Status sukses dengan label teks |
| Font | `Inter`, fallback `system-ui, sans-serif` | UI; self-host bila lisensi/file tersedia |
| Spacing | kelipatan `4px` (`4, 8, 12, 16, 24, 32, 48, 64`) | Ritme layout |
| Radius | `8px` field/button; `12px` card; `16px` dialog | Bentuk komponen |

Dark mode proposal: background `#111816`, surface `#1A2421`, text `#F1F5F3`, muted `#AAB8B2`, border `#34413C`; primary/semantic colors disetel ulang dan dicek kontras.

## Halaman dan wireframe berbasis teks

- **Beranda:** header logo/navigasi → pencarian tanggal/destinasi → trip unggulan dan jadwal terdekat → panduan singkat → footer kontak/kebijakan. Hero foto hanya bila aset disetujui.
- **Daftar trip:** heading + navigasi/pilihan daerah bertingkat + filter (tanggal, durasi, budget, destinasi) → chip filter aktif → kartu trip (nama, daerah utama, destinasi lain, gambar, harga, tanggal terdekat, sisa kursi) → pagination/empty state.
- **Detail trip:** breadcrumb → gallery → nama/harga/ringkas jadwal → pilihan jadwal dan CTA sticky mobile → itinerary per hari → include/exclude → meeting point → syarat/pembatalan → jadwal lain → FAQ dari owner.
- **Booking:** ringkasan trip/jadwal/kuota → data pemesan → daftar data peserta → rincian dan total → checkbox persetujuan → tombol Booking → konfirmasi hold dan countdown.
- **Pembayaran/status:** kode booking dan jumlah/batas waktu → tombol VA/QRIS (via hosted flow Midtrans) → instruksi dan refresh status → hasil sukses/pending/gagal/expired + chat admin.
- **Cek booking:** field kode + email/nomor telepon untuk verifikasi → status minimal dan tindakan selanjutnya; jangan membuka PII peserta tanpa autentikasi kuat.
- **Halaman daerah/destinasi/artikel:** breadcrumb daerah induk → anak → judul/copy yang disetujui → daftar trip terkait → FAQ dan metadata SEO. Daerah kosong menampilkan empty state yang mengarahkan ke daerah lain.
- **Admin login:** brand, email/password, show-password, link reset hanya bila flow tersedia.
- **Admin dashboard:** ringkasan booking perlu tindakan, jadwal mendatang dan kapasitas → navigasi trip, jadwal, booking, laporan.
- **Admin daftar/ detail booking:** filter status/tanggal → tabel responsif → timeline pembayaran/audit → aksi batalkan, pindah, refund dengan konfirmasi dan alasan.
- **Form trip/jadwal:** metadata terstruktur, harga/kuota/status, pratinjau publik, validasi; perubahan yang memengaruhi booking memerlukan konfirmasi.
- **Manifest:** pilih jadwal → daftar peserta/data operasional minimum → export CSV dengan notifikasi bahwa file berisi data personal.

## Komponen shadcn/ui yang direncanakan

`Button`, `Card`, `Input`, `Label`, `Textarea`, `Select`, `Popover`, `Calendar`, `Checkbox`, `RadioGroup`, `Badge`, `Dialog`, `AlertDialog`, `DropdownMenu`, `Tabs`, `Table`, `Skeleton`, `Toast/Sonner`, `Accordion`, `Separator`, `Sheet`, `Tooltip`, `Form`. Tambahkan hanya saat kebutuhan layar nyata; tema tunggal terlebih dahulu.

## Navigasi

Publik: Beranda → pilih daerah → daftar trip (filter lanjutan) → Detail → Booking → Pembayaran/Status; footer ke daerah/destinasi, panduan, kebijakan dan kontak. Aksi “Cek booking” selalu tersedia. Admin memiliki area `/admin` terpisah dengan login, dashboard, pengelolaan hierarki daerah, trip, jadwal, booking, laporan. Agen tidak memiliki area MVP.

## State UI

- **Loading:** skeleton kartu/tabel, indikator pengiriman form yang mencegah double submit.
- **Kosong:** jelaskan filter/aksi untuk memulai; jangan hanya layar kosong.
- **Error:** Bahasa sederhana, pertahankan input yang aman, sertakan ID bantuan; jangan tampilkan stack trace/rahasia.
- **Sukses:** konfirmasi jelas, kode booking, jumlah/status dan langkah berikut; tombol email/WhatsApp sesuai alur.
- **Pending:** label menunggu, expiry time dan cara refresh; hindari klaim pembayaran sukses sebelum diverifikasi server.
- **Offline:** katalog cache jika aman; checkout, status pembayaran, dan mutasi admin memerlukan online dan pesan yang jelas.

## Aksesibilitas

Target WCAG 2.2 AA: kontras teks minimal 4.5:1 (teks besar 3:1), focus ring terlihat, seluruh interaksi keyboard, urutan heading/landmark logis, label dan error field terhubung semantik, kontrol sentuh minimal 44×44 CSS px sebagai target, dialog mengelola focus, status dinyatakan dengan teks dan diumumkan screen reader. Hormati `prefers-reduced-motion`.

## Responsif

Breakpoint awal: 360px (ponsel kecil), 640px (mobile lebar), 768px (tablet), 1024px (desktop kecil), 1280px (desktop). Kartu satu kolom di mobile, dua di tablet, tiga di desktop; tabel admin berubah ke kartu/list pada layar sempit. Uji 320px sebagai kondisi minimum graceful.

## PWA dan offline minimal

- `manifest.webmanifest`, ikon 192/512 px dan maskable yang memakai identitas final setelah disetujui.
- Cache shell statis dan aset publik saja melalui service worker; jangan cache API booking, PII, session, status pembayaran, atau endpoint admin.
- Offline menampilkan katalog cached bertanda data mungkin lama, tetapi menonaktifkan booking/pembayaran/mutasi.
- **TBD:** logo, ikon, OG image, fotografi trip berlisensi dan persetujuan pemilik.
