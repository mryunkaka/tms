# Desain Tahap 1: Fondasi dan Auth Admin

## Tujuan

Membuat fondasi monorepo web/API dan autentikasi admin yang aman agar pengembangan katalog serta booking berikutnya memakai batas aplikasi, database, dan kontrol akses yang jelas.

## Cakupan

- npm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- Next.js web minimal, NestJS API, Prisma/PostgreSQL, validasi environment, lint/test/build lintas platform.
- Admin diprovisikan melalui seed dengan env awal. Tidak ada registrasi publik.
- Auth admin: login, JWT access berumur pendek, refresh token opaque dalam cookie HttpOnly, hash di database, rotasi atomik, reuse mencabut keluarga token, logout, `/auth/me`, dan admin-only guard.
- RBAC server-side dengan role `ADMIN`, `AGENT`, `CUSTOMER`; hanya admin dipakai Tahap 1. Agen/customer belum diberi akses atau akun.
- CORS allowlist, validasi DTO, Helmet, rate limit login, dan test regresi.

## Non-goals

Belum membangun katalog/daerah UI, booking, payment, Midtrans, email, Redis/BullMQ, akun agen/customer, MFA, reset password, atau produksi VPS. Daerah multi-destinasi sudah ditetapkan di PRD, tetapi CRUD destinasi adalah task Tahap 1 berikutnya.

## Keputusan desain

1. Root memakai npm workspaces agar setup awal tidak perlu package manager tambahan.
2. `packages/shared` hanya memuat kontrak kecil yang dipakai kedua app (role dan tipe user publik), bukan logika/domain duplikat.
3. Access token JWT 15 menit ditandatangani dengan secret server. Refresh opaque 256-bit berlaku 30 hari, dikirim hanya lewat cookie HttpOnly/SameSite dan Secure di produksi; DB hanya menyimpan SHA-256 token hash. Durasi bisa dikonfigurasi.
4. Rotasi memakai conditional update di dalam transaksi Prisma. Reuse token lama mencabut semua token dalam family; refresh yang paralel dapat membuat sesi family dicabut, perilaku fail-closed yang akan didokumentasikan.
5. Login memakai Argon2id, pesan gagal generik dan rate limit. User awal dibuat eksplisit melalui seed/env; seed tidak mereset password admin yang sudah ada.
6. Default CORS hanya `WEB_ORIGIN`; mutasi auth memeriksa Origin. Access token tetap di respons JSON dan disimpan client oleh aplikasi, bukan localStorage yang persisten.
7. Tes menggunakan Jest, Nest testing, Supertest, serta adapter Prisma in-memory khusus unit bila DB lokal tidak tersedia. Prisma schema dan migrasi divalidasi; race/persistence end-to-end wajib dijalankan ulang terhadap PostgreSQL sebelum task database/auth dinyatakan production-ready.

## Trade-off

- Opaque refresh token memberi revocation dan rotasi langsung, tetapi membutuhkan satu query/transaction DB pada refresh.
- npm workspaces lebih familiar daripada pnpm/Turborepo dan cukup untuk dua app; build orchestration kompleks ditunda.
- Seed admin memerlukan operator mengisi env satu kali, namun menghindari kredensial default yang berbahaya.
- PostgreSQL integration belum dapat berjalan jika server DB belum dipasang; test unit tidak menggantikannya.

## Syarat penerimaan

- `npm ci`, `npm run lint`, `npm test`, `npm run build` tersedia di root dan berhasil.
- `prisma validate`/generate berhasil; seed pertama membuat role dan admin, seed ulang tidak mengubah password.
- Kredensial salah dan user non-admin tidak mendapat akses admin.
- Access JWT valid mengidentifikasi user; refresh cookie tidak dapat dibaca JavaScript dan tidak mengandung token DB plaintext.
- Refresh berhasil merotasi token; token lama yang dipakai ulang mencabut family; logout mencabut sesi.
- DTO reject input invalid, login dibatasi, origin/CORS dibatasi dan error/log tidak mengekspos password/token/secret.
- `docs/TODO.md` diperbarui dan branch feature terpisah dari `main`.

## Masih terbuka

- **TBD operator:** nama/email admin pertama dan cara provisioning secret di laptop produksi. Implementasi menyediakan env tanpa mengisi nilainya.
- **ASUMSI:** satu browser/admin session per refresh-token family; batas simultan perangkat belum disetujui. Setiap login membuat family baru.
- PostgreSQL lokal tidak terdeteksi pada laptop saat Tahap 0; test integrasi database penuh perlu setelah PostgreSQL tersedia.
