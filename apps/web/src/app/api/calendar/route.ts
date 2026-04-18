import type { NextRequest } from "next/server";
import { CalendarUpdateSchema } from "@organizaTUM/shared";
import { getCalendar } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ calendar: null });

  const calendar = await getCalendar(sessionId);
  return Response.json({ calendar });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const parsed = CalendarUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return Response.json({ ok: true });
}
