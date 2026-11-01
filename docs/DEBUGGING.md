# Protokol Debugging

Ikuti urutan ini untuk defect non-trivial; jangan mengubah beberapa hal sekaligus tanpa bukti.

1. **Reproduksi:** catat versi/commit, environment, waktu, langkah, input minimal, hasil aktual dan yang diharapkan. Lindungi PII.
2. **Kumpulkan bukti:** Pino log yang sudah redacted, stack trace, request/response (hapus cookie/token/PII), status DB/provider dan timeline UTC/WITA yang relevan.
3. **Hipotesis:** tulis penyebab yang mungkin dan satu eksperimen untuk membedakannya; ubah satu variabel setiap kali.
4. **Akar masalah:** ikuti data dari pemanggil ke shared code/provider/database; bedakan penyebab dari gejala. Untuk bug shared function, cari semua caller sebelum edit.
5. **Perbaiki minimum:** ubah lapisan sumber masalah, pertahankan validasi/error handling/authorization dan tambahkan `shortcut:` hanya jika sengaja menyederhanakan dengan batas dan rencana upgrade.
6. **Regresi:** tambahkan test yang gagal untuk bug sebelum perbaikan dan lulus setelah; test integrasi untuk DB, race, auth atau payment sesuai risiko.
7. **Catat:** isi baris baru di `docs/DEBUG_LOG.md` (tanggal, gejala, akar masalah, perbaikan, pencegahan, bukti/commit). Jangan mencatat secret/PII.

## Checklist error umum

- **CORS:** cek origin/port aktual (web 3000, API 3001), credentials, preflight methods/headers, dan konfigurasi origin. Hindari wildcard dengan cookie.
- **Cookie localhost:** hostname harus konsisten (`localhost` vs `127.0.0.1`); `Secure` hanya saat HTTPS lokal; periksa `SameSite`, path/domain, browser devtools dan trusted proxy. Jangan menonaktifkan CSRF sebagai jalan pintas.
- **Migrasi Prisma:** cek `DATABASE_URL` aktif, urutan migration/branch, schema drift dan generated client; backup DB sebelum tindakan reset. Jangan gunakan reset di database berisi data.
- **Koneksi database:** pastikan service hidup, host/port 5432, autentikasi/pg_hba, database/schema, pool exhaustion dan izin user minimum.
- **Port bentrok:** cek proses yang listen pada 3000/3001/5432/6379 dengan alat OS; jangan membunuh proses sebelum pemiliknya jelas.
- **Env tidak terbaca:** pastikan cwd, nama file, pemisahan web/API, variabel tidak ter-quote salah, validasi startup; jangan cetak nilainya untuk debug.
- **Windows vs Linux:** periksa separator/path case sensitivity, executable/shebang, line ending (LF), environment variable syntax dan perbedaan permission; gunakan npm script lintas platform.
- **Timezone:** log instant UTC dan nilai input/local WITA berdampingan; verifikasi tanggal kalender H-10/H-8/H-7 setelah konversi.
- **Kuota race:** reproduksi pada PostgreSQL dengan dua transaksi paralel; mock tidak membuktikan row locking/serialisasi.
- **Midtrans webhook:** cek request ID/order, signature verification dan Status API; jangan ubah state hanya dari log callback/urutan arrival.
