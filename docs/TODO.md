# TODO dan Status Pekerjaan

Sumber kebenaran untuk progres; tanggal menggunakan WITA. `TBD` berarti tanggal/penanggung jawab perlu disepakati. Prioritas: P0 wajib sebelum rilis/tahap lanjut, P1 penting, P2 peningkatan.

## Sedang Dikerjakan (On Progress)

- **TMS-034 — [P1] [Tahap 1] [Owner: Engineering] [Tanggal: 2026-11-02]** `npm audit` menemukan 31 advisory low/moderate pada rantai dependency development/test; production-only audit bersih. Perbaiki melalui pembaruan kompatibel dan verifikasi ulang, tanpa `--force` yang mengusulkan downgrade mayor tooling.

## Belum Dikerjakan (To Do)

### Tahap 0 — dokumentasi dan persetujuan bisnis

- **TMS-006 — [P0] [Tahap 0→1] [Owner: Pemilik bisnis] [Tanggal: TBD]** Tetapkan kebijakan refund/pembatalan (persentase, waktu, biaya, refund sebagian) sebelum pembayaran produksi.
- **TMS-007 — [P1] [Tahap 0→1] [Owner: Pemilik bisnis] [Tanggal: TBD]** Setujui guest booking, verifikasi lookup, role admin awal, MFA dan proses reset akun.
- **TMS-008 — [P1] [Tahap 0→1] [Owner: Pemilik bisnis] [Tanggal: TBD]** Berikan daftar daerah/destinasi awal (Kotabaru dan daerah lain), detail produk/jadwal/itinerary/include-exclude/titik kumpul, harga/minimum pax, syarat, gambar berlisensi, identitas merek, nomor WhatsApp dan konten lokasi terverifikasi.
- **TMS-009 — [P1] [Tahap 0→3] [Owner: Pemilik bisnis] [Tanggal: TBD]** Tetapkan retensi dan dasar pemrosesan data, target availability, RPO/RTO, volume puncak, target performa dan jadwal backup.
- **TMS-010 — [P1] [Tahap 0→1] [Owner: Admin/operator] [Tanggal: TBD]** Tetapkan kebijakan pindah jadwal/harga saat operator mengubah trip, toleransi pelunasan terlambat, batas keputusan H-5, serta pembulatan DP IDR.
- **TMS-011 — [P1] [Tahap 0] [Owner: Admin/operator] [Tanggal: TBD]** Buat Google Search Console dan Google Business Profile; submit sitemap setelah domain siap.

### Tahap 1 — inti monorepo, auth, katalog, booking

- **TMS-012 — [P0] [Tahap 1] [Owner: Engineering] [Tanggal: TBD]** Siapkan monorepo npm workspace `apps/web`, `apps/api`, `packages/shared`, toolchain TypeScript/lint/test/build, validasi env, `.env.example` dan CI lokal lint/test.
- **TMS-013 — [P0] [Tahap 1→3] [Owner: Engineering/ops] [Tanggal: TBD]** Lakukan backup/restore drill ke database terisolasi setelah metode akses DB yang aman disetujui. `pg_restore --list` hanya memvalidasi arsip dan bukan restore.

### Tahap 2 — pembayaran sandbox, queue, notifikasi

- **TMS-019 — [P0] [Tahap 2] [Owner: Engineering] [Tanggal: TBD]** Tambahkan Redis/BullMQ bila queue multi-worker/retry dibutuhkan; job expiry/reminder/outbox idempoten dan observabel.
- **TMS-020 — [P0] [Tahap 2] [Owner: Engineering] [Tanggal: TBD]** Integrasi Midtrans sandbox VA/QRIS, satu transaksi/order ID per DP/pelunasan, Status API, signature, idempotency, retry/reconciliation dan payment anomaly admin.
- **TMS-021 — [P0] [Tahap 2] [Owner: Engineering] [Tanggal: TBD]** Integrasi email Resend pilot; konfirmasi/DP/pengingat H-10 & H-8/pelunasan/keberangkatan, retry, unsubscribe tidak relevan untuk transactional, domain test.
- **TMS-022 — [P1] [Tahap 2] [Owner: Admin/operator] [Tanggal: TBD]** Alur admin minimum trip H-5, peserta pindah jadwal/batal, refund manual dan audit trail.
- **TMS-023 — [P1] [Tahap 2] [Owner: Engineering] [Tanggal: TBD]** E2E booking→DP→pelunasan→email di sandbox, duplicate/out-of-order/late webhook, timeout, expired payment, manifest export dan restore data test.

### Tahap 3 — monitoring, hardening, VPS, go-live

- **TMS-024 — [P0] [Tahap 3] [Owner: Engineering/ops] [Tanggal: TBD]** Siapkan VPS Ubuntu 24.04, Node v24, Nginx/TLS/systemd non-root, UFW/SSH hardening, secret/env permissions dan rollback.
- **TMS-025 — [P0] [Tahap 3] [Owner: Engineering/ops] [Tanggal: TBD]** Setup backup PostgreSQL terenkripsi off-host/retensi, alert disk/backup, restore drill dan persetujuan RPO/RTO.
- **TMS-026 — [P1] [Tahap 3] [Owner: Engineering/ops] [Tanggal: TBD]** Setup Uptime Kuma; siapkan Prometheus/Grafana hanya setelah kapasitas/disk mendukung.
- **TMS-027 — [P0] [Tahap 3] [Owner: Engineering + pemilik bisnis] [Tanggal: TBD]** Audit OWASP/ASVS, review privacy/retention, uji beban dan security report; ganti Midtrans sandbox ke produksi hanya setelah checklist dan persetujuan owner selesai.
- **TMS-028 — [P1] [Tahap 3] [Owner: Engineering + pemilik konten] [Tanggal: TBD]** Publish sitemap dan isi Search Console/Business Profile, metadata serta konten destinasi tervalidasi.

## Sudah Dilaksanakan (Done)

- **TMS-012 — [P0] [Tahap 1] [Owner: Codex] [Tanggal: 2026-11-01]** Membuat npm workspaces untuk web/API/shared, konfigurasi TypeScript/lint/test/build, validasi env dan instruksi lokal. Unit/API/web test serta lint/typecheck/build berhasil.
- **TMS-014 — [P0] [Tahap 1] [Owner: Codex] [Tanggal: 2026-11-01]** Auth admin, hash password/token refresh, rotasi/revocation, guards/RBAC, CORS/Origin, dan rate limit tersedia. Probe live serial serta automated tests ada; race refresh dan Secure-cookie browser masih perlu verifikasi pra-rilis.
- **TMS-015 — [P1] [Tahap 1] [Owner: Codex] [Tanggal: 2026-11-01]** Homepage SSR dengan filter, halaman daerah/trip, status booking, metadata, sitemap/robots/JSON-LD dan layout mobile dibuat. Konten bisnis tetap menunggu pemilik.
- **TMS-017 — [P0] [Tahap 1] [Owner: Codex] [Tanggal: 2026-11-01]** Booking guest, snapshot harga, lock kuota PostgreSQL, scheduler expiry, idempotent release dan acceptance race/expiry sudah diuji dengan PostgreSQL lokal.
- **TMS-018 — [P1] [Tahap 1] [Owner: Codex] [Tanggal: 2026-11-01]** Lookup dan pembatalan menerima kode serta email/telepon melalui POST body; hasil lookup meminimalkan PII dan endpoint dibatasi rate limit.
- **TMS-016 — [P0] [Tahap 1] [Owner: Codex] [Tanggal: 2026-11-02]** CRUD destinasi/trip/jadwal, hierarki dan banyak destinasi, audit, syarat publish, API publik filter/detail, serta panel admin buat/sunting/aktif/nonaktif/archive tersedia.

- **TMS-001 — [P0] [Tahap 0] [Owner: Codex] [Tanggal: 2026-11-01]** Inisialisasi Git, `.gitignore`, `.gitattributes`, `.env.example`, README dan changelog. Commit `6cf78a0`.
- **TMS-002 — [P0] [Tahap 0] [Owner: Codex] [Tanggal: 2026-11-01]** Buat `AGENTS.md` serta panduan commit/prioritas keamanan dan DoD. Commit `d2e921c`.
- **TMS-003 — [P0] [Tahap 0] [Owner: Codex] [Tanggal: 2026-11-01]** Dokumentasikan alur bisnis kanonis, PRD/state machine, design brief. Commit `8f287c4`.
- **TMS-004 — [P0] [Tahap 0] [Owner: Codex] [Tanggal: 2026-11-01]** Dokumentasikan arsitektur, security checklist, deployment, keputusan, template report. Commit `516357c`.
- **TMS-029 — [P0] [Tahap 0] [Owner: Codex] [Tanggal: 2026-11-01]** Buat strategi test, debugging protocol dan log tabel kosong.
- **TMS-033 — [P0] [Tahap 0] [Owner: Codex] [Tanggal: 2026-11-01]** Perluas scope dari Kotabaru saja ke katalog lintas daerah yang dapat dikelola admin; pertahankan satu operator dan buat data lokasi hierarkis agar tidak hardcode. Dokumen acceptance, model, test plan dan decisions diperbarui.
- **TMS-005 — [P0] [Tahap 0] [Owner: Codex] [Tanggal: 2026-11-01]** Audit sumber dan pasang hanya skill Karpathy pada `.agents/skills/`; gabungkan prinsipnya ke `AGENTS.md` dan catat keputusan. Commit pemasangan terpisah.
- **TMS-032 — [P0] [Tahap 0] [Owner: Codex] [Tanggal: 2026-11-01]** Audit sumber dan salin hanya `skills/ponytail/SKILL.md` ke `.agents/skills/ponytail/`; tidak memasang plugin/hook/adapter. Commit `chore: add ponytail skill` terpisah.

## Perubahan (Change Log)

- **2026-11-01:** Menetapkan PostgreSQL installer resmi native untuk laptop karena Docker tidak terdeteksi pada PATH; Redis ditunda sampai Tahap 2 agar setup awal tidak perlu service ekstra.
- **2026-11-01:** Memilih Resend sebagai provider email awal (free tier untuk pilot) melalui adapter; review ulang batas, privasi, domain dan biaya sebelum produksi.
- **2026-11-01:** Memilih guest booking sebagai asumsi MVP demi mengurangi hambatan; perlu validasi owner terhadap mekanisme lookup privacy-safe.
- **2026-11-01:** Memasang skill pihak ketiga hanya melalui salinan folder skill; plugin, lifecycle hook, adapter lain dan skrip instalasi tidak ikut scope.
- **2026-11-01:** Atas permintaan pemilik, memperluas cakupan produk agar operator satu bisnis dapat menyediakan trip di banyak daerah; Kotabaru menjadi daerah awal. Daerah disimpan sebagai hierarki konfigurasi dan trip dapat terkait ke beberapa destinasi.
- **2026-11-01:** Memulai Tahap 1 pada branch `feat/stage-1-monorepo-auth` di worktree; membangun monorepo, fondasi PostgreSQL/Prisma dan auth admin. Saat branch dimulai PostgreSQL belum dipasang sehingga integrasi DB dan restore drill masih tertunda.
- **2026-11-01:** Memasang PostgreSQL 18.6 lokal, membatasi listener ke loopback, membuat database dan user aplikasi, menerapkan migration/seed, dan membangun production app. NSSM `nodejs` bergantung pada PostgreSQL dan auto-start; virtual host TMS ditambahkan ke Nginx existing `WebStack-Nginx`. Homepage, health, login admin dan PHP vhost diverifikasi; backup archive list lulus, restore drill belum dilakukan.
- **2026-11-01:** Menerapkan dua migration aditif untuk destinasi, trip, jadwal, booking, peserta, audit dan invariant kapasitas; menambah API admin/public destinasi, pembuatan draft trip admin, dan katalog trip publik. Root lint/test/typecheck/build lulus (26 test); konten tetap kosong sampai owner memasukkan dan mengaktifkannya.
- **2026-11-01:** Menyelesaikan alur booking guest, expiry dan verifikasi lookup; menambah detail publik, halaman destinasi, status lookup, SEO, serta panel admin dasar. Uji PostgreSQL nyata memastikan race satu kursi menghasilkan satu booking dan expiry melepas hold tepat satu kali. Build production dan checks lulus; `/`, `/admin`, `/booking/status`, dan health API menghasilkan HTTP 200 setelah service `nodejs` direstart.
- **2026-11-02:** Panel admin dilengkapi form sunting destinasi, trip/itinerary/relasi, serta jadwal. Publish menolak itinerary yang tidak memiliki judul untuk setiap hari durasi trip; unit test menutup aturan ini. API juga memakai Pino JSON stdout, ID unik per request dan serializer akses yang tidak mencatat header/query/body.
- **2026-11-02:** Security review mencatat restore drill P0 yang belum dilakukan dan 31 advisory low/moderate pada tooling development (production-only audit 0). `.env` tetap ignored; pemeriksaan pola secret berkeyakinan tinggi pada file Git tidak menemukan kandidat.
- **2026-11-02:** Commit `8d7ff23 feat(stage-1): complete catalogue and booking flows` sudah dipush ke `origin/main`. Tahap 1 tetap blocked oleh restore drill P0.

## Terblokir (Blocked)

- **TMS-013 — [P0]** Restore drill tertahan: automatic approval review menolak perubahan sementara `pg_hba.conf` yang diminta oleh metode drill. Perintah tidak dijalankan dan konfigurasi tidak berubah. Tidak dicoba jalan pintas lain; butuh metode terisolasi yang disetujui.
- **Tahap 1 belum dapat dinyatakan selesai** sampai restore drill terverifikasi dan temuan P0 ini ditutup.

## Utang Teknis

- Belum ada shortcut kode yang disengaja; Tahap 0 tidak membuat kode aplikasi. Jika nanti ada komentar `shortcut:`, tambahkan satu entri berisi file/baris, batas, pemicu upgrade, owner dan tahap pelunasan.

## Backlog Ide

- **TMS-030 — [P2] [Tahap setelah MVP] [Owner: Product] [Tanggal: TBD]** Portal agen/komisi setelah model bisnis dan RBAC agen disetujui.
- **TMS-031 — [P2] [Tahap setelah MVP] [Owner: Product] [Tanggal: TBD]** Ulasan, voucher dan integrasi WhatsApp API setelah MVP stabil dan kebijakan moderasi/biaya jelas.
