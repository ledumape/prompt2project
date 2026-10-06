# AI Development Log

This log records notable work from the current development session. It does not claim a live Gemini request or deployment that has not happened.

## 2026-10-06 — Project contracts and transformations

- **Task:** Define idea, discovery, spec, local-history, and Markdown contracts.
- **Agent proposal:** Keep these behaviors in shared Zod schemas and deterministic pure helpers.
- **What was verified:** Vitest first failed because the planned modules did not exist. After implementation, tests exercised the schema bounds, malformed responses, Markdown sections, prompt scope rules, and localStorage versioning.
- **Observed adjustment:** Zod fills default form values while reading history. The round-trip test was adjusted to assert normalized stored values instead of raw object identity.
- **Decision:** Keep version 1 project history capped at 20 records; reject malformed/unknown versions without crashing the app.

## 2026-10-06 — Gemini integration boundary

- **Task:** Add provider-isolated server calls for discovery and spec generation.
- **Agent proposal:** Use Google's current `@google/genai` SDK, a configurable stable Gemini model, structured JSON output, and `store: false`.
- **What was verified:** The current Google Gemini model, quickstart, and structured-output documentation were reviewed. Automated provider tests mock the SDK and verify JSON-schema request configuration plus rejection of malformed output.
- **Decision:** Keep discovery and spec generation in separate validated server endpoints so the user can answer questions and decide on product challenges between calls. Generate the coding-agent prompt from the edited spec without another model request.
- **Not verified:** A real API key, account access, quota, and live model response were not provided or tested.

## 2026-10-06 — Dependency and quality review

- **Task:** Configure automated checks for the blank repository.
- **What was verified:** A dependency audit reported five high severity findings through the current `eslint-config-next` transitive chain. The affected package was only needed to expose lint rules, so it was removed in favor of a focused TypeScript ESLint configuration. A subsequent npm audit reported zero vulnerabilities.
- **Result:** Vitest, TypeScript checking, and ESLint passed during implementation. Final clean verification is recorded in the task completion report.

## 2026-10-06 — First production build

- **Task:** Compile the app for production.
- **What was verified:** The initial build stopped because the stylesheet imported Tailwind but the package and PostCSS plugin were missing.
- **Observed adjustment:** After adding Tailwind, static prerendering found that the initial blank form was being parsed with the non-empty idea schema at module load.
- **Result:** Added Tailwind CSS 4 and its PostCSS configuration, and separated the editable draft-form type from the validated API type so blank initial form state remains valid UI state. The production build is being rerun after this correction.

## 2026-10-06 — Prompt-boundary review

- **Task:** Review how the selected output language reaches the provider prompts.
- **Observed risk:** The first implementation interpolated the initial idea into a system instruction for “same as input.” That would have given untrusted user text a privileged prompt position.
- **Decision:** The system instruction now refers to the project idea as untrusted user content without copying any of it. A mocked provider test confirms the malicious-looking idea stays in request data and is absent from the system instruction.

## 2026-10-06 — Gemini schema compatibility

- **Task:** Check the generated response schema against Gemini's supported structured-output subset.
- **What was verified:** The current official docs list supported JSON Schema fields; string length constraints are enforced locally by Zod but are not part of the documented supported string fields.
- **Decision:** Remove `minLength` and `maxLength` only from the schema sent to Gemini. Keep those constraints in the server/client Zod validation. A mocked SDK test verifies the transmitted schema retains supported array limits and omits the local-only string constraints.

## 2026-10-06 — Final verification

- **What was verified:** 14 automated tests passed across 5 Vitest files; ESLint and TypeScript checks passed; the Next.js production build completed and listed the home page, favicon, and both API routes; npm audit reported zero vulnerabilities.
- **UI check:** The local browser preview rendered at a mobile-sized viewport in both dark and light themes. The production build loaded, and its missing-key response was clear without exposing provider internals.
- **Remaining external check:** No Gemini key was supplied, so account access, quota, and an actual model response are still unverified.

## 2026-10-06 — V1 completion pass

- **Task:** Apply the selected output language to Markdown exports and coding-agent prompts, preserve project IDs when editing and re-analyzing, and keep the idea map meaningful during analysis.
- **Changes:** Added one English/Portuguese resolver shared by Gemini requests and exports; translated Markdown section/field labels and fixed prompt instructions; reused the existing project ID during re-analysis and deduplicated history by ID; extracted up to three distinct idea concepts and animated the map through reading, concept-mapping, and plan-shaping states. The map remains visible during analysis, and motion honors `prefers-reduced-motion`.
- **Tests added:** English and Portuguese exports, both language outcomes for “Same as input,” selected-English behavior, concept extraction in English and Portuguese, and project-ID/history replacement behavior.
- **Verification performed:** `npm test` passed (20 tests across 7 files); `npm run lint`, `npm run typecheck`, and `npm run build` all passed.
- **Not performed:** No deployment or live Gemini request was run.
