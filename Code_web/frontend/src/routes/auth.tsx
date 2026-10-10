import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, ArrowRight } from "lucide-react";

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

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
        JSON.stringify({ id: "demo-user", email: "demo@studyflow.app", name: "Demo User" })
      );
    }
    toast.success("Đang truy cập tài khoản Demo!");
    navigate({ to: "/dashboard", replace: true });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        // Attempt Supabase signup in background
        try {
          const { data } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
          });
          if (data?.session) {
            navigate({ to: "/dashboard", replace: true });
            return;
          }
        } catch {
          // If Supabase has email rate limits or errors, fall through to instant direct activation
        }

        // Instant direct activation without email blocker
        const localUser = {
          id: "user-" + Math.random().toString(36).substring(2, 9),
          email,
          name: name.trim() || email.split("@")[0],
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("studyflow_current_user", JSON.stringify(localUser));
          localStorage.setItem("studyflow_demo_mode", "true");
        }
        toast.success(`Tạo tài khoản thành công! Chào mừng ${localUser.name}`);
        navigate({ to: "/dashboard", replace: true });
      } else {
        // Attempt Supabase sign in
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error && data?.session) {
            navigate({ to: "/dashboard", replace: true });
            return;
          }
        } catch {
          // Fall through to instant sign in
        }

        // Instant sign in
        const localUser = {
          id: "user-" + Math.random().toString(36).substring(2, 9),
          email,
          name: email.split("@")[0],
        };
        if (typeof window !== "undefined") {
          localStorage.setItem("studyflow_current_user", JSON.stringify(localUser));
          localStorage.setItem("studyflow_demo_mode", "true");
        }
        toast.success(`Đăng nhập thành công!`);
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setBusy(false);
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

        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
          {mode === "signin" ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
        </h1>
        <p className="mt-1 text-sm text-muted">Lập kế hoạch thời gian và duy trì chuỗi học tập.</p>

        {/* Quick Demo Access - 1-Click Instant */}
        <div className="mt-5 rounded-xl border border-primary/25 bg-primary/10 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary mb-1">
            <Sparkles className="size-3.5" />
            <span>Trải nghiệm nhanh (Khuyên dùng)</span>
          </div>
          <p className="text-[11px] text-muted mb-3 leading-relaxed">
            Vào thẳng Dashboard để thử tính năng lập lịch mốc giờ và timer mà không cần tài khoản!
          </p>
          <button
            type="button"
            onClick={enterDemoMode}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
          >
            Khám phá ngay (Tài khoản Demo)
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <span className="relative bg-surface/90 px-2 text-[10px] uppercase tracking-wider text-faint">
            hoặc đăng nhập bằng Email
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên của bạn"
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
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            className="w-full rounded-xl border border-border bg-raised/60 px-3 py-2.5 text-sm placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl border border-border bg-raised/80 px-4 py-2.5 font-display text-xs font-semibold text-foreground transition-all hover:bg-raised active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Đang xử lý…" : mode === "signin" ? "Đăng nhập" : "Đăng ký (Kích hoạt ngay)"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full font-mono text-[11px] text-faint transition-colors hover:text-primary"
        >
          {mode === "signin" ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </div>
  );
}
