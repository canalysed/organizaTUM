const NAVIGATUM_URL = "https://nav.tum.de";

interface RoomBaseInfos {
  room: string;
  parents: string[];
  parent_names: string[];
  type: string;
}

export async function getBaseInfos(roomId: string): Promise<RoomBaseInfos> {
  const res = await fetch(`${NAVIGATUM_URL}/api/locations/${roomId}?lang=en`);
  if (!res.ok) throw new Error(`Failed to fetch room info for ${roomId}: ${res.status}`);
  const data = await res.json();
  return {
    room: data.name,
    parents: data.parents,
    parent_names: data.parent_names,
    type: data.type,
  };
}

export async function getRoom(roomId: string): Promise<string> {
  const info = await getBaseInfos(roomId);
  return info.room;
}

export async function getCampus(roomId: string): Promise<string> {
  const info = await getBaseInfos(roomId);
  return info.parent_names[1] ?? "";
}
