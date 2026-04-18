export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { UserIdentitySchema } from "@organizaTUM/shared";
import { ensureSession, getIdentity, saveIdentity } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const identity = await getIdentity(sessionId);
  return NextResponse.json({ identity });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as unknown;
  const parsed = UserIdentitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId, ...fields } = parsed.data;
  await ensureSession(sessionId);
  await saveIdentity(sessionId, fields);

  const identity = await getIdentity(sessionId);
  return NextResponse.json({ identity });
}
