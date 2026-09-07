"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ScanResult,
  Severity,
} from "@/lib/audit-types";

/* ============================================================
 * KODAND — Ultra Pro Max PDF Report Generator
 * ------------------------------------------------------------
 * Premium, vector PDF (selectable text, no rasterization) built
 * entirely with jsPDF + jspdf-autotable.  No external dependencies
 * beyond what's already in package.json.
 *
 * Design language:
 *   - Dark forest-green cover with gold + emerald accents and a
 *     270° vector score gauge.
 *   - Every interior page has a sticky KODAND header strip and a
 *     centered "KODAND · mode · Page N of M" footer with the privacy
 *     note in small italic.
 *   - Major sections open with a full-width emerald-deep bar that
 *     carries the section number (in a gold disc) + title in white,
 *     underlined by a thin gold accent line.
 *   - Findings render as rounded cards with a severity stripe, a
 *     severity pill, a category badge, a bold title, the detail,
 *     a "» Fix:" line in emerald, and a monospace evidence block.
 *   - Tables use emerald-deep headers, pale-emerald zebra striping,
 *     severity-colored cells, and 3 mm cell padding.
 *   - Domain Intel lives on its own page (CVE table, WHOIS, DNS,
 *     TLS certificate with a status pill, certificate transparency
 *     with subdomain chips).
 *   - The Content Optimizer mode renders a readability gauge, four
 *     metric tiles, a horizontal keyword bar chart, and passive /
 *     long-sentence stats.
 *   - The last page is the consolidated fix list + methodology.
 * ============================================================ */

/* ---------- 1. DESIGN TOKENS ---------- */

const GREEN = {
  deep:      [47, 79, 62]    as [number, number, number], // #2F4F3E logo base — section bars + table headers
  primary:   [62, 91, 75]    as [number, number, number], // #3e5b4b — brand primary, accents, scores
  bright:    [92, 125, 102]  as [number, number, number], // #5C7D66 logo light highlight — highlights
  pale:      [232, 239, 233] as [number, number, number], // #e8efe9 cream — zebra stripe
  ink:       [26, 45, 33]    as [number, number, number], // #1A2D21 logo shadow — deep green text
  muted:     [138, 154, 144] as [number, number, number], // #8A9A90 logo inner detail silver — gray
  red:       [220, 38, 38]   as [number, number, number],
  amber:     [217, 119, 6]   as [number, number, number],
  yellow:    [202, 138, 4]   as [number, number, number],
  blue:      [29, 78, 216]   as [number, number, number],
  violet:    [124, 58, 237]  as [number, number, number],
  forest:    [22, 40, 30]    as [number, number, number], // #16281E — cover background (logo deep shadow family)
  gold:      [212, 175, 55]  as [number, number, number], // #d4af37 premium gold accent
  goldLight: [253, 230, 138] as [number, number, number], // pale gold
  slate:     [240, 245, 242] as [number, number, number], // pale green block
  border:    [140, 155, 145] as [number, number, number], // soft sage border
  body:      [31, 41, 55]    as [number, number, number], // slate-800 text
  bodyMute:  [75, 85, 99]    as [number, number, number], // slate-600 text
};

const PAGE = {
  margin: 20,             // left/right margin (mm)
  width: 170,             // 210 - 20*2 — content width
  headerHeight: 18,       // top header strip height
  footerY: 14,            // footer baseline offset from bottom
  topStart: 28,           // first usable Y on a non-cover page
};

/* ---------- 2. HELPERS ---------- */

function gradeColor(grade: string): [number, number, number] {
  switch (grade) {
    case "A": return GREEN.primary;
    case "B": return GREEN.bright;
    case "C": return GREEN.yellow;
    case "D": return GREEN.amber;
    default:  return GREEN.red;
  }
}

function severityColor(sev: string): [number, number, number] {
  switch (sev.toLowerCase()) {
    case "critical":
    case "high":   return GREEN.red;
    case "medium": return GREEN.amber;
    case "low":    return GREEN.blue;
    case "info":   return GREEN.muted;
    default:       return GREEN.muted;
  }
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 85) return GREEN.primary;
  if (score >= 70) return GREEN.bright;
  if (score >= 50) return GREEN.yellow;
  if (score >= 30) return GREEN.amber;
  return GREEN.red;
}

function safeText(s: unknown, max = 240): string {
  if (s == null) return "";
  const str = typeof s === "string" ? s : JSON.stringify(s);
  // Strip emojis + symbol ranges jsPDF's standard Helvetica can't render
  const cleaned = str.replace(
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu,
    ""
  );
  return cleaned.length > max ? cleaned.slice(0, max - 1) + "…" : cleaned;
}

function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setStroke(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function getLastY(doc: jsPDF, fallback = 0): number {
  // @ts-expect-error - jspdf-autotable injects lastAutoTable on the doc
  return (doc.lastAutoTable?.finalY as number) ?? fallback;
}

function pageBottomY(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - PAGE.footerY - 4;
}

function needsBreak(doc: jsPDF, y: number, need = 30): boolean {
  return y + need > pageBottomY(doc);
}

/* ---------- 3. DRAWING PRIMITIVES ---------- */

/**
 * Draw a circular arc using a series of short line segments.
 * jsPDF has no native arc primitive; this is the cleanest vector approach.
 *
 * Angles are in math degrees (0° = right, 90° = up). The PDF coordinate
 * system has y pointing down, so y is computed as `cy - r * sin(theta)`.
 *
 * The arc sweeps CLOCKWISE from `startDeg` to `endDeg` (i.e. decreasing
 * math angle), which is what we want for a 270° gauge that opens at the
 * bottom: startDeg=225 (lower-left), endDeg=-45 (lower-right).
 */
function drawArc(
  doc: jsPDF,
  cx: number, cy: number, r: number,
  startDeg: number, endDeg: number,
  color: [number, number, number],
  lineWidth: number,
  steps = 64
) {
  setStroke(doc, color);
  doc.setLineWidth(lineWidth);
  const sweep = startDeg - endDeg; // positive → decreasing angle → clockwise
  let prevX = cx + r * Math.cos((startDeg * Math.PI) / 180);
  let prevY = cy - r * Math.sin((startDeg * Math.PI) / 180);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const theta = startDeg - sweep * t;
    const x = cx + r * Math.cos((theta * Math.PI) / 180);
    const y = cy - r * Math.sin((theta * Math.PI) / 180);
    doc.line(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }
}

/**
 * Draw a 270° score gauge opening at the bottom (the "speedometer" look).
 * The track is a muted color, the score arc is colored by score band,
 * tick marks every 25%, and the score number + grade label sit in the
 * center.  Works on either a dark or light background (opts.onDark).
 */
function drawScoreGauge(
  doc: jsPDF,
  cx: number, cy: number, r: number,
  score: number,
  grade: string,
  opts: { onDark?: boolean; label?: string; valueLabel?: string; fontSize?: number } = {}
) {
  const onDark = opts.onDark === true;
  const track: [number, number, number] = onDark ? [42, 70, 56] : [226, 232, 240];
  const startDeg = 225;
  const endDeg = -45;
  const arcSpan = 270;

  // Background track (full 270°)
  drawArc(doc, cx, cy, r, startDeg, endDeg, track, 3.2, 80);

  // Score arc — emerald, scaled to score %
  const scoreNorm = Math.max(0, Math.min(100, score));
  if (scoreNorm > 0) {
    const scoreEnd = startDeg - arcSpan * (scoreNorm / 100);
    const sc = scoreColor(scoreNorm);
    const segs = Math.max(8, Math.round(80 * scoreNorm / 100));
    drawArc(doc, cx, cy, r, startDeg, scoreEnd, sc, 4.5, segs);
  }

  // Tick marks every 25% — subtle
  setStroke(doc, onDark ? [110, 231, 183] : [148, 163, 184]);
  doc.setLineWidth(0.3);
  for (let p = 0; p <= 4; p++) {
    const theta = ((startDeg - (arcSpan * p) / 4) * Math.PI) / 180;
    const r1 = r - 3;
    const r2 = r + 1;
    doc.line(
      cx + r1 * Math.cos(theta),
      cy - r1 * Math.sin(theta),
      cx + r2 * Math.cos(theta),
      cy - r2 * Math.sin(theta)
    );
  }

  // Inner disc for contrast
  setFill(doc, onDark ? GREEN.forest : [255, 255, 255]);
  doc.circle(cx, cy, r - 5, "F");

  // Label above the number
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, onDark ? [167, 243, 208] : GREEN.muted);
  doc.text(
    (opts.label || "DIGITAL HEALTH SCORE").toUpperCase(),
    cx, cy - 12,
    { align: "center" }
  );

  // Score number — big, bold, centered
  doc.setFont("helvetica", "bold");
  doc.setFontSize(opts.fontSize ?? 36);
  setText(doc, onDark ? [236, 253, 245] : GREEN.ink);
  doc.text(String(Math.round(score)), cx, cy + 4, { align: "center" });

  // Grade / value label below
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, gradeColor(grade));
  doc.text(
    opts.valueLabel || `Grade ${grade}`,
    cx, cy + 14,
    { align: "center" }
  );
}

/**
 * Faceted emerald ruby mark — vector approximation of the KODAND
 * gem, drawn with triangles. Used in the cover and page headers.
 */
function drawRubyMark(doc: jsPDF, x: number, y: number, size: number) {
  const cx = x + size / 2;
  const top = y;
  const midY = y + size * 0.42;
  const bottomY = y + size;
  const leftX = x;
  const rightX = x + size;
  // Body — two emerald triangles (the gem pavilion)
  setFill(doc, GREEN.primary);
  doc.triangle(cx, top, leftX, midY, cx, bottomY, "F");
  doc.triangle(cx, top, rightX, midY, cx, bottomY, "F");
  // Crown — paler top facets
  setFill(doc, [167, 243, 208]);
  doc.triangle(cx, top, leftX, midY, cx, midY, "F");
  doc.triangle(cx, top, rightX, midY, cx, midY, "F");
  // Table — brightest central facet
  setFill(doc, GREEN.bright);
  const tw = size * 0.35;
  doc.triangle(
    cx - tw / 2, midY - size * 0.05,
    cx + tw / 2, midY - size * 0.05,
    cx, midY + size * 0.08,
    "F"
  );
  // Facet outline
  setStroke(doc, GREEN.deep);
  doc.setLineWidth(0.3);
  doc.line(cx, top, leftX, midY);
  doc.line(cx, top, rightX, midY);
  doc.line(leftX, midY, cx, bottomY);
  doc.line(rightX, midY, cx, bottomY);
  doc.line(leftX, midY, rightX, midY);
}

/**
 * KODAND wordmark — bold Helvetica with a simulated faceted-gem
 * look: a gold rim (offset down/right), a dark emerald shadow
 * (slight offset), the bright emerald body, and a pale "table
 * facet" highlight shifted up slightly.
 */
function drawKodandWordmark(
  doc: jsPDF,
  x: number, y: number,
  fontSize: number,
  onDark = false
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  // Gold rim (offset down-right)
  setText(doc, GREEN.gold);
  doc.text("KODAND", x + 0.5, y + 0.5);
  // Dark shadow (smaller offset)
  setText(doc, onDark ? [2, 30, 22] : [4, 47, 32]);
  doc.text("KODAND", x + 0.25, y + 0.25);
  // Emerald body
  setText(doc, onDark ? [167, 243, 208] : GREEN.primary);
  doc.text("KODAND", x, y);
  // Pale top highlight (the table facet)
  setText(doc, onDark ? [236, 253, 245] : GREEN.bright);
  doc.text("KODAND", x, y - 0.3);
}

/** Small KODAND badge used in the page header strip. */
function drawKodandBadge(doc: jsPDF, x: number, y: number) {
  drawRubyMark(doc, x, y, 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, [236, 253, 245]);
  doc.text("KODAND", x + 7, y + 4);
}

/* ---------- 4. COVER PAGE ---------- */

function modeSubtitle(mode: string): string {
  switch (mode) {
    case "content":
      return "Spelling  ·  Grammar  ·  Style  ·  Clarity  ·  Readability  ·  Tone  ·  Keywords";
    case "security":
      return "Headers  ·  CVE Deep Scan  ·  WHOIS  ·  DNS  ·  TLS  ·  Cert Transparency";
    case "seo":
      return "Meta  ·  Canonical  ·  Open Graph  ·  Headings  ·  Structured Data  ·  Mobile";
    case "performance":
      return "Page Weight  ·  Render-Blocking  ·  Images  ·  Caching  ·  Compression";
    case "accessibility":
      return "Alt Text  ·  ARIA  ·  Labels  ·  Contrast  ·  Keyboard  ·  Language";
    case "full":
      return "All five dimensions combined into one comprehensive digital health report";
    default:
      return "";
  }
}

function drawCover(doc: jsPDF, result: ScanResult) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Full-bleed dark forest green background
  setFill(doc, GREEN.forest);
  doc.rect(0, 0, W, H, "F");

  // Subtle grid pattern (very faint emerald — barely visible)
  setStroke(doc, [12, 60, 45]);
  doc.setLineWidth(0.1);
  for (let x = 0; x < W; x += 20) doc.line(x, 0, x, H);
  for (let y = 0; y < H; y += 20) doc.line(0, y, W, y);

  // Top emerald accent strip + gold line
  setFill(doc, GREEN.primary);
  doc.rect(0, 0, W, 4, "F");
  setFill(doc, GREEN.gold);
  doc.rect(0, 4, W, 0.8, "F");

  // Bottom accent strip (mirror)
  setFill(doc, GREEN.gold);
  doc.rect(0, H - 4.8, W, 0.8, "F");
  setFill(doc, GREEN.primary);
  doc.rect(0, H - 4, W, 4, "F");

  // === KODAND wordmark ===
  drawKodandWordmark(doc, 22, 38, 32, true);
  // Thin gold line under the wordmark
  setStroke(doc, GREEN.gold);
  doc.setLineWidth(0.4);
  doc.line(22, 44, W - 22, 44);
  // Tagline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setText(doc, [110, 231, 183]);
  doc.text("CONFIDENTIAL  ·  360° WEBSITE AUDIT REPORT", 22, 50);

  // === Mode label (large) ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setText(doc, [236, 253, 245]);
  doc.text(result.modeLabel.toUpperCase(), 22, 70);
  // Subtitle line with the mode-specific coverage list
  const subtitle = modeSubtitle(result.mode);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setText(doc, [167, 243, 208]);
    const subLines = doc.splitTextToSize(subtitle, W - 44);
    doc.text(subLines.slice(0, 2), 22, 78);
  }

  // === Score gauge (centered) ===
  drawScoreGauge(
    doc, W / 2, 145, 35,
    result.digitalHealthScore, result.grade,
    { onDark: true, label: "Digital Health Score", fontSize: 34 }
  );

  // === Target URL box (subtle, gold left stripe) ===
  const boxY = 200;
  const boxW = W - 44;
  setFill(doc, [6, 60, 45]);
  doc.roundedRect(22, boxY, boxW, 22, 1.5, 1.5, "F");
  setStroke(doc, [16, 185, 129]);
  doc.setLineWidth(0.4);
  doc.roundedRect(22, boxY, boxW, 22, 1.5, 1.5, "S");
  setFill(doc, GREEN.gold);
  doc.rect(22, boxY, 2, 22, "F");
  // Label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setText(doc, [110, 231, 183]);
  doc.text("TARGET URL", 28, boxY + 6);
  // URL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, [236, 253, 245]);
  const targetUrl = safeText(result.meta.finalUrl || result.url, 100);
  doc.text(targetUrl, 28, boxY + 12.5);
  // Page title (if any)
  if (result.meta.title) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, [167, 243, 208]);
    const titleLine = doc.splitTextToSize(
      "Page: " + safeText(result.meta.title, 110),
      boxW - 10
    );
    doc.text(titleLine[0] || "", 28, boxY + 18);
  }

  // === Executive summary box ===
  const sumY = boxY + 27;
  const sumH = 33;
  setFill(doc, [6, 60, 45]);
  doc.roundedRect(22, sumY, boxW, sumH, 1.5, 1.5, "F");
  setStroke(doc, [16, 185, 129]);
  doc.setLineWidth(0.3);
  doc.roundedRect(22, sumY, boxW, sumH, 1.5, 1.5, "S");
  setFill(doc, GREEN.gold);
  doc.rect(22, sumY, 2, sumH, "F");
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setText(doc, [110, 231, 183]);
  doc.text("EXECUTIVE SUMMARY", 28, sumY + 6);
  // Body text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, [209, 250, 229]);
  const sumLines = doc.splitTextToSize(
    safeText(result.executiveSummary, 520),
    boxW - 10
  );
  doc.text(sumLines.slice(0, 5), 28, sumY + 12);

  // === Bottom info block ===
  const bottomY = H - 16;
  // Gold divider line
  setStroke(doc, GREEN.gold);
  doc.setLineWidth(0.3);
  doc.line(22, bottomY - 14, W - 22, bottomY - 14);
  // Generated timestamp (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setText(doc, GREEN.goldLight);
  doc.text(
    `Generated  ${new Date(result.scannedAt).toLocaleString()}`,
    22, bottomY - 7
  );
  // Free sources (left, smaller)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  setText(doc, [110, 231, 183]);
  doc.text(
    "Sourced from free, public, no-API-key databases:  NVD  ·  RDAP  ·  DNS  ·  TLS  ·  crt.sh",
    22, bottomY - 2
  );
  // Anti-ban notice (left, italic, smaller)
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.8);
  setText(doc, [148, 163, 184]);
  doc.text(
    "KODAND is polite to target sites (1 req/800ms per host, cache 5 min).",
    22, bottomY + 3
  );
  // Right column — privacy reminder
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setText(doc, GREEN.goldLight);
  doc.text("KODAND", W - 22, bottomY - 7, { align: "right" });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.8);
  setText(doc, [148, 163, 184]);
  doc.text(
    "Your data stays in your browser.",
    W - 22, bottomY - 2, { align: "right" }
  );
  doc.text(
    "Save this PDF — your scan history clears when you close the browser.",
    W - 22, bottomY + 3, { align: "right" }
  );
}

/* ---------- 5. PAGE HEADER & FOOTER ---------- */

/** Sticky page header — emerald strip with gold underline, KODAND badge, section title, page N. */
function drawPageHeader(doc: jsPDF, sectionTitle: string) {
  const W = doc.internal.pageSize.getWidth();
  setFill(doc, GREEN.forest);
  doc.rect(0, 0, W, PAGE.headerHeight, "F");
  // Gold accent line below the header
  setFill(doc, GREEN.gold);
  doc.rect(0, PAGE.headerHeight, W, 0.6, "F");
  // Left: KODAND badge
  drawKodandBadge(doc, PAGE.margin, 6);
  // Center: section title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, [236, 253, 245]);
  doc.text(sectionTitle.toUpperCase(), W / 2, 12, { align: "center" });
  // Right: page number
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, [167, 243, 208]);
  doc.text(`Page ${doc.getNumberOfPages()}`, W - PAGE.margin, 12, { align: "right" });
}

/**
 * Draw the footer on every interior page (the cover has its own bottom
 * block, so we skip page 1). Centered "KODAND · mode · Page N of M" with
 * the privacy note in small italic above it.
 */
function drawPageFooters(doc: jsPDF, modeLabel: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const N = doc.getNumberOfPages();
  for (let i = 2; i <= N; i++) {
    doc.setPage(i);
    const yFooter = H - 6;
    // Privacy note (italic, small, centered)
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.8);
    setText(doc, GREEN.muted);
    doc.text(
      "Your data stays in your browser.  Save this PDF — your scan history clears when you close the browser.",
      W / 2, yFooter - 4,
      { align: "center" }
    );
    // Centered main footer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    setText(doc, GREEN.deep);
    doc.text(
      `KODAND  ·  ${modeLabel}  ·  Page ${i} of ${N}`,
      W / 2, yFooter,
      { align: "center" }
    );
    // Tiny gold dot on each side (purely decorative)
    setFill(doc, GREEN.gold);
    doc.circle(W / 2 - 50, yFooter - 0.8, 0.5, "F");
    doc.circle(W / 2 + 50, yFooter - 0.8, 0.5, "F");
  }
}

/* ---------- 6. SECTION HEADERS ---------- */

/**
 * Full-width emerald-deep bar carrying the section number (in a gold disc),
 * the section title in white, and a thin gold accent line below.  The
 * counter object is shared across the whole PDF so numbers stay sequential.
 */
function drawSectionHeader(
  doc: jsPDF,
  y: number,
  title: string,
  counter: { n: number },
  subtitle?: string
): number {
  setFill(doc, GREEN.deep);
  doc.rect(PAGE.margin, y, PAGE.width, 11, "F");
  counter.n += 1;
  // Section number disc (gold)
  const circleX = PAGE.margin + 7;
  const circleY = y + 5.5;
  setFill(doc, GREEN.gold);
  doc.circle(circleX, circleY, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, GREEN.deep);
  doc.text(String(counter.n), circleX, circleY + 1.5, { align: "center" });
  // Title (white, bold, all caps)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, [236, 253, 245]);
  doc.text(title.toUpperCase(), circleX + 7, y + 7.5);
  // Optional subtitle (right-aligned, small caps)
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, [167, 243, 208]);
    doc.text(subtitle, PAGE.margin + PAGE.width - 2, y + 7.5, { align: "right" });
  }
  // Thin gold accent line below the bar
  setFill(doc, GREEN.gold);
  doc.rect(PAGE.margin, y + 11, PAGE.width, 0.5, "F");
  return y + 18;
}

/** Sub-section header — small emerald stripe + bold ink title. */
function drawSubSection(doc: jsPDF, y: number, title: string): number {
  setFill(doc, GREEN.primary);
  doc.rect(PAGE.margin, y, 2.5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, GREEN.ink);
  doc.text(title, PAGE.margin + 5, y + 4);
  return y + 9;
}

/* ---------- 7. TABLE COMMON OPTIONS ---------- */

/**
 * Shared autoTable options so every table in the report has the same
 * premium look: emerald-deep header (white text), pale-emerald zebra
 * striping, 3 mm cell padding, soft border, top-aligned text.
 *
 * `top` and `bottom` margins keep the table clear of the page header
 * (top 22mm strip) and the page footer (bottom 14mm strip). The
 * `didDrawPage` hook re-draws the page header on every autoTable page
 * (including the first — harmless overwrite — and any new pages it adds).
 */
function tableOpts(doc: jsPDF, sectionTitle: string, startY: number) {
  return {
    startY,
    margin: {
      left: PAGE.margin,
      right: PAGE.margin,
      top: PAGE.headerHeight + 4,
      bottom: PAGE.footerY + 6,
    },
    theme: "grid" as const,
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: "linebreak" as const,
      valign: "top" as const,
      textColor: GREEN.body,
      lineColor: GREEN.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: GREEN.deep,
      textColor: [236, 253, 245],
      fontStyle: "bold" as const,
      fontSize: 9,
      lineColor: GREEN.deep,
    },
    alternateRowStyles: { fillColor: GREEN.pale },
    didDrawPage: () => drawPageHeader(doc, sectionTitle),
  };
}

/* ---------- 8. FINDING CARDS ---------- */

interface CardFinding {
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  fix: string;
  evidence?: string;
}

/**
 * One finding rendered as a rounded card:
 *   - Left severity stripe
 *   - Top-left severity pill (filled with severity color, white text)
 *   - Top-right category badge (small caps, muted)
 *   - Bold title (ink)
 *   - Detail text (body)
 *   - "»  Fix:" line in emerald-deep (bold)
 *   - Optional monospace evidence block on a pale background
 *
 * Auto-paginates: if the card wouldn't fit, a new page is added and the
 * section header is redrawn.
 */
function drawFindingCard(
  doc: jsPDF,
  y: number,
  f: CardFinding,
  sectionTitle: string
): number {
  const x = PAGE.margin;
  const w = PAGE.width;
  const stripeW = 2.5;
  const pad = 5;
  const innerW = w - pad * 2 - stripeW;
  const textX = x + stripeW + pad;

  // Pre-compute text heights so we know the card height up-front
  const titleLines = doc.splitTextToSize(safeText(f.title, 240), innerW);
  const detailLines = doc.splitTextToSize(safeText(f.detail, 600), innerW);
  const fixLines = doc.splitTextToSize(
    "»  Fix:  " + safeText(f.fix, 600),
    innerW
  );
  const evidenceLines = f.evidence
    ? doc.splitTextToSize(safeText(f.evidence, 600), innerW - 4)
    : [];

  const headerH = 8;
  const titleH = titleLines.length * 5;
  const detailH = detailLines.length * 4.4;
  const fixH = fixLines.length * 4.4;
  const evidenceH = evidenceLines.length > 0 ? 4 + evidenceLines.length * 3.6 : 0;
  const cardH = pad + headerH + 1 + titleH + 2 + detailH + 2 + fixH + evidenceH + pad;

  // Auto-paginate
  if (y + cardH > pageBottomY(doc)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }

  // Card background + soft border
  setFill(doc, [255, 255, 255]);
  doc.roundedRect(x, y, w, cardH, 1.5, 1.5, "F");
  setStroke(doc, GREEN.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, cardH, 1.5, 1.5, "S");

  // Left severity stripe
  setFill(doc, severityColor(f.severity));
  doc.rect(x, y, stripeW, cardH, "F");

  // Severity pill (top-left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const pillText = f.severity.toUpperCase();
  const pillW = doc.getTextWidth(pillText) + 6;
  const pillH = 5.5;
  setFill(doc, severityColor(f.severity));
  doc.roundedRect(textX, y + pad, pillW, pillH, 1, 1, "F");
  setText(doc, [255, 255, 255]);
  doc.text(pillText, textX + pillW / 2, y + pad + 3.7, { align: "center" });

  // Category badge (top-right, muted)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, GREEN.muted);
  doc.text(
    f.category.toUpperCase(),
    x + w - pad, y + pad + 3.7,
    { align: "right" }
  );

  // Title
  let cy = y + pad + headerH + 1;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, GREEN.ink);
  doc.text(titleLines, textX, cy);
  cy += titleH + 2;

  // Detail
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, GREEN.body);
  doc.text(detailLines, textX, cy);
  cy += detailH + 2;

  // Fix (emerald-deep, bold, with chevron prefix)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setText(doc, GREEN.deep);
  doc.text(fixLines, textX, cy);
  cy += fixH;

  // Evidence block (monospace, pale background)
  if (evidenceLines.length > 0) {
    cy += 2;
    setFill(doc, GREEN.slate);
    doc.roundedRect(
      textX, cy - 3,
      innerW, evidenceLines.length * 3.6 + 3,
      1, 1, "F"
    );
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    setText(doc, GREEN.muted);
    doc.text(evidenceLines, textX + 2, cy);
  }

  return y + cardH + 4;
}

/* ---------- 9. CONTENT (Grammar) SECTION ---------- */

function renderContentSection(
  doc: jsPDF,
  y: number,
  result: ScanResult,
  counter: { n: number }
): number {
  const dim = result.content || result.grammar;
  if (!dim) return y;
  const sectionTitle = "Content & Clarity";

  y = drawSectionHeader(doc, y, "Content & Clarity", counter, "Spelling  ·  Grammar  ·  Style  ·  Readability");

  // Summary
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, GREEN.body);
  const sumLines = doc.splitTextToSize(safeText(dim.summary, 900), PAGE.width);
  doc.text(sumLines, PAGE.margin, y);
  y += sumLines.length * 4.6 + 6;

  // === Content metrics (NEW) ===
  if (dim.metrics) {
    y = renderContentMetrics(doc, y, dim.metrics, sectionTitle);
  }

  // === Findings as cards ===
  if (dim.findings.length === 0) {
    if (needsBreak(doc, y, 20)) {
      doc.addPage();
      drawPageHeader(doc, sectionTitle);
      y = PAGE.topStart;
    }
    y = drawSubSection(doc, y, "Findings");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    setText(doc, GREEN.deep);
    doc.text("No content or clarity issues detected.", PAGE.margin, y + 4);
    return y + 12;
  }

  if (needsBreak(doc, y, 30)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, `Findings  ·  ${dim.findings.length} issue${dim.findings.length === 1 ? "" : "s"}`);
  for (const f of dim.findings) {
    y = drawFindingCard(doc, y, {
      severity: f.severity,
      category: f.type,
      title: f.excerpt || f.explanation.slice(0, 80),
      detail: f.explanation,
      fix: f.suggestion,
    }, sectionTitle);
  }

  return y;
}

/* ---------- 10. CONTENT METRICS (readability gauge + tiles + bar chart) ---------- */

interface ContentMetricsLike {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  readingTimeMin: number;
  readingLevel: string;
  topKeywords: { word: string; count: number; density: number }[];
  tone: "formal" | "neutral" | "casual";
  passiveVoiceSentences: number;
  longSentences: number;
  uniqueWords: number;
  typeTokenRatio: number;
}

function renderContentMetrics(
  doc: jsPDF,
  y: number,
  m: ContentMetricsLike,
  sectionTitle: string
): number {
  if (needsBreak(doc, y, 80)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "Content Metrics  ·  Readability  ·  Tone  ·  Keywords");

  // === Readability gauge + tone chip on the left, stats on the right ===
  const gaugeCx = PAGE.margin + 28;
  const gaugeCy = y + 28;
  const gaugeR = 22;
  drawScoreGauge(
    doc, gaugeCx, gaugeCy, gaugeR,
    m.fleschReadingEase,
    gradeFromReadability(m.fleschReadingEase),
    {
      onDark: false,
      label: "Flesch Reading Ease",
      valueLabel: m.readingLevel,
      fontSize: 22,
    }
  );

  // Tone chip below the gauge
  const toneColor =
    m.tone === "formal" ? GREEN.blue :
    m.tone === "casual" ? GREEN.amber :
    GREEN.primary;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const toneText = "TONE: " + m.tone.toUpperCase();
  const toneW = doc.getTextWidth(toneText) + 8;
  setFill(doc, toneColor);
  doc.roundedRect(gaugeCx - toneW / 2, gaugeCy + 20, toneW, 5, 1, 1, "F");
  setText(doc, [255, 255, 255]);
  doc.text(toneText, gaugeCx, gaugeCy + 24, { align: "center" });

  // Right column — 4 metric tiles in a 2x2 grid
  const tileX0 = PAGE.margin + 70;
  const tileW = (PAGE.width - 70 - 6) / 2;       // 2 columns with 6mm gap
  const tileH = 16;
  const tileGap = 4;
  const tiles: { label: string; value: string; accent: [number, number, number] }[] = [
    { label: "Word Count", value: String(m.wordCount), accent: GREEN.primary },
    { label: "Reading Time", value: `${m.readingTimeMin} min`, accent: GREEN.gold },
    { label: "Sentences", value: String(m.sentenceCount), accent: GREEN.bright },
    { label: "Paragraphs", value: String(m.paragraphCount), accent: GREEN.deep },
  ];
  for (let i = 0; i < tiles.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const tx = tileX0 + col * (tileW + tileGap);
    const ty = y + 4 + row * (tileH + tileGap);
    drawMetricTile(doc, tx, ty, tileW, tileH, tiles[i].label, tiles[i].value, tiles[i].accent);
  }

  y += 2 * (tileH + tileGap) + 4 + 8;

  // === Detailed readability panel (key-value table) ===
  if (needsBreak(doc, y, 50)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  autoTable(doc, {
    ...tableOpts(doc, sectionTitle, y),
    head: [["Readability Metric", "Value", "Interpretation"]],
    body: [
      ["Flesch Reading Ease", m.fleschReadingEase.toFixed(1), interpretFlesch(m.fleschReadingEase)],
      ["Flesch-Kincaid Grade", m.fleschKincaidGrade.toFixed(1), `${m.fleschKincaidGrade.toFixed(1)} years of education`],
      ["Gunning Fog", m.gunningFog.toFixed(1), interpretGunning(m.gunningFog)],
      ["Avg words / sentence", m.avgWordsPerSentence.toFixed(1), m.avgWordsPerSentence > 20 ? "Long — consider shorter sentences" : "Reasonable"],
      ["Avg syllables / word", m.avgSyllablesPerWord.toFixed(2), m.avgSyllablesPerWord > 1.6 ? "Complex vocabulary" : "Simple vocabulary"],
      ["Unique words", String(m.uniqueWords), `Type-token ratio: ${m.typeTokenRatio.toFixed(2)}`],
    ],
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" as const },
      1: { cellWidth: 30, textColor: GREEN.deep, fontStyle: "bold" as const },
      2: { cellWidth: 90, textColor: GREEN.bodyMute },
    },
  });
  y = getLastY(doc) + 8;

  // === Keyword bar chart (top 10 keywords) ===
  if (needsBreak(doc, y, 80)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "Top 10 Keywords  ·  Frequency");
  y = drawKeywordBars(doc, y, m.topKeywords.slice(0, 10));
  y += 4;

  // === Style stats (passive voice + long sentences) ===
  if (needsBreak(doc, y, 30)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "Style Stats");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, GREEN.body);
  const passivePct = m.sentenceCount > 0 ? (m.passiveVoiceSentences / m.sentenceCount) * 100 : 0;
  const longPct = m.sentenceCount > 0 ? (m.longSentences / m.sentenceCount) * 100 : 0;
  const styleLines = [
    `Passive voice:   ${m.passiveVoiceSentences} sentence${m.passiveVoiceSentences === 1 ? "" : "s"}  (${passivePct.toFixed(1)}% of total)`,
    `Long sentences:  ${m.longSentences} sentence${m.longSentences === 1 ? "" : "s"} over 20 words  (${longPct.toFixed(1)}% of total)`,
    `Vocabulary:      ${m.uniqueWords} unique words  ·  Type-token ratio ${m.typeTokenRatio.toFixed(2)}  (higher = richer vocabulary)`,
  ];
  doc.text(styleLines, PAGE.margin, y + 4);
  y += styleLines.length * 5 + 6;

  return y;
}

function gradeFromReadability(flesch: number): string {
  if (flesch >= 90) return "A";
  if (flesch >= 70) return "B";
  if (flesch >= 60) return "C";
  if (flesch >= 50) return "D";
  return "F";
}
function interpretFlesch(f: number): string {
  if (f >= 90) return "Very easy (5th grade)";
  if (f >= 80) return "Easy (6th grade)";
  if (f >= 70) return "Fairly easy (7th grade)";
  if (f >= 60) return "Standard (8–9th grade)";
  if (f >= 50) return "Fairly difficult (10–12th)";
  if (f >= 30) return "Difficult (college)";
  return "Very difficult (graduate)";
}
function interpretGunning(g: number): string {
  if (g >= 17) return "Graduate level";
  if (g >= 12) return "College level";
  if (g >= 9)  return "High school level";
  if (g >= 6)  return "Middle school level";
  return "Elementary level";
}

/** A small metric tile — white background, top accent strip, label + value. */
function drawMetricTile(
  doc: jsPDF,
  x: number, y: number,
  w: number, h: number,
  label: string, value: string,
  accent: [number, number, number]
) {
  setFill(doc, [255, 255, 255]);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  setStroke(doc, GREEN.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "S");
  // Top accent strip
  setFill(doc, accent);
  doc.rect(x, y, w, 1.2, "F");
  // Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, GREEN.muted);
  doc.text(label.toUpperCase(), x + 3, y + 6);
  // Value (large bold)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, GREEN.ink);
  doc.text(value, x + 3, y + 13);
}

/** Horizontal bar chart of the top N keywords (frequency). */
function drawKeywordBars(
  doc: jsPDF,
  y: number,
  keywords: { word: string; count: number; density: number }[]
): number {
  if (keywords.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.muted);
    doc.text("No keyword data available.", PAGE.margin, y + 4);
    return y + 10;
  }
  const maxCount = Math.max(...keywords.map((k) => k.count), 1);
  const labelW = 40;
  const countW = 16;
  const barX = PAGE.margin + labelW;
  const maxBarW = PAGE.width - labelW - countW - 4;

  let cy = y + 4;
  keywords.forEach((kw, i) => {
    const barW = Math.max(2, (kw.count / maxCount) * maxBarW);
    // Label (left)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setText(doc, GREEN.ink);
    doc.text(safeText(kw.word, 22), PAGE.margin, cy);
    // Bar (emerald, top one gold for emphasis)
    setFill(doc, i === 0 ? GREEN.gold : GREEN.primary);
    doc.roundedRect(barX, cy - 3.2, barW, 4.5, 1, 1, "F");
    // Density label inside the bar (if bar wide enough)
    if (barW > 22) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      setText(doc, [255, 255, 255]);
      doc.text(`${kw.density.toFixed(1)}%`, barX + 3, cy - 0.5);
    }
    // Count (right)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    setText(doc, GREEN.deep);
    doc.text(String(kw.count), barX + maxBarW + 4, cy);
    cy += 8;
  });
  return cy;
}

/* ---------- 11. SECURITY SECTION ---------- */

function renderSecuritySection(
  doc: jsPDF,
  y: number,
  result: ScanResult,
  counter: { n: number }
): number {
  if (!result.security) return y;
  const sectionTitle = "Security & Privacy";
  y = drawSectionHeader(doc, y, "Security & Privacy", counter, "Headers  ·  Transport  ·  Content Vulns  ·  Cookies");

  // Summary
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, GREEN.body);
  const sumLines = doc.splitTextToSize(safeText(result.security.summary, 900), PAGE.width);
  doc.text(sumLines, PAGE.margin, y);
  y += sumLines.length * 4.6 + 6;

  // Findings as cards
  if (result.security.findings.length === 0) {
    if (needsBreak(doc, y, 20)) {
      doc.addPage();
      drawPageHeader(doc, sectionTitle);
      y = PAGE.topStart;
    }
    y = drawSubSection(doc, y, "Findings");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    setText(doc, GREEN.deep);
    doc.text("No security issues detected.", PAGE.margin, y + 4);
    y += 12;
  } else {
    if (needsBreak(doc, y, 30)) {
      doc.addPage();
      drawPageHeader(doc, sectionTitle);
      y = PAGE.topStart;
    }
    y = drawSubSection(doc, y, `Findings  ·  ${result.security.findings.length} issue${result.security.findings.length === 1 ? "" : "s"}`);
    for (const f of result.security.findings) {
      y = drawFindingCard(doc, y, {
        severity: f.severity,
        category: f.category,
        title: f.title,
        detail: f.detail,
        fix: f.fix,
        evidence: f.evidence,
      }, sectionTitle);
    }
  }

  // HTTP headers table
  if (needsBreak(doc, y, 50)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "HTTP Response Headers");
  const headerEntries = Object.entries(result.security.headers || {});
  if (headerEntries.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.muted);
    doc.text("No HTTP headers were captured.", PAGE.margin, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      ...tableOpts(doc, sectionTitle, y),
      head: [["Header", "Value"]],
      body: headerEntries.map(([k, v]) => [
        k,
        v == null ? "—  (missing)" : safeText(v, 170),
      ]),
      columnStyles: {
        0: { cellWidth: 55, fontStyle: "bold" as const, textColor: GREEN.ink },
        1: { cellWidth: 115, textColor: GREEN.body },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const val = String(data.cell.raw);
          if (val.startsWith("—")) {
            data.cell.styles.textColor = GREEN.red;
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    y = getLastY(doc) + 8;
  }

  return y;
}

/* ---------- 12. DOMAIN INTEL SECTION ---------- */

function renderDomainIntelSection(
  doc: jsPDF,
  _y: number,
  result: ScanResult,
  counter: { n: number }
): number {
  const intel = result.security?.intel;
  if (!intel) return _y;
  const sectionTitle = "Domain Intel";

  // Always start a fresh page for the Domain Intel section
  doc.addPage();
  drawPageHeader(doc, sectionTitle);
  let y = PAGE.topStart;

  y = drawSectionHeader(doc, y, "Domain Intel (CVE · WHOIS · DNS · TLS · CT)", counter, "Free public databases  ·  no API keys");

  // Banner line explaining the sources
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  setText(doc, GREEN.bodyMute);
  doc.text(
    "Sourced from free, public, no-API-key internet databases:  NVD (NIST)  ·  RDAP  ·  DNS  ·  TLS  ·  crt.sh",
    PAGE.margin, y
  );
  y += 6;

  // === Detected Software ===
  if (needsBreak(doc, y, 30)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "Detected Software");
  if (intel.detectedProducts.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.muted);
    doc.text(
      "No versioned software products detected from headers / meta generator.",
      PAGE.margin, y + 4
    );
    y += 12;
  } else {
    autoTable(doc, {
      ...tableOpts(doc, sectionTitle, y),
      head: [["Product", "Version", "Detected via"]],
      body: intel.detectedProducts.map((p) => [p.name, p.version || "—", p.source]),
      columnStyles: {
        0: { cellWidth: 70, fontStyle: "bold" as const, textColor: GREEN.ink },
        1: { cellWidth: 35, textColor: GREEN.deep },
        2: { cellWidth: 65, textColor: GREEN.bodyMute },
      },
    });
    y = getLastY(doc) + 8;
  }

  // === NVD CVE Deep Scan ===
  if (needsBreak(doc, y, 30)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "NVD CVE Deep Scan");
  if (intel.cveFindings.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.deep);
    doc.text(
      "No matching CVEs in the NVD database for the detected software versions.",
      PAGE.margin, y + 4
    );
    y += 12;
  } else {
    autoTable(doc, {
      ...tableOpts(doc, sectionTitle, y),
      head: [["CVE ID", "Product", "CVSS", "Severity", "Description", "Published"]],
      body: intel.cveFindings.map((c) => [
        c.cveId,
        safeText(c.product, 30),
        c.cvssScore.toFixed(1),
        c.severity.toUpperCase(),
        safeText(c.description, 110),
        new Date(c.published).toLocaleDateString(),
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        overflow: "linebreak" as const,
        valign: "top" as const,
        textColor: GREEN.body,
        lineColor: GREEN.border,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 24, fontStyle: "bold" as const, textColor: GREEN.red },
        1: { cellWidth: 24, textColor: GREEN.ink },
        2: { cellWidth: 12, textColor: GREEN.deep, fontStyle: "bold" as const },
        3: { cellWidth: 18 },
        4: { cellWidth: 70, textColor: GREEN.body },
        5: { cellWidth: 22, textColor: GREEN.bodyMute },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          data.cell.styles.textColor = severityColor(String(data.cell.raw));
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    y = getLastY(doc) + 8;
  }

  // === RDAP WHOIS Record ===
  if (needsBreak(doc, y, 50)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "RDAP WHOIS Record");
  const w = intel.whois;
  if (!w) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.muted);
    doc.text("No WHOIS data fetched.", PAGE.margin, y + 4);
    y += 12;
  } else if (w.error) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.red);
    doc.text(`WHOIS lookup failed: ${w.error}`, PAGE.margin, y + 4);
    y += 12;
  } else {
    autoTable(doc, {
      ...tableOpts(doc, sectionTitle, y),
      head: [["Field", "Value"]],
      body: [
        ["Domain", safeText(w.domain, 80)],
        ["Registrar", safeText(w.registrar || "—", 80)],
        ["Registered", w.registeredOn ? new Date(w.registeredOn).toLocaleString() : "—"],
        ["Updated", w.updatedOn ? new Date(w.updatedOn).toLocaleString() : "—"],
        ["Expires", w.expiresOn ? new Date(w.expiresOn).toLocaleString() : "—"],
        ["Registrant Org", safeText(w.registrantOrg || "—", 80)],
        ["Registrant Country", safeText(w.registrantCountry || "—", 60)],
        ["Statuses", safeText(w.statuses.join(", ") || "—", 120)],
        ["Nameservers", safeText(w.nameservers.join(", ") || "—", 120)],
      ],
      columnStyles: {
        0: { cellWidth: 45, fontStyle: "bold" as const, textColor: GREEN.ink },
        1: { cellWidth: 125, textColor: GREEN.body },
      },
    });
    y = getLastY(doc) + 8;
  }

  // === DNS Records ===
  if (needsBreak(doc, y, 50)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "DNS Records");
  const d = intel.dns;
  if (!d) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.muted);
    doc.text("No DNS data fetched.", PAGE.margin, y + 4);
    y += 12;
  } else if (d.error) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.red);
    doc.text(`DNS resolution failed: ${d.error}`, PAGE.margin, y + 4);
    y += 12;
  } else {
    const rows: [string, string][] = [
      ["A (IPv4)", safeText(d.A.join(", ") || "—", 120)],
      ["AAAA (IPv6)", safeText(d.AAAA.join(", ") || "—", 120)],
      ["MX (mail)", safeText(d.MX.join(", ") || "—", 120)],
      ["NS (nameservers)", safeText(d.NS.join(", ") || "—", 120)],
      ["CNAME", safeText(d.CNAME.join(", ") || "—", 120)],
      ["TXT", safeText(d.TXT.join(" | ") || "—", 200)],
    ];
    if (d.SOA) rows.push(["SOA", safeText(d.SOA, 120)]);
    autoTable(doc, {
      ...tableOpts(doc, sectionTitle, y),
      head: [["Record Type", "Values"]],
      body: rows,
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        overflow: "linebreak" as const,
        valign: "top" as const,
        textColor: GREEN.body,
        lineColor: GREEN.border,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" as const, textColor: GREEN.ink },
        1: { cellWidth: 130, textColor: GREEN.body },
      },
    });
    y = getLastY(doc) + 8;
  }

  // === TLS Certificate ===
  if (needsBreak(doc, y, 60)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "TLS Certificate");
  const c = intel.certificate;
  if (!c) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.muted);
    doc.text("No TLS certificate fetched (target is not HTTPS).", PAGE.margin, y + 4);
    y += 12;
  } else if (c.error) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.red);
    doc.text(`TLS inspection failed: ${c.error}`, PAGE.margin, y + 4);
    y += 12;
  } else {
    // Status pill row
    const status = c.isExpired ? "EXPIRED" : c.isExpiringSoon ? "EXPIRING SOON" : "VALID";
    const statusColor = c.isExpired ? GREEN.red : c.isExpiringSoon ? GREEN.amber : GREEN.primary;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const statusText = "STATUS: " + status;
    const statusW = doc.getTextWidth(statusText) + 8;
    setFill(doc, statusColor);
    doc.roundedRect(PAGE.margin, y, statusW, 6, 1.5, 1.5, "F");
    setText(doc, [255, 255, 255]);
    doc.text(statusText, PAGE.margin + 4, y + 4.2);
    // Self-signed badge
    if (c.selfSigned) {
      const ssText = "SELF-SIGNED";
      const ssW = doc.getTextWidth(ssText) + 8;
      setFill(doc, GREEN.amber);
      doc.roundedRect(PAGE.margin + statusW + 4, y, ssW, 6, 1.5, 1.5, "F");
      doc.text(ssText, PAGE.margin + statusW + 8, y + 4.2);
    }
    // Key bits badge
    const keyText = c.keyBits != null ? `${c.keyAlgorithm || "RSA"}  ${c.keyBits}-bit` : (c.keyAlgorithm || "—");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, GREEN.bodyMute);
    doc.text(keyText, PAGE.margin + PAGE.width, y + 4.2, { align: "right" });
    y += 10;

    autoTable(doc, {
      ...tableOpts(doc, sectionTitle, y),
      head: [["Field", "Value"]],
      body: [
        ["Subject", safeText(c.subject || "—", 120)],
        ["Issuer", safeText(c.issuer || "—", 120)],
        ["Valid from", c.validFrom || "—"],
        ["Valid to", c.validTo || "—"],
        ["Serial", safeText(c.serialNumber || "—", 80)],
        ["Fingerprint", safeText(c.fingerprint || "—", 80)],
        ["SAN count", String(c.san.length)],
        ["SAN values", safeText(c.san.join(", ") || "—", 200)],
      ],
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        overflow: "linebreak" as const,
        valign: "top" as const,
        textColor: GREEN.body,
        lineColor: GREEN.border,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: "bold" as const, textColor: GREEN.ink },
        1: { cellWidth: 135, textColor: GREEN.body },
      },
    });
    y = getLastY(doc) + 8;
  }

  // === Certificate Transparency (crt.sh) ===
  if (needsBreak(doc, y, 50)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "Certificate Transparency  (crt.sh)");
  // Discovered subdomains as chips
  if (intel.discoveredSubdomains.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(doc, GREEN.deep);
    doc.text(
      `Discovered ${intel.discoveredSubdomains.length} subdomain${intel.discoveredSubdomains.length === 1 ? "" : "s"} via CT logs:`,
      PAGE.margin, y + 3
    );
    y += 6;
    let chipX = PAGE.margin;
    let chipY = y;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    for (const sub of intel.discoveredSubdomains.slice(0, 30)) {
      const txt = safeText(sub, 30);
      const wChip = doc.getTextWidth(txt) + 4;
      if (chipX + wChip > PAGE.margin + PAGE.width) {
        chipX = PAGE.margin;
        chipY += 6;
      }
      setFill(doc, GREEN.pale);
      setStroke(doc, GREEN.primary);
      doc.setLineWidth(0.2);
      doc.roundedRect(chipX, chipY, wChip, 5, 1, 1, "FD");
      setText(doc, GREEN.ink);
      doc.text(txt, chipX + 2, chipY + 3.5);
      chipX += wChip + 2;
    }
    y = chipY + 8;
  }
  if (intel.certTransparency.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, GREEN.muted);
    doc.text("No certificate transparency entries found on crt.sh.", PAGE.margin, y + 4);
    y += 12;
  } else {
    autoTable(doc, {
      ...tableOpts(doc, sectionTitle, y),
      head: [["Common Name", "SAN Names", "Not Before", "Not After"]],
      body: intel.certTransparency.map((e) => [
        safeText(e.commonName, 50),
        safeText(e.nameValue.replace(/\n/g, ", "), 70),
        new Date(e.notBefore).toLocaleDateString(),
        new Date(e.notAfter).toLocaleDateString(),
      ]),
      styles: {
        fontSize: 7.5,
        cellPadding: 2.2,
        overflow: "linebreak" as const,
        valign: "top" as const,
        textColor: GREEN.body,
        lineColor: GREEN.border,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" as const, textColor: GREEN.ink },
        1: { cellWidth: 70, textColor: GREEN.body },
        2: { cellWidth: 25, textColor: GREEN.bodyMute },
        3: { cellWidth: 25, textColor: GREEN.bodyMute },
      },
    });
    y = getLastY(doc) + 8;
  }

  return y;
}

/* ---------- 13. SEO SECTION ---------- */

function renderSeoSection(
  doc: jsPDF,
  y: number,
  result: ScanResult,
  counter: { n: number }
): number {
  if (!result.seo) return y;
  const sectionTitle = "SEO & Discoverability";
  y = drawSectionHeader(doc, y, "SEO & Discoverability", counter, "Meta  ·  Headings  ·  Structured Data  ·  Mobile");

  // Summary
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, GREEN.body);
  const sumLines = doc.splitTextToSize(safeText(result.seo.summary, 900), PAGE.width);
  doc.text(sumLines, PAGE.margin, y);
  y += sumLines.length * 4.6 + 6;

  // On-Page SEO Signals table
  if (needsBreak(doc, y, 80)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "On-Page SEO Signals");
  const c = result.seo.checks;
  const signalRows: [string, string][] = [
    ["Title present", c.hasTitle ? "Yes" : "No"],
    ["Title length", `${c.titleLength} chars`],
    ["Meta description present", c.hasDescription ? "Yes" : "No"],
    ["Meta description length", `${c.descriptionLength} chars`],
    ["Canonical link", c.hasCanonical ? "Yes" : "No"],
    ["Open Graph tags", c.hasOgTags ? "Yes" : "No"],
    ["Twitter Card", c.hasTwitterCard ? "Yes" : "No"],
    ["H1 count", String(c.h1Count)],
    ["H2 count", String(c.h2Count)],
    ["H3 count", String(c.h3Count)],
    ["Structured data (JSON-LD)", c.hasStructuredData ? "Yes" : "No"],
    ["Viewport meta", c.hasViewport ? "Yes" : "No"],
    ["Robots meta", c.hasRobotsMeta ? "Yes" : "No"],
    ["<html> lang", c.lang || "(missing)"],
    ["Favicon", c.hasFavicon ? "Yes" : "No"],
  ];
  autoTable(doc, {
    ...tableOpts(doc, sectionTitle, y),
    head: [["Signal", "Value"]],
    body: signalRows,
    columnStyles: {
      0: { cellWidth: 75, fontStyle: "bold" as const, textColor: GREEN.ink },
      1: { cellWidth: 95, textColor: GREEN.body },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const v = String(data.cell.raw);
        if (v === "No" || v === "(missing)" || v === "0") {
          data.cell.styles.textColor = GREEN.red;
          data.cell.styles.fontStyle = "bold";
        } else if (v === "Yes" || v === "1") {
          data.cell.styles.textColor = GREEN.primary;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  y = getLastY(doc) + 8;

  // Findings as cards
  if (result.seo.findings.length === 0) {
    if (needsBreak(doc, y, 16)) {
      doc.addPage();
      drawPageHeader(doc, sectionTitle);
      y = PAGE.topStart;
    }
    y = drawSubSection(doc, y, "Findings");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    setText(doc, GREEN.deep);
    doc.text("No SEO issues detected.", PAGE.margin, y + 4);
    return y + 12;
  }
  if (needsBreak(doc, y, 30)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, `Findings  ·  ${result.seo.findings.length} issue${result.seo.findings.length === 1 ? "" : "s"}`);
  for (const f of result.seo.findings) {
    y = drawFindingCard(doc, y, {
      severity: f.severity,
      category: f.category,
      title: f.title,
      detail: f.detail,
      fix: f.fix,
      evidence: f.evidence,
    }, sectionTitle);
  }
  return y;
}

/* ---------- 14. PERFORMANCE SECTION ---------- */

function renderPerformanceSection(
  doc: jsPDF,
  y: number,
  result: ScanResult,
  counter: { n: number }
): number {
  if (!result.performance) return y;
  const sectionTitle = "Performance & Speed";
  y = drawSectionHeader(doc, y, "Performance & Speed", counter, "Page Weight  ·  Scripts  ·  Caching  ·  Images");

  // Summary
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, GREEN.body);
  const sumLines = doc.splitTextToSize(safeText(result.performance.summary, 900), PAGE.width);
  doc.text(sumLines, PAGE.margin, y);
  y += sumLines.length * 4.6 + 6;

  // Measured Metrics table
  if (needsBreak(doc, y, 80)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, "Measured Metrics");
  const m = result.performance.metrics;
  const metricRows: [string, string][] = [
    ["HTML size", `${m.pageSizeKb} KB`],
    ["Inline <script> blocks", `${m.inlineScriptCount}  (${(m.inlineScriptBytes / 1024).toFixed(1)} KB)`],
    ["External scripts", String(m.externalScriptCount)],
    ["External stylesheets", String(m.externalStylesheetCount)],
    ["Inline <style> bytes", `${(m.inlineStyleBytes / 1024).toFixed(1)} KB`],
    ["<img> count", String(m.imgCount)],
    ["Lazy loading (any image)", m.hasLazyLoading ? "Yes" : "No"],
    ["HTTP compression", m.hasCompression ? "Yes" : "No"],
    ["Preconnect / dns-prefetch", m.hasPreconnect ? "Yes" : "No"],
    ["Async / defer scripts", m.hasAsyncDeferScripts ? "Yes" : "No"],
  ];
  autoTable(doc, {
    ...tableOpts(doc, sectionTitle, y),
    head: [["Metric", "Value"]],
    body: metricRows,
    columnStyles: {
      0: { cellWidth: 80, fontStyle: "bold" as const, textColor: GREEN.ink },
      1: { cellWidth: 90, textColor: GREEN.body },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const v = String(data.cell.raw);
        if (v === "No") {
          data.cell.styles.textColor = GREEN.amber;
          data.cell.styles.fontStyle = "bold";
        } else if (v === "Yes") {
          data.cell.styles.textColor = GREEN.primary;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  y = getLastY(doc) + 8;

  // Findings as cards
  if (result.performance.findings.length === 0) {
    if (needsBreak(doc, y, 16)) {
      doc.addPage();
      drawPageHeader(doc, sectionTitle);
      y = PAGE.topStart;
    }
    y = drawSubSection(doc, y, "Findings");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    setText(doc, GREEN.deep);
    doc.text("No performance issues detected.", PAGE.margin, y + 4);
    return y + 12;
  }
  if (needsBreak(doc, y, 30)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, `Findings  ·  ${result.performance.findings.length} issue${result.performance.findings.length === 1 ? "" : "s"}`);
  for (const f of result.performance.findings) {
    y = drawFindingCard(doc, y, {
      severity: f.severity,
      category: f.category,
      title: f.title,
      detail: f.detail,
      fix: f.fix,
      evidence: f.evidence,
    }, sectionTitle);
  }
  return y;
}

/* ---------- 15. ACCESSIBILITY SECTION ---------- */

function renderAccessibilitySection(
  doc: jsPDF,
  y: number,
  result: ScanResult,
  counter: { n: number }
): number {
  if (!result.accessibility) return y;
  const sectionTitle = "Accessibility (a11y)";
  y = drawSectionHeader(doc, y, "Accessibility (a11y)", counter, "WCAG  ·  Alt Text  ·  ARIA  ·  Contrast  ·  Keyboard");

  // Summary
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, GREEN.body);
  const sumLines = doc.splitTextToSize(safeText(result.accessibility.summary, 900), PAGE.width);
  doc.text(sumLines, PAGE.margin, y);
  y += sumLines.length * 4.6 + 6;

  // Findings as cards
  if (result.accessibility.findings.length === 0) {
    if (needsBreak(doc, y, 16)) {
      doc.addPage();
      drawPageHeader(doc, sectionTitle);
      y = PAGE.topStart;
    }
    y = drawSubSection(doc, y, "Findings");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    setText(doc, GREEN.deep);
    doc.text("No accessibility issues detected.", PAGE.margin, y + 4);
    return y + 12;
  }
  if (needsBreak(doc, y, 30)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSubSection(doc, y, `Findings  ·  ${result.accessibility.findings.length} issue${result.accessibility.findings.length === 1 ? "" : "s"}`);
  for (const f of result.accessibility.findings) {
    y = drawFindingCard(doc, y, {
      severity: f.severity,
      category: f.category,
      title: f.title,
      detail: f.detail,
      fix: f.fix,
      evidence: f.evidence,
    }, sectionTitle);
  }
  return y;
}

/* ---------- 16. CONSOLIDATED FIX LIST ---------- */

interface FixItem {
  sev: Severity;
  src: string;
  title: string;
  fix: string;
}

function renderConsolidatedFixes(
  doc: jsPDF,
  y: number,
  result: ScanResult,
  counter: { n: number }
): number {
  const sectionTitle = "Fixes & Methodology";
  y = drawSectionHeader(doc, y, "Consolidated Fix List", counter, "Prioritized across all dimensions");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, GREEN.body);
  const introLines = doc.splitTextToSize(
    "Below is a consolidated, prioritized list of fixes derived from every dimension in this report. " +
    "Sort order: critical → high → medium → low → info.",
    PAGE.width
  );
  doc.text(introLines, PAGE.margin, y);
  y += introLines.length * 4.6 + 6;

  const allFixes: FixItem[] = [];
  if (result.content || result.grammar) {
    const dim = result.content || result.grammar!;
    for (const f of dim.findings)
      allFixes.push({ sev: f.severity, src: "Content", title: safeText(f.excerpt || f.explanation.slice(0, 80), 100), fix: safeText(f.suggestion, 220) });
  }
  if (result.security)
    for (const f of result.security.findings)
      allFixes.push({ sev: f.severity, src: "Security", title: safeText(f.title, 100), fix: safeText(f.fix, 220) });
  if (result.seo)
    for (const f of result.seo.findings)
      allFixes.push({ sev: f.severity, src: "SEO", title: safeText(f.title, 100), fix: safeText(f.fix, 220) });
  if (result.performance)
    for (const f of result.performance.findings)
      allFixes.push({ sev: f.severity, src: "Performance", title: safeText(f.title, 100), fix: safeText(f.fix, 220) });
  if (result.accessibility)
    for (const f of result.accessibility.findings)
      allFixes.push({ sev: f.severity, src: "Accessibility", title: safeText(f.title, 100), fix: safeText(f.fix, 220) });

  const sevRank: Record<Severity, number> = {
    critical: 0, high: 1, medium: 2, low: 3, info: 4,
  };
  allFixes.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);

  if (allFixes.length === 0) {
    if (needsBreak(doc, y, 16)) {
      doc.addPage();
      drawPageHeader(doc, sectionTitle);
      y = PAGE.topStart;
    }
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    setText(doc, GREEN.deep);
    doc.text("No fixes required — site passes all checks in this report.", PAGE.margin, y + 4);
    return y + 12;
  }

  autoTable(doc, {
    ...tableOpts(doc, sectionTitle, y),
    head: [["#", "Severity", "Area", "Issue", "Fix"]],
    body: allFixes.map((f, i) => [
      String(i + 1),
      f.sev.toUpperCase(),
      f.src,
      f.title,
      f.fix,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      overflow: "linebreak" as const,
      valign: "top" as const,
      textColor: GREEN.body,
      lineColor: GREEN.border,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 8, textColor: GREEN.bodyMute },
      1: { cellWidth: 18 },
      2: { cellWidth: 24, fontStyle: "bold" as const, textColor: GREEN.ink },
      3: { cellWidth: 50, textColor: GREEN.body },
      4: { cellWidth: 70, textColor: GREEN.body },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        data.cell.styles.textColor = severityColor(String(data.cell.raw));
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  return getLastY(doc) + 8;
}

/* ---------- 17. METHODOLOGY ---------- */

function renderMethodology(
  doc: jsPDF,
  y: number,
  result: ScanResult,
  counter: { n: number }
): number {
  const sectionTitle = "Fixes & Methodology";
  if (needsBreak(doc, y, 70)) {
    doc.addPage();
    drawPageHeader(doc, sectionTitle);
    y = PAGE.topStart;
  }
  y = drawSectionHeader(doc, y, "Methodology & Disclaimer", counter, "How this report was produced");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, GREEN.body);

  const dimList: string[] = [];
  if (result.content || result.grammar) dimList.push("content & clarity (LLM-assisted)");
  if (result.security) dimList.push("security & privacy (rule-based + LLM + free-source intel)");
  if (result.seo) dimList.push("SEO & discoverability (rule-based + LLM)");
  if (result.performance) dimList.push("performance & speed (rule-based + LLM)");
  if (result.accessibility) dimList.push("accessibility (rule-based + LLM)");

  const methodLines = [
    `This report was generated by KODAND's ${result.modeLabel} scan. The audit covered the following dimensions: ${dimList.join("; ") || "n/a"}.`,
    "",
    "Methodology:",
    "1. Fetch — the page HTML is retrieved server-side via HTTP, with response headers and raw content captured.",
    "2. Parse — visible text, meta tags, headings, and on-page signals are extracted from the HTML.",
    "3. Rule-based checks — well-known issues (security headers, SEO meta, performance metrics, a11y basics) are detected deterministically.",
    "4. LLM-assisted review — an AI auditor reviews the extracted content and HTML snippet for issues the rule-based check might miss.",
    "5. Free-source deep intel — for security mode, additional context is gathered from NVD (CVEs), RDAP (WHOIS), DNS, TLS (certificate), and crt.sh (certificate transparency).",
    "6. Score — a 0-100 score is computed from the severity-weighted penalties of detected findings, mapped to a letter grade (A-F).",
    "",
    "Disclaimer: KODAND is an anonymous, free, automated assessment tool. Findings are heuristic and AI-assisted; " +
    "they should be validated by a qualified professional before acting on them. KODAND does not store the URLs " +
    "you scan or the reports you generate.",
    "",
    "Privacy: Your data stays in your browser. Save this PDF — your scan history clears when you close the browser.",
  ];
  const wrapped = doc.splitTextToSize(methodLines.join("\n"), PAGE.width);
  doc.text(wrapped, PAGE.margin, y);
  y += wrapped.length * 4.5 + 4;

  // Final closing tag
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, GREEN.deep);
  doc.text("— End of report —", PAGE.margin + PAGE.width, y + 4, { align: "right" });

  return y + 12;
}

/* ---------- 18. SCORE BREAKDOWN + TOP PRIORITIES (Overview page) ---------- */

function renderScoreBreakdown(
  doc: jsPDF,
  y: number,
  result: ScanResult
): number {
  y = drawSubSection(doc, y, "Score Breakdown");
  const rows: [string, string, string][] = [
    ["Overall (this report)", String(Math.round(result.digitalHealthScore)), result.grade],
  ];
  if (result.content || result.grammar)
    rows.push(["Content & clarity", String(Math.round((result.content || result.grammar!).score)), "—"]);
  if (result.security)
    rows.push(["Security & privacy", String(Math.round(result.security.score)), "—"]);
  if (result.seo)
    rows.push(["SEO & discoverability", String(Math.round(result.seo.score)), "—"]);
  if (result.performance)
    rows.push(["Performance & speed", String(Math.round(result.performance.score)), "—"]);
  if (result.accessibility)
    rows.push(["Accessibility (a11y)", String(Math.round(result.accessibility.score)), "—"]);

  autoTable(doc, {
    ...tableOpts(doc, "Overview", y),
    head: [["Dimension", "Score (0-100)", "Grade"]],
    body: rows,
    columnStyles: {
      0: { cellWidth: 100, fontStyle: "bold" as const, textColor: GREEN.ink },
      1: { cellWidth: 50, textColor: GREEN.deep, fontStyle: "bold" as const },
      2: { cellWidth: 20, textColor: GREEN.deep, fontStyle: "bold" as const },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const val = parseInt(String(data.cell.raw), 10);
        if (!isNaN(val)) {
          data.cell.styles.textColor = scoreColor(val);
        }
      }
      if (data.section === "body" && data.column.index === 2) {
        const v = String(data.cell.raw);
        if (v !== "—") data.cell.styles.textColor = gradeColor(v);
      }
    },
  });
  return getLastY(doc) + 8;
}

function renderTopPriorities(
  doc: jsPDF,
  y: number,
  result: ScanResult
): number {
  y = drawSubSection(doc, y, "Top Priorities");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, GREEN.body);
  const priorities =
    result.topPriorities.length > 0
      ? result.topPriorities
      : ["No critical issues — maintain current standards."];
  let cy = y;
  priorities.forEach((p, i) => {
    if (needsBreak(doc, cy, 12)) {
      doc.addPage();
      drawPageHeader(doc, "Overview");
      cy = PAGE.topStart;
    }
    // Number disc
    setFill(doc, GREEN.gold);
    doc.circle(PAGE.margin + 2, cy - 1, 2.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(doc, GREEN.deep);
    doc.text(String(i + 1), PAGE.margin + 2, cy + 0.5, { align: "center" });
    // Priority text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setText(doc, GREEN.body);
    const lines = doc.splitTextToSize(safeText(p, 600), PAGE.width - 8);
    doc.text(lines, PAGE.margin + 6, cy);
    cy += lines.length * 4.6 + 3;
  });
  return cy + 4;
}

/* ---------- 19. MAIN ORCHESTRATOR ---------- */

export function generateReportPdf(result: ScanResult): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: false });

  // ============ PAGE 1 — COVER ============
  drawCover(doc, result);

  // ============ PAGE 2 — Overview ============
  doc.addPage();
  drawPageHeader(doc, "Overview");
  let y = PAGE.topStart;
  const counter = { n: 0 };

  // Section 1 — Audit Overview
  y = drawSectionHeader(doc, y, "Audit Overview", counter, "Scan metadata  ·  target  ·  timing");
  const overviewRows: [string, string][] = [
    ["Scan mode", result.modeLabel],
    ["Target URL", safeText(result.meta.finalUrl || result.url, 80)],
    ["Original URL", safeText(result.url, 80)],
    ["Page Title", safeText(result.meta.title || "—", 80)],
    ["HTTP Status", String(result.meta.httpStatus ?? "—")],
    ["Content-Type", safeText(result.meta.contentType || "—", 60)],
    ["Server", safeText(result.meta.server || "—", 60)],
    ["Word Count", String(result.meta.wordCount ?? "—")],
    ["Fetch Time (ms)", String(result.meta.fetchMs ?? "—")],
    ["Scanned At", new Date(result.scannedAt).toLocaleString()],
  ];
  if (result.security) {
    overviewRows.push(["HTTPS", result.security.https ? "Yes" : "No"]);
    overviewRows.push(["Mixed Content", result.security.mixedContent ? "Detected" : "None"]);
  }
  autoTable(doc, {
    ...tableOpts(doc, "Overview", y),
    head: [["Field", "Value"]],
    body: overviewRows,
    columnStyles: {
      0: { cellWidth: 45, fontStyle: "bold" as const, textColor: GREEN.ink },
      1: { cellWidth: 125, textColor: GREEN.body },
    },
  });
  y = getLastY(doc) + 8;

  // Section 2 — Score Breakdown
  if (needsBreak(doc, y, 50)) {
    doc.addPage();
    drawPageHeader(doc, "Overview");
    y = PAGE.topStart;
  }
  y = renderScoreBreakdown(doc, y, result);

  // Section 3 — Top Priorities
  if (needsBreak(doc, y, 40)) {
    doc.addPage();
    drawPageHeader(doc, "Overview");
    y = PAGE.topStart;
  }
  y = renderTopPriorities(doc, y, result);

  // ============ DIMENSION PAGES (one per dimension present) ============
  if (result.content || result.grammar) {
    doc.addPage();
    drawPageHeader(doc, "Content & Clarity");
    y = PAGE.topStart;
    y = renderContentSection(doc, y, result, counter);
  }
  if (result.security) {
    doc.addPage();
    drawPageHeader(doc, "Security & Privacy");
    y = PAGE.topStart;
    y = renderSecuritySection(doc, y, result, counter);
    if (result.security.intel) {
      y = renderDomainIntelSection(doc, y, result, counter);
    }
  }
  if (result.seo) {
    doc.addPage();
    drawPageHeader(doc, "SEO & Discoverability");
    y = PAGE.topStart;
    y = renderSeoSection(doc, y, result, counter);
  }
  if (result.performance) {
    doc.addPage();
    drawPageHeader(doc, "Performance & Speed");
    y = PAGE.topStart;
    y = renderPerformanceSection(doc, y, result, counter);
  }
  if (result.accessibility) {
    doc.addPage();
    drawPageHeader(doc, "Accessibility");
    y = PAGE.topStart;
    y = renderAccessibilitySection(doc, y, result, counter);
  }

  // ============ LAST PAGE — Fixes & Methodology ============
  doc.addPage();
  drawPageHeader(doc, "Fixes & Methodology");
  y = PAGE.topStart;
  y = renderConsolidatedFixes(doc, y, result, counter);
  y = renderMethodology(doc, y, result, counter);

  // ============ FOOTER OVERLAY (every interior page) ============
  drawPageFooters(doc, result.modeLabel);

  // ============ METADATA ============
  doc.setProperties({
    title: `KODAND ${result.modeLabel} Report — ${result.meta.finalUrl || result.url}`,
    subject: `${result.modeLabel} audit report`,
    author: "KODAND",
    creator: "KODAND",
    keywords: `KODAND, ${result.modeLabel}, audit, report, website`,
  });

  return doc.output("blob");
}

export function downloadReportPdf(result: ScanResult) {
  const blob = generateReportPdf(result);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const modeSlug = result.mode === "full" ? "360-Audit" : result.mode;
  const safeUrlPart = (result.meta.finalUrl || result.url)
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .slice(0, 60);
  a.download = `KODAND-${modeSlug}-${safeUrlPart}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
