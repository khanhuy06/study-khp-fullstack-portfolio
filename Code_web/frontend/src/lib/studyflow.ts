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

export function calculateDurationMinutes(startTime: string | null, endTime: string | null): number | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) {
    diff += 24 * 60;
  }
  return diff;
}

export function formatDuration(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0 && remainingMins > 0) {
    return `${hours}h ${remainingMins}m (${minutes}m)`;
  }
  if (hours > 0) {
    return `${hours}h (${minutes}m)`;
  }
  return `${minutes} mins`;
}

export function getTaskDurationDisplay(task: Task): string | null {
  const parsed = parseTaskTime(task.title);
  if (!parsed.startTime || !parsed.endTime) return null;
  const mins = calculateDurationMinutes(parsed.startTime, parsed.endTime);
  return formatDuration(mins);
}

const DEMO_CATEGORIES_KEY = "studyflow_demo_categories";
const DEMO_TASKS_KEY = "studyflow_demo_tasks";

const INITIAL_DEMO_CATEGORIES: Category[] = [
  { id: "demo-cat-1", name: "University", color: "violet" },
  { id: "demo-cat-2", name: "Coding", color: "green" },
  { id: "demo-cat-3", name: "Personal", color: "slate" },
];

function getDemoCategories(): Category[] {
  if (typeof window === "undefined") return INITIAL_DEMO_CATEGORIES;
  const raw = localStorage.getItem(DEMO_CATEGORIES_KEY);
  if (!raw) {
    localStorage.setItem(DEMO_CATEGORIES_KEY, JSON.stringify(INITIAL_DEMO_CATEGORIES));
    return INITIAL_DEMO_CATEGORIES;
  }
  return JSON.parse(raw);
}

function getDemoTasks(): Task[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(DEMO_TASKS_KEY);
  if (!raw) {
    const today = toDateKey(new Date());
    const initial: Task[] = [
      {
        id: "demo-task-1",
        title: "Code Python & FastAPI Backend [08:30 - 10:45]",
        category_id: "demo-cat-2",
        priority: "high",
        deadline: null,
        plan_date: today,
        plan_hour: 8,
        completed: true,
        completed_at: new Date().toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "demo-task-2",
        title: "Docker containerization & Portfolio setup [13:15 - 15:30]",
        category_id: "demo-cat-2",
        priority: "medium",
        deadline: null,
        plan_date: today,
        plan_hour: 13,
        completed: false,
        completed_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: "demo-task-3",
        title: "Review OWASP Top 10 security practices",
        category_id: "demo-cat-1",
        priority: "medium",
        deadline: null,
        plan_date: today,
        plan_hour: null,
        completed: false,
        completed_at: null,
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw);
}

async function hasActiveSupabaseSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data?.session?.user?.id;
  } catch {
    return false;
  }
}

export async function fetchTasks(): Promise<Task[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,category_id,priority,deadline,plan_date,plan_hour,completed,completed_at,created_at")
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        return data as Task[];
      }
    }
  } catch (err) {
    console.warn("Supabase fetchTasks error:", err);
  }
  return getDemoTasks();
}

export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,color")
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        return data as Category[];
      }
    }
  } catch (err) {
    console.warn("Supabase fetchCategories error:", err);
  }
  return getDemoCategories();
}

export async function createTask(input: {
  title: string;
  category_id?: string | null;
  priority?: Priority;
  deadline?: string | null;
  plan_date?: string;
  plan_hour?: number | null;
}) {
  const newTask: Task = {
    id: "task-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    title: input.title,
    category_id: input.category_id ?? null,
    priority: input.priority ?? "medium",
    deadline: input.deadline ?? null,
    plan_date: input.plan_date ?? toDateKey(new Date()),
    plan_hour: input.plan_hour ?? null,
    completed: false,
    completed_at: null,
    created_at: new Date().toISOString(),
  };

  // Always persist locally to guarantee immediate UI appearance
  const localTasks = getDemoTasks();
  localTasks.push(newTask);
  localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(localTasks));

  // Sync with Supabase if user is logged into Supabase
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (uid) {
      await supabase.from("tasks").insert({
        user_id: uid,
        title: input.title,
        category_id: input.category_id ?? null,
        priority: input.priority ?? "medium",
        deadline: input.deadline ?? null,
        plan_date: input.plan_date ?? toDateKey(new Date()),
        plan_hour: input.plan_hour ?? null,
      });
    }
  } catch (err) {
    console.warn("Supabase insert sync failed, saved locally:", err);
  }
  return newTask;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  // Always update locally
  const localTasks = getDemoTasks();
  const idx = localTasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    localTasks[idx] = { ...localTasks[idx]!, ...patch };
    localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(localTasks));
  }

  // Sync with Supabase if signed in
  try {
    const hasSession = await hasActiveSupabaseSession();
    if (hasSession) {
      await supabase.from("tasks").update(patch).eq("id", id);
    }
  } catch (err) {
    console.warn("Supabase update sync failed:", err);
  }
}

export async function deleteTask(id: string) {
  // Always delete locally
  const localTasks = getDemoTasks().filter((t) => t.id !== id);
  localStorage.setItem(DEMO_TASKS_KEY, JSON.stringify(localTasks));

  // Sync with Supabase if signed in
  try {
    const hasSession = await hasActiveSupabaseSession();
    if (hasSession) {
      await supabase.from("tasks").delete().eq("id", id);
    }
  } catch (err) {
    console.warn("Supabase delete sync failed:", err);
  }
}

export async function createCategory(name: string, color: string) {
  const newCat: Category = { id: "cat-" + Date.now(), name, color };
  const categories = getDemoCategories();
  categories.push(newCat);
  localStorage.setItem(DEMO_CATEGORIES_KEY, JSON.stringify(categories));

  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (uid) {
      await supabase.from("categories").insert({ user_id: uid, name, color });
    }
  } catch (err) {
    console.warn("Supabase category insert failed:", err);
  }
}

export async function deleteCategory(id: string) {
  const categories = getDemoCategories().filter((c) => c.id !== id);
  localStorage.setItem(DEMO_CATEGORIES_KEY, JSON.stringify(categories));

  try {
    const hasSession = await hasActiveSupabaseSession();
    if (hasSession) {
      await supabase.from("categories").delete().eq("id", id);
    }
  } catch (err) {
    console.warn("Supabase category delete failed:", err);
  }
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
