import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EAT_API = "https://tum-dev.github.io/eat-api/en";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const canteenId = searchParams.get("canteenId");
  const year = searchParams.get("year");
  const week = searchParams.get("week");

  if (!canteenId || !year || !week) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const url = `${EAT_API}/${canteenId}/${year}/${week.padStart(2, "0")}.json`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `eat-api ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
