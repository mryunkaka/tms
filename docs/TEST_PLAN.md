# Rencana Pengujian

Seluruh test bisnis mengacu pada `BUSINESS_FLOW.md` dan state machine PRD. Test memakai clock/provider yang dapat dikontrol dan database terisolasi. Tidak pernah menghubungi Midtrans production atau mengirim email customer nyata dari CI.

## Strategi dan alat

- **Unit:** Jest melalui toolchain NestJS/Next, untuk aturan bisnis, state machine, harga/DP integer, validasi dan pemetaan status provider.
- **Integrasi:** Jest + PostgreSQL test database untuk Prisma, transaksi/penguncian kuota, unique constraint/idempotency, migrations, cookie/session dan repository.
- **E2E:** Playwright untuk browser alur customer/admin; API E2E dengan Supertest. Midtrans sandbox dapat dipakai pada environment manual, dengan webhook fixture bertanda tangan test.
- **Kontrak:** fixture request/response terhadap adapter Midtrans/email; pengujian upgrade schema/migrasi.
- **Static/security:** lint, TypeScript, npm audit, secret scan (gitleaks), dan validasi build saat script tersedia.
- Pada Tahap 0 tool/script belum dibuat. Pilihan tool mengikuti stack agar tidak menambah runner kedua tanpa kebutuhan.

## Target cakupan

- Target awal domain API: minimal 80% statement/branch coverage pada modul bisnis booking, kapasitas, payment state dan auth; exception yang tak relevan dijelaskan.
- 100% transisi state booking yang diizinkan/ditolak serta acceptance scenario payment/kuota kritis memiliki test eksplisit.
- Coverage angka bukan pengganti test kasus race, idempotency, authorization dan failure.
- Target diputuskan ulang setelah paket/struktur monorepo terbentuk.

## Skenario lintas modul

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| AUTH-01 | Login valid admin | Access diberikan, refresh hanya pada cookie httpOnly, refresh disimpan sebagai hash. |
| AUTH-02 | Password salah/rate limit | Respons generik, tidak bocorkan keberadaan akun; percobaan berlebih dibatasi. |
| AUTH-03 | Refresh token dipakai | Token lama dicabut dan token baru berotasi atomik. |
| AUTH-04 | Refresh token lama diulang/logout | Reuse memicu pencabutan keluarga sesi; logout menolak refresh berikutnya. |
| AUTH-05 | Customer/agent memanggil endpoint admin | Ditolak 401/403 oleh server meski request dibuat manual. |
| CAT-01 | Filter tanggal/destinasi/durasi/budget | Hasil cocok filter; sort/input invalid ditolak/diabaikan sesuai kontrak dan tidak diinjeksi. |
| CAT-02 | Jadwal tidak aktif/kuota habis | Tidak dapat dipesan; kuota publik tidak dijadikan jaminan transaksi. |
| CAT-03 | Admin tambah/edit/urutkan/arsipkan daerah serta anak daerah | Perubahan langsung tampil di katalog/SEO tanpa deploy; area yang masih terpakai trip aktif tidak dapat dihapus tanpa relokasi terkonfirmasi. |
| CAT-04 | Satu trip terkait beberapa destinasi dengan urutan dan lokasi utama | Trip muncul pada tiap filter/halaman daerah yang sesuai; lokasi utama konsisten pada kartu, slug/metadata dan JSON-LD. |
| CAT-05 | Filter area induk dan anak / katalog tanpa filter area | Area induk mencakup trip terkait destinasi turunannya; tanpa area filter tetap tampil semua trip publik yang tersedia. |
| BOOK-01 | Booking valid, 7+ hari tersisa | Booking menahan kapasitas dan membentuk tagihan DP 30%. |
| BOOK-02 | Booking dibuat <7 hari sebelum berangkat | Syarat pembayaran penuh diterapkan. |
| BOOK-03 | Dua transaksi memperebutkan 1 kursi | Tepat satu berhasil, satu mendapat kapasitas penuh; sisa kuota tak negatif. Jalankan bersamaan pada PostgreSQL, bukan mock. |
| BOOK-04 | Payload jumlah/peserta/harga dimanipulasi | Server menghitung ulang harga, validasi menolak data tidak sah; tidak ada booking parsial. |
| BOOK-05 | Booking tanpa akun lookup status | Kode + faktor kontak benar hanya menampilkan informasi minimum; faktor salah/percobaan berlebih ditolak. |
| EXP-01 | Scheduler memproses hold yang lewat 2 jam | State menjadi `EXPIRED`, hold dikembalikan tepat satu kali. |
| EXP-02 | Scheduler dijalankan dua kali/dua instance | Tidak menggandakan kuota atau side effect. |
| PAY-01 | Status DP Midtrans sukses | `PENDING_DP -> DP_PAID`, payment terhubung ke order yang benar, kuota committed. |
| PAY-02 | Pelunasan sukses | `DP_PAID -> PAID_IN_FULL`, saldo nol dan bukti disimpan. |
| PAY-03 | Signature webhook tidak valid | Tidak mengubah booking/payment; dicatat aman dan ditolak. |
| PAY-04 | Webhook identik berulang | Efek satu kali; record duplicate dikenali. |
| PAY-05 | Webhook terlambat/urut terbalik | Status dikonfirmasi Status API; tidak meregresi state. |
| PAY-06 | Provider bilang paid setelah `EXPIRED` | Payment ditandai anomaly/admin review; tidak mengaktifkan booking otomatis. |
| PAY-07 | Timeout API/provider dan retry | Tidak membuat transaksi ganda; order ID/idempotency konsisten, rekonsiliasi dapat dipanggil ulang. |
| PAY-08 | VA/QRIS expiry | Expiry provider tidak melewati batas hold; batas waktu ditampilkan memakai WITA yang benar. |
| PAY-09 | Jumlah/merchant/order mismatch | Webhook/status tidak diterapkan; anomali dapat dilihat admin. |
| REM-01 | H-10 dan H-8 reminder | Email sesuai jadwal lokal, tidak terkirim dua kali per jenis/per booking. |
| REM-02 | Pelunasan telat | Reminder dicatat; cancellation hanya sesuai kebijakan yang disepakati, tanpa silent refund. |
| OPS-01 | Minimum pax gagal pada H-5 | Admin dapat memilih jalan/tunda/batal; keputusan dan waktu audit tercatat. |
| OPS-02 | Operator membatalkan/mengubah jadwal | Peserta ditawari pindah/refund; booking tidak diganti diam-diam, pilihan terlacak. |
| OPS-03 | Export manifest | Hanya admin; jadwal tepat, UTF-8, data minimum, akses tercatat. |
| REF-01 | Refund manual | Hanya admin, alasan/jumlah/bukti tercatat, state `CANCELLED -> REFUND_PENDING -> REFUNDED`. |
| SEO-01 | Metadata, sitemap, robots, JSON-LD, OG | Slug/metadata unik dan valid; tidak ada fakta destinasi tanpa sumber owner. |
| PWA-01 | Offline | Shell/konten publik aman tersedia; booking/admin/payment tidak cache atau berfungsi offline. |

## Data uji

- Daerah contoh Kotabaru, Kalimantan Selatan dan Bali hanya dipakai sebagai fixture `TEST` berdasarkan referensi pengguna; trip, harga dan fakta wisata tetap dummy/berlabel `TEST`, tidak dipublikasikan sebagai klaim produk sebelum disetujui pemilik.
- Jadwal batas timezone WITA: H-10, H-8, H-7, tepat 7 hari, kurang 7 hari, DST/UTC conversion fixture, lewat midnight lokal.
- Capacity 1, capacity 0, beberapa peserta, perubahan jadwal, schedule inactive.
- IDR integer: harga rendah, nilai batas/rupiah, DP 30% dengan aturan rounding yang perlu diputuskan (`TBD` owner), total penuh; tolak float/negatif/overflow.
- Akun admin/agent/customer/unauthenticated palsu; email/nomor telepon domain test, tidak nyata.
- Fixture webhook sandbox anonim: valid, signature invalid, duplicate, old timestamp, out-of-order, wrong order/amount/status, expired payment.

## Lingkungan eksekusi

- Pull request: unit, lint/typecheck/build, integrasi DB test, auth/state tests, secret/dependency check.
- Nightly/pre-release: E2E penuh, konkurensi PostgreSQL, Midtrans sandbox (hanya key sandbox terisolasi), restore drill dan security checklist.
- Simpan hasil rilis di `docs/security/` dan kegagalan/debug regresi di `docs/DEBUG_LOG.md`.
