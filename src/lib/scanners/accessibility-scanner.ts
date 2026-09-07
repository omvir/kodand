/**
 * KODAND Accessibility & a11y scanner — alt text, ARIA, contrast, forms, keyboard, language.
 */

import ZAI from "z-ai-web-dev-sdk";
import { AccessibilityDimension, AccessibilityFinding } from "@/lib/audit-types";
import {
  FetchedPage,
  makeId,
  normalizeSeverity,
  safeParseJson,
  clamp,
  sevPenalty,
} from "./types";

/* ============================================
 * Rule-based accessibility analysis
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
    findings.push({ id: makeId("A11Y", i++), category: "alt-text", severity: imgWithoutAlt > 5 ? "high" : "medium", title: `${imgWithoutAlt} <img> without alt text`, detail: 'Images without an text alt attribute are invisible to screen readers and deprive visually impaired users of context. Decorative images should use alt="".', evidence: `${imgWithoutAlt} of ${imgMatches.length} <img> tags missing alt`, fix: 'Add descriptive alt text to every meaningful <img>. Use alt="" only for purely decorative images.' });
  }

  // Inputs without associated <label>
  const inputMatches = html.match(/<input(?![^>]*\btype=["'](?:submit|button|reset|hidden|image)["'])[^>]*>/gi) || [];
  let inputsWithoutLabel = 0;
  for (const inp of inputMatches) {
    const idMatch = inp.match(/\bid=["']([A-Za-z0-9_-]+)["']/i);
    const ariaLabel = /\baria-label=/i.test(inp);
    const ariaLabelledBy = /\baria-labelledby=/i.test(inp);
    if (!idMatch && !ariaLabel && !ariaLabelledBy) {
      inputsWithoutLabel++;
    } else if (idMatch) {
      const id = idMatch[1];
      const re = new RegExp(
        `<label\\s+[^>]*\\bfor=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
        "i"
      );
      if (!re.test(html)) {
        if (!ariaLabel && !ariaLabelledBy) inputsWithoutLabel++;
      }
    }
  }
  if (inputsWithoutLabel > 0) {
    findings.push({ id: makeId("A11Y", i++), category: "labels", severity: "high", title: `${inputsWithoutLabel} form input(s) without accessible label`, detail: "Inputs without an associated <label> (or aria-label) are unusable by screen reader users and difficult for everyone to use.", evidence: `${inputsWithoutLabel} input(s) without label/aria-label`, fix: 'Wrap each input in a <label> or add aria-label="<descriptive text>". Verify with a screen reader.' });
  }

  // Buttons without text
  const buttonMatches = html.match(/<button\b[^>]*>([\s\S]*?)<\/button>/gi) || [];
  let buttonsWithoutText = 0;
  for (const btn of buttonMatches) {
    const inner = btn.replace(/<button\b[^>]*>/i, "").replace(/<\/button>/i, "").replace(/<[^>]+>/g, "").trim();
    if (!inner && !/\baria-label=/i.test(btn) && !/\baria-labelledby=/i.test(btn)) {
      buttonsWithoutText++;
    }
  }
  if (buttonsWithoutText > 0) {
    findings.push({ id: makeId("A11Y", i++), category: "labels", severity: "medium", title: `${buttonsWithoutText} empty <button> element(s)`, detail: "Buttons without text content or aria-label are unannounced to screen readers and confusing for everyone.", evidence: `${buttonsWithoutText} button(s) with no text or aria-label`, fix: 'Add visible text inside each <button>, or aria-label="<action>" if using only an icon.' });
  }

  // Heading order — skip levels
  const headings = html.match(/<h([1-6])\b[^>]*>/gi) || [];
  let prevLevel = 0;
  let skippedHeading = false;
  for (const h of headings) {
    const m = h.match(/<h([1-6])/i);
    if (!m) continue;
    const lvl = parseInt(m[1], 10);
    if (prevLevel > 0 && lvl > prevLevel + 1) { skippedHeading = true; break; }
    prevLevel = lvl;
  }
  if (skippedHeading) {
    findings.push({ id: makeId("A11Y", i++), category: "headings", severity: "low", title: "Heading hierarchy skips levels", detail: "Headings should not skip levels (e.g. <h1> → <h4>). Screen reader users navigate by heading structure; skipped levels are confusing.", evidence: "detected heading skip (e.g. h1 → h3 or h2 → h4)", fix: "Use sequential heading levels. Never jump from <h1> to <h4>; if you need a sub-section, use <h2> then <h3>." });
  }

  // lang attribute
  const langMatch = html.match(/<html\s+[^>]*\blang=["']([A-Za-z-]+)["']/i);
  if (!langMatch) {
    findings.push({ id: makeId("A11Y", i++), category: "language", severity: "medium", title: "Missing lang attribute on <html>", detail: "Without a lang attribute, screen readers cannot pick the correct pronunciation and voice for the content.", evidence: "<html lang=...>: (missing)", fix: 'Add a lang attribute to <html>, e.g. <html lang="en">.' });
  }

  // Password without autocomplete
  const passwordInputs = html.match(/<input[^>]*\btype=["']password["'][^>]*>/gi) || [];
  for (const pwd of passwordInputs) {
    if (!/\bautocomplete=/i.test(pwd)) {
      findings.push({ id: makeId("A11Y", i++), category: "forms", severity: "low", title: "Password field without autocomplete attribute", detail: "Password fields without an explicit autocomplete attribute may break password manager integration, which is essential for users with cognitive disabilities and for secure password use.", evidence: '<input type="password"> without autocomplete', fix: 'Add autocomplete="current-password" (login) or autocomplete="new-password" (signup) to password fields.' });
      break;
    }
  }

  return findings;
}

/* ============================================
 * LLM-based accessibility review
 * ============================================ */

async function analyzeAccessibilityLLM(page: FetchedPage): Promise<AccessibilityFinding[]> {
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
- Do NOT duplicate findings already covered by the rule-based check.
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
        { role: "assistant", content: "You are KODAND, an expert WCAG accessibility auditor. Respond only with the requested JSON." },
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

/* ============================================
 * Full accessibility analysis
 * ============================================ */

export async function analyzeAccessibility(page: FetchedPage): Promise<AccessibilityDimension> {
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
