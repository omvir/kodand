"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Severity } from "@/lib/audit-types";

export const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export function severityStyle(sev: Severity) {
  switch (sev) {
    case "critical":
      return { border: "border-red-500/40", pill: "bg-red-500/20 text-red-200 border-red-500/40", text: "text-red-300", dot: "bg-red-500" };
    case "high":
      return { border: "border-rose-500/40", pill: "bg-rose-500/20 text-rose-200 border-rose-500/40", text: "text-rose-300", dot: "bg-rose-500" };
    case "medium":
      return { border: "border-amber-500/40", pill: "bg-amber-500/20 text-amber-200 border-amber-500/40", text: "text-amber-300", dot: "bg-amber-500" };
    case "low":
      return { border: "border-sky-500/40", pill: "bg-sky-500/20 text-sky-200 border-sky-500/40", text: "text-sky-300", dot: "bg-sky-500" };
    default:
      return { border: "border-emerald-500/30", pill: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-500" };
  }
}

export function scoreHex(s: number): string {
  if (s >= 85) return "#34d399";
  if (s >= 70) return "#10b981";
  if (s >= 50) return "#facc15";
  if (s >= 30) return "#f59e0b";
  return "#ef4444";
}

/* ----- CountUp: animated number counter ----- */
export function CountUp({ value, duration = 800, className }: { value: number; duration?: number; className?: string }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const pct = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(value * eased));
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className}>{display}</span>;
}

/* ----- ScoreGauge: 270° circular SVG arc (animated, colored by score) ----- */
export function ScoreGauge({
  score,
  size = 92,
  color = "#10b981",
  suffix = "/ 100",
}: {
  score: number;
  size?: number;
  color?: string;
  suffix?: string;
}) {
  const r = 38;
  const cx = 50;
  const cy = 50;
  const polar = (a: number) => {
    const rad = (a * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const sp = polar(135);
  const ep = polar(135 + 270);
  const arc = `M ${sp.x} ${sp.y} A ${r} ${r} 0 1 1 ${ep.x} ${ep.y}`;
  const circumference = 2 * Math.PI * r * (270 / 360);
  const dashLen = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      if (t0 === null) t0 = t;
      const pct = Math.min(1, (t - t0) / 800);
      const eased = 1 - Math.pow(1 - pct, 3);
      setDisplay(Math.round(score * eased));
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="flex-shrink-0"
      initial={{ scale: 0.85, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <path d={arc} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className="text-emerald-950/40" />
      <motion.path
        d={arc}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circumference}` }}
        animate={{ strokeDasharray: `${dashLen} ${circumference}` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
      />
      <text x="50" y="48" textAnchor="middle" dominantBaseline="central" fill={color} style={{ font: "800 22px ui-sans-serif, system-ui" }}>
        {display}
      </text>
      <text x="50" y="68" textAnchor="middle" fill="currentColor" style={{ font: "500 7px ui-sans-serif, system-ui", opacity: 0.7 }}>
        {suffix}
      </text>
    </motion.svg>
  );
}

/* ----- SeverityBreakdown: colored dots for severity counts ----- */
export function SeverityBreakdown({
  counts,
}: {
  counts: { critical: number; high: number; medium: number; low: number; info: number };
}) {
  const items: [Severity, number][] = [
    ["critical", counts.critical],
    ["high", counts.high],
    ["medium", counts.medium],
    ["low", counts.low],
    ["info", counts.info],
  ];
  const visible = items.filter(([, n]) => n > 0);
  if (visible.length === 0) {
    return <span className="text-[10px] text-emerald-300 font-mono">no findings</span>;
  }
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      {visible.map(([sev, n]) => {
        const s = severityStyle(sev);
        return (
          <span key={sev} className="flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${s.dot}`} />
            <span className={s.text}>{n}</span>
          </span>
        );
      })}
    </div>
  );
}
