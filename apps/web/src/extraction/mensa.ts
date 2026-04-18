const BASE_URL = "https://tum-dev.github.io/eat-api/en";

interface DayMenu {
  date: string;
  [key: string]: unknown;
}

interface WeekMenu {
  days?: DayMenu[];
  [key: string]: unknown;
}

export async function getAllCanteens(): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/enums/canteens.json`);
  if (!res.ok) throw new Error(`Failed to fetch canteens: ${res.status}`);
  return res.json();
}

export async function getMenuWeek(canteenId: string, year: number, week: number): Promise<WeekMenu> {
  const weekStr = String(week).padStart(2, "0");
  const res = await fetch(`${BASE_URL}/${canteenId}/${year}/${weekStr}.json`);
  if (!res.ok) throw new Error(`Failed to fetch menu for week ${week}: ${res.status}`);
  return res.json();
}

export async function getMenuDay(canteenId: string, targetDate: Date): Promise<DayMenu | null> {
  const year = targetDate.getFullYear();
  const week = getISOWeek(targetDate);
  const menuWeek = await getMenuWeek(canteenId, year, week);

  const targetStr = formatDate(targetDate);
  return menuWeek.days?.find((d) => d.date === targetStr) ?? null;
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
