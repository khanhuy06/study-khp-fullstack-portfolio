import { supabase } from "@/integrations/supabase/client";

export type Priority = "high" | "medium" | "low";

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  category_id: string | null;
  priority: Priority;
  deadline: string | null;
  plan_date: string;
  plan_hour: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 - 23:00

export const CATEGORY_COLORS = ["cyan", "violet", "green", "amber", "rose", "slate"] as const;

const colorClasses: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  cyan: { text: "text-cat-cyan", bg: "bg-cat-cyan/10", border: "border-cat-cyan/30", dot: "bg-cat-cyan" },
  violet: { text: "text-cat-violet", bg: "bg-cat-violet/10", border: "border-cat-violet/30", dot: "bg-cat-violet" },
  green: { text: "text-cat-green", bg: "bg-cat-green/10", border: "border-cat-green/30", dot: "bg-cat-green" },
  amber: { text: "text-cat-amber", bg: "bg-cat-amber/10", border: "border-cat-amber/30", dot: "bg-cat-amber" },
  rose: { text: "text-cat-rose", bg: "bg-cat-rose/10", border: "border-cat-rose/30", dot: "bg-cat-rose" },
  slate: { text: "text-cat-slate", bg: "bg-cat-slate/10", border: "border-cat-slate/30", dot: "bg-cat-slate" },
};

export const catColor = (color?: string) => colorClasses[color ?? "cyan"] ?? colorClasses["cyan"]!;

export const priorityClass: Record<Priority, string> = {
  high: "bg-high/15 text-high",
  medium: "bg-medium/15 text-medium",
  low: "bg-low/15 text-low",
};

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseDateKey = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export interface ParsedTaskTime {
  cleanTitle: string;
  timeRange: string | null;
  startTime: string | null;
  endTime: string | null;
}

export function parseTaskTime(title: string): ParsedTaskTime {
  // Support both "[HH:mm - HH:mm]" and "[HH:mm]" formats
  const matchRange = title.match(/\s*\[(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\]\s*$/);
  if (matchRange) {
    return {
      cleanTitle: title.replace(matchRange[0], "").trim(),
      timeRange: `${matchRange[1]} - ${matchRange[2]}`,
      startTime: matchRange[1],
      endTime: matchRange[2],
    };
  }

  const matchSingle = title.match(/\s*\[(\d{1,2}:\d{2})\]\s*$/);
  if (matchSingle) {
    return {
      cleanTitle: title.replace(matchSingle[0], "").trim(),
      timeRange: matchSingle[1],
      startTime: matchSingle[1],
      endTime: null,
    };
  }

  return { cleanTitle: title, timeRange: null, startTime: null, endTime: null };
}

export function formatTaskTitleWithTime(cleanTitle: string, startTime?: string | null, endTime?: string | null): string {
  const trimmed = cleanTitle.trim();
  if (startTime && endTime) {
    return `${trimmed} [${startTime} - ${endTime}]`;
  }
  if (startTime) {
    return `${trimmed} [${startTime}]`;
  }
  return trimmed;
}

export function getTaskTimeDisplay(task: Task): string | null {
  const parsed = parseTaskTime(task.title);
  if (parsed.timeRange) return parsed.timeRange;
  if (task.plan_hour !== null && task.plan_hour !== undefined) {
    return `${String(task.plan_hour).padStart(2, "0")}:00`;
  }
  return null;
}

export function getTaskSortMinutes(task: Task): number {
  const parsed = parseTaskTime(task.title);
  if (parsed.startTime) {
    const [h, m] = parsed.startTime.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  if (task.plan_hour !== null && task.plan_hour !== undefined) {
    return task.plan_hour * 60;
  }
  return 9999;
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,category_id,priority,deadline,plan_date,plan_hour,completed,completed_at,created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,color")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function createTask(input: {
  title: string;
  category_id?: string | null;
  priority?: Priority;
  deadline?: string | null;
  plan_date?: string;
  plan_hour?: number | null;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("tasks").insert({
    user_id: uid,
    title: input.title,
    category_id: input.category_id ?? null,
    priority: input.priority ?? "medium",
    deadline: input.deadline ?? null,
    plan_date: input.plan_date ?? toDateKey(new Date()),
    plan_hour: input.plan_hour ?? null,
  });
  if (error) throw error;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function createCategory(name: string, color: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("categories").insert({ user_id: uid, name, color });
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/** Consecutive days (ending today or yesterday) with at least one completed task. */
export function computeStreak(tasks: Task[]): number {
  const days = new Set(
    tasks.filter((t) => t.completed && t.completed_at).map((t) => toDateKey(new Date(t.completed_at as string))),
  );
  let streak = 0;
  const cursor = new Date();
  if (!days.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
