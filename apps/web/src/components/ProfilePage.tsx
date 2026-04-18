"use client";

import { useState } from "react";
import { Icon } from "./Icon";

interface ProfilePageProps {
  onClose: () => void;
}

type Tab = "profile" | "security" | "preferences" | "data";

export function ProfilePage({ onClose }: ProfilePageProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [learningStyle, setLearningStyle] = useState<"spaced" | "deep">("spaced");

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "var(--bg)",
      animation: "fadeIn 240ms both",
      overflow: "auto",
    }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "60px 40px 80px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 48 }}>
          <div className="serif" style={{ fontSize: 48, lineHeight: 1.05, color: "var(--ink)" }}>
            <span style={{ fontStyle: "italic", color: "var(--ink-2)" }}>Your </span>account
          </div>
          <button
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, color: "var(--ink-2)",
              padding: "8px 12px",
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              borderRadius: 8,
            }}
            onClick={onClose}
          >
            <Icon name="close" size={13}/> Close
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 36 }}>
          {(["profile", "security", "preferences", "data"] as Tab[]).map((t) => (
            <button
              key={t}
              style={{
                padding: "10px 16px", fontSize: 13,
                color: tab === t ? "var(--ink)" : "var(--ink-3)",
                borderBottom: tab === t ? "2px solid var(--ink)" : "2px solid transparent",
                marginBottom: -1,
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "profile" && (
          <>
            <ProfileSection label="Identity">
              <Field label="Full name"><input style={inputStyle} defaultValue="Jonas Weber"/></Field>
              <Field label="TUM email"><input style={inputStyle} defaultValue="jonas.w@tum.de"/></Field>
              <Field label="Matriculation number"><input style={inputStyle} defaultValue="03781234"/></Field>
            </ProfileSection>
            <ProfileSection label="Program">
              <Field label="Degree"><input style={inputStyle} defaultValue="B.Sc. Informatics · 2nd semester"/></Field>
              <Field label="Current courses">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Linear Algebra", "Discrete Structures", "IT Security", "PGdP"].map((c) => (
                    <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", fontSize: 13, color: "var(--ink-2)", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 999 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--ink-3)" }}/>
                      {c}
                    </span>
                  ))}
                  <button style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", fontSize: 13, color: "var(--ink-3)", background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 999, cursor: "pointer" }}>
                    <Icon name="plus" size={12}/> Add
                  </button>
                </div>
              </Field>
            </ProfileSection>
          </>
        )}

        {tab === "security" && (
          <>
            <ProfileSection label="Password">
              <Field label="Current password"><input style={inputStyle} type="password" defaultValue="••••••••••"/></Field>
              <Field label="New password"><input style={inputStyle} type="password" placeholder="Minimum 10 characters"/></Field>
              <Field label="Confirm new password"><input style={inputStyle} type="password"/></Field>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={btnPrimary}>Update password</button>
                <button style={btnSecondary}>Cancel</button>
              </div>
            </ProfileSection>
            <ProfileSection label="Two-factor">
              <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
                Protect your account with an authenticator app. We recommend enabling this since your agent has access to TUMonline.
              </p>
              <div><button style={btnSecondary}>Enable 2FA</button></div>
            </ProfileSection>
            <ProfileSection label="Connected systems">
              {[
                { name: "TUMonline",  connected: true  },
                { name: "Moodle",     connected: true  },
                { name: "ZHS Sports", connected: false },
                { name: "Mensa API",  connected: true  },
              ].map((s) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <div>
                    <div style={{ fontSize: 14, color: "var(--ink)" }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: s.connected ? "oklch(55% 0.08 150)" : "var(--ink-3)", fontFamily: "var(--font-mono, monospace)", marginTop: 2 }}>
                      {s.connected ? "● connected" : "○ not linked"}
                    </div>
                  </div>
                  <button style={btnSecondary}>{s.connected ? "Disconnect" : "Connect"}</button>
                </div>
              ))}
            </ProfileSection>
          </>
        )}

        {tab === "preferences" && (
          <>
            <ProfileSection label="Learning style">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                <PrefCard active={learningStyle === "spaced"} onClick={() => setLearningStyle("spaced")}
                  title="Spaced repetition" desc="Short sessions spread across multiple days."/>
                <PrefCard active={learningStyle === "deep"} onClick={() => setLearningStyle("deep")}
                  title="Deep sessions" desc="Longer blocks, fewer days per week."/>
              </div>
            </ProfileSection>
            <ProfileSection label="Daily window">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Earliest start"><input style={inputStyle} defaultValue="08:00"/></Field>
                <Field label="Latest end"><input style={inputStyle} defaultValue="20:00"/></Field>
              </div>
            </ProfileSection>
            <ProfileSection label="Meals">
              <Field label="Preferred Mensa"><input style={inputStyle} defaultValue="Mensa Garching"/></Field>
              <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Dietary: vegetarian · no pork</p>
            </ProfileSection>
          </>
        )}

        {tab === "data" && (
          <>
            <ProfileSection label="Export">
              <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>Download all your calendars, chat history, and preferences as a single archive.</p>
              <div><button style={btnPrimary}><Icon name="export" size={13}/> Request export</button></div>
            </ProfileSection>
            <ProfileSection label="Danger zone">
              <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>Permanently delete your account and all generated schedules. This cannot be undone.</p>
              <div>
                <button style={{ ...btnSecondary, color: "oklch(50% 0.15 25)", borderColor: "oklch(70% 0.12 25)" }}>
                  Delete account
                </button>
              </div>
            </ProfileSection>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 40, paddingBottom: 36, marginBottom: 36, borderBottom: "1px solid var(--line-soft)" }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{label}</div>
      {children}
    </div>
  );
}

function PrefCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: active ? "var(--surface)" : "var(--bg-raised)",
        border: active ? "1.5px solid var(--ink)" : "1px solid var(--line)",
        borderRadius: 10,
        cursor: "pointer",
        display: "flex", flexDirection: "column", gap: 4,
      }}
      onClick={onClick}
    >
      <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  fontSize: 14, color: "var(--ink)",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 16px", fontSize: 13,
  background: "var(--ink)", color: "var(--bg-raised)",
  border: "none", borderRadius: 8,
  display: "inline-flex", alignItems: "center", gap: 6,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  padding: "10px 16px", fontSize: 13,
  background: "var(--surface)", color: "var(--ink-2)",
  border: "1px solid var(--line)", borderRadius: 8,
  cursor: "pointer",
};
