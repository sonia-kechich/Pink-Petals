import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Music2, Play, Pause, ChevronDown, Heart, Volume2, VolumeX } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  SOUNDS,
  CATEGORY_LABELS,
  soundLabel,
  type SoundCategory,
  type SoundDef,
} from "../lib/ambient";

const CATEGORY_ORDER: SoundCategory[] = ["nature", "cozy", "music", "noise"];

/**
 * The ambient sound panel for the Timer page. Compact and collapsible so it
 * never crowds the clock: a quiet "now playing" bar that opens into a grid of
 * delicate sound tiles plus an independent volume slider.
 */
export function SoundPicker() {
  const selectedId = useStore((s) => s.sound.selectedId);
  const playing = useStore((s) => s.sound.playing);
  const volume = useStore((s) => s.sound.volume);
  const favorites = useStore((s) => s.sound.favorites);

  const selectSound = useStore((s) => s.selectSound);
  const toggleSoundPlaying = useStore((s) => s.toggleSoundPlaying);
  const setSoundVolume = useStore((s) => s.setSoundVolume);
  const toggleFavoriteSound = useStore((s) => s.toggleFavoriteSound);

  const [open, setOpen] = useState(false);

  // Group sounds by category, floating favourites to the front of each group.
  const grouped = useMemo(() => {
    const favSet = new Set(favorites);
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: SOUNDS.filter((s) => s.category === cat).sort(
        (a, b) => Number(favSet.has(b.id)) - Number(favSet.has(a.id))
      ),
    }));
  }, [favorites]);

  const tapTile = (id: string) => {
    if (id === selectedId) toggleSoundPlaying();
    else selectSound(id);
  };

  const label = selectedId ? soundLabel(selectedId) : "Ambient sounds";
  const sub = !selectedId
    ? "Set the mood for your focus"
    : playing
      ? "Now playing"
      : "Paused";

  return (
    <div className="mx-auto mt-4 w-full max-w-xs">
      <div className="card overflow-hidden">
        {/* Now-playing bar */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--surface-2)", color: "var(--accent)" }}
          >
            {playing ? <Equalizer /> : <Music2 size={16} />}
          </span>

          <button
            onClick={() => setOpen((v) => !v)}
            className="min-w-0 flex-1 text-left"
            aria-expanded={open}
            aria-label="Choose an ambient sound"
          >
            <span className="block truncate text-[15px]" style={{ color: selectedId ? "var(--text)" : "var(--text-muted)" }}>
              {label}
            </span>
            <span className="muted block text-xs">{sub}</span>
          </button>

          {selectedId && (
            <button
              onClick={toggleSoundPlaying}
              aria-label={playing ? "Pause sound" : "Play sound"}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-transform active:scale-95"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
            >
              {playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
            </button>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            className="icon-btn shrink-0"
          >
            <ChevronDown
              size={18}
              className="transition-transform duration-200"
              style={{ transform: open ? "rotate(180deg)" : "none" }}
            />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                {/* Volume — independent of device volume */}
                <div className="mb-3 flex items-center gap-3 px-1">
                  <button
                    onClick={() => setSoundVolume(volume > 0 ? 0 : 0.6)}
                    aria-label={volume > 0 ? "Mute" : "Unmute"}
                    className="shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setSoundVolume(Number(e.target.value))}
                    aria-label="Sound volume"
                    className="petal-range w-full"
                    style={{ ["--fill" as string]: `${Math.round(volume * 100)}%` }}
                  />
                </div>

                <div className="h-px" style={{ background: "var(--border)" }} />

                {/* Sound tiles, grouped by mood */}
                <div className="mt-3 flex max-h-[19rem] flex-col gap-3 overflow-y-auto pr-0.5">
                  {grouped.map(({ cat, items }) => (
                    <div key={cat}>
                      <h3 className="muted mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider">
                        {CATEGORY_LABELS[cat]}
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {items.map((s) => (
                          <SoundTile
                            key={s.id}
                            sound={s}
                            active={s.id === selectedId}
                            playing={playing && s.id === selectedId}
                            favorite={favorites.includes(s.id)}
                            onTap={() => tapTile(s.id)}
                            onFavorite={() => toggleFavoriteSound(s.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SoundTile({
  sound,
  active,
  playing,
  favorite,
  onTap,
  onFavorite,
}: {
  sound: SoundDef;
  active: boolean;
  playing: boolean;
  favorite: boolean;
  onTap: () => void;
  onFavorite: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="relative flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-3 transition-all duration-200 active:scale-[0.97]"
      style={{
        background: active ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "var(--surface-2)",
        color: active ? "var(--on-accent)" : "var(--text)",
        border: "1px solid var(--glass-border)",
        boxShadow: active ? "0 8px 22px -10px var(--accent)" : "none",
      }}
      aria-pressed={active}
      aria-label={`${sound.label}${active ? (playing ? ", playing" : ", paused") : ""}`}
    >
      {/* Favourite toggle — tiny heart in the corner. */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onFavorite();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onFavorite();
          }
        }}
        aria-label={favorite ? `Unfavourite ${sound.label}` : `Favourite ${sound.label}`}
        className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full"
        style={{ color: active ? "var(--on-accent)" : favorite ? "var(--accent)" : "var(--text-muted)" }}
      >
        <Heart size={11} fill={favorite ? "currentColor" : "none"} strokeWidth={2} />
      </span>

      <span className="text-xl leading-none" aria-hidden>
        {sound.emoji}
      </span>
      <span className="max-w-full truncate px-0.5 text-[11px] font-medium leading-tight">
        {sound.label}
      </span>

      {playing && <Equalizer mini light={active} />}
    </button>
  );
}

/** Three little bars that breathe while a sound is playing. */
function Equalizer({ mini, light }: { mini?: boolean; light?: boolean }) {
  const reduce = useReducedMotion();
  const bars = [0, 1, 2];
  const h = mini ? 7 : 10;
  const bg = mini ? (light ? "var(--on-accent)" : "var(--accent)") : "currentColor";
  return (
    <span
      className={mini ? "mt-0.5 flex items-end gap-[2px]" : "flex items-end gap-[2px]"}
      style={{ height: h }}
      aria-hidden
    >
      {bars.map((i) => (
        <motion.span
          key={i}
          style={{ width: 2, borderRadius: 2, background: bg, height: reduce ? h * 0.6 : undefined }}
          animate={reduce ? undefined : { height: [h * 0.3, h, h * 0.45, h * 0.8, h * 0.3] }}
          transition={reduce ? undefined : { duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}
