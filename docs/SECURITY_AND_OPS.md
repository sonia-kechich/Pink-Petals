# Security & Operations

This document covers things that are **partly or wholly outside the codebase** —
CSP rollout, the account-deletion server step, and dashboard/secret actions a
human must perform. JSON (`vercel.json`) can't carry comments, so the "why" for
each header lives here.

---

## Content-Security-Policy (currently **Report-Only**)

`vercel.json` ships `Content-Security-Policy-Report-Only` — it **observes and
reports** violations but does **not block** anything yet. Watch the reports
before promoting it to enforcing.

### The allowlist and why each entry exists

| Directive | Value | Why |
|---|---|---|
| `default-src` | `'self'` | Lock everything to same-origin by default; tighten per-type below. |
| `script-src` | `'self'` | App JS is bundled by Vite to same-origin static files. No CDN scripts, no `eval` in the production build. |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | `'unsafe-inline'` is required because the app sets inline `style={{…}}` everywhere and **framer-motion** writes inline styles during animation. `fonts.googleapis.com` serves the Google Fonts stylesheet (`<link>` in `index.html`). |
| `font-src` | `'self' https://fonts.gstatic.com data:` | Google Fonts files are served from `fonts.gstatic.com`; `data:` covers any inlined glyphs. |
| `img-src` | `'self' data: blob:` | Icons/inline SVGs use `data:`; `blob:` covers generated images. |
| `connect-src` | `'self' https://*.supabase.co wss://*.supabase.co` | Supabase REST/Auth over HTTPS and **realtime** sync over WebSocket. Wildcard covers the project subdomain regardless of `VITE_SUPABASE_URL`. |
| `worker-src` | `'self'` | The PWA service worker (vite-plugin-pwa) is same-origin. |
| `manifest-src` | `'self'` | `manifest.webmanifest` is same-origin. |
| `base-uri` | `'self'` | Block `<base>` hijacking. |
| `object-src` | `'none'` | No plugins/embeds. |
| `frame-ancestors` | `'none'` | Disallow being framed (clickjacking). Mirrors `X-Frame-Options: DENY`. |
| `form-action` | `'self'` | Forms can only post to same-origin. |

If you add a service later, extend the matching directive **before** enforcing:
- **Vercel Analytics / Speed Insights** → add `https://*.vercel-insights.com` (and possibly `va.vercel-scripts.com`) to `script-src` and `connect-src`.
- **Firebase/Firestore** (not currently used) → add `https://*.googleapis.com` and `https://*.firebaseio.com` / `wss://*.firebaseio.com` to `connect-src`.
- Any new font/CDN/image host → the corresponding `font-src` / `img-src` / `style-src`.

### Promote Report-Only → enforcing

1. Deploy with the Report-Only header (already in `vercel.json`).
2. Use the app fully (sign in, sync across two devices, timer, notes, import/export, switch language to Arabic for RTL) and watch the browser console / your report collector for `[Report Only]` CSP violations.
3. For each legitimate violation, add the minimal origin to the right directive.
4. When the report stream is clean, **rename the header key** in `vercel.json`:
   `Content-Security-Policy-Report-Only` → `Content-Security-Policy`. Keep the
   value identical. Redeploy.

### `'unsafe-inline'` caveat (read before enforcing)

- **Styles need `'unsafe-inline'`** and will for the foreseeable future: framer-motion and the app's inline `style` attributes depend on it. Removing it would require refactoring all inline styles to classes and giving framer a nonce — not worth it. Inline **styles** are far lower-risk than inline scripts.
- **Scripts do NOT need `'unsafe-inline'` or `'unsafe-eval'`** in the production Vite build, so `script-src 'self'` is safe to enforce. (Note: `vite dev` injects inline scripts/HMR + uses `eval`; this CSP is for the **deployed** build only — don't expect the dev server to satisfy it.)
- Optional hardening later: serve a per-request **nonce** for any unavoidable inline script and replace `'unsafe-inline'` in `style-src` with `'nonce-…'` + `'unsafe-hashes'`. This needs server-rendered HTML (middleware), which this static SPA doesn't currently use.

### Optional: collect reports

To aggregate violations, add a `report-to`/`report-uri` directive pointing at a
collector (e.g. report-uri.com or a serverless endpoint). Omitted here because
there's no endpoint yet; browser-console observation is enough for initial tuning.

---

## Account & data deletion — client vs. server

The in-app **Settings → Danger zone → Delete account & data** flow
(`src/lib/account.ts`) does, in order:

1. **Cloud data** — `DELETE` the user's `user_data` row. Requires the new
   `"Owner can delete their data"` RLS policy in `supabase/schema.sql`
   (re-run the schema — see MANUAL ACTIONS).
2. **Auth account** — invokes the `delete-account` edge function if deployed.
   A client with the anon key **cannot** delete its own `auth.users` row, so this
   is the only correct place to do it.
3. **Sign out**, then **wipe local** persisted store + PWA caches, then reload.

If the edge function isn't deployed, the flow still erases data and signs the
user out; the auth row removal is then a manual/server action.

### Deploy the `delete-account` edge function

```bash
supabase functions deploy delete-account
supabase secrets set SERVICE_ROLE_KEY=<your service-role key>   # never ship to the client
# SUPABASE_URL is provided to the function automatically by the platform.
```

The function (`supabase/functions/delete-account/index.ts`) verifies the
caller's JWT and calls `auth.admin.deleteUser`. The FK `on delete cascade` in
the schema removes `profiles` + `user_data` automatically.

---

## MANUAL ACTIONS REQUIRED (cannot be done from this repo)

- [ ] **Revoke the exposed Vercel API token and issue a new one.**
  Vercel dashboard → **Account Settings → Tokens** → delete the leaked token →
  **Create** a new one. Update it wherever it's stored (CI/CD secrets, local
  `.env`, password manager). **Do not commit tokens.** This repo does not
  reference a Vercel token in source (checked); it would only live in CI/CD
  settings or a local environment — rotate it there.
- [ ] **Re-enable "Confirm email" + configure custom SMTP.**
  - Config-as-code: `supabase/config.toml` now sets
    `[auth] enable_confirmations = true` and documents the SMTP block. Apply with
    `supabase link --project-ref <ref>` then `supabase config push`.
  - Dashboard (hosted projects, still required): **Authentication → Providers →
    Email** → enable **Confirm email**; **Authentication → Emails → SMTP
    Settings** → enter your transactional SMTP host/port/user/password and sender.
    Set the SMTP password via `supabase secrets`, not in the committed file.
  - Until this is on, unverified emails can register. The app surfaces an
    "email not verified" notice (Settings) as a safe-degrade guard.
- [ ] **Re-run `supabase/schema.sql`** (SQL Editor) so the new
  `"Owner can delete their data"` DELETE policy on `user_data` is applied.
- [ ] **Deploy the `delete-account` edge function** (see above) to enable true
  auth-account deletion from the app.

---

## i18n — what's left to ship FR/AR

- The layer is wired (EN default, FR/AR stub catalogs with EN fallback, RTL via
  `dir`, a language switcher in Settings persisted per-device).
- **To actually ship FR/AR:** fill `src/lib/i18n/locales/fr.ts` and `ar.ts` with
  reviewed translations (same keys as `en.ts`). Then extend string extraction to
  the components not yet routed through `t()` (Today, Auth copy, Timer labels,
  date/`content.ts` strings) and finish migrating physical CSS to logical
  properties for full RTL (remaining offenders tracked in the PR report).
