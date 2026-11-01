# Review Keamanan Deployment Lokal Windows

Tanggal: 2026-11-01
Commit aplikasi yang ditinjau: `089586d`
Scope: service startup Windows, reverse proxy lokal, PostgreSQL lokal, dan auth admin Tahap 1
Status: **PASS DENGAN BATASAN**

## Bukti pemeriksaan

| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| Secret repo | Lulus | `.env` di-ignore Git; ACL file hanya pemilik, Administrators, dan SYSTEM. Nilai secret tidak disalin ke report. |
| Database/network | Lulus | PostgreSQL 18.6 menerima koneksi hanya pada `127.0.0.1` dan `::1`; `pg_hba.conf` memakai SCRAM. |
| Service startup | Lulus | `postgresql-x64-18`, `nodejs`, dan Nginx existing `WebStack-Nginx` berstatus Running dan Automatic; `nodejs` bergantung pada PostgreSQL. |
| Bind aplikasi | Lulus | Next.js `127.0.0.1:3000`, NestJS `127.0.0.1:3001`, Nginx TMS `127.0.0.1:8085`. |
| Web/API | Lulus | Homepage dan `/api/v1/health` HTTP 200; login admin memakai database lokal berhasil. |
| PHP vhost | Lulus | Port 8081, 8082, 8083, dan 8084 tetap HTTP 200 setelah Nginx memuat konfigurasi TMS. |
| Migration/seed | Lulus | Migration Prisma diterapkan; seed dijalankan ulang tanpa mereset password admin yang sudah ada. |
| Backup archive | Lulus sebagian | `npm run db:backup:test` sukses dan `pg_restore --list` membaca dump custom-format. Ini bukan restore drill. |
| Kualitas aplikasi | Lulus | 6 test suites/16 tests, lint, dan production build berhasil pada perubahan yang di-deploy. |

## Batasan dan tindak lanjut

- Restore ke database terisolasi dan verifikasi jumlah record belum dilakukan; tetap tercatat di TMS-013.
- Laptop belum direboot secara fisik setelah pengaturan Automatic; startup type dan dependency service sudah diperiksa.
- Service `nodejs` berjalan sebagai `LocalSystem`. Konfigurasi hanya untuk akses loopback di laptop; jangan membuka akses LAN/internet sebelum service account berhak minimum dan kontrol deployment ditinjau.
- Belum ada TLS karena endpoint lokal hanya loopback. Runbook VPS/TLS, backup off-host, dan go-live tidak tercakup oleh pemeriksaan ini.
- `npm audit` dan secret scanner tidak dijalankan pada pemeriksaan workstation ini; hasil audit dependency sebelumnya tercatat di `2026-11-01-stage-1-foundation-review.md`.
