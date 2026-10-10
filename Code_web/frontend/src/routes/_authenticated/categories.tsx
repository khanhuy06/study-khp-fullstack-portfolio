import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import {
  CATEGORY_COLORS,
  catColor,
  computeStreak,
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchTasks,
} from "@/lib/studyflow";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "Categories — StudyKHP" },
      { name: "description", content: "Organise your study tasks into colour-coded categories." },
      { property: "og:title", content: "Categories — StudyKHP" },
      { property: "og:description", content: "Organise your study tasks into colour-coded categories." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("cyan");

  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const tasks = tasksQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const add = useMutation({
    mutationFn: () => createCategory(name.trim(), color),
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: () => toast.error("Could not add that category"),
  });

  const remove = useMutation({ mutationFn: (id: string) => deleteCategory(id), onSuccess: invalidate });

  return (
    <AppShell streak={computeStreak(tasks)}>
      <header className="animate-rise">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-faint">Organise</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Categories</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) add.mutate();
          }}
          className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/70 p-2.5 backdrop-blur-xl"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name — e.g. Thesis"
            className="min-w-[180px] flex-1 bg-transparent px-2 text-sm placeholder:text-faint focus:outline-none"
          />
          <div className="flex gap-1.5">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={`size-6 rounded-full ${catColor(c).dot} transition-transform ${
                  color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : "opacity-70 hover:opacity-100"
                }`}
              />
            ))}
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
          >
            Add
          </button>
        </form>
      </header>

      <div className="mt-6 grid animate-rise gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const colors = catColor(c.color);
          const total = tasks.filter((t) => t.category_id === c.id).length;
          const done = tasks.filter((t) => t.category_id === c.id && t.completed).length;
          return (
            <div key={c.id} className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${colors.dot}`} />
                  <p className="font-display text-sm font-semibold tracking-tight">{c.name}</p>
                </div>
                <button
                  onClick={() => remove.mutate(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="rounded-lg p-1.5 text-faint transition-colors hover:text-high"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="mt-3 font-display text-2xl font-bold leading-none">{total}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint">
                tasks · {done} completed
              </p>
            </div>
          );
        })}
        {categories.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
            No categories yet — add one above.
          </p>
        )}
      </div>
    </AppShell>
  );
}
