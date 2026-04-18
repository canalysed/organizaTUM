# CLAUDE.md — OrganizaTUM: Personalized Student Scheduler

## Project Overview

OrganizaTUM is an AI-powered personalized scheduling agent for TUM (Technical University of Munich) students. It creates individualized weekly schedules through a conversational onboarding flow, accounting for course difficulty, learning style, Übungsklasse selection, study sessions, meals, breaks, and leisure — all calibrated to each student's preferences and needs.

This is a hackathon project for the Reply Makeathon challenge. Speed matters, but code quality and demo polish matter more.

---

## Tech Stack

| Layer            | Technology                                     |
| ---------------- | ---------------------------------------------- |
| Monorepo         | pnpm workspaces + Turborepo                    |
| Frontend         | Next.js 15 (App Router), React 18, TypeScript  |
| Styling          | Tailwind CSS                                   |
| State Management | Zustand                                        |
| AI Streaming     | Vercel AI SDK (`useChat`, `useCompletion`)     |
| Calendar UI      | FullCalendar.js                                |
| Backend/Agent    | Next.js Route Handlers (server-side only)      |
| Agent Framework  | LangGraph.js                                   |
| LLM              | Claude Sonnet 4.6 via AWS Bedrock              |
| Embeddings       | Amazon Titan Text Embeddings v2                |
| Vector Store     | S3 Vectors                                     |
| Validation       | Zod (shared schemas, single source of truth)   |
| Calendar Export  | `ics` library                                  |
| Package Manager  | pnpm (always use pnpm, never npm or yarn)      |
| Deployment       | Vercel (single deployment, no separate backend)|

---

## Architecture

Everything runs inside `apps/web`. There is no separate backend service. Next.js route handlers run server-side on Vercel — AWS credentials never reach the browser.

```
Browser
  │
  ├── Chat (useChat) ──► POST /api/chat  ──► LangGraph (server-side)
  │                                               │
  │                                               └──► AWS Bedrock (Claude)
  │
  └── Calendar ◄── streams back from /api/chat
```

---

## Monorepo Structure

```
organizaTUM/
├── packages/
│   └── shared/              # Zod schemas, inferred types, constants
└── apps/
    └── web/                 # Next.js app — frontend + API + agent (all-in-one)
        └── src/
            ├── app/         # App Router pages and API route handlers
            ├── agent/       # LangGraph state machine + nodes
            ├── prompts/     # All AI prompt templates
            ├── tools/       # Agent tools (course lookup, mensa, events)
            ├── data/        # Static/mocked data for demo
            ├── lib/         # Bedrock client, utilities
            ├── features/    # Feature modules (chat, calendar)
            └── stores/      # Zustand stores
```

---

## Core Coding Conventions

### General Rules

- Language: TypeScript everywhere. Strict mode enabled. No `any` types.
- Use `import type {}` for type-only imports.
- Prefer `const` over `let`. Never use `var`.
- Use arrow functions for callbacks and inline functions.
- Use named exports, not default exports (exception: Next.js pages).
- File naming: `kebab-case.ts` for files, `PascalCase.tsx` for React components.
- One component per file. File name matches component name.

### Zod Schemas (Critical Pattern)

All data structures are defined as Zod schemas in `packages/shared/src/schemas/`. Types are inferred, never manually written:

```typescript
// CORRECT — define schema, infer type
export const TimeBlockSchema = z.object({ ... });
export type TimeBlock = z.infer<typeof TimeBlockSchema>;

// WRONG — manually writing a type that duplicates a schema
export interface TimeBlock { ... }
```

### Frontend Conventions

- Use `features/` pattern: each feature owns its components, hooks, and local logic.
- Hooks go in `features/<name>/hooks/`.
- Use Vercel AI SDK `useChat` for all chat interactions. Do NOT build custom streaming.
- Use Zustand for global client state (user profile, calendar data).
- Use Tailwind CSS. No CSS modules, no styled-components.
- Skeleton loaders for all async content. No empty spinners.
- Progressive status messages during agent processing, not generic "Loading...".

### Backend / Agent Conventions

- All LLM calls happen inside Next.js route handlers (`src/app/api/`). NEVER call Bedrock from the frontend.
- Every LLM response MUST be validated against its Zod schema before sending to frontend.
- Prompts live in `src/prompts/` as exported template functions, not inline strings.
- Agent nodes in LangGraph are small, single-responsibility functions.
- All API keys live in `.env.local`. Never hardcode. Never log.
- Add `export const runtime = "nodejs"` to any route handler that uses LangGraph or Bedrock.

### Error Handling

- Use try/catch with typed error responses.
- Agent errors should return a user-friendly message, not raw LLM output.
- Frontend must handle: loading, error, empty, and success states for every async operation.

### Import Order

1. Node/external modules
2. `@organizaTUM/shared` (shared package)
3. `@organizaTUM/ui` (UI package, if used)
4. `@/` imports (local app code)

---

## Agent Architecture

The agent is a LangGraph state machine with these nodes:

1. **onboarding** — Conversational flow: courses, strengths/weaknesses, learning style, fixed commitments, meal preferences, leisure interests
2. **analysis** — Cross-reference courses with difficulty knowledge base, adjust per student profile
3. **scheduling** — Generate weekly calendar with lectures (fixed), Übungsklassen (selected), study sessions (pedagogy-driven), meals, breaks, leisure
4. **refinement** — Handle user modification requests (whole calendar or specific blocks)
5. **leisure** — Suggest break activities (TU Film, TUM events, personal interests)

### Structured Output Mandate

Every agent response MUST conform to a Zod schema. The system prompt MUST include:
"Respond ONLY in valid JSON matching the provided schema. No markdown, no preamble, no explanation outside the JSON."

---

## Data Sources (Hackathon Scope)

| Source             | Status | Location                           |
| ------------------ | ------ | ---------------------------------- |
| Course difficulty  | Mocked | `src/data/courses.json`            |
| Mensa menus        | Mocked | `src/data/mensa-week.json`         |
| TUM events         | Mocked | `src/data/events.json`             |
| TU Film schedule   | Mocked | `src/data/events.json`             |
| Übungsklasse times | Mocked | `src/data/courses.json`            |
| Course RAG KB      | Stretch| S3 Vectors via Titan Embeddings    |

All paths above are relative to `apps/web/`.

---

## Key Zod Schemas (in packages/shared)

- `TimeBlockSchema` — single calendar block (lecture, study, break, meal, leisure)
- `WeeklyCalendarSchema` — full week output with metadata
- `UserProfileSchema` — student preferences, courses, learning style
- `CourseSchema` — course info with difficulty rating
- `OnboardingResponseSchema` — structured onboarding conversation state
- `RefinementRequestSchema` — user modification request

---

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start web app (port 3000)
pnpm dev:web          # Same as above, explicit filter
pnpm build            # Build for production
pnpm lint             # Lint everything
pnpm type-check       # TypeScript check across workspace
```

## Deployment

Deploy `apps/web` to Vercel. Set these environment variables in the Vercel dashboard:

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
BEDROCK_MODEL_ID
```

No other services needed. Everything runs on Vercel.

---

## Don'ts

- Do NOT use `npm` or `yarn`. This project uses `pnpm`.
- Do NOT put API keys in frontend code. All LLM calls go through route handlers.
- Do NOT create a separate backend service. Everything lives in `apps/web`.
- Do NOT manually write TypeScript interfaces that duplicate Zod schemas.
- Do NOT use default exports (except Next.js pages/layouts).
- Do NOT build custom streaming logic. Use Vercel AI SDK.
- Do NOT over-abstract. This is a hackathon. If a function is used once, inline it.
- Do NOT create files outside the established folder structure without asking.
- Do NOT use `any`. If you don't know the type, define a Zod schema for it.
- Do NOT forget `export const runtime = "nodejs"` on route handlers that use LangGraph.
