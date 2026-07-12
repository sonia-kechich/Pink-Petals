import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { FloatingPetals } from "./FloatingPetals";
import { AmbientController } from "./AmbientController";

export function Layout() {
  const { pathname } = useLocation();
  useKeyboardShortcuts();

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-4">
      <AmbientController />
      <FloatingPetals count={7} />

      <Sidebar />

      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col px-4 md:px-8">
        <TopBar />
        <main className="safe-bottom relative z-10 flex-1 pt-2 md:pb-12 md:pt-7">
          <div
            key={pathname}
            className="animate-fade-up mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl"
          >
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
