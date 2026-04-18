# Data Layer Architecture: RAG vs. Direct Injection

## Decision Rule

- **Use RAG** → Data is large; only a subset is needed per query (semantic search)
- **Use Direct Injection** → Data is small or the node needs ALL of it

## Decision per Data Source

| Data | Size | Strategy | Why |
|------|------|----------|-----|
| TUM Course Catalog (full) | Large (100s+ courses) | **RAG** | During onboarding, when user says "I'm taking Mathe 2", semantic search finds the correct `courseId` |
| Selected course details | Small (3–5 courses) | Extract → JSON → inject | Analysis + Scheduling nodes need FULL details of the selected courses |
| Mensa weekly menu | Small (~2KB) | Extract → JSON → inject full | Scheduling node needs the entire menu to plan meals respecting dietary restrictions |
| TUM Events | Small (~3KB) | Extract → JSON → inject full | Leisure node needs all events to match them to free slots |

**Conclusion:** RAG is only used for course discovery during onboarding. Mensa and events are small enough to inject in full — no retrieval step needed.

---

## Extraction Layer

```
apps/web/src/extraction/
├── mensa.ts          # Mensa Garching scraper → data/mensa-week.json  (weekly)
├── courses.ts        # TUM course catalog     → data/courses.json     (per semester)
├── events.ts         # TUM events scraper     → data/events.json      (daily/weekly)
└── index-courses.ts  # Embed courses → S3 Vectors                     (after extraction)
```

Refresh is triggered via `POST /api/refresh`. Each extractor fetches, validates against a Zod schema, and writes to the corresponding JSON file. The existing tool layer (`tools/mensa-menu.ts`, `tools/course-lookup.ts`, `tools/tum-events.ts`) reads those JSON files unchanged.

> `apps/web/src/extraction/mensa.py` is deleted — Python does not belong in this TypeScript stack.

---

## RAG Layer (Course Search Only)

```
apps/web/src/lib/
├── embeddings.ts     # Amazon Titan Text Embeddings v2 client
└── vector-store.ts   # S3 Vectors read/write
```

Used exclusively in `agent/nodes/onboarding.ts`: when the user names a course, `searchCourses(query)` returns the top-3 matching courses from S3 Vectors. Only those 3 are injected into the onboarding prompt — not the full catalog.

---

## Full Data Flow

```
[Extraction — weekly/daily]
  mensa.ts         → data/mensa-week.json
  courses.ts       → data/courses.json
  events.ts        → data/events.json

[RAG Indexing — after extraction]
  index-courses.ts → courses.json → embed → S3 Vectors

[Agent — per request]
  Onboarding  → searchCourses(query)   → S3 Vectors        → top-3 inject
  Analysis    → lookupCourses(ids)     → courses.json       → full inject
  Scheduling  → getMensaMenu()         → mensa-week.json    → full inject
  Leisure     → getTumEvents()         → events.json        → full inject
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/web/src/extraction/mensa.ts` | Mensa scraper |
| `apps/web/src/extraction/courses.ts` | TUM course catalog scraper |
| `apps/web/src/extraction/events.ts` | TUM events scraper |
| `apps/web/src/extraction/index-courses.ts` | Embed + upload to S3 Vectors |
| `apps/web/src/lib/embeddings.ts` | Titan Embeddings v2 client |
| `apps/web/src/lib/vector-store.ts` | S3 Vectors read/write client |
| `apps/web/src/app/api/refresh/route.ts` | Refresh endpoint |

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/agent/nodes/onboarding.ts` | Add `searchCourses()` RAG hook |

## Files to Delete

| File | Reason |
|------|--------|
| `apps/web/src/extraction/mensa.py` | Python doesn't belong in this stack |
