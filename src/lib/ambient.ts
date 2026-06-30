export type SoundCategory = "nature" | "cozy" | "music" | "noise";

export interface SoundDef {
  id: string;
  label: string;
  emoji: string;
  category: SoundCategory;
}

export const SOUNDS: SoundDef[] = [
  { id: "rain", label: "Rain", emoji: "🌧", category: "nature" },
  { id: "ocean", label: "Ocean Waves", emoji: "🌊", category: "nature" },
  { id: "wind", label: "Wind", emoji: "🌬", category: "nature" },
  { id: "forest", label: "Forest", emoji: "🍃", category: "nature" },
  { id: "birds", label: "Morning Birds", emoji: "🐦", category: "nature" },
  { id: "night", label: "Night", emoji: "🌙", category: "nature" },

  { id: "fireplace", label: "Fireplace", emoji: "🔥", category: "cozy" },
  { id: "cafe", label: "Cozy Café", emoji: "☕", category: "cozy" },
  { id: "library", label: "Library", emoji: "📚", category: "cozy" },
  { id: "clock", label: "Clock Ticking", emoji: "⏰", category: "cozy" },

  { id: "piano", label: "Soft Piano", emoji: "🎹", category: "music" },
  { id: "instrumental", label: "Focus Music", emoji: "🎻", category: "music" },

  { id: "white", label: "White Noise", emoji: "🤍", category: "noise" },
  { id: "pink", label: "Pink Noise", emoji: "💗", category: "noise" },
  { id: "brown", label: "Brown Noise", emoji: "🤎", category: "noise" },
];

export const CATEGORY_LABELS: Record<SoundCategory, string> = {
  nature: "Nature",
  cozy: "Cozy",
  music: "Music",
  noise: "Noise",
};

export const SOUND_IDS = SOUNDS.map((s) => s.id);
export function isSoundId(id: string | null | undefined): id is string {
  return !!id && SOUND_IDS.includes(id);
}
export function soundLabel(id: string | null | undefined): string {
  return SOUNDS.find((s) => s.id === id)?.label ?? "";
}

type StopFn = () => void;
type Generator = (ctx: AudioContext, out: GainNode) => StopFn;

function noiseBuffer(ctx: AudioContext, color: "white" | "pink" | "brown", seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);

  if (color === "white") {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (color === "pink") {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

function noiseSource(ctx: AudioContext, color: "white" | "pink" | "brown", dest: AudioNode): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, color);
  src.loop = true;
  src.connect(dest);
  src.start();
  return src;
}

function lfo(ctx: AudioContext, target: AudioParam, freq: number, depth: number, center: number): StopFn {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  g.gain.value = depth;
  target.value = center;
  osc.connect(g).connect(target);
  osc.start();
  return () => {
    try { osc.stop(); } catch {}
    osc.disconnect();
    g.disconnect();
  };
}

function scheduler(minMs: number, maxMs: number, fire: () => void): StopFn {
  let id: number;
  const tick = () => {
    fire();
    id = window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
  };
  id = window.setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
  return () => window.clearTimeout(id);
}

function burst(ctx: AudioContext, dest: AudioNode, opts: { freq: number; q: number; gain: number; decay: number }) {
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, "white", 0.4);
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = opts.freq;
  bp.Q.value = opts.q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(opts.gain, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + opts.decay);
  src.connect(bp).connect(g).connect(dest);
  src.start(now);
  src.stop(now + opts.decay + 0.05);
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  opts: { freq: number; gain: number; attack: number; decay: number; type?: OscillatorType; glide?: number }
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.glide) osc.frequency.exponentialRampToValueAtTime(opts.freq * opts.glide, now + opts.attack + opts.decay);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(opts.gain, now + opts.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + opts.attack + opts.decay);
  osc.connect(g).connect(dest);
  osc.start(now);
  osc.stop(now + opts.attack + opts.decay + 0.05);
}

const PENTATONIC = [220.0, 246.94, 277.18, 329.63, 369.99, 440.0, 493.88, 554.37, 659.25];
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const GENERATORS: Record<string, Generator> = {
  white: (ctx, out) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 11000;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    const src = noiseSource(ctx, "white", lp);
    lp.connect(g).connect(out);
    return () => { try { src.stop(); } catch {}  src.disconnect(); lp.disconnect(); g.disconnect(); };
  },
  pink: (ctx, out) => {
    const g = ctx.createGain();
    g.gain.value = 0.85;
    const src = noiseSource(ctx, "pink", g);
    g.connect(out);
    return () => { try { src.stop(); } catch {}  src.disconnect(); g.disconnect(); };
  },
  brown: (ctx, out) => {
    const g = ctx.createGain();
    g.gain.value = 0.9;
    const src = noiseSource(ctx, "brown", g);
    g.connect(out);
    return () => { try { src.stop(); } catch {}  src.disconnect(); g.disconnect(); };
  },

  rain: (ctx, out) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 5200;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 420;
    const bed = ctx.createGain();
    bed.gain.value = 0.32;
    const src = noiseSource(ctx, "pink", hp);
    hp.connect(lp).connect(bed).connect(out);
    const drops = ctx.createGain();
    drops.gain.value = 0.5;
    drops.connect(out);
    const stopDrops = scheduler(40, 150, () =>
      burst(ctx, drops, { freq: 2600 + Math.random() * 3200, q: 9, gain: 0.05 + Math.random() * 0.07, decay: 0.07 })
    );
    return () => { try { src.stop(); } catch {}  stopDrops(); src.disconnect(); hp.disconnect(); lp.disconnect(); bed.disconnect(); drops.disconnect(); };
  },

  ocean: (ctx, out) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const swell = ctx.createGain();
    const src = noiseSource(ctx, "brown", lp);
    lp.connect(swell).connect(out);
    const stopSwell = lfo(ctx, swell.gain, 0.09, 0.28, 0.34);
    const stopSweep = lfo(ctx, lp.frequency, 0.09, 520, 900);
    return () => { try { src.stop(); } catch {}  stopSwell(); stopSweep(); src.disconnect(); lp.disconnect(); swell.disconnect(); };
  },

  wind: (ctx, out) => {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.7;
    const amp = ctx.createGain();
    const src = noiseSource(ctx, "pink", bp);
    bp.connect(amp).connect(out);
    const stopSweep = lfo(ctx, bp.frequency, 0.06, 380, 620);
    const stopGust = lfo(ctx, amp.gain, 0.08, 0.22, 0.34);
    return () => { try { src.stop(); } catch {}  stopSweep(); stopGust(); src.disconnect(); bp.disconnect(); amp.disconnect(); };
  },

  fireplace: (ctx, out) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 760;
    const rumble = ctx.createGain();
    rumble.gain.value = 0.5;
    const src = noiseSource(ctx, "brown", lp);
    lp.connect(rumble).connect(out);
    const stopFlicker = lfo(ctx, rumble.gain, 0.5, 0.12, 0.5);
    const crackle = ctx.createGain();
    crackle.gain.value = 0.6;
    crackle.connect(out);
    const stopCrackle = scheduler(60, 420, () => {
      const pops = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pops; i++)
        burst(ctx, crackle, { freq: 1100 + Math.random() * 2600, q: 6, gain: 0.04 + Math.random() * 0.09, decay: 0.05 });
    });
    return () => { try { src.stop(); } catch {}  stopFlicker(); stopCrackle(); src.disconnect(); lp.disconnect(); rumble.disconnect(); crackle.disconnect(); };
  },

  forest: (ctx, out) => {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 0.5;
    const bed = ctx.createGain();
    bed.gain.value = 0.12;
    const src = noiseSource(ctx, "pink", bp);
    bp.connect(bed).connect(out);
    const stopBreeze = lfo(ctx, bed.gain, 0.07, 0.06, 0.12);
    const birds = ctx.createGain();
    birds.gain.value = 0.18;
    birds.connect(out);
    const stopBirds = scheduler(1800, 6000, () => {
      const base = 1800 + Math.random() * 1600;
      const notes = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < notes; i++)
        window.setTimeout(
          () => tone(ctx, birds, { freq: base * (1 + i * 0.12), gain: 0.18, attack: 0.03, decay: 0.12, glide: 1.06 }),
          i * 120
        );
    });
    return () => { try { src.stop(); } catch {}  stopBreeze(); stopBirds(); src.disconnect(); bp.disconnect(); bed.disconnect(); birds.disconnect(); };
  },

  birds: (ctx, out) => {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1200;
    const bed = ctx.createGain();
    bed.gain.value = 0.05;
    const src = noiseSource(ctx, "pink", hp);
    hp.connect(bed).connect(out);
    const chirps = ctx.createGain();
    chirps.gain.value = 0.22;
    chirps.connect(out);
    const stopChirps = scheduler(350, 1600, () => {
      const base = 2200 + Math.random() * 2400;
      const notes = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < notes; i++)
        window.setTimeout(
          () => tone(ctx, chirps, { freq: base * (1 + (Math.random() - 0.3) * 0.2), gain: 0.16, attack: 0.02, decay: 0.09, glide: Math.random() > 0.5 ? 1.12 : 0.9 }),
          i * (60 + Math.random() * 90)
        );
    });
    return () => { try { src.stop(); } catch {}  stopChirps(); src.disconnect(); hp.disconnect(); bed.disconnect(); chirps.disconnect(); };
  },

  night: (ctx, out) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 300;
    const drone = ctx.createGain();
    drone.gain.value = 0.4;
    const src = noiseSource(ctx, "brown", lp);
    lp.connect(drone).connect(out);
    const crickets = ctx.createGain();
    crickets.gain.value = 0.07;
    crickets.connect(out);
    const stopCrickets = scheduler(900, 2600, () => {
      const reps = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < reps; i++)
        window.setTimeout(() => tone(ctx, crickets, { freq: 4600, gain: 0.08, attack: 0.005, decay: 0.04, type: "triangle" }), i * 90);
    });
    return () => { try { src.stop(); } catch {}  stopCrickets(); src.disconnect(); lp.disconnect(); drone.disconnect(); crickets.disconnect(); };
  },

  cafe: (ctx, out) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 620;
    const murmur = ctx.createGain();
    murmur.gain.value = 0.34;
    const src = noiseSource(ctx, "brown", lp);
    lp.connect(murmur).connect(out);
    const stopMurmur = lfo(ctx, murmur.gain, 0.13, 0.08, 0.34);
    const clinks = ctx.createGain();
    clinks.gain.value = 0.12;
    clinks.connect(out);
    const stopClinks = scheduler(2200, 7000, () =>
      tone(ctx, clinks, { freq: 2400 + Math.random() * 1200, gain: 0.1, attack: 0.004, decay: 0.18, type: "triangle" })
    );
    return () => { try { src.stop(); } catch {}  stopMurmur(); stopClinks(); src.disconnect(); lp.disconnect(); murmur.disconnect(); clinks.disconnect(); };
  },

  library: (ctx, out) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const room = ctx.createGain();
    room.gain.value = 0.16;
    const src = noiseSource(ctx, "brown", lp);
    lp.connect(room).connect(out);
    const pages = ctx.createGain();
    pages.gain.value = 0.16;
    pages.connect(out);
    const stopPages = scheduler(5000, 14000, () => {
      const rustles = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < rustles; i++)
        window.setTimeout(() => burst(ctx, pages, { freq: 3200 + Math.random() * 1800, q: 2, gain: 0.05, decay: 0.14 }), i * 130);
    });
    return () => { try { src.stop(); } catch {}  stopPages(); src.disconnect(); lp.disconnect(); room.disconnect(); pages.disconnect(); };
  },

  clock: (ctx, out) => {
    const g = ctx.createGain();
    g.gain.value = 0.5;
    g.connect(out);
    let high = false;
    const stop = scheduler(1000, 1000, () => {
      high = !high;
      burst(ctx, g, { freq: high ? 2600 : 2100, q: 14, gain: 0.16, decay: 0.04 });
    });
    return () => { stop(); g.disconnect(); };
  },

  piano: (ctx, out) => {
    const verb = ctx.createGain();
    verb.gain.value = 0.7;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    verb.connect(lp).connect(out);
    const note = (freq: number, gain: number) =>
      tone(ctx, verb, { freq, gain, attack: 0.02, decay: 2.4, type: "triangle" });
    const stop = scheduler(1700, 3600, () => {
      const root = pick(PENTATONIC);
      note(root, 0.16);
      if (Math.random() > 0.55) window.setTimeout(() => note(pick(PENTATONIC), 0.1), 180 + Math.random() * 260);
    });
    return () => { stop(); verb.disconnect(); lp.disconnect(); };
  },

  instrumental: (ctx, out) => {
    const pad = ctx.createGain();
    pad.gain.value = 0.0;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1600;
    pad.connect(lp).connect(out);
    const freqs = [220, 277.18, 329.63, 440];
    const oscs = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.detune.value = (i - 1.5) * 4;
      const og = ctx.createGain();
      og.gain.value = 0.16 / freqs.length;
      o.connect(og).connect(pad);
      o.start();
      return { o, og };
    });
    const stopBreath = lfo(ctx, pad.gain, 0.05, 0.5, 0.6);
    const lead = ctx.createGain();
    lead.gain.value = 0.5;
    lead.connect(lp);
    const stopLead = scheduler(2600, 5200, () =>
      tone(ctx, lead, { freq: pick(PENTATONIC) * 2, gain: 0.07, attack: 0.06, decay: 1.8, type: "sine" })
    );
    return () => {
      stopBreath();
      stopLead();
      oscs.forEach(({ o, og }) => { try { o.stop(); } catch {}  o.disconnect(); og.disconnect(); });
      pad.disconnect();
      lp.disconnect();
      lead.disconnect();
    };
  },
};

const FADE = 1.4;
const STOP_FADE = 1.1;

interface Voice {
  id: string;
  gain: GainNode;
  stop: StopFn;
}

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private current: Voice | null = null;
  private volume = 0.6;

  get active(): boolean {
    return !!this.ctx && this.ctx.state === "running" && !!this.current;
  }

  private ensure(): AudioContext {
    if (this.ctx && this.master) return this.ctx;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.ctx;
    if (ctx && ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.volume, now, 0.08);
    }
  }

  async play(id: string): Promise<void> {
    if (!GENERATORS[id]) return;
    const ctx = this.ensure();
    await this.unlock();
    if (this.current?.id === id) return;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master!);
    const stop = GENERATORS[id](ctx, gain);

    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(1, now + FADE);

    const previous = this.current;
    this.current = { id, gain, stop };
    if (previous) this.fadeOut(previous, FADE);
  }

  stop(fade = STOP_FADE): void {
    if (this.current) {
      this.fadeOut(this.current, fade);
      this.current = null;
    }
  }

  private fadeOut(voice: Voice, fade: number): void {
    if (!this.ctx) { voice.stop(); voice.gain.disconnect(); return; }
    const now = this.ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
    window.setTimeout(() => {
      try { voice.stop(); } catch {}
      voice.gain.disconnect();
    }, fade * 1000 + 80);
  }

  chime(): void {
    const ctx = this.ensure();
    this.unlock();
    const out = ctx.createGain();
    out.gain.value = Math.max(0.25, this.volume);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 3200;
    out.connect(lp).connect(ctx.destination);
    [528, 660, 792].forEach((f, i) =>
      window.setTimeout(
        () => tone(ctx, out, { freq: f, gain: 0.14, attack: 0.04, decay: 1.6, type: "sine" }),
        i * 220
      )
    );
  }
}

export const ambient = new AmbientEngine();
