# KODAND Automated Test Report

> **Target Platform:** `http://localhost:3000`  
> **Generated At:** Mon, 07 Sep 2026 23:23:04 GMT  
> **Overall Result:** ✅ ALL TESTS PASSED (100%)  

## Summary Statistics

| Metric | Value |
|---|---|
| **Total Test Cases** | `30` |
| **Passed** | `30` |
| **Failed** | `0` |
| **Pass Rate** | **100%** |
| **Cumulative Latency** | `15.78s` |

## Detailed Test Results Matrix

| Test ID | Test Name | Status | Latency | Details |
|---|---|---|---|---|
| `TC-EDGE-01` | Cloudflare Edge Runtime Verification | **PASS** | `94ms` | Status: 200, Server: local |
| `TC-API-07` | Invalid Scan Payload Handling (Missing URL) | **PASS** | `325ms` | Expected HTTP 400, Received: HTTP 400 |
| `TC-API-01` | Content Optimizer Scan Mode | **PASS** | `361ms` | Score: 100, Events: 19 |
| `TC-API-02` | Security & Intel Scan Mode (DNS/TLS/WHOIS/CVE) | **PASS** | `1753ms` | Score: 64, Intel Present: true |
| `TC-API-03` | SEO Diagnostic Scan Mode | **PASS** | `112ms` | Score: 72.5, Findings: 6 |
| `TC-API-04` | Performance Benchmark Scan Mode | **PASS** | `100ms` | Score: 98 |
| `TC-API-05` | Accessibility Audit Scan Mode | **PASS** | `107ms` | Score: 100 |
| `TC-PERF-01` | In-Memory 5-Min Scan Cache (Immediate Repeat) | **PASS** | `50ms` | Resolved in 50ms (Expected < 1000ms for cache hit) |
| `TC-API-06` | Full 360° Multi-Dimension Scan Aggregation | **PASS** | `1309ms` | Overall Score: 84.53/100, Grade: B |
| `TC-MKT-01` | Google Autocomplete Keyword Suggestions | **PASS** | `649ms` | Received: 102 keyword suggestions |
| `TC-MKT-02` | Digital Marketing Meta Tag Generator | **PASS** | `140ms` | Generated Title: "Example Domain — Official Website & Digi..." |
| `TC-MKT-03` | Backlink Profile & Link Diversity Check | **PASS** | `112ms` | Est. Backlinks: 1250000, Quality: high |
| `TC-SAAS-01` | SaaS Pricing Page & Subscription Tiers Check | **PASS** | `374ms` | HTTP 200, contains Agency Pro & White-Label tiers |
| `TC-SAAS-02` | Competitor Side-by-Side Audit Page Check | **PASS** | `375ms` | HTTP 200, loaded competitor audit workspace |
| `TC-ADMIN-01` | Admin Dashboard Security & PIN Protection | **PASS** | `45ms` | Expected HTTP 401 Unauthorized, Received: HTTP 401 |
| `TC-ADMIN-02` | Live User Monitoring & Scan Telemetry Feed | **PASS** | `42ms` | Total Scans: 148, Unique Domains: 8, Events: 4 |
| `TC-UPI-01` | India UPI Payment Gateway & INR Currency Switcher | **PASS** | `269ms` | HTTP 200, contains UPI & INR currency options |
| `TC-AUTH-01` | User Registration & Account Creation | **PASS** | `52ms` | Created: test_1788823375289@example.com, Tier: free |
| `TC-AUTH-02` | User & Admin Authentication Login | **PASS** | `187ms` | Authenticated Admin: admin@kodand.com (admin) |
| `TC-AUTH-03` | Authenticated Profile & Session Verification | **PASS** | `152ms` | Verified Profile: Automated Tester (test_1788823375289@example.com) |
| `TC-ADMIN-USERS` | Admin User Monitoring & Subscription Tier Control | **PASS** | `258ms` | Total Users Monitored: 9, Tier Modification: SUCCESS |
| `TC-DEVICE-TELEMETRY` | Comprehensive Device Telemetry & Hardware Fingerprinting | **PASS** | `116ms` | Registered Device: Google Chrome on Windows 11 (Desktop), Resolution: 2560x1440 (1.0x DPR) |
| `TC-ADMIN-EXPORT` | Admin Complete Data Export (CSV & JSON Users/Devices) | **PASS** | `332ms` | Users CSV lines: 10, Devices CSV lines: 14 |
| `TC-AUTH-GOOGLE` | Google Sign-In OAuth Redirection & Session Gateway | **PASS** | `159ms` | HTTP Status: 307, Location: http://localhost:3000/account |
| `TC-AUTH-PWD-CHG` | User In-App Password Change with Current Password Verification | **PASS** | `140ms` | Password Update: SUCCESS |
| `TC-AUTH-PWD-RST` | Cryptographic Token-Based Forgot & Reset Password Flow | **PASS** | `287ms` | Token Generated: true, Password Reset Verified: YES |
| `TC-DEEP-HARDWARE` | Deep GPU Graphics, Canvas, Audio & AdBlock Telemetry | **PASS** | `45ms` | GPU: ANGLE (NVIDIA, NVIDIA GeForce ..., Canvas: cvs-kodand-789a |
| `TC-UI-PAGES` | Frontend Application Core Routes & Page Availability | **PASS** | `2521ms` | All 12 routes returned HTTP 200: /, /pricing, /compare, /keywords, /marketing, /backlinks, /login, /signup, /forgot-password, /reset-password, /account, /admin |
| `TC-AUTH-SUSPEND` | User Account Suspension & Access Block Enforcement | **PASS** | `879ms` | Suspension Block Verified: HTTP 401 (Suspended) |
| `TC-D1-DATABASE` | Cloudflare D1 Remote Database Schema & Table Verification | **PASS** | `4434ms` | Verified D1 Database ca1b0b5e-f964-4a8a-bdf9-ec94bab27c0e (8 Active Tables) |
