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

    // After locking, dashboard should appear with the domain visible
    await expect(page.getByText(/example\.com/i).first()).toBeVisible();
  });

  test("TC-UI-03: Content Scan Execution & Terminal Log", async ({ page }) => {
    // Lock target
    const input = page.locator("input[aria-label='Website URL']");
    await input.fill(TARGET_DOMAIN);
    await page.locator("button:has-text('Lock Target')").click();

    // Wait for dashboard to load
    await expect(page.getByText(/example\.com/i).first()).toBeVisible();

    // Click Content mode in the dashboard — use visible button only
    const contentButton = page.locator("button:has-text('Content')").last();
    await expect(contentButton).toBeVisible();
    await contentButton.click();

    // Assert scanning starts - look for activity stream or stage logs
    const scanningIndicator = page.locator("text=/Scanning|Initializing|Content Optimizer|stage/i").first();
    await expect(scanningIndicator).toBeVisible({ timeout: 15000 });
  });

  test("TC-UI-08: PDF Download Action Readiness", async ({ page }) => {
    // Lock target
    const input = page.locator("input[aria-label='Website URL']");
    await input.fill(TARGET_DOMAIN);
    await page.locator("button:has-text('Lock Target')").click();

    // Wait for dashboard
    await expect(page.getByText(/example\.com/i).first()).toBeVisible();

    // Click Content mode
    const contentButton = page.locator("button:has-text('Content')").last();
    await contentButton.click();

    // Wait for scan to complete and look for Download PDF button
    const pdfButton = page.locator("button:has-text('PDF')").first();
    await expect(pdfButton).toBeVisible({ timeout: 30000 });
  });
});
