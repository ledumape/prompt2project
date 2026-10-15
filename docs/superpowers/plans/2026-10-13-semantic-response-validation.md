# Semantic Response Validation Implementation Plan

> **For agentic workers:** Implement inline in this task using the existing provider adapters and Zod schemas.

**Goal:** Reject clearly wrong-language, non-substantive, or unsupported-quantity AI responses and allow at most one sanitized corrective generation.

**Architecture:** Add one pure semantic validation module shared by Discovery and Spec. Keep provider APIs, schemas, and route contracts unchanged; each adapter may make exactly one second request with a fixed reason code translated to a short correction instruction.

**Tech Stack:** TypeScript, Zod, Vitest, existing Gemini and OpenRouter adapters.

## Global Constraints

- Preserve the current architecture and provider selection.
- Do not add deployment, authentication, database, agent, payment, or RAG scope.
- Never include rejected model output or secrets in retry feedback or logs.
- Retry at most once and retain the existing response schemas.

---

### Task 1: Deterministic semantic rules

**Files:**
- Create: `lib/ai/semantic-validation.ts`
- Test: `tests/semantic-validation.test.ts`

**Interfaces:**
- Consumes: validated `Discovery`, `ProjectSpec`, and their request context.
- Produces: allowlisted failure reasons for wrong language, weak essential text, or unsupported quantitative claims.

- [x] Add regression tests for clear language mismatch, short/empty essential fields, unsupported quantities, and supported input quantities.
- [x] Run targeted tests and confirm the expected failures.
- [x] Implement conservative language scoring, essential-field minimums, and unit-aware numeric comparisons that ignore IDs, versions, and list numbering.
- [x] Re-run targeted tests.

### Task 2: One controlled provider correction

**Files:**
- Modify: `lib/ai/openrouter.ts`
- Modify: `lib/ai/gemini.ts`
- Create or extend: `tests/semantic-validation.test.ts`

**Interfaces:**
- Consumes: adapter generation function and semantic validator result.
- Produces: valid first response, valid second response after one correction, or the existing friendly invalid-response error.

- [x] Add tests for successful first pass with no retry, successful one-time retry, and rejection after two invalid responses.
- [x] Run targeted tests and confirm retry count and sanitized feedback assertions fail before implementation.
- [x] Send one fixed reason-only correction to the same provider/model with the same schema; never send the rejected response.
- [x] Run adapter tests and all requested quality gates.

### Task 3: Factual documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/AI_DEVELOPMENT_LOG.md`

- [x] Record only implemented behavior and verification that actually passed.
- [x] Confirm no deploy or provider/model change occurred.
