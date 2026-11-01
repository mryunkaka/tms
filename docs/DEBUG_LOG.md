# Log Debugging

| Tanggal (WITA) | Commit/versi | Gejala dan langkah reproduksi | Akar masalah | Perbaikan | Pencegahan/test regresi | Catatan aman |
|---|---|---|---|---|---|---|
| 2026-11-01 | `089586d` | API keluar saat service NSSM mulai; log Nest menampilkan `No driver (HTTP) has been selected`. | npm meletakkan `@nestjs/platform-express` di `apps/api/node_modules`, sedangkan `@nestjs/core` ter-hoist di root dan dynamic import adapter dari core tidak menemukan dependency workspace yang bersarang. | API membuat `ExpressAdapter` eksplisit saat `NestFactory.create`; build ulang dan health/login HTTP lokal berhasil. | Verifikasi production build, health endpoint, dan login admin saat menjalankan API dari NSSM. | Tidak mengubah dependency atau membuka port non-loopback. |
