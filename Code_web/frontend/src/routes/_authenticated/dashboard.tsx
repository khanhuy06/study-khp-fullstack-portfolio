import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronRight, Clock, Check, Bell } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { TaskRow } from "@/components/TaskRow";
import {
  computeStreak,
  createTask,
  deleteTask,
  fetchCategories,
  fetchTasks,
  catColor,
  priorityClass,
  toDateKey,
  updateTask,
  parseTaskTime,
  formatTaskTitleWithTime,
  getTaskTimeDisplay,
  getTaskSortMinutes,
  getTaskDurationDisplay,
  type Task,
} from "@/lib/studyflow";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StudyKHP" },
      { name: "description", content: "Today's study progress, streak, quick capture and hourly time blocks." },
      { property: "og:title", content: "Dashboard — StudyKHP" },
      { property: "og:description", content: "Today's study progress, streak, quick capture and hourly time blocks." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const [quick, setQuick] = useState("");
  const [quickStart, setQuickStart] = useState("");
  const [quickEnd, setQuickEnd] = useState("");
  const [remindingTaskId, setRemindingTaskId] = useState<string | null>(null);
  const today = toDateKey(new Date());

  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const tasks = tasksQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const todays = tasks.filter((t) => t.plan_date === today);
  const done = todays.filter((t) => t.completed).length;
  const percent = todays.length ? Math.round((done / todays.length) * 100) : 0;
  const streak = computeStreak(tasks);

  const counts = {
    high: todays.filter((t) => t.priority === "high").length,
    medium: todays.filter((t) => t.priority === "medium").length,
    low: todays.filter((t) => t.priority === "low").length,
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const add = useMutation({
    mutationFn: ({ title, plan_hour }: { title: string; plan_hour?: number | null }) =>
      createTask({ title, plan_date: today, plan_hour }),
    onSuccess: () => {
      setQuick("");
      setQuickStart("");
      setQuickEnd("");
      invalidate();
    },
    onError: () => toast.error("Could not add that task"),
  });

  const toggle = useMutation({
    mutationFn: (task: Task) =>
      updateTask(task.id, { completed: !task.completed, completed_at: task.completed ? null : new Date().toISOString() }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) => updateTask(id, patch),
    onSuccess: invalidate,
  });

  const remove = useMutation({ mutationFn: (task: Task) => deleteTask(task.id), onSuccess: invalidate });

  // Filter scheduled tasks and sort by start time
  const scheduledTasks = todays
    .filter((t) => getTaskTimeDisplay(t) !== null)
    .sort((a, b) => getTaskSortMinutes(a) - getTaskSortMinutes(b));

  const circumference = 2 * Math.PI * 42;

  // Retrieve current user email
  const getCurrentUserEmail = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("studyflow_current_user");
      if (raw) {
        const u = JSON.parse(raw);
        return u.email || null;
      }
    } catch {
      // fallback
    }
    return null;
  };

  const userEmail = getCurrentUserEmail();

  // Send an email reminder for a task
  const sendEmailReminder = async (task: Task, isManual: boolean = false) => {
    if (!userEmail) {
      toast.info("Please sign in with your email to receive reminders.");
      return;
    }
    const parsed = parseTaskTime(task.title);
    setRemindingTaskId(task.id);
    try {
      const res = await fetch("/api/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          taskTitle: parsed.cleanTitle,
          scheduledTime: parsed.timeRange || (task.plan_hour ? `${task.plan_hour}:00` : "Scheduled Time"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send email reminder");
      } else {
        toast.success(`Reminder sent to ${userEmail} for "${parsed.cleanTitle}"!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reminder");
    } finally {
      setRemindingTaskId(null);
    }
  };

  // Automated background reminder checker
  useEffect(() => {
    if (!userEmail || scheduledTasks.length === 0) return;

    const checkAndNotify = async () => {
      const now = new Date();
      const currentTotalMins = now.getHours() * 60 + now.getMinutes();
      const sentKey = `studyflow_sent_reminders_${today}`;
      const sentIds: string[] = JSON.parse(localStorage.getItem(sentKey) || "[]");

      for (const t of scheduledTasks) {
        if (t.completed) continue;
        const parsed = parseTaskTime(t.title);
        if (!parsed.startTime) continue;

        const [h, m] = parsed.startTime.split(":").map(Number);
        const taskStartMins = (h || 0) * 60 + (m || 0);

        // Notify when time is within the current 5-minute window
        if (currentTotalMins >= taskStartMins && currentTotalMins <= taskStartMins + 5 && !sentIds.includes(t.id)) {
          sentIds.push(t.id);
          localStorage.setItem(sentKey, JSON.stringify(sentIds));
          sendEmailReminder(t, false);
        }
      }
    };

    checkAndNotify();
    const timer = setInterval(checkAndNotify, 30000);
    return () => clearInterval(timer);
  }, [scheduledTasks, userEmail, today]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quick.trim()) return;

    const fullTitle = formatTaskTitleWithTime(quick.trim(), quickStart || null, quickEnd || null);
    const startH = quickStart ? parseInt(quickStart.split(":")[0] ?? "0", 10) : null;
    add.mutate({ title: fullTitle, plan_hour: startH });
  };

  return (
    <AppShell streak={streak}>
      <header className="relative animate-rise">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-faint">
              Today ·{" "}
              {new Date().toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-balance md:text-[34px]">
              Your study day
            </h1>
          </div>
          <div className="flex rounded-xl border border-border bg-surface/70 p-1 backdrop-blur-xl">
            {(["day", "week", "month"] as const).map((v) => (
              <Link
                key={v}
                to="/planner"
                search={{ view: v }}
                className="rounded-lg px-3 py-1.5 font-mono text-[11px] capitalize text-muted transition-colors hover:text-foreground"
              >
                {v}
              </Link>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleQuickSubmit}
          className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/70 p-2.5 backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_0_0_1px_var(--primary)]"
        >
          <ChevronRight className="ml-1 size-4 shrink-0 text-primary" />
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Quick capture — type a study task..."
            className="min-w-[200px] flex-1 bg-transparent text-sm placeholder:text-faint focus:outline-none"
          />

          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-raised/50 px-2 py-1">
            <Clock className="size-3 text-muted" />
            <input
              type="time"
              value={quickStart}
              onChange={(e) => setQuickStart(e.target.value)}
              title="Start time (optional)"
              className="rounded bg-transparent font-mono text-xs text-muted focus:text-foreground focus:outline-none"
            />
            <span className="font-mono text-xs text-faint">-</span>
            <input
              type="time"
              value={quickEnd}
              onChange={(e) => setQuickEnd(e.target.value)}
              title="End time (optional)"
              className="rounded bg-transparent font-mono text-xs text-muted focus:text-foreground focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="shrink-0 rounded-xl bg-primary px-4 py-2 font-display text-xs font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Add task
          </button>
        </form>
      </header>

      <div className="relative mt-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 animate-rise lg:col-span-5">
          <div className="flex gap-4 rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-xl">
            <div className="relative shrink-0">
              <svg viewBox="0 0 100 100" className="size-28 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - percent / 100)}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <span className="font-display text-2xl font-bold leading-none">{percent}%</span>
                  <span className="block font-mono text-[9px] uppercase tracking-widest text-faint">done</span>
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">Today's progress</p>
              <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                {done} of {todays.length} tasks closed
              </p>
              <p className="mt-2 text-sm text-muted">
                {streak > 0 ? `${streak}-day study streak going.` : "Finish a task today to start a streak."}
              </p>
              <div className="mt-3 flex gap-1.5">
                <span className="rounded-md bg-high/15 px-2 py-1 font-mono text-[10px] text-high">High {counts.high}</span>
                <span className="rounded-md bg-medium/15 px-2 py-1 font-mono text-[10px] text-medium">Med {counts.medium}</span>
                <span className="rounded-md bg-low/15 px-2 py-1 font-mono text-[10px] text-low">Low {counts.low}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-semibold tracking-tight">Today's Tasks</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
              {todays.length - done} remaining
            </span>
          </div>
          <ul className="mt-2 space-y-2">
            {todays.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                No tasks yet — enter a task above to get started.
              </li>
            )}
            {todays.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                categories={categories}
                onToggle={(t) => toggle.mutate(t)}
                onDelete={(t) => remove.mutate(t)}
                onUpdate={(t, patch) => update.mutate({ id: t.id, patch })}
              />
            ))}
          </ul>
        </section>

        <section className="col-span-12 animate-rise lg:col-span-7">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-sm font-semibold tracking-tight">Today's Timeline</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
              {scheduledTasks.length} scheduled blocks
            </span>
          </div>

          <div className="mt-2 rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur-xl">
            {scheduledTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <Clock className="mx-auto size-8 text-muted/40 mb-2" />
                <p className="text-sm font-medium text-foreground">No tasks scheduled for today</p>
                <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                  Only tasks with scheduled time ranges (e.g. 01:15 - 03:25) appear here. Click <span className="font-mono text-primary font-semibold">+ Set time</span> on any task to schedule it!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {scheduledTasks.map((t) => {
                  const cat = categories.find((c) => c.id === t.category_id);
                  const colors = catColor(cat?.color);
                  const timeDisplay = getTaskTimeDisplay(t);
                  const durationDisplay = getTaskDurationDisplay(t);
                  const parsed = parseTaskTime(t.title);
                  const isReminding = remindingTaskId === t.id;

                  return (
                    <div
                      key={t.id}
                      className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-all ${colors.border} ${colors.bg}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1 rounded bg-surface/90 px-2 py-0.5 font-mono text-xs font-semibold text-primary border border-border/60">
                            <Clock className="size-3" />
                            {timeDisplay}
                          </span>

                          {/* Dynamic duration (End time - Start time) */}
                          {durationDisplay && (
                            <span className="flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-400">
                              ⏱ {durationDisplay}
                            </span>
                          )}

                          {cat && (
                            <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${colors.text}`}>
                              {cat.name}
                            </span>
                          )}
                          <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] capitalize ${priorityClass[t.priority]}`}>
                            {t.priority}
                          </span>
                        </div>

                        <p
                          className={`mt-2 text-sm font-medium break-words leading-snug ${
                            t.completed ? "line-through text-muted" : "text-foreground"
                          }`}
                        >
                          {parsed.cleanTitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => sendEmailReminder(t, true)}
                          disabled={isReminding}
                          title={userEmail ? `Send email reminder to ${userEmail}` : "Sign in to receive email reminders"}
                          className="flex items-center gap-1 rounded-lg border border-border/80 bg-surface/80 px-2 py-1 text-[11px] font-mono text-muted transition-colors hover:border-primary/40 hover:text-primary active:scale-95 disabled:opacity-50"
                        >
                          <Bell className={`size-3 ${isReminding ? "animate-spin" : ""}`} />
                          <span className="hidden sm:inline">Email alert</span>
                        </button>

                        <button
                          onClick={() => toggle.mutate(t)}
                          aria-label="Toggle task"
                          className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors ${
                            t.completed
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {t.completed && <Check className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
