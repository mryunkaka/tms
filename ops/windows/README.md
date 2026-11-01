# TMS di Windows

Konfigurasi ini memakai Node.js 24 yang sudah ada di `C:\Server`, PostgreSQL 18 lokal, Nginx yang sudah melayani situs PHP, dan satu NSSM service baru bernama `nodejs`. Service Nginx yang telah ada (`WebStack-Nginx`) dipakai ulang agar tidak membuat proses yang berebut port. Situs TMS hanya tersedia pada laptop melalui `http://127.0.0.1:8085`.

## Instalasi awal

1. Jalankan `C:\Server\installers\postgresql-18.6-5-windows-x64.exe` dengan **Run as administrator**. Gunakan direktori data lokal pada drive yang memiliki ruang cukup, port `5432`, dan password superuser `postgres` yang hanya Anda ketahui. Pertahankan `listen_addresses=localhost`; jangan membuka port database di firewall.
2. Buat role dan database aplikasi dari `psql` sebagai `postgres`:

   ```sql
   CREATE ROLE tms_app LOGIN;
   \password tms_app
   CREATE DATABASE tms OWNER tms_app;
   ```

   Perintah `\password` meminta password tanpa menaruhnya dalam SQL command. Simpan password itu untuk `DATABASE_URL` di bawah.
3. Isi `.env` pada root repo dan jangan commit file tersebut. Gunakan `NODE_ENV=production`, `API_PORT=3001`, `WEB_ORIGIN=http://127.0.0.1:8085`, `DATABASE_URL=postgresql://tms_app:<password-URL-encoded>@127.0.0.1:5432/tms`, `JWT_ACCESS_SECRET` acak sepanjang sedikitnya 64 karakter, serta `INITIAL_ADMIN_EMAIL` dan `INITIAL_ADMIN_PASSWORD` milik Anda (minimal 12 karakter). URL-encode karakter khusus password database.
4. Dari root repo, bangun aplikasi dengan Node/npm di `C:\Server`:

   ```powershell
   $env:Path = "C:\Server\node-v24.22.1-win-x64;$env:Path"
   npm ci
   npm run build
   ```

5. Buka PowerShell **Run as administrator**, pindah ke root repo, lalu jalankan:

   ```powershell
   .\ops\windows\register-services.ps1
   ```

Skrip mengaktifkan auto-start PostgreSQL dan Nginx, memasang migrasi Prisma dan admin awal, menambah virtual host TMS ke konfigurasi Nginx dengan backup, lalu mendaftarkan service NSSM `nodejs` yang bergantung pada PostgreSQL. Log Node ada di `C:\Server\tms\logs`. PHP/Nginx virtual host pada port `8081–8084` tidak diubah.

Jika pemasangan PostgreSQL berjalan di mesin berbeda atau path `C:\Server` berubah, sesuaikan konstanta path dalam skrip sebelum menjalankannya.
