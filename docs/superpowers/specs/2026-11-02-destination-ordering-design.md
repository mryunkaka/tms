# Desain: Urutan Destinasi yang Dapat Diatur

## Tujuan

Admin/operator perlu menentukan urutan daerah dan destinasi pada navigasi/katalog tanpa perubahan kode. PRD mensyaratkan destinasi dapat diurutkan, sementara implementasi sekarang hanya mengurutkan nama secara alfabetis.

## Cakupan

- Simpan `sortOrder` bilangan bulat non-negatif pada setiap `Destination`.
- Admin dapat membaca dan mengubah urutan dari panel yang sudah ada.
- Daftar publik dan pohon destinasi mengikuti urutan naik, dengan nama sebagai pemecah nilai yang sama.
- Data lama dimigrasikan dengan nilai `0`; nilai sama mempertahankan determinisme alfabetis.

## Bukan Tujuan

- Drag-and-drop atau tombol geser yang menulis ulang banyak record.
- Pengurutan trip, jadwal, atau itinerary; relasi trip-destinasi sudah memiliki urutan tersendiri.
- Menghapus atau memindahkan data destinasi yang sudah ada.

## Pendekatan

1. **Kolom integer per destinasi (dipilih):** sederhana, dapat diubah melalui CRUD yang ada, serta mudah dipertahankan lintas parent/child. Nilai sama diselesaikan alfabetis.
2. Tombol naik/turun dan transaksi penggeseran banyak sibling: pengalaman lebih langsung, namun menambah mutasi multi-record dan aturan menangani tabrakan.
3. Tetap alfabetis: tanpa perubahan schema, tetapi tidak memenuhi urutan yang ditentukan operator.

Pilihan 1 paling sesuai struktur sekarang; urutan digunakan di setiap tingkat hierarki dan tidak mengubah urutan kunjungan trip.

## Batas dan Verifikasi

- Stack tetap Prisma/PostgreSQL, NestJS DTO/service, dan panel Next.js yang ada.
- Validasi server menolak nilai negatif/non-integer; default database `0` menjaga migrasi kompatibel.
- Tes membuktikan urutan sibling/tree, filter publik mempertahankan order, dan API admin menyimpan nilai yang diminta.
- Jalankan migrasi, lint, seluruh test, typecheck, build, audit keamanan, lalu cek route lokal.
