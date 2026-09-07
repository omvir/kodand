"use client";

import * as React from "react";
import { ScanMode, SCAN_MODES } from "@/lib/audit-types";
import { History, Radar, Trash2, XCircle } from "lucide-react";
import {
  MODE_ACCENT,
  MODE_ICON,
  gradeBadgeClass,
  modeMeta,
  modeShort,
  prettyHost,
  relativeTime,
} from "./dashboard-types";

export function SidebarModeButton({
  mode,
  selected,
  disabled,
  onClick,
}: {
  mode: ScanMode;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const m = modeMeta(mode);
  const Icon = MODE_ICON[mode];
  const a = MODE_ACCENT[mode];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "kodand-side-mode w-full text-left p-2.5 rounded-lg border flex items-start gap-2.5 transition-colors",
        selected
          ? `${a.border} ${a.bg} ${a.text} kodand-step-active`
          : "border-emerald-500/10 bg-card/40 text-muted-foreground hover:bg-emerald-500/5 hover:border-emerald-400/30",
        "disabled:opacity-50",
      ].join(" ")}
    >
      <Icon
        className={[
          "size-4 mt-0.5 flex-shrink-0",
          selected ? a.text : "text-muted-foreground",
        ].join(" ")}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold flex items-center justify-between gap-2">
          <span className={selected ? a.text : "text-foreground"}>{m.short}</span>
          <span className="text-[10px] text-muted-foreground font-mono">~{m.estSeconds}s</span>
        </div>
        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
          {m.blurb}
        </div>
      </div>
    </button>
  );
}

export function DashboardSidebar({
  viewMode,
  status,
  onView,
  onRun,
  history,
  onReRun,
  onClearHistory,
  onRemoveHistory,
}: {
  viewMode: ScanMode;
  status: "idle" | "scanning";
  onView: (mode: ScanMode) => void;
  onRun: (mode: ScanMode) => void;
  history: { id: string; url: string; mode: ScanMode; grade: string; score: number; scannedAt: string }[];
  onReRun: (entry: { url: string; mode: ScanMode }) => void;
  onClearHistory: () => void;
  onRemoveHistory: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <Radar className="size-3.5 text-emerald-300" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-emerald-300/80">Scan modes</h2>
        </div>
        <div className="space-y-1.5">
          {SCAN_MODES.map((m) => (
            <SidebarModeButton
              key={m.id}
              mode={m.id}
              selected={viewMode === m.id}
              disabled={status === "scanning"}
              onClick={() => onView(m.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <History className="size-3.5 text-emerald-300" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-emerald-300/80">Recent scans</h2>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="text-[10px] text-muted-foreground hover:text-rose-300 flex items-center gap-1"
            >
              <Trash2 className="size-3" /> Clear
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2 py-2">
            No scans yet. History is saved in this browser only.
          </p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto kodand-chat-scroll">
            {history.slice(0, 20).map((e) => {
              const a = MODE_ACCENT[e.mode];
              return (
                <li key={e.id}>
                  <div className="group flex items-start gap-2 p-2 rounded-md hover:bg-emerald-500/5 border border-transparent hover:border-emerald-500/15 transition-colors">
                    <button
                      type="button"
                      onClick={() => onReRun({ url: e.url, mode: e.mode })}
                      disabled={status === "scanning"}
                      className="flex-1 text-left min-w-0 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${gradeBadgeClass(e.grade)}`}>
                          {e.grade} {e.score}
                        </span>
                        <span className={`${a.text} text-[10px] uppercase tracking-wider`}>{modeShort(e.mode)}</span>
                      </div>
                      <div className="text-xs text-foreground/90 truncate mt-0.5">{prettyHost(e.url)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(e.scannedAt)}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveHistory(e.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-300 p-1 transition-opacity"
                      aria-label="Remove from history"
                    >
                      <XCircle className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
