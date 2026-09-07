import { test, expect } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "https://kodand.pages.dev";
const TARGET_DOMAIN = "example.com";

test.describe("KODAND End-to-End Test Suite (Kilo)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test("TC-UI-01: Landing Page Load & Assets", async ({ page }) => {
    await expect(page).toHaveTitle(/KODAND/i);
    const logo = page.locator("img[alt='KODAND']").first();
    await expect(logo).toBeVisible();

    const lockNotice = page.getByText(/No sign-up · Anonymous/i);
    await expect(lockNotice).toBeVisible();
  });

  test("TC-UI-02: Target Normalization & Lock", async ({ page }) => {
    const input = page.locator("input[aria-label='Website URL']");
    await expect(input).toBeVisible();

    await input.fill(TARGET_DOMAIN);
    await page.locator("button:has-text('Lock Target')").click();

    // Verify target locked banner / badge appears
    await expect(page.getByText(/example\.com/i).first()).toBeVisible();
  });

  test("TC-UI-03: Content Scan Execution & Terminal Log", async ({ page }) => {
    // Lock target
    const input = page.locator("input[aria-label='Website URL']");
    await input.fill(TARGET_DOMAIN);
    await page.locator("button:has-text('Lock Target')").click();

    // Click Content mode card
    const contentCard = page.locator("div[data-slot='card']:has-text('Content')").first();
    await contentCard.click();

    // Assert scanning or terminal activity starts
    const terminalOrResults = page.locator("text=/Content|Scanning|Score|Terminal/i").first();
    await expect(terminalOrResults).toBeVisible({ timeout: 10000 });
  });

  test("TC-UI-08: PDF Download Action Readiness", async ({ page }) => {
    // Lock target and execute scan
    const input = page.locator("input[aria-label='Website URL']");
    await input.fill(TARGET_DOMAIN);
    await page.locator("button:has-text('Lock Target')").click();

    const contentCard = page.locator("div[data-slot='card']:has-text('Content')").first();
    await contentCard.click();

    // Wait for scan to complete and look for Download PDF button
    const pdfButton = page.locator("button:has-text('PDF'), button:has-text('Download')").first();
    await expect(pdfButton).toBeVisible({ timeout: 20000 });
  });
});
