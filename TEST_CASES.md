# KODAND — Comprehensive Test Specification & Test Cases
> **Target Environment:** `https://kodand.pages.dev` (or local `http://localhost:3000`)  
> **Audience:** Kilo AI / Automated Testing Suite in VS Code & CI/CD  
> **Status:** Active & Maintained (30 Verified Test Cases)

---

## 📋 Execution Guide for Kilo in VS Code

1. **Automated API & Integration Tests (Zero Dependencies, Node.js):**
   ```bash
   node tests/test-runner.mjs
   ```
   *(To test against local server: `node tests/test-runner.mjs http://localhost:3000`)*

2. **Automated End-to-End Browser Tests (Playwright):**
   ```bash
   npx playwright test tests/kodand.spec.ts
   ```

3. **Cloudflare D1 Database Remote Verification:**
   ```bash
   npx wrangler d1 execute kodand --remote --command="SELECT COUNT(*) FROM user;"
   ```

---

## 🧪 Detailed Test Cases Matrix

### Suite 1: Cloudflare Edge Runtime & Base Validation

| Test ID | Test Title | Priority | Preconditions | Request Payload / Steps | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-EDGE-01** | Cloudflare Edge Runtime Verification | Critical | Server running | GET `/api` or `/api/scan` | HTTP 200/400, no `node:*` native module crashes, zero latency overhead. | **PASSED** |
| **TC-API-07** | Invalid Scan Payload Handling | High | Server running | POST `/api/scan` with `{}` (missing URL) | Responds with HTTP 400 Bad Request; does not hang or crash. | **PASSED** |

---

### Suite 2: Modular 360° Scan Engine (/api/scan)

| Test ID | Test Title | Priority | Request Payload | Verification Focus | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-API-01** | Content Optimizer Scan Mode | High | `{"url": "https://example.com", "mode": "content"}` | Content & Readability | Receives SSE stages, returns readability score, word count, reading time. | **PASSED** |
| **TC-API-02** | Security & Intel Scan Mode | Critical | `{"url": "https://example.com", "mode": "security"}` | DNS/TLS/WHOIS/CVE | Runs DNS DoH, crt.sh cert logs, WHOIS RDAP, security headers, CVE scan. | **PASSED** |
| **TC-API-03** | SEO Diagnostic Scan Mode | High | `{"url": "https://example.com", "mode": "seo"}` | Meta, OpenGraph, Structure | Checks `<title>`, meta description, canonical, OG tags, H1-H6 hierarchy. | **PASSED** |
| **TC-API-04** | Performance Benchmark Scan Mode | High | `{"url": "https://example.com", "mode": "performance"}` | Speed & Assets | Measures page weight, script blocking, compression (Gzip/Brotli), cache headers. | **PASSED** |
| **TC-API-05** | Accessibility Audit Scan Mode | High | `{"url": "https://example.com", "mode": "accessibility"}` | WCAG Compliance | Checks image `alt` text, ARIA attributes, form labels, lang attribute. | **PASSED** |
| **TC-API-06** | Full 360° Multi-Dimension Scan | Critical | `{"url": "https://example.com", "mode": "full"}` | All 5 Dimensions | Streams all stages, aggregates findings, outputs unified Digital Health Score (0-100) and letter grade. | **PASSED** |
| **TC-PERF-01** | In-Memory 5-Min Scan Cache | High | Cache active | POST repeat scan on same URL | Resolves in < 100ms returning cached results without re-fetching upstream. | **PASSED** |

---

### Suite 3: Digital Marketing & Keyword Research Engine

| Test ID | Test Title | Priority | Endpoint / Payload | Verification Focus | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-MKT-01** | Google Autocomplete Keywords | High | POST `/api/keywords` `{"seed": "security"}` | Keyword expansion | Returns 50+ categorized keywords (Questions, Commercial, Long-tail). | **PASSED** |
| **TC-MKT-02** | Digital Marketing Meta Generator | Medium | POST `/api/marketing` `{"url": "https://example.com"}` | AI-style metadata fix | Generates high-converting title, meta description, and social cards. | **PASSED** |
| **TC-MKT-03** | Backlink Profile & Authority | High | POST `/api/backlinks` `{"domain": "example.com"}` | Link profile estimation | Estimates backlink count, referring domains, domain rating, and diversity. | **PASSED** |

---

### Suite 4: SaaS Monetization & India UPI Engine

| Test ID | Test Title | Priority | Target URL / Flow | Verification Focus | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-SAAS-01** | SaaS Pricing & Currency Switcher | High | GET `/pricing` | Tier cards & INR/USD toggle | Displays Free, Starter ($29/mo), and Agency Pro ($79/mo) with currency toggle. | **PASSED** |
| **TC-SAAS-02** | Competitor Side-by-Side Audit | Medium | GET `/compare` | Dual-domain audit UI | Loads side-by-side comparison mode for two websites. | **PASSED** |
| **TC-UPI-01** | India UPI Payment & 12-Digit UTR | Critical | UPI Modal trigger | Dynamic QR & UTR validation | Generates dynamic UPI URI, displays PhonePe/GPay/Paytm intents, validates 12-digit UTR. | **PASSED** |

---

### Suite 5: Authentication & Session Management

| Test ID | Test Title | Priority | Endpoint / Action | Verification Focus | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-AUTH-01** | User Registration & Creation | Critical | POST `/api/auth/register` | Password hashing & token | Validates inputs, creates user with Web Crypto SHA-256 hash, issues JWT session. | **PASSED** |
| **TC-AUTH-02** | User & Admin Login | Critical | POST `/api/auth/login` | Session token & cookies | Authenticates user or administrator, returns safe user payload and signed cookie. | **PASSED** |
| **TC-AUTH-03** | Authenticated Profile Retrieval | High | GET `/api/auth/me` | Bearer & cookie token | Validates session token, returns user profile, tier, and connected devices. | **PASSED** |
| **TC-AUTH-GOOGLE** | Google OAuth Social Sign-In | High | `/login` & `/signup` | "Continue with Google" button | Renders official Google button, triggers OAuth redirect or safe demo fallback. | **PASSED** |
| **TC-AUTH-PWD-CHG** | User Change Password | High | POST `/api/auth/change-password` | Current pass check & update | Verifies existing password, enforces 6+ chars, securely updates hash. | **PASSED** |
| **TC-AUTH-PWD-RST** | Password Reset & Forgot Password | Critical | `/forgot-password` & `/reset-password` | Token-based reset flow | Sends/generates 15-min secure token, verifies token, updates account password. | **PASSED** |

---

### Suite 6: Deep Hardware, Device & Security Telemetry

| Test ID | Test Title | Priority | Scope | Verification Focus | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-DEVICE-TELEMETRY** | Device Hardware Telemetry | Critical | POST `/api/auth/device` | Screen, OS, Browser, CPU, RAM | Captures resolution, DPR, CPU cores, RAM, touch, language, and timezone. | **PASSED** |
| **TC-DEEP-HARDWARE** | Deep GPU & Hardware Probing | High | Client Telemetry Collector | WebGL GPU, Battery, AudioContext | Extracts GPU vendor/renderer, battery level, AudioContext hardware signature. | **PASSED** |
| **TC-SEC-TELEMETRY** | Security & Privacy Indicators | High | Client & Edge Collector | AdBlock, Incognito, WebRTC leak | Probes AdBlock presence, private browsing estimation, and DevTools detection. | **PASSED** |

---

### Suite 7: Admin Control Plane & Instant Data Exports

| Test ID | Test Title | Priority | Endpoint / Action | Verification Focus | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-ADMIN-01** | Admin Security & PIN Lock | Critical | GET `/admin` without PIN | Authentication barrier | Rejects unauthorized requests with HTTP 401 until valid PIN is provided. | **PASSED** |
| **TC-ADMIN-02** | Live User Telemetry Feed | High | GET `/api/admin/telemetry?pin=...` | Platform aggregates | Emits live scan volume, unique domains, edge latency, and country breakdown. | **PASSED** |
| **TC-ADMIN-USERS** | User & Subscription Control | Critical | PATCH `/api/admin/users?pin=...` | Tier & status update | Allows admin to switch tiers (Free/Starter/Agency) and Suspend/Reactivate users. | **PASSED** |
| **TC-ADMIN-EXPORT** | Complete Data Export (CSV & JSON) | Critical | GET `/api/admin/export?pin=...` | Users & Devices download | Generates downloadable CSV and JSON containing all users, hardware devices, and scans. | **PASSED** |

---

### Suite 8: Cloudflare D1 Database Integration

| Test ID | Test Title | Priority | Scope | Verification Focus | Expected Result | Status |
|---|---|---|---|---|---|---|
| **TC-D1-01** | Remote Cloudflare D1 Connection | Critical | `ca1b0b5e-f964-4a8a-bdf9-ec94bab27c0e` | Table presence & read latency | All 8 tables present, remote query executes in under 1ms. | **PASSED** |
| **TC-D1-02** | Better Auth D1 Tables & Migrations | High | `user`, `session`, `account` | Schema synchronization | Official Better Auth tables synced with custom user fields in D1 SQLite. | **PASSED** |

---

### Suite 9: Playwright Visual & Browser Inspection Suite

> **Runner Command:** `npm run test:visual` (or `npx playwright test tests/visual.spec.ts`)  
> **Output Artifacts:** `tests/reports/screenshots/` and `tests/reports/playwright-report/`

| Test ID | Test Title | Priority | Route / Modal | Visual Verification Focus | Expected Output Screenshot |
|---|---|---|---|---|---|
| **TC-VIS-01** | Landing Page Aesthetics & Dark Mode | High | `/` | Hero typography, CTA badges, theme contrast | `01-landing-page.png` |
| **TC-VIS-02** | Scanner Dashboard Transition | High | `/` -> Lock Target | Domain header, score badges, stage cards | `02-scanner-dashboard.png` |
| **TC-VIS-03** | India UPI Payment Modal (`atomicpixel0911-1@okhdfcbank`) | Critical | `/pricing` -> UPI Modal | Dynamic QR code, UPI ID `atomicpixel0911-1@okhdfcbank`, 12-digit UTR input | `03-upi-payment-modal.png` |
| **TC-VIS-04** | Competitor Audit Workspace | Medium | `/compare` | Dual-URL inputs, side-by-side comparison matrix | `04-compare-matrix.png` |
| **TC-VIS-05** | Auth Pages with Google Button | High | `/login` & `/signup` | Official Google "G" logo button, OR divider | `05-login-page.png` & `06-signup-page.png` |
| **TC-VIS-06** | Password Recovery Workflow | High | `/forgot-password` & `/reset-password` | Email submission card, token-based new password card | `07-forgot-password.png` & `08-reset-password.png` |
| **TC-VIS-07** | Admin Control Center & Telemetry | Critical | `/admin` (PIN unlocked) | Real-time scan graphs, user device telemetry cards | `09-admin-control-center.png` |

