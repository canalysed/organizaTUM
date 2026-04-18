import type { NextRequest } from "next/server";
import { CreateNoteSchema } from "@organizaTUM/shared";
import { ensureSession, getNotes, createNote } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ notes: [] });

  const notes = await getNotes(sessionId);
  return Response.json({ notes });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, ...rest } = body as Record<string, unknown>;

  if (typeof sessionId !== "string") {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  const parsed = CreateNoteSchema.safeParse(rest);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await ensureSession(sessionId);
  const note = await createNote(sessionId, parsed.data);
  return Response.json({ note }, { status: 201 });
}
