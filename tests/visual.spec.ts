import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "tests/reports/screenshots");

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.describe("KODAND Visual & Browser Inspection Suite (Kilo / Playwright)", () => {

  test("TC-VIS-01: Landing Page Visual Hierarchy & Theme", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/KODAND/i);
    const heroHeading = page.locator("h1, h2").first();
    await expect(heroHeading).toBeVisible();

    // Visual screenshot snapshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "01-landing-page.png"),
      fullPage: true,
    });
  });

  test("TC-VIS-02: Target Normalization & Scanner Dashboard", async ({ page }) => {
    await page.goto(BASE_URL);
    const input = page.locator("input[aria-label='Website URL'], input[placeholder*='domain'], input[type='text']").first();
    await expect(input).toBeVisible();

    await input.fill("example.com");
    const lockBtn = page.locator("button:has-text('Lock Target'), button:has-text('Audit'), button:has-text('Scan')").first();
    await lockBtn.click();

    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "02-scanner-dashboard.png"),
    });
  });

  test("TC-VIS-03: SaaS Pricing & India UPI Modal (atomicpixel0911-1@okhdfcbank)", async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    await page.waitForLoadState("networkidle");

    // Check pricing cards are rendered
    await expect(page.getByText(/Agency Pro/i).first()).toBeVisible();

    // Toggle INR / UPI currency
    const inrBtn = page.locator("button:has-text('INR'), button:has-text('₹')").first();
    if (await inrBtn.isVisible()) {
      await inrBtn.click();
      await page.waitForTimeout(300);
    }

    // Trigger UPI Payment Modal
    const upiTrigger = page.locator("button:has-text('UPI'), button:has-text('Pay via UPI')").first();
    if (await upiTrigger.isVisible()) {
      await upiTrigger.click();
      await page.waitForTimeout(500);

      // Verify user's official UPI ID is rendered
      const upiText = page.getByText(/atomicpixel0911-1@okhdfcbank/i).first();
      await expect(upiText).toBeVisible();

      // Screenshot UPI Payment Modal
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, "03-upi-payment-modal.png"),
      });
    }
  });

  test("TC-VIS-04: Competitor Side-by-Side Audit Workspace", async ({ page }) => {
    await page.goto(`${BASE_URL}/compare`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/Competitor|Comparison|Side-by-Side/i).first()).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "04-compare-matrix.png"),
    });
  });

  test("TC-VIS-05: Authentication Pages & Google OAuth Button", async ({ page }) => {
    // 1. Login Page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    const googleBtn = page.getByText(/Continue with Google/i).first();
    await expect(googleBtn).toBeVisible();

    const forgotLink = page.getByText(/Forgot password/i).first();
    await expect(forgotLink).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "05-login-page.png"),
    });

    // 2. Signup Page
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState("networkidle");

    const googleSignup = page.getByText(/Sign up with Google/i).first();
    await expect(googleSignup).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "06-signup-page.png"),
    });
  });

  test("TC-VIS-06: Password Recovery Workflow Pages", async ({ page }) => {
    // 1. Forgot password
    await page.goto(`${BASE_URL}/forgot-password`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Forgot Password|Reset Your Password/i).first()).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "07-forgot-password.png"),
    });

    // 2. Reset password
    await page.goto(`${BASE_URL}/reset-password?token=demo_test_token`);
    await page.waitForLoadState("networkidle");

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "08-reset-password.png"),
    });
  });

  test("TC-VIS-07: Admin Control Center & Telemetry Panel", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Enter admin PIN if prompted
    const pinInput = page.locator("input[type='password'], input[placeholder*='PIN'], input[type='text']").first();
    if (await pinInput.isVisible()) {
      await pinInput.fill("kodand2026");
      const submitBtn = page.locator("button:has-text('Enter'), button:has-text('Unlock'), button[type='submit']").first();
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "09-admin-control-center.png"),
      fullPage: true,
    });
  });

  test("TC-VIS-08: Admin Marketing Command Portal", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/marketing`);
    await page.waitForLoadState("networkidle");

    // Enter admin PIN if prompted
    const pinInput = page.locator("input[type='password'], input[placeholder*='PIN'], input[type='text']").first();
    if (await pinInput.isVisible()) {
      await pinInput.fill("kodand2026");
      const submitBtn = page.locator("button:has-text('Unlock'), button[type='submit']").first();
      await submitBtn.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.getByText(/KODAND SaaS Marketing|Target Audience Finder/i).first()).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "10-marketing-portal.png"),
      fullPage: true,
    });
  });

});

