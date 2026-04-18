"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { WeeklyCalendarSchema, UserNoteSchema, UserIdentitySchema, type AgentPhase, type TimeBlock } from "@organizaTUM/shared";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useUserStore } from "@/stores/user-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { parseTumCsv } from "@/lib/tum-csv-parser";
import { TopBar } from "./TopBar";
import { ProfilePage } from "./ProfilePage";
import { TweaksPanel } from "./TweaksPanel";
import { ChatCenter } from "@/features/chat/components/ChatCenter";
import { ChatFloat } from "@/features/chat/components/ChatFloat";
import { ChatSidebar } from "@/features/chat/components/ChatSidebar";
import { CalendarGrid, DAY_NAMES, formatT, type SelectionSlot } from "@/features/calendar/components/CalendarGrid";

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
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);

  const setAgentPhase = useUserStore((s) => s.setAgentPhase);
  const agentPhase = useUserStore((s) => s.agentPhase);
  const sessionId = useUserStore((s) => s.sessionId);
  const setSessionId = useUserStore((s) => s.setSessionId);
  const setNotes = useUserStore((s) => s.setNotes);
  const setIdentity = useUserStore((s) => s.setIdentity);
  const calendar = useCalendarStore((s) => s.calendar);
  const calendarLoading = useCalendarStore((s) => s.isLoading);
  const setCalendar = useCalendarStore((s) => s.setCalendar);
  const setCalendarLoading = useCalendarStore((s) => s.setLoading);
  const updateBlock = useCalendarStore((s) => s.updateBlock);

  const { messages, append, isLoading, data } = useChat({
    api: "/api/chat",
    initialMessages,
  });

  // On mount: resolve sessionId from auth, then hydrate data
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setSessionId(user.id);
    });
  }, [setSessionId]);

  // Hydrate profile, notes, identity, calendar when sessionId is available
  useEffect(() => {
    if (!sessionId) return;

    fetch(`/api/chat/messages?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((json: { messages: { role: string; content: string }[] }) => {
        if (json.messages?.length) {
          setInitialMessages(
            json.messages.map((m, i) => ({
              id: String(i),
              role: m.role as Message["role"],
              content: m.content,
            })),
          );
          setAppState("chatting");
        }
      })
      .catch(() => {});

    fetch(`/api/user/notes?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((json: { notes: unknown[] }) => {
        const notes = json.notes.flatMap((n) => {
          const p = UserNoteSchema.safeParse(n);
          return p.success ? [p.data] : [];
        });
        setNotes(notes);
      })
      .catch(() => {});

    fetch(`/api/user/identity?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((json: { identity: unknown }) => {
        const p = UserIdentitySchema.safeParse(json.identity);
        if (p.success) setIdentity(p.data);
      })
      .catch(() => {});

    fetch(`/api/calendar?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((json: { calendar: unknown }) => {
        if (!json.calendar) return;
        const parsed = WeeklyCalendarSchema.safeParse(json.calendar);
        if (parsed.success) {
          setCalendar(parsed.data);
          setAppState("split");
        }
      })
      .catch(() => {});
  }, [sessionId, setNotes, setCalendar, setIdentity]);

  // Process agent events (phases, calendar, sessionId)
  useEffect(() => {
    if (!data?.length) return;
    for (const item of data) {
      const event = item as { type: string; payload: unknown };
      if (event.type === "sessionId" && typeof event.payload === "string") {
        setSessionId(event.payload);
      }
      if (event.type === "phase") {
        setAgentPhase(event.payload as AgentPhase);
        if (event.payload === "scheduling") {
          setCalendarLoading(true);
          setAppState("split"); // pre-open split to show skeleton
        } else if (event.payload === "analysis") {
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
  }, [data, setAgentPhase, setCalendar, setCalendarLoading, setSessionId]);

  // Animate build progress each time a fresh calendar arrives (not on per-block edits)
  const lastCalendarIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!calendar) return;
    if (calendar.id === lastCalendarIdRef.current) return;
    lastCalendarIdRef.current = calendar.id;
    setBuildProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += 0.07;
      if (p >= 1) { p = 1; clearInterval(iv); }
      setBuildProgress(p);
    }, 70);
    return () => clearInterval(iv);
  }, [calendar]);

  const handleCsvImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const blocks = parseTumCsv(text);
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    setCalendar({
      id: crypto.randomUUID(),
      weekStart: monday.toISOString().split("T")[0]!,
      blocks,
      metadata: { generatedAt: now.toISOString(), studentName: "Student", totalStudyHours: 0, version: 1 },
    });
    setAppState("split");
    if (csvInputRef.current) csvInputRef.current.value = "";
  }, [setCalendar]);

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

  const handleBlockMove = useCallback((blockId: string, newDay: number, newStart: number, newEnd: number) => {
    updateBlock(blockId, {
      dayOfWeek: DAY_NAMES[newDay],
      startTime: formatT(newStart),
      endTime: formatT(newEnd),
    });
  }, [updateBlock]);

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
      <input ref={csvInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
      <TopBar appState={appState} buildProgress={buildProgress} onNavigate={setView}/>

      {view === "profile" ? (
        <ProfilePage onClose={() => setView("app")}/>
      ) : (
        <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
          {appState === "landing" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", animation: "fadeIn 500ms both" }}>
              <ChatCenter
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onSuggestion={handleSuggestion}
                refineBlock={refineBlock}
                onClearBlock={() => setRefineBlock(null)}
              />
              <div style={{ display: "flex", justifyContent: "center", paddingBottom: 32, animation: "fadeUp 600ms 300ms both" }}>
                <button
                  onClick={() => csvInputRef.current?.click()}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 12, color: "var(--ink-3)",
                    padding: "6px 14px", borderRadius: 999,
                    border: "1px dashed var(--line)",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "all 160ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink-2)"; e.currentTarget.style.borderColor = "var(--ink-4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-3)"; e.currentTarget.style.borderColor = "var(--line)"; }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Import TUM Online CSV
                </button>
              </div>
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
              <div style={{ padding: "16px 20px 20px 12px", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column", gap: 8, animation: "calendarIn 700ms 120ms cubic-bezier(0.2, 0.8, 0.2, 1) both" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                  <button
                    onClick={() => csvInputRef.current?.click()}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 11.5, color: "var(--ink-3)",
                      padding: "5px 10px", borderRadius: 6,
                      border: "1px solid var(--line)",
                      background: "var(--bg-raised)",
                      cursor: "pointer",
                      transition: "all 120ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink-2)"; e.currentTarget.style.background = "var(--surface)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-3)"; e.currentTarget.style.background = "var(--bg-raised)"; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import CSV
                  </button>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                <CalendarGrid
                  calendar={calendar}
                  isLoading={calendarLoading}
                  density={density}
                  blockStyle={blockStyle}
                  onBlockClick={handleBlockClick}
                  onBlockMove={handleBlockMove}
                  selectedId={refineBlock?.id ?? null}
                  buildProgress={buildProgress}
                  selection={selection}
                  onSelectionChange={setSelection}
                />
              </div>
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
