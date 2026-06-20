import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { FloatingPetals } from "./FloatingPetals";

export function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-4">
      <FloatingPetals count={7} />
      <TopBar />
      <main className="safe-bottom relative z-10 flex-1 pt-2">
        {/* Subtle, non-looping entrance — re-keyed per route. */}
        <div key={pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
