import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/lib/theme";
import { computeStreak, fetchTasks } from "@/lib/studyflow";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — StudyKHP" },
      { name: "description", content: "Manage your StudyKHP account and appearance preferences." },
      { property: "og:title", content: "Settings — StudyKHP" },
      { property: "og:description", content: "Manage your StudyKHP account and appearance preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const tasks = tasksQuery.data ?? [];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const completed = tasks.filter((t) => t.completed).length;

  return (
    <AppShell streak={computeStreak(tasks)}>
      <header className="animate-rise">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-faint">Preferences</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Settings</h1>
      </header>

      <div className="mt-6 grid animate-rise gap-3 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-xl">
          <h2 className="font-display text-sm font-semibold tracking-tight">Appearance</h2>
          <p className="mt-1 text-sm text-muted">Switch between the dark focus theme and a lighter daytime theme.</p>
          <button
            onClick={toggle}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-raised/60 px-4 py-2.5 font-display text-xs font-semibold transition-colors hover:bg-hover"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-xl">
          <h2 className="font-display text-sm font-semibold tracking-tight">Account</h2>
          <p className="mt-1 text-sm text-muted">Signed in as</p>
          <p className="mt-1 font-mono text-sm text-primary">{email ?? "…"}</p>
          <div className="mt-4 flex gap-3">
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="font-display text-xl font-bold leading-none">{tasks.length}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint">tasks total</p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3">
              <p className="font-display text-xl font-bold leading-none">{completed}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint">completed</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
