# Public Guide Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the public guide page required by the PRD, using only verified application behavior.

**Architecture:** A static Next.js App Router page explains search, booking, and status lookup. Add one global link and one static sitemap entry; keep destination editorial facts as owner-supplied TBD.

**Tech Stack:** Next.js App Router, React server rendering, Jest.

**Spec:** `docs/superpowers/specs/2026-11-02-public-guide-page-design.md`

## Constraints

- Do not invent destination or operator facts.
- State that online payment is not yet available.
- No CMS, new dependency, or dynamic content source.

## Review Focus

- Guide does not claim payment support that is outside Stage 1.
- All instructions match current forms and lookup requirements.
- Sitemap includes exactly the canonical `/panduan` route.

---

### Task 1: Guide page and discovery

**Files:** `apps/web/src/app/panduan/page.tsx`, `apps/web/src/app/panduan/page.test.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/sitemap.ts`, `apps/web/src/app/sitemap.test.ts`.

- [x] Add failing tests for page content/metadata and sitemap route.
- [x] Run focused tests and confirm route/content are missing.
- [x] Implement static guide, navigation link, metadata, and sitemap URL.
- [x] Run focused tests.

### Task 2: Verification and integration

**Files:** `docs/TEST_PLAN.md`, `docs/TODO.md`, `docs/security/2026-11-02-stage-1-review.md`.

- [x] Confirm PRD requirement is covered without changing business scope; add GUIDE-01 acceptance.
- [x] Run tests, lint, typecheck, build and local route probes.
- [x] Update security/TODO evidence, inspect diff, commit, review, and push.
