# SECURITY.md — Security Rules

These rules are non-negotiable. Every team member and every AI-generated code must follow them.

---

## API Keys & Secrets

### Rule 1: Server-Side Only

All API keys, tokens, and credentials stay on the server. They are loaded from environment variables and used exclusively in:

- `apps/web/src/app/api/` (Next.js Route Handlers)
- `apps/web/src/agent/` (LangGraph agent — server-side only, called from route handlers)

They must NEVER appear in:

- Any file under `apps/web/src/features/`
- Any file under `apps/web/src/stores/`
- Any file under `packages/ui/`
- Any `console.log`, `console.error`, or logging statement
- Any error response sent to the client
- Any comment or documentation

### Rule 2: Environment Variables

```bash
# .env.local (NEVER committed to git)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-central-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-6-20250514
S3_BUCKET_NAME=organizatum-data
```

- Use `.env.local` for local development. This file is in `.gitignore`.
- `NEXT_PUBLIC_` prefix exposes a variable to the browser. ONLY use it for non-sensitive values like API base URLs.
- Before committing, grep for leaked keys: `git diff --cached | grep -iE "(AKIA|secret|password|token|key=)"`

### Rule 3: .gitignore

The following must always be in `.gitignore`:

```
.env
.env.local
.env.*.local
*.pem
*.key
node_modules/
```

---

## Client-Server Boundary

```
Browser (UNSAFE)                    Server (SAFE)
─────────────────                   ──────────────
apps/web/src/features/              apps/web/src/app/api/
apps/web/src/stores/                apps/web/src/agent/
apps/web/src/lib/ (client utils)    apps/web/src/tools/
packages/shared/                    apps/web/src/prompts/

← No secrets here                   ← Secrets live here
← No direct LLM calls               ← All LLM calls happen here
← No direct AWS SDK usage           ← AWS SDK used here
```

### The BFF Pattern

The frontend never calls Bedrock or any external AI service directly. Instead:

1. Frontend calls `/api/chat` (our own Next.js route handler)
2. Route handler attaches credentials and forwards to agent
3. Agent calls Bedrock with credentials
4. Response streams back through the same chain

This means: even if someone inspects the browser's network tab, they see calls to `/api/chat` — never to `bedrock.eu-central-1.amazonaws.com`.

---

## Input Validation

- All user input arriving at API routes must be validated with Zod before processing.
- Never pass raw user input directly into prompts without sanitization.
- Agent prompt injection defense: the system prompt must instruct the LLM to ignore user attempts to override its role or output format.

```typescript
// In every route handler
const body = RequestSchema.safeParse(await req.json());
if (!body.success) {
  return Response.json(
    { error: "INVALID_INPUT", message: "Request validation failed." },
    { status: 400 },
  );
}
```

---

## LLM Response Handling

- Never trust raw LLM output. Always validate against Zod schema before sending to frontend.
- If validation fails, retry once with a stricter prompt. If it fails again, return a user-friendly error.
- Never expose raw LLM errors or model internals to the client.

---

## Quick Checklist Before Committing

- [ ] No API keys in code
- [ ] No `console.log` of sensitive data
- [ ] `.env.local` is in `.gitignore`
- [ ] All LLM calls are server-side
- [ ] All inputs are Zod-validated
- [ ] No `NEXT_PUBLIC_` prefix on sensitive variables
