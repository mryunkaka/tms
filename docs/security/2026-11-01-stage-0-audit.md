# Audit Repo dan Audit Sumber Skill — Tahap 0

- Tanggal: 2026-11-01 (Asia/Singapore; aturan jadwal produk tetap WITA)
- Scope: seluruh file proyek Tahap 0, diff Git, sumber repo skill pada commit yang tercatat di `DECISIONS.md`.
- Metode: source/config inspection dan pencarian referensi filesystem, proses, environment, jaringan; tidak menjalankan hook, plugin, installer atau script pihak ketiga.
- Hasil: **tidak ditemukan perintah tersembunyi atau akses secret yang tidak dideklarasikan pada skill yang dipasang.** Ada fitur webhook opt-in pada komponen Ponytail yang tidak ikut dipasang; rinciannya di bawah.
- Batas: aplikasi belum ada, jadi audit runtime, dependency, concurrency, HTTP headers dan deployment belum dapat dijalankan. Jadwalkan ulang di Tahap 1–3.

## Inventaris hooks Ponytail

| File/konfigurasi | Apa yang dijalankan dan kapan | Jaringan | File di luar repo | Secret/env |
|---|---|---|---|---|
| `hooks/claude-codex-hooks.json` | Claude/Codex: saat SessionStart startup/resume/clear/compact menjalankan `ponytail-activate.js`; SubagentStart menjalankan `ponytail-subagent.js`; tiap UserPromptSubmit menjalankan `ponytail-mode-tracker.js`. | Tidak langsung. | Efek dari skrip yang dipanggil: plugin/user config path; lihat di bawah. | Menggunakan `CLAUDE_PLUGIN_ROOT` untuk mencari skrip. |
| `hooks/copilot-hooks.json` | Copilot: sessionStart → activate; userPromptSubmitted → mode tracker. Node dijalankan bila tersedia sesuai konfigurasi bash/PowerShell. | Tidak langsung. | Efek skrip seperti di bawah. | `PLUGIN_ROOT` mengarahkan plugin; skrip membaca flag/setting. |
| `hooks/cursor-hooks.json` | Cursor: sessionStart → activate; beforeSubmitPrompt → mode tracker. | Tidak langsung. | Efek skrip; pemasang manualnya menulis `.cursor/hooks.json`. | Path checkout diganti placeholder oleh script installer. |
| `hooks/qoder-hooks.json` | Qoder: UserPromptSubmit → mode tracker; PreToolUse `task|Task` → subagent injection. | Tidak langsung. | State/config user dan plugin seperti skrip di bawah. | `QODER_PLUGIN_ROOT` hanya untuk path plugin. |
| `hooks/ponytail-activate.js` | Saat session start; memilih mode, mengirim aturan skill/peta repo ke output host, menampilkan saran setup statusline. | Tidak ada request jaringan. | Membaca settings/flag host; dapat menyalin statusline ke config home dan membuat nudge flag di folder config Claude. Tidak menulis perintah yang disarankan ke settings otomatis. | Membaca `PONYTAIL_MAP`; helper config memakai `CLAUDE_CONFIG_DIR`, `PONYTAIL_DEFAULT_MODE`, quiet/status settings. Tidak membaca credential. |
| `hooks/ponytail-mode-tracker.js` | Tiap prompt; parsing `/ponytail` mode/default/band; menyuntik instruksi; mode band dapat dicatat. `/ponytail band import` eksplisit memulai importer detached. | Tidak ada request jaringan langsung. | Mode/config dan band flag dapat ditulis ke user config/plugin state; importer membaca transcript Claude dan menulis ledger user config. | Memakai host/plugin path env dan `PONYTAIL_DEFAULT_MODE` dkk; bukan secret API. |
| `hooks/ponytail-subagent.js` | Saat subagent/task dimulai; cocokkan type dan inject aturan yang aktif. | Tidak ada. | Membaca flag mode dari config/plugin state. | Membaca `PONYTAIL_SUBAGENT_MATCHER` regex dan variabel runtime host. Tidak membaca token/password. |
| `hooks/ponytail-config.js` | Helper sinkron dipanggil hook: pilih level, path config, set default. | Tidak ada. | Membaca/menulis `~/.config/ponytail`, `%APPDATA%/ponytail`, atau config Claude/Qoder sesuai env. | `XDG_CONFIG_HOME`, `APPDATA`, `CLAUDE_CONFIG_DIR`, `QODER_CONFIG_DIR`, `PONYTAIL_DEFAULT_MODE`, `PONYTAIL_QUIET_STARTUP`, `PONYTAIL_HIDE_STATUS`; bukan credential. |
| `hooks/ponytail-instructions.js` | Dipanggil hook untuk membaca SKILL dan memilih potongan instruksi menurut mode. | Tidak ada. | Hanya baca file skill dalam checkout plugin. | Tidak ada env rahasia. |
| `hooks/ponytail-map.js` | Dipanggil saat activate (kecuali mode review / `PONYTAIL_MAP=0`); gunakan `git ls-files` atau walk, baca awal file sumber repo dan hasilkan ringkasan symbol. | Tidak ada. | Membaca file dalam repo aktif; tidak membaca home/credential. | `PONYTAIL_MAP_CHARS` mengatur batas output. Memanggil executable lokal `git`. |
| `hooks/ponytail-runtime.js` | Helper bagi host: deteksi host, simpan/baca mode dan keluarkan format hook. | Tidak ada. | Menyimpan/membaca flag di plugin data atau host config (mis. `.claude`, `.cursor`, `.codebuddy`, `.qoder`, XDG). | Membaca env host untuk mendeteksi plugin path/data/session. Tidak membaca secret autentikasi. |
| `hooks/ponytail-band-import.js` | Hanya bila user menjalankan `/ponytail band import`; cari session JSONL Claude sebelumnya, hitung data ringkas lalu upsert CSV. | Tidak ada. | Membaca `~/.claude/projects` transcript dan menulis CSV ke XDG `ponytail/band`; memanggil `git rev-parse`. | `XDG_CONFIG_HOME`; membaca token/cost dari data usage/transcript, bukan API key. |
| `hooks/claude-band.json` + `hooks/band/register.tsx` | Modul band Claude: session.start, prompt.submit, tool.call, turn.complete, ui.render, session end dan command clear/resume/branch; catat metrik/tes/reuse, tampilkan UI/board. | `turn.complete` POST bila `webhookUrl` dikonfigurasi. HTTPS diwajibkan kecuali localhost; opsi `webhookToken` menjadi Bearer. Payload mencakup metrik sesi, nama proyek/task/model, biaya/token/waktu dan indikator tes; `sendNames=false` mengosongkan nama. Default `sendNames` adalah true ketika webhook dipakai. Ini fitur opt-in, tetapi mengirim metadata kerja ke host pilihan operator. | Baca file perubahan/transcript di project/session; tulis CSV dan `board.html` ke direktori config user; `openBoard` memanggil `cmd start`, `open`, atau `xdg-open` untuk membuka file lokal. | `HOME`, `USERPROFILE`, `CLAUDE_CONFIG_DIR`, `XDG_CONFIG_HOME`, `OS`; token webhook dari opsi plugin (bukan env). Token dipasang di header request. |
| `hooks/band/board.ts` | Parser, formatter dan renderer HTML/SVG untuk dashboard lokal, dipakai `register.tsx`. | Tidak ada sendiri; data network hanya alur webhook di atas. | Tidak melakukan file I/O sendiri; konten berasal dari CSV yang dibaca register. | Tidak membaca env/secret. |
| `hooks/band/metrics.ts` | Kalkulasi/parse metrik dan membentuk request webhook, dipakai band. | Membentuk request saja; caller mengirimkannya bila URL disetel. HTTP hanya loopback; selain itu HTTPS. | Tidak. | Menerima token webhook dari caller untuk header Authorization; tidak membaca env. |
| `hooks/band/logo.ts`, `hooks/band/types.d.ts` | Data logo dan deklarasi tipe untuk UI band. | Tidak. | Tidak. | Tidak. |
| `hooks/ponytail-statusline.ps1`, `hooks/ponytail-statusline.sh` | Script statusline yang disarankan pada startup; baca flag mode lalu cetak badge ANSI. | Tidak. | Baca flag di `CLAUDE_CONFIG_DIR` atau `~/.claude`; output ke terminal. | Baca `CLAUDE_CONFIG_DIR`; tidak baca secret. Di Windows contoh perintah hasil aktivasi memakai `powershell -ExecutionPolicy Bypass -File` untuk script badge lokal. Tidak dijalankan oleh audit ini; plugin belum dipasang. |

## Inventaris scripts Ponytail

| File | Pemicu dan aksi | Jaringan | File di luar repo | Secret/env |
|---|---|---|---|---|
| `scripts/build-openclaw-skills.js` | Manual; generate salinan SKILL di `.openclaw/skills/`. | Tidak. | Tidak; tulis di checkout. | Tidak. |
| `scripts/check-rule-copies.js` | Manual/CI; bandingkan AGENTS dan salinan aturan, cetak pass/fail. | Tidak. | Tidak. | Tidak. |
| `scripts/check-versions.js` | Manual/CI release; baca manifest versi dan banding tag GitHub bila tersedia. | Tidak. | Tidak. | Membaca `GITHUB_REF_TYPE`/`GITHUB_REF_NAME`; bukan secret. |
| `scripts/cursor-hooks.js` | Manual install/uninstall; merge/remove hook Ponytail di `.cursor/hooks.json` user atau project. | Tidak. | Ya, default `~/.cursor/hooks.json`; opsi `--project` menulis repo. Tidak menyentuh hook lain. | Membaca `process.argv`, homedir dan config JSON; tidak membaca credential. |
| `scripts/publish-openclaw-skills.js` | Manual publish/dry-run; panggil CLI `clawhub skill publish` untuk unggah semua skill. | Ya, mengunggah ke ClawHub saat dijalankan. | Membaca package/skill checkout; CLI dapat memakai login token ClawHub yang disimpan oleh CLI. | Memakai auth yang dikelola CLI, meneruskan argumen; menjalankan command shell. Tidak dijalankan. |
| `scripts/uninstall.js` | Manual uninstall cleanup; hapus hanya state Ponytail yang dikenal dan edit entri statusline miliknya. | Tidak. | Ya: menghapus flag/config/statusline/CSV state Ponytail pada home/config, mengedit `settings.json` Claude/Cursor. Operasi destruktif memang tujuan uninstaller. | Memakai `XDG_CONFIG_HOME`, `CODEBUDDY_CONFIG_DIR`, `CLAUDE_CONFIG_DIR`, `QODER_CONFIG_DIR`, `HOME/APPDATA`; bukan secret. Tidak dijalankan. |

## Commands dan manifest

- `commands/*.toml`: enam definisi prompt (`ponytail`, `review`, `audit`, `debt`, `gain`, `help`) yang hanya aktif saat user memanggil command. Command review/audit/debt menyuruh agent membaca/melaporkan; tidak ada executable shell atau network endpoint di TOML. `ponytail-gain` menampilkan benchmark owner claim; kami tidak memakai klaim itu untuk keputusan.
- `.codex-plugin/plugin.json`: manifest menunjuk `./skills/` dan `./hooks/claude-codex-hooks.json`; plugin penuh akan mengaktifkan lifecycle di atas. Folder manifest dan adapter tidak disalin.
- `INSTALL.md` dan `after-install.md` menyebut langkah instalasi/integrasi berbagai host. Tidak dijalankan. `after-install.md` menjelaskan aktivasi manual Hermes, bukan bagian skill yang disalin.

## Penilaian risiko dan keputusan

- Tidak ada akses jaringan, pencarian secret file, atau perintah tersembunyi pada `SKILL.md` Karpathy maupun Ponytail yang dipasang.
- Fitur webhook band bukan tersembunyi: memerlukan URL/tokennya dikonfigurasi, dan payload sensitif terhadap metadata repo/task. Hindari memasang plugin penuh pada repo pribadi tanpa memutuskan apakah ingin mengirim metadata tersebut. Sesuai permintaan, hanya `SKILL.md` yang dipasang.
- Importer transcript dan uninstaller berjalan hanya melalui pemanggilan eksplisit; tidak dipasang/dijalankan.
- Audit ini tidak mengeksekusi satu pun file dari kedua clone. Clone sementara dibersihkan setelah commit skill.

## Audit dokumen/proyek

- Repo masih hanya berisi dokumentasi, konfigurasi Git, env example dan instruksi; belum ada package manifest, dependency atau kode aplikasi.
- Status/port/role/tahap, timezone, state booking, guest assumption, test cases dan dokumentasi keamanan dicocokkan lintas dokumen. PRD dan test plan menutup race kursi terakhir, expiry, webhook ganda/late/out-of-order, payment after expiry, pelunasan terlambat, operator schedule change/refund.
- `git diff --check`: lulus untuk perubahan yang ditinjau.
- Lint/build/unit/integration/e2e/npm audit: belum tersedia karena Stage 0 tidak membuat aplikasi/dependencies.

## Addendum review perubahan cakupan daerah — 2026-11-01

- Atas permintaan pemilik, katalog kini menyebut daerah yang dapat dikelola admin; Kotabaru hanya data awal, satu operator tetap batas MVP.
- PRD, alur bisnis, design brief, arsitektur, keputusan, test plan, README, AGENTS, TODO dan changelog dicocokkan untuk relasi hierarki daerah, filter area induk/anak, trip multi-destinasi, halaman SEO dan acceptance tests.
- `git diff --check`: lulus. Tidak ada kode/runtime yang ditambahkan; audit aplikasi tetap belum tersedia.
