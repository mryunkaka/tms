# Destination Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let operators define destination order in admin and preserve that order in public navigation/filter trees.

**Architecture:** Add a non-negative integer `sortOrder` with database default `0`. Admin DTO/service/UI read and write it; tree construction sorts by `sortOrder`, then Indonesian name for stable ties.

**Tech Stack:** Prisma 7, PostgreSQL, NestJS/class-validator, Next.js/React, Jest.

**Spec:** `docs/superpowers/specs/2026-11-02-destination-ordering-design.md`

## Global Constraints

- Preserve all existing destination rows and public visibility rules.
- Validate all external input on the API; only admin can update the value.
- Use integer IDR/time rules unchanged; no secrets or personal data in Git.
- Follow TDD and record progress in `docs/TODO.md`.

## Review Focus

- Equal order values remain deterministic via a locale-aware name tie-breaker.
- Existing rows retain predictable order after migration (`sortOrder = 0`).
- Invalid negative/non-integer updates are rejected at the API boundary.
- Parent and child nodes each sort only among their siblings.
- Public trip destination relationships keep their separate visit order.

---

### Task 1: Persist and sort destinations

**Files:** `apps/api/prisma/schema.prisma`, a new migration, `apps/api/src/destinations/destinations.service.ts`, `apps/api/src/destinations/destinations.service.spec.ts`, and `apps/api/src/destinations/destination.dto.ts`.

- [x] Add failing tests for sibling order/tie behavior and public tree ordering.
- [x] Run destination service tests and confirm the new sort test fails.
- [x] Add `sortOrder Int @default(0)`, validate create/update values as non-negative integers, and order admin/public queries consistently.
- [x] Run focused tests, Prisma validate/generate, and apply the additive migration.

### Task 2: Edit destination order in admin

**Files:** `apps/web/src/app/admin/admin-console.tsx` and `apps/web/src/app/admin/admin-console.test.tsx`.

- [x] Add a UI contract test proving each destination exposes its current ordering value for editing.
- [x] Run the admin console test and confirm it fails before implementation.
- [x] Add a numeric order input to create/edit forms and submit it through the existing admin API.
- [x] Run focused web tests, lint, and typecheck.

### Task 3: Verify and record

**Files:** `docs/PRD.md` (implementation status only if needed), `docs/TEST_PLAN.md`, `docs/TODO.md`, and `docs/security/2026-11-02-stage-1-review.md`.

- [x] Run full lint, test, typecheck, build, migration deploy, and relevant PostgreSQL checks.
- [ ] Review diff using `docs/COMMIT_GUIDE.md`, commit atomically, then push to `main` under prior authorization.
- [x] Record the remaining PostgreSQL restore drill blocker and current audit findings; do not claim Stage 1 complete while the P0 gate remains open.
