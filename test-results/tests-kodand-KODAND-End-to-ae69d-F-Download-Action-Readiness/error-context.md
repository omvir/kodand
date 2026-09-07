# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\kodand.spec.ts >> KODAND End-to-End Test Suite (Kilo) >> TC-UI-08: PDF Download Action Readiness
- Location: tests\kodand.spec.ts:50:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('button:has-text(\'PDF\')').first()
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('button:has-text(\'PDF\')').first() with timeout 30000ms
  - waiting for locator('button:has-text(\'PDF\')').first()
  - Test timeout of 30000ms exceeded.

```

```yaml
- banner:
  - img "KODAND"
  - text: Target example.com
  - button "Change"
- complementary:
  - heading "Scan modes" [level=2]
  - button "Content ~4s Spelling, grammar, style, clarity, readability, tone, keyword density, reading time, and SEO content fit." [pressed]
  - button "Security ~12s HTTPS, security headers, content vulns + NVD CVE deep scan, RDAP WHOIS, DNS records, certificate transparency logs, and domain intel."
  - button "SEO ~4s Meta tags, canonical URL, Open Graph, headings, structured data, mobile."
  - button "Performance ~3s Page weight, render-blocking scripts, image strategy, caching, compression."
  - button "Accessibility ~4s Alt text, ARIA roles, labels, contrast, keyboard navigation, language."
  - button "Full 360° ~18s All five dimensions combined into one comprehensive digital health report."
  - heading "Recent scans" [level=2]
  - paragraph: No scans yet. History is saved in this browser only.
- main:
  - button "Content idle" [pressed]
  - button "Security idle"
  - button "SEO idle"
  - button "Performance idle"
  - button "Accessibility idle"
  - button "Full 360° idle"
  - heading "Content Optimizer" [level=2]
  - paragraph: Spelling, grammar, style, clarity, readability, tone, keyword density, reading time, and SEO content fit.
  - button "Run Content scan"
  - text: No Content Optimizer scan yet
  - paragraph: Run a Content scan on example.com to see its full data dashboard here. Spelling, grammar, style, clarity, readability, tone, keyword density, reading time, and SEO content fit.
  - button "Run Content Optimizer scan"
- complementary: Live activity Activity stream is idle. Start a scan to see live log lines here.
- contentinfo:
  - img "KODAND"
  - text: "· 360° audit Free public sources: NVD CVE RDAP WHOIS DNS TLS crt.sh KODAND is polite (1 req/800ms · 5-min cache) 🔒 Your data stays in your browser — we never upload or store it. Save your PDFs; your scan history clears when you close the browser."
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const BASE_URL = process.env.TEST_BASE_URL || "https://kodand.pages.dev";
  4  | const TARGET_DOMAIN = "example.com";
  5  | 
  6  | test.describe("KODAND End-to-End Test Suite (Kilo)", () => {
  7  |   test.beforeEach(async ({ page }) => {
  8  |     await page.goto(BASE_URL);
  9  |   });
  10 | 
  11 |   test("TC-UI-01: Landing Page Load & Assets", async ({ page }) => {
  12 |     await expect(page).toHaveTitle(/KODAND/i);
  13 |     const logo = page.locator("img[alt='KODAND']").first();
  14 |     await expect(logo).toBeVisible();
  15 | 
  16 |     const lockNotice = page.getByText(/No sign-up · Anonymous/i);
  17 |     await expect(lockNotice).toBeVisible();
  18 |   });
  19 | 
  20 |   test("TC-UI-02: Target Normalization & Lock", async ({ page }) => {
  21 |     const input = page.locator("input[aria-label='Website URL']");
  22 |     await expect(input).toBeVisible();
  23 | 
  24 |     await input.fill(TARGET_DOMAIN);
  25 |     await page.locator("button:has-text('Lock Target')").click();
  26 | 
  27 |     // After locking, dashboard should appear with the domain visible
  28 |     await expect(page.getByText(/example\.com/i).first()).toBeVisible();
  29 |   });
  30 | 
  31 |   test("TC-UI-03: Content Scan Execution & Terminal Log", async ({ page }) => {
  32 |     // Lock target
  33 |     const input = page.locator("input[aria-label='Website URL']");
  34 |     await input.fill(TARGET_DOMAIN);
  35 |     await page.locator("button:has-text('Lock Target')").click();
  36 | 
  37 |     // Wait for dashboard to load
  38 |     await expect(page.getByText(/example\.com/i).first()).toBeVisible();
  39 | 
  40 |     // Click Content mode in the dashboard — use visible button only
  41 |     const contentButton = page.locator("button:has-text('Content')").last();
  42 |     await expect(contentButton).toBeVisible();
  43 |     await contentButton.click();
  44 | 
  45 |     // Assert scanning starts - look for activity stream or stage logs
  46 |     const scanningIndicator = page.locator("text=/Scanning|Initializing|Content Optimizer|stage/i").first();
  47 |     await expect(scanningIndicator).toBeVisible({ timeout: 15000 });
  48 |   });
  49 | 
  50 |   test("TC-UI-08: PDF Download Action Readiness", async ({ page }) => {
  51 |     // Lock target
  52 |     const input = page.locator("input[aria-label='Website URL']");
  53 |     await input.fill(TARGET_DOMAIN);
  54 |     await page.locator("button:has-text('Lock Target')").click();
  55 | 
  56 |     // Wait for dashboard
  57 |     await expect(page.getByText(/example\.com/i).first()).toBeVisible();
  58 | 
  59 |     // Click Content mode
  60 |     const contentButton = page.locator("button:has-text('Content')").last();
  61 |     await contentButton.click();
  62 | 
  63 |     // Wait for scan to complete and look for Download PDF button
  64 |     const pdfButton = page.locator("button:has-text('PDF')").first();
> 65 |     await expect(pdfButton).toBeVisible({ timeout: 30000 });
     |                             ^ Error: expect(locator).toBeVisible() failed
  66 |   });
  67 | });
  68 | 
```