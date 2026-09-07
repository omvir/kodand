/**
 * KODAND Security scanner — headers, content vulns, CVE deep scan, WHOIS, DNS, TLS, CT.
 */

import ZAI from "z-ai-web-dev-sdk";
import {
  SecurityDimension,
  SecurityFinding,
  ProgressEvent,
  DomainIntel,
} from "@/lib/audit-types";
import {
  gatherDomainIntel,
  intelToSecurityFindings,
} from "@/lib/domain-intel";
import {
  FetchedPage,
  SECURITY_HEADERS,
  makeId,
  normalizeSeverity,
  safeParseJson,
  clamp,
  sevPenalty,
} from "./types";

/* ============================================
 * Rule-based header analysis
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

/* ============================================
 * LLM-based content security review
 * ============================================ */

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

/* ============================================
 * Full security analysis
 * ============================================ */

export async function analyzeSecurity(
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
  intel?: DomainIntel
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
