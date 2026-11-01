# Panduan Commit

## Format

Gunakan Conventional Commits:

```text
type(scope): ringkasan imperatif maksimal 72 karakter
```

Jenis yang dipakai: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `security`. Scope opsional, ringkasan dalam bahasa Inggris, bentuk imperatif, huruf kecil setelah titik dua, tanpa titik penutup. Tambahkan body bila alasan atau dampak tidak jelas dari subject.

Satu commit memuat satu tujuan yang dapat ditinjau. Jangan commit `.env`, secret, kredensial, atau data pribadi nyata. Gunakan nama branch `feat/...`, `fix/...`, atau `docs/...` sesuai perubahan.

## Pemeriksaan sebelum commit

1. Periksa `git diff --check`, `git status`, dan isi diff yang akan di-commit.
2. Jalankan lint dan test yang tersedia. Jika proyek belum memiliki skrip atau perubahan hanya dokumentasi, nyatakan bahwa pemeriksaan aplikasi belum tersedia dan lakukan pemeriksaan manual dokumen/diff.
3. Sebelum setiap commit lakukan `/ponytail-review`. Hanya skill manual yang dipasang pada proyek ini, jadi gunakan checklist berikut dan catat temuan penting di catatan sesi atau `docs/DEBUG_LOG.md`:
   - Apakah perubahan punya bug atau salah memenuhi kebutuhan?
   - Adakah risiko keamanan, kebocoran data, atau kehilangan data?
   - Apakah ada beban/kerumitan nyata yang tidak diperlukan?
   - Apakah perilaku penting belum memiliki test?
   - Adakah bagian yang dapat dihapus tanpa mengurangi kelengkapan?
4. Stage hanya file untuk tujuan commit tersebut dan periksa staged diff.

## Contoh

Baik:

- `chore: init repository`
- `docs: add booking requirements`
- `fix(auth): rotate refresh tokens`

Buruk:

- `update stuff` — tujuan dan jenis tidak jelas.
- `feat: Added many things.` — bentuk lampau, kapitalisasi, dan cakupan kabur.
- `docs: update docs and code` — mencampur tujuan.

Tidak ada remote yang dikonfigurasi/diizinkan untuk push pada Tahap 0. Push memerlukan izin eksplisit.
