# Keamanan

## Ruang lingkup dan model ancaman

Aset utama: kredensial admin/session, email/telepon dan data peserta, status/kuota booking, transaksi Midtrans dan refund, serta availability satu VPS. Ancaman: credential stuffing/akun takeover, IDOR lintas booking, injeksi/XSS/CSRF, oversell race, webhook palsu/replay/urutan terbalik, secret bocor, salah konfigurasi server/backup, kompromi dependency, dan penyalahgunaan export manifest.

Asumsi: hanya satu operator dan satu VPS awal; internet publik mencapai Nginx; DB/Redis loopback; data kartu tidak pernah disimpan (hosted payment flow Midtrans). Analisis diperbarui saat desain auth/payment dan sebelum go-live.

## Checklist OWASP Top 10:2025

Gunakan kategori terbaru yang dirilis, bukan daftar lama. Checklist khusus TMS:

| Risiko | Kontrol yang harus diverifikasi |
|---|---|
| A01 Broken Access Control | RBAC guard server-side; ownership check untuk tiap booking; admin-only manifest/refund; deny-by-default. |
| A02 Security Misconfiguration | Helmet, CORS allowlist, cookie flags, no debug/stack traces, port DB/Redis tertutup, TLS/Nginx header. |
| A03 Software Supply Chain Failures | lockfile; dependency update review; npm audit; secret/dependency scanning; provenance dan akses CI terbatas. |
| A04 Cryptographic Failures | TLS; password/hash/token kuat; secrets tidak log; backup terenkripsi; minimisasi data sensitif. |
| A05 Injection | DTO/class-validator allowlist; Prisma parameterized access; output encoding; query order/filter allowlist; tidak merangkai SQL/command mentah. |
| A06 Insecure Design | threat model; rate limit; state machine eksplisit; DB locking; idempotency; abuse/race tests sebelum payment. |
| A07 Authentication Failures | Argon2id/bcrypt; login rate limit; refresh rotation/reuse revoke; session revoke; generik error; MFA admin diputuskan go-live. |
| A08 Software or Data Integrity Failures | validasi webhook dan status API Midtrans; signature dan replay handling; integrity checks backup/migrations; audit log. |
| A09 Security Logging and Alerting Failures | security event, login, role, refund, capacity and webhook anomalies logged; redaction; alert & retention. |
| A10 Mishandling of Exceptional Conditions | safe transaction rollback; fail closed; no partial state; provider timeout/retry bounded; error response tidak membocorkan internals. |

## ASVS baseline

Gunakan **OWASP ASVS 5.0.0** sebagai checklist verifikasi aplikasi web; target awal Level 2 untuk autentikasi, authorization, session, validasi, API, file/export, logging, konfigurasi dan kriptografi. Tandai applicable/not applicable beserta bukti; jangan mengklaim sertifikasi. Persyaratan pembayaran dan infrastruktur diperiksa tambahan. Nomor requirement dicatat saat implementasi berdasarkan edisi 5.0.0 dan diverifikasi ulang terhadap sumber resmi.

Referensi resmi: [OWASP Top 10:2025](https://top10.owasp.org/2025/) dan [OWASP ASVS 5.0.0](https://asvs.owasp.org/).

## Aturan implementasi

### Authentication, session, RBAC

- Password hash Argon2id (default) atau bcrypt dengan konfigurasi cost saat ini; verifikasi upgrade hash; no password reset flow tanpa token sekali pakai dan expiry.
- Rate limit login dan endpoint sensitif berdasarkan IP + identitas tanpa membuka enumerasi akun; lockout adaptif, jangan membuat denial permanen sederhana.
- Access JWT pendek. Refresh acak, hash di database, cookie `httpOnly`, `Secure` HTTPS, `SameSite`, rotasi atomik, revoke saat logout/reset/reuse.
- Role dan izin diperiksa di API setiap request. `AGENT` tanpa fitur MVP tetap deny-by-default. Customer lookup mengikat code dan faktor kontak serta membatasi percobaan.
- Cookie session memerlukan Origin/CSRF protection untuk mutasi; CORS origin eksplisit, credentials hanya bila diperlukan.

### Validasi dan web

- NestJS DTO + `class-validator`/transform whitelist; reject property tambahan untuk endpoint sensitif; batas ukuran body dan format/length.
- Prisma query parameterized; `$queryRawUnsafe` dilarang kecuali security-reviewed dan parameterized. Allowlist sort/filter fields.
- React escaping standar; jangan gunakan raw HTML tanpa sanitizer dan review. CSP sesuai Next.js nonce/arsitektur; Helmet pada API/Nginx; HTTPS HSTS setelah TLS stabil.
- CORS hanya origin web yang dikonfigurasi, methods/headers minimum, preflight diuji.
- Output error generik; stack trace hanya log internal yang sudah direduksi.

### Pembayaran Midtrans dan webhook

- Simpan server key hanya di env server; jangan kirim ke browser/log. Mulai sandbox; akun produksi/domain/credential terpisah.
- Verifikasi signature notification menggunakan algoritme/provider fields resmi, constant-time compare jika sesuai, validasi nilai dan order ID.
- Deduplicate event/order transaction dengan unique constraints; simpan event ID/hash/status dan process outcome.
- Panggil Status API Midtrans sebelum mutasi state; jangan percaya body webhook sendirian. Kondisikan state transition agar status lama/late event tidak meregresi.
- Booking `EXPIRED` yang terbayar ditandai anomaly untuk admin, jangan otomatis alokasikan kursi/refund.
- Jangan pernah simpan PAN/CVV. Checkout hosted Snap/VA/QRIS; simpan hanya reference, amount, channel dan status yang diperlukan.

### Privasi, audit, log

- Kumpulkan data minimum tiap peserta; manifest hanya admin dan hanya data lapangan perlu. Batasi export, audit siapa/apa/kapan, jangan menaruh PII di URL atau log.
- Retensi, dasar pemrosesan, permintaan akses/hapus dan kebijakan breach `TBD` sebelum produksi.
- Pino redact password, Authorization, Cookie/Set-Cookie, token, server key, signature, contact/participant fields. Gunakan reference ID untuk tracing.
- Audit log append-oriented untuk role, booking, kapasitas, status payment/refund dan perubahan trip; jangan menyimpan rahasia di diff before/after.

### Secret, dependency, server

- `.env` ignored; secret hanya secret store/file izin ketat di server; rotasi bila terungkap. `.env.example` tidak berisi nilai.
- `npm audit` saat dependency berubah dan sebelum rilis; review advisories dengan lockfile; pembaruan berkala tiap bulan dan segera untuk kerentanan kritis. **TBD:** siapa pemilik rutin dan cadence patch.
- Secret scanning gitleaks pada local/CI sebelum merge; history cleanup dan rotasi bila temuan secret.
- VPS: UFW allow 22 (dibatasi IP bila memungkinkan), 80, 443; SSH key-only, disable root/password login setelah akses diverifikasi; PostgreSQL/Redis bind `127.0.0.1`; patch OS; service user non-root; file env `0600`; Nginx TLS; backup off-host terenkripsi; disk/log alert.

## Prosedur Cek Keamanan

Jalankan pada tiap rilis dan setelah perubahan auth, booking, payment atau infrastruktur. Simpan laporan salinan dari [`security/REPORT_TEMPLATE.md`](security/REPORT_TEMPLATE.md) sebagai `docs/security/YYYY-MM-DD-release-<versi>.md`.

1. Catat commit, versi app/runtime/dependency dan scope; review threat model serta perubahan data/akses.
2. Jalankan lint, unit/integration/e2e yang tersedia, `npm audit`, secret scanner (misalnya gitleaks), dan migration check; catat versi alat serta hasil. Jangan mengirim report/secret di log publik.
3. Review RBAC/IDOR, auth cookie/refresh/revocation/rate limit, DTO, CORS/Helmet/CSRF/XSS dan redaction.
4. Uji atomicity kapasitas/expiry, webhook bad signature/duplicate/late/out-of-order, Status API reconciliation, payment post-expiry dan refund manual di sandbox.
5. Review konfigurasi deployment: TLS, UFW/SSH, DB/Redis loopback, service non-root, env permissions, backup destination/retention/encryption, log rotation/disk space.
6. Jalankan restore drill terjadwal sebelum go-live dan catat durasi/data point-in-time yang tercapai.
7. Catat temuan severity, reproduksi/bukti, mitigasi, owner dan target; rilis tidak boleh mengabaikan P0/P1 tanpa persetujuan/mitigasi owner yang terdokumentasi.

Rilis saat ini Tahap 0: belum ada aplikasi/dependency, sehingga pemeriksaan eksekusi aplikasi belum tersedia; periksa dokumen, ignore rules, dan isi repo manual.
