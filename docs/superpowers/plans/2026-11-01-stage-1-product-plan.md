# Stage 1 Product Implementation Plan

> **For agentic workers:** Execute tasks in order and track each checkbox. Keep work on the current main workspace per the owner's request; do not use a worktree.

**Goal:** Complete the Stage 1 trip catalogue, admin management, guest booking, capacity protection, expiry handling and public web flows from the PRD and canonical business flow.

**Architecture:** PostgreSQL/Prisma remains the source of truth. NestJS owns validation, authorization, domain transitions and atomic capacity operations; Next.js renders public pages from API data and exposes an authenticated admin workspace. No Redis, payment, email or invented destination content is introduced in Stage 1.

**Tech Stack:** Node.js 24, npm workspaces, Next.js, NestJS, Prisma, PostgreSQL, TypeScript, Jest/Supertest.

**Spec:** `docs/PRD.md`, `docs/BUSINESS_FLOW.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/TEST_PLAN.md`.

## Global Constraints

- Bahasa Indonesia for product-facing copy; money uses integer IDR; timestamps are stored in UTC and displayed in `Asia/Makassar`.
- Never invent destination/product facts; missing owner content is `TBD: diisi pemilik bisnis`.
- Keep endpoints validated and role-protected server-side; never log credentials, refresh/access tokens or unnecessary PII.
- Configurable business values remain configuration; Stage 1 does not add Redis, Midtrans or email.
- Every new business rule has tests. Booking capacity and idempotent expiry must be verified against PostgreSQL.

## Review Focus

- Parent/child destination filters include descendants but never expose unpublished trips.
- Invalid/inactive schedule, forged price, duplicate slug and malformed participant input fail without partial writes.
- Concurrent bookings cannot oversell; failed transactions leave no partial booking or capacity change.
- Expired or cancelled holds release capacity once; paid-state transitions are not implemented before payment stage.
- Public status lookup reveals only minimum booking information and enforces the approved contact factor assumption.

---

### Task 1: Domain schema and migrations

- [x] Add destination tree, trips, ordered trip-destination links, schedules, bookings, participants and audit records to Prisma schema.
- [x] Add additive migrations with indexes/check constraints, preserving existing users/auth records.
- [x] Run Prisma validate/generate and deploy migrations successfully to local PostgreSQL. Model behavior tests continue with service implementation.

### Task 2: Destination and trip management API

- [x] Add failing tests for destination tree behavior, public filtering and admin authorization.
- [x] Implement admin CRUD/archive for destinations, trips and schedules, including ordered primary destination and price/capacity invariants, with transactional audit.
- [x] Implement public destination/tree, trip list/filter/detail endpoints and published-only results.
- [x] Verify DTO rejection, RBAC, parent/child filtering, publish prerequisites and no hardcoded location facts.

### Task 3: Guest booking and capacity lifecycle

- [x] Add failing tests for booking validation, pricing snapshots, schedule boundary rules, expiry and invalid transitions.
- [x] Implement booking codes, contact verification hashes, participant records and integer price snapshots.
- [x] Implement PostgreSQL-atomic capacity hold/commit/release with race tests for the final seat.
- [x] Implement idempotent Nest expiry job and privacy-minimal booking status lookup.
- [x] Verify PostgreSQL integration, concurrent final-seat requests and repeated expiry.

### Task 4: Public and admin web flows

- [x] Add SSR public landing, catalogue filters, destination and trip detail pages with metadata, sitemap and robots.
- [x] Add mobile-first admin login/session, destination/trip/schedule management and booking view.
- [x] Keep unprovided operator copy visibly marked TBD; never present test fixtures as live product facts.
- [x] Verify production routes via Nginx, form-level access restrictions, responsive CSS and initial unauthenticated admin state.

### Task 5: Whole-stage verification and audit

- [x] Run available lint, test, typecheck, build, Prisma validation/deploy and PostgreSQL integration checks.
- [ ] Complete backup restore drill only through an approved isolated-database method; retain blocked status if the security gate rejects required access changes.
- [x] Review whole-repository security and quality; save report under `docs/security/` and update `docs/TODO.md`.
- [x] Inspect staged diff, commit atomic changes and push to `main` as previously authorized.

## Execution Ledger

- **2026-11-01:** Ruling: continue in the current `main` workspace and use atomic commits — the owner previously asked to avoid duplicate worktree files and authorized pushing to `main` — cost if wrong: reduced isolation; mitigate with narrow commits and verification.
- **2026-11-01:** Ruling: use PRD business defaults only as configurable assumptions and keep unknown business/location content unpublished — PRD and `BUSINESS_FLOW.md` explicitly mark these as assumptions/TBD — cost if wrong: operator workflow may need changes after owner confirmation.
- **2026-11-01:** Task 1 additive migrations applied to local PostgreSQL. Destination tree/admin API and public trip listing implemented; focused API tests (11/11), API typecheck and lint passed. Booking lifecycle, trip/schedule admin, public UI, full integration tests and stage audit remain open.
- **2026-11-01:** Full workspace lint, tests (23 total), typecheck and build passed. Local API feature tests use mocked Prisma; PostgreSQL was verified for migration deployment, not yet for booking concurrency or expiry behavior.
- **2026-11-01:** Re-ran full workspace lint, tests (26 total), typecheck and build after trip draft/list API work; all passed. Added archive checks across destination descendants and excluded orphaned children from public listings. Booking pricing helper is tested; booking transaction is not implemented yet.
- **2026-11-02:** Implemented booking lifecycle, PostgreSQL locking/expiry checks, catalog and schedule management, public/admin web flows, Pino JSON logging/redaction, and production-route verification. Final lint, 43 tests, typecheck, build, Prisma validation/deploy, PostgreSQL booking race/expiry, and local HTTP route checks passed. Security report identifies restore drill as blocked P0 and full dev audit as 31 low/moderate findings.
- **2026-11-02:** Manual Ponytail commit review completed; commit `8d7ff23` was pushed to `origin/main` under the owner's earlier authorization. Stage remains open only for the uncompleted restore drill and tracked pre-release checks.
