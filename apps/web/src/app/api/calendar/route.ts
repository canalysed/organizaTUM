import type { NextRequest } from "next/server";
import { WeeklyCalendarSchema, CalendarUpdateSchema } from "@organizaTUM/shared";

export async function GET() {
  // TODO: fetch from agent service or session store
  return Response.json({ calendar: null });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const parsed = CalendarUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // TODO: apply update via agent service
  return Response.json({ ok: true });
}
