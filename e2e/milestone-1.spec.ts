import { test, expect } from "./fixtures/game.fixture";

test.describe("Milestone 1: Static Empire View", () => {
  test("shows new game prompt when no game exists", async ({ gamePage }) => {
    // Should show new game prompt
    const prompt = gamePage.locator('[data-testid="new-game-prompt"]');
    await expect(prompt).toBeVisible();

    // Should have empire name input
    const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
    await expect(nameInput).toBeVisible();

    // Should have start button
    const startButton = gamePage.locator('[data-testid="start-game-button"]');
    await expect(startButton).toBeVisible();
    await expect(startButton).toHaveText("BEGIN CONQUEST");
  });

  test("can create a new game", async ({ gamePage }) => {
    // Fill in empire name
    const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
    await nameInput.fill("Test Empire");

    // Click start button
    const startButton = gamePage.locator('[data-testid="start-game-button"]');
    await startButton.click();

    // Wait for dashboard to load
    await gamePage.waitForLoadState("networkidle");

    // Should show dashboard
    const dashboard = gamePage.locator('[data-testid="dashboard"]');
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test("dashboard displays correct starting resources", async ({ gamePage }) => {
    // Create a new game first
    const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Resource Test Empire");
      await gamePage.locator('[data-testid="start-game-button"]').click();
      await gamePage.waitForLoadState("networkidle");
    }

    // Wait for dashboard
    await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 10000,
    });

    // Check resource panel
    const resourcePanel = gamePage.locator('[data-testid="resource-panel"]');
    await expect(resourcePanel).toBeVisible();

    // Verify starting resources match PRD
    await expect(resourcePanel.locator('[data-testid="credits"]')).toContainText(
      "100,000"
    );
    await expect(resourcePanel.locator('[data-testid="food"]')).toContainText(
      "1,000"
    );
    await expect(resourcePanel.locator('[data-testid="ore"]')).toContainText(
      "500"
    );
    await expect(resourcePanel.locator('[data-testid="petroleum"]')).toContainText(
      "200"
    );
    await expect(
      resourcePanel.locator('[data-testid="research-points"]')
    ).toContainText("0");
  });

  test("planet list shows 9 planets with correct distribution", async ({
    gamePage,
  }) => {
    // Create game if needed
    const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Planet Test Empire");
      await gamePage.locator('[data-testid="start-game-button"]').click();
      await gamePage.waitForLoadState("networkidle");
    }

    // Wait for dashboard
    await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 10000,
    });

    // Check planet list
    const planetList = gamePage.locator('[data-testid="planet-list"]');
    await expect(planetList).toBeVisible();

    // Check total count (9 planets)
    await expect(planetList).toContainText("Planets (9)");

    // Check distribution - 2 food, 2 ore, 1 petroleum, 1 tourism, 1 urban, 1 government, 1 research
    await expect(
      planetList.locator('[data-testid="planet-type-food"]')
    ).toContainText("2");
    await expect(
      planetList.locator('[data-testid="planet-type-ore"]')
    ).toContainText("2");
    await expect(
      planetList.locator('[data-testid="planet-type-petroleum"]')
    ).toContainText("1");
    await expect(
      planetList.locator('[data-testid="planet-type-tourism"]')
    ).toContainText("1");
    await expect(
      planetList.locator('[data-testid="planet-type-urban"]')
    ).toContainText("1");
    await expect(
      planetList.locator('[data-testid="planet-type-government"]')
    ).toContainText("1");
    await expect(
      planetList.locator('[data-testid="planet-type-research"]')
    ).toContainText("1");
  });

  test("networth displays using correct formula", async ({ gamePage }) => {
    // Create game if needed
    const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Networth Test Empire");
      await gamePage.locator('[data-testid="start-game-button"]').click();
      await gamePage.waitForLoadState("networkidle");
    }

    // Wait for dashboard
    await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 10000,
    });

    // Check networth panel
    const networthPanel = gamePage.locator('[data-testid="networth-panel"]');
    await expect(networthPanel).toBeVisible();

    // Starting networth: 9 planets × 10 + 100 soldiers × 0.0005 = 90.05
    await expect(
      networthPanel.locator('[data-testid="networth-value"]')
    ).toContainText("90.05");
  });

  test("population count is displayed correctly", async ({ gamePage }) => {
    // Create game if needed
    const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Population Test Empire");
      await gamePage.locator('[data-testid="start-game-button"]').click();
      await gamePage.waitForLoadState("networkidle");
    }

    // Wait for dashboard
    await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 10000,
    });

    // Check population panel
    const populationPanel = gamePage.locator('[data-testid="population-panel"]');
    await expect(populationPanel).toBeVisible();

    // Check population count (10,000)
    await expect(
      populationPanel.locator('[data-testid="population-count"]')
    ).toContainText("10,000");

    // Check civil status (Content)
    await expect(
      populationPanel.locator('[data-testid="civil-status"]')
    ).toContainText("Content");
  });

  test("military panel shows starting forces", async ({ gamePage }) => {
    // Create game if needed
    const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Military Test Empire");
      await gamePage.locator('[data-testid="start-game-button"]').click();
      await gamePage.waitForLoadState("networkidle");
    }

    // Wait for dashboard
    await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 10000,
    });

    // Check military panel
    const militaryPanel = gamePage.locator('[data-testid="military-panel"]');
    await expect(militaryPanel).toBeVisible();

    // Check that soldiers count is visible (starting: 100)
    await expect(militaryPanel).toContainText("Soldiers");
    await expect(militaryPanel).toContainText("100");
  });

  test("can navigate to planets page", async ({ gamePage }) => {
    // Create game if needed
    const nameInput = gamePage.locator('[data-testid="empire-name-input"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill("Navigation Test Empire");
      await gamePage.locator('[data-testid="start-game-button"]').click();
      await gamePage.waitForLoadState("networkidle");
    }

    // Wait for dashboard
    await expect(gamePage.locator('[data-testid="dashboard"]')).toBeVisible({
      timeout: 10000,
    });

    // Click on planets link in navigation
    await gamePage.click('a[href="/game/planets"]');
    await gamePage.waitForLoadState("networkidle");

    // Should show planets page
    await expect(gamePage.locator('[data-testid="planets-page"]')).toBeVisible({
      timeout: 10000,
    });

    // Should show 9 planet cards
    const planetCards = gamePage.locator('[data-testid^="planet-card-"]');
    await expect(planetCards).toHaveCount(9);
  });
});
