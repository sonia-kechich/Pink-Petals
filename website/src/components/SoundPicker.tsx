import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Music, Play, Pause, ChevronDown, Heart, Volume2, VolumeX } from "lucide-react";
import { useStore } from "../store/useStore";
import { SOUNDS, CATEGORY_LABELS, soundLabel, type SoundCategory, type SoundDef } from "../lib/ambient";

const CATEGORY_ORDER: SoundCategory[] = ["nature", "cozy", "music", "noise"];

export function SoundPicker() {
  const selectedId = useStore((s) => s.sound.selectedId);
  const playing = useStore((s) => s.sound.playing);
  const volume = useStore((s) => s.sound.volume);
  const favorites = useStore((s) => s.sound.favorites);
  const selectSound = useStore((s) => s.selectSound);
  const toggleSoundPlaying = useStore((s) => s.toggleSoundPlaying);
  const setSoundVolume = useStore((s) => s.setSoundVolume);
  const toggleFavoriteSound = useStore((s) => s.toggleFavoriteSound);
  const [open, setOpen] = useState(true);

  const grouped = useMemo(() => {
    const favSet = new Set(favorites);
    return CATEGORY_ORDER.map((cat) => ({
      cat, items: SOUNDS.filter((s) => s.category === cat).sort((a, b) => Number(favSet.has(b.id)) - Number(favSet.has(a.id))),
    }));
  }, [favorites]);

  const tapTile = (id: string) => { if (id === selectedId) toggleSoundPlaying(); else selectSound(id); };

  return (
    <div className="mx-auto mt-6 w-full max-w-md">
      <div className="card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
            {playing ? <Equalizer /> : <Music size={16} />}
          </span>
          <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
            <span className="block truncate text-sm" style={{ color: selectedId ? "var(--text)" : "var(--text-muted)" }}>
              {selectedId ? soundLabel(selectedId) : "Ambient sounds"}
            </span>
            <span className="muted block text-xs">{selectedId ? (playing ? "Now playing" : "Paused") : "Set the mood for your focus"}</span>
          </button>
          {selectedId && (
            <button onClick={toggleSoundPlaying} aria-label={playing ? "Pause" : "Play"} className="grid h-10 w-10 place-items-center rounded-full transition-transform active:scale-95"
              style={{ background: "var(--accent)", color: "var(--on-accent)" }}>
              {playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
            </button>
          )}
          <button onClick={() => setOpen((v) => !v)} className="icon-btn shrink-0">
            <ChevronDown size={18} className="transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "none" }} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }} className="overflow-hidden">
              <div className="px-4 pb-4">
                <div className="mb-3 flex items-center gap-3 px-1">
                  <button onClick={() => setSoundVolume(volume > 0 ? 0 : 0.6)} style={{ color: "var(--text-muted)" }}>
                    {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>
                  <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setSoundVolume(Number(e.target.value))} aria-label="Volume"
                    className="petal-range w-full" style={{ ["--fill" as string]: `${Math.round(volume * 100)}%` }} />
                </div>
                <div className="h-px" style={{ background: "var(--border)" }} />
                <div className="mt-3 flex max-h-60 flex-col gap-3 overflow-y-auto">
                  {grouped.map(({ cat, items }) => (
                    <div key={cat}>
                      <h3 className="muted mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider">{CATEGORY_LABELS[cat]}</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {items.map((s) => (
                          <SoundTile key={s.id} sound={s} active={s.id === selectedId} playing={playing && s.id === selectedId}
                            favorite={favorites.includes(s.id)} onTap={() => tapTile(s.id)} onFavorite={() => toggleFavoriteSound(s.id)} />
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

function SoundTile({ sound, active, playing, favorite, onTap, onFavorite }: {
  sound: SoundDef; active: boolean; playing: boolean; favorite: boolean; onTap: () => void; onFavorite: () => void;
}) {
  return (
    <button onClick={onTap} className="relative flex flex-col items-center gap-1 rounded-2xl px-1 py-3 transition-all active:scale-[0.97]"
      style={{ background: active ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "var(--surface-2)", color: active ? "var(--on-accent)" : "var(--text)", border: "1px solid var(--glass-border)" }}
      aria-pressed={active}>
      <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onFavorite(); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onFavorite(); } }}
        className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full" style={{ color: active ? "var(--on-accent)" : favorite ? "var(--accent)" : "var(--text-muted)" }}>
        <Heart size={9} fill={favorite ? "currentColor" : "none"} strokeWidth={2} />
      </span>
      <span className="text-lg leading-none">{sound.emoji}</span>
      <span className="max-w-full truncate px-0.5 text-[10px] font-medium">{sound.label}</span>
      {playing && <Equalizer mini />}
    </button>
  );
}

function Equalizer({ mini }: { mini?: boolean }) {
  const h = mini ? 6 : 10;
  return (
    <span className={mini ? "flex items-end gap-[2px]" : "flex items-end gap-[2px]"} style={{ height: h }} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 2, borderRadius: 2, background: "currentColor", height: h * 0.6 }} />
      ))}
    </span>
  );
}
