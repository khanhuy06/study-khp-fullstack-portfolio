import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { PomodoroProvider } from "@/components/Pomodoro";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const isDemo = localStorage.getItem("studyflow_demo_mode") === "true";
      const localUserStr = localStorage.getItem("studyflow_current_user");
      if (isDemo || localUserStr) {
        let localUser = { id: "demo-user", email: "demo@studyflow.app", user_metadata: { display_name: "Demo User" } };
        if (localUserStr) {
          try {
            const parsed = JSON.parse(localUserStr);
            localUser = { id: parsed.id || "local-user", email: parsed.email || "user@studyflow.app", user_metadata: { display_name: parsed.name || "StudyFlow User" } };
          } catch {
            // fallback to default
          }
        }
        return { user: localUser };
      }
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => (
    <PomodoroProvider>
      <Outlet />
    </PomodoroProvider>
  ),
});
