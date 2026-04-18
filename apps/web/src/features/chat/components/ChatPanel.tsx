"use client";

import { useCallback, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { WeeklyCalendarSchema, type AgentPhase } from "@organizaTUM/shared";
import { MessageBubble } from "./MessageBubble";
import { StatusIndicator, type ProcessStep } from "./StatusIndicator";
import { ChatInput } from "./ChatInput";
import { useUserStore } from "@/stores/user-store";
import { useCalendarStore } from "@/stores/calendar-store";

export function ChatPanel() {
  const setAgentPhase = useUserStore((s) => s.setAgentPhase);
  const sessionId = useUserStore((s) => s.sessionId);
  const tumCourses = useUserStore((s) => s.tumCourses);
  const setCalendar = useCalendarStore((s) => s.setCalendar);
  const setCalendarLoading = useCalendarStore((s) => s.setLoading);

  const { messages, data, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: {
        sessionId: sessionId ?? undefined,
        tumCourses: tumCourses ?? undefined,
      },
    });

  const [steps, setSteps] = useState<ProcessStep[]>([]);

  useEffect(() => {
    if (!data?.length) return;
    const events = data as Array<{ type: string; payload: unknown }>;
    const thinkingEvents = events.filter((e) => e.type === "thinking");
    setSteps(
      thinkingEvents.map((e, i) => ({
        label: e.payload as string,
        status: i < thinkingEvents.length - 1 || !isLoading ? "done" : "running",
      })),
    );
    for (const item of data) {
      const event = item as { type: string; payload: unknown };
      if (event.type === "phase") {
        setAgentPhase(event.payload as AgentPhase);
        setCalendarLoading(event.payload === "scheduling" || event.payload === "analysis");
      }
      if (event.type === "calendar") {
        const parsed = WeeklyCalendarSchema.safeParse(event.payload);
        if (parsed.success) {
          setCalendar(parsed.data);
          setCalendarLoading(false);
        }
      }
    }
  }, [data, isLoading, setAgentPhase, setCalendar, setCalendarLoading]);

  const wrappedSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      setSteps([]);
      handleSubmit(e);
    },
    [handleSubmit],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-tum-blue" />
        <span className="text-sm font-medium text-gray-700">OrganizaTUM</span>
      </div>

      <StatusIndicator steps={steps} isLoading={isLoading} />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={wrappedSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
