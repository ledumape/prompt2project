# Prompt2Project Public Cost Controls Implementation Plan

> **For agentic workers:** Implement and verify each task in order. Keep Production untouched.

**Goal:** Bound model usage and protect the public AI routes with a shared server-side quota.

**Architecture:** Keep Next.js route handlers and current provider abstractions. Add an atomic Upstash Redis REST rate-limit check shared by Discovery and Spec, with HMAC-hashed IP identifiers and fail-closed behavior when configuration is missing or unavailable. Keep model and token caps server-side and configurable.

**Tech Stack:** Next.js Route Handlers, TypeScript, Upstash Redis REST, OpenRouter, Vitest.

## Global Constraints

- Do not deploy to Production.
- Keep API credentials server-only; do not add client-side secrets.
- Limit valid generation requests to 3 per IP in one rolling 24-hour window across both AI routes.
- Permit no more than one semantic retry.
- Preserve all existing schema fields and user-visible outputs.

---

### Task 1: Provider model, output limits, and budget error — complete

**Files:** `lib/ai/openrouter.ts`, `lib/ai/provider.ts`, `lib/ai/provider-factory.ts`, `lib/ai/route-utils.ts`, provider tests.

- [x] Add regression tests for configured default model, Discovery/Spec output caps, 402 handling, and one-retry maximum.
- [x] Run the focused tests and verify the expected failures.
- [x] Implement configurable `OPENROUTER_MODEL` with `openai/gpt-6-luna` default, concise prompt updates, per-operation output caps, safe 402 classification, and retry limits.
- [x] Re-run the focused tests.

### Task 2: Shared server-side rate limiting — complete

**Files:** new `lib/ai/rate-limit.ts`, both AI route handlers, `.env.example`, route tests.

- [x] Test three allowed generations, fourth blocked, 24-hour reset, separate IPs, and a single shared quota across both routes.
- [x] Run the focused tests and verify the expected failures.
- [x] Implement an atomic fixed-window counter using Upstash REST Lua execution; hash IPs using a server-side HMAC secret; fail closed without credentials or on storage errors.
- [x] Return generic 429 quota and 503 rate-limit-service messages without logging IPs.
- [x] Re-run the focused tests.

### Task 3: Friendly client handling and secret bundle check — complete

**Files:** `lib/domain/app-presentation.ts`, client request tests, build secret-check script and `package.json` if needed.

- [x] Test friendly 429 and provider-budget errors, and test the bundle scanner against synthetic secret material.
- [x] Run the focused tests and verify expected failures.
- [x] Add localized quota/unavailable messages and an automated post-build scan for configured server-key values in browser bundles.
- [x] Re-run tests and verify scanning does not print matched secret values.

### Task 4: Documentation and final verification — complete

**Files:** `.env.example`, `README.md`, `docs/AI_DEVELOPMENT_LOG.md`.

- [x] Document required server-only variables, shared rate-limit behavior, model/token caps, and that no Production deployment occurred.
- [x] Record only work and command results actually verified.
- [x] Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `git diff --check`.
