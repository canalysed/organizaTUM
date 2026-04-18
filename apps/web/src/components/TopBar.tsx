"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { useUserStore } from "@/stores/user-store";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type AppState = "landing" | "chatting" | "split";
type View = "app" | "profile";

interface TopBarProps {
  appState: AppState;
  buildProgress: number;
  onNavigate: (view: View) => void;
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

function getDisplayName(name: string | undefined, email: string | undefined): string {
  if (name && name.trim()) return name.trim().split(" ")[0];
  if (email) return email.split("@")[0];
  return "Account";
}

export function TopBar({ appState, buildProgress, onNavigate }: TopBarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const flat = appState === "landing";

  const identity = useUserStore((s) => s.identity);
  const clearAll = useUserStore((s) => s.clearAll);

  const displayName = getDisplayName(identity?.fullName, identity?.tumEmail);
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
    router.push("/login");
  };

  return (
    <div style={{
      height: 52,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px",
      borderBottom: flat ? "1px solid transparent" : "1px solid var(--line)",
      flexShrink: 0, zIndex: 5,
      background: flat ? "transparent" : "var(--bg-raised)",
    }}>
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <button
          style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: "var(--ink)", letterSpacing: "-0.005em", cursor: "pointer" }}
          onClick={() => onNavigate("app")}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "var(--ink)", color: "var(--bg-raised)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-serif, 'Instrument Serif', serif)", fontSize: 17, fontStyle: "italic",
            letterSpacing: "-0.04em",
          }}>o</div>
          <span>
            <span style={{ fontWeight: 500 }}>organiza</span>
            <span style={{ fontFamily: "var(--font-serif, 'Instrument Serif', serif)", fontStyle: "italic", fontWeight: 400 }}>TUM</span>
          </span>
        </button>

        {!flat && (
          <div style={{
            fontSize: 11, color: "var(--ink-3)",
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "3px 8px", borderRadius: 4,
            border: "1px solid var(--line)", background: "var(--surface)",
          }}>
            Week 16 · SoSe 2026
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {appState === "split" && buildProgress < 1 && (
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

        <IconBtn label="Notifications" dot>
          <Icon name="bell" size={15}/>
        </IconBtn>

        <IconBtn label="Help">
          <Icon name="help" size={15}/>
        </IconBtn>

        <div style={{ width: 1, height: 22, background: "var(--line)" }}/>

        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 4px 4px 10px",
              borderRadius: 999,
              border: "1px solid var(--line)", background: "var(--surface)",
              color: "var(--ink-2)", fontSize: 13,
            }}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span>{displayName}</span>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              background: "oklch(68% 0.09 55)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
            }}>{initials}</div>
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute", top: 48, right: 0,
              width: 280,
              background: "var(--bg-raised)", border: "1px solid var(--line)",
              borderRadius: 12, boxShadow: "var(--shadow-lg)",
              zIndex: 40, padding: 6,
              animation: "fadeUp 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
            }}>
              <div style={{
                padding: "14px 12px 12px",
                borderBottom: "1px solid var(--line-soft)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "oklch(68% 0.09 55)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 600,
                }}>{initials}</div>
                <div>
                  <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{fullName}</div>
                  {email && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{email}</div>}
                </div>
              </div>
              <div style={{ padding: 4 }}>
                <MenuItem icon="user" onClick={() => { setMenuOpen(false); onNavigate("profile"); }}>
                  Profile &amp; settings
                </MenuItem>
                <MenuItem icon="calendar">My semesters</MenuItem>
                <MenuItem icon="book">Course library</MenuItem>
                <div style={{ height: 1, background: "var(--line-soft)", margin: "4px 2px" }}/>
                <MenuItem icon="logout" onClick={handleSignOut}>Sign out</MenuItem>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, label, dot }: { children: React.ReactNode; label: string; dot?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{
        width: 32, height: 32, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: hov ? "var(--ink-2)" : "var(--ink-3)",
        background: hov ? "var(--surface)" : "transparent",
        transition: "background 120ms ease, color 120ms ease",
        position: "relative",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      aria-label={label}
    >
      {children}
      {dot && (
        <span style={{
          position: "absolute", top: 7, right: 7,
          width: 6, height: 6, borderRadius: "50%",
          background: "oklch(62% 0.12 30)",
          border: "1.5px solid var(--bg-raised)",
        }}/>
      )}
    </button>
  );
}

function MenuItem({ icon, children, onClick }: { icon: string; children: React.ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 10px", borderRadius: 7,
        fontSize: 13, color: "var(--ink-2)",
        cursor: "pointer", width: "100%", textAlign: "left",
        background: hov ? "var(--surface)" : "transparent",
        transition: "background 120ms ease",
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
