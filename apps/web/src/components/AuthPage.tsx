"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type AuthTab = "signin" | "signup";
type SignupStep = 1 | 2;
type SlideDir = "none" | "exit-left" | "enter-right" | "exit-right" | "enter-left";

const STUDY_STYLES = ["Visual", "Reading/Writing", "Hands-on", "Mixed"];

const SLIDE_ANIM: Record<SlideDir, string | undefined> = {
  "none":        undefined,
  "exit-left":   "slideOutLeft 280ms ease forwards",
  "enter-right": "slideInRight 280ms cubic-bezier(0.16,1,0.3,1) both",
  "exit-right":  "slideOutRight 280ms ease forwards",
  "enter-left":  "slideInLeft 280ms cubic-bezier(0.16,1,0.3,1) both",
};

export function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>("signin");
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [slideDir, setSlideDir] = useState<SlideDir>("none");

  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [studyStyle, setStudyStyle] = useState("");
  const [program, setProgram] = useState("");
  const [semester, setSemester] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tabVisible, setTabVisible] = useState(true);
  const csvRef = useRef<HTMLInputElement>(null);

  const switchTab = (t: AuthTab) => {
    if (t === tab) return;
    setTabVisible(false);
    setTimeout(() => {
      setTab(t);
      setSignupStep(1);
      setSlideDir("none");
      setError(null);
      setSuccess(null);
      setTabVisible(true);
    }, 160);
  };

  const goToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSlideDir("exit-left");
    setTimeout(() => {
      setSignupStep(2);
      setSlideDir("enter-right");
    }, 290);
  };

  const goBackToStep1 = () => {
    setSlideDir("exit-right");
    setTimeout(() => {
      setSignupStep(1);
      setSlideDir("enter-left");
    }, 290);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setError("Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL in .env.local.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setError("Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL in .env.local.");
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error: err } = await supabase.auth.signUp({ email, password });

    if (err) {
      setError(err.message);
    } else {
      setSuccess("Account created. Signing you in…");
      if (csvFile) {
        try {
          const text = await csvFile.text();
          localStorage.setItem("pending_csv", text);
        } catch { /* ignore */ }
      }
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInErr && signInData.user) {
        await fetch("/api/user/identity", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: signInData.user.id,
            fullName: fullName || undefined,
            tumEmail: email || undefined,
            faculty: program || undefined,
            currentSemester: semester ? parseInt(semester, 10) : undefined,
          }),
        });
        router.push("/");
        router.refresh();
      }
    }
    setLoading(false);
  };

  const anim = SLIDE_ANIM[slideDir];

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
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ lineHeight: 1.1, display: "inline-flex", alignItems: "baseline", gap: 1 }}>
            <span style={{ fontFamily: "var(--font-prata), Georgia, serif", fontWeight: 400, fontStyle: "italic", color: "var(--ink-2)", fontSize: 52 }}>Organiza</span>
            <span style={{ fontFamily: "var(--font-exo2), system-ui, sans-serif", fontWeight: 700, color: "var(--tum)", fontSize: 57 }}>TUM</span>
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
          overflow: "hidden",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: "1px solid var(--line)" }}>
            {(["signin", "signup"] as AuthTab[]).map((t) => (
              <button
                key={t}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  color: tab === t ? "var(--ink)" : "var(--ink-3)",
                  borderBottom: tab === t ? "2px solid var(--tum)" : "2px solid transparent",
                  marginBottom: -1,
                  fontWeight: tab === t ? 500 : 400,
                }}
                onClick={() => switchTab(t)}
              >
                {t === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <div style={{
            position: "relative", overflow: "hidden",
            opacity: tabVisible ? 1 : 0,
            transform: tabVisible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 160ms ease, transform 160ms ease",
          }}>
            {/* ── Sign in ── */}
            {tab === "signin" && (
              <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Field label="Email">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@tum.de" style={inputStyle} autoComplete="email" />
                </Field>
                <Field label="Password">
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" style={inputStyle} autoComplete="current-password" />
                </Field>
                <Feedback error={error} success={success} />
                <SubmitBtn loading={loading}>Sign in</SubmitBtn>
              </form>
            )}

            {/* ── Sign up step 1 ── */}
            {tab === "signup" && signupStep === 1 && (
              <form onSubmit={goToStep2} style={{ display: "flex", flexDirection: "column", gap: 16, animation: anim }}>
                <StepIndicator step={1} />
                <Field label="Full name">
                  <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Anna Müller" style={inputStyle} autoComplete="name" />
                </Field>
                <Field label="Email">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@tum.de" style={inputStyle} autoComplete="email" />
                </Field>
                <Field label="Password">
                  <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters" style={inputStyle} autoComplete="new-password" />
                </Field>
                <Feedback error={error} success={null} />
                <SubmitBtn loading={false}>Continue</SubmitBtn>
              </form>
            )}

            {/* ── Sign up step 2 ── */}
            {tab === "signup" && signupStep === 2 && (
              <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 16, animation: anim }}>
                <StepIndicator step={2} />

                <Field label="What are you studying?">
                  <input type="text" required value={program} onChange={(e) => setProgram(e.target.value)}
                    placeholder="e.g. Informatics, Electrical Engineering…" style={inputStyle} />
                </Field>

                <Field label="Current semester">
                  <input type="number" required min={1} max={20} value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g. 3" style={inputStyle} />
                </Field>

                <Field label="Learning style">
                  <select required value={studyStyle} onChange={(e) => setStudyStyle(e.target.value)}
                    style={{ ...inputStyle, appearance: "none" }}>
                    <option value="">Select your style…</option>
                    {STUDY_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>

                <Field label="TUM Online schedule (CSV)">
                  <input ref={csvRef} type="file" accept=".csv" style={{ display: "none" }}
                    onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
                  <button
                    type="button"
                    onClick={() => csvRef.current?.click()}
                    style={{
                      ...inputStyle,
                      display: "flex", alignItems: "center", gap: 8,
                      color: csvFile ? "var(--ink)" : "var(--ink-3)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    {csvFile ? csvFile.name : "Upload CSV from TUM Online…"}
                  </button>
                  <p style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
                    Export from TUM Online → My Courses → Export CSV
                  </p>
                </Field>

                <Feedback error={error} success={success} />

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={goBackToStep1}
                    style={{
                      flex: "0 0 auto",
                      padding: "11px 14px",
                      fontSize: 14,
                      color: "var(--ink-3)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    ←
                  </button>
                  <SubmitBtn loading={loading} flex>Create account</SubmitBtn>
                </div>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-3)", marginTop: 20 }}>
          {tab === "signin" ? (
            <>No account?{" "}
              <button style={{ color: "var(--tum)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}
                onClick={() => switchTab("signup")}>Sign up</button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button style={{ color: "var(--tum)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}
                onClick={() => switchTab("signin")}>Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, color: "var(--ink-3)" }}>{label}</label>
      {children}
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      {[1, 2].map((s) => (
        <div key={s} style={{
          height: 3, flex: 1, borderRadius: 999,
          background: s <= step ? "var(--tum)" : "var(--line)",
          transition: "background 200ms ease",
        }} />
      ))}
    </div>
  );
}

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  if (error) return (
    <p style={{ fontSize: 12, color: "oklch(50% 0.15 25)", background: "oklch(97% 0.03 25)", border: "1px solid oklch(85% 0.08 25)", borderRadius: 6, padding: "8px 12px" }}>
      {error}
    </p>
  );
  if (success) return (
    <p style={{ fontSize: 12, color: "oklch(45% 0.1 150)", background: "oklch(97% 0.02 150)", border: "1px solid oklch(85% 0.06 150)", borderRadius: 6, padding: "8px 12px" }}>
      {success}
    </p>
  );
  return null;
}

function SubmitBtn({ loading, children, flex }: { loading: boolean; children: React.ReactNode; flex?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        flex: flex ? 1 : undefined,
        marginTop: 4,
        padding: "11px 16px",
        fontSize: 14,
        background: loading ? "var(--tum-line)" : "var(--tum)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: loading ? "default" : "pointer",
        transition: "background 140ms ease",
        fontWeight: 500,
      }}
    >
      {loading ? "Please wait…" : children}
    </button>
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
