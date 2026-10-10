import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { PomodoroProvider } from "@/components/Pomodoro";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined" && localStorage.getItem("studyflow_demo_mode") === "true") {
      return { user: { id: "demo-user", email: "demo@studyflow.app" } };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <PomodoroProvider>
      <Outlet />
    </PomodoroProvider>
  ),
});
