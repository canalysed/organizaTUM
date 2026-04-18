import type { NextRequest } from "next/server";
import { TUMScrapeRequestSchema } from "@organizaTUM/shared";
import { scrapeTumOnlineCourses } from "@/lib/scraper/tumonline-scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json();
  const parsed = TUMScrapeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tumUsername, tumPassword } = parsed.data;

  try {
    const courses = await scrapeTumOnlineCourses(tumUsername, tumPassword);

    if (courses.length === 0) {
      return Response.json(
        { error: "No courses found. Check your credentials or try again." },
        { status: 422 },
      );
    }

    return Response.json({
      courseCount: courses.length,
      scrapedAt: new Date().toISOString(),
      courses,
    });
  } catch (err) {
    console.error("[tumonline-scrape] failed:", err instanceof Error ? err.message : err);
    return Response.json(
      { error: "Scraping failed. Check your credentials or try again." },
      { status: 500 },
    );
  }
}
