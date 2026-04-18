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
  SE: "lecture",
  PR: "uebung",
  SV: "lecture",
  EX: "exercise",
};

interface CsvRow {
  WOCHENTAG: string;
  DATUM: string;
  VON: string;
  BIS: string;
  LV_NUMMER: string;
  TITEL: string;
  LV_ART: string;
  ORT: string;
}

function datumToIso(datum: string): string {
  // DD.MM.YYYY → YYYY-MM-DD
  const [d, m, y] = datum.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parseTumCsv(csvText: string): TimeBlock[] {
  try {
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

      // Deduplicate by course + exact date + time (same event in multiple rooms)
      const dedupeKey = `${row.LV_NUMMER}-${row.DATUM}-${row.VON}-${row.BIS}`;
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
        date: datumToIso(row.DATUM),
        courseId: row.LV_NUMMER,
        location: cleanLocation(row.ORT),
        isFixed: true,
      });
    }

    return blocks;
  } catch {
    return [];
  }
}

function cleanLocation(ort: string): string {
  if (!ort) return "";
  if (ort.startsWith("Online")) return "Online";
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
