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
        // Repository layer - DB access code tested via E2E
        "**/repositories/**",
        // Service files with Supabase interactions - tested via E2E
        "src/lib/game/services/build-queue-service.ts",
        "src/lib/game/services/research-service.ts",
        "src/lib/game/services/planet-service.ts",
        "src/lib/game/services/upgrade-service.ts",
        "src/lib/game/services/turn-processor.ts",
        "src/lib/game/services/combat-service.ts",
        "src/lib/game/services/covert-service.ts",
        "src/lib/game/services/coalition-service.ts",
        "src/lib/game/services/save-service.ts",
        "src/lib/game/services/victory-service.ts",
        "src/lib/game/services/event-service.ts",
        "src/lib/game/services/crafting-service.ts",
        // Other integration code with DB dependencies
        "src/lib/diplomacy/treaty-service.ts",
        "src/lib/market/market-service.ts",
        "src/lib/messages/message-service.ts",
        "src/lib/messages/triggers.ts",
        "src/lib/messages/template-loader.ts",
        "src/lib/bots/bot-actions.ts",
        "src/lib/bots/bot-processor.ts",
        "src/lib/bots/bot-generator.ts",
        // Memory system uses integration patterns with database
        "src/lib/bots/memory/**",
        // Test simulation utilities (test infrastructure, not production code)
        "tests/simulation/**",
        // Index files (re-exports only)
        "**/index.ts",
        // Types (no runtime code)
        "**/types.ts",
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
      "@data": path.resolve(__dirname, "./data"),
    },
  },
});
