import type { NextRequest } from "next/server";
import { UpdateNoteSchema } from "@organizaTUM/shared";
import { updateNote, deleteNote } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { sessionId, ...rest } = body as Record<string, unknown>;

  if (typeof sessionId !== "string") {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  const parsed = UpdateNoteSchema.safeParse(rest);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const note = await updateNote(id, sessionId, parsed.data);
    return Response.json({ note });
  } catch {
    return Response.json({ error: "Note not found" }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const { sessionId } = body as Record<string, unknown>;

  if (typeof sessionId !== "string") {
    return Response.json({ error: "sessionId required" }, { status: 400 });
  }

  await deleteNote(id, sessionId);
  return Response.json({ ok: true });
}
