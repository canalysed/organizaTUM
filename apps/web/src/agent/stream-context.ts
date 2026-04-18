import { AsyncLocalStorage } from "node:async_hooks";
import type { WeeklyCalendar } from "@organizaTUM/shared";

export type AgentStreamEvent =
  | { type: "chunk"; payload: string }
  | { type: "thinking"; payload: string }
  | { type: "calendar"; payload: WeeklyCalendar };

type StreamCallback = (event: AgentStreamEvent) => void;

const storage = new AsyncLocalStorage<StreamCallback>();

export function runWithStreamContext<T>(
  callback: StreamCallback,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(callback, fn);
}

export function emitThinking(payload: string): void {
  storage.getStore()?.({ type: "thinking", payload });
}
