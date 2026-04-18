"use client";

import { useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { WeeklyCalendarSchema, type AgentPhase } from "@organizaTUM/shared";
import { MessageBubble } from "./MessageBubble";
import { StatusIndicator } from "./StatusIndicator";
import { ChatInput } from "./ChatInput";
import { useUserStore } from "@/stores/user-store";
import { useCalendarStore } from "@/stores/calendar-store";

export function ChatPanel() {
  const agentPhase = useUserStore((s) => s.agentPhase);
  const setAgentPhase = useUserStore((s) => s.setAgentPhase);
  const setCalendar = useCalendarStore((s) => s.setCalendar);
  const setCalendarLoading = useCalendarStore((s) => s.setLoading);

  const { messages, data, input, handleInputChange, handleSubmit, isLoading } =
    useChat({ api: "/api/chat" });

  // Drive calendar panel from structured data events the agent emits
  useEffect(() => {
    if (!data?.length) return;
    for (const item of data) {
      const event = item as { type: string; payload: unknown };
      if (event.type === "phase") {
        setAgentPhase(event.payload as AgentPhase);
        // Show loading spinner in calendar panel while scheduling is in progress
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
  }, [data, setAgentPhase, setCalendar, setCalendarLoading]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-tum-blue" />
        <span className="text-sm font-medium text-gray-700">OrganizaTUM</span>
      </div>

      <StatusIndicator phase={agentPhase} isLoading={isLoading} />

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <ChatInput
        input={input}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
