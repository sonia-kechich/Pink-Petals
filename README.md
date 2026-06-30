# 🌸 Pink Petals Planner

A premium, magical productivity app that feels like a luxury planner, a self‑care
journal, a habit tracker, and a fantasy garden — all in one. One codebase powers
a **fully responsive web app** (phone → desktop) and a native **Android** app
(via Capacitor), both sharing the **same Supabase backend** with **real‑time
cross‑device sync**: add a task on Android and it appears on the website within
about a second; complete a habit on the web and it updates on your phone.

> Pastel pink · lavender · cream · soft peach — glassmorphism, floating petals,
> sparkles, smooth animations, and a garden that grows as you do.

---

## ✨ Features

| Area | Highlights |
| --- | --- |
| **Dashboard** | Daily greeting, motivational quote of the day, daily progress stats, streak counter, today's focus tasks + habits |
| **To‑Do List** | Add / edit / delete, due dates, repeating tasks, drag‑to‑reorder, focus tagging, completion celebrations |
| **Habit Tracker** | Daily habits with a **rolling 7‑day view**, current & longest streaks, per‑habit weekly stats |
| **Focus Mode** | Pomodoro timer (configurable), synthesized **ambient sounds** (rain, forest, waves, café, chimes…), session history & lifetime focus totals |
| **Notes** | Simple, fast notes (title + body) with a list + sticky editor; autosaved and synced |
| **Accessibility** | Honors `prefers-reduced-motion` (CSS **and** Framer Motion), aria‑labelled controls, keyboard‑navigable drag‑and‑drop |
| **Languages** | English by default, with an i18n layer + RTL groundwork (French/Arabic catalogs scaffolded — see *Internationalization*) |
| **Your data** | **Export / import** a JSON backup, and an in‑app **delete account & data** flow |

Without an account the app runs **fully offline**, storing everything locally.
Add Supabase credentials and the same data syncs **live across every device**
you sign in on (see *Authentication & Cloud Sync* below).

### 💻 Responsive web & desktop

The website is **not** a stretched phone screen. The same components adapt:

- **Phone (< 768 px)** — top bar, single centered column, bottom tab bar (the
  original mobile experience, untouched).
- **Desktop (≥ 768 px)** — a persistent **side‑navigation rail**, a wide content
  area, a multi‑column **Today dashboard**, side‑by‑side active/completed tasks,
  a responsive habit grid, and **multi‑panel note editing** (list + sticky
  editor). Press **1–6** to jump between pages.

The Pink Petals identity — logo, flower mark, palette, serif headings,
glassmorphism, floating petals, animations and the light/dark/system theme —
is identical on both, so the two products are instantly recognizable as one.

---

## 🧰 Tech Stack

- **React 18 + TypeScript**
- **Vite 5** build tooling
- **Tailwind CSS** design system (custom pastel palette, glassmorphism)
- **Zustand** state management with `persist` → `localStorage`
- **Framer Motion** animations & page transitions
- **date-fns** date math
- **vite-plugin-pwa** (Workbox) service worker, offline caching, install prompts
- **Capacitor** for Android packaging
- **Supabase** (optional) — authentication, email verification & per-user cloud sync
- **@dnd-kit** for accessible drag‑to‑reorder
- Lightweight **custom i18n** layer (no extra framework) with RTL support
- **Vitest** for unit tests; **ESLint** + **Prettier** for quality & formatting

Clean architecture:

```
src/
├─ components/   reusable UI (cards, nav, petals, task row, error boundary…)
├─ pages/        one file per feature screen
├─ store/        Zustand stores (app state, auth, sync status)
├─ lib/          pure helpers (dates, audio engine, sync/merge, backup, i18n, utils)
├─ hooks/        useTheme, keyboard shortcuts
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
`vite-plugin-pwa` (see [`vite.config.ts`](vite.config.ts)), which emits the web
app manifest as `manifest.webmanifest` at build time.

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

## 🔐 Authentication & Cloud Sync (optional)

Pink Petals works fully offline with **no account**. Adding Supabase credentials
unlocks accounts, a 6-digit email verification flow, password reset, and
**per-user cloud sync** so the same garden follows you across devices. It's a
*progressive enhancement*: with the env vars blank, the sign-in screen is
skipped and the app behaves exactly as the local-only PWA.

**Email + password only** — no Google, Facebook, Apple, or other third-party providers.

### What you get

| Capability | How it's implemented |
| --- | --- |
| **Email + password sign-up** | `signUp` (email, password, confirm); bcrypt hashing handled server-side |
| **6-digit email verification** | Supabase email **OTP** — code emailed on sign-up, confirmed via `verifyOtp`; expires (configurable) and is rate-limited server-side, with a client resend cooldown + attempt cap |
| **Login** | Email + password, with **Remember me** (persistent vs session-only token storage) |
| **Forgot password** | `resetPasswordForEmail` → secure recovery link → in-app "choose a new password" screen |
| **Logout** | Sign out from **Settings → Account** |
| **Protected routes** | When Supabase is configured the app is gated behind sign‑in. If **Confirm email** is enabled in the dashboard, sign‑up yields no session until the emailed code/link is confirmed; the app also surfaces an "email not verified" notice as a safe‑degrade if confirmation is currently off |
| **Per-user data** | Tasks, habits, notes, focus sessions & lifetime totals, settings and ambient‑sound prefs stored per user |
| **Export / import** | Download a JSON backup of all your data, or import one — imports are migrated then **merged** (never clobber newer data) |
| **Delete account & data** | In‑app, type‑to‑confirm deletion: wipes local data + the cloud document and signs out (true auth‑user deletion uses an optional server function — see `docs/SECURITY_AND_OPS.md`) |
| **Real‑time sync** | A Supabase **Realtime** subscription on the user's `user_data` row applies writes from other devices live (≈1 s). Last‑write‑wins on one jsonb document; the running timer is intentionally not synced. Future features sync automatically — they're part of the same document. |
| **Offline‑first** | Changes are saved locally first and pushed when back online; a live **Syncing / Synced / Offline** indicator shows in the sidebar and Settings. |

### Setup

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is plenty).
2. **Create the database schema** — open the dashboard → **SQL Editor** → paste and
   run [`supabase/schema.sql`](supabase/schema.sql). This creates the `profiles`
   and `user_data` tables, Row-Level-Security policies (each user only sees their
   own rows), triggers that auto-provision a row on sign-up, and adds `user_data`
   to the **`supabase_realtime`** publication so changes stream to a user's other
   devices live (Realtime still honors RLS — a client only ever receives its own
   rows).
3. **Turn on email confirmation.** In **Authentication → Providers → Email**, ensure
   *Confirm email* is **on**.
4. **Set the Site URL + Redirect URLs** (this is what makes the confirmation **link**
   work — without it the link bounces to Supabase's default `localhost:3000`). Under
   **Authentication → URL Configuration**:
   - **Site URL** → where the app is served, e.g. `http://localhost:5173` for local
     dev, `http://<your-LAN-ip>:5173` to test on a phone, or your deployed HTTPS URL.
   - **Redirect URLs** (allow-list) → add the same URL(s). The confirmation link
     redirects here and the app finishes sign-in automatically (implicit flow).
5. **Pick your verification style** (both are supported by the app):
   - **Link** (default template) — user taps the link, lands back on the Site URL,
     and is signed in automatically.
   - **6-digit code** — set **Authentication → Email Templates → Confirm signup** to
     include `{{ .Token }}` (e.g. `Your code is {{ .Token }}`); the user types it on
     the in-app verify screen. Optionally lower the **OTP expiry** (e.g. 600s).
6. **Reliable email delivery** — Supabase's built-in mailer is rate-limited to a few
   messages/hour (testing only). For real use, add custom SMTP under
   **Authentication → Emails → SMTP** (e.g. Resend, Brevo, SendGrid).
7. **Add your credentials** — copy [`.env.example`](.env.example) to `.env` and fill in:
   ```bash
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-or-publishable-key>
   ```
8. `npm run dev` — the sign-in screen now appears. 🎉

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | for auth | Project URL (Dashboard → Settings → API). Safe in the client. |
| `VITE_SUPABASE_ANON_KEY` | for auth | Anon/public key. Safe in the client — access is bounded by RLS. |

> Both are blank by default → the app runs locally with no sign-in.

### Database schema (summary)

- **`profiles`** — `id` (→ `auth.users`), `email`, `display_name`, `avatar_url`, timestamps.
- **`user_data`** — `user_id` (→ `auth.users`), `data jsonb` (the full planner
  document: tasks, habits, notes, sessions, settings, sound), `updated_at`.
- RLS on both restricts every operation to `auth.uid() = id/user_id`.
- A `handle_new_user()` trigger seeds both rows on sign-up.

> Email/password sign-up, 6-digit verification, login and password reset all work
> as-is in the web app, the PWA, and the packaged Android (Capacitor) APK.

---

## 🎨 Theming

- Light **and** dark mode, plus a **System** option (Settings screen).
- Palette and animations live in [`tailwind.config.js`](tailwind.config.js) and
  CSS variables in [`src/index.css`](src/index.css).
- Respects your OS **reduce‑motion** preference (both CSS animations and
  Framer Motion's JS‑driven ones) for calmer visuals.

---

## 🌍 Internationalization

A lightweight, dependency‑free i18n layer (`src/lib/i18n/`) ships with **English
as the default**. French and Arabic catalogs are **scaffolded** with the same
keys and fall back to English until translated. Selecting a language is a
per‑device setting; **Arabic** switches the document to **RTL**
(`dir="rtl"`). Translating the stub catalogs and finishing the directional‑CSS
sweep are the remaining steps to fully ship FR/AR — see `docs/SECURITY_AND_OPS.md`.

---

## 💾 Data & Privacy

- **Local-only by default:** 100% on‑device storage via `localStorage`
  (key: `calm-planner-v1`). No account, no servers, works fully offline.
- **Optional cloud sync:** add Supabase credentials (see *Authentication* above)
  to sync per‑user data across devices, protected by Row‑Level Security.
- No tracking, no analytics, no third‑party data sharing.

---

## 📦 npm Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type‑check + production build (+ service worker) |
| `npm run preview` | Serve the production build locally |
| `npm run test` / `npm run test:run` | Run the Vitest suite (watch / once) |
| `npm run typecheck` | Type‑check only (`tsc -b`) |
| `npm run lint` / `npm run lint:fix` | Lint with ESLint (fix where possible) |
| `npm run format` / `npm run format:check` | Format / check formatting with Prettier |
| `npm run check` | Combined gate: lint + typecheck + tests + build (used by CI) |
| `npm run generate:icons` | Regenerate icons & splash screens |
| `npm run cap:sync` | Build and sync the Android project |
| `npm run cap:open` | Open the Android project in Android Studio |

---

## 📄 License

MIT — see [`LICENSE`](LICENSE). Made with 💖 as **Pink Petals Planner**.
