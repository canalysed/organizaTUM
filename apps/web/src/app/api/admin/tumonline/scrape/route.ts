export async function POST(): Promise<Response> {
  return Response.json({ error: "Use /api/tumonline/scrape instead" }, { status: 410 });
}
