import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./store/useAuth";
import { isSupabaseConfigured } from "./lib/supabase";
import { useCloudSync } from "./lib/cloudSync";
import { useStore } from "./store/useStore";
import { Layout } from "./components/Layout";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Habits = lazy(() => import("./pages/Habits"));
const Notes = lazy(() => import("./pages/Notes"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Timer = lazy(() => import("./pages/Timer"));
const Settings = lazy(() => import("./pages/Settings"));
const Profile = lazy(() => import("./pages/Profile"));

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-3xl animate-float">🌸</span>
        <p className="muted text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  useTheme();

  useEffect(() => {
    useAuth.getState().init();
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
          {s.showDashboard && <Route index element={<Dashboard />} />}
          {s.showTasks && <Route path="tasks" element={<Tasks />} />}
          {s.showHabits && <Route path="habits" element={<Habits />} />}
          {s.showNotes && <Route path="notes" element={<Notes />} />}
          {s.showCalendar && <Route path="calendar" element={<Calendar />} />}
          {s.showTimer && <Route path="timer" element={<Timer />} />}
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={s.showDashboard ? <Dashboard /> : <Navigate to="/settings" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
