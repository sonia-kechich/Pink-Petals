import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { FloatingPetals } from "./FloatingPetals";
import { AmbientController } from "./AmbientController";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

export function Layout() {
  const { pathname } = useLocation();
  useKeyboardShortcuts();

  return (
    <div className="relative flex min-h-screen flex-col">
      <AmbientController />
      <FloatingPetals count={7} />

      <Sidebar />

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="safe-bottom relative z-10 flex-1 px-5 pt-2 md:pb-12 md:pt-7">
          <div
            key={pathname}
            className="animate-fade-up w-full"
          >
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
