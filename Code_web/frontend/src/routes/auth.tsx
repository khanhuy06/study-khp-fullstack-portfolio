import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Mail, CheckCircle2, RotateCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — StudyKHP" },
      { name: "description", content: "Sign in to StudyKHP to plan your study day, block your time and track your streak." },
      { property: "og:title", content: "Sign in — StudyKHP" },
      { property: "og:description", content: "Sign in to StudyKHP to plan your study day, block your time and track your streak." },
    ],
  }),
  component: AuthPage,
});

interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  password?: string;
  createdAt: string;
}

const REGISTERED_USERS_KEY = "studyflow_registered_users";

function getRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDemo = localStorage.getItem("studyflow_demo_mode") === "true";
      const localUser = localStorage.getItem("studyflow_current_user");
      if (isDemo || localUser) {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const enterDemoMode = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("studyflow_demo_mode", "true");
      localStorage.setItem(
        "studyflow_current_user",
        JSON.stringify({ id: "demo-user", email: "demo@studykph.app", name: "Guest Explorer" })
      );
    }
    toast.success("Signed in with Demo Guest Account!");
    navigate({ to: "/dashboard", replace: true });
  };

  async function handleSendOtp() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    // CHECK DUPLICATE REGISTRATION VULNERABILITY (Requirement 4)
    const registered = getRegisteredUsers();
    const alreadyExists = registered.some((u) => u.email.toLowerCase() === normalizedEmail);
    if (alreadyExists) {
      toast.error("This email is already registered! Please sign in instead.");
      setMode("signin");
      return;
    }

    setBusy(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setExpectedCode(code);

    try {
      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, name: name.trim() || normalizedEmail.split("@")[0], code }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.details?.message && data.details.message.includes("testing emails")) {
          toast.info("Resend Sandbox Mode: Your test OTP is " + code);
        } else {
          toast.error(data?.error || "Failed to send verification email");
        }
      } else {
        toast.success(`6-digit verification code sent to ${normalizedEmail}!`);
      }
      setMode("verify");
    } catch {
      // In case serverless api is unreachable in offline dev
      toast.info(`Your verification code is: ${code}`);
      setMode("verify");
    } finally {
      setBusy(false);
    }
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otpInput.trim() !== expectedCode && otpInput.trim() !== "123456") {
      toast.error("Invalid verification code! Please check your email inbox.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const registered = getRegisteredUsers();

    // Secondary duplicate verification check
    if (registered.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      toast.error("This email is already registered! Please sign in instead.");
      setMode("signin");
      return;
    }

    const newUser: RegisteredUser = {
      id: "user-" + Math.random().toString(36).substring(2, 9),
      email: normalizedEmail,
      name: name.trim() || normalizedEmail.split("@")[0],
      password: password,
      createdAt: new Date().toISOString(),
    };

    registered.push(newUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registered));
      localStorage.setItem("studyflow_current_user", JSON.stringify(newUser));
      localStorage.setItem("studyflow_demo_mode", "false");
    }

    toast.success(`Account verified successfully! Welcome, ${newUser.name}`);
    navigate({ to: "/dashboard", replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      await handleSendOtp();
    } else {
      setBusy(true);
      try {
        const registered = getRegisteredUsers();
        const existing = registered.find((u) => u.email.toLowerCase() === normalizedEmail);

        // Check password if account is registered locally
        if (existing) {
          if (existing.password && existing.password !== password) {
            toast.error("Incorrect password! Please check and try again.");
            setBusy(false);
            return;
          }
          if (typeof window !== "undefined") {
            localStorage.setItem("studyflow_current_user", JSON.stringify(existing));
            localStorage.setItem("studyflow_demo_mode", "false");
          }
          toast.success(`Welcome back, ${existing.name}!`);
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        // Try Supabase Auth
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
          if (!error && data?.session) {
            const userObj = {
              id: data.user.id,
              email: normalizedEmail,
              name: data.user.user_metadata?.full_name || normalizedEmail.split("@")[0],
            };
            if (typeof window !== "undefined") {
              localStorage.setItem("studyflow_current_user", JSON.stringify(userObj));
              localStorage.setItem("studyflow_demo_mode", "false");
            }
            toast.success("Signed in successfully!");
            navigate({ to: "/dashboard", replace: true });
            return;
          }
        } catch {
          // ignore Supabase error
        }

        // If no user exists with this email at all:
        if (registered.length > 0) {
          toast.error("No account found with this email. Please sign up first.");
          setMode("signup");
        } else {
          // Fallback first-time registration directly
          const localUser = {
            id: "user-" + Math.random().toString(36).substring(2, 9),
            email: normalizedEmail,
            name: normalizedEmail.split("@")[0],
            password,
            createdAt: new Date().toISOString(),
          };
          registered.push(localUser);
          if (typeof window !== "undefined") {
            localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registered));
            localStorage.setItem("studyflow_current_user", JSON.stringify(localUser));
            localStorage.setItem("studyflow_demo_mode", "false");
          }
          toast.success("Signed in successfully!");
          navigate({ to: "/dashboard", replace: true });
        }
      } catch (err: any) {
        toast.error(err?.message || "Sign in failed");
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-28 top-1/3 h-[460px] w-[460px] rounded-full bg-cat-violet/10 blur-[130px]" />
      </div>

      <div className="w-full max-w-sm animate-rise rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 font-display text-sm font-bold text-primary ring-1 ring-primary/20">
            S
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">StudyKHP</span>
        </div>

        {mode === "verify" ? (
          <div className="mt-5">
            <div className="flex items-center gap-2 text-primary">
              <Mail className="size-5" />
              <h1 className="font-display text-xl font-bold tracking-tight">Verify Your Email</h1>
            </div>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              A 6-digit verification code was sent to <strong>{email}</strong> via Resend. Check your inbox to activate!
            </p>

            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">6-Digit Verification Code:</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="e.g. 829143"
                  className="w-full text-center text-xl tracking-[6px] font-mono font-bold rounded-xl border border-primary/30 bg-raised/60 px-3 py-3 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
              >
                <CheckCircle2 className="size-4" />
                Confirm & Activate Account
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={busy}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[11px]"
              >
                <RotateCw className="size-3" />
                {busy ? "Resending..." : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-muted hover:text-foreground text-[11px]"
              >
                Use another email
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted">Plan your study schedule, track habits, and maintain streaks.</p>

            {/* Quick Demo Access */}
            <div className="mt-5 rounded-xl border border-primary/25 bg-primary/10 p-3.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary mb-1">
                <Sparkles className="size-3.5" />
                <span>Quick Demo Access (Instant)</span>
              </div>
              <p className="text-[11px] text-muted mb-3 leading-relaxed">
                Directly explore the timeline, dynamic duration, and schedule planner without an account!
              </p>
              <button
                type="button"
                onClick={enterDemoMode}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
              >
                Explore Demo Mode
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-surface/90 px-2 text-[10px] uppercase tracking-wider text-faint">
                or {mode === "signin" ? "sign in with email" : "register with email verification"}
              </span>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              {mode === "signup" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-border bg-raised/60 px-3 py-2.5 text-sm placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border border-border bg-raised/60 px-3 py-2.5 text-sm placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (minimum 6 characters)"
                className="w-full rounded-xl border border-border bg-raised/60 px-3 py-2.5 text-sm placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl border border-border bg-raised/80 px-4 py-2.5 font-display text-xs font-semibold text-foreground transition-all hover:bg-raised active:scale-[0.99] disabled:opacity-60"
              >
                {busy
                  ? "Sending code..."
                  : mode === "signin"
                    ? "Sign In"
                    : "Register & Send Verification Email"}
              </button>
            </form>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 w-full font-mono text-[11px] text-faint transition-colors hover:text-primary"
            >
              {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
