import type { TimeBlock, DayOfWeek, BlockType } from "@organizaTUM/shared";

const DAY_MAP: Record<string, DayOfWeek> = {
  MO: "monday",
  DI: "tuesday",
  MI: "wednesday",
  DO: "thursday",
  FR: "friday",
  SA: "saturday",
  SO: "sunday",
};

const TYPE_MAP: Record<string, BlockType> = {
  VO: "lecture",
  UE: "uebung",
  SE: "commitment",
  PR: "uebung",
};

interface CsvRow {
  WOCHENTAG: string;
  VON: string;
  BIS: string;
  LV_NUMMER: string;
  TITEL: string;
  LV_ART: string;
  ORT: string;
}

export function parseTumCsv(csvText: string): TimeBlock[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]);
  const seen = new Set<string>();
  const blocks: TimeBlock[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseRow(line);
    const row = Object.fromEntries(
      headers.map((h, idx) => [h, values[idx] ?? ""])
    ) as unknown as CsvRow;

    // Deduplicate: same course + day + time can appear for multiple rooms
    const dedupeKey = `${row.LV_NUMMER}-${row.WOCHENTAG}-${row.VON}-${row.BIS}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const dayOfWeek = DAY_MAP[row.WOCHENTAG];
    if (!dayOfWeek) continue;

    const type: BlockType = TYPE_MAP[row.LV_ART] ?? "commitment";

    blocks.push({
      id: crypto.randomUUID(),
      type,
      title: row.TITEL.trim(),
      dayOfWeek,
      startTime: row.VON,
      endTime: row.BIS,
      courseId: row.LV_NUMMER,
      location: cleanLocation(row.ORT),
      isFixed: true,
    });
  }

  return blocks;
}

function cleanLocation(ort: string): string {
  if (!ort) return "";
  if (ort.startsWith("Online")) return "Online";
  // Remove trailing room code like "(5607.02.014)"
  return ort.replace(/\s*\(\d+[\d.]+\)\s*$/, "").trim();
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
