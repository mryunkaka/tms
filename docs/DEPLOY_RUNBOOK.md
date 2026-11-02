# Runbook Deployment — Windows ke VPS Ubuntu

Dokumen ini menjelaskan deployment target ke VPS Ubuntu; go-live tetap menunggu Tahap 2/3 dan persetujuan bisnis. Untuk workstation Windows lokal, ikuti [`ops/windows/README.md`](../ops/windows/README.md).

## Lingkungan Windows lokal saat ini

- PostgreSQL 18.6 terpasang di `C:\Server\postgresql18`, data di `C:\Server\pgdata18`, service `postgresql-x64-18`, port 5432, loopback/SCRAM.
- API dan Next.js dikelola service NSSM `nodejs` (auto-start, bergantung pada PostgreSQL); Nginx existing `WebStack-Nginx` dipakai ulang dan meneruskan TMS pada `http://127.0.0.1:8085`.
- Port aplikasi langsung hanya loopback: web 3000, API 3001, PostgreSQL 5432. `.env` lokal di root repo di-ignore Git dan tidak boleh disalin ke report.
- Verifikasi lokal: homepage dan `/api/v1/health` merespons HTTP 200; PHP vhost 8081–8084 tetap merespons HTTP 200. Startup type telah dicek Automatic; laptop belum diuji dengan reboot fisik.
- `npm run db:backup:test` menguji pembuatan arsip dan daftar `pg_restore`. Restore drill lokal ke cluster terisolasi sudah lulus pada 2026-11-02, termasuk perbandingan row count 12 tabel publik; dump sementara masih perlu dihapus manual dari direktori TEMP. Ini bukti pemulihan lokal, bukan pengganti restore drill off-host/VPS sebelum go-live.

**TBD untuk VPS:** domain, alamat IP, storage backup luar server, RPO/RTO dan kebijakan refund. Jangan masukkan secret literal ke dokumen, shell history, Git, atau tiket.

## 1. Persiapan

- Siapkan VPS Ubuntu 24.04, DNS/domain, akses SSH key, alamat operator/admin, storage backup di luar VPS, dan estimasi kapasitas perjalanan.
- Pastikan disk tersedia (kira-kira hanya 28 GB tersisa pada server target): ukur image/build, DB, log dan retensi backup; tetapkan alert ruang kosong.
- Pasang Node.js v24 dari distribusi resmi/metode terkelola yang disetujui, PostgreSQL, Nginx, UFW, `certbot`/klien ACME, `git`, `curl`, `ca-certificates`, `postgresql-client`. Pasang Redis hanya saat Tahap 2 queue dibutuhkan.
- Buat akun service non-root `tms`; checkout release bertag ke `/srv/tms`; gunakan direktori release terpisah agar rollback memungkinkan.
- Buat DB/user aplikasi dengan hak minimum, password acak dari secret manager, koneksi lokal saja.

## 2. Firewall dan SSH

Gunakan console provider agar tidak kehilangan akses. Tambahkan aturan SSH dari IP administrator bila memungkinkan sebelum mengaktifkan firewall.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from ADMIN_PUBLIC_IP to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Konfigurasikan SSH key-only, `PermitRootLogin no`, `PasswordAuthentication no` setelah key diuji di sesi kedua. Jangan buka port 3000, 3001, 5432 atau 6379 ke publik. Bila alamat admin berubah, perbarui aturan 22 sebelum menghapus aturan lama.

## 3. PostgreSQL dan Redis

- Bind PostgreSQL ke loopback/Unix socket; `pg_hba.conf` hanya mengizinkan user app dari localhost dengan SCRAM. DB tidak memiliki superuser sebagai user runtime.
- DB production terpisah dari DB backup. Simpan credential melalui file environment terbatas atau secret manager.
- Ketika Redis aktif, bind `127.0.0.1`, autentikasi/ACL, tidak ada port publik; Redis bukan sumber kebenaran booking/payment.
- Jalankan migrasi Prisma sebagai langkah release sekali sebelum start app, dengan backup sebelum migrasi destruktif.

## 4. Environment dan deployment aplikasi

Siapkan `/etc/tms/api.env` dan `/etc/tms/web.env` melalui kanal rahasia. Owner `root:tms`, mode `0640` (atau lebih ketat sesuai systemd credential). Semua placeholder di bawah diisi dari sumber rahasia saat deployment, tidak disimpan ke Git. Validasi config tanpa mencetak nilainya.

```bash
sudo install -d -o root -g tms -m 0750 /etc/tms
sudo install -o root -g tms -m 0640 /dev/null /etc/tms/api.env
sudo install -o root -g tms -m 0640 /dev/null /etc/tms/web.env
```

Contoh deploy setelah repo membuat build script: fetch tag yang ditinjau, install dari lockfile (`npm ci`), build, migrasi DB, lalu alihkan symlink `/srv/tms/current` ke release. Nama script final masih **belum ada**.

## 5. systemd API

Simpan sebagai `/etc/systemd/system/tms-api.service` setelah build output dan entrypoint ditetapkan Tahap 1.

```ini
[Unit]
Description=TMS NestJS API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=tms
Group=tms
WorkingDirectory=/srv/tms/current/apps/api
Environment=NODE_ENV=production
EnvironmentFile=/etc/tms/api.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/tms
UMask=0027
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Nest harus bind `127.0.0.1:3001`, expose readiness/liveness yang tidak mengungkap rahasia. Tambahkan write path hanya bila memang diperlukan.

## 6. systemd web

Simpan sebagai `/etc/systemd/system/tms-web.service`. `next start` menjalankan Next server pada port yang diberikan env.

```ini
[Unit]
Description=TMS Next.js web
After=network.target tms-api.service

[Service]
Type=simple
User=tms
Group=tms
WorkingDirectory=/srv/tms/current/apps/web
Environment=NODE_ENV=production
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3000
EnvironmentFile=/etc/tms/web.env
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
UMask=0027
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Output build standalone/command final ditetapkan saat implementasi. Web server dan API hanya menerima proxy lokal; trust proxy diatur eksplisit agar header dari luar tidak dipalsukan.

Aktifkan service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tms-api.service tms-web.service
sudo systemctl status tms-api.service tms-web.service
journalctl -u tms-api.service -n 100 --no-pager
```

## 7. Nginx reverse proxy

Konfigurasi awal HTTP dipakai hanya untuk challenge ACME lalu redirect HTTPS. Web menerima halaman; `/api/` diteruskan ke API. Batasi body size, timeout upload, dan header sesuai request; jangan cache route admin/payment.

```nginx
server {
    listen 80;
    server_name DOMAIN;

    location /.well-known/acme-challenge/ { root /var/www/acme; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name DOMAIN;

    ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Jangan mengaktifkan HSTS preload sebelum subdomain HTTPS teruji. Tambahkan CSP/permissions policy yang kompatibel setelah nonce/alur Next.js dan widget pembayaran diperiksa.

## 8. Backup PostgreSQL dan retensi

**ASUMSI awal:** dump harian pukul 18:00 WITA, simpan 7 harian + 4 mingguan di storage terenkripsi off-host; review kapasitas dan biaya, lalu pemilik menyetujui RPO/RTO. Retensi/frekuensi final `TBD`.

Script backup di `/usr/local/sbin/tms-db-backup` dijalankan oleh service account terbatas. Contoh inti berikut perlu menambahkan upload storage off-host dan enkripsi menggunakan key yang disimpan di luar VPS sebelum produksi:

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_dir=/var/backups/tms
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
pg_dump --format=custom --no-owner --file="$backup_dir/tms-$stamp.dump" "$DATABASE_URL"
find "$backup_dir" -type f -name 'tms-*.dump' -mtime +8 -delete
```

Gunakan file env backup berizin ketat/`.pgpass`, bukan password di command line/cron. Timer systemd berjalan UTC agar konsisten; backup gagal memberi alert. Tambahkan weekly/monthly copy sebelum hapus berdasarkan retensi yang disepakati. Uji `pg_restore --list`, restore ke DB terisolasi, validasi count/relasi, ukur durasi dan dokumentasikan restore drill. Dump lokal saja tidak memenuhi backup off-host.

## 9. Go-live checklist

- [ ] Domain/DNS dan TLS auto-renew teruji; redirect HTTP→HTTPS.
- [ ] Kebijakan refund, konten/izin gambar, privacy notice, kontak admin dan data wajib disetujui.
- [ ] Admin awal aman dibuat; password kuat/MFA sesuai keputusan; refresh revocation diuji.
- [ ] Midtrans production account, callback URL, key production terpisah, status API/webhook signature dan VA/QRIS production test selesai; tidak ada sandbox secret di server prod.
- [ ] E-mail domain verifikasi, SPF/DKIM/DMARC, bounce/error handling dan kuota vendor diperiksa.
- [ ] Migration/rollback, atomic booking race, expiry, late payment, duplicate/out-of-order webhook, refund manual dan email retries diuji.
- [ ] UFW/SSH/port scan; PostgreSQL/Redis loopback; Nginx headers; service non-root; env permissions.
- [ ] Backup terenkripsi off-host berjalan dan restore drill lulus; RPO/RTO disetujui.
- [ ] Disk/log/database growth alert, uptime monitoring, health/readiness dan prosedur incident/contact tersedia.
- [ ] Google Search Console, Google Business Profile, sitemap dan robots ditinjau.
- [ ] Owner menerima laporan keamanan rilis dan menyetujui go-live; pencabutan/rollback plan siap.
