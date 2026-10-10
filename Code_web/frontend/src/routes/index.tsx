import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarRange, CheckCircle2, Timer } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyKHP — Plan, focus, finish" },
      {
        name: "description",
        content:
          "StudyKHP is a study planner with quick capture, hourly time blocking, day/week/month views and a built-in Pomodoro timer.",
      },
      { property: "og:title", content: "StudyKHP — Plan, focus, finish" },
      {
        property: "og:description",
        content: "Quick capture, time blocking, deadlines and a built-in Pomodoro timer for focused study sessions.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-20 text-foreground">
      <div className="pointer-events-none absolute -left-40 top-[-10rem] size-[38rem] rounded-full bg-primary/10 blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 bottom-[-14rem] size-[34rem] rounded-full bg-cat-violet/10 blur-[150px]" />

      <div className="relative mx-auto max-w-3xl animate-rise">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-primary">StudyKHP</p>
        <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] tracking-tight text-balance md:text-6xl">
          Plan the day, block the hours, finish the work.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Capture tasks in a keystroke, slot them into an hourly timeline, and run a focus timer without leaving your
          list.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="rounded-xl bg-primary px-6 py-3 font-display text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
          >
            Start planning
          </Link>
          <Link
            to="/auth"
            className="rounded-xl border border-border px-6 py-3 font-display text-sm font-semibold transition-colors hover:bg-hover"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            { icon: CheckCircle2, title: "Quick capture", copy: "One box, one keystroke, task filed on today." },
            { icon: CalendarRange, title: "Day · week · month", copy: "Switch views to chase every deadline." },
            { icon: Timer, title: "Pomodoro built in", copy: "25 focus, 5 break, started from any task." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-surface/70 p-5 backdrop-blur-xl">
              <f.icon className="size-5 text-primary" />
              <p className="mt-3 font-display text-sm font-semibold tracking-tight">{f.title}</p>
              <p className="mt-1 text-sm text-muted">{f.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
