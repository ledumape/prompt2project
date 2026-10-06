# Prompt2Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, polished AI planning workspace that turns an idea into an editable validated project spec and coding prompt, with local history and server-side Gemini.

**Architecture:** Next.js App Router hosts a client planning workspace and narrow server route handlers. Zod owns request/response validation, a provider interface isolates Gemini, and pure domain helpers generate prompts, Markdown exports, and versioned local history.

**Tech Stack:** Next.js 16.3.8, React 19.3.0, TypeScript, Tailwind CSS 4.3.3, Zod, Vitest, `@google/genai` 2.27.0, Motion 14.0.0.

## Global Constraints

- Use browser localStorage for V1 project history; do not add a database, authentication, or remote persistence.
- Keep `GEMINI_API_KEY` server-only; validate all untrusted input and model output with Zod.
- Do not add accounts, payments, teams, GitHub integration, repository creation, RAG, vector databases, MCP, or an embedded coding agent.
- Respect `prefers-reduced-motion`; keep all animations short and productivity-safe.
- Use focused dependencies, meaningful mocked-provider tests, and Vercel-compatible server routes.

## File Map

- `app/`: App Router page, global CSS, metadata, and API route handlers.
- `components/`: planning workbench and focused form, discovery, spec, and history UI.
- `lib/schemas/`: request and structured AI response schemas.
- `lib/ai/`: provider contract, Gemini implementation, prompt builders, and application orchestration.
- `lib/domain/`: deterministic spec and coding-agent Markdown transformations.
- `lib/storage/`: versioned safe localStorage serialization.
- `tests/`: Vitest unit and route tests with an injected mock provider.
- `docs/`: this plan, architecture decisions, and factual AI development log.

## Tasks

### Task 1: Initialize app and establish domain contracts

- [x] Scaffold Next.js App Router, Tailwind, TypeScript, lint, and Vitest configuration.
- [x] Write schema and serialization tests first; confirm they fail; implement idea, discovery, challenge, spec, and project history schemas.
- [x] Run focused tests and typecheck.

### Task 2: Build deterministic project transformations

- [x] Write tests for prompt generation, section rendering, and omission of irrelevant empty values.
- [x] Implement editable typed Project Spec and coding-agent prompt builders.
- [x] Run focused tests.

### Task 3: Add server-side Gemini integration

- [x] Confirm the official SDK/API and stable model; keep model and key in server environment.
- [x] Add provider interface plus Gemini adapter using structured output and Zod post-validation.
- [x] Add validated API route handlers for discovery and spec generation; return safe errors and test with a mock provider.
- [x] Add `.env.example`, `.gitignore` safeguards, and document API choices.

### Task 4: Build the complete workbench

- [x] Implement responsive idea intake, animated concept decomposition, discovery questions, challenge decisions, and progress states.
- [x] Implement spec review/editing, prompt generation, copy/export, theme switching, and recent project reopen/delete.
- [x] Add versioned localStorage integration, loading/empty/error/configuration states, keyboard focus, and reduced-motion behavior.
- [x] Use a distinctive planning-console visual system; keep effects restrained and meaningful.

### Task 5: Document and verify

- [x] Write setup, AI pipeline, security/privacy, limitations, decisions, and Vercel deployment documentation.
- [x] Maintain `docs/AI_DEVELOPMENT_LOG.md` only with work and decisions observed in this session.
- [x] Run `npm test`, lint, typecheck, and production build; inspect repository for secrets and unfinished placeholder functionality.
- [x] Report verified results and ask for the Gemini key/model choice only if a live provider call is desired.
