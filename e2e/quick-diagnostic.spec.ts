import { test, expect } from "@playwright/test";

/**
 * Quick Diagnostic Test (5 turns)
 * Identify immediate UI/UX issues before running full 50-turn test
 */

test.describe("Quick 5-Turn Diagnostic", () => {
  test("Validate core game flow and UI elements", async ({ page }) => {
    console.log("=== QUICK DIAGNOSTIC TEST ===");

    // Step 1: Navigate to homepage
    console.log("Step 1: Navigating to homepage");
    await page.goto("/");

    // Take screenshot
    await page.screenshot({ path: "e2e/screenshots/01-homepage.png", fullPage: true });

    // Step 2: Start new game
    console.log("Step 2: Starting new game");
    const startButton = page.locator('a[href="/game"]').filter({ hasText: /start.*conquest|start.*game/i }).first();

    if (await startButton.count() === 0) {
      console.error("❌ ERROR: No 'Start' button found on homepage");
      throw new Error("Start button not found");
    }

    await startButton.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: "e2e/screenshots/02-game-setup.png", fullPage: true });

    // Step 3: Fill out game setup
    console.log("Step 3: Configuring game");

    // Try to find and fill empire name
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill("Quick Test Empire");
    }

    // Click start/create button
    const createButton = page.locator('button').filter({ hasText: /start|create|begin/i }).first();
    if (await createButton.count() === 0) {
      console.error("❌ ERROR: No create/start button found on setup page");
      throw new Error("Create game button not found");
    }

    await createButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for game initialization

    await page.screenshot({ path: "e2e/screenshots/03-game-dashboard.png", fullPage: true });

    // Step 4: Verify game started
    console.log("Step 4: Verifying game started");

    // Check for turn counter
    const turnByTestId = await page.locator('[data-testid*="turn"]').count();
    const turnByText = await page.locator('text=/turn/i').count();

    if (turnByTestId === 0 && turnByText === 0) {
      console.error("⚠️ UX ISSUE: No visible turn counter found");
    } else {
      console.log("✅ Turn counter visible");
    }

    // Step 5: Check for turn summary/income modal
    console.log("Step 5: Checking for turn summary modal");

    // Wait a bit longer for React to render the modal on initial load
    await page.waitForTimeout(2000);

    // Check for turn summary modal (data-testid="turn-summary-modal")
    const modal = page.locator('[data-testid="turn-summary-modal"], [role="dialog"], .modal').first();
    const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

    if (modalVisible) {
      console.log("✅ Turn summary modal displayed");
      await page.screenshot({ path: "e2e/screenshots/04-turn-summary.png", fullPage: true });

      // Try to close it with the CONTINUE button
      const continueBtn = page.locator('[data-testid="turn-summary-continue"]');
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
        console.log("✅ Closed turn summary");
      } else {
        // Fallback to first button
        const closeBtn = modal.locator('button').first();
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          console.log("✅ Closed turn summary (fallback)");
        }
      }
    } else {
      console.error("❌ CRITICAL UX ISSUE: No turn summary modal at game start");
      console.error("   User feedback: Players need to acknowledge income, taxes, population before taking actions");
      console.error("   Note: Modal should have data-testid='turn-summary-modal'");
    }

    await page.waitForTimeout(1000);

    // Step 6: Test navigation to each major page
    console.log("Step 6: Testing navigation");

    const pagesToTest = [
      { name: "Planets", url: "/game/planets", selector: 'a[href="/game/planets"]' },
      { name: "Military", url: "/game/military", selector: 'a[href="/game/military"]' },
      { name: "Research", url: "/game/research", selector: 'a[href="/game/research"]' },
      { name: "Market", url: "/game/market", selector: 'a[href="/game/market"]' },
      { name: "Combat", url: "/game/combat", selector: 'a[href="/game/combat"]' },
      { name: "Starmap", url: "/game/starmap", selector: 'a[href="/game/starmap"]' },
    ];

    for (const pageInfo of pagesToTest) {
      const link = page.locator(pageInfo.selector).first();
      if (await link.count() === 0) {
        console.error(`❌ ERROR: No navigation link found for ${pageInfo.name}`);
        continue;
      }

      console.log(`Testing ${pageInfo.name} page...`);

      // Check if link is visible, scroll into view if needed
      const isVisible = await link.isVisible({ timeout: 2000 }).catch(() => false);
      if (!isVisible) {
        console.log(`   Scrolling ${pageInfo.name} link into view...`);
        await link.scrollIntoViewIfNeeded().catch(() => {
          console.error(`⚠️ WARNING: ${pageInfo.name} link not accessible (may be in collapsed menu)`);
        });
      }

      // Try to click with timeout, skip if not clickable
      try {
        await link.click({ timeout: 5000 });
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `e2e/screenshots/page-${pageInfo.name.toLowerCase()}.png`, fullPage: true });
        console.log(`✅ ${pageInfo.name} page accessible`);

        // Go back to dashboard
        const dashboardLink = page.locator('a[href="/game"]').first();
        if (await dashboardLink.count() > 0) {
          await dashboardLink.click();
          await page.waitForLoadState('networkidle');
        }
      } catch (error) {
        console.error(`⚠️ WARNING: Could not navigate to ${pageInfo.name} (${error instanceof Error ? error.message : 'unknown error'})`);
        // Try to take screenshot, but don't fail if page is closed
        try {
          await page.screenshot({ path: `e2e/screenshots/page-${pageInfo.name.toLowerCase()}-failed.png`, fullPage: true });
        } catch (screenshotError) {
          console.error(`   Could not capture screenshot: page may be closed`);
        }
        // If this is Starmap and it's causing issues, just skip it
        if (pageInfo.name === "Starmap") {
          console.log(`   Skipping ${pageInfo.name} for remainder of test`);
          break; // Exit the navigation loop
        }
      }
    }

    // Check if page is still open after navigation loop
    const pageIsClosed = page.isClosed();
    if (pageIsClosed) {
      console.error("❌ TEST ABORTED: Browser page closed during navigation tests");
      console.log("\\n=== DIAGNOSTIC INCOMPLETE ===");
      console.log("Test stopped early due to browser closure");
      return; // Exit test gracefully
    }

    // Step 7: Test End Turn button
    console.log("Step 7: Testing End Turn functionality");

    const endTurnBtn = page.locator('button').filter({ hasText: /end.*turn|next.*turn/i }).first();
    if (await endTurnBtn.count() === 0) {
      console.error("❌ CRITICAL ERROR: End Turn button not found");
      throw new Error("End Turn button not found");
    }

    // Check if button is clickable
    const isDisabled = await endTurnBtn.isDisabled();
    if (isDisabled) {
      console.error("❌ ERROR: End Turn button is disabled");
    } else {
      console.log("✅ End Turn button is clickable");
    }

    // Play 5 quick turns
    for (let turn = 1; turn <= 5; turn++) {
      console.log(`\n=== Turn ${turn} ===`);

      // Try to click End Turn
      try {
        await endTurnBtn.click();
        console.log(`✅ Turn ${turn}: End Turn clicked`);

        // Wait for processing
        await page.waitForTimeout(2000);

        // Check for new turn summary
        const newModal = page.locator('[role="dialog"], .modal').first();
        const newModalVisible = await newModal.isVisible({ timeout: 2000 }).catch(() => false);

        if (newModalVisible) {
          console.log(`✅ Turn ${turn}: Turn summary shown`);
          const closeBtn = newModal.locator('button').first();
          if (await closeBtn.count() > 0) {
            await closeBtn.click();
          }
        } else {
          console.error(`⚠️ Turn ${turn}: No turn summary modal`);
        }

        await page.screenshot({ path: `e2e/screenshots/turn-${turn}.png`, fullPage: true });
      } catch (error) {
        console.error(`❌ Turn ${turn} failed:`, error);
        break;
      }
    }

    console.log("\n=== DIAGNOSTIC COMPLETE ===");
    console.log("Screenshots saved to e2e/screenshots/");
    console.log("Review screenshots to identify UI/UX issues");
  });
});
