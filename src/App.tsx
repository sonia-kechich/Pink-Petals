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
const Profile = lazy(() => import("./pages/Profile"));

function PageFallback() {
  return <div className="py-24" aria-hidden />;
}

export default function App() {
  useTheme();

  useEffect(() => {
    useAuth.getState().init();
  }, []);

  useEffect(() => {
    const splash = document.getElementById("boot-splash");
    if (splash) splash.remove();
  }, []);

  useCloudSync();

  const status = useAuth((s) => s.status);
  const s = useStore((s) => s.settings);

  if (isSupabaseConfigured && status === "loading") {
    return <PageFallback />;
  }

  const isAuthed = !isSupabaseConfigured || status === "signed-in";

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/auth" element={isAuthed ? <Navigate to="/" replace /> : <Auth />} />
        <Route element={isAuthed ? <Layout /> : <Navigate to="/auth" replace />}>
          {s.showDashboard && <Route index element={<Today />} />}
          {s.showTasks && <Route path="tasks" element={<Tasks />} />}
          {s.showHabits && <Route path="habits" element={<Habits />} />}
          {s.showNotes && <Route path="notes" element={<Notes />} />}
          {s.showTimer && <Route path="timer" element={<Timer />} />}
          {s.showCalendar && <Route path="calendar" element={<Calendar />} />}
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={s.showDashboard ? <Today /> : <Navigate to="/settings" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
