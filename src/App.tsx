import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./store/useAuth";
import { isSupabaseConfigured } from "./lib/supabase";
import { useCloudSync } from "./lib/cloudSync";
import { useStore } from "./store/useStore";

const Auth = lazy(() => import("./pages/Auth"));
const Today = lazy(() => import("./pages/Today"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Habits = lazy(() => import("./pages/Habits"));
const Notes = lazy(() => import("./pages/Notes"));
const Timer = lazy(() => import("./pages/Timer"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));

function PageFallback() {
  return <div className="py-24" aria-hidden />;
}

export default function App() {
  useTheme();

  // Initialize auth on mount
  useEffect(() => {
    useAuth.getState().init();
  }, []);

  // Remove boot splash
  useEffect(() => {
    const splash = document.getElementById("boot-splash");
    if (splash) splash.remove();
  }, []);

  // Cloud sync for signed-in users (no-op when supabase isn't configured)
  useCloudSync();

  // Auth gating — only active when Supabase is configured
  const status = useAuth((s) => s.status);
  const showCalendar = useStore((s) => s.settings.showCalendar);

  if (isSupabaseConfigured && status === "loading") {
    return <PageFallback />;
  }

  const isAuthed = !isSupabaseConfigured || status === "signed-in";

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/auth" element={isAuthed ? <Navigate to="/" replace /> : <Auth />} />
        <Route element={isAuthed ? <Layout /> : <Navigate to="/auth" replace />}>
          <Route index element={<Today />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="habits" element={<Habits />} />
          <Route path="notes" element={<Notes />} />
          <Route path="timer" element={<Timer />} />
          {showCalendar && <Route path="calendar" element={<Calendar />} />}
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Today />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
