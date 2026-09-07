# KODAND Deep-Dive Test Report
## Project: https://kodand.pages.dev/
## Date: 2026-09-07
## Tester: Kilo (Automated)

---

## Executive Summary

| Test Area | Environment | Result |
|---|---|---|
| API Endpoint Health & SSE | Local (`localhost:3000`) | **PASS** — All 6 modes complete successfully |
| API Endpoint Health & SSE | Live (`kodand.pages.dev`) | **FAIL** — All 6 modes return HTTP 500 |
| Playwright UI Automation | Live (`kodand.pages.dev`) | **PARTIAL** — 2/4 tests pass; scan execution blocked by API failure |
| Edge Runtime Compatibility | Code review | **PASS** — No Node.js native bindings found |

**Critical Finding:** The live deployment's `/api/scan` endpoint is returning `500 Internal Server Error` for all scan modes. This blocks all scan functionality on the live site. The same code works correctly on localhost, indicating a deployment/runtime configuration issue on Cloudflare Pages.

---

## 1. Test 1: API Endpoint Health & SSE

### 1.1 Local Environment (`localhost:3000`)

| Mode | HTTP Status | Events | Result Event | Score | Grade | Status |
|---|---|---|---|---|---|---|
| content | 200 | 19 | Yes | 100 | A | PASS |
| security | 200 | 31 | Yes | 59 | D | PASS |
| seo | 200 | 20 | Yes | 39 | F | PASS |
| performance | 200 | 20 | Yes | 86 | B | PASS |
| accessibility | 200 | 20 | Yes | 90 | A | PASS |
| full | 200 | 54 | Yes | 72 | C | PASS |

**Evidence:** All modes streamed SSE events (`init`, `fetch`, `parse`, dimension-specific stages, `score`, `finalize`, `complete`) and returned valid `result` payloads with `score`, `grade`, `findings`, and `summary`.

### 1.2 Live Environment (`kodand.pages.dev`)

| Mode | HTTP Status | Body | Status |
|---|---|---|---|
| content | 500 | Internal Server Error | FAIL |
| security | 500 | Internal Server Error | FAIL |
| seo | 500 | Internal Server Error | FAIL |
| performance | 500 | Internal Server Error | FAIL |
| accessibility | 500 | Internal Server Error | FAIL |
| full | 500 | Internal Server Error | FAIL |

**Evidence:** `node scripts/test-live-api.mjs` confirmed all six POST requests to `/api/scan` return HTTP 500 with no SSE stream.

### 1.3 Root Cause Analysis

The local server (`next start`) runs on Node.js with full runtime support. The Cloudflare Pages deployment runs on Edge Workers. While the code is Edge-compatible (see Test 3), the 500 errors suggest:

1. **Missing environment/runtime config:** The `z-ai-web-dev-sdk` or some dependency may require initialization that fails in the Edge runtime.
2. **Unhandled exception in API route:** An uncaught error in `src/app/api/scan/route.ts` or `src/lib/domain-intel.ts` causes the Edge function to crash.
3. **Deployment build issue:** The Cloudflare Pages build may not be including all necessary dependencies or transpiling correctly.

---

## 2. Test 2: Playwright UI Automation

### Test Results

| Test | Description | Result | Duration |
|---|---|---|---|
| TC-UI-01 | Landing Page Load & Assets | PASS | 1.1s |
| TC-UI-02 | Target Normalization & Lock | PASS | 672ms |
| TC-UI-03 | Content Scan Execution & Terminal Log | FAIL | 5.7s |
| TC-UI-08 | PDF Download Action Readiness | FAIL | 30.1s |

### Details

**TC-UI-01 PASS:** Title contains "KODAND", logo image visible, "No sign-up · Anonymous" text visible.

**TC-UI-02 PASS:** Input field visible, accepts "example.com", "Lock Target" button clickable, domain badge appears after locking.

**TC-UI-03 FAIL:** After locking target and clicking the Content mode button in the dashboard, the test expected scanning indicators to appear. The scan enters the `scanning` state in the UI, but the backend API returns 500, causing the scan to fail silently. No terminal logs or progress events are rendered.

**TC-UI-08 FAIL:** The PDF button is only rendered after a successful scan completes (`focusedCompleted` is truthy). Since the API returns 500, the scan never completes and the PDF button never appears.

### Screenshots / Evidence
- Test artifacts: `test-results/tests-kodand-KODAND-End-to-9c2fb-Scan-Execution-Terminal-Log/`
- Test artifacts: `test-results/tests-kodand-KODAND-End-to-ae69d-F-Download-Action-Readiness/`

---

## 3. Test 3: Edge Runtime & Cloudflare Compatibility

### Review Scope
- `src/app/api/scan/route.ts`
- `src/lib/domain-intel.ts`
- `src/lib/scan-cache.ts`

### Findings

| File | Node.js Import | Incompatible API | Status |
|---|---|---|---|
| `src/app/api/scan/route.ts` | None | None | PASS |
| `src/lib/domain-intel.ts` | None | None | PASS |
| `src/lib/scan-cache.ts` | None | None | PASS |

### Network Calls
All external network calls use standard `fetch` with `AbortSignal` timeouts:
- NVD CVE API: `fetch('https://services.nvd.nist.gov/...')`
- RDAP WHOIS: `fetch('https://rdap.net/domain/...')`
- Cloudflare DNS DoH: `fetch('https://cloudflare-dns.com/dns-query?...')`
- crt.sh CT logs: `fetch('https://crt.sh/...')`

### SSE Implementation
Uses `ReadableStreamDefaultController` and `TextEncoder` — fully supported in Edge runtime.

### Rate Limiting
Uses in-memory `Map` and `setTimeout` promises — no `node:timers` or `node:events` required.

### Conclusion
The codebase is Edge-compatible. The 500 errors on the live deployment are **not** caused by Node.js API misuse. They are likely caused by:
- A runtime exception in the Edge function
- Missing build artifacts
- An issue with `z-ai-web-dev-sdk` initialization in Edge runtime

---

## 4. Recommendations

### Immediate (Fix Live Site)
1. **Check Cloudflare Pages function logs:** Go to Cloudflare Dashboard → Pages → kodand → Functions → View logs. Identify the exact exception causing HTTP 500.
2. **Add error boundaries:** Wrap the API route in try/catch and return the error message in the SSE stream for easier debugging.
3. **Verify build output:** Ensure `@cloudflare/next-on-pages` or the Pages adapter is producing a correct build with all dependencies.

### Short-term
1. **Add health check endpoint:** Create `/api/health` that returns 200 with no dependencies, to verify deployment without triggering scans.
2. **Add request validation:** Return 400 with clear messages for invalid input instead of 500.
3. **Log unhandled rejections:** Ensure all `async` functions in the API route have top-level try/catch.

### Long-term
1. **Move API to separate Node.js host:** If Edge runtime continues to cause issues, deploy the `/api/scan` endpoint on Vercel/Railway and point the frontend to it.
2. **Add E2E tests to CI:** Run the Playwright suite on every deploy to catch regressions.

---

## 5. Test Artifacts

| Artifact | Path |
|---|---|
| Testing Plan | `TESTING_PLAN.md` |
| Live API Test Script | `scripts/test-live-api.mjs` |
| Playwright Test Suite | `tests/kodand.spec.ts` |
| Edge Compatibility Review | `reports/edge-compatibility-review.md` |
| Playwright HTML Report | `playwright-report/index.html` (run `bunx playwright show-report`) |
| Test Results | `test-results/` |

---

## 6. Appendix: Local API Test Logs

### Content Scan (localhost)
```
HTTP 200. 89,177 bytes in 318ms.
Title: "Google". 24 words visible.
HTTPS: yes. Mixed content: detected.
Score computed: 100/100 (Grade A).
Content Optimizer scan complete in 0.4s.
```

### Security Scan (localhost)
```
HTTP 200. 88,954 bytes in 300ms.
Headers inspected: 7 issue(s) across 15 security headers.
Security content review complete: 0 finding(s).
NVD CVE scan: 0 product(s) queried, 0 matching CVE(s) found.
WHOIS: registrar MarkMonitor Inc., registered 9/15/1997, expires 9/14/2028, 4 nameservers.
DNS: 1 A record(s), 1 AAAA, 1 MX, 4 NS, 17 TXT.
TLS cert: valid, issuer Cloudflare / Global CDN, 1 SAN(s), CA-signed.
Score computed: 59/100 (Grade D).
Security Deep Scan scan complete in 9.2s.
```

### Full 360° Scan (localhost)
```
HTTP 200. 89,054 bytes in 215ms.
Content review complete: 0 finding(s).
Headless inspected: 7 issue(s).
Security content review complete: 0 finding(s).
SEO review complete: 10 finding(s).
Performance review complete: 4 finding(s).
Accessibility review complete: 1 finding(s).
Score computed: 72/100 (Grade C).
Full 360° Audit scan complete in 9.1s.
```
