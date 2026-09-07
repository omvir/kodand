/**
 * KODAND Marketing Tools — meta tag generation, content gap analysis, competitor comparison.
 */

import ZAI from "z-ai-web-dev-sdk";

export interface MetaTagSuggestion {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  twitterTitle: string;
  twitterDescription: string;
  keywords: string[];
  canonicalUrl: string;
  structuredData: Record<string, any>;
}

export interface ContentGapResult {
  missingTopics: { topic: string; priority: "high" | "medium" | "low"; reason: string }[];
  competitorStrengths: string[];
  contentRecommendations: string[];
  estimatedImpact: string;
}

export interface SocialPreview {
  platform: "facebook" | "twitter" | "linkedin";
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  issues: string[];
}

/* ============================================
 * Meta Tag Generator
 * ============================================ */

export async function generateMetaTags(
  url: string,
  pageTitle?: string,
  pageDescription?: string,
  targetKeyword?: string
): Promise<MetaTagSuggestion | null> {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // use as-is
  }

  const prompt = `You are KODAND, an expert SEO meta tag optimizer. Generate optimized meta tags for the following page.

URL: ${url}
Current title: ${pageTitle || "(none)"}
Current description: ${pageDescription || "(none)"}
Target keyword: ${targetKeyword || "(not specified)"}

Respond with STRICT, MINIFIED JSON ONLY — no markdown — in this exact shape:

{
  "title": "<optimized title tag, 50-60 chars, keyword near start>",
  "description": "<compelling meta description, 120-160 chars, include CTA>",
  "ogTitle": "<Open Graph title, can be slightly different from page title>",
  "ogDescription": "<Open Graph description, optimized for social sharing>",
  "ogImage": "<suggested og:image description — the user should create this image>",
  "twitterCard": "summary_large_image",
  "twitterTitle": "<Twitter card title>",
  "twitterDescription": "<Twitter card description, compelling for Twitter audience>",
  "keywords": ["<5-8 target keywords>"],
  "canonicalUrl": "${url}",
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "<page name>",
    "description": "<page description>",
    "url": "${url}"
  }
}

Rules:
- Title: 50-60 chars, target keyword near the start, include brand at end
- Description: 120-160 chars, include primary keyword, end with a CTA
- OG/Twitter: slightly different angles for social engagement
- Keywords: realistic, not stuffed
- Structured data: valid schema.org JSON-LD`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are KODAND, an expert SEO meta tag optimizer. Respond only with the requested JSON.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    }
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      cleaned = cleaned.slice(first, last + 1);
    }
    return JSON.parse(cleaned) as MetaTagSuggestion;
  } catch {
    // Robust heuristic fallback if LLM is unavailable
    const cleanTitle = pageTitle ? pageTitle.trim() : host.charAt(0).toUpperCase() + host.slice(1);
    return {
      title: `${cleanTitle} — Official Website & Digital Solutions`,
      description: pageDescription || `Explore ${cleanTitle}. Discover top-rated features, insights, and comprehensive resources on our official platform.`,
      ogTitle: `${cleanTitle} | Official Online Portal`,
      ogDescription: `Connect with ${cleanTitle} for comprehensive services and resources.`,
      ogImage: `https://${host}/og-preview.png`,
      twitterCard: "summary_large_image",
      twitterTitle: cleanTitle,
      twitterDescription: `Official updates and announcements from ${cleanTitle}.`,
      keywords: [host, "official", "services", "technology", "solutions", targetKeyword].filter(Boolean) as string[],
      canonicalUrl: url,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: cleanTitle,
        description: pageDescription || `Official website of ${cleanTitle}`,
        url,
      },
    };
  }
}

/* ============================================
 * Content Gap Analysis
 * ============================================ */

export async function analyzeContentGap(
  targetUrl: string,
  targetContent: string,
  competitorUrl?: string,
  competitorContent?: string
): Promise<ContentGapResult | null> {
  const prompt = `You are KODAND, an expert content strategist. Analyze the content of the target page and identify content gaps — topics, keywords, and areas the page should cover but doesn't.

Target URL: ${targetUrl}
Target content (first 3000 chars):
"""
${targetContent.slice(0, 3000)}
"""

${
  competitorUrl && competitorContent
    ? `Competitor URL: ${competitorUrl}\nCompetitor content (first 3000 chars):\n"""\n${competitorContent.slice(0, 3000)}\n"""`
    : "No competitor content provided — analyze against general best practices for this topic."
}

Respond with STRICT, MINIFIED JSON ONLY — no markdown — in this shape:

{
  "missingTopics": [
    { "topic": "<topic name>", "priority": "high" | "medium" | "low", "reason": "<why this topic matters>" }
  ],
  "competitorStrengths": ["<what competitors do better>"],
  "contentRecommendations": ["<specific content additions to make>"],
  "estimatedImpact": "<1-2 sentence impact estimate if recommendations are implemented>"
}

Rules:
- missingTopics: 5-10 topics, sorted by priority
- contentRecommendations: 3-5 actionable recommendations
- Be specific, not generic`;

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are KODAND, an expert content strategist. Respond only with the requested JSON.",
        },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content || "";
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    }
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      cleaned = cleaned.slice(first, last + 1);
    }
    return JSON.parse(cleaned) as ContentGapResult;
  } catch {
    return null;
  }
}

/* ============================================
 * Social Preview Generator
 * ============================================ */

export function generateSocialPreviews(
  url: string,
  title?: string,
  description?: string,
  ogTitle?: string,
  ogDescription?: string,
  ogImage?: string,
  twitterCard?: string,
  twitterTitle?: string,
  twitterDescription?: string,
  twitterImage?: string
): SocialPreview[] {
  const previews: SocialPreview[] = [];

  // Facebook
  const fbIssues: string[] = [];
  if (!ogTitle && !title) fbIssues.push("No og:title or title tag — Facebook will use the URL");
  if (!ogDescription && !description) fbIssues.push("No og:description — Facebook may show random page text");
  if (!ogImage) fbIssues.push("No og:image — no preview image on Facebook shares");
  previews.push({
    platform: "facebook",
    title: ogTitle || title || url,
    description: ogDescription || description || "",
    imageUrl: ogImage,
    url,
    issues: fbIssues,
  });

  // Twitter
  const twIssues: string[] = [];
  if (!twitterCard) twIssues.push("No twitter:card — Twitter will use a basic card");
  if (!twitterTitle && !ogTitle && !title) twIssues.push("No twitter:title — Twitter will use the URL");
  if (!twitterImage && !ogImage) twIssues.push("No twitter:image — no image in tweets");
  previews.push({
    platform: "twitter",
    title: twitterTitle || ogTitle || title || url,
    description: twitterDescription || ogDescription || description || "",
    imageUrl: twitterImage || ogImage,
    url,
    issues: twIssues,
  });

  // LinkedIn
  const liIssues: string[] = [];
  if (!ogTitle && !title) liIssues.push("No og:title — LinkedIn will use the URL");
  if (!ogImage) liIssues.push("No og:image — LinkedIn shares without images get 98% fewer clicks");
  previews.push({
    platform: "linkedin",
    title: ogTitle || title || url,
    description: ogDescription || description || "",
    imageUrl: ogImage,
    url,
    issues: liIssues,
  });

  return previews;
}
