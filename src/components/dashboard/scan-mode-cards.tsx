"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ScanMode, SCAN_MODES } from "@/lib/audit-types";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MODE_ACCENT,
  MODE_ICON,
  gradeBadgeClass,
  modeMeta,
  shortTime,
} from "./dashboard-types";

export type ModeStatus = "idle" | "running" | "complete";

export function ModeStatusBox({
  mode,
  status,
  score,
  grade,
  disabled,
  onClick,
}: {
  mode: ScanMode;
  status: ModeStatus;
  score?: number;
  grade?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const m = modeMeta(mode);
  const Icon = MODE_ICON[mode];
  const a = MODE_ACCENT[mode];

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-pressed={status === "running"}
            className={[
              "kodand-mode-card relative w-full text-left p-3 rounded-xl border transition-colors overflow-hidden",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              status === "running"
                ? `${a.border} ${a.bg} kodand-step-active shadow-lg ${a.glow}`
                : status === "complete"
                ? `border-emerald-500/40 bg-emerald-500/5`
                : "border-emerald-500/10 bg-card/40 hover:bg-emerald-500/5 hover:border-emerald-400/30",
            ].join(" ")}
          >
            {status === "running" && (
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${a.solid} kodand-bar-shimmer`} />
            )}

            <div className="flex items-center gap-2">
              <div
                className={[
                  "size-9 rounded-lg flex items-center justify-center border flex-shrink-0",
                  status === "running"
                    ? `${a.border} ${a.bg} ${a.text}`
                    : status === "complete"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-emerald-500/15 bg-emerald-500/5 text-muted-foreground",
                ].join(" ")}
              >
                {status === "complete" ? (
                  <CheckCircle2 className="size-5" />
                ) : status === "running" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Icon className="size-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    "text-sm font-bold truncate",
                    status === "running" ? a.text : status === "complete" ? "text-emerald-200" : "text-foreground",
                  ].join(" ")}
                >
                  {m.short}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                  {status === "running"
                    ? "scanning…"
                    : status === "complete"
                    ? `done · ${shortTime(new Date().toISOString())}`
                    : "idle"}
                </div>
              </div>
              {status === "complete" && typeof score === "number" && grade && (
                <div className={`px-1.5 py-0.5 rounded border text-[10px] font-mono ${gradeBadgeClass(grade)}`}>
                  {grade} {score}
                </div>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {status === "running"
            ? `${m.label} is scanning…`
            : status === "complete"
            ? `${m.label} · ${grade} ${score}/100 — click to re-run`
            : `Start ${m.label}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ModeStatusBar({
  currentMode,
  completedByMode,
  disabled,
  onPick,
}: {
  currentMode: ScanMode | null;
  completedByMode: Partial<Record<ScanMode, { score: number; grade: string }>>;
  disabled: boolean;
  onPick: (mode: ScanMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {SCAN_MODES.map((m) => {
        const status: ModeStatus =
          currentMode === m.id ? "running" : completedByMode[m.id] ? "complete" : "idle";
        const done = completedByMode[m.id];
        return (
          <ModeStatusBox
            key={m.id}
            mode={m.id}
            status={status}
            score={done?.score}
            grade={done?.grade}
            disabled={disabled && status !== "running"}
            onClick={() => onPick(m.id)}
          />
        );
      })}
    </div>
  );
}

export function ModeTabBar({
  viewMode,
  completedByMode,
  scanning,
  scanningMode,
  onView,
  onRun,
}: {
  viewMode: ScanMode;
  completedByMode: Partial<Record<ScanMode, { score: number; grade: string }>>;
  scanning: boolean;
  scanningMode: ScanMode | null;
  onView: (mode: ScanMode) => void;
  onRun: (mode: ScanMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      {SCAN_MODES.map((m) => {
        const a = MODE_ACCENT[m.id];
        const Icon = MODE_ICON[m.id];
        const isFocused = viewMode === m.id;
        const isScanningThis = scanning && scanningMode === m.id;
        const done = completedByMode[m.id];
        return (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => onView(m.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={[
              "kodand-mode-card relative w-full text-left p-3 rounded-xl border transition-colors overflow-hidden",
              isFocused
                ? `${a.border} ${a.bg} shadow-lg ${a.glow}`
                : "border-emerald-500/15 bg-card/40 hover:bg-emerald-500/5 hover:border-emerald-400/30",
            ].join(" ")}
            aria-pressed={isFocused}
          >
            {isFocused && (
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${a.solid}`} />
            )}
            {isScanningThis && (
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${a.solid} kodand-bar-shimmer`} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={[
                  "size-8 rounded-lg flex items-center justify-center border flex-shrink-0",
                  isFocused
                    ? `${a.border} ${a.bg} ${a.text}`
                    : isScanningThis
                    ? `${a.border} ${a.bg} ${a.text}`
                    : done
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-emerald-500/15 bg-emerald-500/5 text-muted-foreground",
                ].join(" ")}
              >
                {isScanningThis ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : done ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    "text-xs font-bold truncate",
                    isFocused ? a.text : "text-foreground",
                  ].join(" ")}
                >
                  {m.short}
                </div>
                <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
                  {isScanningThis
                    ? "scanning…"
                    : done
                    ? `done · ${done.grade} ${done.score}`
                    : "idle"}
                </div>
              </div>
              {done && (
                <div className={`px-1 py-0 rounded border text-[9px] font-mono ${gradeBadgeClass(done.grade)}`}>
                  {done.grade}
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
