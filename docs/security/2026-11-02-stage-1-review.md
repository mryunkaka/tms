# Laporan Pemeriksaan Keamanan — 2026-11-02 / Tahap 1

## Ringkasan

- Commit yang diaudit: `8d7ff23` (perubahan yang sama diperiksa pada working tree tepat sebelum commit).
- Scope: auth/admin, katalog, booking guest, capacity/expiry, public web, local PostgreSQL/Nginx/NSSM, dependency dan dokumentasi.
- Pemeriksa/tanggal: Codex, 2026-11-02 (WITA).
- Runtime/tool: Node 24.22.1, npm 11, PostgreSQL 18.6, Next.js 16.4.3, NestJS 12.3.2, Prisma 7.10.1.
- Hasil: **BLOCKED** — pemeriksaan kode dan aplikasi lulus, tetapi P0 restore drill belum selesai karena metode perubahan akses sementara ditolak automatic approval review sebelum eksekusi. Tahap 1 belum boleh ditandai selesai.

## Pemeriksaan dan bukti

| Pemeriksaan | Hasil | Perintah/versi | Bukti atau catatan |
|---|---|---|---|
| Perubahan dan threat model | PASS DENGAN TEMUAN | Review diff, PRD, SECURITY.md | Server mengunci kuota dalam transaksi; lookup menggunakan POST body; akses admin diberi guard role. UI admin belum memiliki alur edit untuk data katalog yang sudah dibuat. |
| Unit/integration/e2e | PASS | `npm test` | 12 suite, 43 test lulus. HTTP test auth memakai throttler mock. |
| Lint/typecheck/build | PASS | `npm run lint`, `npm run typecheck`, `npm run build` | Semua workspace lulus. Production build menghasilkan route `/`, `/admin`, `/booking/status`, destination/trip detail, sitemap, robots dan manifest. |
| Prisma schema/migration | PASS | `npm run db:validate`, `npm run db:deploy` | Schema valid; tidak ada migration tertunda. `migrate dev` gagal membuat shadow DB karena role aplikasi tidak punya CREATEDB; gunakan `db:deploy` untuk menerapkan migration tersedia. |
| PostgreSQL booking race/expiry | PASS | `npm run db:booking:test` | Dua request untuk kapasitas satu hanya membuat satu booking; expiry melepas hold sekali. |
| Dependency audit | TEMUAN | `npm audit`, `npm audit --omit=dev` | Audit penuh: 31 advisory (3 low, 28 moderate) pada dependency development/test; tidak ada high/critical. Production-only audit: 0 vulnerability. `npm audit fix --force` mengusulkan downgrade mayor dan tidak dijalankan. |
| Secret scan | TERBATAS | `git check-ignore .env`, `git grep` pola high-confidence | `.env` ignored; tidak ada kandidat private key/AWS/GitHub token pada file Git. Scanner khusus gitleaks/trufflehog tidak tersedia. |
| RBAC/IDOR/auth/session | PASS DENGAN TEMUAN | Automated API tests dan probe auth serial lokal terdahulu | Guard role dan unauthorized tests lulus; login/refresh rotation/logout/reuse pernah diverifikasi serial. Refresh race dan cookie Secure/CORS pada browser belum diuji. |
| Validasi/XSS/CSRF/CORS/Helmet | PASS DENGAN TEMUAN | Review `main.ts`, DTO dan controller | DTO whitelist/forbid extra, Helmet, CORS origin eksplisit, Origin check untuk mutasi booking/auth. Perlu browser test cookie Secure/CORS sebelum rilis. |
| Logging/privacy/export | PASS | Review Pino middleware/serializers, logger tests | Pino menulis JSON stdout; request mendapat UUID, log akses menyimpan method/path tanpa query dan status saja. Test menutup redaksi kredensial/kontak dan objek arbitrer. Lookup tidak memasukkan PII ke URL. Export manifest belum termasuk Tahap 1. |
| Deployment/network/permissions | LOCAL ONLY | Inspect services dan HTTP lokal | PostgreSQL, Node/NSSM dan Nginx berjalan; API/database bind loopback, service Node/Nginx LocalSystem. Jangan expose di LAN/internet; belum ada TLS/domain atau service account berhak minimum. |
| Backup/restore drill | BLOCKED P0 | Review catatan operasi lokal | Dump `pg_restore --list` sebelumnya lulus, namun itu bukan restore. Automatic approval review menolak metode yang sementara mengubah `pg_hba.conf` sebelum command berjalan. Tidak ada perubahan konfigurasi dan tidak dicoba metode alternatif. |

## Temuan

| ID/severity | Reproduksi dan dampak | Mitigasi/keputusan | Owner | Target |
|---|---|---|---|---|
| SEC-01 / P0 | Restore dump ke database terisolasi belum diverifikasi; recovery aktual belum terbukti. | Tertahan pada gerbang automatic approval untuk metode perubahan akses sementara. Lanjutkan hanya dengan metode terisolasi yang disetujui; jangan menandai Tahap 1 selesai sampai bukti restore ada. | Engineering/ops | Sebelum menutup Tahap 1 |
| SEC-02 / P1 | 31 advisory low/moderate pada rantai tooling development/test. Tidak ada vulnerability dalam audit dependency production-only. | Perbarui dependency dalam rentang kompatibel dan jalankan checks; evaluasi perubahan mayor secara terpisah, tanpa `--force`. | Engineering | Sebelum rilis publik |
| SEC-02 / P1 | Cookie Secure/CORS flow belum diperiksa dalam browser pada URL lokal dan refresh paralel belum dites. | Verifikasi pada browser dengan origin yang sama dan test refresh race sebelum akses publik. | Engineering | Sebelum rilis publik |

## Risiko yang diterima dan belum diperiksa

- Risiko diterima: instalasi lokal memakai NSSM LocalSystem dan hanya ditujukan untuk laptop; bukan konfigurasi server publik.
- Belum diperiksa: restore drill, gitleaks/trufflehog, pengujian browser auth/cookie, refresh paralel, audit ASVS penuh, uji beban, TLS, dan Midtrans (Tahap 2).
- Konten dan keputusan bisnis tetap `TBD` sampai diberikan pemilik; jangan menerbitkan trip dengan fakta atau data fixture.
- Audit ulang: setelah SEC-01 diselesaikan dan sebelum deployment publik.
