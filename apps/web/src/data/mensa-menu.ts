import mensaData from "@/data/mensa-week.json";

export async function getMensaMenu(): Promise<typeof mensaData> {
  return mensaData;
}
