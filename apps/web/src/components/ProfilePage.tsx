"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { useUserStore } from "@/stores/user-store";
import type { UserNote, NoteCategory } from "@organizaTUM/shared";

interface ProfilePageProps {
  onClose: () => void;
}

type Tab = "profile" | "security" | "preferences" | "data";

const categoryColors: Record<NoteCategory, string> = {
  preference: "oklch(55% 0.1 240)",
  constraint: "oklch(60% 0.12 60)",
  strength: "oklch(50% 0.1 150)",
  weakness: "oklch(50% 0.12 25)",
  goal: "oklch(50% 0.1 290)",
};

const categoryBg: Record<NoteCategory, string> = {
  preference: "oklch(97% 0.02 240)",
  constraint: "oklch(97% 0.03 60)",
  strength: "oklch(97% 0.02 150)",
  weakness: "oklch(97% 0.03 25)",
  goal: "oklch(97% 0.02 290)",
};

export function ProfilePage({ onClose }: ProfilePageProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [learningStyle, setLearningStyle] = useState<"spaced" | "deep">("spaced");

  const notes = useUserStore((s) => s.notes);
  const sessionId = useUserStore((s) => s.sessionId);
  const updateNote = useUserStore((s) => s.updateNote);
  const removeNote = useUserStore((s) => s.removeNote);
  const addNote = useUserStore((s) => s.addNote);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState<NoteCategory>("preference");

  const handleAddNote = async () => {
    if (!sessionId || !newNoteContent.trim()) return;
    try {
      const res = await fetch("/api/user/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, category: newNoteCategory, content: newNoteContent.trim(), source: "manual" }),
      });
      if (res.ok) {
        const json = (await res.json()) as { note: UserNote };
        addNote(json.note);
        setNewNoteContent("");
        setAddingNote(false);
      }
    } catch { /* silent */ }
  };

  const handleEditSave = async (note: UserNote) => {
    if (!sessionId || !editContent.trim()) return;
    try {
      const res = await fetch(`/api/user/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, content: editContent.trim() }),
      });
      if (res.ok) {
        const json = (await res.json()) as { note: UserNote };
        updateNote(note.id, { content: json.note.content, updatedAt: json.note.updatedAt });
      }
    } catch { /* silent */ }
    setEditingId(null);
  };

  const handleDelete = async (note: UserNote) => {
    if (!sessionId) return;
    try {
      await fetch(`/api/user/notes/${note.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      removeNote(note.id);
    } catch { /* silent */ }
  };

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
                <Field label="Wake-up time"><input style={inputStyle} defaultValue="08:00"/></Field>
                <Field label="Sleep time"><input style={inputStyle} defaultValue="23:00"/></Field>
              </div>
            </ProfileSection>
            <ProfileSection label="Study timing">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {(["morning", "afternoon", "evening"] as const).map((t) => (
                  <PrefCard key={t} active={false} onClick={() => {}}
                    title={t.charAt(0).toUpperCase() + t.slice(1)} desc=""/>
                ))}
              </div>
            </ProfileSection>
            <ProfileSection label="Weekend preference">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <PrefCard active={false} onClick={() => {}} title="Free" desc="No studying on weekends."/>
                <PrefCard active={true} onClick={() => {}} title="Light" desc="Max 2 hours per day."/>
                <PrefCard active={false} onClick={() => {}} title="Full" desc="Treat weekends like weekdays."/>
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
            <ProfileSection label="AI insights">
              {notes.length === 0 && !addingNote && (
                <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
                  No insights yet. Chat with the assistant and it will automatically extract useful facts about your preferences, constraints, and goals to improve future planning.
                </p>
              )}
              {notes.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      isEditing={editingId === note.id}
                      editContent={editContent}
                      onEditStart={() => {
                        setEditingId(note.id);
                        setEditContent(note.content);
                      }}
                      onEditChange={setEditContent}
                      onEditSave={() => handleEditSave(note)}
                      onEditCancel={() => setEditingId(null)}
                      onDelete={() => handleDelete(note)}
                    />
                  ))}
                </div>
              )}
              {addingNote ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 8 }}>
                  <select
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value as NoteCategory)}
                    style={{ ...inputStyle, fontSize: 12 }}
                  >
                    {(["preference","constraint","strength","weakness","goal"] as NoteCategory[]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="e.g. I want to keep Friday evenings free"
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical", fontSize: 13, lineHeight: 1.4 }}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleAddNote} style={{ ...btnPrimary, fontSize: 12, padding: "6px 12px" }}>Add</button>
                    <button onClick={() => { setAddingNote(false); setNewNoteContent(""); }} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <button onClick={() => setAddingNote(true)} style={{ ...btnSecondary, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name="plus" size={12}/> Add note
                  </button>
                </div>
              )}
            </ProfileSection>
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

interface NoteCardProps {
  note: UserNote;
  isEditing: boolean;
  editContent: string;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
}

function NoteCard({ note, isEditing, editContent, onEditStart, onEditChange, onEditSave, onEditCancel, onDelete }: NoteCardProps) {
  return (
    <div style={{
      padding: "10px 14px",
      background: categoryBg[note.category],
      border: `1px solid ${categoryColors[note.category]}33`,
      borderRadius: 8,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 10, fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.06em", textTransform: "uppercase",
            color: categoryColors[note.category],
            background: `${categoryColors[note.category]}18`,
            padding: "2px 7px", borderRadius: 4, flexShrink: 0,
          }}>
            {note.category}
          </span>
          {!isEditing && (
            <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.4 }}>{note.content}</span>
          )}
        </div>
        {!isEditing && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={onEditStart} style={iconBtn} title="Edit">
              <Icon name="settings" size={13}/>
            </button>
            <button onClick={onDelete} style={{ ...iconBtn, color: "oklch(50% 0.12 25)" }} title="Delete">
              <Icon name="trash" size={13}/>
            </button>
          </div>
        )}
      </div>
      {isEditing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            value={editContent}
            onChange={(e) => onEditChange(e.target.value)}
            rows={2}
            style={{
              ...inputStyle,
              resize: "vertical",
              fontSize: 13,
              lineHeight: 1.4,
            }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onEditSave} style={{ ...btnPrimary, fontSize: 12, padding: "6px 12px" }}>Save</button>
            <button onClick={onEditCancel} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono, monospace)" }}>
        {note.source} · {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
      {desc && <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.4 }}>{desc}</div>}
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

const iconBtn: React.CSSProperties = {
  padding: "4px 6px",
  background: "transparent",
  border: "none",
  color: "var(--ink-3)",
  cursor: "pointer",
  borderRadius: 4,
  display: "flex", alignItems: "center",
};
