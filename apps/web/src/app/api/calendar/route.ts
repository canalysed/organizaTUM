import type { NextRequest } from "next/server";
import { WeeklyCalendarSchema } from "@organizaTUM/shared";
import { getCalendar, saveCalendar, deleteCalendar, ensureSession } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ calendar: null });

  const calendar = await getCalendar(sessionId);
  return Response.json({ calendar });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, calendar: rawCalendar } = body as { sessionId?: string; calendar?: unknown };

  if (!sessionId) return Response.json({ error: "Missing sessionId" }, { status: 400 });

  const parsed = WeeklyCalendarSchema.safeParse(rawCalendar);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await ensureSession(sessionId);
  await saveCalendar(sessionId, parsed.data);
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const weekStart = req.nextUrl.searchParams.get("weekStart");

  if (!sessionId || !weekStart) {
    return Response.json({ error: "Missing sessionId or weekStart" }, { status: 400 });
  }

  await deleteCalendar(sessionId, weekStart);
  return Response.json({ ok: true });
}
