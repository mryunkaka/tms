# Review keamanan dan kualitas Tahap 1

Tanggal: 2026-11-01
Branch: `feat/stage-1-monorepo-auth`
Status: fondasi aplikasi siap dikembangkan; belum dinyatakan siap produksi.

## Hasil review kode

- Tidak ada kredensial bawaan atau nilai secret di repository; `.env.example` berisi nama variabel dengan nilai kosong.
- Seed hanya menyimpan hash Argon2id, tidak mengganti password admin lama, dan menolak menaikkan role akun yang bukan admin.
- Login menggunakan pesan gagal generik dan verifikasi hash dummy saat email tidak ditemukan/akun nonaktif.
- Refresh token memiliki entropi acak 256-bit; hanya hash SHA-256 tersimpan. Rotasi bersifat kondisional di dalam transaksi, dan pemakaian ulang token revoked mencabut semua token aktif pada family.
- Token access diverifikasi API; endpoint admin memeriksa role. Cookie refresh HttpOnly, SameSite=Lax, path terbatas dan Secure pada production. Respons auth mengirim `Cache-Control: no-store`.
- Mutasi auth mensyaratkan Origin sama persis dengan `WEB_ORIGIN`; CORS memakai origin tunggal dengan credentials. Input DTO menggunakan whitelist dan menolak field tambahan.
- Helmet aktif. Throttle login 5 request/menit dan default 100 request/menit memakai storage in-memory untuk satu proses.
- Port API mempercayai satu reverse proxy untuk memperoleh alamat klien; deployment tidak boleh mengekspos port API langsung ke internet.
- Tidak menambah fitur katalog, booking, pembayaran, Redis, email, reset password, MFA, atau registrasi publik.

## Verifikasi

- API/unit/e2e, shared dan web tests (16 total), lint, typecheck, build, Prisma schema validation/generation serta diff whitespace: seluruh pemeriksaan lokal berhasil setelah npm ci.
- `npm audit --omit=dev`: tidak ada kerentanan produksi pada saat pemeriksaan.
- Audit penuh mencatat temuan pada dev tooling saja (3 low, 28 moderate); perbaikan otomatis yang tersisa meminta perubahan mayor pada Jest, jadi tidak diterapkan secara paksa.
- PostgreSQL tidak ditemukan pada mesin ini. Migrasi SQL dibuat dari schema, tetapi migrasi terhadap server, tes persistensi/refresh paralel, seed terhadap DB, dan restore dump belum dijalankan.

## Batasan dan tindak lanjut

- Jalankan migrasi dan tes integrasi dengan PostgreSQL lokal sebelum mengandalkan session persistence. Pastikan refresh paralel/reuse dan seed idempotent di DB sesungguhnya.
- `npm run db:backup:test` membuat custom-format dump dan memeriksa daftar arsip; ini bukan restore drill.
- Tes otomatis membuktikan konfigurasi route/Origin/cookie dan alur guard, tetapi belum memverifikasi rate limit terhadap IP nyata, cookie Secure melalui HTTPS, atau CORS lintas origin di browser.
- Rate limiting saat ini per-process. Jika API dijalankan multi-worker, pindahkan storage ke backend bersama sebelum traffic dibagi.
- Belum ada MFA, reset password, audit event persistence atau admin UI login; hal tersebut tetap keputusan/tahap lanjutan dalam dokumen produk.
