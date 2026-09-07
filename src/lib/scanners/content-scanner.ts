/**
 * KODAND Content Optimizer scanner — spelling, grammar, style, clarity,
 * readability, tone, keyword density, reading time, SEO content fit.
 */

import ZAI from "z-ai-web-dev-sdk";
import { ContentDimension, ContentFinding } from "@/lib/audit-types";
import { computeContentMetrics } from "@/lib/content-metrics";
import {
  makeId,
  normalizeSeverity,
  safeParseJson,
  buildExcerptForLLM,
  clamp,
  sevPenalty,
} from "./types";

export async function analyzeContent(text: string): Promise<ContentDimension> {
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
