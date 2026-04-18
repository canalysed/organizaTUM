"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useUserStore } from "@/stores/user-store";
import { useCalendarStore } from "@/stores/calendar-store";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type AppState = "landing" | "chatting" | "split";
type View = "app" | "profile";

interface TopBarProps {
  appState: AppState;
  buildProgress: number;
  onNavigate: (view: View) => void;
  onHome?: () => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
}

function getInitials(name: string | undefined, email: string | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}


export function TopBar({ appState, buildProgress, onNavigate, onHome, darkMode, onToggleDark }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const flat = appState === "landing";
  const compact = appState === "split";

  const identity = useUserStore((s) => s.identity);
  const clearAll = useUserStore((s) => s.clearAll);
  const clearCalendar = useCalendarStore((s) => s.clearCalendar);

  const initials = getInitials(identity?.fullName, identity?.tumEmail);
  const fullName = identity?.fullName ?? identity?.tumEmail ?? "Your account";
  const email = identity?.tumEmail ?? "";

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    clearAll();
    clearCalendar();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div style={{
      height: 52,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px",
      borderBottom: flat ? "1px solid transparent" : "1px solid var(--line)",
      flexShrink: 0, zIndex: 5,
      background: flat ? "transparent" : "var(--bg-raised)",
    }}>
      {/* Logo */}
      <button
        style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "2px 0" }}
        onClick={() => appState === "split" && onHome ? onHome() : onNavigate("app")}
      >
        <span style={{ fontSize: 15.5, letterSpacing: "-0.01em", lineHeight: 1 }}>
          <span style={{ fontWeight: 400, color: "var(--ink-2)" }}>Organiza</span>
          <span style={{ fontWeight: 700, color: "var(--tum)" }}>TUM</span>
        </span>
      </button>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {onToggleDark && (
          <button
            onClick={onToggleDark}
            style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid transparent", background: "transparent", color: "var(--ink-3)", transition: "background 120ms ease, color 120ms ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink-2)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        )}
        {!compact && buildProgress < 1 && appState !== "landing" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", fontSize: 11.5,
            borderRadius: 999,
            background: "var(--surface)", border: "1px solid var(--line)",
            color: "var(--ink-2)",
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)", letterSpacing: "0.03em",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "oklch(62% 0.12 30)", animation: "typingPulse 1.2s infinite" }}/>
            drafting
          </div>
        )}


        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              width: 34, height: 34, borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: menuOpen ? "var(--surface)" : "transparent",
              border: menuOpen ? "1px solid var(--line)" : "1px solid transparent",
              color: "var(--ink-3)",
              transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
              position: "relative",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink-2)"; }}
            onMouseLeave={e => {
              if (!menuOpen) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }
              e.currentTarget.style.color = "var(--ink-3)";
            }}
            aria-label="Menu"
          >
            <HamburgerIcon/>
            <span style={{
              position: "absolute", top: 8, right: 8,
              width: 5, height: 5, borderRadius: "50%",
              background: "var(--tum)",
              border: "1.5px solid var(--bg-raised)",
            }}/>
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", top: 42, right: 0,
              width: 264,
              background: "var(--bg-raised)", border: "1px solid var(--line)",
              borderRadius: 12, boxShadow: "var(--shadow-lg)",
              zIndex: 50, padding: 6,
              animation: "fadeUp 150ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
            }}>
              <div style={{
                padding: "12px 12px 10px",
                borderBottom: "1px solid var(--line-soft)",
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 2,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--tum)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 600, flexShrink: 0,
                }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 500, lineHeight: 1.3 }}>{fullName}</div>
                  {email && <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 1 }}>{email}</div>}
                </div>
              </div>
              <div style={{ padding: "2px 0" }}>
                <MenuItem icon="user" onClick={() => { setMenuOpen(false); onNavigate("profile"); }}>
                  Profile &amp; settings
                </MenuItem>
                <MenuItem icon="calendar">My semesters</MenuItem>
                <MenuItem icon="book">Course library</MenuItem>
                <div style={{ height: 1, background: "var(--line-soft)", margin: "4px 6px" }}/>
                <MenuItem icon="logout" onClick={handleSignOut}>Sign out</MenuItem>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
      <rect x="0" y="0"   width="16" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="0" y="5.1" width="11" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="0" y="10.2" width="16" height="1.8" rx="0.9" fill="currentColor"/>
    </svg>
  );
}


function MenuItem({ icon, children, onClick }: { icon: string; children: React.ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 7,
        fontSize: 13, color: hov ? "var(--ink)" : "var(--ink-2)",
        cursor: "pointer", width: "100%", textAlign: "left",
        background: hov ? "var(--surface)" : "transparent",
        transition: "background 100ms ease, color 100ms ease",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      <Icon name={icon as Parameters<typeof Icon>[0]["name"]} size={14}/>
      {children}
    </button>
  );
}
