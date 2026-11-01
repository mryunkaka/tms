# Tahap 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Siapkan monorepo TypeScript, PostgreSQL/Prisma, autentikasi admin dan RBAC yang siap dikembangkan.

**Architecture:** npm workspaces memisahkan Next.js web, NestJS API dan kontrak bersama. API menggunakan Prisma/PostgreSQL, JWT access singkat dan refresh token opaque hashed yang diputar/transaksional.

**Tech Stack:** Node.js 24, npm, Next.js, React, NestJS, Prisma, PostgreSQL, TypeScript, Jest/Supertest.

**Spec:** `docs/superpowers/specs/2026-11-01-stage-1-foundation-design.md`; kebutuhan proyek `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/TEST_PLAN.md`.

## Global Constraints

- Jangan mengisi secret; `.env.example` hanya nama variabel dengan nilai kosong.
- Aplikasi lintas Windows/Linux; npm scripts lintas platform, line endings LF.
- PostgreSQL adalah sumber kebenaran; tidak ada Redis Tahap 1.
- Auth: Argon2id; access JWT 15 menit; refresh opaque random 256-bit, DB SHA-256 hash, cookie HttpOnly/SameSite, Secure produksi, TTL default 30 hari, rotasi/revoke family.
- Validasi Nest DTO, rate limit login, CORS allowlist, Helmet, role authorization API-side.
- Agen/customer belum dapat login; admin awal hanya seed/env, tidak ada akun default.
- Keamanan/kebenaran mengalahkan pengurangan baris; test-first untuk setiap perilaku.
- Review manual `/ponytail-review` sebelum commit; tidak push ke remote sampai seluruh verifikasi dan review selesai.

## Review Focus

- Refresh token reuse dan dua refresh paralel tidak boleh membuat sesi yang terpakai tetap aktif.
- Salah password, email tidak ada, akun nonaktif, dan role tidak cukup mendapat respons aman dan generik.
- Cookie dan CORS localhost berfungsi pada port web/API yang berbeda tanpa wildcard credentials.
- Seed tidak mengubah password admin yang telah ada dan tidak memiliki nilai default.
- Invalid environment harus menghentikan boot tanpa mencetak nilai secret.

### Task 1: Monorepo, shared role contract, dan app skeleton

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.base.json`, konfigurasi lint.
- Create: `apps/api/` NestJS shell, `apps/web/` Next.js shell, `packages/shared/` role/type contract.
- Modify: `.env.example`, `README.md`, `docs/TODO.md`.
- Test: smoke tests untuk package `@tms/shared`, API health route, dan halaman web.

**Interfaces:**
- Produces: workspace scripts `dev`, `build`, `lint`, `test`, `typecheck`; shared role constants `ADMIN`, `AGENT`, `CUSTOMER`; API health endpoint.

- [ ] Buat assertion test untuk shared role contract dan health route, jalankan untuk melihat gagal.
- [ ] Tulis workspace manifests dan konfigurasi lint/typecheck minimum.
- [ ] Buat minimal API/web/shared app shell; jalankan test hingga lulus.
- [ ] Jalankan lint, typecheck, build, dan seluruh test workspace.
- [ ] Review diff manual; commit `chore: scaffold npm monorepo`.

### Task 2: Prisma schema, DB config, dan provisioning admin

**Files:**
- Create: `apps/api/prisma/schema.prisma`, seed file, Prisma service/module, DB test adapter.
- Modify: `.env.example`, `docs/ARCHITECTURE.md`, `docs/TODO.md`.
- Test: Prisma schema validation/generation; seed test membuktikan role dibuat dan password admin tidak direset.

**Interfaces:**
- Consumes: shared role constants dari Task 1.
- Produces: `User`, `Role`, `UserRole`, `RefreshToken` models; Prisma service; `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`.

- [ ] Tulis seed test untuk bootstrap aman dan seed ulang, jalankan RED.
- [ ] Tulis Prisma schema dan Prisma client integration.
- [ ] Implement seed yang memerlukan env hanya saat admin belum ada; Argon2id password hash; jangan log env values.
- [ ] Jalankan schema validation/generation dan seed test.
- [ ] Review diff; commit `feat(db): add auth schema and admin seed`.

### Task 3: Login, access JWT, refresh rotation/reuse, logout

**Files:**
- Create: Auth DTO/controller/service/module/strategies, cookie helper, auth unit/e2e tests.
- Modify: API bootstrap, `.env.example`, `docs/SECURITY.md`, `docs/TEST_PLAN.md`, `docs/TODO.md`.
- Test: login success/failure, refresh rotate/reuse family revoke, logout revoke, expired/invalid refresh.

**Interfaces:**
- Consumes: Prisma `User`, `Role`, `RefreshToken` models dan DB module.
- Produces: `POST /api/v1/auth/login`, `/refresh`, `/logout`, `GET /me`; login/refresh return short-lived access token JSON; opaque refresh token only in cookie.

- [ ] Tulis auth behavior tests dan lihat gagal.
- [ ] Implement password verification, access JWT, opaque refresh hashing, cookie flags, atomic conditional rotation, reuse detection, logout.
- [ ] Jalankan tes RED→GREEN dan seluruh suite; tambahkan race case pada repository adapter.
- [ ] Review diff; commit `feat(auth): add admin login and token rotation`.

### Task 4: Server-side authentication, RBAC, validation, and API hardening

**Files:**
- Create: public/roles metadata decorators, JWT/role guards, login throttle config, admin test controller.
- Modify: API bootstrap, CORS, validation pipe, Helmet, tests and docs.
- Test: anonymous protected request denied, valid admin allowed, non-admin denied, invalid DTO/origin rejected, rate limit.

**Interfaces:**
- Consumes: access JWT and role membership from Task 3.
- Produces: `@Public()`, `@Roles(...)`, guards and allowlisted CORS config.

- [ ] Write API integration tests for public/protected/admin routes and validation failures; verify RED.
- [ ] Implement guards, global validation, CORS, Helmet and throttler.
- [ ] Run full test/lint/typecheck/build; inspect logs for secret leakage.
- [ ] Review diff; commit `feat(auth): enforce admin RBAC and request security`.

### Task 5: Documentation, verification, and Stage 1 status

**Files:**
- Modify: `docs/TODO.md`, `docs/DEBUG_LOG.md`, Stage 1 security report.
- Verify: root install/lint/test/typecheck/build, Prisma validate/generate, integration checks if PostgreSQL is available, `git diff --check`.

- [ ] Record completed Stage 1 items and any database integration limitation.
- [ ] Perform full manual security/lean review of branch; fix Critical/Important findings before claiming done.
- [ ] Push feature branch only after successful verification and review.
