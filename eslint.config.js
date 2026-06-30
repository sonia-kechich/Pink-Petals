import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

/**
 * Flat ESLint config (ESLint 9 + typescript-eslint 8).
 *
 * Philosophy for the FIRST rollout: surface genuine problems (dead code,
 * unreachable code, broken hooks deps) as errors, but keep stylistic / legacy
 * findings at WARN so adding linting doesn't immediately break the build or CI.
 * `npm run lint` (and CI's `check`) fail only on errors; warnings are visible
 * but non-blocking. Tighten rules to "error" incrementally later.
 *
 * Prettier owns formatting — `eslint-config-prettier` (last) turns off every
 * rule that would conflict with it.
 */
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "dev-dist/**",
      "node_modules/**",
      "android/**",
      "supabase/functions/**", // Deno edge runtime, not the app's tsconfig
      "scripts/**",
      "*.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // TypeScript already resolves identifiers; `no-undef` only produces false
      // positives for DOM/Node globals in .ts(x). Off per typescript-eslint guidance.
      "no-undef": "off",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Legacy-noise rules kept non-blocking for the initial rollout.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  prettier
);
