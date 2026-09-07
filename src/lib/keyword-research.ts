/**
 * KODAND Keyword Research Engine — free-source keyword research.
 *
 * Data sources (all free, no API key):
 *   - Google Autocomplete API (suggestqueries.google.com/complete/search)
 *   - LLM-powered keyword analysis (z-ai-web-dev-sdk)
 *
 * No paid API integrations — all sources are free and public.
 */

import ZAI from "z-ai-web-dev-sdk";

export interface KeywordSuggestion {
  keyword: string;
  source: "autocomplete" | "related" | "llm";
}

export interface KeywordAnalysis {
  keyword: string;
  intent: "informational" | "navigational" | "transactional" | "commercial";
  difficulty: "easy" | "medium" | "hard" | "very-hard";
  difficultyScore: number; // 0-100
  suggestedTitle: string;
  suggestedDescription: string;
  relatedKeywords: string[];
  longTailVariations: string[];
  contentIdeas: string[];
  serpFeatures: string[];
}

export interface SerpPreview {
  title: string;
  url: string;
  description: string;
  breadcrumbs: string[];
  sitelinks?: string[];
}

/* ============================================
 * Google Autocomplete suggestions
 * ============================================ */

export async function getAutocompleteSuggestions(
  query: string,
  language = "en",
  country = "us"
): Promise<KeywordSuggestion[]> {
  if (!query.trim()) return [];

  const suggestions: KeywordSuggestion[] = [];

  // Base query suggestions
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
      query
    )}&hl=${language}&gl=${country}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KODAND-Research/1.0; +https://kodand.pages.dev)",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        for (const s of data[1]) {
          if (typeof s === "string" && s.trim()) {
            suggestions.push({ keyword: s.trim(), source: "autocomplete" });
          }
        }
      }
    }
  } catch {
    // Autocomplete failed — continue with other sources
  }

  // Alphabet expansion (a-z suffix)
  const alphabetExpansion: string[] = [];
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const fetchPromises = letters.slice(0, 10).map(async (letter) => {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
        query + " " + letter
      )}&hl=${language}&gl=${country}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; KODAND-Research/1.0; +https://kodand.pages.dev)",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[1])) {
          for (const s of data[1]) {
            if (typeof s === "string" && s.trim()) {
              alphabetExpansion.push(s.trim());
            }
          }
        }
      }
    } catch {
      // ignore individual failures
    }
  });

  await Promise.allSettled(fetchPromises);

  // Deduplicate
  const seen = new Set(suggestions.map((s) => s.keyword.toLowerCase()));
  for (const kw of alphabetExpansion) {
    const lower = kw.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      suggestions.push({ keyword: kw, source: "autocomplete" });
    }
  }

  return suggestions;
}

/* ============================================
 * LLM-powered keyword analysis
 * ============================================ */

export async function analyzeKeyword(keyword: string): Promise<KeywordAnalysis | null> {
  const prompt = `You are KODAND, an expert SEO keyword research analyst. Analyze the following keyword and provide a comprehensive keyword analysis.

Keyword: "${keyword}"

Respond with STRICT, MINIFIED JSON ONLY — no markdown — in this exact shape:

{
  "keyword": "${keyword}",
  "intent": "informational" | "navigational" | "transactional" | "commercial",
  "difficulty": "easy" | "medium" | "hard" | "very-hard",
  "difficultyScore": <number 0-100>,
  "suggestedTitle": "<optimal page title for this keyword, 50-60 chars>",
  "suggestedDescription": "<optimal meta description, 120-160 chars>",
  "relatedKeywords": ["<5-10 closely related keywords>"],
  "longTailVariations": ["<5-10 long-tail keyword variations>"],
  "contentIdeas": ["<3-5 content/article ideas targeting this keyword>"],
  "serpFeatures": ["<expected SERP features, e.g. featured snippet, people also ask, video carousel, image pack>"]
}

Rules:
- Be realistic about difficulty — consider competition and search volume heuristics.
- Intent classification: informational (learning), navigational (finding a site), transactional (buying), commercial (comparing/researching before buying).
- Long-tail variations should be natural, specific, and less competitive.
- Content ideas should be actionable and specific.
- SERP features should reflect what Google typically shows for this query type.`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are KODAND, an expert SEO keyword research analyst. Respond only with the requested JSON.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";
    // Parse JSON
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    }
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      cleaned = cleaned.slice(first, last + 1);
    }
    return JSON.parse(cleaned) as KeywordAnalysis;
  } catch {
    return null;
  }
}

/* ============================================
 * SERP preview generator
 * ============================================ */

export function generateSerpPreview(
  url: string,
  title?: string,
  description?: string
): SerpPreview {
  let displayUrl = url;
  try {
    const u = new URL(url);
    displayUrl = u.hostname + u.pathname;
    if (displayUrl.endsWith("/")) displayUrl = displayUrl.slice(0, -1);
  } catch {
    // Use raw url
  }

  const breadcrumbs = displayUrl.split("/").filter(Boolean);

  return {
    title: title
      ? title.length > 60
        ? title.slice(0, 57) + "..."
        : title
      : "Untitled Page",
    url: displayUrl,
    description: description
      ? description.length > 160
        ? description.slice(0, 157) + "..."
        : description
      : "No meta description available. Add a compelling description of 120-160 characters.",
    breadcrumbs,
  };
}

/* ============================================
 * Bulk keyword suggestions (question-based)
 * ============================================ */

export async function getQuestionKeywords(
  seed: string
): Promise<KeywordSuggestion[]> {
  const prefixes = [
    "how to",
    "what is",
    "why does",
    "when to",
    "where to",
    "which",
    "can you",
    "is it",
    "does",
    "how much",
  ];

  const suggestions: KeywordSuggestion[] = [];
  const seen = new Set<string>();

  const fetchPromises = prefixes.map(async (prefix) => {
    try {
      const query = `${prefix} ${seed}`;
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(
        query
      )}&hl=en&gl=us`;
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; KODAND-Research/1.0; +https://kodand.pages.dev)",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[1])) {
          for (const s of data[1]) {
            if (typeof s === "string" && s.trim()) {
              const lower = s.trim().toLowerCase();
              if (!seen.has(lower)) {
                seen.add(lower);
                suggestions.push({ keyword: s.trim(), source: "related" });
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  });

  await Promise.allSettled(fetchPromises);
  return suggestions;
}
