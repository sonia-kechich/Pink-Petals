import { useEffect, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useTheme } from "./hooks/useTheme";

const Today = lazy(() => import("./pages/Today"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Habits = lazy(() => import("./pages/Habits"));
const Notes = lazy(() => import("./pages/Notes"));
const Timer = lazy(() => import("./pages/Timer"));
const Settings = lazy(() => import("./pages/Settings"));

function PageFallback() {
  return <div className="py-24" aria-hidden />;
}

export default function App() {
  useTheme();

  useEffect(() => {
    const splash = document.getElementById("boot-splash");
    if (splash) splash.remove();
  }, []);

  return (
    <Suspense fallback={<PageFallback />}>
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
    </Suspense>
  );
}
