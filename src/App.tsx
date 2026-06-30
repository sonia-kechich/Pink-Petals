import { useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useTheme } from "./hooks/useTheme";
import { useAuth, isSupabaseConfigured } from "./store/useAuth";
import { useCloudSync } from "./lib/cloudSync";

const Today = lazy(() => import("./pages/Today"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Habits = lazy(() => import("./pages/Habits"));
const Notes = lazy(() => import("./pages/Notes"));
const Timer = lazy(() => import("./pages/Timer"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));

function PageFallback() {
  return <div className="py-24" aria-hidden />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="habits" element={<Habits />} />
        <Route path="notes" element={<Notes />} />
        <Route path="timer" element={<Timer />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Today />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  useTheme();

  const initAuth = useAuth((s) => s.init);
  const status = useAuth((s) => s.status);
  const recovering = useAuth((s) => s.recovering);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useCloudSync();

  useEffect(() => {
    const splash = document.getElementById("boot-splash");
    if (splash && (!isSupabaseConfigured || status !== "loading")) splash.remove();
  }, [status]);

  let content: React.ReactNode;
  if (!isSupabaseConfigured) {
    content = <AppRoutes />;
  } else if (status === "loading") {
    content = <PageFallback />;
  } else if (recovering || status !== "signed-in") {
    content = <Auth />;
  } else {
    content = <AppRoutes />;
  }

  return <Suspense fallback={<PageFallback />}>{content}</Suspense>;
}
