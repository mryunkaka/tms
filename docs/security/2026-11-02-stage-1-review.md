# Laporan Pemeriksaan Keamanan — 2026-11-02 / Tahap 1

## Ringkasan

- Commit basis: `17da314`; laporan diperbarui setelah implementasi pengurutan destinasi pada working tree 2026-11-02.
- Scope: auth/admin, katalog termasuk urutan destinasi, booking guest, capacity/expiry, public web, local PostgreSQL/Nginx/NSSM, dependency dan dokumentasi.
- Pemeriksa/tanggal: Codex, 2026-11-02 (WITA).
- Runtime/tool: Node 24.22.1, npm 11, PostgreSQL 18.6, Next.js 16.4.3, NestJS 12.3.2, Prisma 7.10.1.
- Hasil: **BLOCKED** — pemeriksaan kode dan aplikasi lulus, tetapi P0 restore drill belum selesai karena metode perubahan akses sementara ditolak automatic approval review sebelum eksekusi. Tahap 1 belum boleh ditandai selesai.

## Pemeriksaan dan bukti

| Pemeriksaan | Hasil | Perintah/versi | Bukti atau catatan |
|---|---|---|---|
| Perubahan dan threat model | PASS | Review diff, PRD, SECURITY.md | Server mengunci kuota dalam transaksi; lookup menggunakan POST body; akses admin diberi guard role. Panel admin menyediakan alur sunting katalog dan jadwal. |
| Unit/integration/e2e | PASS | `npm test` | 15 suite, 63 test lulus. Termasuk tes service worker offline; HTTP test auth memakai throttler mock. |
| Lint/typecheck/build | PASS | `npm run lint`, `npm run typecheck`, `npm run build` | Semua workspace lulus. Production build menghasilkan route `/`, `/admin`, `/booking/status`, destination/trip detail, sitemap, robots dan manifest. |
| Prisma schema/migration | PASS | `npm run db:validate`, `npm run db:deploy` | Schema valid; tidak ada migration tertunda. `migrate dev` gagal membuat shadow DB karena role aplikasi tidak punya CREATEDB; gunakan `db:deploy` untuk menerapkan migration tersedia. |
| PostgreSQL booking race/expiry | PASS | `npm run db:booking:test` | Dua request untuk kapasitas satu hanya membuat satu booking; expiry melepas hold sekali. |
| Dependency audit | TEMUAN | `npm audit`, `npm audit --omit=dev`, npm registry | Audit penuh: 31 advisory (3 low, 28 moderate) pada dependency development/test; tidak ada high/critical. Production-only audit: 0 vulnerability. Registry masih merilis Jest 30.5.2 dengan `glob@13.0.6`/`deepmerge@4.3.1`, dan Nest CLI 12.0.11 dengan `minimatch@10.2.6`; advisori terbaru menyediakan `glob@14.0.2`, `minimatch@11.0.1`, namun belum ada versi `deepmerge` yang dipatch. npm audit menyarankan downgrade major, jadi tidak diterapkan. Sumber: [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249), [glob advisory](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4); registry diperiksa 2026-11-02. |
| Secret scan | TERBATAS | `git check-ignore .env`, `git grep` pola high-confidence | `.env` ignored; tidak ada kandidat private key/AWS/GitHub token pada file Git. Scanner khusus gitleaks/trufflehog tidak tersedia. |
| RBAC/IDOR/auth/session | PASS DENGAN TEMUAN | Automated tests, `npm run db:auth:test` | Guard dan token reuse diuji; dua refresh bersamaan pada PostgreSQL menghasilkan dua respons dengan token yang sama, satu token pengganti aktif. Penyatuan berlaku dalam satu proses API. Uji autentikasi melalui browser ber-cookie belum dilakukan. |
| Validasi/XSS/CSRF/CORS/Helmet | PASS DENGAN TEMUAN | Unit controller dan probe HTTP lokal | DTO whitelist/forbid extra, Helmet, CORS origin eksplisit, Origin check untuk mutasi. Cookie Secure/HttpOnly/SameSite=Lax dibuktikan pada unit test; preflight same-origin HTTP 204 dan login dari Origin asing HTTP 401. Pengujian browser ber-cookie masih perlu sebelum rilis. |
| Logging/privacy/export | PASS | Review Pino middleware/serializers, logger tests | Pino menulis JSON stdout; request mendapat UUID, log akses menyimpan method/path tanpa query dan status saja. Test menutup redaksi kredensial/kontak dan objek arbitrer. Lookup tidak memasukkan PII ke URL. Export manifest belum termasuk Tahap 1. |
| Deployment/network/permissions | LOCAL ONLY | Inspect services dan HTTP lokal | PostgreSQL, Node/NSSM dan Nginx berjalan; API/database bind loopback, service Node/Nginx LocalSystem. Jangan expose di LAN/internet; belum ada TLS/domain atau service account berhak minimum. |
| Backup/restore drill | BLOCKED P0 | Review catatan operasi lokal | Dump `pg_restore --list` sebelumnya lulus, namun itu bukan restore. `createdb` pada cluster aktif ditolak karena role `tms_app` tidak punya CREATEDB; percobaan `initdb` terisolasi gagal pada lingkungan Windows (`utf8_and_win` tidak ditemukan). Automatic approval sebelumnya juga menolak metode perubahan `pg_hba.conf`. Cluster aktif, konfigurasi, dan service tidak diubah oleh percobaan tersebut. |
| Akses lokal | PASS | HTTP probe `127.0.0.1:8085` | `/`, `/admin`, `/booking/status`, `/api/v1/health`, dan `/api/v1/destinations` semuanya HTTP 200 setelah service NSSM `nodejs` direstart. CORS preflight 204 dan Origin asing 401. |
| Urutan destinasi | PASS | DTO/service/UI tests; Prisma deploy | Integer order dibatasi 0..2.147.483.647; input null, pecahan, negatif dan overflow ditolak. Migration menambah kolom default 0; pohon mengurutkan sibling menurut sortOrder dan nama. Edit trip mempertahankan posisi kunjungan lama; audit log memuat nilai sortOrder sebelum/sesudah. |
| PWA offline shell | PASS | Service worker VM tests; HTTP probe | Cache hanya `/offline.html`; navigasi offline, termasuk admin, menerima shell generik. Semua API request, termasuk navigasi GET, dilewati; versi cache lama TMS dibersihkan tanpa menyentuh cache lain. `/sw.js` dan `/offline.html` HTTP 200. |

## Temuan

| ID/severity | Reproduksi dan dampak | Mitigasi/keputusan | Owner | Target |
|---|---|---|---|---|
| SEC-01 / P0 | Restore dump ke database terisolasi belum diverifikasi; recovery aktual belum terbukti. Role aplikasi tak berhak membuat DB baru, dan upaya cluster sementara gagal membuat cluster pada locale Windows. | Belum ada lingkungan restore yang didukung dan disetujui. Jangan ubah cluster aktif/akses DB untuk melewati hambatan; jangan menandai Tahap 1 selesai sampai uji restore aman menghasilkan bukti. | Engineering/ops | Sebelum menutup Tahap 1 |
| SEC-02 / P1 | 31 advisory low/moderate pada rantai tooling development/test. Tidak ada vulnerability dalam audit dependency production-only. `npm audit fix --dry-run` tidak menemukan pembaruan kompatibel; rekomendasi otomatis memerlukan downgrade major. | Jadwalkan upgrade toolchain terencana dan ulangi audit; tanpa `--force`. | Engineering | Sebelum rilis publik |
| SEC-03 / P1 | Browser belum memverifikasi penyimpanan/pengiriman cookie refresh Secure pada alamat lokal. | Uji autentikasi dengan browser pada origin/domain deployment sebelum rilis publik. | Engineering | Sebelum rilis publik |
| SEC-04 / P2 | Destinasi sibling dengan sortOrder dan nama identik belum memiliki tie-break berdasarkan slug/ID. Tampilannya sama, tetapi urutan record tidak dijamin jika query mengembalikan baris dengan urutan berbeda. | Pilih slug/ID sebagai tie-break tambahan jika pemilik perlu urutan stabil untuk nama duplikat. | Engineering | Bila operator menggunakan nama duplikat |

## Risiko yang diterima dan belum diperiksa

- Risiko diterima: instalasi lokal memakai NSSM LocalSystem dan hanya ditujukan untuk laptop; bukan konfigurasi server publik.
- Belum diperiksa: restore drill, gitleaks/trufflehog, pengujian browser auth/cookie, audit ASVS penuh, uji beban, TLS, dan Midtrans (Tahap 2).
- Konten dan keputusan bisnis tetap `TBD` sampai diberikan pemilik; jangan menerbitkan trip dengan fakta atau data fixture.
- Audit ulang: setelah SEC-01 diselesaikan dan sebelum deployment publik.
