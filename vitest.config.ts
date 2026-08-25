import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
    },
  },
  test: {
    // Node is the default. Files that need a DOM opt in per-file with
    //   // @vitest-environment jsdom
    environment: "node",
    include: [
      "packages/*/src/**/*.test.{ts,tsx}",
      "services/*/src/**/*.test.{ts,tsx}",
      "apps/web/src/**/*.test.{ts,tsx}",
      "apps/web/tests/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["./vitest.setup.ts"],
    restoreMocks: true,
    clearMocks: true,
  },
});
