# TASKS.md — Hackathon Sprint Plan

Ordered by priority. Work top-to-bottom. Don't jump ahead unless the current task is blocked.

---

## Phase 0: Scaffolding ✅ DONE

> Goal: Monorepo boots, app runs, team can work.

- [x] Initialize pnpm workspace with Turborepo
- [x] Scaffold `packages/shared` with Zod schemas (TimeBlock, WeeklyCalendar, UserProfile, Course, OnboardingResponse, RefinementRequest)
- [x] Scaffold `apps/web` — Next.js 15 App Router, Tailwind, basic layout
- [x] Agent code lives inside `apps/web/src/` (no separate service — see Architecture decision below)
- [x] Create `.env.local.example` with AWS credential placeholders
- [x] Create `src/data/` with mocked JSON files (courses, mensa, events)
- [ ] Copy `.env.local.example` → `.env.local` and fill in AWS credentials
- [ ] Run `pnpm install` and confirm `pnpm dev` starts the app on port 3000
- [ ] Verify Bedrock connection — send a test prompt, get a response

### Architecture Decision
There is no `apps/agent`. Everything runs inside `apps/web` as Next.js route handlers (server-side). AWS credentials stay on the server, never reach the browser. Single Vercel deployment, no extra services needed.

---

## Phase 1: Core Agent (Next 2-3 hours)

> Goal: Agent can hold an onboarding conversation and produce a calendar.

- [x] Build LangGraph state machine skeleton (`src/agent/graph.ts`, `src/agent/state.ts`)
- [x] Scaffold all 5 nodes (`onboarding`, `analysis`, `scheduling`, `refinement`, `leisure`)
- [x] Write prompt templates for each node (`src/prompts/`)
- [x] Scaffold agent tools (`src/tools/`)
- [ ] Implement `onboarding` node — wire up real conversation loop, test it responds correctly
- [ ] Implement `analysis` node — test difficulty adjustment logic
- [ ] Implement `scheduling` node — test it produces a valid WeeklyCalendar JSON
- [ ] Validate all agent outputs against Zod schemas (already enforced via `generateObject`)
- [ ] Test full flow via curl: `POST /api/chat` → streaming response → calendar JSON

---

## Phase 2: Frontend Chat + Calendar (Parallel with Phase 1)

> Goal: Working split-screen UI with chat and calendar.

- [x] Build split-panel layout: ChatPanel (left 40%) + CalendarPanel (right 60%)
- [x] Integrate Vercel AI SDK `useChat` hook pointing to `/api/chat`
- [x] Build `/api/chat/route.ts` — calls LangGraph directly, streams response
- [x] Render chat messages with progressive status indicators
- [x] Skeleton/placeholder CalendarPanel
- [x] Integrate FullCalendar.js — replaced with custom CalendarGrid (7-day, drag-drop, overlap layout)
- [x] Render WeeklyCalendar data as time grid blocks with color coding by block type
- [x] Skeleton loaders for calendar while agent generates

---

## Phase 3: Calendar Interaction (Next 1-2 hours)

> Goal: User can modify the generated calendar.

- [x] Make TimeBlocks clickable → opens BlockEditor (skeleton in place)
- [ ] BlockEditor pre-fills chat: "Change [block description] to..."
- [ ] Send modification as chat message with refinement metadata
- [ ] Implement `refinement` node fully — modifies calendar based on request
- [ ] Re-render calendar with changes highlighted (brief animation or color flash)
- [ ] Support global modifications via chat ("make mornings lighter")

---

## Phase 4: Polish & Extras (Remaining time)

> Goal: Demo-ready product.

- [x] Export button scaffold (`ExportButton.tsx`)
- [ ] .ics export — implement real calendar file generation using `ics` library
- [ ] `leisure` node — implement activity suggestions for break slots
- [ ] Mensa integration — show menu in meal blocks, respect dietary preferences
- [ ] Mobile-responsive layout (tabbed Chat | Calendar)
- [ ] Onboarding polish — welcome screen, "Get Started" flow
- [ ] Status messages during agent processing ("Analyzing your courses...", "Building your schedule...", "Almost there...")
- [ ] Error states — graceful handling when agent fails

---

## Phase 5: Demo Prep (Last 1-2 hours)

> Goal: Smooth, compelling 5-minute demo.

- [ ] Prepare a demo user persona (specific courses, preferences, learning style)
- [ ] Rehearse the full flow: open app → onboarding chat → calendar generated → modify a block → export
- [ ] Prepare backup: pre-generated calendar JSON in case live demo has API issues
- [ ] Write 3 slides max: Problem → Solution → Impact
- [ ] Practice pitch: 30-second hook, 2-minute demo, 1-minute architecture, 30-second impact

---

## Stretch Goals (Only if ahead of schedule)

- [ ] RAG over course knowledge base (S3 Vectors + Titan Embeddings)
- [ ] Weekly review agent — "How did this week go?" → adjusts next week
- [ ] Real TUM data scraping (Mensa API, TUM News RSS)
- [ ] Multi-week view — plan the entire semester
- [ ] Google Calendar integration (OAuth + Calendar API)

---

## Task Assignment Guide

| Team Member     | Focus Area                              |
| --------------- | --------------------------------------- |
| Backend person  | Phase 1 (implement agent nodes fully)   |
| Frontend person | Phase 2 (FullCalendar) → Phase 3        |
| Both converge   | Phase 3 (integration) + Phase 4 (polish)|
| Both converge   | Phase 5 (demo prep)                     |
