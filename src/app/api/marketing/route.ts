/**
 * KODAND Marketing API — meta tag generation, content gap analysis.
 *
 * POST /api/marketing { action: "meta-generator" | "content-gap", ... }
 */

import { generateMetaTags, analyzeContentGap } from "@/lib/marketing-tools";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = body.action || "meta-generator";

  try {
    if (action === "meta-generator") {
      const url = (body.url || "").trim();
      if (!url) return Response.json({ error: "Missing url" }, { status: 400 });
      const result = await generateMetaTags(
        url,
        body.title,
        body.description,
        body.keyword
      );
      if (!result) {
        return Response.json({ error: "Meta tag generation failed" }, { status: 500 });
      }
      return Response.json({ metaTags: result });
    }

    if (action === "content-gap") {
      const targetUrl = (body.targetUrl || "").trim();
      const targetContent = (body.targetContent || "").trim();
      if (!targetUrl || !targetContent) {
        return Response.json(
          { error: "Missing targetUrl or targetContent" },
          { status: 400 }
        );
      }
      const result = await analyzeContentGap(
        targetUrl,
        targetContent,
        body.competitorUrl,
        body.competitorContent
      );
      if (!result) {
        return Response.json({ error: "Content gap analysis failed" }, { status: 500 });
      }
      return Response.json({ contentGap: result });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message || "Unknown error" },
      { status: 500 }
    );
  }
}
