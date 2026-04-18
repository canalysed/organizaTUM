"use client";

import { useState, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { WeeklyCalendarSchema, type AgentPhase, type TimeBlock } from "@organizaTUM/shared";
import { useUserStore } from "@/stores/user-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { TopBar } from "./TopBar";
import { ProfilePage } from "./ProfilePage";
import { TweaksPanel } from "./TweaksPanel";
import { ChatCenter } from "@/features/chat/components/ChatCenter";
import { ChatFloat } from "@/features/chat/components/ChatFloat";
import { ChatSidebar } from "@/features/chat/components/ChatSidebar";
import { CalendarGrid, type SelectionSlot } from "@/features/calendar/components/CalendarGrid";

type AppState = "landing" | "chatting" | "split";
type View = "app" | "profile";
type Density = "compact" | "roomy";
type BlockStyleType = "muted" | "mono" | "accent";

export function AppClient() {
  const [view, setView] = useState<View>("app");
  const [appState, setAppState] = useState<AppState>("landing");
  const [input, setInput] = useState("");
  const [buildProgress, setBuildProgress] = useState(1);
  const [density, setDensity] = useState<Density>("roomy");
  const [blockStyle, setBlockStyle] = useState<BlockStyleType>("muted");
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [refineBlock, setRefineBlock] = useState<TimeBlock | null>(null);
  const [selection, setSelection] = useState<SelectionSlot[]>([]);

  const setAgentPhase = useUserStore((s) => s.setAgentPhase);
  const agentPhase = useUserStore((s) => s.agentPhase);
  const calendar = useCalendarStore((s) => s.calendar);
  const setCalendar = useCalendarStore((s) => s.setCalendar);
  const setCalendarLoading = useCalendarStore((s) => s.setLoading);

  const { messages, append, isLoading, data } = useChat({ api: "/api/chat" });

  // Process agent events (phases, calendar)
  useEffect(() => {
    if (!data?.length) return;
    for (const item of data) {
      const event = item as { type: string; payload: unknown };
      if (event.type === "phase") {
        setAgentPhase(event.payload as AgentPhase);
        if (event.payload === "scheduling" || event.payload === "analysis") {
          setCalendarLoading(true);
        }
      }
      if (event.type === "calendar") {
        const parsed = WeeklyCalendarSchema.safeParse(event.payload);
        if (parsed.success) {
          setCalendar(parsed.data);
          setCalendarLoading(false);
          setAppState("split");
        }
      }
    }
  }, [data, setAgentPhase, setCalendar, setCalendarLoading]);

  // Animate build progress when entering split view
  useEffect(() => {
    if (appState === "split") {
      setBuildProgress(0);
      let p = 0;
      const iv = setInterval(() => {
        p += 0.07;
        if (p >= 1) { p = 1; clearInterval(iv); }
        setBuildProgress(p);
      }, 70);
      return () => clearInterval(iv);
    }
  }, [appState]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    let text = input.trim();
    if (refineBlock) {
      text = `[${refineBlock.title}] ${text}`;
    } else if (selection.length) {
      text = `[${selection.length} time slot${selection.length === 1 ? "" : "s"}] ${text}`;
    }
    append({ role: "user", content: text });
    setInput("");
    setRefineBlock(null);
    setSelection([]);
    if (appState === "landing") setAppState("chatting");
  }, [input, refineBlock, selection, append, appState]);

  const handleSuggestion = useCallback((s: string) => {
    append({ role: "user", content: s });
    setInput("");
    if (appState === "landing") setAppState("chatting");
  }, [append, appState]);

  const handleBlockClick = useCallback((block: TimeBlock) => {
    setRefineBlock(block);
    setSelection([]);
  }, []);

  const agentStatus =
    agentPhase === "scheduling" ? "Drafting your week..."
    : agentPhase === "analysis"  ? "Analyzing your courses..."
    : agentPhase === "refinement" ? "Refining your schedule..."
    : null;

  const handleAction = (action: "regenerate" | "export" | "reset") => {
    if (action === "reset") {
      setAppState("landing");
      setRefineBlock(null);
      setSelection([]);
    } else if (action === "regenerate") {
      append({ role: "user", content: "Please regenerate and rebalance my schedule." });
    } else if (action === "export") {
      window.open("/api/calendar/export", "_blank");
    }
  };

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <TopBar appState={appState} buildProgress={buildProgress} onNavigate={setView}/>

      {view === "profile" ? (
        <ProfilePage onClose={() => setView("app")}/>
      ) : (
        <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
          {appState === "landing" && (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", animation: "fadeIn 500ms both" }}>
              <ChatCenter
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onSuggestion={handleSuggestion}
                refineBlock={refineBlock}
                onClearBlock={() => setRefineBlock(null)}
              />
            </div>
          )}

          {appState === "chatting" && (
            <ChatFloat
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isTyping={isLoading}
              refineBlock={refineBlock}
              onClearBlock={() => setRefineBlock(null)}
              selection={selection}
              onClearSelection={() => setSelection([])}
            />
          )}

          {appState === "split" && (
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "380px 1fr", animation: "splitIn 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both" }}>
              <ChatSidebar
                messages={messages}
                input={input}
                setInput={setInput}
                onSend={handleSend}
                isTyping={isLoading}
                onAction={handleAction}
                agentStatus={agentStatus}
                refineBlock={refineBlock}
                onClearBlock={() => setRefineBlock(null)}
                selection={selection}
                onSelectionChange={setSelection}
              />
              <div style={{ padding: "16px 20px 20px 12px", height: "100%", overflow: "hidden", animation: "calendarIn 700ms 120ms cubic-bezier(0.2, 0.8, 0.2, 1) both" }}>
                <CalendarGrid
                  calendar={calendar}
                  density={density}
                  blockStyle={blockStyle}
                  onBlockClick={handleBlockClick}
                  selectedId={refineBlock?.id ?? null}
                  buildProgress={buildProgress}
                  selection={selection}
                  onSelectionChange={setSelection}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <TweaksPanel
        open={tweaksOpen}
        setOpen={setTweaksOpen}
        density={density}
        setDensity={setDensity}
        blockStyle={blockStyle}
        setBlockStyle={setBlockStyle}
        appState={appState}
        setAppState={setAppState}
      />
    </div>
  );
}
