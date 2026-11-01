# Product Requirements Document — TMS

## Ringkasan

Travel Management System untuk satu operator yang menjual open trip dan paket wisata miliknya sendiri di berbagai daerah. Kotabaru, Kalimantan Selatan adalah daerah awal, bukan batas sistem. Admin dapat menambahkan struktur daerah/destinasi dan mengaitkan perjalanan ke satu atau beberapa lokasi tanpa perubahan kode. Pengunjung menemukan daerah/trip melalui mesin pencari, membandingkan jadwal, memesan kursi, membayar DP/pelunasan, dan memperoleh informasi keberangkatan.

Dokumen ini tunduk pada alur bisnis lengkap di [BUSINESS_FLOW.md](BUSINESS_FLOW.md). Parameter di alur bisnis adalah asumsi konfigurasi; tanggal batas dan angka tidak boleh ditanam sebagai literal kode.

## Latar belakang dan masalah

Calon wisatawan kesulitan menemukan satu sumber yang jelas untuk melihat pilihan daerah, jadwal, harga, kuota, itinerary, dan cara membayar perjalanan. Pemesanan manual berisiko menimbulkan konflik kursi, rekonsiliasi pembayaran terlambat, dan daftar peserta yang tidak konsisten.

## Tujuan dan metrik keberhasilan

- Calon peserta dapat menemukan trip dan jadwal yang tersedia dari ponsel.
- Admin dapat menambah, menyunting, mengurutkan, mengarsipkan daerah/destinasi dan memilihnya untuk trip tanpa perubahan kode; katalog dan SEO menampilkan pilihan daerah yang aktif.
- Tidak ada jadwal yang terjual melebihi kuota, termasuk saat kursi terakhir dipesan serentak.
- Setiap pembayaran cocok dengan satu booking dan satu order Midtrans; notifikasi berulang tidak menggandakan pembayaran atau kuota.
- Admin dapat mengelola trip, memantau pembayaran, dan mengunduh manifest.
- Konten yang memerlukan fakta operator ditandai `TBD: diisi pemilik bisnis`, bukan dibuat-buat.

Metrik operasional: rasio kunjungan detail ke booking, booking dibayar, konversi mobile, kegagalan pembayaran, insiden oversell (target nol), webhook gagal/tertunda, dan keterkiriman email. **TBD:** baseline dan target rasio/availability ditetapkan pemilik bisnis setelah data awal tersedia.

## Non-goals

Marketplace multi-operator, pembelian tiket pesawat/hotel, portal/akun agen, WhatsApp API, ulasan, voucher, aplikasi native, dan refund otomatis. PWA menyediakan pengalaman web yang dapat dipasang, bukan aplikasi native.

## Pengguna, persona, dan peran

- **Rina, calon peserta/customer:** memilih daerah yang diminati, membandingkan perjalanan, jadwal dan biaya, memesan untuk rombongan, lalu membayar.
- **Admin/operator:** memasukkan produk dan jadwal, memantau kuota, menangani perubahan/pembatalan/refund, serta menyiapkan manifest.
- **Agen:** peran yang dikenal bisnis, tetapi akun agen dan alur komisi/penjualan mandiri berada di luar MVP sebagaimana `BUSINESS_FLOW.md`. Role disediakan untuk pengembangan lanjutan tanpa akses MVP.
- **Customer:** dapat melakukan booking guest dengan email/telepon dan kode booking sebagai **ASUMSI MVP** untuk mengurangi hambatan. Perlu dikonfirmasi pemilik bisnis.

RBAC ditegakkan di API, bukan hanya menyembunyikan tombol di web. Admin memiliki izin operasional; customer hanya dapat melihat/mengelola booking miliknya berdasarkan token/kode dan verifikasi kontak; agen belum diberi akses.

## Ruang lingkup bertahap

- **Tahap 0 — dokumentasi:** sumber kebenaran, PRD, rancangan, aturan keamanan/kerja, runbook, test plan.
- **Tahap 1 — inti:** monorepo, PostgreSQL/Prisma, autentikasi admin dan RBAC, pengelolaan destinasi/trip/jadwal, pencarian/katalog, booking, penguncian kuota, tugas kedaluwarsa lokal NestJS tanpa Redis.
- **Tahap 2 — transaksi MVP:** Redis + BullMQ bila antrean perlu; Midtrans sandbox VA/QRIS dan webhook aman; email transaksional dan pengingat; status DP/pelunasan; refund tetap manual. Sistem MVP lengkap setelah tahap ini.
- **Tahap 3 — rilis:** monitoring, hardening, backup/restore teruji, domain/SSL, migrasi dan go-live VPS.

## Persyaratan fungsional dan acceptance criteria

### Auth dan RBAC

- Admin masuk menggunakan kredensial; kata sandi disimpan dengan Argon2id atau bcrypt, tidak pernah plaintext.
- Refresh token berada pada cookie `httpOnly`, `Secure` di HTTPS, proteksi `SameSite`, disimpan dalam bentuk hash, dirotasi dan dapat dicabut.
- Akses endpoint admin tanpa role admin ditolak di server; customer tidak dapat membaca booking customer lain.
- Login dibatasi lajunya, respons gagal tidak mengungkap apakah email terdaftar, dan peristiwa autentikasi penting dicatat tanpa secret.
- **TBD:** apakah admin dibuat lewat seed/invitasi (usulan: satu admin awal melalui proses seed yang memakai env lokal, tanpa kredensial bawaan produksi).

### Katalog produk

- Admin dapat mengelola hierarki lokasi (misalnya wilayah/daerah induk → daerah/kota → destinasi/objek wisata) melalui panel. Kedalaman/jenis tingkat tidak di-hardcode; admin dapat membuat tingkat sesuai kebutuhan operator.
- Admin dapat mengaitkan trip ke satu atau beberapa destinasi; urutan kunjungan dapat disusun, dan satu lokasi utama dipilih untuk kartu/listing serta metadata SEO.
- Arsip/nonaktifkan daerah tidak menghapus histori booking/trip; daerah yang masih dipakai trip terpublikasi harus ditolak penghapusannya atau memerlukan pemindahan terkonfirmasi.
- Admin dapat membuat/mengubah destination, trip/paket, itinerary, include/exclude, titik kumpul, syarat, kebijakan, dan slug.
- Admin dapat mengaktifkan jadwal dengan waktu berangkat, kuota, harga IDR integer, kuota minimum dan status publikasi.
- Jadwal yang dinonaktifkan tidak dapat menerima booking baru; perubahan pada jadwal berisi peserta memicu alur pemberitahuan dan pilihan peserta.
- Konten destinasi yang belum diberikan operator tidak dipublikasikan sebagai fakta.

### Pencarian dan SEO

- Pengunjung dapat memfilter daftar trip menurut tanggal, durasi, budget, dan destinasi; hasil menampilkan harga, jadwal terdekat, dan sisa kursi.
- Pengunjung dapat menelusuri halaman daerah/destinasi dari navigasi, memilih daerah induk atau anak, dan hanya melihat trip aktif terkait. Katalog tetap dapat dipakai tanpa memilih daerah.
- Detail menampilkan itinerary, include/exclude, titik kumpul, syarat/kebijakan pembatalan, dan jadwal lain.
- Halaman publik memakai SSR/SSG sesuai kebutuhan data, metadata unik, slug, sitemap, robots, JSON-LD dan Open Graph. Halaman publik harus tetap bisa dibaca dengan JavaScript seminimal mungkin dan layout mobile-first.
- Beranda, destinasi, artikel panduan, dan cek status tersedia. Konten editorial yang belum disetujui diberi status TBD, tidak diisi fakta karangan.

### Booking dan kapasitas

- Customer memilih jadwal, jumlah peserta, data wajib tiap peserta, dan kontak; sebelum menyimpan server memvalidasi jadwal, harga dan sisa kuota.
- Transaksi database dengan row lock/strategi serialisasi atomik memastikan dua permintaan untuk kursi terakhir tidak dapat sama-sama berhasil; kuota tidak negatif.
- Kursi pada `PENDING_DP` dihitung sebagai hold terhadap ketersediaan segera setelah transaksi dibuat; saat payment terverifikasi hold dikonversi menjadi kursi terjual tanpa decrement kedua. Saat expiry/cancel yang sah, pelepasan dilakukan tepat sekali.
- Booking awal menahan tempat selama 2 jam. Untuk jadwal kurang dari 7 hari sebelum berangkat, pembayaran penuh wajib; untuk jadwal lainnya DP 30%.
- Saat DP belum dibayar hingga batas, scheduler NestJS menandai `EXPIRED` dan mengembalikan hold dengan operasi idempoten.
- Customer dapat mengecek status menggunakan kode booking dan bukti kontak. **TBD:** tingkat detail data yang ditampilkan pada lookup publik.
- Perubahan jumlah peserta setelah booking: default MVP batalkan dan pesan ulang; tidak ada edit jumlah secara langsung.

### State machine booking

Semua transisi dilakukan dalam satu transaksi yang memeriksa status lama dan syaratnya. Transisi lain ditolak dan dicatat sebagai konflik.

| Dari | Ke | Pemicu dan syarat |
|---|---|---|
| — | `PENDING_DP` | Booking valid dan kapasitas berhasil ditahan; order pembayaran dibuat terpisah. |
| `PENDING_DP` | `DP_PAID` | DP terverifikasi dari status Midtrans dan booking masih berlaku. |
| `PENDING_DP` | `PAID_IN_FULL` | Pembayaran penuh terverifikasi untuk booking yang dibuat kurang dari 7 hari sebelum keberangkatan. |
| `PENDING_DP` | `EXPIRED` | Batas hold lewat dan tidak ada pembayaran yang terverifikasi. |
| `PENDING_DP` | `CANCELLED` | Customer/admin membatalkan sebelum pembayaran; hold dilepas satu kali. |
| `DP_PAID` | `PAID_IN_FULL` | Pelunasan terverifikasi. |
| `DP_PAID` | `CANCELLED` | Pembatalan disetujui admin menurut kebijakan; bila dana sudah diterima lanjut ke refund. |
| `PAID_IN_FULL` | `COMPLETED` | Trip telah dilaksanakan; admin menutup perjalanan. |
| `DP_PAID` / `PAID_IN_FULL` | `CANCELLED` | Operator/customer membatalkan setelah administrasi mencatat sebab dan keputusan; kursi dilepas sesuai prosedur. |
| `CANCELLED` | `REFUND_PENDING` | Admin mencatat refund yang disetujui untuk pembayaran yang diterima. |
| `REFUND_PENDING` | `REFUNDED` | Admin mencatat bukti refund manual selesai. |

Booking `EXPIRED` yang belakangan menerima pembayaran tidak kembali otomatis ke state aktif: payment ditandai anomali untuk tindakan admin. `REFUNDED` dan `COMPLETED` terminal. **ASUMSI:** booking `CANCELLED` yang belum dibayar terminal; pembatalan setelah bayar memerlukan keputusan admin dan state refund. Aturan persentase/waktu pembatalan `TBD`.

### Pembayaran Midtrans

- Satu record Payment per jenis pembayaran (`DP` atau `PELUNASAN`) dan satu transaksi Midtrans per record; `order_id` unik, misalnya `KODEBOOKING-DP` / `KODEBOOKING-PELUNASAN` dengan akhiran unik bila retry perlu.
- API membuat transaksi Midtrans sandbox untuk VA atau QRIS. Masa berlaku transaksi tidak melewati batas hold. Jadwal kurang dari 7 hari memakai pembayaran penuh.
- Webhook signature diverifikasi, event dideduplikasi, dan status dikonfirmasi melalui Status API Midtrans sebelum mengubah booking/kuota.
- Event ganda/terlambat/terbalik tidak boleh menggandakan pembayaran atau meregresikan status. Pembayaran terlambat sesudah expired ditandai untuk admin.
- Refund diproses manual oleh admin; sistem menyimpan permintaan, jumlah yang disetujui, bukti, pelaku, dan waktu.

### Notifikasi

- Kirim email konfirmasi booking, DP diterima, pengingat pelunasan H-10 dan H-8, pelunasan diterima, dan info keberangkatan.
- Pengiriman dapat dicoba ulang tanpa membuat pesan/status pembayaran duplikat. Kegagalan tersedia untuk admin/log tanpa memuat secret.
- WhatsApp hanya link click-to-chat ke nomor admin yang dikonfigurasi; tidak ada WhatsApp API.
- Penyedia awal yang diusulkan: Resend free tier; lihat `DECISIONS.md`. Batas/ketentuan diverifikasi ulang sebelum implementasi.

### Panel admin

- Admin dapat CRUD trip dan jadwal, melihat booking/pembayaran terkini, memutuskan open trip minimum pada H-5 (jalan/tunda/batal), serta mencatat komunikasi/pilihan pindah jadwal atau refund.
- Admin dapat mengekspor manifest peserta untuk jadwal tertentu (CSV UTF-8), dibatasi role admin dan hanya memuat data yang diperlukan.
- Perubahan kapasitas/harga setelah booking tidak mengubah nilai booking lama; catat snapshot harga dan jejak audit.
- Setiap perubahan status, kuota, jadwal, pembayaran manual/refund memiliki aktor, timestamp, alasan, dan nilai sebelum/sesudah.

### Laporan

- Admin dapat melihat jumlah booking per jadwal, sisa kuota, total DP/pelunasan terverifikasi, dan daftar pembayaran perlu ditinjau.
- Nilai uang dihitung dalam IDR integer; laporan tidak menghitung payment pending sebagai pendapatan.
- Export manifest dan daftar pembayaran perlu tindakan mematuhi kontrol akses dan minimisasi data.

## Alur pembatalan, perubahan jadwal, dan refund

Pembatalan customer atau operator masuk ke antrean kerja admin. Jika operator membatalkan/mengubah jadwal, admin memberi peserta pilihan pindah ke jadwal tersedia atau refund; sistem mencatat pilihan, mengubah jadwal booking secara audit, atau menandai `REFUND_PENDING`. Admin menyelesaikan refund secara manual dan mengubah state ke `REFUNDED` setelah bukti dicatat. **TBD pemilik bisnis:** persentase refund menurut waktu, biaya transfer, batas respons, refund sebagian, dan kebijakan customer yang batal.

## Kebutuhan non-fungsional

- **Performa:** mobile-first; halaman publik utama ditargetkan LCP < 2,5 detik pada persentil ke-75 setelah baseline lapangan tersedia; gambar responsif dan caching publik tidak boleh menyajikan kuota stale untuk keputusan booking.
- **Ketersediaan:** satu VPS pada awal go-live; availability target `TBD` pemilik/operator. Proses pembayaran harus pulih/reconcile setelah restart.
- **Keamanan:** OWASP Top 10 dan kontrol ASVS yang relevan; detail di `SECURITY.md`. TLS untuk publik, admin MFA menjadi rekomendasi go-live `TBD`.
- **Backup:** backup PostgreSQL terjadwal, retensi dan uji restore sesuai runbook; backup dienkripsi dan tidak disimpan hanya pada host yang sama.
- **Privasi:** kumpulkan data peserta minimum, batasi akses/retensi, hapus atau anonimisasi sesuai kebijakan yang disetujui. **TBD:** jangka retensi, dasar pemrosesan dan prosedur permintaan subjek data.
- **Operabilitas:** Pino JSON ke stdout, readiness/health check, uptime monitoring; metrik Prometheus/Grafana Tahap 3.
- **Portabilitas:** pengembangan Windows, produksi Ubuntu 24.04; skrip aplikasi lintas platform, waktu UTC, env melalui `.env`, LF.

## Gambaran model data

`User` memiliki satu/lebih `Role` (`ADMIN`, `AGENT`, `CUSTOMER`) dan token refresh yang disimpan hash. `Destination` memiliki relasi induk-anak untuk mengelola hierarki daerah tanpa daftar lokasi hardcode. Relasi banyak-ke-banyak `TripDestination` mengaitkan satu trip dengan satu atau beberapa destinasi, urutan kunjungan, dan lokasi utama untuk SEO. `Trip` memiliki `TripSchedule`. `Booking` terhubung ke satu jadwal dan menyimpan snapshot harga, jumlah, kontak pemesan, status, hold deadline, serta peserta (`Participant`). `Payment` terkait ke booking dan menyimpan jenis, order ID Midtrans unik, jumlah, status provider, waktu dan referensi event idempoten. `Notification` mencatat jenis, tujuan, status kirim, percobaan. `AuditLog` mencatat tindakan sensitif. Skema Prisma final di Tahap 1.

## Endpoint API tingkat tinggi (rancangan)

Semua API memakai prefix `/api/v1`; nama final dan kontrak dicatat saat Tahap 1.

| Area | Rute tingkat tinggi | Akses |
|---|---|---|
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` | Admin; cookie refresh |
| Katalog | `GET /destinations`, `GET /destinations/:slug`, `GET /trips?destination=...`, `GET /trips`, `GET /trips/:slug`, `GET /trips/:slug/schedules` | Publik |
| Booking | `POST /bookings`, `GET /bookings/:code` | Guest dengan validasi input; lookup verifikasi kontak |
| Payment | `POST /bookings/:code/payments`, `POST /payments/midtrans/webhook` | Booking terkait; webhook server-to-server tervalidasi |
| Admin katalog | `/admin/destinations` CRUD/tree, `/admin/trips` CRUD dan relasi destinasi, `/admin/schedules` CRUD | Admin |
| Admin operasi | `/admin/bookings`, `/admin/bookings/:id/status`, `/admin/schedules/:id/manifest`, `/admin/payments/:id/refund` | Admin |
| Kesehatan | `GET /health/live`, `/health/ready` | Readiness publik terbatas |

## Integrasi pihak ketiga

- Midtrans Snap/Payment API dan Status API; sandbox dulu, VA dan QRIS.
- Resend email API (usulan; key/akun domain belum dibuat).
- Google Search Console dan Google Business Profile sebagai tugas non-kode.
- Tidak ada WhatsApp API atau vendor travel lain.

## Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Dua booking untuk kursi terakhir | Kunci baris jadwal/operasi atomik dan uji konkruensi database. |
| Webhook palsu/ganda/tertukar | Signature + status API + idempotency key/event ledger + state machine. |
| Pembayaran sesudah expired | Rekonsiliasi Status API, tandai anomali dan eskalasi admin; jangan aktifkan booking otomatis. |
| Pengingat/tugas scheduler ganda | Handler idempoten; pencatatan delivery dan locking; Tahap 1 Nest scheduler tanpa Redis. |
| Kebijakan refund belum disepakati | Tahan otomatisasi; konfirmasi pemilik bisnis sebelum pembayaran produksi. |
| Kehilangan DB pada disk VPS terbatas | Backup terenkripsi di lokasi lain, retensi terukur, restore drill dan monitor kapasitas. |
| Konten SEO salah | Semua copy fakta berasal dari owner/editor dan review sebelum publikasi. |
| Email masuk spam / provider berubah | Domain terverifikasi, log hasil, adapter provider sederhana, uji kirim sebelum go-live. |

## Milestone

1. **Tahap 0:** dokumentasi/aturan kerja selesai dan keputusan terbuka tercatat.
2. **Tahap 1:** monorepo dan inti booking dapat dipakai di lokal; tes transaksi kuota lolos.
3. **Tahap 2:** pembayaran sandbox, rekonsiliasi, email dan scheduler/queue dapat diuji end-to-end.
4. **Tahap 3:** hardening, restore drill, monitoring, deployment staging lalu go-live setelah persetujuan pemilik bisnis.

## Asumsi

- Operator adalah satu bisnis localway.id; detail produk dan daerah peluncuran selain Kotabaru belum diverifikasi.
- Daerah/destinasi dikelola admin sebagai hierarki data; struktur dapat mengikuti kebutuhan lokasi operator. Trip dapat mengunjungi beberapa destinasi.
- DP 30%, hold 2 jam, jatuh tempo pelunasan dan minimum open trip mengikuti `BUSINESS_FLOW.md`, disimpan sebagai konfigurasi.
- Booking guest dipakai pada MVP untuk menekan hambatan, dengan lookup code + verifikasi kontak.
- H-10/H-8 adalah pengingat otomatis; semua batas lokal dihitung memakai `Asia/Makassar`, disimpan UTC.
- Role agen dikenali tetapi fitur akun/penjualan agen di luar MVP.
- PostgreSQL dipasang native di laptop; Docker belum terdeteksi di PATH saat dokumentasi dibuat.

## Pertanyaan Terbuka

1. **Wajib sebelum go-live:** kebijakan pembatalan dan persentase refund menurut waktu, biaya transfer, pembatalan sebagian, dan batas waktu pemrosesan?
2. Apakah pemilik menyetujui booking guest dan cara verifikasi lookup status yang tidak membocorkan data peserta?
3. Bagaimana kebijakan minimum peserta, jika admin memilih tunda/batal di H-5, kompensasi dan batas keputusan?
4. Apakah target benar WITA untuk operasi, termasuk jadwal berangkat yang dikirim pelanggan dari zona lain?
5. Siapa admin awal dan proses provision/reset/MFA yang diwajibkan?
6. Data wajib per peserta, data sensitif yang perlu dihindari, retensi, dan prosedur koreksi/penghapusan?
7. Harga per orang atau per paket/rombongan; apakah deposit pembulatan ke rupiah terdekat/bawah/atas?
8. Nomor admin WhatsApp, email pengirim/domain terverifikasi, detail trip, titik kumpul, itinerary, syarat, gambar dan konten SEO apa yang disetujui?
9. Target availability, performa berdasarkan jaringan/perangkat Indonesia, kapasitas puncak, dan jadwal backup/retensi yang disetujui?
10. Apakah pindah jadwal mempertahankan harga lama, boleh beda harga, dan bagaimana selisih ditagih/refund?
11. Kapan pelunasan terlambat membatalkan booking dan bagaimana tindak lanjut dana yang sudah dibayar?
