# KODAND — Comprehensive Test Specification & Test Cases
> **Target Environment:** `https://kodand.pages.dev` (or local `http://localhost:3000`)  
> **Audience:** Kilo AI / Automated Testing Suite in VS Code  
> **Status:** Ready for Execution

---

## 📋 Execution Guide for Kilo in VS Code

Kilo can execute these tests in two ways:

1. **Automated API & Integration Tests (Zero Dependencies):**
   ```bash
   node tests/test-runner.mjs
   ```
   *(To test against local server: `node tests/test-runner.mjs http://localhost:3000`)*

2. **Automated End-to-End Browser Tests (Playwright):**
   ```bash
   npm install -D @playwright/test
   npx playwright install chromium
   npx playwright test tests/kodand.spec.ts
   ```

---

## 🧪 Detailed Test Cases Matrix

### Suite 1: Target Lock & Input Validation (UI & Engine)

| Test ID | Test Title | Priority | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-UI-01** | Landing Page Load & Assets | High | App is running | 1. Open `https://kodand.pages.dev`<br>2. Check `<title>`, ruby logo, and navigation bar. | Page loads with HTTP 200, title is `KODAND - 360° Website Audit`, ruby logo image renders without 404, spy theme audio is initialized. | Pending |
| **TC-UI-02** | Target Normalization (No Protocol) | High | On landing page | 1. Enter `example.com` into input<br>2. Click **Lock Target** or press Enter. | Input accepts domain, auto-prefixes `https://` if needed, locks target into state, activates the 6 scanner cards. | Pending |
| **TC-UI-03** | Target Normalization (With Protocol & Path) | Medium | Target unlocked | 1. Enter `https://github.com/omvir/kodand`<br>2. Click **Lock Target**. | Correctly parses hostname `github.com` and pathname `/omvir/kodand`, locks successfully. | Pending |
| **TC-UI-04** | Invalid Domain Rejection | High | On landing page | 1. Enter `invalid-not-a-domain` or `ftp://bad`<br>2. Click **Lock Target**. | Displays validation error / toast notification, prevents scan initiation until valid URL entered. | Pending |
| **TC-UI-05** | Target Unlock / Reset Flow | Medium | Target locked | 1. Click **Unlock** or target badge edit icon<br>2. Enter new target `wikipedia.org`. | Current target clears, input field unlocks, new target can be locked cleanly. | Pending |

---

### Suite 2: Scan Engine & SSE Telemetry (/api/scan)

| Test ID | Test Title | Priority | Request Payload | Steps | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-API-01** | Content Optimizer Scan | High | `{"url": "https://example.com", "mode": "content"}` | 1. POST to `/api/scan`<br>2. Listen to SSE stream | Stream receives `stage`, `progress`, `result`, `complete`. Returns grammar, style, readability score, reading time. | Pending |
| **TC-API-02** | Security & Intel Scan | Critical | `{"url": "https://example.com", "mode": "security"}` | 1. POST to `/api/scan`<br>2. Verify SSE events | Runs DNS DoH, crt.sh cert logs, WHOIS RDAP, security headers, CVE scan. Returns security findings with CVSS severity. | Pending |
| **TC-API-03** | SEO Diagnostic Scan | High | `{"url": "https://example.com", "mode": "seo"}` | 1. POST to `/api/scan`<br>2. Verify SEO checks | Checks `<title>`, meta description, canonical, OpenGraph, Twitter tags, H1-H6 hierarchy. | Pending |
| **TC-API-04** | Performance Benchmark Scan | High | `{"url": "https://example.com", "mode": "performance"}` | 1. POST to `/api/scan`<br>2. Check metrics | Measures page weight, script blocking, compression (Gzip/Brotli), caching headers. | Pending |
| **TC-API-05** | Accessibility Audit Scan | High | `{"url": "https://example.com", "mode": "accessibility"}` | 1. POST to `/api/scan`<br>2. Check WCAG findings | Checks image `alt` text, ARIA attributes, form labels, language attribute. | Pending |
| **TC-API-06** | Full 360° Multi-Dimension Scan | Critical | `{"url": "https://example.com", "mode": "full"}` | 1. POST to `/api/scan`<br>2. Stream full audit | Executes all 5 dimensions. Emits aggregated findings and unified Digital Health Score (0-100) + letter grade. | Pending |
| **TC-API-07** | Invalid Scan Payload Handling | Medium | `{"invalid": 123}` or missing `url` | 1. POST to `/api/scan` with malformed JSON | Responds with HTTP 400 Bad Request and descriptive error message; does not hang or crash. | Pending |

---

### Suite 3: Anti-Ban, Caching & Performance

| Test ID | Test Title | Priority | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-PERF-01** | In-Memory 5-Min Scan Cache | High | First scan completed | 1. Run `content` scan on `example.com`<br>2. Immediately run the exact same scan again. | Second scan resolves in < 500ms returning cached results without hitting upstream APIs. | Pending |
| **TC-PERF-02** | Upstream Request Throttling | Medium | Multi-scan in flight | 1. Trigger consecutive security scans on different subdomains. | Requests to `services.nvd.nist.gov`, `rdap.net`, and `crt.sh` observe minimum 800ms delays to prevent IP bans. | Pending |
| **TC-EDGE-01** | Cloudflare Edge Runtime Verification | Critical | Deployed on Pages | 1. Inspect response headers from `/api/scan`. | Header `Server: cloudflare` present, no `node:*` native module crashes, stream terminates cleanly. | Pending |

---

### Suite 4: Dashboard, Results & PDF Export

| Test ID | Test Title | Priority | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-UI-06** | Score Meter & Grade Display | High | Scan completed | 1. Check health score component on page. | Circular gauge displays numeric score (0-100), color matches score (green for 80+, yellow for 50-79, red for <50), letter grade visible. | Pending |
| **TC-UI-07** | Severity Filtering & Expansion | Medium | Findings present | 1. Click filter tabs: Critical, High, Medium, Low, Info.<br>2. Expand a finding card. | List filters appropriately. Finding card expands showing evidence snippet and actionable recommendation fix. | Pending |
| **TC-UI-08** | Client-Side PDF Generation & Download | Critical | Scan completed | 1. Click **Download PDF Report** button. | Browser triggers PDF file download (e.g. `KODAND-Audit-example.com.pdf`), document contains branded header, score summary, and findings tables without corruption. | Pending |
| **TC-UI-09** | Real-Time Terminal Activity Stream | Medium | Scan running | 1. Observe terminal log drawer during scan. | Log lines stream in real-time with millisecond timestamps and color-coded tags matching backend progress. | Pending |

---

### Suite 5: Privacy & Security Assurances

| Test ID | Test Title | Priority | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-PRIV-01** | Zero Server-Side Persistence | High | Scan completed | 1. Inspect backend requests.<br>2. Check for database or analytics transmissions. | No persistent user data is sent to external databases; scan state remains entirely client-side. | Pending |
| **TC-PRIV-02** | Client-Side Memory Purge | Medium | Scans in history | 1. Refresh the browser page or close tab. | Previous scan results in memory reset cleanly, respecting user anonymity. | Pending |
