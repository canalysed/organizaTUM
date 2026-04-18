import type { NextRequest } from "next/server";
import { ChatRequestSchema } from "@organizaTUM/shared";
import { runGraph } from "@/agent/graph";

export const runtime = "nodejs";

// Formats chunks as Vercel AI SDK data stream protocol so useChat can parse
// text tokens and structured data (calendar, phase) from the same response.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (s: string) => controller.enqueue(encoder.encode(s));

      try {
        const result = await runGraph(parsed.data, (chunk) => {
          // 0: prefix = text token in AI SDK data stream protocol
          enqueue(`0:${JSON.stringify(chunk)}\n`);
        });

        // 2: prefix = structured data event — useChat exposes these in `data`
        enqueue(`2:${JSON.stringify([{ type: "phase", payload: result.currentPhase }])}\n`);

        if (result.calendar) {
          enqueue(`2:${JSON.stringify([{ type: "calendar", payload: result.calendar }])}\n`);
        }

        enqueue(`d:${JSON.stringify({ finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0 } })}\n`);
      } catch (err) {
        console.error("[chat] agent error:", err);
        enqueue(`0:${JSON.stringify("Sorry, something went wrong. Please try again.")}\n`);
        enqueue(`d:${JSON.stringify({ finishReason: "error", usage: { promptTokens: 0, completionTokens: 0 } })}\n`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
    },
  });
}
