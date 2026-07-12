import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [react()],
  build: {
    target: "es2019",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
