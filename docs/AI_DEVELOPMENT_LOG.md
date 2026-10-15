# AI Development Log

## 2026-10-14 — Application generation limit disabled (local only)

- **Change:** Removed the Upstash/IP quota check from `/api/discovery` and `/api/spec` at the user's request. The existing provider-side 429/budget handling remains. Removed unused Upstash entries from `.env.example` and updated README/setup guidance to state that the app has no application-level rate limit and public calls can consume provider quota.
- **UI:** Replaced the obsolete “3 generations per day” copy with a provider-usage-limit message so provider HTTP 429 responses are not mislabeled as an app quota.
- **Verification:** Added route tests proving both valid generation routes reach the provider even when the mocked quota would deny them. Added UI-copy test. `npm.cmd test` passed (113 tests across 20 files), `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` (including client-bundle secret scan), and `git diff --check` passed on 2026-10-14. No live provider call was made.
- **Deployment:** No Preview or Production deployment was performed. Production remains unmodified.

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

## 2026-10-06 — Map readability and Gemini request errors

- **Task:** Fix the light-theme idea map, narrow-screen node layout, uncontrolled input warning, and opaque `/api/spec` 502 response.
- **Changes:** Added theme-specific dot and node-border colors; centered map nodes without transforms that conflict with animation; constrained the idea label; reduced concept-node widths below 420px; normalized optional draft fields when opening saved projects; removed Portuguese request verbs and generic people words from extracted concepts.
- **Gemini error handling:** Kept upstream status categories without logging prompts or credentials. Quota exhaustion now returns an actionable HTTP 429, invalid provider requests are distinguished from transient outages, and invalid API-key/model access receives a separate configuration response. The provider schema omits string/array length bounds while local Zod validation still enforces them.
- **Automated verification:** `npm test` passed (26 tests across 9 files), `npm run lint` passed, `npm run typecheck` passed, and `npm run build` passed on 2026-10-06.
- **Live API limitation:** The configured Gemini model accepted a minimal structured-output diagnostic and returned HTTP 400 for the full generated schema. Further diagnostics then hit the key's Gemini free-tier HTTP 429 daily limit. The simplified provider schema and HTTP status handling have automated coverage, but a successful live `/api/spec` request after this change could not be confirmed until quota resets or another key is configured.
- **Not performed:** No deployment.

## 2026-10-06 — Temporary OpenRouter option

- **Task:** Enable the user to finish a local test while Gemini's daily quota is exhausted.
- **Changes:** Added an OpenRouter adapter using its OpenAI-compatible chat-completions endpoint and `openrouter/free` default router. Added `AI_PROVIDER` selection while keeping Gemini as the default; both providers use the same language-aware prompts, shared structured schema conversion, and Zod validation. Provider keys remain server-only. Updated `.env.example`, README provider setup, privacy notes, and safe generic API error messages.
- **Tests:** Added mocked request/response tests for OpenRouter JSON Schema requests, parsing and validation, quota/request error mapping, and provider selection/defaults.
- **Live verification:** Used the user's local key with a synthetic group-travel idea. Discovery and spec both returned HTTP 200 and passed route-level Zod validation after enabling strict JSON Schema mode for OpenRouter. Earlier best-effort responses did not validate consistently; the final successful run used strict mode. The key and project content are not recorded here.

## 2026-10-07 — Decisive stack recommendation

- **Task:** Make generated specifications present one clear primary technology stack and remove stray leading colon prefixes.
- **Changes:** Tightened the shared Gemini/OpenRouter specification instruction to request one choice per stack layer. Normalized generated stack entries into one recommendation, keeping the first choice when the model supplies “or”, “ou”, or slash alternatives, and stripping formatting colons at the start of entries. Added provider-level and normalizer tests for English and Portuguese alternatives.
- **Verification:** `npm test` passed (37 tests across 12 files); `npm run lint`, `npm run typecheck`, and `npm run build` passed on 2026-10-07.
- **Not performed:** No live model request or deployment.

## 2026-10-07 — Pre-deploy language, prompt, and provider review

- **Changes:** Moved the resolved output-language rule into the trusted system instruction for both providers. Discovery, spec generation instructions, Markdown labels, and fixed Coding Agent Prompt sections now share the English/Portuguese/“Same as input” resolution; user-authored text remains intact. Removed generated colon prefixes only from the Coding Agent Prompt, leaving editable spec data and standalone spec Markdown unchanged. Replaced the Gemini-specific helper copy in the UI with “AI provider.”
- **Provider diagnosis:** OpenRouter failures now log only configured model, HTTP status, and a finite safe category; response bodies, prompts, and credentials are not logged. A live synthetic Portuguese idea with English output completed Discovery twice with English questions. The same OpenRouter Free router returned HTTP 404 twice during spec generation; sanitized diagnostics classify the response as `model-unavailable` (no route available), not a language or schema rejection. No retry/fallback or model change was introduced. A live spec/prompt/copy check remains blocked until a model route is available.
- **Browser verification:** Confirmed one history entry remained after editing and re-analyzing the project. Measured readable text and distinct map-node background/border colors on Idea and Discovery in both light and dark themes. The browser did not expose reduced-motion emulation; the existing `useReducedMotion` handling and CSS media rule were confirmed by source inspection. Spec-theme and real clipboard verification remain unperformed because spec generation did not complete.
- **Tests:** Added language-in-system tests for English, Português, and both “Same as input” outcomes, including a successful mocked Portuguese-input/English-spec response; added safe OpenRouter no-route classification coverage and verified prefix cleanup does not alter standalone spec Markdown. `npm test` passed (46 tests across 13 files).
- **Quality checks:** `npm run lint`, `npm run typecheck`, and `npm run build` passed on 2026-10-07. The Impeccable design detector reported no findings for the changed workspace UI copy.
- **Not performed:** No deployment. Dark mode on the spec screen, live Coding Agent Prompt copy, and browser-level reduced-motion behavior still require manual verification after a provider route succeeds and in a browser exposing the reduced-motion preference.

## 2026-10-07 — OpenRouter Free spec-language retest

- **Configuration:** Verified `AI_PROVIDER=openrouter`, `OPENROUTER_MODEL=openrouter/free`, and that the API-key variable is configured; no credential value was displayed or recorded. The requested model was already active, so no model switch was needed.
- **Live spec checks:** Sent only three synthetic `POST /api/spec` requests using a Portuguese idea and output settings Português, English, and Same as input. English returned HTTP 200 with a schema-valid spec. Português returned HTTP 502 on both attempts. Same as input returned HTTP 502 on its first attempt and HTTP 200 on retry.
- **Provider error recorded safely:** Failed requests returned HTTP 200 from OpenRouter, but the generated content failed local Zod validation (`schema-mismatch`). The app returned its generic HTTP 502 message: “The AI returned a response that could not be validated. Please try again.” Added a sanitized OpenRouter log containing only model, upstream status, and failure category; no generated content, idea text, or credential is logged. A mocked adapter test verifies this privacy boundary.
- **Decision:** The results are intermittent and do not pass all three language cases. No fallback, schema relaxation, architecture change, or model switch was made. Further work needs a provider response that meets the existing strict spec schema or a user-selected model that does so.
- **Verification:** `tests/openrouter.test.ts` passed (8 tests), including the new safe schema-mismatch diagnostic test. The four full quality gates were not rerun because the requested live spec checks did not all pass.

## 2026-10-07 — Fixed free OpenRouter model spec retest

- **Model selection:** Replaced only `OPENROUTER_MODEL` in the ignored local `.env.local` with `nvidia/nemotron-3-super-120b-a12b:free`; `AI_PROVIDER` and all other environment values were retained. OpenRouter's model page listed this endpoint as free and explicitly supporting JSON Schema in `response_format`.
- **Live checks:** Made at least two generation attempts for each setting, using only a synthetic Portuguese travel-planning idea. English passed 2/2; Português passed 2/2; Same as input passed 1/2. Five of six responses returned HTTP 200 and passed Zod validation plus a language-signal check. The sixth returned application HTTP 502.
- **Sanitized failure:** The failed request used `nvidia/nemotron-3-super-120b-a12b:free`; upstream HTTP status was 200 and the safe adapter category was `schema-mismatch`. No output, input, or credential was recorded. No fallback, schema change, or architecture change was made.
- **Quality gates:** Not rerun because one of the six required spec generations failed. No deployment.

## 2026-10-07 — Discovery language and provider diagnostics

- **Discovery language:** Localized the Discovery screen headings, known/open-state labels, challenge decisions, question labels, answer placeholder, actions, and common provider errors according to the resolved output language. The Idea and Spec screens remain unchanged. Schema-path bullets such as `/targetUser` now render as readable field names, with supplied values preserved. Discovery prompts also tell the model to return natural phrases instead of raw schema keys.
- **502 diagnosis:** Reproduced an application HTTP 502 with a synthetic Portuguese `Same as input` idea against the configured Nemotron route. OpenRouter returned HTTP 200 but the response failed local schema validation (`schema-mismatch`); direct spec attempts with low reasoning and Response Healing also failed schema validation. The adapter now classifies provider errors using `metadata.raw` internally without logging the raw text.
- **Free model comparison:** `liquid/lfm-2.5-2.6b:free` completed Portuguese and Same-as-input Discovery/spec checks, but its English spec response was invalid JSON. `apodex/apodex-1.1-mini:free` returned HTTP 400 for both the project schema and a minimal strict schema. `openrouter/free` completed a Portuguese end-to-end check with valid schemas but took about 90 seconds; previous language checks on this router had intermittent schema mismatches. Qwen3.8 and gpt-oss free routes returned 404. No tested alternative passed reliably enough to replace Nemotron; `.env.local` was left unchanged. Laguna S 2.1 was not used because its OpenRouter page says it does not accept `response_format`.
- **Automated verification:** Added tests for Portuguese/English Discovery copy, Same-as-input resolution, readable field paths, localized provider instructions, localized challenge severity and provider errors, and safe classification of `metadata.raw`. Full `npm test` passed (54 tests across 14 files), `npm run lint` passed, `npm run typecheck` passed, and `npm run build` passed.
- **Not performed:** No deployment. OpenRouter Free model generation remains intermittently invalid or slow and needs a more reliable structured-output endpoint before deployment.

## 2026-10-07 — OpenRouter spec schema mismatch mitigation

- **Changes:** Made the trusted spec instruction explicitly require one object matching every schema field, non-whitespace values for required strings, and at least one acceptance criterion. When local Zod validation rejects a successful OpenRouter response, logs now include up to ten sanitized field paths and issue codes; response values, prompts, ideas, and credentials remain excluded.
- **Verification:** Added regression tests for the required spec constraints and safe validation-path logging. A live synthetic Portuguese-idea/English-output spec generation passed local validation once with the configured free model. `npm test` passed (56 tests across 14 files), `npm run lint`, `npm run typecheck`, and `npm run build` passed on 2026-10-07.
- **Limit:** The exact field that failed in the user's earlier request cannot be recovered from the previous safe log, and one successful live run does not establish reliability for this free model. Keep the provider TODO open pending repeat successful real-world generations or a more reliable model selection. No deployment.

### Follow-up — Overlong execution strings

- **Root cause:** The user supplied a safe validation log showing three `too_big` errors at `execution.phases[0]`, `execution.developmentTasks[0]`, and `execution.openQuestions[0]`. These list items exceeded the local 800-character Zod limit. The provider-facing JSON Schema removes length bounds, and the trusted prompt had not stated this limit.
- **Fix:** The trusted prompt now caps every string at 800 characters and asks for concise execution phases, development tasks, and open questions (preferably under 300 characters per list item). Safe issue-path logging was covered for these exact paths and does not include rejected values.
- **Verification:** The targeted provider/prompt tests passed (17 tests). A live synthetic Portuguese/Same-as-input spec passed local validation once. Full `npm test` passed (58 tests across 14 files), and `npm run lint`, `npm run typecheck`, and `npm run build` passed on 2026-10-07. No deployment.

## 2026-10-07 — Simplified, localized Project Spec screen

- **Changes:** Added English and Brazilian Portuguese presentation copy for the Project Spec screen, resolved through the selected output language and the source idea for “Same as input.” Section names, overview fields, detail labels, actions, prompt handoff, navigation, and copy/export feedback now use that copy; the rest of the application UI remains unchanged. Restructured the screen around one editable project summary, four native expandable detail groups, and the coding-prompt handoff. Reduced repeated card framing and made field labels and controls easier to scan.
- **Accessibility and responsive behavior:** Retained semantic labels and native `<details>` disclosure, added names to spec controls, provided visible focus for disclosure summaries, preserved the existing reduced-motion entrance behavior, and disabled the new chevron transition under `prefers-reduced-motion`. The spec field grid collapses to one column on mobile.
- **Verification:** `npm run lint`, `npm run typecheck`, and `npm run build` passed on 2026-10-07. The Impeccable detector found no new findings in the changed spec layout; its remaining findings refer to the existing Discovery suggestion accent and the intentional Idea Map dot background. Automated tests were not run for this UI change. Browser visual QA could not be completed: the local `http://localhost:3000/` tab was unavailable and browser access was blocked by policy. No deployment.

## 2026-10-07 — Global English/Portuguese language control

- **Changes:** Replaced the per-project output-language field with a persistent EN/PT switch beside the theme control. The first screen, project history, Idea Map, Discovery, Project Spec, accessibility labels, errors, export names, Markdown, and coding prompt now follow the selected language. New analysis and spec requests explicitly use the global selection. Existing saved AI text is preserved and the UI explains that it must be generated again to change languages.
- **Verification:** Added bilingual presentation and project-language override tests. Full `npm test` passed (61 tests across 15 files); `npm run lint`, `npm run typecheck`, and `npm run build` passed on 2026-10-07. The Impeccable detector reported only the existing Discovery suggestion accent and intentional Idea Map background findings; it found no new issue from the language switch. No manual browser QA or deployment was performed.

## 2026-10-10 — Explicit language and audience grounding

- **Changes:** Made the spec system instruction explicitly translate `projectUnderstanding` and `targetUser` instead of copying descriptive context across languages. It also requires numeric audience sizes/ranges to come from an exact user-supplied quantity. Added prompt regression assertions and documented that schema validation does not guarantee semantic language/factual accuracy in README.
- **Automated verification:** `npm test -- tests/provider-prompts.test.ts` passed (7 tests). The new assertions failed before the prompt change and passed after it.
- **Live verification:** Not performed. The browser rejected reconnection to the local app under its URL policy; no alternate browser path was used. Earlier OpenRouter live outputs still showed an English `targetUser` and an invented audience range, so the semantic-language TODO remains open pending a fresh live check.
- **Deployment:** Not performed. No Vercel project/configuration exists in this checkout.

## 2026-10-13 — Minimal semantic response validation

- **Changes:** Added shared semantic checks to the existing Gemini and OpenRouter adapters for clear output-language mismatches, short essential descriptions, and unsupported quantities in audience, duration, deadline, percentage, storage, feature-count, rate, and currency forms. Quantities already present in the idea, saved answers, or accepted recommendations are allowed; ordinary technical versions and identifiers are not treated as quantity claims. Empty required fields continue to be rejected by the existing Zod schemas.
- **Retry and privacy:** A semantically invalid but structurally valid response gets at most one request to the same provider and model, with the same output schema and a fixed correction reason. The rejected output is not sent as retry context or logged. A second invalid result maps to the existing friendly `invalid-response` API message.
- **Verification:** Added regression tests for wrong-language Discovery and Spec text, short and empty required fields, unsupported and user-supported quantities, technical identifiers versus deadline years, successful and failed single retries, and a valid response without retry. `npm.cmd test` passed (86 tests across 18 files); `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` all passed on 2026-10-13. `git diff --check` was also run after the final documentation update.
- **Limits:** The language and quantity checks are small deterministic heuristics; they catch clear cases and common explicit measurements but cannot prove full translation or factual correctness. No live provider request or browser test was run for this validation change. No provider/model change or deployment was made.

## 2026-10-13 — Vercel Preview deployment preparation

- **Secret checks:** `.env.local` is ignored by `.gitignore` and is not tracked. A repository-text and review-archive scan found no Gemini (`AIza...`) or OpenRouter (`sk-or-v1-...`) key fingerprints. The production client bundle scan found neither format. Source inspection found provider keys read in server-side adapters and browser requests sent to the app's `/api` routes. No key values were printed or added to the client.
- **Preview configuration:** The current local provider is OpenRouter with `nvidia/nemotron-3-super-120b-a12b:free`. Preview requires `AI_PROVIDER`, secret `OPENROUTER_API_KEY`, and `OPENROUTER_MODEL`; the current Gemini key is not required for this provider selection.
- **Deployment blocker:** No `.vercel` project link or authenticated Vercel CLI session exists in this checkout. Opening the Vercel dashboard reached its login page. Authentication was left for the user; no temporary, Preview, or Production deployment was created, and no environment secret was transmitted to Vercel.
- **Verification:** Before deployment, `npm.cmd test` passed (86 tests across 18 files), and `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` passed on 2026-10-13. Live Preview smoke tests, browser network-response inspection, and mobile validation remain blocked until Vercel authentication and project linking are available.

## 2026-10-13 — Vercel first-deployment blocker

- **Configuration:** After the user completed Vercel login, linked the new `leo-4626/prompt2project` project, configured `AI_PROVIDER` and `OPENROUTER_MODEL` for Preview, and stored `OPENROUTER_API_KEY` as a Preview-only secret. `.vercelignore` excludes local environment files and the local review archive from uploads. CLI dry-run confirmed these files were excluded.
- **Deployment outcome:** Invoked the CLI with the Preview target and without `--prod`. Vercel nevertheless classified the first deployment as Production and assigned the production alias. Removed that specific deployment immediately. A fresh `vercel ls` confirmed there are no deployments under the account/project; there is no active Production or Preview deployment.
- **Cause and boundary:** This matches the reported Vercel first-deployment behavior for new projects with no deployment history ([vercel/vercel#17069](https://github.com/vercel/vercel/issues/17069)). The issue remains open; the related CLI notice change ([vercel/vercel#17206](https://github.com/vercel/vercel/pull/17206)) documents the behavior rather than fixing it. Did not retry because doing so may create another Production deployment and the user explicitly prohibited Production.
- **Verification:** Confirmed the Preview environment still contains `AI_PROVIDER`, `OPENROUTER_MODEL`, and the hidden `OPENROUTER_API_KEY` secret, all scoped to Preview. No Preview URL was created, so live smoke tests and post-deployment quality gates were not run. Pre-deployment quality gates are recorded in the preceding entry. No commit or GitHub connection was created.

## 2026-10-13 — Protected bootstrap and Preview smoke test

- **Temporary bootstrap:** With explicit user authorization, created the first deployment as Production. Vercel reported Vercel Authentication protection on its unique deployment URL. Removed both automatically assigned Production aliases afterward; verified the aliases return 404 and the alias list is empty. No custom domain was connected. Production has no environment variables.
- **Preview:** The first source-based Preview was correctly targeted but blocked because Vercel could not authorize the local Git commit author. Deployed a temporary copy of the current working tree without `.git`, `.vercel`, `node_modules`, or environment files, targeting the same Vercel project and Preview environment. No source code or Git history was changed for this packaging step. Vercel inspection confirmed `target: preview`, `status: Ready`, and Vercel Authentication protection. Preview holds `AI_PROVIDER`, `OPENROUTER_MODEL`, and secret `OPENROUTER_API_KEY`; all remain Preview-only.
- **Smoke results:** The Preview UI loaded in the authenticated browser. Portuguese Discovery initially returned 502, then a user-triggered retry succeeded with Portuguese project understanding and questions. English Discovery succeeded and returned English text. In both, unresolved decisions were shown as open questions. Two UI attempts to generate a spec ended in the friendly timeout/invalid-response state; Vercel recorded a sanitized `schema-mismatch` for short `overview.summary`, `overview.problem`, and `overview.solution` fields and one `/api/spec` 200 response, but no generated spec reached the UI or browser history. Retry remained user-triggered; no automatic request loop was observed. The present UI has a global English/Portuguese switch and no `Same as input` option. The Discovery output for these test ideas did not expose recommendation controls, so accept/reject behavior could not be exercised. Clipboard and Markdown export depend on a generated spec and could not be exercised.
- **Visual and persistence checks:** Confirmed Idea and Discovery screens render in both themes and the theme selection survives reload. Reload preserved both local-history entries, and opening the saved English project restored its Discovery content. A mobile viewport and `prefers-reduced-motion` emulation were unavailable in the browser controls used, so those remain manual checks. The browser request logs show app-backend `/api/discovery` and `/api/spec` calls; a scan of seven Preview JavaScript bundles found no Gemini or OpenRouter key fingerprints. Production environment variables remain empty, and both generated Production aliases were removed.
- **Quality verification:** Post-deployment `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` were run on 2026-10-13; results are reported with this Preview verification. No Production promotion or deploy was performed.

## 2026-10-13 — Public-use cost controls (local only)

- **Model and tokens:** Set `openai/gpt-6-luna` as the configurable OpenRouter default and in the ignored local `.env.local`. OpenRouter generation requests now cap output at 3,072 tokens for Discovery and 6,144 for Project Spec. The system prompts were shortened while retaining language, scope, schema, open-question, and unsupported-quantity guidance. The existing semantic correction remains capped at one retry.
- **Rate limit:** Added one shared atomic Upstash Redis REST Lua counter for valid requests to both `/api/discovery` and `/api/spec`: 3 generations per IP in a 24-hour window. IPs are HMAC-hashed before storage; raw IPs are not logged or sent to Redis. The hashing secret must contain at least 32 bytes. Missing or failing rate-limit configuration fails closed with a generic 503. Required server-only variables are `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_HASH_SECRET`.
- **Provider budget and UI:** OpenRouter HTTP 402 budget errors and 429 provider throttles map to a generic temporary-unavailable HTTP 503; browser-facing English and Portuguese messages do not expose provider billing details. The application quota returns HTTP 429 and a localized daily-limit message.
- **Secret check:** Added a post-build scan of browser JavaScript, CSS, and source maps for configured server credentials and common OpenRouter/Google key fingerprints. The production build scan passed against the generated `.next/static` assets using server environment values loaded by Next.js.
- **Automated verification:** `npm.cmd test` passed (102 tests across 20 files); `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` (including client-bundle secret scan), and `git diff --check` passed on 2026-10-13. Tests cover model selection/override and output caps, the shared rate-limit quota/fourth request/reset/IP separation/fail-closed behavior, route HTTP 429, provider 402, safe client messages, retry behavior, and secret-bundle scanning.
- **Not performed / remaining setup:** No live OpenRouter generation was run and no deployment was made. A shared rate-limit store must be provisioned and its three variables configured in each hosting environment before AI routes will process requests. Existing OpenRouter credentials were not displayed or changed; their exclusivity and the provider account's auto-recharge setting cannot be verified from this local code session.

## 2026-10-13 — Preview Spec validation correction

- **Diagnosis:** The user-facing failure was a `POST /api/spec` 502. A focused live reproduction with an equivalent Portuguese movie-choice idea produced an unsupported-quantity rejection on the first response, then a wrong-language rejection on the one allowed retry. Couple wording (`casal` / `couple`) was not recognized as explicit support for an audience of two, and the quantity correction did not restate the selected language.
- **Changes:** Semantic quantity validation now recognizes explicit couple/pair phrasing as an audience of two. The quantity retry explicitly preserves the selected output language. The Spec system prompt now states the minimum useful lengths already enforced by semantic validation. OpenRouter logs expose only model, allowlisted failure category, and attempt number for semantic rejections.
- **Verification:** Added regressions for English `couple`, Portuguese `casal`, explicit essential-field length guidance, safe semantic diagnostics, and language retention during quantity correction. `npm.cmd test` passed (106 tests); lint, typecheck, build, and the client-secret scan passed. A live OpenRouter Spec generation using synthetic movie-project data passed, and the deployed Preview `/api/spec` smoke request returned HTTP 200.
- **Deployment:** Published `https://prompt2project-bka4iw61v-leo-4626.vercel.app` as a protected Vercel Preview (`READY`, target `preview`). Production was not changed. The Preview daily rate-limit bypass remains enabled for manual testing until the user asks to restore it.

## 2026-10-14 — Single corrective retry for invalid structured output

- **Diagnosis:** The live Preview returned the generic invalid-response message for Project Spec. Deployment logs were not accessible in this session, so the exact failure field from that request could not be confirmed. Source tracing confirmed that malformed JSON or Zod schema mismatches threw before the shared retry helper, which retried semantic failures only. A focused regression using an overlong execution field reproduced the terminal schema-mismatch path.
- **Changes:** OpenRouter and Gemini now pass allowlisted structured-output failure reasons to the existing single-retry helper. The retry keeps the same schema, asks for concise schema-compliant output, and never includes the rejected response. A second invalid response still fails closed with the existing friendly application error. Server logs may include only the finite validation-failure code; no prompt, output, or credential is logged. No rate-limit configuration or limit changed.
- **Verification:** Added OpenRouter and Gemini regressions for recovery from a schema-invalid response, a second schema-invalid response failing after exactly one retry, and safe validation diagnostics. `npm.cmd test` passed (113 tests across 20 files), `npm.cmd run lint`, `npm.cmd run typecheck`, and `npm.cmd run build` passed; the build's client-bundle secret scan and `git diff --check` passed.
- **Not performed:** No live provider request or deployment was made. The current Preview quota had been used during the prior smoke test, so the fix still needs a new Preview deployment and real Spec/Coding Agent Prompt validation before Production readiness can be claimed.

## 2026-10-15 — Production cost limit restored

- **Changes:** Re-enabled the shared Upstash rate limit in both `/api/discovery` and `/api/spec`: three valid generations per IP in a rolling 24-hour window. Redis errors fail closed before the provider call. The client now distinguishes the app's daily generation limit from the provider quota in its localized English and Portuguese messages.
- **Production configuration:** Confirmed the required provider, model, Redis, and hash-secret variables were configured in the Production environment. Secret values are not recorded here. The deployment remains protected by Vercel Authentication; it is not yet publicly accessible.
- **Deployment and runtime check:** Published `https://prompt2project-mrvwewi9x-leo-4626.vercel.app` as a `READY` Production deployment and assigned the stable alias `https://prompt2project-leo-4626.vercel.app`. Vercel reports `vercel_authentication` protection. The protected homepage returned HTTP 200. A valid synthetic Portuguese Discovery request returned HTTP 429 with the safe daily-limit message after this IP had consumed its three generations; no further provider call was made. Earlier same-day Production smoke calls had verified Portuguese Discovery, English Discovery, and Spec with Upstash enabled.
- **Automated verification:** `npm.cmd test` passed (116 tests across 20 files); `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` (including the client-bundle secret scan), `npm.cmd audit` (0 vulnerabilities), and `git diff --check` passed on 2026-10-15.
- **Remaining manual checks:** Real clipboard copy/export and mobile viewport behavior were not exercised in this final session. Removing Vercel Authentication is a separate access change; no public access was enabled.

## 2026-10-15 — Production V1 GitHub and portfolio presentation

- **Production status:** The owner confirmed the V1 launch at `https://prompt2project.vercel.app`. This documentation task did not deploy or modify the Vercel application.
- **Presentation:** Reworked the repository README to describe the current workflow, provider abstraction, validation, rate limit, security controls, limitations, and verified quality results. Added one genuine Production capture of the New Idea screen using the synthetic customer-feedback example. Discovery, Project Spec, and Coding Agent Prompt screenshots remain uncreated because the live IP quota returned the friendly rate-limit response; no quota reset or bypass was used. Their intended filenames are listed in the README.
- **Repository hygiene:** Scanned the working tree and reachable Git history for provider key patterns; no matches were found. Confirmed `.env.local` is ignored and untracked, `.env.example` has blank credential values, and only the two intended AI API routes exist. Removed stale temporary review artifacts; retained this development log and the Next.js agent guidance.
- **GitHub publication:** Pushed the verified source as commit `7aad6a6` and changed `ledumape/prompt2project` to public after the scans passed. Set the requested description, Production website URL, and nine relevant repository topics. GitHub returned HTTP 200 for the public repository and README. No GitHub Actions runs, pull requests, or issues existed before the visibility change.
- **Portfolio publication:** Added the featured bilingual Prompt2Project card and Production screenshot to `ledumape/ledumape.github.io`, then pushed commits `c5906ce` and `bb035ed`. A browser check caught a Vinext development-runtime hook error from `next/image`; replaced it with a native lazy-loaded image, retained alt text, added a regression test, and confirmed the local console was clean. GitHub Pages workflow `38792601075` completed successfully. The live portfolio returned HTTP 200 and rendered the card, image, Live Demo, and Source Code links. Desktop and 390px mobile checks passed; the page had no horizontal overflow and the language switch worked in English and Portuguese.
- **Verification:** On 2026-10-15, Prompt2Project `npm test` passed (122 tests across 22 files), `npm run lint`, `npm run typecheck`, `npm run build` (including the client-bundle secret scan), `npm audit` (0 vulnerabilities), and `git diff --check` passed. The portfolio's final `npm test` passed (6 tests), lint passed, and the GitHub Pages export build passed with Node.js 22.
