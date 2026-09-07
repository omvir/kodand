/**
 * KODAND SEO & Discoverability scanner — meta tags, headings, structured data, mobile, social.
 */

import ZAI from "z-ai-web-dev-sdk";
import { SeoDimension, SeoFinding } from "@/lib/audit-types";
import {
  FetchedPage,
  extractMetaTag,
  makeId,
  normalizeSeverity,
  safeParseJson,
  clamp,
  sevPenalty,
} from "./types";

/* ============================================
 * Rule-based SEO checks
 * ============================================ */

export function extractSeoChecks(html: string, page: FetchedPage) {
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
    findings.push({ id: makeId("SEO", i++), category: "meta", severity: "high", title: "Missing <title> tag", detail: "No <title> tag was found. The title is the single most important on-page SEO signal and the primary line in search results.", evidence: "<title>: (missing)", fix: "Add a unique, descriptive <title> tag (50-60 characters) describing the page's purpose." });
  } else if (checks.titleLength > 60) {
    findings.push({ id: makeId("SEO", i++), category: "meta", severity: "low", title: "Title is too long", detail: `Title is ${checks.titleLength} characters. Search engines truncate titles around 60 characters.`, evidence: `title length: ${checks.titleLength}`, fix: "Trim the title to 50-60 characters. Move branding to the end (e.g. 'Page Topic — Brand')." });
  } else if (checks.titleLength < 10) {
    findings.push({ id: makeId("SEO", i++), category: "meta", severity: "medium", title: "Title is too short", detail: `Title is only ${checks.titleLength} characters, which is too brief to communicate the page's purpose or include target keywords.`, evidence: `title length: ${checks.titleLength}`, fix: "Expand the title to 30-60 characters with descriptive, keyword-rich phrasing." });
  }

  if (!checks.hasDescription) {
    findings.push({ id: makeId("SEO", i++), category: "meta", severity: "high", title: "Missing meta description", detail: "No meta description was found. The description is what search engines show under your title in results and heavily influences click-through.", evidence: '<meta name="description">: (missing)', fix: "Add a unique meta description of 120-160 characters summarizing the page." });
  } else if (checks.descriptionLength > 160) {
    findings.push({ id: makeId("SEO", i++), category: "meta", severity: "low", title: "Meta description too long", detail: `Description is ${checks.descriptionLength} characters. Search engines truncate descriptions around 160 characters.`, evidence: `description length: ${checks.descriptionLength}`, fix: "Trim the meta description to 120-160 characters with the key idea up front." });
  } else if (checks.descriptionLength < 50 && checks.hasDescription) {
    findings.push({ id: makeId("SEO", i++), category: "meta", severity: "low", title: "Meta description too short", detail: `Description is only ${checks.descriptionLength} characters, too brief to be compelling in search results.`, evidence: `description length: ${checks.descriptionLength}`, fix: "Expand the meta description to 120-160 characters with a clear value proposition." });
  }

  if (!checks.hasCanonical) {
    findings.push({ id: makeId("SEO", i++), category: "links", severity: "medium", title: "Missing canonical link", detail: 'No <link rel="canonical"> tag was found. Without it, search engines may index duplicate URLs separately, splitting ranking signals.', evidence: '<link rel="canonical">: (missing)', fix: 'Add <link rel="canonical" href="https://your-canonical-url/"> in the <head>.' });
  }

  if (!checks.hasOgTags) {
    findings.push({ id: makeId("SEO", i++), category: "social", severity: "medium", title: "Missing Open Graph tags", detail: "No Open Graph (og:title, og:description, og:image) tags were found. Social shares will render as bare links with no preview card.", evidence: "og:title / og:description / og:image: (missing)", fix: "Add og:title, og:description, og:image, and og:url meta tags in the <head>." });
  }

  if (!checks.hasTwitterCard) {
    findings.push({ id: makeId("SEO", i++), category: "social", severity: "low", title: "Missing Twitter Card meta", detail: "No twitter:card meta was found. Tweets linking to this page will not show a rich preview.", evidence: "twitter:card: (missing)", fix: 'Add <meta name="twitter:card" content="summary_large_image"> plus twitter:title/description/image.' });
  }

  if (checks.h1Count === 0) {
    findings.push({ id: makeId("SEO", i++), category: "headings", severity: "high", title: "No <h1> heading", detail: "No <h1> was found. The H1 is the most important on-page heading for both accessibility and SEO — it tells search engines what the page is about.", evidence: "<h1> count: 0", fix: "Add exactly one descriptive <h1> describing the page's main topic." });
  } else if (checks.h1Count > 1) {
    findings.push({ id: makeId("SEO", i++), category: "headings", severity: "low", title: `Multiple <h1> headings (${checks.h1Count})`, detail: "Multiple H1 tags were found. While not strictly wrong, a single H1 per page is the recommended best practice for clear topical hierarchy.", evidence: `<h1> count: ${checks.h1Count}`, fix: "Use exactly one <h1> per page; demote additional top-level headings to <h2>." });
  }

  if (!checks.hasStructuredData) {
    findings.push({ id: makeId("SEO", i++), category: "structured-data", severity: "medium", title: "No structured data (JSON-LD)", detail: "No JSON-LD structured data was detected. Without schema.org markup, the page cannot earn rich results (reviews, FAQ, breadcrumbs, sitelinks) in search.", evidence: '<script type="application/ld+json">: (missing)', fix: "Add JSON-LD structured data describing the page (e.g. Article, BreadcrumbList, Organization, FAQPage)." });
  }

  if (!checks.hasViewport) {
    findings.push({ id: makeId("SEO", i++), category: "mobile", severity: "critical", title: "Missing viewport meta tag", detail: "No viewport meta tag was found. The page will render as a desktop layout on mobile, which Google penalizes heavily (mobile-first indexing).", evidence: '<meta name="viewport">: (missing)', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> in the <head>.' });
  }

  if (!checks.hasLang) {
    findings.push({ id: makeId("SEO", i++), category: "content", severity: "low", title: "Missing lang attribute on <html>", detail: "The <html> tag has no lang attribute. Screen readers and search engines cannot determine the page's primary language.", evidence: "<html lang=...>: (missing)", fix: 'Add a lang attribute to <html>, e.g. <html lang="en">.' });
  }

  if (!checks.hasRobotsMeta) {
    findings.push({ id: makeId("SEO", i++), category: "meta", severity: "info", title: "No robots meta tag", detail: 'No <meta name="robots"> directive was found. By default the page is indexable and followable — which is usually correct, but explicit declaration is a best practice.', evidence: '<meta name="robots">: (missing)', fix: 'Optionally add <meta name="robots" content="index, follow"> for explicit indexability.' });
  }

  if (!checks.hasFavicon) {
    findings.push({ id: makeId("SEO", i++), category: "meta", severity: "info", title: "No favicon detected", detail: "No favicon link was found. Browsers will request /favicon.ico by default and log 404s; a favicon also reinforces brand identity in tabs and bookmarks.", evidence: '<link rel="icon">: (missing)', fix: 'Add <link rel="icon" href="/favicon.ico"> and ideally multiple sizes (32, 192, 512).' });
  }

  return findings;
}

/* ============================================
 * LLM-based SEO content review
 * ============================================ */

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
        { role: "assistant", content: "You are KODAND, an expert SEO auditor. Respond only with the requested JSON." },
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

/* ============================================
 * Full SEO analysis
 * ============================================ */

export async function analyzeSeo(page: FetchedPage): Promise<SeoDimension> {
  const checks = extractSeoChecks(page.rawHtml, page);
  const ruleFindings = analyzeSeoRuleBased(checks);
  const llmFindings = await analyzeSeoContentLLM(page, checks);
  const findings = [...ruleFindings, ...llmFindings];
  let penalty = 0;
  for (const f of findings) penalty += sevPenalty[f.severity] ?? 1;
  const score = clamp(100 - penalty);
  const summary = buildSeoSummary(findings, checks);
  return {
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
