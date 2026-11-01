# Catatan Keputusan Teknis (ADR)

> Catatan bertanggal 2026-11-01. Tinjau ulang harga/ketentuan vendor dan versi teknologi tepat sebelum implementasi karena dapat berubah.

## Stack aplikasi

| Keputusan | Alasan | Alternatif yang tidak dipilih sekarang |
|---|---|---|
| Next.js + React + TypeScript untuk web; SSR/SSG | SEO halaman destinasi/produk dan UI mobile dapat satu stack TypeScript. | SPA client-only kurang cocok untuk kebutuhan SEO; framework lain tidak sesuai permintaan. |
| Tailwind CSS + shadcn/ui | Styling utility dan komponen yang dapat dikustomisasi tanpa design system vendor terkunci. | UI kit penuh akan menambah dependensi/overhead sebelum kebutuhan terlihat. |
| NestJS + TypeScript API | Modul, DTO, guards/RBAC dan scheduler bawaan sesuai batas domain backend. | Backend Next.js menyatukan lapisan web/API, namun di sini API dan pembayaran diminta terpisah. |
| Prisma + PostgreSQL | Relasi transaksi kuat dan migrasi typed untuk booking/kuota/pembayaran. | ORM/query builder lain tidak memberi keuntungan cukup untuk kebutuhan awal; database dokumen tidak cocok untuk konsistensi kapasitas. |
| JWT access + refresh cookie httpOnly, hash & rotasi | Browser dapat menyimpan refresh secara aman dari JavaScript; sesi dapat dicabut. | Token panjang di localStorage meningkatkan dampak XSS. |
| Pino ke stdout | Logging JSON efisien, mudah diambil systemd/journald. | Menulis log aplikasi sendiri ke disk memperbesar risiko disk penuh dan secret tertinggal. |
| Midtrans sandbox lalu produksi | Payment lokal sesuai kebutuhan VA/QRIS dan status transaksi. | Payment gateway lain tidak diminta; integrasi langsung bank tidak praktis untuk MVP. |
| Node.js v24; Ubuntu 24.04, Nginx + systemd | Versi dan target server mengikuti kebutuhan proyek; service sedikit dan mudah dioperasikan. | Kubernetes/container orchestration terlalu berat untuk satu VPS awal dan disk terbatas. |
| Redis + BullMQ mulai Tahap 2 | Tahap 1 cukup memakai Nest scheduler dan DB; queue dipakai saat retry/worker memang diperlukan. | Memasang Redis sejak awal menambah service/dependensi lokal tanpa manfaat MVP inti. |
| Uptime Kuma awal; Prometheus/Grafana Tahap 3 | Monitoring ringan mendahului observability yang lebih lengkap. | Stack monitoring penuh pada server kecil berisiko menambah beban/disk terlalu cepat. |

## PostgreSQL lokal dan Redis

**Keputusan:** pada laptop Windows gunakan installer resmi PostgreSQL, bukan Docker Compose. Pemeriksaan 2026-11-01 tidak menemukan `docker`, `psql`, `postgres`, `node`, atau `npm` pada PATH. Installer PostgreSQL paling sederhana untuk database tunggal Tahap 1 dan menghindari ketergantungan Docker; jalankan database lokal/loopback dan jangan ubah service laptop secara otomatis. PostgreSQL belum dipasang oleh pekerjaan ini. Redis ditunda sampai Tahap 2; pilihan runtime lokal (Docker/WSL/distribusi kompatibel) diputuskan saat kebutuhan queue nyata dan lingkungan diperiksa.

## Email transaksi

**Keputusan awal:** gunakan Resend API dan free tier untuk sandbox/pilot volume rendah, dibungkus di adapter `NotificationsModule`; jangan mengunci model data ke SDK provider. Harga/limit yang tampil pada situs resmi ketika dicek 2026-11-01: paket gratis mencantumkan 3.000 email/bulan dan batas 100/hari. Ini bukan jaminan deliverability atau kelayakan produksi; verifikasi domain, pemrosesan data, batas akun, dan harga ulang sebelum kirim data customer/produksi. Alternatif: Brevo memiliki free plan dan menyebut 300 email per hari serta dukungan transactional email; tidak dipilih awal karena integrasi Resend lebih langsung untuk kebutuhan developer API.

Referensi resmi: [Resend pricing](https://resend.com/pricing), [Brevo pricing plans](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans).

## Skill Karpathy

- Sumber: https://github.com/duolahypercho/andrej-karpathy-skills
- Tanggal clone/review: 2026-11-01
- Commit sumber: `c2771d3ad0fd46f71d06fd9853cd6b0ad987737f`
- Metode: clone sementara di `%TEMP%`, tidak menjalankan skrip. Membaca `skills/andrej-karpathy-skill/SKILL.md`, `AGENTS.md`, dan `instruction.md`; menyalin hanya `skills/andrej-karpathy-skill/` ke `.agents/skills/andrej-karpathy-skill/`.
- Pemeriksaan lokasi: dokumentasi Codex terpasang pada komputer ini menyebut `~/.agents/skills/` sebagai alias lintas-runtime yang dikenali Codex/Copilot/Gemini; dipilih lokasi proyek `.agents/skills/` sesuai scope repo.
- Hasil tinjauan: tidak ada instruksi akses jaringan, secret, atau perintah tersembunyi pada tiga file yang dibaca. Prinsip empat poin digabungkan ke `AGENTS.md` tanpa menimpa isi repo.

## Skill Ponytail

- Sumber: https://github.com/dietrichgebert/ponytail
- Tanggal clone/review: 2026-11-01
- Commit sumber: `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846`
- Metode: clone sementara di `%TEMP%`, tidak menjalankan skrip. Membaca file wajib (`skills/ponytail/SKILL.md`, `AGENTS.md`, `INSTALL.md`, `after-install.md`), seluruh isi `hooks/`, `scripts/`, `commands/`, `.codex-plugin/`; menyalin hanya `skills/ponytail/SKILL.md` ke `.agents/skills/ponytail/`. Tidak menggunakan `codex plugin add`, tidak memasang adapter, dan tidak mempercayai/menjalankan lifecycle hook.
- Pemeriksaan: hooks otomatis memanggil Node saat startup/prompt/subagent; membaca input JSON/konfigurasi, beberapa hook membuat flag/config/statusline dan peta ringkas repo. Importer opsional membaca transcript sesi lokal dan menulis CSV. Hooks/komponen `band` dapat mengirim metrik sesi ke URL webhook jika operator mengonfigurasikan fitur itu. Skrip manual termasuk pemasang Cursor hooks yang menulis konfigurasi user/proyek, uninstaller yang menghapus state ponytail di direktori home, dan publisher OpenClaw yang memanggil `clawhub` via shell untuk unggah. Perilaku ini bersifat eksplisit pada plugin/script, tidak ada di folder skill yang dipasang; tidak ada bukti pencurian secret atau perintah tersembunyi pada berkas yang diwajibkan.
- Prinsip kerja proyek menggunakan level `full`. Jangan menggunakan `ultra` untuk auth, pembayaran, webhook Midtrans atau keamanan.
- Klaim benchmark README adalah klaim pemilik; tidak menjadi dasar keputusan teknis.

## Batas operasional

- Parameter bisnis DP, hold, minimum pax, timezone dan kebijakan disimpan sebagai konfigurasi; aturan default sumber kebenarannya `BUSINESS_FLOW.md`.
- Timestamp DB UTC; tampilan/batas kalender bisnis `Asia/Makassar`; IDR integer.
- Belum ada keputusan final target availability, RPO/RTO, retensi PII, kebijakan refund atau akun guest; lihat pertanyaan terbuka PRD.
