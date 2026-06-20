# 🌸 Pink Petals Planner

A premium, magical productivity app that feels like a luxury planner, a self‑care
journal, a habit tracker, and a fantasy garden — all in one. Built as an
offline‑first **Progressive Web App** and ready to package as a native **Android**
app with Capacitor.

> Pastel pink · lavender · cream · soft peach — glassmorphism, floating petals,
> sparkles, smooth animations, and a garden that grows as you do.

---

## ✨ Features

| Area | Highlights |
| --- | --- |
| **Dashboard** | Daily greeting, motivational quote of the day, daily progress %, streak counter, today's overview |
| **To‑Do List** | Add / edit / delete, **drag‑and‑drop** reordering, priority levels (Soft · Important · 👑 Queen), due dates, categories, completion celebrations |
| **Habit Tracker** | Daily habits, **monthly calendar**, current & longest streaks, per‑habit statistics |
| **Focus Mode** | Pomodoro timer (configurable), synthesized **ambient sounds** (rain, forest, waves, café, chimes), session history |
| **Journal** | Daily entries, **mood tracking**, rotating reflection prompts, full‑text search |
| **Rewards** | Earn 🌸 petals & ⭐ stars, unlock themes, decorations and wallpapers |
| **Magical Garden** | Tasks grow flowers, habits grow trees, streaks unlock butterflies — a fully animated scene that evolves over time |

All data is stored **locally on the device** (no account, no servers) and the app
works **fully offline**.

---

## 🧰 Tech Stack

- **React 18 + TypeScript**
- **Vite 5** build tooling
- **Tailwind CSS** design system (custom pastel palette, glassmorphism)
- **Zustand** state management with `persist` → `localStorage`
- **Framer Motion** animations & page transitions
- **@dnd-kit** drag‑and‑drop
- **date-fns** date math
- **vite-plugin-pwa** (Workbox) service worker, offline caching, install prompts
- **Capacitor** for Android packaging

Clean architecture:

```
src/
├─ components/   reusable UI (GlassCard, nav, modals, petals, sparkles, error boundary…)
├─ pages/        one file per feature screen
├─ store/        Zustand store (single source of truth) + reward economy
├─ lib/          pure helpers (dates, audio engine, content, utils)
├─ hooks/        useTheme
└─ types/        shared TypeScript models
```

---

## 🚀 Getting Started

Requirements: **Node 18+** and npm.

```bash
# 1. Install dependencies
npm install

# 2. Generate app icons & splash screens (writes to /public)
npm run generate:icons

# 3. Start the dev server
npm run dev

# 4. Production build (type‑checks, bundles, generates the service worker)
npm run build

# 5. Preview the production build locally
npm run preview
```

Open the printed local URL (default `http://localhost:5173`).

---

## 📱 PWA / Install

The app ships with a web manifest, a Workbox service worker, maskable icons and
splash screens, so it is fully installable:

- **Android / Chrome:** open the site → menu → **Install app** (an in‑app install
  banner also appears automatically).
- **iOS / Safari:** Share → **Add to Home Screen**.
- **Desktop:** install icon in the address bar.

Offline support, app‑shell caching and auto‑updates are handled by
`vite-plugin-pwa` (see [`vite.config.ts`](vite.config.ts)). A standalone
[`public/manifest.json`](public/manifest.json) is also included for reference;
the build emits `manifest.webmanifest`.

### Regenerating icons

All icons and splash screens are generated from inline SVG art — no binary assets
to hand‑edit. Tweak the artwork in [`scripts/generate-icons.mjs`](scripts/generate-icons.mjs)
and run `npm run generate:icons`.

---

## 🤖 Android packaging (Capacitor)

A [`capacitor.config.ts`](capacitor.config.ts) is included
(`appId: tn.iris.pinkpetals`). To produce an Android project / APK / AAB:

```bash
# 1. Install Capacitor tooling (one time)
npm i -D @capacitor/cli
npm i @capacitor/core @capacitor/android

# 2. Build the web assets
npm run build

# 3. Add the native Android platform (creates the /android folder)
npx cap add android

# 4. Copy web assets + plugins into the native project
npx cap sync android

# 5. (Optional) generate native icons & splash from the source images
#    npx @capacitor/assets generate --android \
#       --iconBackgroundColor "#fff5f8" --splashBackgroundColor "#fff5f8"
#    (uses public/icon-source.png and public/splash-source.png)

# 6. Open in Android Studio to run / build
npx cap open android
```

Convenience scripts are wired up in `package.json`:

```bash
npm run cap:sync   # build + cap sync android
npm run cap:open   # open Android Studio
```

### Building a release bundle for Google Play

1. In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. Create (or select) an upload keystore and sign.
3. Upload the resulting `.aab` to the **Google Play Console**.

Recommended store listing values:

| Field | Value |
| --- | --- |
| App name | Pink Petals Planner |
| Package | `tn.iris.pinkpetals` |
| Category | Productivity |
| Theme color | `#f7c8d8` |
| Feature graphic / icon | `public/icon-source.png` (1024×1024) |

> Tip: bump `version` in `package.json` and `versionCode`/`versionName` in
> `android/app/build.gradle` for each Play release.

---

## 🎨 Theming

- Light **and** dark mode, plus a **System** option (Settings screen).
- Palette and animations live in [`tailwind.config.js`](tailwind.config.js) and
  CSS variables in [`src/index.css`](src/index.css).
- Reduce‑motion toggle for calmer visuals.

---

## 💾 Data & Privacy

- 100% on‑device storage via `localStorage` (key: `pink-petals-planner-v1`).
- **Export / Import** your data as JSON from **Settings → Your data**.
- No tracking, no analytics, no third‑party servers.

---

## 📦 npm Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type‑check + production build (+ service worker) |
| `npm run preview` | Serve the production build locally |
| `npm run generate:icons` | Regenerate icons & splash screens |
| `npm run cap:sync` | Build and sync the Android project |
| `npm run cap:open` | Open the Android project in Android Studio |

---

## 📄 License

MIT — see [`LICENSE`](LICENSE). Made with 💖 as **Pink Petals Planner**.
