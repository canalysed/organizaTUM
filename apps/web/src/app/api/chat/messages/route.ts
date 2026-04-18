import type { NextRequest } from "next/server";
import { getMessages } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return Response.json({ messages: [] });

  const messages = await getMessages(sessionId);
  return Response.json({ messages });
}
