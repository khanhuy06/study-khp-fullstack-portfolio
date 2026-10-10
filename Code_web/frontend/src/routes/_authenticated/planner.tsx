import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Check } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { TaskRow } from "@/components/TaskRow";
import {
  addDays,
  catColor,
  computeStreak,
  createTask,
  deleteTask,
  fetchCategories,
  fetchTasks,
  parseDateKey,
  priorityClass,
  startOfWeek,
  toDateKey,
  updateTask,
  parseTaskTime,
  formatTaskTitleWithTime,
  getTaskTimeDisplay,
  getTaskSortMinutes,
  type Priority,
  type Task,
} from "@/lib/studyflow";

interface PlannerSearch {
  view?: "day" | "week" | "month";
}

export const Route = createFileRoute("/_authenticated/planner")({
  validateSearch: (search: Record<string, unknown>): PlannerSearch => ({
    view: (search.view as "day" | "week" | "month") ?? "day",
  }),
  head: () => ({
    meta: [
      { title: "Planner — StudyKHP" },
      { name: "description", content: "Plan tasks by day, week or month with exact time ranges." },
      { property: "og:title", content: "Planner — StudyKHP" },
      { property: "og:description", content: "Plan tasks by day, week or month with exact time ranges." },
    ],
  }),
  component: Planner,
});

function Planner() {
  const { view } = Route.useSearch();
  const navigate = useNavigate({ from: "/planner" });
  const queryClient = useQueryClient();

  const [anchor, setAnchor] = useState(() => toDateKey(new Date()));
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [deadline, setDeadline] = useState("");

  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const tasks = tasksQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tasks"] });

  const add = useMutation({
    mutationFn: () => {
      const fullTitle = formatTaskTitleWithTime(title.trim(), startTime || null, endTime || null);
      const startH = startTime ? parseInt(startTime.split(":")[0] ?? "0", 10) : null;
      return createTask({
        title: fullTitle,
        category_id: categoryId || null,
        priority,
        plan_date: anchor,
        plan_hour: startH,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
    },
    onSuccess: () => {
      setTitle("");
      setStartTime("");
      setEndTime("");
      setDeadline("");
      invalidate();
    },
    onError: () => toast.error("Could not create that task"),
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

  const anchorDate = parseDateKey(anchor);
  const weekStart = startOfWeek(anchorDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthGridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i));

  const dayTasks = tasks.filter((t) => t.plan_date === anchor);

  // Chỉ lấy những công việc đã đặt giờ và sắp xếp theo thứ tự
  const scheduledDayTasks = dayTasks
    .filter((t) => getTaskTimeDisplay(t) !== null)
    .sort((a, b) => getTaskSortMinutes(a) - getTaskSortMinutes(b));

  function shift(amount: number) {
    const d = parseDateKey(anchor);
    if (view === "day") d.setDate(d.getDate() + amount);
    if (view === "week") d.setDate(d.getDate() + amount * 7);
    if (view === "month") d.setMonth(d.getMonth() + amount);
    setAnchor(toDateKey(d));
  }

  return (
    <AppShell streak={computeStreak(tasks)}>
      <header className="animate-rise">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-faint">Planner</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              {view === "month"
                ? anchorDate.toLocaleDateString([], { month: "long", year: "numeric" })
                : view === "week"
                  ? `Week of ${weekStart.toLocaleDateString([], { day: "numeric", month: "short" })}`
                  : anchorDate.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => shift(-1)}
              className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:text-foreground"
            >
              Prev
            </button>
            <button
              onClick={() => setAnchor(toDateKey(new Date()))}
              className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:text-foreground"
            >
              Today
            </button>
            <button
              onClick={() => shift(1)}
              className="rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:text-foreground"
            >
              Next
            </button>
            <div className="flex rounded-xl border border-border bg-surface/70 p-1 backdrop-blur-xl">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => navigate({ search: { view: v } })}
                  className={`rounded-lg px-3 py-1.5 font-mono text-[11px] capitalize transition-colors ${
                    view === v ? "bg-primary/15 text-primary ring-1 ring-primary/20" : "text-muted hover:text-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) add.mutate();
          }}
          className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/70 p-2.5 backdrop-blur-xl"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tên bài tập / nhiệm vụ..."
            className="min-w-[180px] flex-1 bg-transparent px-2 text-sm placeholder:text-faint focus:outline-none"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-border bg-raised/60 px-2 py-2 font-mono text-[11px] text-muted focus:outline-none"
          >
            <option value="">Không có danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-lg border border-border bg-raised/60 px-2 py-2 font-mono text-[11px] text-muted focus:outline-none"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Ô nhập giờ chính xác (Từ - Đến) */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-raised/60 px-2 py-1 font-mono text-[11px] text-muted">
            <Clock className="size-3 text-muted" />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              title="Giờ bắt đầu"
              className="bg-transparent font-mono text-foreground focus:outline-none"
            />
            <span className="text-faint">-</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              title="Giờ kết thúc"
              className="bg-transparent font-mono text-foreground focus:outline-none"
            />
          </div>

          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            title="Hạn chót"
            className="rounded-lg border border-border bg-raised/60 px-2 py-2 font-mono text-[11px] text-muted focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
          >
            Thêm việc
          </button>
        </form>
      </header>

      {view === "day" && (
        <div className="mt-6 grid animate-rise grid-cols-12 gap-4">
          <section className="col-span-12 lg:col-span-5">
            <h2 className="px-1 font-display text-sm font-semibold tracking-tight">Danh sách việc ngày này</h2>
            <ul className="mt-2 space-y-2">
              {dayTasks.length === 0 && (
                <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
                  Không có công việc nào trong ngày này.
                </li>
              )}
              {dayTasks.map((task) => (
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
          <section className="col-span-12 lg:col-span-7">
            <h2 className="px-1 font-display text-sm font-semibold tracking-tight">Lịch trình chi tiết (Timeline)</h2>
            <div className="mt-2 rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur-xl">
              {scheduledDayTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Clock className="mx-auto size-8 text-muted/40 mb-2" />
                  <p className="text-sm font-medium text-foreground">Chưa có lịch trình cho ngày này</p>
                  <p className="mt-1 text-xs text-muted max-w-md mx-auto">
                    Chỉ những công việc có đặt khung giờ chính xác mới xuất hiện ở đây. Bấm <span className="font-mono text-primary font-semibold">+ Đặt giờ</span> ở danh sách bên cạnh để lên lịch.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {scheduledDayTasks.map((b) => {
                    const cat = categories.find((c) => c.id === b.category_id);
                    const colors = catColor(cat?.color);
                    const timeDisplay = getTaskTimeDisplay(b);
                    const parsed = parseTaskTime(b.title);
                    return (
                      <div
                        key={b.id}
                        className={`flex items-start justify-between gap-3 rounded-xl border p-3.5 transition-all ${colors.border} ${colors.bg}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 rounded bg-surface/90 px-2 py-0.5 font-mono text-xs font-semibold text-primary border border-border/60">
                              <Clock className="size-3" />
                              {timeDisplay}
                            </span>
                            {cat && (
                              <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${colors.text}`}>
                                {cat.name}
                              </span>
                            )}
                            <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] capitalize ${priorityClass[b.priority]}`}>
                              {b.priority}
                            </span>
                          </div>
                          <p
                            className={`mt-2 text-sm font-medium break-words leading-snug ${
                              b.completed ? "line-through text-muted" : "text-foreground"
                            }`}
                          >
                            {parsed.cleanTitle}
                          </p>
                        </div>
                        <button
                          onClick={() => toggle.mutate(b)}
                          className={`mt-1 grid size-5 shrink-0 place-items-center rounded-full border transition-colors ${
                            b.completed
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary"
                          }`}
                        >
                          {b.completed && <Check className="size-3" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {view === "week" && (
        <div className="mt-6 grid animate-rise grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((d) => {
            const key = toDateKey(d);
            const list = tasks.filter((t) => t.plan_date === key);
            return (
              <button
                key={key}
                onClick={() => {
                  setAnchor(key);
                  navigate({ search: { view: "day" } });
                }}
                className={`min-h-[180px] rounded-2xl border p-3 text-left backdrop-blur-xl transition-colors ${
                  key === anchor ? "border-primary/40 bg-primary/5" : "border-border bg-surface/70 hover:bg-raised"
                }`}
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
                  {d.toLocaleDateString([], { weekday: "short" })}
                </p>
                <p className="font-display text-lg font-bold">{d.getDate()}</p>
                <div className="mt-2 space-y-1">
                  {list.slice(0, 4).map((t) => {
                    const cat = categories.find((c) => c.id === t.category_id);
                    const parsed = parseTaskTime(t.title);
                    return (
                      <p
                        key={t.id}
                        className={`truncate rounded px-1.5 py-1 text-[11px] ${catColor(cat?.color).bg} ${
                          t.completed ? "text-muted line-through" : ""
                        }`}
                      >
                        {parsed.cleanTitle}
                      </p>
                    );
                  })}
                  {list.length > 4 && <p className="font-mono text-[10px] text-faint">+{list.length - 4} more</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <div className="mt-6 animate-rise rounded-2xl border border-border bg-surface/70 p-3 backdrop-blur-xl">
          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <p key={d} className="pb-1 text-center font-mono text-[10px] uppercase tracking-widest text-faint">
                {d}
              </p>
            ))}
            {monthDays.map((d) => {
              const key = toDateKey(d);
              const list = tasks.filter((t) => t.plan_date === key);
              const outside = d.getMonth() !== anchorDate.getMonth();
              return (
                <button
                  key={key}
                  onClick={() => {
                    setAnchor(key);
                    navigate({ search: { view: "day" } });
                  }}
                  className={`min-h-[86px] rounded-lg border p-2 text-left transition-colors ${
                    key === anchor ? "border-primary/40 bg-primary/5" : "border-border hover:bg-hover"
                  } ${outside ? "opacity-40" : ""}`}
                >
                  <p className="font-mono text-[10px] text-faint">{d.getDate()}</p>
                  <div className="mt-1 space-y-0.5">
                    {list.slice(0, 2).map((t) => {
                      const parsed = parseTaskTime(t.title);
                      return (
                        <p key={t.id} className="truncate text-[10px] text-muted">
                          · {parsed.cleanTitle}
                        </p>
                      );
                    })}
                    {list.length > 2 && <p className="font-mono text-[9px] text-faint">+{list.length - 2}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
