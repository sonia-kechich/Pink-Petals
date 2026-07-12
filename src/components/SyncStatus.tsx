import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { useSync, type SyncStatus as Status } from "../store/useSync";
import { useAuth, isSupabaseConfigured } from "../store/useAuth";

function ago(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const META: Record<Status, { icon: typeof Cloud; label: string; color: string }> = {
  idle: { icon: Cloud, label: "Not synced", color: "var(--text-muted)" },
  syncing: { icon: RefreshCw, label: "Syncing…", color: "var(--accent-2)" },
  synced: { icon: Check, label: "Synced", color: "var(--accent)" },
  offline: { icon: CloudOff, label: "Offline", color: "var(--text-muted)" },
  error: { icon: AlertCircle, label: "Sync error", color: "var(--danger)" },
};

export function SyncStatus({ className = "" }: { className?: string }) {
  const status = useSync((s) => s.status);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const signedIn = useAuth((s) => s.status === "signed-in");

  const [, tick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!isSupabaseConfigured || !signedIn) return null;

  const { icon: Icon, label, color } = META[status];
  const detail =
    status === "synced" && lastSyncedAt ? `Synced ${ago(lastSyncedAt)}` : label;

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}
      style={{ background: "var(--surface-2)", color }}
      title={detail}
      aria-live="polite"
    >
      <Icon size={13} className={status === "syncing" ? "animate-spin" : ""} />
      <span className="truncate">{detail}</span>
    </div>
  );
}
