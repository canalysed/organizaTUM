# ARCHITECTURE.md — OrganizaTUM System Design

## System Overview

OrganizaTUM is a two-app monorepo: a Next.js frontend (`web`) and a Node.js agent backend (`agent`). They communicate via streaming HTTP. The agent orchestrates an AI-powered scheduling workflow using LangGraph, and the frontend renders the results as an interactive calendar.

```
┌─────────────────────────────────────────────────────┐
│                    User (Browser)                    │
│  ┌──────────────┐          ┌──────────────────────┐  │
│  │  Chat Panel  │◄────────►│   Calendar View      │  │
│  │  (useChat)   │          │   (FullCalendar.js)   │  │
│  └──────┬───────┘          └──────────┬───────────┘  │
│         │                             │              │
└─────────┼─────────────────────────────┼──────────────┘
          │ Stream (Vercel AI SDK)      │ REST
          ▼                             ▼
┌─────────────────────────────────────────────────────┐
│              Next.js BFF (Route Handlers)            │
│         apps/web/src/app/api/chat/route.ts           │
│         apps/web/src/app/api/calendar/route.ts       │
│                                                      │
│  - Attaches API keys server-side                     │
│  - Proxies to agent service                          │
│  - Validates responses against Zod schemas           │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP / Internal call
                      ▼
┌─────────────────────────────────────────────────────┐
│        LangGraph Agent (apps/web/src/agent/)          │
│                  graph.ts → runGraph()                │
│                                                      │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Onboarding │─►│ Analysis │─►│   Scheduling     │ │
│  │   Node     │  │   Node   │  │     Node         │ │
│  └────────────┘  └──────────┘  └────────┬─────────┘ │
│                                         │            │
│                                         ▼            │
│                              ┌──────────────────┐    │
│                              │   Refinement     │◄─┐ │
│                              │     Node         │──┘ │
│                              └────────┬─────────┘    │
│                                       │              │
│                                       ▼              │
│                              ┌──────────────────┐    │
│                              │    Leisure        │    │
│                              │     Node          │    │
│                              └──────────────────┘    │
│                                                      │
│  Tools: course-lookup, mensa-menu, tum-events,       │
│         calendar-ops (apps/web/src/tools/)            │
│  LLM: Claude Sonnet 4.6 via AWS Bedrock              │
└─────────────────────────────────────────────────────┘
```

---

## Package Dependency Graph

```
packages/shared (Zod schemas, types, constants)
         ▲
         │
     apps/web
  (frontend + API + agent — all-in-one)
```

Rules:

- `packages/shared` depends on nothing internal. Only external libs (zod).
- `apps/web` depends on `packages/shared`.
- There is no `apps/agent`. The agent (LangGraph) runs inside `apps/web/src/agent/` as server-side route handler code. AWS credentials never leave the server.

---

## Agent State Machine (LangGraph)

### State Shape

```typescript
interface AgentState {
  // Conversation
  messages: Message[];
  currentPhase:
    | "onboarding"
    | "analysis"
    | "scheduling"
    | "refinement"
    | "leisure"
    | "done";

  // User Profile (built during onboarding)
  userProfile: {
    name: string;
    courses: CourseSelection[];
    learningStyle: "spaced-repetition" | "deep-session" | "unknown";
    fixedCommitments: TimeBlock[];
    mensaPreferences: MensaPreferences;
    leisureInterests: string[];
    studyStrengths: string[];
    studyWeaknesses: string[];
  } | null;

  // Analysis Results
  courseAnalysis: CourseAnalysis[] | null;

  // Generated Calendar
  calendar: WeeklyCalendar | null;

  // Refinement
  refinementRequest: RefinementRequest | null;
}
```

### Node Transitions

```
START
  │
  ▼
onboarding ──(profile complete?)──► analysis
  ▲  │                                │
  │  │(need more info)                │
  └──┘                                ▼
                                  scheduling
                                      │
                                      ▼
                              ┌─► refinement ◄─┐
                              │       │         │
                              │       ▼         │
                              │   (user wants   │
                              │    changes?)────┘
                              │       │
                              │    (no more changes)
                              │       │
                              │       ▼
                              └── leisure suggestions
                                      │
                                      ▼
                                    DONE (export .ics)
```

### Node Responsibilities

**onboarding**

- Input: user message
- Output: follow-up question OR completed UserProfile
- Logic: Conversational. Asks about courses, learning style, commitments, preferences one topic at a time. Does NOT dump all questions at once. Tracks which topics are covered and which remain.
- Transitions to `analysis` when all required fields in UserProfile are populated.

**analysis**

- Input: UserProfile
- Output: CourseAnalysis[] (difficulty ratings adjusted per student)
- Logic: Looks up each course in the knowledge base (RAG or static data). Cross-references with student's stated strengths/weaknesses. Adjusts difficulty rating per student.
- Example: LinAlg is generally "hard" but student has math background → adjusted to "medium".

**scheduling**

- Input: UserProfile + CourseAnalysis[]
- Output: WeeklyCalendar
- Logic:
  1. Place fixed blocks: lectures (non-negotiable times)
  2. Select Übungsklasse slots (optimizing for study rhythm)
  3. Distribute study sessions based on learning style:
     - spaced-repetition: short sessions spread across multiple days
     - deep-session: longer blocks, fewer days
     - unknown: default to spaced-repetition with explanation
  4. Harder courses get proportionally more study time
  5. Insert meal blocks (mensa or self-catered per preference)
  6. Insert break/leisure blocks between intensive study periods
  7. Validate: no overlaps, reasonable daily load, mandatory rest

**refinement**

- Input: user message + current WeeklyCalendar
- Output: modified WeeklyCalendar
- Logic: Parses what the user wants changed. Two modes:
  - Global: "Make mornings lighter" → reschedule across the week
  - Targeted: "Move the LinAlg session on Wednesday to Thursday" → swap specific block
- Re-validates after changes (no overlaps, constraints still met)
- Can loop back to itself if user wants more changes.

**leisure**

- Input: WeeklyCalendar + UserProfile.leisureInterests
- Output: WeeklyCalendar with enriched break suggestions
- Logic: Matches free time slots with available activities (TU Film, TUM events, personal interests). Suggests, doesn't force. Only fills blocks marked as "leisure" type.

---

## Data Flow: Chat Message Lifecycle

```
1. User types in ChatPanel
2. useChat (Vercel AI SDK) sends POST to /api/chat/route.ts
3. Route handler:
   a. Reads session/user context
   b. Attaches Bedrock API credentials
   c. Forwards to agent service with full conversation history
4. Agent service:
   a. LangGraph determines current node based on state
   b. Active node processes message with Claude via Bedrock
   c. Claude responds in structured JSON (validated against Zod)
   d. State updates, node may transition
   e. Response streamed back
5. Route handler streams response to frontend
6. Frontend:
   a. ChatPanel renders message progressively (streaming)
   b. If response contains calendar data → CalendarView updates
   c. Status indicators show agent phase ("Analyzing courses...", "Building schedule...")
```

---

## Data Flow: Calendar Modification

```
1. User clicks a TimeBlock in CalendarView
2. BlockEditor opens with pre-filled context:
   "Change [Wednesday 14:00-16:00 LinAlg study] to..."
3. User completes the prompt
4. Sent as a regular chat message with metadata:
   { type: "refinement", blockId: "abc-123", message: "move to Thursday" }
5. Agent enters refinement node
6. Returns modified calendar
7. CalendarView re-renders with changes highlighted
```

---

## Frontend Component Tree

```
App (layout.tsx)
├── LandingPage (page.tsx)
│   └── "Get Started" → navigates to /chat
│
└── ChatPage (chat/page.tsx)
    ├── ChatPanel (features/chat/)
    │   ├── MessageBubble
    │   ├── StatusIndicator (shows agent phase)
    │   └── ChatInput
    │
    └── CalendarPanel (features/calendar/)
        ├── CalendarView (FullCalendar wrapper)
        │   └── TimeBlock (individual block, clickable)
        ├── BlockEditor (modification prompt for selected block)
        └── ExportButton (.ics download)
```

Layout: Split screen. Chat on the left (~40%), Calendar on the right (~60%). On mobile: tabbed view (Chat | Calendar).

---

## API Endpoints

### POST /api/chat

- Purpose: Main conversational endpoint
- Input: `{ messages: Message[], userProfile?: UserProfile }`
- Output: Streaming text + structured JSON blocks
- Auth: Session-based (or none for hackathon demo)

### GET /api/calendar

- Purpose: Fetch current generated calendar
- Output: `WeeklyCalendar` (Zod-validated)

### PUT /api/calendar

- Purpose: Direct calendar modifications (non-AI, e.g., manual drag-drop)
- Input: `{ blockId: string, updates: Partial<TimeBlock> }`
- Output: Updated `WeeklyCalendar`

### GET /api/calendar/export

- Purpose: Download .ics file
- Output: `text/calendar` file

---

## Environment Variables

```env
# AWS Bedrock (REQUIRED)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=eu-central-1

# Bedrock Model IDs
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-6-20250514

# S3 (for vector store and data)
S3_BUCKET_NAME=organizatum-data

# App
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

`NEXT_PUBLIC_` prefix = exposed to browser. Only use for non-sensitive config.
Everything else stays server-side only.

---

## Demo Data Strategy

For the hackathon, we mock external data sources with realistic static JSON files:

| Data Source | File                                        | Contents                                                                                |
| ----------- | ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Courses     | `apps/web/src/data/course-lookup.ts`        | 6-8 popular TUM CS courses with difficulty ratings, lecture times, Übungsklasse options |
| Mensa       | `apps/web/src/data/mensa-menu.ts`           | One week of realistic Mensa Garching menu                                               |
| Events      | `apps/web/src/data/tum-events.ts`           | TU Film screenings, TUM student events for the week                                     |

This data is loaded by agent tools and injected into prompts as context. The architecture supports swapping these with real API calls later without changing the agent logic.
