# Alur Bisnis TMS

KONTEKS
Wisatawan bingung memilih trip ke berbagai daerah yang tersedia. Mereka mencari di Google, menemukan situs ini, memilih daerah (Kotabaru, Kalimantan Selatan adalah daerah awal), membandingkan jadwal yang cocok, lalu booking dan membayar. Admin dapat mengatur hierarki daerah dan destinasi tanpa perubahan kode, lalu mengaitkan satu atau beberapa destinasi ke trip. MVP melayani SATU operator (trip milik sendiri). Di luar MVP: marketplace multi-operator, tiket pesawat atau hotel dari pemasok, akun agen, WhatsApp API, review, voucher.

PARAMETER BISNIS (ASUMSI, simpan sebagai konfigurasi, bukan hardcode)
- DP 30% dari total
- Kursi ditahan 2 jam setelah booking; jika DP belum dibayar, booking kedaluwarsa dan kuota dikembalikan
- Pelunasan paling lambat H-7 sebelum berangkat; pengingat di H-10 dan H-8. Jika booking dibuat kurang dari 7 hari sebelum berangkat, wajib bayar penuh
- Kuota minimum open trip: jika belum tercapai pada H-5, admin memutuskan jalan, tunda, atau batal; peserta ditawari pindah jadwal atau refund
- Pembatalan dan refund: diproses manual oleh admin; aturan persentase TBD (tanyakan ke pemilik bisnis)
- Zona waktu WITA (Asia/Makassar), simpan UTC; mata uang IDR bilangan bulat
- Midtrans: satu transaksi per pembayaran, dengan order_id unik (mis. KODEBOOKING-DP dan KODEBOOKING-PELUNASAN); masa berlaku VA/QRIS disamakan dengan batas waktu penahanan

ALUR CUSTOMER (persona: Rina)
1. Mencari trip ke daerah yang diinginkan (misalnya Kotabaru atau Bali) di Google dan membuka situs/halaman daerah.
2. Memilih daerah lalu melihat daftar trip yang bisa difilter berdasarkan tanggal, durasi, budget, dan destinasi. Kartu trip menampilkan daerah/destinasi, harga, jadwal terdekat, dan sisa kursi.
3. Membuka detail trip: itinerary, include/exclude, titik kumpul, syarat dan kebijakan pembatalan, serta jadwal lain untuk trip yang sama.
4. Memilih jadwal, mengisi jumlah dan data peserta, lalu menekan Booking. Kursi ditahan sementara.
5. Membayar DP via Virtual Account atau QRIS. Midtrans memberi tahu sistem, status berubah, dan kuota resmi berkurang.
6. Menerima konfirmasi email dan tautan WhatsApp ke admin.
7. Menerima pengingat pelunasan, lalu membayar sisanya.
8. Setelah lunas menerima info akhir (titik kumpul dan jam), lalu berangkat.
Customer juga bisa mengecek status booking lewat kode booking. TBD: booking tanpa registrasi akun (guest) dengan email dan nomor telepon, untuk memperkecil hambatan.

ALUR ADMIN
- Membuat hierarki daerah/destinasi dan trip; mengatur satu atau beberapa destinasi untuk trip, jadwal, kuota, harga, dan kuota minimum.
- Memantau booking dan status pembayaran secara langsung.
- Mengekspor daftar peserta (manifest) untuk keperluan lapangan.
- Menangani pembatalan, perubahan jadwal, dan refund secara manual, dengan jejak audit.

STATUS BOOKING (usulan, finalkan di PRD sebagai state machine eksplisit; hanya transisi yang sah)
PENDING_DP -> DP_PAID -> PAID_IN_FULL -> COMPLETED
Cabang: EXPIRED (DP tidak dibayar), CANCELLED (oleh customer atau admin), REFUND_PENDING -> REFUNDED

KASUS KHUSUS (wajib ada di PRD dengan acceptance criteria dan di TEST_PLAN sebagai skenario test)
- Kursi terakhir diperebutkan dua orang: gunakan transaksi database dengan penguncian agar kuota tidak negatif
- Booking kedaluwarsa: tugas terjadwal (penjadwal NestJS, tanpa Redis di Tahap 1) mengembalikan kuota
- Webhook Midtrans ganda, terlambat, atau urutannya terbalik: idempoten, verifikasi signature, cek status ke API Midtrans
- Pembayaran masuk setelah booking kedaluwarsa: tandai untuk ditangani admin
- Pelunasan terlambat: pengingat, lalu pembatalan sesuai kebijakan
- Jadwal diubah atau dibatalkan oleh operator: peserta memilih pindah jadwal atau refund
- Perubahan jumlah peserta setelah booking: TBD (default MVP: batalkan dan booking ulang)

PENCARIAN DAN SEO
- Halaman: beranda, daftar trip dengan filter, detail trip, halaman daerah/destinasi (mis. Kotabaru atau Bali), artikel panduan, cek status booking
- Dirender di server (SSR/SSG), metadata unik per halaman, URL ramah (slug), sitemap.xml, robots.txt, data terstruktur schema.org (JSON-LD), gambar pratinjau Open Graph untuk dibagikan di WhatsApp dan Instagram, performa mobile yang baik
- Jangan mengarang fakta tentang destinasi. Tandai "TBD: diisi pemilik bisnis" untuk konten yang belum ada
- Masukkan ke TODO sebagai tugas non-kode: Google Search Console dan Google Business Profile

NOTIFIKASI MVP
- Email transaksional (konfirmasi booking, DP diterima, pengingat pelunasan, pelunasan diterima, info keberangkatan). Penyedia email TBD: pilih opsi gratis atau murah dan catat di DECISIONS.md
- WhatsApp hanya tautan click-to-chat ke admin

ENTITAS UTAMA (usulan)
User, Role, Destination (daerah bertingkat dengan parent_id), TripDestination (relasi trip dan banyak destinasi, termasuk urutan serta destinasi utama), Trip, TripSchedule (tanggal berangkat, kuota, harga), Booking, Participant, Payment (jenis DP/PELUNASAN, order_id Midtrans, status), Notification, AuditLog
