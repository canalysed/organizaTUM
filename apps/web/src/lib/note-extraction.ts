import { generateObject } from "ai";
import { getModel } from "@/lib/bedrock-client";
import { NoteExtractionSchema, type NoteExtraction, type ChatMessage } from "@organizaTUM/shared";
import { noteExtractionPrompt } from "@/prompts/note-extraction";
import { createNote } from "@/lib/db";

export async function extractAndSaveNotes(
  sessionId: string,
  messages: ChatMessage[],
  source: "onboarding" | "refinement",
): Promise<void> {
  try {
    const recent = messages.slice(-10);
    if (recent.filter((m) => m.role === "user").length === 0) return;

    const context = recent
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const result = await generateObject({
      model: getModel(),
      schema: NoteExtractionSchema,
      messages: [
        { role: "system", content: noteExtractionPrompt(context) },
      ],
    });

    const extraction = result.object as NoteExtraction;
    if (!extraction.hasNewInformation) return;

    const toSave = extraction.notes.filter(
      (n: NoteExtraction["notes"][number]) => n.shouldSave,
    );
    await Promise.all(
      toSave.map((n: NoteExtraction["notes"][number]) =>
        createNote(sessionId, { category: n.category, content: n.content, source }),
      ),
    );
  } catch (err) {
    console.error("[notes] extraction failed:", err);
  }
}
