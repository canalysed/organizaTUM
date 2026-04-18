import eventsData from "@/data/events.json";

export async function getTumEvents(): Promise<typeof eventsData> {
  return eventsData;
}
