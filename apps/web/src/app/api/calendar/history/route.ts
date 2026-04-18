import type { NextRequest } from "next/server";
import { getCalendarHistory } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ calendars: [] });

  const calendars = await getCalendarHistory(sessionId);
  return Response.json({ calendars });
}
