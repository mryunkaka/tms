# TODO dan Status Pekerjaan

Sumber kebenaran untuk progres; tanggal menggunakan WITA. `TBD` berarti tanggal/penanggung jawab perlu disepakati. Prioritas: P0 wajib sebelum rilis/tahap lanjut, P1 penting, P2 peningkatan.

## Sedang Dikerjakan (On Progress)

- **TMS-013 — [P0] [Tahap 1] [Owner: Engineering] [Tanggal: 2026-11-01]** Schema, migrasi dan seed aman tersedia; validasi/generasi berhasil. Menjalankan migrasi, menguji persistensi/seed pada PostgreSQL lokal dan drill restore backup menunggu PostgreSQL tersedia.

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
- **TMS-013 — [P0] [Tahap 1] [Owner: Engineering] [Tanggal: TBD]** Konfigurasikan PostgreSQL lokal native, Prisma schema/migration, seed aman tanpa default credential, backup test data.
- **TMS-014 — [P0] [Tahap 1] [Owner: Engineering] [Tanggal: TBD]** Buat auth admin, password hash, JWT access, refresh hash/rotation/revocation cookie, rate limit, guards/RBAC dan audit; test session serta unauthorized access.
- **TMS-015 — [P1] [Tahap 1] [Owner: Engineering + pemilik konten] [Tanggal: TBD]** Bangun UI publik SSR/SSG, katalog/filter/detail, SEO metadata/sitemap/robots/JSON-LD/OG dan responsive accessibility.
- **TMS-016 — [P0] [Tahap 1] [Owner: Engineering] [Tanggal: TBD]** CRUD destinasi/trip/jadwal admin, status publish, snapshot harga dan audit log.
- **TMS-017 — [P0] [Tahap 1] [Owner: Engineering] [Tanggal: TBD]** Implementasi booking guest sesuai keputusan, participant, locking/serialisasi kuota, expiry scheduler Nest tanpa Redis, state machine dan acceptance tests race/expired.
- **TMS-018 — [P1] [Tahap 1] [Owner: Engineering] [Tanggal: TBD]** Cek status booking dengan verifikasi kontak, proteksi brute force dan minimisasi PII.

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
- **TMS-014 — [P0] [Tahap 1] [Owner: Codex] [Tanggal: 2026-11-01]** Membuat login admin Argon2id, JWT access singkat, refresh opaque hash-only dengan rotasi/reuse family revoke, logout, cookie HttpOnly, rate-limit login, CORS/Origin, DTO validation, Helmet, guard dan RBAC. Tes mencakup login cookie, role, refresh dan seed. Tes persistence/race menunggu PostgreSQL.

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
- **2026-11-01:** Memulai Tahap 1 pada branch `feat/stage-1-monorepo-auth` di worktree; membangun monorepo, fondasi PostgreSQL/Prisma dan auth admin. PostgreSQL belum dipasang sehingga integrasi DB dan restore drill tetap tertunda.

## Terblokir (Blocked)

- Belum ada item terblokir secara teknis. Keputusan refund/konten/operasional menunggu pemilik bisnis; tercatat sebagai TODO, bukan blocker Tahap 0.

## Utang Teknis

- Belum ada shortcut kode yang disengaja; Tahap 0 tidak membuat kode aplikasi. Jika nanti ada komentar `shortcut:`, tambahkan satu entri berisi file/baris, batas, pemicu upgrade, owner dan tahap pelunasan.

## Backlog Ide

- **TMS-030 — [P2] [Tahap setelah MVP] [Owner: Product] [Tanggal: TBD]** Portal agen/komisi setelah model bisnis dan RBAC agen disetujui.
- **TMS-031 — [P2] [Tahap setelah MVP] [Owner: Product] [Tanggal: TBD]** Ulasan, voucher dan integrasi WhatsApp API setelah MVP stabil dan kebijakan moderasi/biaya jelas.
