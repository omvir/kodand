/**
 * KODAND Keywords API — keyword research endpoints.
 *
 * POST /api/keywords { action: "suggest" | "analyze" | "questions", query: string }
 */

import {
  getAutocompleteSuggestions,
  analyzeKeyword,
  getQuestionKeywords,
} from "@/lib/keyword-research";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { action?: string; query?: string; language?: string; country?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action || "suggest";
  const query = (body.query || "").trim();
  if (!query) {
    return Response.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    if (action === "suggest") {
      const suggestions = await getAutocompleteSuggestions(
        query,
        body.language || "en",
        body.country || "us"
      );
      return Response.json({ suggestions });
    }

    if (action === "analyze") {
      const analysis = await analyzeKeyword(query);
      if (!analysis) {
        return Response.json(
          { error: "Keyword analysis failed" },
          { status: 500 }
        );
      }
      return Response.json({ analysis });
    }

    if (action === "questions") {
      const questions = await getQuestionKeywords(query);
      return Response.json({ suggestions: questions });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message || "Unknown error" },
      { status: 500 }
    );
  }
}
