import type { Course } from "@organizaTUM/shared";
import type { RawScrapedCourse } from "./tumonline-transformer";
import { transformAll } from "./tumonline-transformer";

async function getBrowser() {
  const chromium = await import("@sparticuz/chromium");
  const { chromium: pw } = await import("playwright-core");

  const executablePath =
    process.env.NODE_ENV === "production"
      ? await chromium.default.executablePath()
      : process.env.CHROMIUM_PATH ?? undefined;

  return pw.launch({
    args: chromium.default.args,
    executablePath,
    headless: process.env.SCRAPER_HEADLESS !== "false",
  });
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

// Parse "Wednesday, 12:00 - 13:30 from 22.04.2026 to 15.07.2026" or
//       "Wednesday , 12:00 - 13:30 from ..."
function parseTimeText(text: string): { day: string; start: string; end: string } | null {
  const m = text.match(
    /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*,?\s*(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/i,
  );
  if (!m) return null;
  return { day: m[1], start: m[2], end: m[3] };
}

// Parse "VO | 2 SWS" → { type: "VO", sws: 2 }
function parseCourseType(text: string): { type: string; sws: number } | null {
  const m = text.match(/^(VO|UE|SE|PR|SV|EX)\s*\|\s*(\d+)\s*SWS/i);
  if (!m) return null;
  return { type: m[1].toUpperCase(), sws: Number(m[2]) };
}

// ── Scrape one course's "Dates and Groups" page ───────────────────────────────

interface GroupSlot {
  groupName: string;
  day: string;
  start: string;
  end: string;
  room?: string;
}

async function scrapeCourseDatesAndGroups(
  page: import("playwright-core").Page,
  detailUrl: string,
): Promise<GroupSlot[]> {
  await page.goto(detailUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Click "Dates and Groups" nav item if present
  try {
    const datesLink = page.getByRole("link", { name: /dates and groups/i });
    if (await datesLink.isVisible({ timeout: 3000 })) {
      await datesLink.click();
      await page.waitForTimeout(1000);
    }
  } catch { /* already on the right section */ }

  // Expand all collapsed groups (click chevron/expand buttons)
  const expandBtns = await page.$$('[class*="expand"], [aria-expanded="false"], button[class*="toggle"]');
  for (const btn of expandBtns) {
    await btn.click().catch(() => {});
  }
  await page.waitForTimeout(500);

  // Extract all group blocks from the page text
  const slots: GroupSlot[] = [];

  // Each group section contains: group name heading, then time+room rows
  const groupSections = await page.$$('[class*="group"], [class*="appointment"], section, article');

  for (const section of groupSections) {
    const text = (await section.textContent()) ?? "";
    if (!text.trim()) continue;

    // Find a group name line (e.g. "Group BIE", "Group A", "Gruppe 01")
    const groupMatch = text.match(/Group\s+(\w+)|Gruppe\s+(\w+)/i);
    const groupName = groupMatch ? (groupMatch[1] ?? groupMatch[2]) : "default";

    // Find all time lines within this section
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const parsed = parseTimeText(line);
      if (!parsed) continue;

      // Room is usually on the next non-empty line or in the same text block
      const roomMatch = text.match(/(\d+\.\d+\.\d+[^\n]*Hörsaal[^\n]*|[A-Z]{1,3}\s+\d+\.\d+)/);
      const room = roomMatch?.[1]?.trim();

      slots.push({ groupName, ...parsed, room });
    }
  }

  // Fallback: parse raw page text if structured selectors found nothing
  if (slots.length === 0) {
    const fullText = (await page.textContent("body")) ?? "";
    const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);

    let currentGroup = "default";
    for (const line of lines) {
      if (/^Group\s+\w+$/i.test(line) || /^Gruppe\s+\w+$/i.test(line)) {
        currentGroup = line.replace(/^(Group|Gruppe)\s+/i, "");
        continue;
      }
      const parsed = parseTimeText(line);
      if (parsed) {
        slots.push({ groupName: currentGroup, ...parsed });
      }
    }
  }

  return slots;
}

// ── Main scraper ──────────────────────────────────────────────────────────────

export async function scrapeTumOnlineCourses(
  username: string,
  password: string,
): Promise<Course[]> {
  const browser = await getBrowser();

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30_000);

    // ── 1. Login via TUM SSO ──────────────────────────────────────────────────
    await page.goto("https://campus.tum.de", { waitUntil: "networkidle" });

    // SSO login form (Shibboleth IdP)
    await page.waitForSelector('input[name="username"], input[id="username"]', { timeout: 15_000 });
    await page.fill('input[name="username"], input[id="username"]', username);
    await page.fill('input[name="password"], input[id="password"]', password);
    await page.keyboard.press("Enter");

    // ── 2. Handle hooks/announcements page ────────────────────────────────────
    // TUMOnline shows an info page at wbEeHooks.showHooks before the main app
    await page.waitForURL(/campus\.tum\.de/, { timeout: 20_000 });
    await page.waitForTimeout(1500);

    if (page.url().includes("wbEeHooks.showHooks")) {
      // Click "Weiter" (Continue) button
      const weiterBtn = page.getByRole("button", { name: /weiter/i })
        .or(page.locator('input[value="Weiter"]'))
        .or(page.locator('button:has-text("Weiter")'));
      await weiterBtn.first().click({ timeout: 10_000 });
      await page.waitForTimeout(2000);
    }

    // ── 3. Navigate to My Courses ─────────────────────────────────────────────
    const coursesUrl =
      "https://campus.tum.de/tumonline/ee/ui/ca2/app/desktop/#/slc.tm.cp/student/courses";
    await page.goto(coursesUrl, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // Click "My courses" tab
    const myCoursesTab = page
      .getByRole("tab", { name: /my courses/i })
      .or(page.locator('[role="tab"]:has-text("My courses")'))
      .or(page.locator('button:has-text("My courses")'));
    await myCoursesTab.first().click({ timeout: 10_000 });
    await page.waitForTimeout(2000);

    // ── 4. Extract course list ─────────────────────────────────────────────────
    // Each card has: course number, type badge (VO/UE | X SWS), title link, lecturers
    const courseLinks = await page.$$eval("a[href]", (anchors) =>
      anchors
        .map((a) => ({
          href: (a as HTMLAnchorElement).href,
          text: (a as HTMLAnchorElement).textContent?.trim() ?? "",
        }))
        .filter(
          (l) =>
            l.href.includes("/student/courses/") &&
            !l.href.includes("$scrollTo") &&
            l.text.length > 3,
        ),
    );

    // Deduplicate by href
    const seen = new Set<string>();
    const uniqueLinks = courseLinks.filter((l) => {
      if (seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    });

    if (uniqueLinks.length === 0) {
      console.error("[tumonline] No course links found on My courses tab");
    }

    // ── 5. For each course, get its type and Dates & Groups ───────────────────
    // We need to also get the type (VO/UE) from the card before navigating away.
    // Collect card-level metadata first.
    interface CardInfo {
      href: string;
      title: string;
      courseNumber: string;
      typeStr: string; // "VO" | "UE" | "SE" etc.
      sws: number;
    }

    const cards: CardInfo[] = await page.$$eval(
      // Cards are list items that contain both a type badge and a title link
      "li, [class*='list-item'], [class*='course-card'], [class*='item']",
      (items) =>
        items
          .map((item) => {
            const link = item.querySelector("a[href*='/student/courses/']") as HTMLAnchorElement | null;
            if (!link) return null;

            const fullText = item.textContent ?? "";

            // Course number: 10-digit number at start of card text
            const numMatch = fullText.match(/\b(\d{7,12})\b/);
            const courseNumber = numMatch?.[1] ?? "";

            // Type badge: "VO | 2 SWS", "UE | 2 SWS"
            const typeMatch = fullText.match(/(VO|UE|SE|PR|SV|EX)\s*\|\s*(\d+)\s*SWS/i);
            const typeStr = typeMatch?.[1]?.toUpperCase() ?? "";
            const sws = typeMatch ? Number(typeMatch[2]) : 2;

            return {
              href: link.href,
              title: link.textContent?.trim() ?? "",
              courseNumber,
              typeStr,
              sws,
            };
          })
          .filter((c): c is CardInfo => c !== null && c.typeStr.length > 0),
    );

    // Merge with uniqueLinks to ensure we have all courses
    const allCards: CardInfo[] = cards.length > 0
      ? cards
      : uniqueLinks.map((l) => ({
          href: l.href,
          title: l.text,
          courseNumber: "",
          typeStr: "",
          sws: 2,
        }));

    // ── 6. Visit each course detail and scrape Dates & Groups ─────────────────
    // Group UE courses under their parent VO by matching course code from the title
    // e.g. "Introduction to Software Engineering, Exercise Session (IN0006) [1/4]"
    //   → code = "IN0006", parent = "Introduction to Software Engineering (IN0006)"

    function extractCourseCode(title: string): string {
      const m = title.match(/\(([A-Z]{2,4}\d{4,6}[A-Z]?)\)/i);
      return m?.[1]?.toUpperCase() ?? "";
    }

    interface ParsedCard extends CardInfo {
      code: string;
      slots: GroupSlot[];
    }

    const parsed: ParsedCard[] = [];

    for (const card of allCards.slice(0, 15)) {
      try {
        const detailUrl = card.href.includes("$scrollTo")
          ? card.href
          : `${card.href}?$scrollTo=toc_appointments`;

        const slots = await scrapeCourseDatesAndGroups(page, detailUrl);
        parsed.push({
          ...card,
          code: extractCourseCode(card.title),
          slots,
        });
      } catch {
        parsed.push({ ...card, code: extractCourseCode(card.title), slots: [] });
      }
    }

    // ── 7. Build RawScrapedCourse[] by grouping VO + UE under one Course ──────
    // VO courses become the main course entry.
    // UE courses with the same code become uebungsklassen of that VO.
    const voCourses = parsed.filter((c) => c.typeStr === "VO" || c.typeStr === "SE" || c.typeStr === "");
    const ueCourses = parsed.filter((c) => c.typeStr === "UE" || c.typeStr === "PR");

    const rawCourses: RawScrapedCourse[] = voCourses.map((vo) => {
      // Match UEs by course code (e.g. IN0006) or by title prefix
      const relatedUEs = ueCourses.filter((ue) => {
        if (vo.code && ue.code && vo.code === ue.code) return true;
        // Fallback: VO title appears in UE title
        const voBase = vo.title.replace(/\s*\(.*?\)\s*$/, "").trim();
        return voBase.length > 5 && ue.title.includes(voBase.slice(0, 20));
      });

      // Each UE course contributes one Übungsklasse slot per group
      const uebungsSlots = relatedUEs.flatMap((ue) =>
        ue.slots.map((s) => ({
          dayRaw: s.day,
          startRaw: s.start,
          endRaw: s.end,
          room: s.room,
        })),
      );

      // If the VO itself has no slots but UEs do, also try from VO slots
      const lectureSlots = vo.slots.map((s) => ({
        dayRaw: s.day,
        startRaw: s.start,
        endRaw: s.end,
        room: s.room,
      }));

      const credits = vo.sws >= 3 ? vo.sws * 1.5 : vo.sws * 2; // rough ECTS estimate

      return {
        tumonlineId: vo.courseNumber || new URL(vo.href).hash.split("/").pop()?.split("?")[0] || crypto.randomUUID(),
        name: vo.title,
        shortName: vo.code || vo.title.split(" ")[0],
        credits: Math.round(credits),
        lectureSlots,
        uebungsSlots,
      };
    });

    // If no VO found, treat all courses individually
    if (rawCourses.length === 0) {
      for (const c of parsed) {
        rawCourses.push({
          tumonlineId: c.courseNumber || crypto.randomUUID(),
          name: c.title,
          shortName: c.code || c.title.split(" ")[0],
          credits: c.sws * 2,
          lectureSlots: c.typeStr !== "UE" ? c.slots.map((s) => ({ dayRaw: s.day, startRaw: s.start, endRaw: s.end, room: s.room })) : [],
          uebungsSlots: c.typeStr === "UE" ? c.slots.map((s) => ({ dayRaw: s.day, startRaw: s.start, endRaw: s.end, room: s.room })) : [],
        });
      }
    }

    return transformAll(rawCourses);
  } finally {
    await browser.close();
  }
}
