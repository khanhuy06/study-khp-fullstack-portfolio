import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-28 top-1/3 h-[460px] w-[460px] rounded-full bg-cat-violet/10 blur-[130px]" />
      </div>

      <div className="w-full max-w-sm animate-rise rounded-2xl border border-border bg-surface/70 p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 font-display text-sm font-bold text-primary ring-1 ring-primary/20">
            S
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">StudyKHP</span>
        </div>

        {sent ? (
          <div className="mt-6">
            <h1 className="font-display text-xl font-bold tracking-tight">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted">
              We sent a confirmation link to {email}. Open it to finish creating your account.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your workspace"}
            </h1>
            <p className="mt-1 text-sm text-muted">Plan your day, block your time, keep the streak.</p>

            <form onSubmit={onSubmit} className="mt-5 space-y-3">
              {mode === "signup" && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-border bg-raised/60 px-3 py-2.5 text-sm placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-xl border border-border bg-raised/60 px-3 py-2.5 text-sm placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-border bg-raised/60 px-3 py-2.5 text-sm placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              >
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <button
              onClick={google}
              className="mt-3 w-full rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              Continue with Google
            </button>

            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 w-full font-mono text-[11px] text-faint transition-colors hover:text-primary"
            >
              {mode === "signin" ? "No account? Create one" : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
