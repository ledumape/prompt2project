# Prompt2Project

**Turn an idea into a buildable software project.** Prompt2Project is an AI Software Planning Copilot for developers and solo builders. It asks useful questions, challenges complexity, and turns an unfinished idea into an editable project spec and a coding agent prompt.

## Problem

Vague ideas leave important product and engineering decisions unresolved. Coding agents can produce code quickly, but unclear scope, hidden assumptions, and unverified integrations make the result harder to build and maintain.

## Solution

Prompt2Project treats planning as a product engineering task. It separates known facts from open questions, asks only questions that can change the plan, and records whether the user accepts a simpler alternative. The result is a structured specification that the user can review before handing work to a coding agent.

## Screenshots

Capture the local app after starting it with `npm run dev` and add screenshots here. No screenshot or public demo has been published yet.

## Demo

There is no hosted demo yet. Run the application locally by following [Local setup](#local-setup).

## Core features

- Describe a project with a name, idea, platform, target user, constraints, and output language.
- Explore a visual idea map that breaks the idea into its key concepts and highlights analysis progress.
- Review known information, open questions, and product engineer challenges.
- Accept or reject recommendations and answer adaptive questions.
- Generate a structured project spec and edit its fields before handoff.
- Generate a deterministic coding agent prompt from the reviewed spec and selected output language.
- Copy or export the spec and prompt as Markdown.
- Reopen or remove up to 20 recent projects saved in browser localStorage; editing and re-analyzing keeps the same project ID.
- Switch between dark and light themes; use the responsive layout on mobile.

## How it works

1. Enter an idea and optional context.
2. The server asks Gemini for validated discovery questions and recommendations.
3. Answer questions and choose which suggestions to apply.
4. Gemini returns a structured project spec that the app validates again.
5. Review or edit the spec.
6. Generate, copy, or export a coding agent prompt based on the final spec.

Questions can stay unanswered. The generated spec should preserve those gaps in `Open questions` instead of inventing answers.

## Architecture

```text
app/
  api/discovery/route.ts  Validate idea input, request discovery
  api/spec/route.ts       Validate discovery context, request project spec
  page.tsx                Application entry
components/
  workspace.tsx           Client-side planning workbench and local history
lib/
  ai/                     Provider interface, Gemini adapter, route errors
  domain/                 Language resolution, concept extraction, project updates, and Markdown exports
  schemas/                Shared Zod request and response contracts
  storage/                Versioned safe localStorage parsing
tests/                    Vitest tests with Gemini mocked
```

The browser owns interaction state, theme choice, and up to 20 saved projects. Next.js route handlers own Gemini requests. The AI provider implements a small interface so the rest of the app does not depend directly on Google SDK calls.

## AI pipeline

The application exposes two server-side operations: `POST /api/discovery` and `POST /api/spec`. Discovery and spec generation are separate because they have different schemas and the user reviews questions and challenge decisions between them. Coding-prompt generation does not need another model call; it is deterministic from the user's edited spec.

Both Gemini calls request JSON output with a JSON Schema and then parse the result through Zod before returning it. The browser checks the response schema once more before it changes application state. Gemini interactions set `store: false`. The API key and model name are read only by the server adapter.

The model instruction treats user content as untrusted project data. This is useful input guidance, not a substitute for validating every generated field. A malformed response is rejected and displayed as a retryable error.

## Structured output

`lib/schemas/project.ts` defines the request and domain schemas. The discovery contract includes known and missing information, up to seven adaptive questions, challenges, and a readiness signal. The project spec is organized into Overview, Product, Engineering, Quality, and Execution. Irrelevant lists can be empty; uncertain integrations belong in risks or open questions.

The output language can be English, Brazilian Portuguese, or the same language as the initial idea. The selected language applies to Gemini's generated content, Markdown section and field labels, and the fixed instructions in the coding-agent prompt. “Same as input” uses a shared English/Portuguese language detector for both model requests and exports. The project text itself remains intact in Markdown. The application interface remains English in V1.

## Technology stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 and custom responsive CSS
- Zod 4 for server, client, and AI output validation
- Google `@google/genai` JavaScript SDK with the Gemini Interactions API
- Gemini 3.8 Flash as the default configurable stable model
- Motion for short transitions and Lucide for interface icons
- Vitest and Testing Library for automated checks
- Browser localStorage for versioned project history
- Vercel-compatible Node.js route handlers

The source is released under the [MIT License](LICENSE).

Before changing the model, check the current [Gemini model list](https://ai.google.dev/gemini-api/docs/models), [SDK quickstart](https://ai.google.dev/gemini-api/docs/get-started?lang=node), and [structured output documentation](https://ai.google.dev/gemini-api/docs/structured-output). Model availability and SDK behavior may change.

## Local setup

**Requirements:** Node.js 20.9 or later and npm.

```bash
npm install
Copy-Item .env.example .env.local
```

Add your API key to `.env.local`, then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To build and run the production version:

```bash
npm run build
npm start
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes for AI actions | Google AI Studio API key. Read by the server only. |
| `GEMINI_MODEL` | No | Gemini model identifier. Defaults to `gemini-3.8-flash`. |

`.env.example` contains blank values. Keep actual environment files out of source control. On Vercel, configure these values in the project environment settings; never use a `NEXT_PUBLIC_` prefix for the key.

## Testing

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Vitest mocks `@google/genai`; automated tests do not need a real API key or a live provider request.

## Security and privacy

- Gemini calls and API-key access stay on the server.
- API inputs are size-limited and validated before a provider call.
- AI outputs are parsed as JSON and validated by the same Zod domain schemas used by the client.
- Provider errors do not return raw SDK messages or stack traces.
- The API key is never written into browser storage, browser bundles, or logs by this app.
- Project history and theme preference stay in this browser. Remove a project in the sidebar or clear the browser's site storage to erase it.
- Project ideas, discovery context, and spec context are sent to Google Gemini for processing when the related actions run. The app does not store the interaction with Google's API (`store: false`); review Google's current terms and data handling before sending confidential information.

V1 has no accounts and no reliable distributed rate limiter. A publicly accessible deployment can let visitors spend the deployment owner's Gemini quota. Keep a personal deployment access-controlled at the hosting layer or add a reviewed rate-limiting strategy before opening it publicly.

## Product decisions

- **Two AI requests:** Discovery and spec generation remain separate so people can decide which recommendations to accept before the spec is written.
- **No AI prompt-generation call:** A deterministic, language-aware transformation gives the coding agent consistent requirements and keeps the user's edits authoritative.
- **Local history only:** V1 does not create accounts or send saved projects to a database. History is capped at 20 projects and malformed or old storage is ignored safely.
- **Open questions are allowed:** People can generate the spec before they know every answer; uncertainty stays visible.
- **No invented integrations:** The model is asked to flag uncertainty, and the spec includes risks and open questions to carry it forward.
- **Animation serves state:** The idea map extracts up to three distinct concepts from the user's text, connects them to a build plan, and highlights the current analysis step without replacing the map with a generic loading panel. Motion stays short, responsive, and disabled for `prefers-reduced-motion`.

## Limitations

- A Gemini key and an available model are needed to run analysis and spec generation.
- There is no live API validation in an automated test; the provider is mocked. Set a real key to verify account, quota, and model access in a local session.
- The public-facing server endpoints do not include account authentication or robust shared rate limiting.
- Browser localStorage is device- and browser-specific. Clearing site storage removes project history.
- The interface copy is English, though generated content supports English and Portuguese.
- A generated spec is a draft for review, not a guarantee that external services, APIs, or requirements are current.
- No hosted demo or screenshots are available yet.

## Future improvements

- Add browser-level end-to-end checks for the discovery-to-export flow.
- Add import/export for saved project history while keeping local-first defaults.
- Add a reviewed deployment-side abuse-control approach before public hosting.
- Capture screenshots and publish a demo after reviewing model quality with a real API key.

## AI-assisted development

Generative AI assisted planning, implementation, test design, debugging, security review, and documentation in this development session. The repository includes [`docs/AI_DEVELOPMENT_LOG.md`](docs/AI_DEVELOPMENT_LOG.md) with observed examples and verification outcomes. It does not claim unrun live Gemini checks or unpublished deployment results.
