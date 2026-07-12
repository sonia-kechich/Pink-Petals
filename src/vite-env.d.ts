/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public API key (safe to expose in the client). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Deployed web URL used for auth-email redirects from the native app
   *  (where window.location.origin is http://localhost). */
  readonly VITE_PUBLIC_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
