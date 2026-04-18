export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { UserProfileSchema } from "@organizaTUM/shared";
import { ensureSession, getProfile, saveProfile } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { sessionId?: string } & Record<string, unknown>;
  const { sessionId, ...rest } = body;

  if (!sessionId || typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  await ensureSession(sessionId);

  const existing = await getProfile(sessionId);
  const merged = { ...existing, ...rest };

  const parsed = UserProfileSchema.safeParse(merged);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await saveProfile(sessionId, parsed.data);
  return NextResponse.json({ profile: parsed.data });
}
