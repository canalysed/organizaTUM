import type { WeeklyCalendar, RefinementRequest } from "@organizaTUM/shared";

export function refinementPrompt(
  calendar: WeeklyCalendar,
  request: RefinementRequest,
): string {
  return `You are modifying a student's weekly schedule. Use the available tools to apply the requested changes.

Current schedule:
- Student: ${calendar.metadata.studentName}
- Total blocks: ${calendar.blocks.length}
- Version: ${calendar.metadata.version}

Modification request (type: ${request.type}):
"${request.message}"
${request.targetBlockId ? `Target block ID: ${request.targetBlockId}` : ""}
${request.targetBlockTitle ? `Target block: "${request.targetBlockTitle}"` : ""}

Instructions:
1. Use listBlocks first if you need to find specific block IDs
2. For targeted changes: use moveBlock, addBlock, or removeBlock on specific blocks
3. For global restructuring: use replaceCalendar with a fully rebuilt schedule
4. Rules that must hold after your changes:
   - Blocks where isFixed = true are lectures — never move or remove them
   - No time overlaps allowed on the same day
   - Daily study load must stay ≤ 10 hours

After making all changes, confirm what you did in one short, friendly sentence. Do not use em dashes (—).`;
}
