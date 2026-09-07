/**
 * KODAND Performance & Speed scanner — page weight, render-blocking, images, caching, compression.
 */

import ZAI from "z-ai-web-dev-sdk";
import { PerformanceDimension, PerformanceFinding } from "@/lib/audit-types";
import {
  FetchedPage,
  makeId,
  normalizeSeverity,
  safeParseJson,
  clamp,
  sevPenalty,
} from "./types";

/* ============================================
 * Metric extraction
 * ============================================ */

export function extractPerformanceMetrics(html: string, page: FetchedPage) {
  const htmlBytes = new TextEncoder().encode(html).length;
  const inlineScripts = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const inlineScriptCount = inlineScripts.length;
  const inlineScriptBytes = inlineScripts.reduce((sum, s) => sum + new TextEncoder().encode(s).length, 0);
  const externalScripts = html.match(/<script[^>]*\bsrc=["'][^"']+["'][^>]*>/gi) || [];
  const externalScriptCount = externalScripts.length;
  const externalStylesheets = html.match(/<link[^>]*\brel=["']stylesheet["'][^>]*>/gi) || [];
  const externalStylesheetCount = externalStylesheets.length;
  const inlineStyles = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const inlineStyleBytes = inlineStyles.reduce((sum, s) => sum + new TextEncoder().encode(s).length, 0);
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgCount = imgs.length;
  const hasLazyLoading = /\bloading=["']lazy["']/i.test(html);
  const hasCompression = !!page.headersSnapshot["content-encoding"];
  const hasPreconnect = /<link[^>]*\brel=["']preconnect["']/i.test(html) || /<link[^>]*\brel=["']dns-prefetch["']/i.test(html);
  const hasAsyncDeferScripts = /<script[^>]*\b(async|defer)\b/i.test(html);

  return {
    pageSizeKb: Math.round(htmlBytes / 1024),
    htmlBytes,
    inlineScriptCount,
    externalScriptCount,
    externalStylesheetCount,
    inlineScriptBytes,
    inlineStyleBytes,
    imgCount,
    hasLazyLoading,
    hasCompression,
    hasPreconnect,
    hasAsyncDeferScripts,
  };
}

/* ============================================
 * Rule-based performance analysis
 * ============================================ */

function analyzePerformanceRuleBased(
  metrics: ReturnType<typeof extractPerformanceMetrics>
): PerformanceFinding[] {
  const findings: PerformanceFinding[] = [];
  let i = 0;

  if (metrics.pageSizeKb > 1500) {
    findings.push({ id: makeId("PERF", i++), category: "weight", severity: "high", title: `Page HTML is very large (${metrics.pageSizeKb} KB)`, detail: "The HTML document alone is over 1.5 MB. This excludes images, scripts, and stylesheets, which will push total page weight much higher. Mobile users on slow connections will see long blank screens.", evidence: `HTML size: ${metrics.pageSizeKb} KB`, fix: "Move inlined scripts/styles into external cacheable files, enable server-side caching, and audit any embedded JSON or base64 images." });
  } else if (metrics.pageSizeKb > 500) {
    findings.push({ id: makeId("PERF", i++), category: "weight", severity: "medium", title: `Page HTML is large (${metrics.pageSizeKb} KB)`, detail: "The HTML document is over 500 KB. This is heavier than the recommended 200 KB ceiling for fast first paint.", evidence: `HTML size: ${metrics.pageSizeKb} KB`, fix: "Audit inline scripts and styles; consider code-splitting or moving to external cacheable resources." });
  }

  if (metrics.inlineScriptCount > 5) {
    findings.push({ id: makeId("PERF", i++), category: "scripts", severity: "medium", title: `${metrics.inlineScriptCount} inline <script> blocks`, detail: "Inline scripts cannot be cached separately and run before the browser can parse the rest of the page, blocking first paint.", evidence: `inline script blocks: ${metrics.inlineScriptCount}`, fix: "Move inline scripts to external .js files (cacheable, parallelizable). Keep only a tiny bootstrapper inline if needed." });
  }

  if (metrics.inlineScriptBytes > 50_000) {
    findings.push({ id: makeId("PERF", i++), category: "scripts", severity: "medium", title: `Inline scripts total ${(metrics.inlineScriptBytes / 1024).toFixed(1)} KB`, detail: "Inline script bytes cannot be cached across page navigations and add to the critical-path download.", evidence: `inline script bytes: ${metrics.inlineScriptBytes}`, fix: "Move inline scripts to external files. If inline is required, defer them and keep them minimal." });
  }

  if (metrics.inlineStyleBytes > 30_000) {
    findings.push({ id: makeId("PERF", i++), category: "render-blocking", severity: "medium", title: `Inline <style> blocks total ${(metrics.inlineStyleBytes / 1024).toFixed(1)} KB`, detail: "Large inline style blocks block render. They cannot be cached and re-parsed on every navigation.", evidence: `inline style bytes: ${metrics.inlineStyleBytes}`, fix: "Move styles to external cacheable stylesheets. Keep only critical above-the-fold CSS inline (≤ 14 KB)." });
  }

  if (metrics.externalScriptCount > 10) {
    findings.push({ id: makeId("PERF", i++), category: "render-blocking", severity: "medium", title: `${metrics.externalScriptCount} external <script> tags`, detail: "A high count of external scripts increases request overhead and parsing cost. Each must be fetched, parsed, and executed.", evidence: `external scripts: ${metrics.externalScriptCount}`, fix: "Bundle scripts, defer non-critical ones, and remove unused third-party scripts." });
  }

  if (metrics.externalStylesheetCount > 5) {
    findings.push({ id: makeId("PERF", i++), category: "render-blocking", severity: "low", title: `${metrics.externalStylesheetCount} external stylesheets`, detail: "Each external stylesheet is render-blocking and adds a round-trip. Browsers cannot render until all CSS arrives.", evidence: `external stylesheets: ${metrics.externalStylesheetCount}`, fix: "Concatenate and minify CSS. Aim for 1-3 stylesheets total." });
  }

  if (metrics.imgCount > 0 && !metrics.hasLazyLoading) {
    findings.push({ id: makeId("PERF", i++), category: "images", severity: metrics.imgCount > 10 ? "medium" : "low", title: `${metrics.imgCount} <img> tag(s) without lazy loading`, detail: 'No `loading="lazy"` attribute was detected on any image. Off-screen images are fetched eagerly, wasting bandwidth and delaying first paint.', evidence: `images: ${metrics.imgCount}, loading="lazy" detected: no`, fix: 'Add `loading="lazy"` and `decoding="async"` to off-screen images. Critical above-the-fold images should be eager.' });
  }

  if (!metrics.hasCompression) {
    findings.push({ id: makeId("PERF", i++), category: "compression", severity: "high", title: "No HTTP compression detected", detail: "The response had no Content-Encoding (gzip or brotli). Text assets (HTML, CSS, JS) typically compress 70-90%, so this bloats bandwidth and slows first paint significantly.", evidence: "Content-Encoding: (missing)", fix: "Enable gzip or brotli compression at the web server / CDN for text/* content types." });
  }

  if (!metrics.hasPreconnect) {
    findings.push({ id: makeId("PERF", i++), category: "render-blocking", severity: "low", title: 'No <link rel="preconnect"> hints', detail: "No preconnect or dns-prefetch hints were detected. Cross-origin resources (CDNs, analytics, fonts) pay a full DNS+TLS handshake penalty on first request.", evidence: '<link rel="preconnect">: (missing)', fix: 'Add <link rel="preconnect" href="https://your-cdn.com"> for any critical cross-origin the page uses.' });
  }

  if (metrics.externalScriptCount > 0 && !metrics.hasAsyncDeferScripts) {
    findings.push({ id: makeId("PERF", i++), category: "scripts", severity: "medium", title: "External scripts have no async/defer", detail: "External <script> tags without async/defer block HTML parsing, delaying first render and interactivity.", evidence: "no <script async> or <script defer> detected", fix: "Add `defer` to non-critical scripts (runs after HTML parse) or `async` for independent scripts." });
  }

  return findings;
}

/* ============================================
 * LLM-based performance review
 * ============================================ */

async function analyzePerformanceLLM(
  page: FetchedPage,
  metrics: ReturnType<typeof extractPerformanceMetrics>
): Promise<PerformanceFinding[]> {
  const prompt = `You are KODAND, a web performance auditor. Given the page metadata, measured metrics, and an HTML snippet, identify performance issues that the rule-based check might miss.

Focus on:
- Render-blocking patterns not captured by inline/external counts (e.g. <link media="all"> in head)
- Excessive DOM size hints
- Heavy third-party beacons / analytics
- Web font loading without font-display: swap
- Server response time signals
- Cumulative layout shift hints (images without width/height)
- Long task indicators
- Excessive redirects

Respond with STRICT, MINIFIED JSON ONLY — no markdown — in this shape:

{
  "findings": [
    {
      "category": "weight" | "render-blocking" | "images" | "scripts" | "fonts" | "caching" | "compression",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "title": "<short title>",
      "detail": "<one or two sentence explanation>",
      "evidence": "<verbatim HTML snippet, max 200 chars>",
      "fix": "<concrete recommended fix>"
    }
  ]
}

Rules:
- Cap at 6 findings, sorted by severity (critical first).
- Do NOT duplicate findings the rule check already covers.
- Do NOT invent issues. If the page is well-optimized, return an empty findings array.
- "evidence" MUST be a verbatim substring of the HTML snippet.

Page metadata:
URL: ${page.finalUrl}
HTTP status: ${page.httpStatus}
Content-Encoding: ${page.headersSnapshot["content-encoding"] || "(none)"}
Cache-Control: ${page.headersSnapshot["cache-control"] || "(none)"}
ETag: ${page.headersSnapshot["etag"] || "(none)"}

Measured metrics:
HTML size: ${metrics.pageSizeKb} KB
Inline script blocks: ${metrics.inlineScriptCount} (${(metrics.inlineScriptBytes / 1024).toFixed(1)} KB)
External scripts: ${metrics.externalScriptCount}
External stylesheets: ${metrics.externalStylesheetCount}
Inline style bytes: ${(metrics.inlineStyleBytes / 1024).toFixed(1)} KB
Images: ${metrics.imgCount}
Lazy loading: ${metrics.hasLazyLoading ? "yes" : "no"}
Compression: ${metrics.hasCompression ? "yes" : "no"}
Preconnect: ${metrics.hasPreconnect ? "yes" : "no"}
Async/defer scripts: ${metrics.hasAsyncDeferScripts ? "yes" : "no"}

HTML snippet (first ~8KB):
"""
${page.rawHtml.slice(0, 8000)}
"""`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: "You are KODAND, an expert performance auditor. Respond only with the requested JSON." },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";
    const parsed = safeParseJson(raw);
    if (!parsed || !Array.isArray(parsed.findings)) return [];
    return parsed.findings.slice(0, 6).map((f: any, i: number) => ({
      id: makeId("PERF-C", i),
      category: f.category || "scripts",
      severity: normalizeSeverity(f.severity),
      title: String(f.title || "Untitled finding").slice(0, 200),
      detail: String(f.detail || "").slice(0, 600),
      evidence: f.evidence ? String(f.evidence).slice(0, 400) : undefined,
      fix: String(f.fix || "").slice(0, 600),
    }));
  } catch {
    return [];
  }
}

/* ============================================
 * Full performance analysis
 * ============================================ */

export async function analyzePerformance(page: FetchedPage): Promise<PerformanceDimension> {
  const metrics = extractPerformanceMetrics(page.rawHtml, page);
  const ruleFindings = analyzePerformanceRuleBased(metrics);
  const llmFindings = await analyzePerformanceLLM(page, metrics);
  const allFindings = [...ruleFindings, ...llmFindings];
  let penalty = 0;
  for (const f of allFindings) penalty += sevPenalty[f.severity] ?? 1;
  const score = clamp(100 - penalty);
  const summary = buildPerformanceSummary(allFindings, metrics);
  return { score, findings: allFindings, summary, metrics };
}

function buildPerformanceSummary(
  findings: PerformanceFinding[],
  metrics: ReturnType<typeof extractPerformanceMetrics>
): string {
  if (findings.length === 0) {
    return `Page is lean: ${metrics.pageSizeKb} KB HTML, ${metrics.externalScriptCount} external scripts, ${metrics.externalStylesheetCount} stylesheets, compression ${metrics.hasCompression ? "on" : "off"}, lazy images ${metrics.hasLazyLoading ? "on" : "off"}.`;
  }
  const high = findings.filter((f) => f.severity === "high" || f.severity === "critical").length;
  return `${findings.length} performance finding(s) detected${high ? ` (${high} high/critical)` : ""}. HTML ${metrics.pageSizeKb} KB, ${metrics.externalScriptCount} external scripts, ${metrics.inlineScriptCount} inline blocks, ${metrics.imgCount} images. Priorities: enable compression, defer non-critical scripts, lazy-load off-screen images.`;
}
