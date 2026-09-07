/**
 * KODAND fetch-page module — HTTP fetch + HTML parse (shared across all scan modes).
 */

import { ProgressEvent } from "@/lib/audit-types";
import {
  UA,
  SECURITY_HEADERS,
  FetchedPage,
  htmlToText,
  extractTitleAndDescription,
  countWords,
  detectMixedContent,
} from "./types";

export async function fetchPage(
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
