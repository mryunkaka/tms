# PWA Offline Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a safe static offline shell without caching dynamic app or booking data.

**Architecture:** A production-registered service worker pre-caches only `/offline.html`. It uses network-first for navigations and falls back to that shell; non-navigation/API requests are untouched.

**Tech Stack:** Next.js App Router, browser Service Worker/Cache APIs, Jest + Node VM.

**Spec:** `docs/superpowers/specs/2026-11-02-pwa-offline-shell-design.md`

## Global Constraints

- Never cache `/api`, booking, admin, payment, or dynamic responses.
- Keep the fallback static, Indonesian, and usable without external assets.
- Keep paths/scripts portable across Windows and Linux.

## Review Focus

- Old cache versions are removed without deleting unrelated origin caches.
- Offline navigation returns the shell even when the requested route is `/admin`.
- API requests (including document navigations) and non-navigation requests are not intercepted.
- Production registration failure does not break the page.

---

### Task 1: Service worker behavior

**Files:** `apps/web/public/sw.js`, `apps/web/public/offline.html`, `apps/web/src/lib/service-worker.test.ts`.

- [x] Write worker tests for pre-cache contents, offline navigation fallback, and non-navigation POST bypass.
- [x] Run tests and confirm the worker is missing/behavior is absent.
- [x] Implement install/activate/fetch behavior per the spec.
- [x] Run focused worker tests.

### Task 2: Production registration and verification

**Files:** `apps/web/src/app/service-worker-registration.tsx`, `apps/web/src/app/layout.tsx`, `docs/TEST_PLAN.md`, `docs/TODO.md`.

- [x] Register `/sw.js` only in production and include the component in the root layout.
- [x] Run full tests, lint, typecheck, build, inspect generated public assets, and probe the local service after restart.
- [x] Update security/TODO evidence and commit/push atomically.
