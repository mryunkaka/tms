# TMS Project Instructions

## Project

Build a Bahasa Indonesia travel booking system for one operator that offers operator-owned trips and packages across multiple configurable regions. Kotabaru, South Kalimantan is an initial area, not a hardcoded product limit. Admins manage a hierarchy of areas/destinations and associate one or more destinations with a trip. The MVP also covers schedules and capacity, DP and final payment through Midtrans, and an admin panel. The product and business source of truth is `docs/PRD.md`; the canonical flow is `docs/BUSINESS_FLOW.md` and must be followed by the PRD, test plan, and later implementation.

## Planned stack and repository

- `apps/web`: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, PWA.
- `apps/api`: NestJS, TypeScript, Prisma, PostgreSQL.
- `packages/shared`: shared types and validation only where both apps need them.
- Redis and BullMQ are deferred to Stage 2. Logging uses Pino to stdout. Midtrans starts in sandbox.
- See `docs/ARCHITECTURE.md` for module boundaries, ports, local setup, and deployment.
- Current stage: Stage 0 documentation and working agreements. Do not create application code until Stage 1 is explicitly started.

## Commands

The application and workspace scripts do not exist yet. All commands below are **not available yet** and must be added with Stage 1:

- Install: not available yet (`npm install` once a workspace manifest exists).
- Development: not available yet (`npm run dev`).
- Tests: not available yet (`npm test`).
- Lint: not available yet (`npm run lint`).
- Build: not available yet (`npm run build`).

Do not invent successful command results. Add real cross-platform npm scripts when the monorepo is created.

## Working principles

1. Think before coding: state the interpretation, assumptions, and meaningful trade-offs before non-trivial changes.
2. Keep it simple: implement the smallest complete solution; avoid speculative features, dependencies, and abstractions.
3. Make surgical changes: touch only what the request needs and leave unrelated work alone.
4. Define verification before declaring completion; report checks that were not run.
5. Use Ponytail at **full** intensity by default. Do not use ultra for authentication, payments, Midtrans webhooks, or security.
6. Every business rule needs a test, even if a minimal-code principle suggests otherwise. Never cut validation at trust boundaries, error handling that prevents data loss, security, accessibility, or requested behavior.

### Priority when principles conflict

1. Security and correctness: input validation, error handling, authentication and RBAC, payment security, and accessibility must not be sacrificed for fewer lines.
2. Explicit user instructions and `docs/PRD.md`.
3. Karpathy principles.
4. Ponytail's minimum-code principle.

## Language and portability

- User-facing UI and product documentation are in Bahasa Indonesia. Filenames, identifiers, source code, and commit messages are in English.
- Use TypeScript for application code. Keep paths and scripts portable across Windows and Linux; use environment variables and cross-platform npm scripts, never Windows-only commands or absolute machine paths in the app.
- Use LF line endings as configured in `.gitattributes`.
- Store timestamps in UTC; business display timezone is `Asia/Makassar`. Store money as whole IDR units.
- Never invent destination facts. Mark missing owner-supplied content `TBD: diisi pemilik bisnis`.

## Security baseline

- Never add secrets, credentials, real personal data, or populated `.env` files to Git. Keep `.env.example` to variable names with empty values.
- Enforce authentication and role authorization on the server; validate all external input; verify and make payment webhooks idempotent.
- Do not log passwords, tokens, payment secrets, or unnecessary personal data.
- Follow `docs/SECURITY.md` and `docs/COMMIT_GUIDE.md`.

## Definition of Done

- The change meets the PRD and canonical business flow, with unresolved decisions marked `ASUMSI:` or `TBD:`.
- Every changed business rule has appropriate tests and every shortcut has a `shortcut:` marker and an entry in `docs/TODO.md` with an upgrade trigger.
- Before every commit, inspect the diff with `/ponytail-review`; because only the skill is installed, use the manual checklist in `docs/COMMIT_GUIDE.md`.
- At the end of every stage, perform a whole-repository security/quality audit and save it under `docs/security/` or in `docs/DEBUG_LOG.md` as appropriate.
- Run available checks and report results; do not claim unrun checks passed.
- Update `docs/TODO.md` at the end of every work session.
- Keep commits atomic and do not push to any remote without explicit authorization.
