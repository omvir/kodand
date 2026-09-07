import { NextRequest } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import {
  AccessibilityDimension,
  AccessibilityFinding,
  ContentDimension,
  ContentFinding,
  PageMeta,
  PerformanceDimension,
  PerformanceFinding,
  ProgressEvent,
  ScanMode,
  ScanResult,
  SeoDimension,
  SeoFinding,
  SecurityDimension,
  SecurityFinding,
  Severity,
  SCAN_MODES,
} from "@/lib/audit-types";
import {
  gatherDomainIntel,
  intelToSecurityFindings,
} from "@/lib/domain-intel";
import { readScanCache, writeScanCache } from "@/lib/scan-cache";
import { computeContentMetrics } from "@/lib/content-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * KODAND scan endpoint.
 *
 * POST /api/scan { url: string, mode: ScanMode }
 * Returns: text/event-stream of ProgressEvent items.
 *
 * Each mode runs only the relevant phases for that dimension, producing a
 * quick, focused report. The "full" mode runs all five dimensions.
 */

const UA =
  "Mozilla/5.0 (compatible; KODAND-Auditor/1.0; +https://chat.z.ai; research-only)";

const SECURITY_HEADERS = [
  "content-security-policy",
  "strict-transport-security",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
  "x-xss-protection",
  "x-permitted-cross-domain-policies",
  "x-download-options",
  "x-dns-prefetch-control",
  "set-cookie",
  "content-security-policy-report-only",
] as const;

const sevPenalty: Record<Severity, number> = {
  critical: 18,
  high: 10,
  medium: 5,
  low: 2,
  info: 0.5,
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function gradeFromScore(score: number): ScanResult["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 50) return "D";
  return "F";
}

function makeId(prefix: string, i: number) {
  return `${prefix}-${i.toString().padStart(3, "0")}`;
}

function modeLabel(mode: ScanMode): string {
  return SCAN_MODES.find((m) => m.id === mode)?.label || mode;
}

/* ============================================
 * HTML helpers
 * ============================================ */

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractMetaTag(html: string, name: string): string | undefined {
  // Try <meta name="X" content="Y"> and <meta property="X" content="Y">
  const re1 = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([\\s\\S]*?)["']`,
    "i"
  );
  const m1 = html.match(re1);
  if (m1) return m1[1].trim();
  const re2 = new RegExp(
    `<meta\\s+property=["']${name}["']\\s+content=["']([\\s\\S]*?)["']`,
    "i"
  );
  const m2 = html.match(re2);
  if (m2) return m2[1].trim();
  return undefined;
}

function extractTitleAndDescription(html: string): {
  title?: string;
  description?: string;
} {
  let title: string | undefined;
  let description: string | undefined;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) title = titleMatch[1].replace(/\s+/g, " ").trim();
  description = extractMetaTag(html, "description");
  return { title, description };
}

function countWords(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/).filter((w) => w.replace(/[^\w'-]/g, "").length > 0);
  return words.length;
}

function detectMixedContent(html: string, isHttps: boolean): boolean {
  if (!isHttps) return false;
  return /\s(?:src|href)\s*=\s*["']http:\/\//i.test(html);
}

function buildExcerptForLLM(text: string, maxChars = 6000): string {
  if (text.length <= maxChars) return text;
  const headLen = Math.floor(maxChars * 0.5);
  const tailLen = Math.floor(maxChars * 0.3);
  const midStart = Math.floor((text.length - tailLen) / 2);
  const head = text.slice(0, headLen);
  const middle = text.slice(midStart, midStart + (maxChars - headLen - tailLen));
  const tail = text.slice(text.length - tailLen);
  return `${head}\n…\n${middle}\n…\n${tail}`;
}

function sendEvent(controller: ReadableStreamDefaultController, evt: ProgressEvent) {
  const payload = `data: ${JSON.stringify(evt)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

function sevRank(s: Severity): number {
  return { critical: 0, high: 1, medium: 2, low: 3, info: 4 }[s];
}

function normalizeSeverity(s: any): Severity {
  const v = String(s || "").toLowerCase();
  if (["critical", "high", "medium", "low", "info"].includes(v)) return v as Severity;
  return "medium";
}

function safeParseJson(s: string): any {
  if (!s) return null;
  let cleaned = s.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.slice(first, last + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/* ============================================
 * HTTP fetch + page parse (shared across modes)
 * ============================================ */

interface FetchedPage {
  url: string;
  finalUrl: string;
  httpStatus: number;
  contentType: string;
  server: string;
  isHttps: boolean;
  rawHtml: string;
  fetchMs: number;
  title?: string;
  description?: string;
  visibleText: string;
  wordCount: number;
  mixedContent: boolean;
  headersSnapshot: Record<string, string | null>;
}

async function fetchPage(
  url: string,
  send: (e: ProgressEvent) => void
): Promise<FetchedPage | null> {
  send({
    type: "stage",
    stage: "fetch",
    label: "Fetching target page",
    progress: 12,
  });
  send({ type: "log", message: "Establishing connection to target…" });

  let response: Response;
  let rawHtml = "";
  let fetchMs = 0;
  const fetchStart = Date.now();
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    fetchMs = Date.now() - fetchStart;
    rawHtml = await response.text();
    send({
      type: "log",
      message: `Connection established. HTTP ${response.status}. ${rawHtml.length.toLocaleString()} bytes in ${fetchMs}ms.`,
    });
  } catch (err) {
    const msg = (err as Error)?.message || "Unknown fetch error";
    send({ type: "error", message: `Failed to fetch URL: ${msg}` });
    return null;
  }

  const finalUrl = response.url || url;
  const contentType = response.headers.get("content-type") || "";
  const server = response.headers.get("server") || "";
  const isHttps = finalUrl.startsWith("https://");
  const { title, description } = extractTitleAndDescription(rawHtml);
  const httpStatus = response.status;

  const headersSnapshot: Record<string, string | null> = {};
  for (const h of SECURITY_HEADERS) {
    headersSnapshot[h] = response.headers.get(h);
  }
  headersSnapshot["content-type"] = response.headers.get("content-type");
  headersSnapshot["server"] = response.headers.get("server");
  headersSnapshot["x-powered-by"] = response.headers.get("x-powered-by");
  headersSnapshot["cache-control"] = response.headers.get("cache-control");
  headersSnapshot["content-encoding"] = response.headers.get("content-encoding");
  headersSnapshot["etag"] = response.headers.get("etag");

  send({
    type: "stage",
    stage: "parse",
    label: "Parsing content",
    progress: 24,
  });
  const visibleText = htmlToText(rawHtml);
  const wordCount = countWords(visibleText);
  const mixedContent = detectMixedContent(rawHtml, isHttps);
  send({
    type: "log",
    message: `Parsed. Title: "${title || "(none)"}". ${wordCount.toLocaleString()} words visible.`,
  });
  send({
    type: "log",
    message: `HTTPS: ${isHttps ? "yes" : "no"}. Mixed content: ${
      mixedContent ? "detected" : "none"
    }.`,
  });

  return {
    url,
    finalUrl,
    httpStatus,
    contentType,
    server,
    isHttps,
    rawHtml,
    fetchMs,
    title,
    description,
    visibleText,
    wordCount,
    mixedContent,
    headersSnapshot,
  };
}

/* ============================================
 * CONTENT OPTIMIZER dimension (LLM + metrics)
 * ============================================ */

async function analyzeContent(text: string): Promise<ContentDimension> {
  // Compute content metrics first (readability, tone, keyword density, etc.)
  const metrics = computeContentMetrics(text);

  if (!text || text.trim().length < 20) {
    return {
      score: 100,
      findings: [],
      summary:
        "The page contained very little visible text, so content optimization was not meaningful.",
      metrics,
    };
  }

  const prompt = `You are KODAND, a meticulous content optimizer and copy editor. Analyze the following website text and identify spelling, grammar, punctuation, style, clarity, consistency, readability, tone, keyword, and SEO-content issues that would damage the site's professional credibility and search performance.

Respond with STRICT, MINIFIED JSON ONLY — no markdown, no commentary — in this exact shape:

{
  "findings": [
    {
      "type": "spelling" | "grammar" | "punctuation" | "style" | "clarity" | "consistency" | "readability" | "tone" | "keyword" | "seo-content",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "excerpt": "<short verbatim quote of the problematic phrase, max 120 chars>",
      "explanation": "<one or two sentences explaining what is wrong>",
      "suggestion": "<the recommended fix>"
    }
  ],
  "summary": "<2-4 sentence overall assessment of the writing quality, readability, tone, and SEO content fit>"
}

Rules:
- Cap at 15 findings, sorted by severity (critical first).
- Include readability findings if sentences are too long, vocabulary is too complex, or reading level is too high for the audience.
- Include tone findings if the tone is inconsistent (e.g. casual vs formal) or inappropriate for the topic.
- Include keyword findings if the keyword usage is stuffed, missing, or repetitive.
- Include SEO-content findings if the content is too thin, duplicate-looking, or missing target keywords.
- "critical" only for legibility-breaking errors; "high" for embarrassing/visible errors; "medium" for normal issues; "low" for stylistic nits; "info" for suggestions.
- The "excerpt" MUST be a verbatim substring of the input text. If you cannot quote exactly, skip the finding.
- Do NOT invent issues. If the text is clean, return an empty findings array and explain that in the summary.
- Summary MUST be 2-4 sentences.

Website text:
"""
${buildExcerptForLLM(text)}
"""`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are KODAND, an expert content optimizer. Respond only with the requested JSON.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";
    const parsed = safeParseJson(raw);
    if (!parsed || !Array.isArray(parsed.findings)) {
      return {
        score: 100,
        findings: [],
        summary: "Content optimization could not be completed. No findings to report.",
        metrics,
      };
    }
    const findings: ContentFinding[] = parsed.findings
      .slice(0, 15)
      .map((f: any, i: number) => ({
        id: makeId("CTC", i),
        type: f.type || "grammar",
        severity: normalizeSeverity(f.severity),
        excerpt: String(f.excerpt || "").slice(0, 240),
        explanation: String(f.explanation || "").slice(0, 600),
        suggestion: String(f.suggestion || "").slice(0, 600),
      }));
    const summary =
      typeof parsed.summary === "string"
        ? parsed.summary
        : `Content optimization complete: ${findings.length} finding(s).`;
    let penalty = 0;
    for (const f of findings) penalty += sevPenalty[f.severity] ?? 1;
    // Slight readability penalty for very hard-to-read content
    if (metrics.fleschReadingEase < 30) penalty += 5;
    else if (metrics.fleschReadingEase < 50) penalty += 2;
    return {
      score: clamp(100 - penalty),
      findings,
      summary,
      metrics,
    };
  } catch (err) {
    return {
      score: 100,
      findings: [],
      summary: `Content optimization encountered an error (${(err as Error).message}).`,
      metrics,
    };
  }
}

/* ============================================
 * SECURITY dimension (rule-based headers + LLM content)
 * ============================================ */

function analyzeSecurityHeaders(
  headers: Record<string, string | null>,
  isHttps: boolean
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  let i = 0;

  if (isHttps) {
    const hsts = headers["strict-transport-security"];
    if (!hsts) {
      findings.push({
        id: makeId("SEC", i++),
        category: "transport",
        severity: "high",
        title: "Missing Strict-Transport-Security (HSTS) header",
        detail:
          "No HSTS header is present. Without it, users on the same network as the client can be downgraded to plaintext HTTP via SSL stripping.",
        evidence: "Strict-Transport-Security: (missing)",
        fix: "Send `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` on all HTTPS responses.",
      });
    } else if (!/includeSubDomains/i.test(hsts)) {
      findings.push({
        id: makeId("SEC", i++),
        category: "transport",
        severity: "low",
        title: "HSTS does not include subdomains",
        detail:
          "The HSTS header is set but does not include `includeSubDomains`, leaving subdomains vulnerable to SSL stripping.",
        evidence: `Strict-Transport-Security: ${hsts}`,
        fix: "Append `includeSubDomains` to the HSTS header (and consider `preload` if all subdomains support HTTPS).",
      });
    }
  } else {
    findings.push({
      id: makeId("SEC", i++),
      category: "transport",
      severity: "critical",
      title: "Site is not served over HTTPS",
      detail:
        "The target is served over plaintext HTTP. All traffic — including credentials, cookies, and personal data — can be intercepted and modified by anyone on the network path.",
      evidence: "URL scheme: http://",
      fix: "Obtain a TLS certificate (e.g. via Let's Encrypt) and redirect all HTTP requests to HTTPS. Add HSTS once HTTPS is stable.",
    });
  }

  const csp = headers["content-security-policy"];
  if (!csp) {
    findings.push({
      id: makeId("SEC", i++),
      category: "headers",
      severity: "high",
      title: "Missing Content-Security-Policy (CSP) header",
      detail:
        "Without a CSP, the browser will execute any script that reaches the page — including injected XSS payloads. CSP is the single most effective mitigation against cross-site scripting.",
      evidence: "Content-Security-Policy: (missing)",
      fix: "Deploy a restrictive CSP. Start with `default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'` and add script/style origins as needed.",
    });
  } else if (/(^|;)\s*default-src\s+\*/i.test(csp) || /script-src\s+[^;]*\*/i.test(csp)) {
    findings.push({
      id: makeId("SEC", i++),
      category: "headers",
      severity: "medium",
      title: "Content-Security-Policy uses wildcard allowlists",
      detail:
        "The CSP permits any origin via wildcards (`*`), dramatically reducing its effectiveness against XSS.",
      evidence: `Content-Security-Policy: ${csp}`,
      fix: "Replace wildcard directives with explicit trusted origins. Avoid `unsafe-inline` and `unsafe-eval` for script-src.",
    });
  }

  const xfo = headers["x-frame-options"];
  const frameAncestorsInCsp = csp ? /frame-ancestors/i.test(csp) : false;
  if (!xfo && !frameAncestorsInCsp) {
    findings.push({
      id: makeId("SEC", i++),
      category: "headers",
      severity: "medium",
      title: "Missing clickjacking protection",
      detail:
        "Neither `X-Frame-Options` nor a CSP `frame-ancestors` directive is set. Attackers can embed this page in an iframe to trick users into clicking hidden actions.",
      evidence: "X-Frame-Options: (missing); CSP frame-ancestors: (missing)",
      fix: "Add `X-Frame-Options: DENY` (legacy) or, preferably, `Content-Security-Policy: …; frame-ancestors 'none'`.",
    });
  }

  const xcto = headers["x-content-type-options"];
  if (!xcto || !/nosniff/i.test(xcto)) {
    findings.push({
      id: makeId("SEC", i++),
      category: "headers",
      severity: "medium",
      title: "Missing X-Content-Type-Options: nosniff",
      detail:
        "Without `nosniff`, browsers may MIME-sniff responses and execute content as a different type than declared — a vector for XSS.",
      evidence: `X-Content-Type-Options: ${xcto || "(missing)"}`,
      fix: "Send `X-Content-Type-Options: nosniff` on all responses.",
    });
  }

  const ref = headers["referrer-policy"];
  if (!ref) {
    findings.push({
      id: makeId("SEC", i++),
      category: "headers",
      severity: "low",
      title: "Missing Referrer-Policy header",
      detail:
        "Without a Referrer-Policy, browsers default to leaking the full URL (including path/query) to any third-party resource the page links to.",
      evidence: "Referrer-Policy: (missing)",
      fix: "Set `Referrer-Policy: strict-origin-when-cross-origin`.",
    });
  }

  const pp = headers["permissions-policy"];
  if (!pp) {
    findings.push({
      id: makeId("SEC", i++),
      category: "headers",
      severity: "low",
      title: "Missing Permissions-Policy header",
      detail:
        "Without Permissions-Policy, any third-party script on the page can access powerful browser features (camera, microphone, geolocation, payments) without explicit consent.",
      evidence: "Permissions-Policy: (missing)",
      fix: "Set `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` and enable only the features you use.",
    });
  }

  const srv = headers["server"];
  if (srv && /\b\d/.test(srv)) {
    findings.push({
      id: makeId("SEC", i++),
      category: "infrastructure",
      severity: "low",
      title: "Server header reveals version information",
      detail:
        "The `Server` header exposes software and version, making targeted vulnerability scanning trivial.",
      evidence: `Server: ${srv}`,
      fix: "Suppress the Server header (e.g. nginx: `server_tokens off;`; Apache: `ServerTokens Prod`).",
    });
  }
  const xpb = headers["x-powered-by"];
  if (xpb) {
    findings.push({
      id: makeId("SEC", i++),
      category: "infrastructure",
      severity: "low",
      title: "X-Powered-By header leaks framework",
      detail:
        "The `X-Powered-By` header advertises the framework/language used. Free intel for attackers scanning for known CVEs.",
      evidence: `X-Powered-By: ${xpb}`,
      fix: "Disable the X-Powered-By header in your framework (e.g. Express: `app.disable('x-powered-by')`).",
    });
  }

  const sc = headers["set-cookie"];
  if (sc) {
    const cookies = sc.split(/,(?=\s*[A-Za-z0-9_-]+=)/);
    for (const cookie of cookies) {
      const parts = cookie.split(";");
      const name = (parts[0] || "").split("=")[0]?.trim() || "cookie";
      const missingSecure = isHttps && !/;\s*secure/i.test(cookie);
      const missingHttpOnly = !/;\s*httponly/i.test(cookie);
      const missingSameSite = !/;\s*samesite=/i.test(cookie);
      if (missingSecure || missingHttpOnly || missingSameSite) {
        const issues: string[] = [];
        if (missingSecure) issues.push("Secure");
        if (missingHttpOnly) issues.push("HttpOnly");
        if (missingSameSite) issues.push("SameSite");
        findings.push({
          id: makeId("SEC", i++),
          category: "cookies",
          severity: "medium",
          title: `Cookie "${name}" missing ${issues.join(", ")} flag(s)`,
          detail:
            "Cookies without Secure can leak over HTTP. Without HttpOnly, JavaScript can read them (XSS → session theft). Without SameSite, CSRF is easier.",
          evidence: cookie.slice(0, 200),
          fix: `Add the missing flag(s) (${issues.join(", ")}) to the Set-Cookie directive for "${name}".`,
        });
      }
    }
  }

  return findings;
}

async function analyzeSecurityContent(ctx: {
  url: string;
  isHttps: boolean;
  httpStatus: number;
  contentType: string;
  server: string;
  headers: Record<string, string | null>;
  mixedContent: boolean;
  htmlSnippet: string;
}): Promise<SecurityFinding[]> {
  const prompt = `You are KODAND, a senior web security auditor. Given the metadata and an HTML snippet of a webpage, identify security and privacy vulnerabilities that are NOT simply missing HTTP headers (those are analyzed separately).

Focus on:
- Inline event handlers (onclick=, onload=, onerror=) — XSS surface
- javascript: URLs in href / src
- Forms without CSRF tokens or with autocomplete on sensitive fields
- Inputs without proper type / autocomplete / validation
- Inline scripts without nonces (if CSP is set)
- External scripts from untrusted origins
- Mixed content (http:// resources on https:// pages)
- Information disclosure (emails, phone numbers, internal paths, API keys)
- Tracking / third-party beacons
- Storage of sensitive data in localStorage / sessionStorage
- eval(), document.write(), innerHTML assignments
- Insecure authentication patterns

Respond with STRICT, MINIFIED JSON ONLY — no markdown — in this exact shape:

{
  "findings": [
    {
      "category": "transport" | "headers" | "content" | "forms" | "cookies" | "scripts" | "infrastructure",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "title": "<short title>",
      "detail": "<one or two sentence explanation>",
      "evidence": "<verbatim HTML snippet, max 200 chars>",
      "fix": "<concrete recommended fix>"
    }
  ]
}

Rules:
- Cap at 10 findings, sorted by severity (critical first).
- Do NOT report missing HTTP headers (already covered separately).
- Do NOT invent issues. If the page is clean, return an empty findings array.
- "evidence" MUST be a verbatim substring of the HTML snippet.

Page metadata:
URL: ${ctx.url}
Scheme: ${ctx.isHttps ? "https" : "http"}
HTTP status: ${ctx.httpStatus}
Content-Type: ${ctx.contentType}
Server: ${ctx.server}
Mixed content detected: ${ctx.mixedContent ? "yes" : "no"}

HTML snippet (first ~8KB):
"""
${ctx.htmlSnippet}
"""`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are KODAND, an expert web security auditor. Respond only with the requested JSON.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";
    const parsed = safeParseJson(raw);
    if (!parsed || !Array.isArray(parsed.findings)) return [];
    return parsed.findings.slice(0, 10).map((f: any, i: number) => ({
      id: makeId("SEC-C", i),
      category: f.category || "content",
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

async function analyzeSecurity(
  page: FetchedPage,
  send: (e: ProgressEvent) => void
): Promise<SecurityDimension> {
  send({ type: "log", message: "Inspecting security response headers…" });
  const headerFindings = analyzeSecurityHeaders(page.headersSnapshot, page.isHttps);
  send({
    type: "log",
    message: `Headers inspected: ${headerFindings.length} issue(s) across ${SECURITY_HEADERS.length} security headers.`,
  });
  send({ type: "log", message: "Dispatching LLM security content review…" });
  const contentFindings = await analyzeSecurityContent({
    url: page.finalUrl,
    isHttps: page.isHttps,
    httpStatus: page.httpStatus,
    contentType: page.contentType,
    server: page.server,
    headers: page.headersSnapshot,
    mixedContent: page.mixedContent,
    htmlSnippet: page.rawHtml.slice(0, 8000),
  });
  send({
    type: "log",
    message: `Security content review complete: ${contentFindings.length} finding(s).`,
  });

  // Deep security intel — gather from free public internet sources.
  // (NVD CVE, RDAP WHOIS, DNS, TLS certificate, crt.sh certificate transparency)
  send({
    type: "stage",
    stage: "security-cve",
    label: "NVD CVE deep scan",
    progress: 0,
  });
  const logOnly = (msg: string) => send({ type: "log", message: msg });
  const intel = await gatherDomainIntel(
    {
      url: page.url,
      finalUrl: page.finalUrl,
      headers: page.headersSnapshot,
      html: page.rawHtml,
      isHttps: page.isHttps,
    },
    logOnly
  );
  const intelFindings = intelToSecurityFindings(intel);

  const findings = [...headerFindings, ...contentFindings, ...intelFindings];
  let penalty = 0;
  for (const f of findings) penalty += sevPenalty[f.severity] ?? 1;
  const score = clamp(100 - penalty);
  const summary = buildSecuritySummary(
    findings,
    page.isHttps,
    page.mixedContent,
    intel
  );
  return {
    score,
    findings,
    summary,
    headers: page.headersSnapshot,
    https: page.isHttps,
    mixedContent: page.mixedContent,
    intel,
  };
}

function buildSecuritySummary(
  findings: SecurityFinding[],
  isHttps: boolean,
  mixedContent: boolean,
  intel?: import("@/lib/audit-types").DomainIntel
): string {
  const parts: string[] = [];
  if (!isHttps) {
    parts.push(
      "Critical: site is served over plaintext HTTP. Migrating to HTTPS is the highest priority."
    );
  } else {
    parts.push(
      mixedContent
        ? "HTTPS is in use but mixed content was detected."
        : "HTTPS is in use with no mixed content."
    );
  }
  parts.push(`${findings.length} security finding(s) detected.`);
  if (intel) {
    if (intel.cveFindings.length > 0) {
      const high = intel.cveFindings.filter(
        (c) => c.severity === "high" || c.severity === "critical"
      ).length;
      parts.push(
        `Deep CVE scan matched ${intel.cveFindings.length} known CVE(s)${
          high ? ` (${high} high/critical)` : ""
        }.`
      );
    }
    if (intel.whois && !intel.whois.error) {
      parts.push(
        `WHOIS: registrar ${intel.whois.registrar || "unknown"}, ${
          intel.whois.nameservers.length
        } nameservers.`
      );
    }
    if (intel.dns && !intel.dns.error) {
      parts.push(
        `DNS: ${intel.dns.A.length} A, ${intel.dns.NS.length} NS, ${
          intel.dns.MX.length
        } MX record(s).`
      );
    }
    if (intel.certificate && !intel.certificate.error) {
      parts.push(
        `TLS: ${
          intel.certificate.isExpired
            ? "EXPIRED"
            : intel.certificate.isExpiringSoon
            ? "expiring soon"
            : "valid"
        }, ${intel.certificate.selfSigned ? "self-signed" : "CA-signed"}, ${
          intel.certTransparency.length
        } CT-log entries.`
      );
    }
    if (intel.discoveredSubdomains.length > 0) {
      parts.push(
        `${intel.discoveredSubdomains.length} subdomain(s) discovered via CT logs.`
      );
    }
  }
  return parts.join(" ");
}

/* ============================================
 * SEO dimension (rule-based checks + LLM)
 * ============================================ */

function extractSeoChecks(html: string, page: FetchedPage) {
  const title = page.title;
  const description = page.description;
  const canonical = (() => {
    const m = html.match(
      /<link\s+rel=["']canonical["']\s+href=["']([\s\S]*?)["']/i
    );
    return m ? m[1].trim() : undefined;
  })();
  const ogTitle = extractMetaTag(html, "og:title");
  const ogDescription = extractMetaTag(html, "og:description");
  const ogImage = extractMetaTag(html, "og:image");
  const ogUrl = extractMetaTag(html, "og:url");
  const ogTags: Record<string, string> = {};
  if (ogTitle) ogTags["og:title"] = ogTitle;
  if (ogDescription) ogTags["og:description"] = ogDescription;
  if (ogImage) ogTags["og:image"] = ogImage;
  if (ogUrl) ogTags["og:url"] = ogUrl;
  const twitterCard = extractMetaTag(html, "twitter:card");
  const twitterTitle = extractMetaTag(html, "twitter:title");
  const twitterDescription = extractMetaTag(html, "twitter:description");
  const twitterImage = extractMetaTag(html, "twitter:image");

  const h1Matches = html.match(/<h1\b[^>]*>/gi) || [];
  const h2Matches = html.match(/<h2\b[^>]*>/gi) || [];
  const h3Matches = html.match(/<h3\b[^>]*>/gi) || [];
  const h4plusMatches =
    (html.match(/<h4\b[^>]*>/gi) || []).length +
    (html.match(/<h5\b[^>]*>/gi) || []).length +
    (html.match(/<h6\b[^>]*>/gi) || []).length;

  const hasStructuredData = /<script\s+type=["']application\/ld\+json["']/i.test(html);

  const viewportMeta = extractMetaTag(html, "viewport");
  const hasViewport = !!viewportMeta;

  const robotsMeta = extractMetaTag(html, "robots");
  const hasRobotsMeta = !!robotsMeta;

  const langAttr = (() => {
    const m = html.match(/<html\s+[^>]*\blang=["']([A-Za-z-]+)["']/i);
    return m ? m[1] : null;
  })();
  const hasLang = !!langAttr;

  const hasFavicon =
    /<link\s+[^>]*\brel=["'](?:icon|shortcut icon|apple-touch-icon)["']/i.test(html);

  return {
    hasTitle: !!title,
    titleLength: title?.length || 0,
    hasDescription: !!description,
    descriptionLength: description?.length || 0,
    hasCanonical: !!canonical,
    hasOgTags: Object.keys(ogTags).length >= 2,
    hasTwitterCard: !!twitterCard,
    h1Count: h1Matches.length,
    h2Count: h2Matches.length,
    h3Count: h3Matches.length,
    h4plusCount: h4plusMatches,
    hasStructuredData,
    hasViewport,
    hasRobotsMeta,
    hasLang,
    lang: langAttr,
    hasFavicon,
    canonical,
    ogTags,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
  };
}

function analyzeSeoRuleBased(checks: ReturnType<typeof extractSeoChecks>): SeoFinding[] {
  const findings: SeoFinding[] = [];
  let i = 0;

  if (!checks.hasTitle) {
    findings.push({
      id: makeId("SEO", i++),
      category: "meta",
      severity: "high",
      title: "Missing <title> tag",
      detail:
        "No <title> tag was found. The title is the single most important on-page SEO signal and the primary line in search results.",
      evidence: "<title>: (missing)",
      fix: "Add a unique, descriptive <title> tag (50-60 characters) describing the page's purpose.",
    });
  } else if (checks.titleLength > 60) {
    findings.push({
      id: makeId("SEO", i++),
      category: "meta",
      severity: "low",
      title: "Title is too long",
      detail: `Title is ${checks.titleLength} characters. Search engines truncate titles around 60 characters.`,
      evidence: `title length: ${checks.titleLength}`,
      fix: "Trim the title to 50-60 characters. Move branding to the end (e.g. 'Page Topic — Brand').",
    });
  } else if (checks.titleLength < 10) {
    findings.push({
      id: makeId("SEO", i++),
      category: "meta",
      severity: "medium",
      title: "Title is too short",
      detail: `Title is only ${checks.titleLength} characters, which is too brief to communicate the page's purpose or include target keywords.`,
      evidence: `title length: ${checks.titleLength}`,
      fix: "Expand the title to 30-60 characters with descriptive, keyword-rich phrasing.",
    });
  }

  if (!checks.hasDescription) {
    findings.push({
      id: makeId("SEO", i++),
      category: "meta",
      severity: "high",
      title: "Missing meta description",
      detail:
        "No meta description was found. The description is what search engines show under your title in results and heavily influences click-through.",
      evidence: "<meta name=\"description\">: (missing)",
      fix: "Add a unique meta description of 120-160 characters summarizing the page.",
    });
  } else if (checks.descriptionLength > 160) {
    findings.push({
      id: makeId("SEO", i++),
      category: "meta",
      severity: "low",
      title: "Meta description too long",
      detail: `Description is ${checks.descriptionLength} characters. Search engines truncate descriptions around 160 characters.`,
      evidence: `description length: ${checks.descriptionLength}`,
      fix: "Trim the meta description to 120-160 characters with the key idea up front.",
    });
  } else if (checks.descriptionLength < 50 && checks.hasDescription) {
    findings.push({
      id: makeId("SEO", i++),
      category: "meta",
      severity: "low",
      title: "Meta description too short",
      detail: `Description is only ${checks.descriptionLength} characters, too brief to be compelling in search results.`,
      evidence: `description length: ${checks.descriptionLength}`,
      fix: "Expand the meta description to 120-160 characters with a clear value proposition.",
    });
  }

  if (!checks.hasCanonical) {
    findings.push({
      id: makeId("SEO", i++),
      category: "links",
      severity: "medium",
      title: "Missing canonical link",
      detail:
        "No <link rel=\"canonical\"> tag was found. Without it, search engines may index duplicate URLs separately, splitting ranking signals.",
      evidence: "<link rel=\"canonical\">: (missing)",
      fix: "Add <link rel=\"canonical\" href=\"https://your-canonical-url/\"> in the <head>.",
    });
  }

  if (!checks.hasOgTags) {
    findings.push({
      id: makeId("SEO", i++),
      category: "social",
      severity: "medium",
      title: "Missing Open Graph tags",
      detail:
        "No Open Graph (og:title, og:description, og:image) tags were found. Social shares will render as bare links with no preview card.",
      evidence: "og:title / og:description / og:image: (missing)",
      fix: "Add og:title, og:description, og:image, and og:url meta tags in the <head>.",
    });
  }

  if (!checks.hasTwitterCard) {
    findings.push({
      id: makeId("SEO", i++),
      category: "social",
      severity: "low",
      title: "Missing Twitter Card meta",
      detail:
        "No twitter:card meta was found. Tweets linking to this page will not show a rich preview.",
      evidence: "twitter:card: (missing)",
      fix: "Add <meta name=\"twitter:card\" content=\"summary_large_image\"> plus twitter:title/description/image.",
    });
  }

  if (checks.h1Count === 0) {
    findings.push({
      id: makeId("SEO", i++),
      category: "headings",
      severity: "high",
      title: "No <h1> heading",
      detail:
        "No <h1> was found. The H1 is the most important on-page heading for both accessibility and SEO — it tells search engines what the page is about.",
      evidence: "<h1> count: 0",
      fix: "Add exactly one descriptive <h1> describing the page's main topic.",
    });
  } else if (checks.h1Count > 1) {
    findings.push({
      id: makeId("SEO", i++),
      category: "headings",
      severity: "low",
      title: `Multiple <h1> headings (${checks.h1Count})`,
      detail:
        "Multiple H1 tags were found. While not strictly wrong, a single H1 per page is the recommended best practice for clear topical hierarchy.",
      evidence: `<h1> count: ${checks.h1Count}`,
      fix: "Use exactly one <h1> per page; demote additional top-level headings to <h2>.",
    });
  }

  if (!checks.hasStructuredData) {
    findings.push({
      id: makeId("SEO", i++),
      category: "structured-data",
      severity: "medium",
      title: "No structured data (JSON-LD)",
      detail:
        "No JSON-LD structured data was detected. Without schema.org markup, the page cannot earn rich results (reviews, FAQ, breadcrumbs, sitelinks) in search.",
      evidence: "<script type=\"application/ld+json\">: (missing)",
      fix: "Add JSON-LD structured data describing the page (e.g. Article, BreadcrumbList, Organization, FAQPage).",
    });
  }

  if (!checks.hasViewport) {
    findings.push({
      id: makeId("SEO", i++),
      category: "mobile",
      severity: "critical",
      title: "Missing viewport meta tag",
      detail:
        "No viewport meta tag was found. The page will render as a desktop layout on mobile, which Google penalizes heavily (mobile-first indexing).",
      evidence: "<meta name=\"viewport\">: (missing)",
      fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> in the <head>.",
    });
  }

  if (!checks.hasLang) {
    findings.push({
      id: makeId("SEO", i++),
      category: "content",
      severity: "low",
      title: "Missing lang attribute on <html>",
      detail:
        "The <html> tag has no lang attribute. Screen readers and search engines cannot determine the page's primary language.",
      evidence: "<html lang=...>: (missing)",
      fix: "Add a lang attribute to <html>, e.g. <html lang=\"en\">.",
    });
  }

  if (!checks.hasRobotsMeta) {
    // Not necessarily a problem — but worth flagging as info
    findings.push({
      id: makeId("SEO", i++),
      category: "meta",
      severity: "info",
      title: "No robots meta tag",
      detail:
        "No <meta name=\"robots\"> directive was found. By default the page is indexable and followable — which is usually correct, but explicit declaration is a best practice.",
      evidence: "<meta name=\"robots\">: (missing)",
      fix: "Optionally add <meta name=\"robots\" content=\"index, follow\"> for explicit indexability.",
    });
  }

  if (!checks.hasFavicon) {
    findings.push({
      id: makeId("SEO", i++),
      category: "meta",
      severity: "info",
      title: "No favicon detected",
      detail:
        "No favicon link was found. Browsers will request /favicon.ico by default and log 404s; a favicon also reinforces brand identity in tabs and bookmarks.",
      evidence: "<link rel=\"icon\">: (missing)",
      fix: "Add <link rel=\"icon\" href=\"/favicon.ico\"> and ideally multiple sizes (32, 192, 512).",
    });
  }

  return findings;
}

async function analyzeSeoContentLLM(
  page: FetchedPage,
  checks: ReturnType<typeof extractSeoChecks>
): Promise<SeoFinding[]> {
  const prompt = `You are KODAND, an expert SEO and content-strategy auditor. Given the metadata, parsed on-page signals, and an HTML snippet of a webpage, identify SEO and content-discoverability problems that the rule-based check might miss.

Focus on:
- Title/description keyword alignment and click-through optimization
- Heading hierarchy problems (e.g. <h2> before <h1>, skipping levels)
- Internal/external link analysis (anchor text, nofollow, broken pattern hints)
- Image alt text missing or non-descriptive
- URL structure (dynamic params, uppercase, depth)
- Content thinness or duplicate-looking boilerplate
- Readability and keyword stuffing
- Mobile-friendliness signals
- Crawling obstacles (heavy inline scripts, no SSR, JS-only content)

Respond with STRICT, MINIFIED JSON ONLY — no markdown — in this exact shape:

{
  "findings": [
    {
      "category": "meta" | "headings" | "structured-data" | "links" | "content" | "mobile" | "social",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "title": "<short title>",
      "detail": "<one or two sentence explanation>",
      "evidence": "<verbatim HTML snippet or signal, max 200 chars>",
      "fix": "<concrete recommended fix>"
    }
  ]
}

Rules:
- Cap at 8 findings, sorted by severity (critical first).
- Do NOT duplicate findings already covered by the rule-based check (title missing, description missing, viewport missing, canonical missing, no H1, no JSON-LD, no OG tags). Focus on what the rule check would MISS.
- Do NOT invent issues. If the page is well-optimized, return an empty findings array.
- "evidence" MUST be a verbatim substring of the HTML snippet or a quoted signal from the metadata.

Page metadata:
URL: ${page.finalUrl}
Title (length ${checks.titleLength}): ${page.title || "(missing)"}
Description (length ${checks.descriptionLength}): ${page.description || "(missing)"}
Canonical: ${checks.canonical || "(missing)"}
Open Graph tags: ${Object.keys(checks.ogTags).length > 0 ? Object.entries(checks.ogTags).map(([k,v]) => `${k}=${v}`).join("; ") : "(none)"}
Twitter card: ${checks.twitterCard || "(missing)"}
H1 count: ${checks.h1Count}
H2 count: ${checks.h2Count}
H3 count: ${checks.h3Count}
Structured data: ${checks.hasStructuredData ? "yes" : "no"}
Viewport: ${checks.hasViewport ? "yes" : "no"}
Lang: ${checks.lang || "(missing)"}

HTML snippet (first ~8KB):
"""
${page.rawHtml.slice(0, 8000)}
"""`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are KODAND, an expert SEO auditor. Respond only with the requested JSON.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";
    const parsed = safeParseJson(raw);
    if (!parsed || !Array.isArray(parsed.findings)) return [];
    return parsed.findings.slice(0, 8).map((f: any, i: number) => ({
      id: makeId("SEO-C", i),
      category: f.category || "content",
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

async function analyzeSeo(page: FetchedPage): Promise<SeoDimension> {
  const checks = extractSeoChecks(page.rawHtml, page);
  const ruleFindings = analyzeSeoRuleBased(checks);
  const llmFindings = await analyzeSeoContentLLM(page, checks);
  const findings = [...ruleFindings, ...llmFindings];
  let penalty = 0;
  for (const f of findings) penalty += sevPenalty[f.severity] ?? 1;
  const score = clamp(100 - penalty);
  const summary = buildSeoSummary(findings, checks);
  const dim: SeoDimension = {
    score,
    findings,
    summary,
    checks: {
      hasTitle: checks.hasTitle,
      titleLength: checks.titleLength,
      hasDescription: checks.hasDescription,
      descriptionLength: checks.descriptionLength,
      hasCanonical: checks.hasCanonical,
      hasOgTags: checks.hasOgTags,
      hasTwitterCard: checks.hasTwitterCard,
      h1Count: checks.h1Count,
      h2Count: checks.h2Count,
      h3Count: checks.h3Count,
      hasStructuredData: checks.hasStructuredData,
      hasViewport: checks.hasViewport,
      hasRobotsMeta: checks.hasRobotsMeta,
      hasLang: checks.hasLang,
      lang: checks.lang,
      hasFavicon: checks.hasFavicon,
    },
  };
  return dim;
}

function buildSeoSummary(
  findings: SeoFinding[],
  checks: ReturnType<typeof extractSeoChecks>
): string {
  const high = findings.filter(
    (f) => f.severity === "high" || f.severity === "critical"
  ).length;
  if (findings.length === 0) {
    return `SEO is in good shape. Title (${checks.titleLength} chars), description (${checks.descriptionLength} chars), ${checks.h1Count} H1, structured data ${checks.hasStructuredData ? "present" : "absent"}, viewport ${checks.hasViewport ? "present" : "absent"}.`;
  }
  return `${findings.length} SEO finding(s) detected${
    high ? ` (${high} high/critical)` : ""
  }. Key signals: title ${checks.hasTitle ? "present" : "MISSING"}, description ${
    checks.hasDescription ? "present" : "MISSING"
  }, canonical ${checks.hasCanonical ? "present" : "missing"}, H1 ${
    checks.h1Count === 1 ? "present" : checks.h1Count === 0 ? "MISSING" : "multiple"
  }, structured data ${checks.hasStructuredData ? "present" : "missing"}.`;
}

/* ============================================
 * PERFORMANCE dimension (rule-based metrics + LLM)
 * ============================================ */

function extractPerformanceMetrics(html: string, page: FetchedPage) {
  const htmlBytes = new TextEncoder().encode(html).length;

  // Inline scripts: <script>...</script> with no src
  const inlineScripts = html.match(
    /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi
  ) || [];
  const inlineScriptCount = inlineScripts.length;
  const inlineScriptBytes = inlineScripts.reduce(
    (sum, s) => sum + new TextEncoder().encode(s).length,
    0
  );

  // External scripts
  const externalScripts = html.match(
    /<script[^>]*\bsrc=["'][^"']+["'][^>]*>/gi
  ) || [];
  const externalScriptCount = externalScripts.length;

  // External stylesheets
  const externalStylesheets = html.match(
    /<link[^>]*\brel=["']stylesheet["'][^>]*>/gi
  ) || [];
  const externalStylesheetCount = externalStylesheets.length;

  // Inline styles
  const inlineStyles = html.match(
    /<style[^>]*>([\s\S]*?)<\/style>/gi
  ) || [];
  const inlineStyleBytes = inlineStyles.reduce(
    (sum, s) => sum + new TextEncoder().encode(s).length,
    0
  );

  // Images
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgCount = imgs.length;
  const hasLazyLoading = /\bloading=["']lazy["']/i.test(html);

  // Compression — from response headers
  const hasCompression = !!page.headersSnapshot["content-encoding"];

  // Preconnect / preload
  const hasPreconnect =
    /<link[^>]*\brel=["']preconnect["']/i.test(html) ||
    /<link[^>]*\brel=["']dns-prefetch["']/i.test(html);

  // async/defer scripts
  const hasAsyncDeferScripts =
    /<script[^>]*\b(async|defer)\b/i.test(html);

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

function analyzePerformanceRuleBased(
  metrics: ReturnType<typeof extractPerformanceMetrics>
): PerformanceFinding[] {
  const findings: PerformanceFinding[] = [];
  let i = 0;

  if (metrics.pageSizeKb > 1500) {
    findings.push({
      id: makeId("PERF", i++),
      category: "weight",
      severity: "high",
      title: `Page HTML is very large (${metrics.pageSizeKb} KB)`,
      detail:
        "The HTML document alone is over 1.5 MB. This excludes images, scripts, and stylesheets, which will push total page weight much higher. Mobile users on slow connections will see long blank screens.",
      evidence: `HTML size: ${metrics.pageSizeKb} KB`,
      fix: "Move inlined scripts/styles into external cacheable files, enable server-side caching, and audit any embedded JSON or base64 images.",
    });
  } else if (metrics.pageSizeKb > 500) {
    findings.push({
      id: makeId("PERF", i++),
      category: "weight",
      severity: "medium",
      title: `Page HTML is large (${metrics.pageSizeKb} KB)`,
      detail:
        "The HTML document is over 500 KB. This is heavier than the recommended 200 KB ceiling for fast first paint.",
      evidence: `HTML size: ${metrics.pageSizeKb} KB`,
      fix: "Audit inline scripts and styles; consider code-splitting or moving to external cacheable resources.",
    });
  }

  if (metrics.inlineScriptCount > 5) {
    findings.push({
      id: makeId("PERF", i++),
      category: "scripts",
      severity: "medium",
      title: `${metrics.inlineScriptCount} inline <script> blocks`,
      detail:
        "Inline scripts cannot be cached separately and run before the browser can parse the rest of the page, blocking first paint.",
      evidence: `inline script blocks: ${metrics.inlineScriptCount}`,
      fix: "Move inline scripts to external .js files (cacheable, parallelizable). Keep only a tiny bootstrapper inline if needed.",
    });
  }

  if (metrics.inlineScriptBytes > 50_000) {
    findings.push({
      id: makeId("PERF", i++),
      category: "scripts",
      severity: "medium",
      title: `Inline scripts total ${(metrics.inlineScriptBytes / 1024).toFixed(1)} KB`,
      detail:
        "Inline script bytes cannot be cached across page navigations and add to the critical-path download.",
      evidence: `inline script bytes: ${metrics.inlineScriptBytes}`,
      fix: "Move inline scripts to external files. If inline is required, defer them and keep them minimal.",
    });
  }

  if (metrics.inlineStyleBytes > 30_000) {
    findings.push({
      id: makeId("PERF", i++),
      category: "render-blocking",
      severity: "medium",
      title: `Inline <style> blocks total ${(metrics.inlineStyleBytes / 1024).toFixed(1)} KB`,
      detail:
        "Large inline style blocks block render. They cannot be cached and re-parsed on every navigation.",
      evidence: `inline style bytes: ${metrics.inlineStyleBytes}`,
      fix: "Move styles to external cacheable stylesheets. Keep only critical above-the-fold CSS inline (≤ 14 KB).",
    });
  }

  if (metrics.externalScriptCount > 10) {
    findings.push({
      id: makeId("PERF", i++),
      category: "render-blocking",
      severity: "medium",
      title: `${metrics.externalScriptCount} external <script> tags`,
      detail:
        "A high count of external scripts increases request overhead and parsing cost. Each must be fetched, parsed, and executed.",
      evidence: `external scripts: ${metrics.externalScriptCount}`,
      fix: "Bundle scripts, defer non-critical ones, and remove unused third-party scripts.",
    });
  }

  if (metrics.externalStylesheetCount > 5) {
    findings.push({
      id: makeId("PERF", i++),
      category: "render-blocking",
      severity: "low",
      title: `${metrics.externalStylesheetCount} external stylesheets`,
      detail:
        "Each external stylesheet is render-blocking and adds a round-trip. Browsers cannot render until all CSS arrives.",
      evidence: `external stylesheets: ${metrics.externalStylesheetCount}`,
      fix: "Concatenate and minify CSS. Aim for 1-3 stylesheets total.",
    });
  }

  if (metrics.imgCount > 0 && !metrics.hasLazyLoading) {
    findings.push({
      id: makeId("PERF", i++),
      category: "images",
      severity: metrics.imgCount > 10 ? "medium" : "low",
      title: `${metrics.imgCount} <img> tag(s) without lazy loading`,
      detail:
        "No `loading=\"lazy\"` attribute was detected on any image. Off-screen images are fetched eagerly, wasting bandwidth and delaying first paint.",
      evidence: `images: ${metrics.imgCount}, loading=\"lazy\" detected: no`,
      fix: "Add `loading=\"lazy\"` and `decoding=\"async\"` to off-screen images. Critical above-the-fold images should be eager.",
    });
  }

  if (!metrics.hasCompression) {
    findings.push({
      id: makeId("PERF", i++),
      category: "compression",
      severity: "high",
      title: "No HTTP compression detected",
      detail:
        "The response had no Content-Encoding (gzip or brotli). Text assets (HTML, CSS, JS) typically compress 70-90%, so this bloats bandwidth and slows first paint significantly.",
      evidence: "Content-Encoding: (missing)",
      fix: "Enable gzip or brotli compression at the web server / CDN for text/* content types.",
    });
  }

  if (!metrics.hasPreconnect) {
    findings.push({
      id: makeId("PERF", i++),
      category: "render-blocking",
      severity: "low",
      title: "No <link rel=\"preconnect\"> hints",
      detail:
        "No preconnect or dns-prefetch hints were detected. Cross-origin resources (CDNs, analytics, fonts) pay a full DNS+TLS handshake penalty on first request.",
      evidence: "<link rel=\"preconnect\">: (missing)",
      fix: "Add <link rel=\"preconnect\" href=\"https://your-cdn.com\"> for any critical cross-origin the page uses.",
    });
  }

  if (
    metrics.externalScriptCount > 0 &&
    !metrics.hasAsyncDeferScripts
  ) {
    findings.push({
      id: makeId("PERF", i++),
      category: "scripts",
      severity: "medium",
      title: "External scripts have no async/defer",
      detail:
        "External <script> tags without async/defer block HTML parsing, delaying first render and interactivity.",
      evidence: "no <script async> or <script defer> detected",
      fix: "Add `defer` to non-critical scripts (runs after HTML parse) or `async` for independent scripts.",
    });
  }

  return findings;
}

async function analyzePerformance(
  page: FetchedPage
): Promise<PerformanceDimension> {
  const metrics = extractPerformanceMetrics(page.rawHtml, page);
  const findings = analyzePerformanceRuleBased(metrics);
  let penalty = 0;
  for (const f of findings) penalty += sevPenalty[f.severity] ?? 1;
  const score = clamp(100 - penalty);
  const summary = buildPerformanceSummary(findings, metrics);
  return { score, findings, summary, metrics };
}

function buildPerformanceSummary(
  findings: PerformanceFinding[],
  metrics: ReturnType<typeof extractPerformanceMetrics>
): string {
  if (findings.length === 0) {
    return `Page is lean: ${metrics.pageSizeKb} KB HTML, ${metrics.externalScriptCount} external scripts, ${metrics.externalStylesheetCount} stylesheets, compression ${metrics.hasCompression ? "on" : "off"}, lazy images ${metrics.hasLazyLoading ? "on" : "off"}.`;
  }
  const high = findings.filter(
    (f) => f.severity === "high" || f.severity === "critical"
  ).length;
  return `${findings.length} performance finding(s) detected${
    high ? ` (${high} high/critical)` : ""
  }. HTML ${metrics.pageSizeKb} KB, ${metrics.externalScriptCount} external scripts, ${metrics.inlineScriptCount} inline blocks, ${metrics.imgCount} images. Priorities: enable compression, defer non-critical scripts, lazy-load off-screen images.`;
}

/* ============================================
 * ACCESSIBILITY dimension (rule-based + LLM)
 * ============================================ */

function analyzeAccessibilityRuleBased(
  html: string,
  page: FetchedPage
): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];
  let i = 0;

  // Images without alt
  const imgMatches = html.match(/<img\b[^>]*>/gi) || [];
  let imgWithoutAlt = 0;
  for (const img of imgMatches) {
    if (!/\balt=/i.test(img)) imgWithoutAlt++;
  }
  if (imgWithoutAlt > 0) {
    findings.push({
      id: makeId("A11Y", i++),
      category: "alt-text",
      severity: imgWithoutAlt > 5 ? "high" : "medium",
      title: `${imgWithoutAlt} <img> without alt text`,
      detail:
        "Images without an text alt attribute are invisible to screen readers and deprive visually impaired users of context. Decorative images should use alt=\"\".",
      evidence: `${imgWithoutAlt} of ${imgMatches.length} <img> tags missing alt`,
      fix: 'Add descriptive alt text to every meaningful <img>. Use alt="" only for purely decorative images.',
    });
  }

  // Inputs without associated <label>
  const inputMatches =
    html.match(
      /<input(?![^>]*\btype=["'](?:submit|button|reset|hidden|image)["'])[^>]*>/gi
    ) || [];
  let inputsWithoutLabel = 0;
  for (const inp of inputMatches) {
    const idMatch = inp.match(/\bid=["']([A-Za-z0-9_-]+)["']/i);
    const ariaLabel = /\baria-label=/i.test(inp);
    const ariaLabelledBy = /\baria-labelledby=/i.test(inp);
    if (!idMatch && !ariaLabel && !ariaLabelledBy) {
      inputsWithoutLabel++;
    } else if (idMatch) {
      const id = idMatch[1];
      // Look for <label for="id"> in the full html
      const re = new RegExp(
        `<label\\s+[^>]*\\bfor=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
        "i"
      );
      if (!re.test(html)) {
        // No matching <label for=> found
        if (!ariaLabel && !ariaLabelledBy) inputsWithoutLabel++;
      }
    }
  }
  if (inputsWithoutLabel > 0) {
    findings.push({
      id: makeId("A11Y", i++),
      category: "labels",
      severity: "high",
      title: `${inputsWithoutLabel} form input(s) without accessible label`,
      detail:
        "Inputs without an associated <label> (or aria-label) are unusable by screen reader users and difficult for everyone to use.",
      evidence: `${inputsWithoutLabel} input(s) without label/aria-label`,
      fix: 'Wrap each input in a <label> or add aria-label="<descriptive text>". Verify with a screen reader.',
    });
  }

  // Buttons without text
  const buttonMatches = html.match(/<button\b[^>]*>([\s\S]*?)<\/button>/gi) || [];
  let buttonsWithoutText = 0;
  for (const btn of buttonMatches) {
    const inner = btn
      .replace(/<button\b[^>]*>/i, "")
      .replace(/<\/button>/i, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!inner && !/\baria-label=/i.test(btn) && !/\baria-labelledby=/i.test(btn)) {
      buttonsWithoutText++;
    }
  }
  if (buttonsWithoutText > 0) {
    findings.push({
      id: makeId("A11Y", i++),
      category: "labels",
      severity: "medium",
      title: `${buttonsWithoutText} empty <button> element(s)`,
      detail:
        "Buttons without text content or aria-label are unannounced to screen readers and confusing for everyone.",
      evidence: `${buttonsWithoutText} button(s) with no text or aria-label`,
      fix: 'Add visible text inside each <button>, or aria-label="<action>" if using only an icon.',
    });
  }

  // Heading order — skip levels
  const headings = html.match(/<h([1-6])\b[^>]*>/gi) || [];
  let prevLevel = 0;
  let skippedHeading = false;
  for (const h of headings) {
    const m = h.match(/<h([1-6])/i);
    if (!m) continue;
    const lvl = parseInt(m[1], 10);
    if (prevLevel > 0 && lvl > prevLevel + 1) {
      skippedHeading = true;
      break;
    }
    prevLevel = lvl;
  }
  if (skippedHeading) {
    findings.push({
      id: makeId("A11Y", i++),
      category: "headings",
      severity: "low",
      title: "Heading hierarchy skips levels",
      detail:
        "Headings should not skip levels (e.g. <h1> → <h4>). Screen reader users navigate by heading structure; skipped levels are confusing.",
      evidence: "detected heading skip (e.g. h1 → h3 or h2 → h4)",
      fix: "Use sequential heading levels. Never jump from <h1> to <h4>; if you need a sub-section, use <h2> then <h3>.",
    });
  }

  // lang attribute
  const langMatch = html.match(/<html\s+[^>]*\blang=["']([A-Za-z-]+)["']/i);
  if (!langMatch) {
    findings.push({
      id: makeId("A11Y", i++),
      category: "language",
      severity: "medium",
      title: "Missing lang attribute on <html>",
      detail:
        "Without a lang attribute, screen readers cannot pick the correct pronunciation and voice for the content.",
      evidence: "<html lang=...>: (missing)",
      fix: 'Add a lang attribute to <html>, e.g. <html lang="en">.',
    });
  }

  // Form without autocomplete on sensitive inputs (info)
  const passwordInputs = html.match(
    /<input[^>]*\btype=["']password["'][^>]*>/gi
  ) || [];
  for (const pwd of passwordInputs) {
    if (!/\bautocomplete=/i.test(pwd)) {
      findings.push({
        id: makeId("A11Y", i++),
        category: "forms",
        severity: "low",
        title: "Password field without autocomplete attribute",
        detail:
          "Password fields without an explicit autocomplete attribute may break password manager integration, which is essential for users with cognitive disabilities and for secure password use.",
        evidence: "<input type=\"password\"> without autocomplete",
        fix: 'Add autocomplete="current-password" (login) or autocomplete="new-password" (signup) to password fields.',
      });
      break;
    }
  }

  return findings;
}

async function analyzeAccessibilityLLM(
  page: FetchedPage
): Promise<AccessibilityFinding[]> {
  const prompt = `You are KODAND, an expert WCAG/Section-508 accessibility auditor. Given the HTML snippet of a webpage, identify accessibility issues that the rule-based check might miss.

Focus on:
- ARIA roles / attributes that are incorrect or redundant
- Color contrast problems (if visible inline)
- Tab order / focus management issues
- Modal / dialog patterns without role="dialog" or focus trap
- Live regions without aria-live
- Decorative images with non-empty alt that should be alt=""
- Icon-only buttons missing aria-label
- Skipped heading levels
- Tabular data without proper <th scope>
- Video/audio without captions or transcripts
- Form validation errors not announced to assistive tech

Respond with STRICT, MINIFIED JSON ONLY — no markdown — in this exact shape:

{
  "findings": [
    {
      "category": "alt-text" | "aria" | "contrast" | "labels" | "headings" | "keyboard" | "language" | "forms",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "title": "<short title>",
      "detail": "<one or two sentence explanation>",
      "evidence": "<verbatim HTML snippet, max 200 chars>",
      "fix": "<concrete recommended fix>"
    }
  ]
}

Rules:
- Cap at 8 findings, sorted by severity (critical first).
- Do NOT duplicate findings already covered by the rule-based check (missing alt, inputs without label, empty buttons, skipped headings, missing lang, password without autocomplete).
- Do NOT invent issues. If the page is accessible, return an empty findings array.
- "evidence" MUST be a verbatim substring of the HTML snippet.

HTML snippet (first ~8KB):
"""
${page.rawHtml.slice(0, 8000)}
"""`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are KODAND, an expert WCAG accessibility auditor. Respond only with the requested JSON.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";
    const parsed = safeParseJson(raw);
    if (!parsed || !Array.isArray(parsed.findings)) return [];
    return parsed.findings.slice(0, 8).map((f: any, i: number) => ({
      id: makeId("A11Y-C", i),
      category: f.category || "aria",
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

async function analyzeAccessibility(
  page: FetchedPage
): Promise<AccessibilityDimension> {
  const ruleFindings = analyzeAccessibilityRuleBased(page.rawHtml, page);
  const llmFindings = await analyzeAccessibilityLLM(page);
  const findings = [...ruleFindings, ...llmFindings];
  let penalty = 0;
  for (const f of findings) penalty += sevPenalty[f.severity] ?? 1;
  const score = clamp(100 - penalty);
  const summary =
    findings.length === 0
      ? "No accessibility issues detected. Images have alt text, inputs have labels, headings are sequential, and lang is declared."
      : `${findings.length} accessibility finding(s) detected. Priorities: add alt text to images, label all form inputs, ensure sequential heading hierarchy, declare page language.`;
  return { score, findings, summary };
}

/* ============================================
 * Compose final ScanResult
 * ============================================ */

interface DimensionPack {
  content?: ContentDimension;
  security?: SecurityDimension;
  seo?: SeoDimension;
  performance?: PerformanceDimension;
  accessibility?: AccessibilityDimension;
}

function buildExecutiveSummary(args: {
  url: string;
  mode: ScanMode;
  modeLabel: string;
  digitalHealthScore: number;
  grade: string;
  pack: DimensionPack;
}): string {
  const host = (() => {
    try {
      return new URL(args.url).host;
    } catch {
      return args.url;
    }
  })();
  const tone =
    args.digitalHealthScore >= 85
      ? "in strong shape"
      : args.digitalHealthScore >= 70
      ? "in acceptable shape with clear room for improvement"
      : args.digitalHealthScore >= 50
      ? "in poor shape requiring prompt remediation"
      : "in critical shape requiring immediate action";
  const dimParts: string[] = [];
  if (args.pack.content)
    dimParts.push(`content optimization at ${Math.round(args.pack.content.score)}/100 (${args.pack.content.findings.length} findings)`);
  if (args.pack.security)
    dimParts.push(`security/privacy at ${Math.round(args.pack.security.score)}/100 (${args.pack.security.findings.length} findings)`);
  if (args.pack.seo)
    dimParts.push(`SEO at ${Math.round(args.pack.seo.score)}/100 (${args.pack.seo.findings.length} findings)`);
  if (args.pack.performance)
    dimParts.push(`performance at ${Math.round(args.pack.performance.score)}/100 (${args.pack.performance.findings.length} findings)`);
  if (args.pack.accessibility)
    dimParts.push(`accessibility at ${Math.round(args.pack.accessibility.score)}/100 (${args.pack.accessibility.findings.length} findings)`);

  return `KODAND's ${args.modeLabel} audit of ${host} found the site ${tone}. The score is ${Math.round(
    args.digitalHealthScore
  )}/100 (Grade ${args.grade}).${
    dimParts.length ? ` ${dimParts.join("; ")}.` : ""
  } The downloadable PDF report lists every issue and its recommended fix in priority order.`;
}

function buildTopPriorities(pack: DimensionPack): string[] {
  const priorities: string[] = [];
  const all = [
    ...(pack.security?.findings || []).map((f) => ({ sev: f.severity, src: "Security", title: f.title, fix: f.fix })),
    ...(pack.content?.findings || []).map((f) => ({ sev: f.severity, src: "Content", title: `${f.type}: ${f.excerpt.slice(0, 60)}`, fix: f.suggestion })),
    ...(pack.seo?.findings || []).map((f) => ({ sev: f.severity, src: "SEO", title: f.title, fix: f.fix })),
    ...(pack.performance?.findings || []).map((f) => ({ sev: f.severity, src: "Performance", title: f.title, fix: f.fix })),
    ...(pack.accessibility?.findings || []).map((f) => ({ sev: f.severity, src: "Accessibility", title: f.title, fix: f.fix })),
  ].sort((a, b) => sevRank(a.sev) - sevRank(b.sev));
  for (const f of all.slice(0, 6)) {
    priorities.push(`[${f.src}] ${f.title}: ${f.fix}`);
  }
  if (priorities.length === 0) {
    priorities.push("No critical issues — maintain current standards and schedule regular re-audits.");
  }
  return priorities;
}

/* ============================================
 * Endpoint
 * ============================================ */

export async function POST(req: NextRequest) {
  let body: { url?: string; mode?: ScanMode };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }
  const url = (body.url || "").trim();
  const mode = (body.mode as ScanMode) || "full";
  if (!url) return new Response("Missing url", { status: 400 });
  if (!["content", "security", "seo", "performance", "accessibility", "full"].includes(mode)) {
    return new Response("Invalid mode", { status: 400 });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return new Response("Only http(s) URLs are supported", { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ProgressEvent) => sendEvent(controller, e);
      const startTime = Date.now();
      const scanId = `kodand-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      // Heartbeat keep-alive: emit a heartbeat every 12s so any proxy/LB
      // between us and the client keeps the connection open (prevents 502
      // on slow scans). The client ignores heartbeat events.
      const heartbeatTimer = setInterval(() => {
        try {
          sendEvent(controller, { type: "heartbeat" });
        } catch {
          /* controller already closed */
        }
      }, 12000);

      try {
        // Cache check — if we have a fresh result for this URL+mode, return it
        // immediately. This is the #1 anti-ban measure: repeat scans of the
        // same URL within 5 minutes never re-query NVD / RDAP / crt.sh.
        const cached = readScanCache(url, mode);
        if (cached) {
          send({
            type: "stage",
            stage: "init",
            label: `Cached result available`,
            progress: 100,
            detail: `Returning cached scan from ${new Date(cached.scannedAt).toLocaleTimeString()}`,
          });
          send({ type: "log", message: `Cache hit — returning prior ${modeLabel(mode)} scan for ${url}.` });
          send({ type: "complete", result: cached });
          return;
        }

        send({
          type: "stage",
          stage: "init",
          label: `Initializing ${modeLabel(mode)} scan`,
          progress: 4,
          detail: `Target: ${url}`,
        });
        send({
          type: "log",
          message: `KODAND agent dispatched. Mode: ${modeLabel(mode)}. Target: ${url}`,
        });

        // Phase 1: fetch + parse (shared)
        const page = await fetchPage(url, send);
        if (!page) {
          controller.close();
          return;
        }

        // Compute base progress points for the dimensions we will run
        // so the progress bar advances smoothly across the chosen phases.
        const dims: ScanMode[] =
          mode === "full"
            ? ["content", "security", "seo", "performance", "accessibility"]
            : [mode];

        // Each dimension gets a progress window that depends on how many dims we run.
        // fetchPage already brought us to 24%. Remaining: 24 → 96 (72 points).
        const dimWindow = 72 / dims.length;
        const meta: PageMeta = {
          title: page.title,
          description: page.description,
          url,
          httpStatus: page.httpStatus,
          finalUrl: page.finalUrl,
          contentType: page.contentType,
          server: page.server,
          wordCount: page.wordCount,
          fetchMs: page.fetchMs,
        };

        const pack: DimensionPack = {};

        for (let di = 0; di < dims.length; di++) {
          const dim = dims[di];
          const baseProgress = 24 + di * dimWindow;
          const endProgress = 24 + (di + 1) * dimWindow;

          if (dim === "content") {
            send({
              type: "stage",
              stage: "content",
              label: "Content optimization analysis",
              progress: baseProgress,
            });
            send({ type: "log", message: "Computing readability, tone, and keyword metrics…" });
            send({ type: "log", message: "Dispatching LLM content optimization review…" });
            pack.content = await analyzeContent(page.visibleText);
            send({
              type: "log",
              message: `Content review complete: ${pack.content.findings.length} finding(s), readability ${Math.round(pack.content.metrics?.fleschReadingEase ?? 0)}/100 (${pack.content.metrics?.readingLevel || "—"}).`,
            });
            send({
              type: "stage",
              stage: "content",
              label: "Content analysis done",
              progress: endProgress,
            });
          } else if (dim === "security") {
            send({
              type: "stage",
              stage: "security-headers",
              label: "Security headers check",
              progress: baseProgress,
            });
            const midProgress = baseProgress + (endProgress - baseProgress) * 0.3;
            send({
              type: "stage",
              stage: "security-content",
              label: "Security content analysis",
              progress: midProgress,
            });
            // analyzeSecurity now does: headers + LLM content + NVD CVE deep
            // scan + RDAP WHOIS + DNS + TLS cert + crt.sh certificate
            // transparency — all from free, no-key public sources.
            pack.security = await analyzeSecurity(page, send);
            send({
              type: "log",
              message: `Security deep scan complete: ${pack.security.findings.length} finding(s), score ${Math.round(pack.security.score)}/100.`,
            });
            if (pack.security.intel) {
              const intel = pack.security.intel;
              send({
                type: "log",
                message: `Intel summary — ${intel.cveFindings.length} CVEs, ${
                  intel.whois ? "WHOIS ✓" : "WHOIS ✗"
                }, ${intel.dns ? "DNS ✓" : "DNS ✗"}, ${
                  intel.certificate ? "TLS ✓" : "TLS ✗"
                }, ${intel.certTransparency.length} CT-log entries, ${intel.discoveredSubdomains.length} subdomains.`,
              });
            }
            send({
              type: "stage",
              stage: "security-content",
              label: "Security deep scan done",
              progress: endProgress,
            });
          } else if (dim === "seo") {
            send({
              type: "stage",
              stage: "seo-meta",
              label: "SEO meta & on-page checks",
              progress: baseProgress,
            });
            send({ type: "log", message: "Inspecting meta tags, headings, structured data…" });
            const checks = extractSeoChecks(page.rawHtml, page);
            const ruleFindings = analyzeSeoRuleBased(checks);
            const midProgress = baseProgress + (endProgress - baseProgress) * 0.5;
            send({
              type: "stage",
              stage: "seo-content",
              label: "SEO content analysis",
              progress: midProgress,
            });
            send({ type: "log", message: "Dispatching LLM SEO content review…" });
            const llmFindings = await analyzeSeoContentLLM(page, checks);
            const findings = [...ruleFindings, ...llmFindings];
            let penalty = 0;
            for (const f of findings) penalty += sevPenalty[f.severity] ?? 1;
            pack.seo = {
              score: clamp(100 - penalty),
              findings,
              summary: buildSeoSummary(findings, checks),
              checks: {
                hasTitle: checks.hasTitle,
                titleLength: checks.titleLength,
                hasDescription: checks.hasDescription,
                descriptionLength: checks.descriptionLength,
                hasCanonical: checks.hasCanonical,
                hasOgTags: checks.hasOgTags,
                hasTwitterCard: checks.hasTwitterCard,
                h1Count: checks.h1Count,
                h2Count: checks.h2Count,
                h3Count: checks.h3Count,
                hasStructuredData: checks.hasStructuredData,
                hasViewport: checks.hasViewport,
                hasRobotsMeta: checks.hasRobotsMeta,
                hasLang: checks.hasLang,
                lang: checks.lang,
                hasFavicon: checks.hasFavicon,
              },
            };
            send({
              type: "log",
              message: `SEO review complete: ${findings.length} finding(s).`,
            });
            send({
              type: "stage",
              stage: "seo-content",
              label: "SEO analysis done",
              progress: endProgress,
            });
          } else if (dim === "performance") {
            send({
              type: "stage",
              stage: "performance-metrics",
              label: "Measuring page weight & assets",
              progress: baseProgress,
            });
            send({ type: "log", message: "Counting scripts, stylesheets, images, inline blocks…" });
            const metrics = extractPerformanceMetrics(page.rawHtml, page);
            const midProgress = baseProgress + (endProgress - baseProgress) * 0.5;
            send({
              type: "stage",
              stage: "performance-analysis",
              label: "Performance analysis",
              progress: midProgress,
            });
            const findings = analyzePerformanceRuleBased(metrics);
            send({ type: "log", message: "Dispatching LLM performance review…" });
            const llmFindings = await analyzePerformanceLLM(page, metrics);
            const allFindings = [...findings, ...llmFindings];
            let penalty = 0;
            for (const f of allFindings) penalty += sevPenalty[f.severity] ?? 1;
            pack.performance = {
              score: clamp(100 - penalty),
              findings: allFindings,
              summary: buildPerformanceSummary(allFindings, metrics),
              metrics,
            };
            send({
              type: "log",
              message: `Performance review complete: ${allFindings.length} finding(s).`,
            });
            send({
              type: "stage",
              stage: "performance-analysis",
              label: "Performance analysis done",
              progress: endProgress,
            });
          } else if (dim === "accessibility") {
            send({
              type: "stage",
              stage: "accessibility-analysis",
              label: "Accessibility analysis",
              progress: baseProgress,
            });
            send({ type: "log", message: "Checking alt text, labels, headings, ARIA…" });
            const ruleFindings = analyzeAccessibilityRuleBased(page.rawHtml, page);
            const midProgress = baseProgress + (endProgress - baseProgress) * 0.5;
            send({
              type: "stage",
              stage: "accessibility-analysis",
              label: "WCAG content review",
              progress: midProgress,
            });
            send({ type: "log", message: "Dispatching LLM WCAG review…" });
            const llmFindings = await analyzeAccessibilityLLM(page);
            const findings = [...ruleFindings, ...llmFindings];
            let penalty = 0;
            for (const f of findings) penalty += sevPenalty[f.severity] ?? 1;
            pack.accessibility = {
              score: clamp(100 - penalty),
              findings,
              summary:
                findings.length === 0
                  ? "No accessibility issues detected."
                  : `${findings.length} accessibility finding(s) detected.`,
            };
            send({
              type: "log",
              message: `Accessibility review complete: ${findings.length} finding(s).`,
            });
            send({
              type: "stage",
              stage: "accessibility-analysis",
              label: "Accessibility analysis done",
              progress: endProgress,
            });
          }
        }

        // Phase: score
        send({
          type: "stage",
          stage: "score",
          label: "Computing score",
          progress: 96,
        });

        let digitalHealthScore: number;
        if (mode === "full") {
          // Weighted: security 28, performance 22, accessibility 22, seo 18, content 10
          const g = pack.content?.score ?? 100;
          const s = pack.security?.score ?? 100;
          const seo = pack.seo?.score ?? 100;
          const p = pack.performance?.score ?? 100;
          const a = pack.accessibility?.score ?? 100;
          digitalHealthScore = clamp(g * 0.1 + s * 0.28 + seo * 0.18 + p * 0.22 + a * 0.22);
        } else {
          digitalHealthScore = clamp(
            pack[mode]?.score ?? 100
          );
        }
        const grade = gradeFromScore(digitalHealthScore);
        send({
          type: "log",
          message: `Score computed: ${Math.round(digitalHealthScore)}/100 (Grade ${grade}).`,
        });

        // Phase: finalize
        send({
          type: "stage",
          stage: "finalize",
          label: "Finalizing report",
          progress: 99,
        });

        const topPriorities = buildTopPriorities(pack);
        const executiveSummary = buildExecutiveSummary({
          url: page.finalUrl,
          mode,
          modeLabel: modeLabel(mode),
          digitalHealthScore,
          grade,
          pack,
        });

        const result: ScanResult = {
          id: scanId,
          url,
          mode,
          modeLabel: modeLabel(mode),
          scannedAt: new Date().toISOString(),
          meta,
          content: pack.content,
          grammar: pack.content, // alias for backward compat
          security: pack.security,
          seo: pack.seo,
          performance: pack.performance,
          accessibility: pack.accessibility,
          digitalHealthScore,
          grade,
          executiveSummary,
          topPriorities,
        };

        // Cache the result so repeat scans of the same URL+mode within 5 minutes
        // return instantly without re-querying NVD / RDAP / crt.sh (anti-ban).
        writeScanCache(url, mode, result);

        send({
          type: "stage",
          stage: "finalize",
          label: "Report ready",
          progress: 100,
        });
        send({ type: "complete", result });
        send({
          type: "log",
          message: `${modeLabel(mode)} scan complete in ${((Date.now() - startTime) / 1000).toFixed(
            1
          )}s. PDF report ready.`,
        });
      } catch (err) {
        const msg = (err as Error)?.message || "Unknown error during scan.";
        send({ type: "error", message: msg });
      } finally {
        clearInterval(heartbeatTimer);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/* LLM perf review (kept separate to reduce main function size) */
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
- Do NOT duplicate findings the rule check already covers (page weight, inline script count, inline script bytes, inline style bytes, external script count, external stylesheet count, missing lazy loading, missing compression, missing preconnect, no async/defer).
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
        {
          role: "assistant",
          content:
            "You are KODAND, an expert performance auditor. Respond only with the requested JSON.",
        },
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
