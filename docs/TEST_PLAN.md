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
# Tes fondasi Tahap 1

- Workspace: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- API unit/e2e mencakup kontrak health, role admin, penolakan anonim dan role bukan admin, hash token refresh, reuse refresh, dan penolakan role non-admin saat login.
- `npm run db:validate` dan `npm run db:generate` tidak memerlukan server DB.
- Verifikasi Windows lokal (2026-11-01): PostgreSQL 18.6 aktif di loopback; migration deploy dan seed dijalankan dua kali; login admin terhadap database berhasil. `npm run db:backup:test` menghasilkan custom-format dump dan lulus `pg_restore --list`; ini hanya memeriksa arsip, bukan memulihkan database.
- Probe auth live API/database lokal (2026-11-01): login mengeluarkan cookie refresh, refresh mengrotasi token, logout membuat refresh berikutnya 401, dan reuse token lama membuat token pengganti dalam family sama ikut ditolak 401. Ini verifikasi serial, bukan uji race/parallel atau browser Secure/CORS.
- Fondasi katalog (2026-11-01): dua migration aditif berhasil diterapkan di PostgreSQL; API test mencakup tree destinasi aktif, proteksi admin, default destinasi draft, guard arsip untuk cabang dengan trip terbit, filter trip terbit, validasi parameter dan pembuatan draft trip. Uji helper pricing juga memeriksa H-7/DP. Root `npm run lint`, `npm test` (26 test), `npm run typecheck`, dan `npm run build` lulus.
- Verifikasi Tahap 1 (2026-11-02): root lint, 43 unit/API/web test, typecheck, dan production build lulus. `npm run db:validate` valid; `npm run db:deploy` melaporkan tidak ada migration tertunda. `npm run db:booking:test` lulus: dua request untuk satu kursi hanya membuat satu booking, dan hold kedaluwarsa melepas kuota satu kali. HTTP lokal melalui Nginx: homepage, admin, lookup booking dan health API semuanya 200; endpoint API mengembalikan request ID.
- Verifikasi lanjutan (2026-11-02): 46 test lulus; `npm run db:auth:test` menjalankan dua refresh identik secara paralel ke PostgreSQL dan memverifikasi kedua respons berbagi token rotasi yang sama dengan tepat satu pengganti aktif. Unit test memverifikasi cookie produksi Secure/HttpOnly/SameSite=Lax dan penolakan Origin berbeda. Probe HTTP lokal memverifikasi preflight same-origin 204 dan login Origin asing 401.
- Publication integrity: service test memastikan trip multi-hari dengan itinerary tidak lengkap tidak dapat diterbitkan. Admin form memerlukan satu judul per hari dan tidak mengisi fakta trip secara otomatis.
- Logging privacy: unit test memastikan structured Pino logs meredaksi kredensial/kontak dan logger Nest tidak menulis objek error arbitrer.
- Security/dependency review: `npm audit --omit=dev` menemukan 0 vulnerability; `npm audit` penuh menemukan 31 advisory low/moderate di dependency development/test. Perbaikan `--force` yang mengusulkan downgrade mayor tidak dijalankan. Pemeriksaan pola secret high-confidence pada file Git tidak menemukan kandidat; scanner khusus seperti gitleaks tidak tersedia.
- Tahap belum ditutup: restore drill belum dilakukan. Metode sementara yang mengubah `pg_hba.conf` ditolak automatic approval review sebelum eksekusi; tidak ada perubahan konfigurasi. Diperlukan metode terisolasi yang disetujui. Autentikasi ber-cookie Secure/CORS masih perlu uji browser sebelum rilis; throttler HTTP test masih dimock.
- Masih diperlukan sebelum fondasi DB dinyatakan selesai: restore dump ke database terisolasi lalu validasi tabel/count. Migration deploy lokal, booking race/expiry, dan refresh race PostgreSQL sudah diverifikasi.
- Tes HTTP memock throttler agar test dapat berjalan tanpa dependensi layanan eksternal; batas rate login harus diverifikasi dengan guard nyata sebelum rilis. Automated test juga belum menggantikan tes integrasi PostgreSQL atau pengujian manual cookie Secure/CORS lintas origin di browser.
