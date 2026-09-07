"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ContentDimension } from "@/lib/audit-types";
import { Sparkles } from "lucide-react";
import { ScoreGauge } from "./score-gauge";
import { FindingsList, contentItem } from "./findings-table";
import { IntelCard, Stat } from "./security-intel-panel";

export function KeywordBarChart({ keywords }: { keywords: { word: string; count: number; density: number }[] }) {
  if (keywords.length === 0) return null;
  const max = keywords[0].density || 1;
  return (
    <div className="space-y-1.5">
      {keywords.map((kw, i) => (
        <div key={kw.word + i} className="flex items-center gap-2 text-xs">
          <div className="w-20 truncate font-mono text-muted-foreground" title={kw.word}>
            {kw.word}
          </div>
          <div className="flex-1 h-3 rounded bg-emerald-950/40 overflow-hidden border border-emerald-500/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(8, (kw.density / max) * 100)}%` }}
              transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
              className={`h-full rounded ${i === 0 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-emerald-600 to-emerald-400"} kodand-bar-shimmer`}
            />
          </div>
          <div className="w-14 text-right font-mono text-[10px] text-muted-foreground">
            <span className="text-foreground font-bold">{kw.count}</span>
            <span> · {kw.density.toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContentMetricsDashboard({ dim }: { dim: ContentDimension }) {
  const m = dim.metrics;
  const readabilityColor = m
    ? m.fleschReadingEase >= 70
      ? "#10b981"
      : m.fleschReadingEase >= 50
      ? "#facc15"
      : m.fleschReadingEase >= 30
      ? "#f59e0b"
      : "#ef4444"
    : "#10b981";
  return (
    <div className="space-y-3">
      {dim.summary && <p className="text-xs text-foreground/80 italic">{dim.summary}</p>}
      {m && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3 items-center">
            <div className="flex justify-center">
              <ScoreGauge score={m.fleschReadingEase} size={110} color={readabilityColor} suffix="Flesch" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Reading level" value={m.readingLevel} />
              <Stat label="Reading time" value={`${m.readingTimeMin} min`} />
              <Stat label="Tone" value={<span className="capitalize">{m.tone}</span>} />
              <Stat label="F-K Grade" value={m.fleschKincaidGrade} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Words" value={m.wordCount.toLocaleString()} />
            <Stat label="Sentences" value={m.sentenceCount.toLocaleString()} />
            <Stat label="Paragraphs" value={m.paragraphCount.toLocaleString()} />
            <Stat label="Unique words" value={m.uniqueWords.toLocaleString()} />
          </div>
          {m.topKeywords.length > 0 && (
            <IntelCard icon={Sparkles} title="Top 10 keywords · density">
              <KeywordBarChart keywords={m.topKeywords} />
            </IntelCard>
          )}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Passive voice" value={m.passiveVoiceSentences} />
            <Stat label="Long sentences" value={m.longSentences} />
            <Stat label="Type-token ratio" value={m.typeTokenRatio.toFixed(3)} />
          </div>
        </>
      )}
      <FindingsList items={dim.findings.map(contentItem)} defaultOpenCount={1} />
    </div>
  );
}
