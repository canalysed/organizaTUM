"use client";

import { useState, useEffect } from "react";
import { WeeklyCalendarSchema, type WeeklyCalendar } from "@organizaTUM/shared";
import { Icon } from "./Icon";
import { useUserStore } from "@/stores/user-store";

interface PlansPageProps {
  onClose: () => void;
  onOpen: (calendar: WeeklyCalendar) => void;
}

function formatWeekRange(weekStart: string): string {
  const d = new Date(weekStart.slice(0, 10) + "T12:00:00");
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(d)} – ${fmt(end)}, ${end.getFullYear()}`;
}

function getCourseTitles(calendar: WeeklyCalendar): string[] {
  const seen = new Set<string>();
  for (const block of calendar.blocks) {
    if ((block.type === "lecture" || block.type === "uebung") && block.title) {
      seen.add(block.title);
    }
  }
  return Array.from(seen);
}

function getStudyHours(calendar: WeeklyCalendar): number {
  if (calendar.metadata.totalStudyHours > 0) return calendar.metadata.totalStudyHours;
  let mins = 0;
  for (const block of calendar.blocks) {
    if (block.type === "study") {
      const [sh = 0, sm = 0] = block.startTime.split(":").map(Number);
      const [eh = 0, em = 0] = block.endTime.split(":").map(Number);
      mins += eh * 60 + em - sh * 60 - sm;
    }
  }
  return Math.round((mins / 60) * 10) / 10;
}

export function PlansPage({ onClose, onOpen }: PlansPageProps) {
  const sessionId = useUserStore((s) => s.sessionId);
  const [calendars, setCalendars] = useState<WeeklyCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingWeek, setDeletingWeek] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/calendar/history?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((json: { calendars: unknown[] }) => {
        const parsed = (json.calendars ?? []).flatMap((c) => {
          const p = WeeklyCalendarSchema.safeParse(c);
          return p.success ? [p.data] : [];
        });
        setCalendars(parsed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleDelete = async (weekStart: string) => {
    if (!sessionId) return;
    setDeletingWeek(weekStart);
    try {
      await fetch(`/api/calendar?sessionId=${sessionId}&weekStart=${weekStart}`, {
        method: "DELETE",
      });
      setCalendars((cs) => cs.filter((c) => c.weekStart.slice(0, 10) !== weekStart));
    } finally {
      setDeletingWeek(null);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 52,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg-raised)",
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          My Plans
        </span>
        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid transparent",
            color: "var(--ink-3)",
            cursor: "pointer",
            transition: "background 120ms, border-color 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--surface)";
            e.currentTarget.style.borderColor = "var(--line)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "transparent";
          }}
          aria-label="Close"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px" }}>
        {loading ? (
          <SkeletonGrid />
        ) : calendars.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
              maxWidth: 960,
            }}
          >
            {calendars.map((cal) => {
              const ws = cal.weekStart.slice(0, 10);
              return (
                <PlanCard
                  key={ws}
                  calendar={cal}
                  onOpen={() => onOpen(cal)}
                  onDelete={() => void handleDelete(ws)}
                  isDeleting={deletingWeek === ws}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface PlanCardProps {
  calendar: WeeklyCalendar;
  onOpen: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function PlanCard({ calendar, onOpen, onDelete, isDeleting }: PlanCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const courses = getCourseTitles(calendar);
  const studyHours = getStudyHours(calendar);
  const weekLabel = formatWeekRange(calendar.weekStart);

  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: 4,
            letterSpacing: "-0.01em",
          }}
        >
          {weekLabel}
        </div>
        <div
          style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--ink-4)" }}
        >
          <span>{calendar.blocks.length} blocks</span>
          {studyHours > 0 && (
            <>
              <span>·</span>
              <span>{studyHours}h study</span>
            </>
          )}
        </div>
      </div>

      {courses.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {courses.slice(0, 4).map((name) => (
            <span
              key={name}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink-3)",
                maxWidth: 150,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          ))}
          {courses.length > 4 && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink-4)",
              }}
            >
              +{courses.length - 4}
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button
          onClick={onOpen}
          style={{
            flex: 1,
            padding: "7px 0",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            background: "var(--tum)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            transition: "opacity 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          Open
        </button>

        {confirmDelete ? (
          <button
            onClick={() => {
              setConfirmDelete(false);
              onDelete();
            }}
            disabled={isDeleting}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              background: "oklch(55% 0.15 25)",
              color: "#fff",
              border: "none",
              cursor: isDeleting ? "default" : "pointer",
              opacity: isDeleting ? 0.5 : 1,
              transition: "opacity 120ms",
            }}
          >
            {isDeleting ? "…" : "Sure?"}
          </button>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--ink-4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "background 120ms, border-color 120ms, color 120ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface)";
              e.currentTarget.style.color = "var(--ink-3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--ink-4)";
            }}
            aria-label="Delete plan"
          >
            <Icon name="trash" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
        maxWidth: 960,
      }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            height: 148,
            opacity: 0.5,
            animation: "typingPulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: 300,
        gap: 12,
      }}
    >
      <Icon name="calendar" size={32} style={{ color: "var(--ink-4)" }} />
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink-3)",
            marginBottom: 6,
          }}
        >
          No plans yet
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-4)" }}>
          Start a conversation to generate your first weekly schedule.
        </div>
      </div>
    </div>
  );
}
