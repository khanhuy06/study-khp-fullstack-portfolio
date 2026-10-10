import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarRange, LayoutDashboard, LogOut, Moon, Settings, Sun, Tags } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Planner", icon: CalendarRange },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children, streak }: { children: ReactNode; streak?: number }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    if (typeof window !== "undefined") {
      localStorage.removeItem("studyflow_demo_mode");
    }
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-28 top-1/3 h-[460px] w-[460px] rounded-full bg-cat-violet/10 blur-[130px]" />
      </div>

      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface/60 p-4 backdrop-blur-xl md:flex">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/15 font-display text-sm font-bold text-primary ring-1 ring-primary/20">
              S
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">StudyKHP</span>
          </div>
          <p className="px-2 pb-2 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">Workspace</p>
          <nav className="flex flex-col gap-1 text-sm">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-primary/12 text-foreground ring-1 ring-primary/20 font-medium" }}
                inactiveProps={{ className: "text-muted hover:bg-hover hover:text-foreground" }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            <div className="rounded-xl border border-border bg-glass p-3 backdrop-blur-xl">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-faint">Streak</span>
              <p className="mt-1 font-display text-2xl font-bold leading-none">{streak ?? 0} days</p>
              <p className="mt-1 text-xs text-muted">Complete a task daily to keep it.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggle}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden px-5 py-6 md:px-8">
          <div
            className="pointer-events-none absolute -bottom-40 -left-1/4 h-[420px] w-[420px] rotate-[18deg] rounded-[40px] bg-glass ring-1 ring-border backdrop-blur-2xl"
            aria-hidden="true"
          >
            <span className="absolute inset-0 overflow-hidden rounded-[40px]">
              <span className="absolute top-0 h-full w-1/3 bg-foreground/5 animate-sheen" />
            </span>
          </div>

          <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/70 p-1 backdrop-blur-xl md:hidden">
            {nav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-primary/15 text-primary" }}
                inactiveProps={{ className: "text-muted" }}
                className="rounded-lg px-3 py-1.5 font-mono text-[11px]"
              >
                {label}
              </Link>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
