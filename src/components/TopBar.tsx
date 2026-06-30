import { Link } from "react-router-dom";
import { Settings, Flower2 } from "lucide-react";

export function TopBar() {
  return (
    <div className="safe-top relative z-10 flex items-center justify-between px-1 pb-1 pt-3 md:hidden">
      <Link to="/" className="flex items-center gap-1.5">
        <Flower2 size={18} style={{ color: "var(--accent)" }} />
        <span className="heading text-base" style={{ color: "var(--accent)" }}>
          Pink Petals
        </span>
      </Link>
      <Link to="/settings" aria-label="Settings" className="icon-btn">
        <Settings size={19} />
      </Link>
    </div>
  );
}
