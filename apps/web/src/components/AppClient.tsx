"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useChat, type Message } from "@ai-sdk/react";
import { WeeklyCalendarSchema, UserNoteSchema, UserIdentitySchema, UserProfileSchema, type AgentPhase, type TimeBlock } from "@organizaTUM/shared";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { useUserStore } from "@/stores/user-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { parseTumCsv } from "@/lib/tum-csv-parser";
import { TopBar } from "./TopBar";
import { ProfilePage } from "./ProfilePage";
import { PlansPage } from "./PlansPage";
import { TweaksPanel } from "./TweaksPanel";
import { ChatCenter } from "@/features/chat/components/ChatCenter";
import { ChatFloat } from "@/features/chat/components/ChatFloat";
import { ChatSidebar } from "@/features/chat/components/ChatSidebar";
import { CalendarGrid, DAY_NAMES, formatT } from "@/features/calendar/components/CalendarGrid";

type AppState = "landing" | "chatting" | "split";
type View = "app" | "profile" | "plans";
type Density = "compact" | "roomy";
type BlockStyleType = "muted" | "mono" | "accent";

export function AppClient() {
  const router = useRouter();
  const [view, setView] = useState<View>("app");
  const [appState, setAppState] = useState<AppState>("landing");
  const [input, setInput] = useState("");
  const [buildProgress, setBuildProgress] = useState(1);
  const [density, setDensity] = useState<Density>("roomy");
  const [blockStyle, setBlockStyle] = useState<BlockStyleType>("muted");
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [refineBlock, setRefineBlock] = useState<TimeBlock | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);

  const setAgentPhase = useUserStore((s) => s.setAgentPhase);
  const agentPhase = useUserStore((s) => s.agentPhase);
  const sessionId = useUserStore((s) => s.sessionId);
  const setSessionId = useUserStore((s) => s.setSessionId);
  const setNotes = useUserStore((s) => s.setNotes);
  const setIdentity = useUserStore((s) => s.setIdentity);
  const setProfile = useUserStore((s) => s.setProfile);
  const selectedCanteenId = useUserStore((s) => s.selectedCanteenId);
  const setSelectedCanteenId = useUserStore((s) => s.setSelectedCanteenId);
  const darkMode = useUserStore((s) => s.darkMode);
  const toggleDarkMode = useUserStore((s) => s.toggleDarkMode);

  // Apply dark mode to DOM whenever it changes
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);
  const calendar = useCalendarStore((s) => s.calendar);
  const calendarLoading = useCalendarStore((s) => s.isLoading);
  const setCalendar = useCalendarStore((s) => s.setCalendar);
  const setCalendarLoading = useCalendarStore((s) => s.setLoading);
  const updateBlock = useCalendarStore((s) => s.updateBlock);
  const addBlock = useCalendarStore((s) => s.addBlock);
  const deleteBlock = useCalendarStore((s) => s.deleteBlock);

  const { messages, append, isLoading, data } = useChat({
    api: "/api/chat",
    initialMessages,
    body: { sessionId: sessionId ?? undefined },
  });

  const [messageThinking, setMessageThinking] = useState<Record<string, string[]>>({});
  const thinkingBatchStartRef = useRef<number>(0);
  const wasLoadingRef = useRef<boolean>(false);

  // On mount: resolve sessionId from auth; redirect to /login if no session
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then((result: { data: { user: { id: string } | null } }) => {
      const user = result.data.user;
      if (user) {
        setSessionId(user.id);
      } else {
        router.replace("/login");
      }
    });
  }, [router, setSessionId]);

  // Hydrate profile, notes, identity, calendar when sessionId is available
  // Also processes any pending CSV from signup (needs sessionId to persist to DB)
  useEffect(() => {
    if (!sessionId) return;

    // Consume pending CSV first — save to DB so the AI sees it on next request.
    // IMPORTANT: only remove from localStorage after a confirmed save to avoid losing data on failure.
    const pendingCsv = localStorage.getItem("pending_csv");
    if (pendingCsv) {
      try {
        const blocks = parseTumCsv(pendingCsv);
        if (blocks.length) {
          const now = new Date();
          const monday = new Date(now);
          const dow = monday.getDay();
          monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
          monday.setHours(0, 0, 0, 0);
          const cal = {
            id: crypto.randomUUID(),
            weekStart: monday.toISOString().split("T")[0]!,
            blocks,
            metadata: { generatedAt: now.toISOString(), studentName: "Student", totalStudyHours: 0, version: 1 },
          };
          setCalendar(cal);
          fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, calendar: cal }),
          })
            .then(() => localStorage.removeItem("pending_csv"))
            .catch(() => {}); // keep in localStorage for retry on next session load
        } else {
          localStorage.removeItem("pending_csv"); // empty CSV, discard
        }
      } catch {
        localStorage.removeItem("pending_csv"); // malformed CSV, discard
      }
    }

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
          setAppState((prev) => (prev === "split" ? prev : "chatting"));
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

    fetch(`/api/user/profile?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((json: { profile: unknown }) => {
        const p = UserProfileSchema.safeParse(json.profile);
        if (p.success) setProfile(p.data);
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

  // Associate thinking steps from the data stream with the assistant message they belong to
  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      thinkingBatchStartRef.current = data?.length ?? 0;
    }
    if (!isLoading && wasLoadingRef.current) {
      const events = (data ?? []) as Array<{ type: string; payload: unknown }>;
      const steps = events
        .slice(thinkingBatchStartRef.current)
        .filter((e) => e.type === "thinking")
        .map((e) => e.payload as string);
      if (steps.length > 0) {
        const lastAsstMsg = [...messages].reverse().find((m) => m.role === "assistant");
        if (lastAsstMsg) {
          setMessageThinking((prev) => ({ ...prev, [lastAsstMsg.id]: steps }));
        }
      }
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, data, messages]);

  const liveThinkingSteps = useMemo((): string[] => {
    if (!isLoading || !data?.length) return [];
    const events = data as Array<{ type: string; payload: unknown }>;
    return events
      .slice(thinkingBatchStartRef.current)
      .filter((e) => e.type === "thinking")
      .map((e) => e.payload as string);
  }, [isLoading, data]);

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
    if (csvInputRef.current) csvInputRef.current.value = "";
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Detect encoding: UTF-8 BOM → UTF-8, replacement chars → Windows-1252 (TUM export default)
      let text: string;
      if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        text = new TextDecoder("utf-8").decode(buffer);
      } else {
        const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
        text = utf8.includes("\uFFFD")
          ? new TextDecoder("windows-1252").decode(buffer)
          : utf8;
      }
      const blocks = parseTumCsv(text);
      if (!blocks.length) return;
      const now = new Date();
      const monday = new Date(now);
      const dow = monday.getDay();
      monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));
      monday.setHours(0, 0, 0, 0);
      const cal = {
        id: crypto.randomUUID(),
        weekStart: monday.toISOString().split("T")[0]!,
        blocks,
        metadata: { generatedAt: now.toISOString(), studentName: "Student", totalStudyHours: 0, version: 1 },
      };
      setCalendar(cal);
      setAppState("split");
      if (sessionId) {
        fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, calendar: cal }),
        }).catch(() => {});
      }
    } catch {
      // silent — malformed CSV just does nothing
    }
  }, [setCalendar, sessionId]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    let text = input.trim();
    if (refineBlock) {
      text = `[${refineBlock.title}] ${text}`;
    }
    append({ role: "user", content: text });
    setInput("");
    setRefineBlock(null);
    if (appState === "landing") setAppState("chatting");
  }, [input, refineBlock, append, appState]);

  const handleSuggestion = useCallback((s: string) => {
    append({ role: "user", content: s });
    setInput("");
    if (appState === "landing") setAppState("chatting");
  }, [append, appState]);

  const handleBlockClick = useCallback((block: TimeBlock) => {
    setRefineBlock(block);
  }, []);

  // Daily block instances have ids like "base-d3" — strip the suffix to get the real store id
  const resolveBlockId = (id: string) => id.replace(/-d\d+$/, "");

  const handleBlockMove = useCallback((blockId: string, newDay: number, newStart: number, newEnd: number) => {
    const realId = resolveBlockId(blockId);
    const isDailyInstance = realId !== blockId;
    updateBlock(realId, {
      // Daily blocks appear on all days — only update the time, not the day
      ...(!isDailyInstance && { dayOfWeek: DAY_NAMES[newDay] }),
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
    } else if (action === "regenerate") {
      append({ role: "user", content: "Please regenerate and rebalance my schedule." });
    } else if (action === "export") {
      window.open("/api/calendar/export", "_blank");
    }
  };

  // Split state: sidebar-left / calendar-right grid, navbar only above sidebar
  if (appState === "split" && view === "app") {
    return (
      <div style={{
        height: "100vh", width: "100vw",
        display: "grid",
        gridTemplateColumns: "380px 1fr",
        gridTemplateRows: "52px 1fr",
        background: "var(--bg)",
        overflow: "hidden",
        position: "relative",
      }}>
        <input ref={csvInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />

        {/* Navbar — column 1, row 1 only */}
        <div style={{ gridColumn: 1, gridRow: 1, borderRight: "1px solid var(--line)", zIndex: 10 }}>
          <TopBar appState={appState} buildProgress={buildProgress} onNavigate={setView}
            onHome={() => setAppState(messages.length > 0 ? "chatting" : "landing")}
            darkMode={darkMode} onToggleDark={toggleDarkMode}
          />
        </div>

        {/* Sidebar — column 1, row 2 */}
        <div style={{ gridColumn: 1, gridRow: 2, overflow: "hidden", borderRight: "1px solid var(--line)" }}>
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
            messageThinking={messageThinking}
            liveThinkingSteps={liveThinkingSteps}
          />
        </div>

        {/* Calendar — column 2, both rows (full viewport height) */}
        <div style={{
          gridColumn: 2,
          gridRow: "1 / -1",
          padding: "14px 20px 16px 14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "calendarIn 700ms 120ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        }}>
          <CalendarGrid
            calendar={calendar}
            isLoading={calendarLoading}
            density={density}
            blockStyle={blockStyle}
            onBlockClick={handleBlockClick}
            onBlockMove={handleBlockMove}
            selectedId={refineBlock?.id ?? null}
            buildProgress={buildProgress}
            onImportCsv={() => csvInputRef.current?.click()}
            selectedCanteenId={selectedCanteenId}
            onCanteenChange={setSelectedCanteenId}
            onAddBlock={addBlock}
            onUpdateBlock={(id, updates) => updateBlock(resolveBlockId(id), updates)}
            onDeleteBlock={(id) => deleteBlock(resolveBlockId(id))}
          />
        </div>

        <TweaksPanel
          open={tweaksOpen} setOpen={setTweaksOpen}
          density={density} setDensity={setDensity}
          blockStyle={blockStyle} setBlockStyle={setBlockStyle}
          appState={appState} setAppState={setAppState}
          darkMode={darkMode} onToggleDark={toggleDarkMode}
        />
      </div>
    );
  }

  // Landing / chatting / profile states: full-width navbar layout
  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      <input ref={csvInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCsvImport} />
      <TopBar appState={appState} buildProgress={buildProgress} onNavigate={setView}
        darkMode={darkMode} onToggleDark={toggleDarkMode}
      />

      {view === "profile" ? (
        <ProfilePage onClose={() => setView("app")}/>
      ) : view === "plans" ? (
        <PlansPage
          onClose={() => setView("app")}
          onOpen={(cal) => { setCalendar(cal); setView("app"); setAppState("split"); }}
        />
      ) : (
        <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
          {appState === "landing" && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 500ms both" }}>
              <ChatCenter
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onSuggestion={handleSuggestion}
                refineBlock={refineBlock}
                onClearBlock={() => setRefineBlock(null)}
                onViewCalendar={() => setAppState("split")}
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
            />
          )}
        </div>
      )}

      <TweaksPanel
        open={tweaksOpen} setOpen={setTweaksOpen}
        density={density} setDensity={setDensity}
        blockStyle={blockStyle} setBlockStyle={setBlockStyle}
        appState={appState} setAppState={setAppState}
        darkMode={darkMode} onToggleDark={toggleDarkMode}
      />
    </div>
  );
}
