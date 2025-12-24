import { test as base, type Page } from "@playwright/test";

interface GameFixtures {
  gamePage: Page;
}

export const test = base.extend<GameFixtures>({
  gamePage: async ({ page }, use) => {
    // Navigate to game and wait for page to load
    await page.goto("/game");
    await page.waitForLoadState("networkidle");
    await use(page);
  },
});

export { expect } from "@playwright/test";
