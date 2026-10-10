import { Check, Clock, Trash2, X } from "lucide-react";
import { useState } from "react";

import {
  catColor,
  priorityClass,
  parseTaskTime,
  formatTaskTitleWithTime,
  getTaskTimeDisplay,
  getTaskDurationDisplay,
  type Category,
  type Task,
} from "@/lib/studyflow";

export function TaskRow({
  task,
  categories,
  onToggle,
  onDelete,
  onUpdate,
}: {
  task: Task;
  categories: Category[];
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onUpdate?: (task: Task, patch: Partial<Task>) => void;
}) {
  const category = categories.find((c) => c.id === task.category_id);
  const colors = catColor(category?.color);

  const parsed = parseTaskTime(task.title);
  const timeDisplay = getTaskTimeDisplay(task);
  const durationDisplay = getTaskDurationDisplay(task);

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [startTime, setStartTime] = useState(parsed.startTime ?? (task.plan_hour !== null ? `${String(task.plan_hour).padStart(2, "0")}:00` : ""));
  const [endTime, setEndTime] = useState(parsed.endTime ?? "");

  const handleSaveTime = () => {
    if (!onUpdate) return;
    const newTitle = formatTaskTitleWithTime(parsed.cleanTitle, startTime || null, endTime || null);
    const startH = startTime ? parseInt(startTime.split(":")[0] ?? "0", 10) : null;
    onUpdate(task, {
      title: newTitle,
      plan_hour: startH,
    });
    setIsEditingTime(false);
  };

  const handleClearTime = () => {
    if (!onUpdate) return;
    onUpdate(task, {
      title: parsed.cleanTitle,
      plan_hour: null,
    });
    setStartTime("");
    setEndTime("");
    setIsEditingTime(false);
  };

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-raised/60 p-3 transition-all duration-200 hover:bg-raised">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task)}
          aria-label={task.completed ? "Mark as not done" : "Mark as done"}
          className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors ${
            task.completed ? "border-primary bg-primary text-primary-foreground" : "border-faint"
          }`}
        >
          {task.completed && <Check className="size-2.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium leading-snug break-words whitespace-normal ${
              task.completed ? "text-muted line-through" : "text-foreground"
            }`}
          >
            {parsed.cleanTitle}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {category && (
              <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${colors.bg} ${colors.text}`}>
                {category.name}
              </span>
            )}
            <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] capitalize ${priorityClass[task.priority]}`}>
              {task.priority}
            </span>
            {task.deadline && (
              <span className="font-mono text-[10px] text-faint">
                Due {new Date(task.deadline).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}

            {/* Time slot display */}
            {timeDisplay ? (
              <button
                type="button"
                onClick={() => setIsEditingTime(!isEditingTime)}
                title="Click to edit time slot"
                className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary transition-colors hover:bg-primary/20"
              >
                <Clock className="size-2.5" />
                {timeDisplay}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTime(!isEditingTime)}
                title="Set scheduled time slot"
                className="flex items-center gap-1 rounded border border-dashed border-border px-1.5 py-0.5 font-mono text-[10px] text-faint transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Clock className="size-2.5" />
                + Set time
              </button>
            )}

            {/* Dynamic calculated duration (End time - Start time) */}
            {durationDisplay && (
              <span
                title="Calculated duration from scheduled time window"
                className="flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400"
              >
                ⏱ {durationDisplay}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onDelete(task)}
            aria-label="Delete task"
            className="rounded-lg p-1.5 text-faint transition-colors hover:text-high"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Inline time range editor */}
      {isEditingTime && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-surface/90 p-2 text-xs">
          <span className="font-mono text-[11px] text-muted">From:</span>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="rounded border border-border bg-raised px-2 py-1 font-mono text-[11px] text-foreground focus:outline-none"
          />
          <span className="font-mono text-[11px] text-muted">To (optional):</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            title="End time (optional — leave blank if no duration needed)"
            className="rounded border border-border bg-raised px-2 py-1 font-mono text-[11px] text-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSaveTime}
            className="rounded bg-primary px-2.5 py-1 font-display text-[11px] font-semibold text-primary-foreground hover:opacity-90"
          >
            Save
          </button>
          {timeDisplay && (
            <button
              type="button"
              onClick={handleClearTime}
              className="rounded border border-border px-2 py-1 font-mono text-[11px] text-muted hover:text-high"
            >
              Clear time
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditingTime(false)}
            aria-label="Cancel editing"
            className="p-1 text-faint hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
    </li>
  );
}
