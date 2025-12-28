import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "json-summary"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types/**",
        "e2e/",
        "scripts/",
        // Database/integration code tested by E2E
        "**/db/**",
        "**/performance/**",
        "**/app/**",
        // Service files with Supabase interactions - tested via E2E
        "src/lib/game/services/build-queue-service.ts",
        "src/lib/game/services/research-service.ts",
        "src/lib/game/services/planet-service.ts",
        "src/lib/game/services/upgrade-service.ts",
        "src/lib/game/services/turn-processor.ts",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
