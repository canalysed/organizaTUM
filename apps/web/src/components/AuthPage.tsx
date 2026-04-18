"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type AuthTab = "signin" | "signup";

export function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
      } else {
        setSuccess("Account created. Signing you in…");
        // Auto sign in after signup (email confirmation disabled in dashboard)
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
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="serif" style={{ fontSize: 36, color: "var(--ink)", lineHeight: 1.1 }}>
            <span style={{ fontStyle: "italic", color: "var(--ink-2)" }}>organiza</span>TUM
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
                  borderBottom: tab === t ? "2px solid var(--ink)" : "2px solid transparent",
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
                background: "var(--ink)",
                color: "var(--bg-raised)",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-3)", marginTop: 20 }}>
          {tab === "signin" ? (
            <>No account? <button style={{ color: "var(--ink-2)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 12 }} onClick={() => setTab("signup")}>Sign up</button></>
          ) : (
            <>Already have an account? <button style={{ color: "var(--ink-2)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 12 }} onClick={() => setTab("signin")}>Sign in</button></>
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
