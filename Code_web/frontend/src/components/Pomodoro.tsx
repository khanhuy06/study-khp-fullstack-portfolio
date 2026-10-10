import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";

type Mode = "focus" | "break";
const DURATION: Record<Mode, number> = { focus: 25 * 60, break: 5 * 60 };

interface PomodoroState {
  mode: Mode;
  secondsLeft: number;
  running: boolean;
  sessions: number;
  taskTitle: string | null;
  start: (taskTitle?: string) => void;
  pause: () => void;
  reset: () => void;
  setMode: (mode: Mode) => void;
}

const Ctx = createContext<PomodoroState | null>(null);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DURATION.focus);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [taskTitle, setTaskTitle] = useState<string | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        const next: Mode = modeRef.current === "focus" ? "break" : "focus";
        if (modeRef.current === "focus") {
          setSessions((n) => n + 1);
          toast.success("Focus session complete — take a 5 minute break.");
        } else {
          toast("Break over — back to focus.");
        }
        setModeState(next);
        return DURATION[next];
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback((title?: string) => {
    if (title !== undefined) setTaskTitle(title);
    setRunning(true);
  }, []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback(() => {
    setRunning(false);
    setSecondsLeft(DURATION[modeRef.current]);
  }, []);
  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    setSecondsLeft(DURATION[m]);
    setRunning(false);
  }, []);

  return (
    <Ctx.Provider value={{ mode, secondsLeft, running, sessions, taskTitle, start, pause, reset, setMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePomodoro must be used inside PomodoroProvider");
  return ctx;
}

export const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function PomodoroPanel() {
  const { mode, secondsLeft, running, sessions, taskTitle, start, pause, reset, setMode } = usePomodoro();

  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setMode("focus")}
            className={`rounded-md px-2 py-1 font-mono text-[10px] transition-colors ${mode === "focus" ? "bg-primary/15 text-primary" : "text-muted hover:text-foreground"}`}
          >
            Focus 25
          </button>
          <button
            onClick={() => setMode("break")}
            className={`rounded-md px-2 py-1 font-mono text-[10px] transition-colors ${mode === "break" ? "bg-primary/15 text-primary" : "text-muted hover:text-foreground"}`}
          >
            Break 5
          </button>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-faint">{sessions} sessions today</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <span className="font-mono text-3xl font-medium tabular-nums tracking-tight">{formatTime(secondsLeft)}</span>
        <div className="flex gap-2">
          <button
            onClick={() => (running ? pause() : start())}
            aria-label={running ? "Pause timer" : "Start timer"}
            className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            onClick={reset}
            aria-label="Reset timer"
            className="grid size-9 place-items-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>
      <p className="mt-2 truncate text-xs text-muted">{taskTitle ? `Focusing on: ${taskTitle}` : "No task attached"}</p>
    </div>
  );
}
