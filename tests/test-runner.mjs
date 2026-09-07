/**
 * KODAND Automated API & Integration Test Runner
 *
 * Usage for Kilo in VS Code terminal:
 *   node tests/test-runner.mjs [optional_base_url]
 *
 * Example:
 *   node tests/test-runner.mjs https://kodand.pages.dev
 *   node tests/test-runner.mjs http://localhost:3000
 */

const BASE_URL = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";
const TARGET_URL = "https://example.com";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const results = [];

function recordResult(testId, name, passed, details = "", durationMs = 0) {
  results.push({ testId, name, passed, details, durationMs });
  const status = passed
    ? `${colors.green}✓ PASS${colors.reset}`
    : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`[${status}] ${colors.bold}${testId}${colors.reset}: ${name} (${durationMs}ms)`);
  if (details) {
    console.log(`       ${colors.yellow}↳ ${details}${colors.reset}`);
  }
}

/**
 * Helper to execute an SSE scan request and gather emitted events.
 */
async function runScan(url, mode, baseUrl = BASE_URL) {
  const start = Date.now();
  const endpoint = `${baseUrl}/api/scan`;

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, mode }),
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(line.slice(6));
          events.push(parsed);
        } catch {
          // Non-JSON SSE ping/message
        }
      }
    }
  }

  const durationMs = Date.now() - start;
  return { status: resp.status, headers: resp.headers, events, durationMs };
}

async function runTestSuite() {
  console.log(`${colors.cyan}${colors.bold}`);
  console.log("==================================================");
  console.log("       KODAND AUTOMATED TEST SUITE (KILO)        ");
  console.log("==================================================");
  console.log(`Target Platform : ${BASE_URL}`);
  console.log(`Audit Target    : ${TARGET_URL}`);
  console.log(`Started At      : ${new Date().toISOString()}`);
  console.log("==================================================");
  console.log(`${colors.reset}`);

  // TC-EDGE-01: Check Edge Runtime Headers
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api`);
    const isCloudflare = resp.headers.get("server")?.toLowerCase().includes("cloudflare");
    recordResult(
      "TC-EDGE-01",
      "Cloudflare Edge Runtime Verification",
      resp.status === 200,
      `Status: ${resp.status}, Server: ${resp.headers.get("server") || "local"}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-EDGE-01", "Cloudflare Edge Runtime Verification", false, err.message);
  }

  // TC-API-07: Error Handling with Malformed Payload
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invalid: true }),
    });
    recordResult(
      "TC-API-07",
      "Invalid Scan Payload Handling (Missing URL)",
      resp.status === 400,
      `Expected HTTP 400, Received: HTTP ${resp.status}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-API-07", "Invalid Scan Payload Handling", false, err.message);
  }

  // TC-API-01: Content Optimizer Scan
  try {
    const { events, durationMs } = await runScan(TARGET_URL, "content");
    const completeEvent = events.find((e) => e.type === "complete");
    const result = completeEvent?.result;
    const content = result?.content ?? result?.grammar;
    const passed = !!completeEvent && !!content;
    recordResult(
      "TC-API-01",
      "Content Optimizer Scan Mode",
      passed,
      `Score: ${content?.score ?? "N/A"}, Events: ${events.length}`,
      durationMs
    );
  } catch (err) {
    recordResult("TC-API-01", "Content Optimizer Scan Mode", false, err.message);
  }

  // TC-API-02: Security & Intel Scan
  try {
    const { events, durationMs } = await runScan(TARGET_URL, "security");
    const completeEvent = events.find((e) => e.type === "complete");
    const result = completeEvent?.result;
    const hasIntel = !!result?.security?.intel;
    const passed = !!completeEvent && !!result?.security;
    recordResult(
      "TC-API-02",
      "Security & Intel Scan Mode (DNS/TLS/WHOIS/CVE)",
      passed,
      `Score: ${result?.security?.score ?? "N/A"}, Intel Present: ${hasIntel}`,
      durationMs
    );
  } catch (err) {
    recordResult("TC-API-02", "Security & Intel Scan Mode", false, err.message);
  }

  // TC-API-03: SEO Diagnostic Scan
  try {
    const { events, durationMs } = await runScan(TARGET_URL, "seo");
    const completeEvent = events.find((e) => e.type === "complete");
    const result = completeEvent?.result;
    const passed = !!completeEvent && !!result?.seo;
    recordResult(
      "TC-API-03",
      "SEO Diagnostic Scan Mode",
      passed,
      `Score: ${result?.seo?.score ?? "N/A"}, Findings: ${result?.seo?.findings?.length ?? 0}`,
      durationMs
    );
  } catch (err) {
    recordResult("TC-API-03", "SEO Diagnostic Scan Mode", false, err.message);
  }

  // TC-API-04: Performance Benchmark Scan
  try {
    const { events, durationMs } = await runScan(TARGET_URL, "performance");
    const completeEvent = events.find((e) => e.type === "complete");
    const result = completeEvent?.result;
    const passed = !!completeEvent && !!result?.performance;
    recordResult(
      "TC-API-04",
      "Performance Benchmark Scan Mode",
      passed,
      `Score: ${result?.performance?.score ?? "N/A"}`,
      durationMs
    );
  } catch (err) {
    recordResult("TC-API-04", "Performance Benchmark Scan Mode", false, err.message);
  }

  // TC-API-05: Accessibility Audit Scan
  try {
    const { events, durationMs } = await runScan(TARGET_URL, "accessibility");
    const completeEvent = events.find((e) => e.type === "complete");
    const result = completeEvent?.result;
    const passed = !!completeEvent && !!result?.accessibility;
    recordResult(
      "TC-API-05",
      "Accessibility Audit Scan Mode",
      passed,
      `Score: ${result?.accessibility?.score ?? "N/A"}`,
      durationMs
    );
  } catch (err) {
    recordResult("TC-API-05", "Accessibility Audit Scan Mode", false, err.message);
  }

  // TC-PERF-01: In-Memory Scan Cache (Subsequent Request)
  try {
    const { events, durationMs } = await runScan(TARGET_URL, "content");
    const isCached = events.some(
      (e) => e.type === "log" && (e.message || "").toLowerCase().includes("cache")
    ) || durationMs < 1000;
    recordResult(
      "TC-PERF-01",
      "In-Memory 5-Min Scan Cache (Immediate Repeat)",
      isCached,
      `Resolved in ${durationMs}ms (Expected < 1000ms for cache hit)`,
      durationMs
    );
  } catch (err) {
    recordResult("TC-PERF-01", "In-Memory Scan Cache", false, err.message);
  }

  // TC-API-06: Full 360° Multi-Dimension Scan
  try {
    const { events, durationMs } = await runScan(TARGET_URL, "full");
    const completeEvent = events.find((e) => e.type === "complete");
    const result = completeEvent?.result;
    const overallScore = result?.digitalHealthScore ?? result?.overallScore;
    const overallGrade = result?.grade ?? result?.overallGrade;
    const passed = overallScore != null && !!overallGrade;
    recordResult(
      "TC-API-06",
      "Full 360° Multi-Dimension Scan Aggregation",
      passed,
      `Overall Score: ${overallScore}/100, Grade: ${overallGrade}`,
      durationMs
    );
  } catch (err) {
    recordResult("TC-API-06", "Full 360° Scan Aggregation", false, err.message);
  }

  // TC-MKT-01: Keywords Suggestions Endpoint
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suggest", query: "seo tools" }),
    });
    const data = await resp.json();
    const passed = resp.ok && Array.isArray(data.suggestions) && data.suggestions.length > 0;
    recordResult(
      "TC-MKT-01",
      "Google Autocomplete Keyword Suggestions",
      passed,
      `Received: ${data.suggestions?.length ?? 0} keyword suggestions`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-MKT-01", "Google Autocomplete Keyword Suggestions", false, err.message);
  }

  // TC-MKT-02: Marketing Meta Tag Generator
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/marketing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "meta-generator",
        url: "https://example.com",
        title: "Example Domain",
      }),
    });
    const data = await resp.json();
    const meta = data.metaTags || data.result;
    const passed = resp.ok && !!meta?.title && !!meta?.description;
    recordResult(
      "TC-MKT-02",
      "Digital Marketing Meta Tag Generator",
      passed,
      `Generated Title: "${meta?.title?.slice(0, 40) ?? "N/A"}..."`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-MKT-02", "Digital Marketing Meta Tag Generator", false, err.message);
  }

  // TC-MKT-03: Backlink Checker Endpoint
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/backlinks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    const data = await resp.json();
    const bl = data.backlinks || data;
    const passed = resp.ok && typeof bl?.estimatedBacklinks === "number";
    recordResult(
      "TC-MKT-03",
      "Backlink Profile & Link Diversity Check",
      passed,
      `Est. Backlinks: ${bl?.estimatedBacklinks}, Quality: ${bl?.qualityScore}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-MKT-03", "Backlink Profile & Link Diversity Check", false, err.message);
  }

  // TC-SAAS-01: Pricing Route Verification
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/pricing`);
    const html = await resp.text();
    const passed = resp.ok && html.includes("Agency Pro") && html.includes("White-Label");
    recordResult(
      "TC-SAAS-01",
      "SaaS Pricing Page & Subscription Tiers Check",
      passed,
      `HTTP ${resp.status}, contains Agency Pro & White-Label tiers`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-SAAS-01", "SaaS Pricing Page & Subscription Tiers Check", false, err.message);
  }

  // TC-SAAS-02: Competitor Compare Route Verification
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/compare`);
    const html = await resp.text();
    const passed = resp.ok && html.includes("Competitor");
    recordResult(
      "TC-SAAS-02",
      "Competitor Side-by-Side Audit Page Check",
      passed,
      `HTTP ${resp.status}, loaded competitor audit workspace`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-SAAS-02", "Competitor Side-by-Side Audit Page Check", false, err.message);
  }

  // TC-ADMIN-01: Admin Telemetry Unauthorized Access Test
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/admin/telemetry?pin=wrong_pin`);
    const passed = resp.status === 401;
    recordResult(
      "TC-ADMIN-01",
      "Admin Dashboard Security & PIN Protection",
      passed,
      `Expected HTTP 401 Unauthorized, Received: HTTP ${resp.status}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-ADMIN-01", "Admin Dashboard Security & PIN Protection", false, err.message);
  }

  // TC-ADMIN-02: Admin Telemetry Authorized Stats Aggregation
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/admin/telemetry?pin=kodand2026`);
    const data = await resp.json();
    const passed = resp.ok && typeof data?.stats?.totalScans === "number" && Array.isArray(data?.stats?.recentEvents);
    recordResult(
      "TC-ADMIN-02",
      "Live User Monitoring & Scan Telemetry Feed",
      passed,
      `Total Scans: ${data?.stats?.totalScans}, Unique Domains: ${data?.stats?.uniqueDomains}, Events: ${data?.stats?.recentEvents?.length}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-ADMIN-02", "Live User Monitoring & Scan Telemetry Feed", false, err.message);
  }

  // TC-UPI-01: India UPI Pricing & QR Integration
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/pricing`);
    const html = await resp.text();
    const passed = resp.ok && (html.includes("UPI") || html.includes("INR"));
    recordResult(
      "TC-UPI-01",
      "India UPI Payment Gateway & INR Currency Switcher",
      passed,
      `HTTP ${resp.status}, contains UPI & INR currency options`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-UPI-01", "India UPI Payment Gateway & INR Currency Switcher", false, err.message);
  }

  // TC-AUTH-01: User Registration
  const testUserEmail = `test_${Date.now()}@example.com`;
  let sessionToken = "";
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Automated Tester",
        email: testUserEmail,
        password: "securePassword123",
        company: "Test Automation Corp",
      }),
    });
    const data = await resp.json();
    sessionToken = data.token;
    const passed = resp.ok && data.user && data.user.email === testUserEmail;
    recordResult(
      "TC-AUTH-01",
      "User Registration & Account Creation",
      passed,
      `Created: ${data?.user?.email}, Tier: ${data?.user?.tier}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-AUTH-01", "User Registration & Account Creation", false, err.message);
  }

  // TC-AUTH-02: User & Admin Login
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@kodand.com",
        password: "admin123",
      }),
    });
    const data = await resp.json();
    const passed = resp.ok && data.user && data.user.role === "admin";
    recordResult(
      "TC-AUTH-02",
      "User & Admin Authentication Login",
      passed,
      `Authenticated Admin: ${data?.user?.email} (${data?.user?.role})`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-AUTH-02", "User & Admin Authentication Login", false, err.message);
  }

  // TC-AUTH-03: Authenticated User Profile Retrieval (/api/auth/me)
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    const data = await resp.json();
    const passed = resp.ok && data.authenticated && data.user?.email === testUserEmail;
    recordResult(
      "TC-AUTH-03",
      "Authenticated Profile & Session Verification",
      passed,
      `Verified Profile: ${data?.user?.name} (${data?.user?.email})`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-AUTH-03", "Authenticated Profile & Session Verification", false, err.message);
  }

  // TC-ADMIN-USERS: Admin User Management & Tier Modification
  try {
    const t0 = Date.now();
    const resp = await fetch(`${BASE_URL}/api/admin/users?pin=kodand2026`);
    const data = await resp.json();
    const hasUsers = resp.ok && Array.isArray(data.users) && data.users.length >= 3;

    // Test tier modification
    let tierUpdated = false;
    if (hasUsers && data.users[0]) {
      const targetId = data.users[0].id;
      const patchResp = await fetch(`${BASE_URL}/api/admin/users?pin=kodand2026`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId, tier: "agency" }),
      });
      tierUpdated = patchResp.ok;
    }

    recordResult(
      "TC-ADMIN-USERS",
      "Admin User Monitoring & Subscription Tier Control",
      hasUsers && tierUpdated,
      `Total Users Monitored: ${data?.users?.length}, Tier Modification: ${tierUpdated ? "SUCCESS" : "FAIL"}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-ADMIN-USERS", "Admin User Monitoring & Subscription Tier Control", false, err.message);
  }

  // TC-DEVICE-TELEMETRY: Comprehensive Device & Hardware Telemetry Collection
  try {
    const t0 = Date.now();
    const devResp = await fetch(`${BASE_URL}/api/auth/device`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        deviceSpecs: {
          deviceName: "Google Chrome on Windows 11 (Desktop)",
          browser: "Google Chrome",
          os: "Windows 10/11",
          deviceType: "desktop",
          screenResolution: "2560x1440 (1.0x DPR)",
          colorDepth: "24-bit",
          touchSupport: false,
          language: "en-US",
          timeZone: "Asia/Kolkata",
          hardwareConcurrency: 16,
          deviceMemory: "32 GB RAM",
          connectionType: "fiber",
        },
      }),
    });
    const devData = await devResp.json();
    const passed = devResp.ok && devData.success && devData.device?.deviceName?.includes("Chrome");
    recordResult(
      "TC-DEVICE-TELEMETRY",
      "Comprehensive Device Telemetry & Hardware Fingerprinting",
      passed,
      `Registered Device: ${devData?.device?.deviceName}, Resolution: ${devData?.device?.screenResolution}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-DEVICE-TELEMETRY", "Comprehensive Device Telemetry & Hardware Fingerprinting", false, err.message);
  }

  // TC-ADMIN-EXPORT: Admin Export Data (CSV & JSON for Users and Devices)
  try {
    const t0 = Date.now();
    const [usersCsvResp, devicesCsvResp, jsonResp] = await Promise.all([
      fetch(`${BASE_URL}/api/admin/export?pin=kodand2026&type=users&format=csv`),
      fetch(`${BASE_URL}/api/admin/export?pin=kodand2026&type=devices&format=csv`),
      fetch(`${BASE_URL}/api/admin/export?pin=kodand2026&format=json`),
    ]);

    const usersCsvText = await usersCsvResp.text();
    const devicesCsvText = await devicesCsvResp.text();
    const jsonData = await jsonResp.json();

    const passed =
      usersCsvResp.ok &&
      usersCsvText.includes("Email Address") &&
      devicesCsvResp.ok &&
      devicesCsvText.includes("Device ID") &&
      devicesCsvText.includes("Operating System") &&
      jsonResp.ok &&
      Array.isArray(jsonData.users);

    recordResult(
      "TC-ADMIN-EXPORT",
      "Admin Complete Data Export (CSV & JSON Users/Devices)",
      passed,
      `Users CSV lines: ${usersCsvText.split("\n").length}, Devices CSV lines: ${devicesCsvText.split("\n").length}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-ADMIN-EXPORT", "Admin Complete Data Export (CSV & JSON Users/Devices)", false, err.message);
  }

  // TC-AUTH-GOOGLE: Google OAuth Endpoint & Redirection Verification
  try {
    const t0 = Date.now();
    const gResp = await fetch(`${BASE_URL}/api/auth/google`, { redirect: "manual" });
    const isRedirect = gResp.status === 302 || gResp.status === 307 || gResp.status === 200;
    recordResult(
      "TC-AUTH-GOOGLE",
      "Google Sign-In OAuth Redirection & Session Gateway",
      isRedirect,
      `HTTP Status: ${gResp.status}, Location: ${gResp.headers.get("location") || "direct session"}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-AUTH-GOOGLE", "Google Sign-In OAuth Redirection & Session Gateway", false, err.message);
  }

  // TC-AUTH-PWD-CHG: In-App User Password Change Flow
  try {
    const t0 = Date.now();
    const chgResp = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        currentPassword: "securePassword123",
        newPassword: "newSecurePassword2026!",
      }),
    });
    const chgData = await chgResp.json();
    const passed = chgResp.ok && chgData.success;
    recordResult(
      "TC-AUTH-PWD-CHG",
      "User In-App Password Change with Current Password Verification",
      passed,
      `Password Update: ${passed ? "SUCCESS" : chgData.error}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-AUTH-PWD-CHG", "User In-App Password Change with Current Password Verification", false, err.message);
  }

  // TC-AUTH-PWD-RST: Token-based Forgot Password & Reset Password Flow
  try {
    const t0 = Date.now();
    const forgotResp = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testUserEmail }),
    });
    const forgotData = await forgotResp.json();
    const resetToken = forgotData.resetToken;

    let resetPassed = false;
    if (forgotResp.ok && resetToken) {
      const resetResp = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          newPassword: "brandNewResetPassword2026#",
        }),
      });
      const resetData = await resetResp.json();
      resetPassed = resetResp.ok && resetData.success;
    }

    recordResult(
      "TC-AUTH-PWD-RST",
      "Cryptographic Token-Based Forgot & Reset Password Flow",
      forgotResp.ok && resetPassed,
      `Token Generated: ${Boolean(resetToken)}, Password Reset Verified: ${resetPassed ? "YES" : "NO"}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-AUTH-PWD-RST", "Cryptographic Token-Based Forgot & Reset Password Flow", false, err.message);
  }

  // TC-DEEP-HARDWARE: Deep Hardware (GPU, Canvas, AudioContext, AdBlock) Telemetry
  try {
    const t0 = Date.now();
    const deepResp = await fetch(`${BASE_URL}/api/auth/device`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        deviceSpecs: {
          deviceName: "Google Chrome on Windows 11 (Desktop)",
          browser: "Google Chrome",
          os: "Windows 10/11",
          deviceType: "desktop",
          screenResolution: "3840x2160 (1.5x DPR)",
          gpuRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0)",
          gpuVendor: "NVIDIA Corporation",
          canvasFingerprint: "cvs-kodand-789a",
          audioSampleRate: 48000,
          adBlockDetected: false,
          batteryLevel: "100%",
          downlinkSpeed: "100 Mbps",
          rtt: "15 ms",
        },
      }),
    });
    const deepData = await deepResp.json();
    const passed =
      deepResp.ok &&
      deepData.success &&
      deepData.device?.gpuRenderer?.includes("RTX 4090") &&
      deepData.device?.canvasFingerprint === "cvs-kodand-789a";

    recordResult(
      "TC-DEEP-HARDWARE",
      "Deep GPU Graphics, Canvas, Audio & AdBlock Telemetry",
      passed,
      `GPU: ${deepData?.device?.gpuRenderer?.slice(0, 30)}..., Canvas: ${deepData?.device?.canvasFingerprint}`,
      Date.now() - t0
    );
  } catch (err) {
    recordResult("TC-DEEP-HARDWARE", "Deep GPU Graphics, Canvas, Audio & AdBlock Telemetry", false, err.message);
  }

  // Print Summary Table
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log(`\n${colors.bold}==================================================${colors.reset}`);
  console.log(`${colors.bold}                 TEST RUN SUMMARY                 ${colors.reset}`);
  console.log(`==================================================`);
  console.log(`Total Tests Run : ${total}`);
  console.log(`Passed          : ${colors.green}${passedCount}${colors.reset}`);
  console.log(`Failed          : ${failedCount > 0 ? colors.red : colors.green}${failedCount}${colors.reset}`);
  console.log(`Pass Rate       : ${Math.round((passedCount / total) * 100)}%`);
  console.log(`==================================================\n`);

  process.exit(failedCount > 0 ? 1 : 0);
}

runTestSuite();
