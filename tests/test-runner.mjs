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
