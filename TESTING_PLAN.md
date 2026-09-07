# KODAND Deep-Dive Testing Plan
## Project: https://kodand.pages.dev/
## Date: 2026-09-07
## Tester: Kilo (Automated)

---

## 1. Test Objectives
- Validate that the live KODAND deployment is fully functional.
- Verify all six scan modes work end-to-end against a real target (`https://google.com`).
- Confirm SSE streaming, scoring, findings generation, and PDF readiness.
- Check Cloudflare Pages / Edge runtime compatibility of API routes.
- Automate UI flows: lock target, run scans, verify score badge, download PDF.

## 2. Test Scope
### In Scope
- API endpoint health & SSE stream validation
- All scan modes: `content`, `security`, `seo`, `performance`, `accessibility`, `full`
- UI automation: landing page, target lock, mode selection, scan execution, score display, PDF export
- Edge runtime compatibility review of `src/app/api/scan/route.ts` and `src/lib/domain-intel.ts`

### Out of Scope
- Load / stress testing
- Cross-browser visual regression
- Database persistence (localStorage only)

## 3. Test Environment
- **Live URL:** `https://kodand.pages.dev/`
- **Target:** `https://google.com`
- **Tools:** Node.js, PowerShell, Playwright (via Tabbit), static code review
- **Runtime:** Cloudflare Pages Edge Workers

## 4. Test Cases

### TC-01: API Endpoint Health
- **Precondition:** Server reachable at `https://kodand.pages.dev/api/scan`
- **Steps:**
  1. POST `{ "url": "https://example.com", "mode": "seo" }`
  2. Read SSE stream
  3. Assert first event type is `stage` with `init`
  4. Assert final event type is `complete`
  5. Assert a `result` event appears with `score`, `grade`, `findings`
- **Expected:** HTTP 200, valid SSE stream, completed scan result

### TC-02: Content Scan
- **Mode:** `content`
- **Target:** `https://google.com`
- **Expected:** Score computed, metrics present, 0+ findings, summary text, PDF ready

### TC-03: Security Scan
- **Mode:** `security`
- **Target:** `https://google.com`
- **Expected:** Header analysis, LLM content review, deep intel (WHOIS, DNS, TLS, CVE), score, findings, PDF ready

### TC-04: SEO Scan
- **Mode:** `seo`
- **Target:** `https://google.com`
- **Expected:** Meta/heading/OG checks, LLM SEO review, score, findings, PDF ready

### TC-05: Performance Scan
- **Mode:** `performance`
- **Target:** `https://google.com`
- **Expected:** Page weight metrics, render-blocking analysis, LLM performance review, score, findings, PDF ready

### TC-06: Accessibility Scan
- **Mode:** `accessibility`
- **Target:** `https://google.com`
- **Expected:** Alt text, ARIA, labels, contrast checks, LLM WCAG review, score, findings, PDF ready

### TC-07: Full 360° Scan
- **Mode:** `full`
- **Target:** `https://google.com`
- **Expected:** All five dimensions run sequentially, combined score, combined findings, PDF ready

### TC-08: Playwright UI Automation
- **Steps:**
  1. Navigate to `https://kodand.pages.dev`
  2. Enter `example.com` and click **Lock Target**
  3. Trigger **Content** scan
  4. Assert health score badge appears
  5. Click **Download PDF**
- **Expected:** UI elements visible, scan completes, score displayed, PDF download initiated

### TC-09: Edge Runtime Compatibility
- **Review Files:** `src/app/api/scan/route.ts`, `src/lib/domain-intel.ts`
- **Checks:**
  - No `node:dns`, `node:tls`, `node:fs` imports
  - All network I/O via standard `fetch` or Web APIs
  - No native bindings or OS-level sockets
  - SSE uses `ReadableStream` / `Response`
- **Expected:** Pass — no incompatible Node.js APIs

## 5. Pass/Fail Criteria
- **PASS:** All TC-01 through TC-07 return HTTP 200 with valid SSE, completed results, and non-zero findings or valid empty results. TC-08 UI steps succeed. TC-09 code review finds no incompatible APIs.
- **FAIL:** Any TC returns 5xx, stream error, missing result, UI assertion failure, or incompatible Node.js API usage.

## 6. Deliverables
- `TESTING_PLAN.md` — this document
- `scripts/test-live-api.mjs` — Node.js SSE test script
- `tests/kodand.spec.ts` — Playwright automation test
- `reports/edge-compatibility-review.md` — code review notes
- `reports/test-report-2026-09-07.md` — final test report with evidence
