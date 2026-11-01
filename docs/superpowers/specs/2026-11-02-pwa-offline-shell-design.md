# Desain: Shell Offline PWA

## Tujuan

Memenuhi skenario PWA-01 dengan menyediakan halaman shell berbahasa Indonesia ketika navigasi gagal karena offline, tanpa menyimpan halaman/data aplikasi yang dapat usang atau memuat informasi booking/admin.

## Pendekatan

1. **Service worker network-first dengan fallback statis (dipilih):** pre-cache hanya `offline.html`; semua navigasi mencoba jaringan, lalu mengembalikan shell offline. API, POST, aset, dan respons dinamis tidak dicache.
2. Cache halaman publik: lebih banyak konten tersedia offline tetapi jadwal/kuota bisa usang dan perlindungan data menjadi lebih sulit.
3. Tanpa service worker: mempertahankan installable manifest saja, tetapi tidak memenuhi PWA-01.

Pilihan 1 memenuhi kebutuhan shell sambil menjaga keputusan booking tetap membutuhkan jaringan dan API langsung.

## Cakupan dan Acceptance

- Daftarkan service worker hanya pada production build.
- Cache berisi satu-satunya `/offline.html`; saat navigasi gagal, termasuk `/admin`, tampilkan shell offline generik.
- Request API (termasuk navigasi dokumen ke `/api`), non-navigasi, dan seluruh metode selain GET tidak dicegat atau disimpan.
- Halaman fallback berdiri sendiri tanpa font, gambar, stylesheet, atau script jaringan.
- Tes menjalankan worker asli dalam VM dengan Cache API/fetch palsu dan memverifikasi install, offline fallback, serta bypass POST API.

## Bukan Tujuan

- Menyajikan katalog, jadwal, kuota, booking, admin atau pembayaran saat offline.
- Background sync, push notifications, atau retry booking.
