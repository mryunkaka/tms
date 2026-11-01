# Travel Management System

Sistem booking untuk satu operator open trip dan paket wisata di berbagai daerah yang dikelola admin. Kotabaru, Kalimantan Selatan menjadi daerah awal; daftar wilayah dan destinasi dapat ditambah tanpa mengubah kode. MVP mencakup jadwal dan kuota, pembayaran DP dan pelunasan, serta panel admin.

## Prasyarat pengembangan Windows

- Node.js 24 LTS dan npm 11.
- PostgreSQL (gunakan installer resmi PostgreSQL; lihat [Architecture](docs/ARCHITECTURE.md)).
- Git.
- Redis belum diperlukan sampai Tahap 2.

## Menjalankan aplikasi lokal

Gunakan Node.js 24 dan npm 11. Dari root repository:

```sh
npm ci
```

Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`, `JWT_ACCESS_SECRET`, dan `WEB_ORIGIN`. Buat `JWT_ACCESS_SECRET` acak minimal 32 karakter (64 di produksi). Untuk membuat admin awal, isi `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` sekali; hapus kedua nilai itu dari `.env` setelah admin dibuat. Jangan gunakan kredensial contoh/default.

```sh
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

`db:deploy` menerapkan migration yang sudah tercatat tanpa membuat shadow database. Untuk membuat migration baru dengan `db:migrate`, gunakan role pengembangan PostgreSQL yang diizinkan membuat shadow database.

Web tersedia di `http://localhost:3000`, API di `http://localhost:3001`. Seed tidak mengganti password akun yang telah ada. `npm run db:backup:test` memakai `pg_dump` dan `pg_restore --list`; PostgreSQL client tools harus tersedia di PATH.

Pada workstation Windows yang memakai NSSM/Nginx, lihat [panduan service lokal](ops/windows/README.md). URL lokal TMS adalah `http://127.0.0.1:8085`.

Pemeriksaan lokal:

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run db:validate
```

## Dokumen

- [Alur bisnis (sumber kebenaran)](docs/BUSINESS_FLOW.md)
- [PRD](docs/PRD.md)
- [Design brief](docs/DESIGN_BRIEF.md)
- [Arsitektur](docs/ARCHITECTURE.md)
- [Keamanan](docs/SECURITY.md)
- [Prosedur debugging](docs/DEBUGGING.md) dan [log debugging](docs/DEBUG_LOG.md)
- [Panduan commit](docs/COMMIT_GUIDE.md) dan [CHANGELOG](CHANGELOG.md)
- [TODO dan status pekerjaan](docs/TODO.md)
- [Keputusan teknis](docs/DECISIONS.md)
- [Runbook deployment](docs/DEPLOY_RUNBOOK.md)
- [Rencana pengujian](docs/TEST_PLAN.md)
- [Laporan audit keamanan](docs/security/REPORT_TEMPLATE.md)
- [Review keamanan dan kualitas Tahap 1](docs/security/2026-11-01-stage-1-foundation-review.md)
- [Review deployment lokal Windows](docs/security/2026-11-01-local-windows-deployment-review.md)
- [Desain dan rencana implementasi Tahap 1](docs/superpowers/specs/2026-11-01-stage-1-foundation-design.md)
