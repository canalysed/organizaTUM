export async function GET() {
  // TODO: generate .ics from current WeeklyCalendar using `ics` library
  return new Response("BEGIN:VCALENDAR\nEND:VCALENDAR", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="organizatum.ics"',
    },
  });
}
