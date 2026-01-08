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
        // Service files with database interactions - tested via E2E
        // Note: Unit tests exist for pure functions, but DB-dependent code is excluded
        "src/lib/game/services/build-queue-service.ts",
        "src/lib/game/services/research-service.ts",
        "src/lib/game/services/planet-service.ts",
        "src/lib/game/services/upgrade-service.ts",
        "src/lib/game/services/core/turn-processor.ts",
        "src/lib/game/services/combat/combat-service.ts",
        "src/lib/game/services/covert/covert-service.ts",
        "src/lib/game/services/coalition-service.ts",
        "src/lib/game/services/core/save-service.ts",
        "src/lib/game/services/event-service.ts",
        "src/lib/game/services/crafting/crafting-service.ts",
        // victory-service: Has unit tests for pure functions, but DB functions require E2E
        "src/lib/game/services/core/victory-service.ts",
        // attack-validation-service.ts NOT excluded - 100% pure functions with unit tests
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
        // LLM code - requires external API, tested via E2E only
        "src/lib/llm/**",
        // Additional DB-dependent services in subdirectories
        "src/lib/game/services/border-discovery-service.ts",
        "src/lib/game/services/checkpoint-service.ts",
        "src/lib/game/services/expansion-service.ts",
        "src/lib/game/services/core/session-service.ts",
        "src/lib/game/services/research/research-service.ts",
        // Config loaders with dynamic file system or DB access
        "src/lib/game/config/penalty-loader.ts",
        "src/lib/game/config/unit-loader.ts",
        // Bot reference system - complex integration
        "src/lib/bots/references.ts",
        // Bot archetypes - complex decision logic tested via simulation tests
        "src/lib/bots/archetypes/**",
        "src/lib/bots/decision-engine.ts",
        // Threat service - DB dependent
        "src/lib/game/services/threat-service.ts",
        // Tutorial service - UI integration
        "src/lib/tutorial/**",
        // Theme names - UI helper functions
        "src/lib/theme/names.ts",
        // Config loaders with complex initialization
        "src/lib/game/config/combat-loader.ts",
        // Test simulation utilities (test infrastructure, not production code)
        "tests/simulation/**",
        // Index files (re-exports only)
        "**/index.ts",
        // Types (no runtime code)
        "**/types.ts",
        // JSON data files
        "data/**",
        "src/data/**",
        // Combat volley system - complex simulation tested via simulation tests
        "src/lib/combat/volley-combat-v2.ts",
        "src/lib/combat/theater-control.ts",
        // Bot research preferences - complex decision logic
        "src/lib/bots/research-preferences.ts",
        // Game constants - static configuration
        "src/lib/game/constants/index.ts",
        "src/lib/game/constants.ts",
        "src/lib/game/build-config.ts",
        // Events system - complex generators tested via simulation
        "src/lib/events/economic.ts",
        "src/lib/events/military.ts",
        "src/lib/events/narrative.ts",
        "src/lib/events/political.ts",
        // Coalition service - DB dependent
        "src/lib/game/services/coalition-service.ts",
        // Wormhole construction - DB dependent
        "src/lib/game/services/wormhole-construction-service.ts",
        // Galaxy generation - DB dependent initialization
        "src/lib/game/services/galaxy-generation-service.ts",
        // Combat nuclear - tested via simulation
        "src/lib/combat/nuclear.ts",
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
