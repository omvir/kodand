"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * KODAND logo — the official brand wordmark.
 *
 * Renders the transparent PNG at `/kodand-logo.png` (dark forest-green KODAND
 * letters with internal mechanical/gear details, transparent background).
 * The image's natural aspect ratio is ~5:1 (1156×231), so we always preserve
 * that ratio when sizing — never distort.
 *
 * Sizes map to a pixel height; width is computed from the aspect ratio so the
 * logo fits perfectly within existing containers without disrupting layout.
 */

/** Natural aspect ratio (width / height) of the transparent PNG logo. */
const LOGO_ASPECT = 1222 / 240;

export function KodandLogo({
  className,
  size = "md",
  showText = true,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}) {
  const height = {
    sm: 22,
    md: 32,
    lg: 52,
    xl: 88,
  }[size];

  if (!showText) {
    // When showText is false, render a tiny square icon mark — a single
    // faceted-emerald letter "K" rendered as SVG (the only place we use the
    // vector fallback). This keeps the footer/sidebar compact.
    return <KMark size={height} className={className} />;
  }

  return (
    <div className={cn("flex items-center", className)}>
      <ImageLogo height={height} />
    </div>
  );
}

/**
 * The official KODAND brand wordmark as a transparent PNG.
 * Renders an <img> with the supplied height; width is computed from the
 * natural aspect ratio so the image is never distorted.
 */
export function ImageLogo({
  height = 32,
  className,
  priority = false,
}: {
  height?: number;
  className?: string;
  priority?: boolean;
}) {
  const width = Math.round(height * LOGO_ASPECT);
  return (
    <img
      src="/kodand-logo.png"
      alt="KODAND"
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      className={cn("block h-auto w-auto select-none", className)}
      draggable={false}
      style={{
        height: `${height}px`,
        width: `${width}px`,
        // The logo's letter colors are dark forest green, very close to the
        // page background. The built-in PNG glow halo handles most of the
        // visibility, but we add a light drop-shadow here for extra pop on
        // dark backgrounds. Using a light sage-green shadow (not dark) so
        // it reads as a glow, not a shadow.
        filter:
          "drop-shadow(0 0 3px rgba(140, 170, 150, 0.5)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))",
      }}
    />
  );
}

/* =============================================================================
 * KMark — a tiny SVG "K" icon used when only a compact mark is needed (e.g.
 * `showText={false}` in the footer). Pure SVG so it scales crisply at small sizes.
 * Styled to match the brand: dark forest-green letter with a subtle gold rim.
 * =============================================================================
 */

function KMark({
  size = 22,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const id = React.useId().replace(/[:]/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block", className)}
      aria-label="KODAND"
      role="img"
    >
      <defs>
        <linearGradient id={`km-body-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f7359" />
          <stop offset="50%" stopColor="#3d5c46" />
          <stop offset="100%" stopColor="#24362b" />
        </linearGradient>
        <linearGradient id={`km-gold-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
      </defs>
      <text
        x="50"
        y="84"
        textAnchor="middle"
        fontFamily="'Geist Mono', ui-monospace, monospace"
        fontWeight="900"
        fontSize="100"
        fill={`url(#km-gold-${id})`}
      >
        K
      </text>
      <text
        x="50"
        y="84"
        textAnchor="middle"
        fontFamily="'Geist Mono', ui-monospace, monospace"
        fontWeight="900"
        fontSize="96"
        fill={`url(#km-body-${id})`}
      />
      <text
        x="50"
        y="84"
        textAnchor="middle"
        fontFamily="'Geist Mono', ui-monospace, monospace"
        fontWeight="900"
        fontSize="96"
        fill="none"
        stroke="rgba(212,175,55,0.7)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      >
        K
      </text>
    </svg>
  );
}
