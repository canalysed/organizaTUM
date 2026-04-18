"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type AuthTab = "signin" | "signup";

const STUDY_STYLES = ["Visual", "Reading/Writing", "Hands-on", "Mixed"];
const DIET_OPTIONS = ["No preference", "Vegetarian", "Vegan", "Halal", "Kosher", "Other"];

export function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [semester, setSemester] = useState("");
  const [studyStyle, setStudyStyle] = useState("");
  const [diet, setDiet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setError("Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL in your .env.local.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();

    if (tab === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError(err.message);
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            age: age ? parseInt(age, 10) : null,
            semester: semester ? parseInt(semester, 10) : null,
            study_style: studyStyle || null,
            diet: diet || null,
          },
        },
      });
      if (err) {
        setError(err.message);
      } else {
        setSuccess("Account created. Signing you in…");
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInErr) {
          router.push("/");
          router.refresh();
        }
      }
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ lineHeight: 1.1, display: "inline-flex", alignItems: "baseline", gap: 1 }}>
            <span style={{ fontWeight: 400, color: "var(--ink-2)", fontSize: 32 }}>Organiza</span>
            <span style={{ fontWeight: 700, color: "var(--tum)", fontSize: 42 }}>TUM</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>
            Your AI-powered TUM scheduler
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "32px 32px 28px",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid var(--line)" }}>
            {([["signin", "Sign in"], ["signup", "Sign up"]] as [AuthTab, string][]).map(([t, label]) => (
              <button
                key={t}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  color: tab === t ? "var(--ink)" : "var(--ink-3)",
                  borderBottom: tab === t ? "2px solid var(--tum)" : "2px solid transparent",
                  marginBottom: -1,
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
                onClick={() => { setTab(t); setError(null); setSuccess(null); }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tab === "signup" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: "var(--ink-3)" }}>Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Anna Müller"
                  style={inputStyle}
                  autoComplete="name"
                />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--ink-3)" }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@tum.de"
                style={inputStyle}
                autoComplete="email"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, color: "var(--ink-3)" }}>Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "signup" ? "Minimum 6 characters" : "••••••••"}
                style={inputStyle}
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {tab === "signup" && (
              <>
                <div style={{ height: 1, background: "var(--line-soft)", margin: "4px 0" }}/>
                <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Help us build your perfect schedule
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--ink-3)" }}>Age</label>
                    <input
                      type="number"
                      min={16}
                      max={99}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="22"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, color: "var(--ink-3)" }}>Semester</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      placeholder="3"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--ink-3)" }}>Learning style</label>
                  <select
                    value={studyStyle}
                    onChange={(e) => setStudyStyle(e.target.value)}
                    style={{ ...inputStyle, appearance: "none" }}
                  >
                    <option value="">Select your style…</option>
                    {STUDY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--ink-3)" }}>Dietary preference</label>
                  <select
                    value={diet}
                    onChange={(e) => setDiet(e.target.value)}
                    style={{ ...inputStyle, appearance: "none" }}
                  >
                    <option value="">Select preference…</option>
                    {DIET_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </>
            )}

            {error && (
              <p style={{ fontSize: 12, color: "oklch(50% 0.15 25)", background: "oklch(97% 0.03 25)", border: "1px solid oklch(85% 0.08 25)", borderRadius: 6, padding: "8px 12px" }}>
                {error}
              </p>
            )}

            {success && (
              <p style={{ fontSize: 12, color: "oklch(45% 0.1 150)", background: "oklch(97% 0.02 150)", border: "1px solid oklch(85% 0.06 150)", borderRadius: 6, padding: "8px 12px" }}>
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: "11px 16px",
                fontSize: 14,
                background: loading ? "var(--tum-line)" : "var(--tum)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "default" : "pointer",
                transition: "background 140ms ease",
              }}
            >
              {loading ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-3)", marginTop: 20 }}>
          {tab === "signin" ? (
            <>No account? <button style={{ color: "var(--tum)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 12 }} onClick={() => setTab("signup")}>Sign up</button></>
          ) : (
            <>Already have an account? <button style={{ color: "var(--tum)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 12 }} onClick={() => setTab("signin")}>Sign in</button></>
          )}
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  outline: "none",
  fontFamily: "inherit",
  width: "100%",
};
