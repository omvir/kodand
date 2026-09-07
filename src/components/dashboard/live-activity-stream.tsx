"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { LogEntry } from "./dashboard-types";

export function LiveActivityStream({
  logs,
  onClear,
}: {
  logs: LogEntry[];
  onClear: () => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full min-h-0 rounded-xl border border-emerald-500/15 bg-card/40 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-3 h-10 border-b border-emerald-500/15 bg-emerald-950/30">
        <div className="flex items-center gap-2 text-xs text-emerald-300 font-mono uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live activity
          {logs.length > 0 && (
            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 border-emerald-500/30 text-emerald-200">
              {logs.length}
            </Badge>
          )}
        </div>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-muted-foreground hover:text-rose-300 flex items-center gap-1"
          >
            <Trash2 className="size-3" /> Clear
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto kodand-chat-scroll p-2 font-mono text-[11px] leading-relaxed space-y-0.5 max-h-[60vh] lg:max-h-none"
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground italic px-2 py-6 text-center">
            Activity stream is idle. Start a scan to see live log lines here.
          </div>
        ) : (
          logs.map((l) => {
            const t = new Date(l.ts).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            const cls =
              l.kind === "error"
                ? "text-rose-300"
                : l.kind === "stage"
                ? "text-emerald-300"
                : "text-muted-foreground";
            const prefix =
              l.kind === "error" ? "✗" : l.kind === "stage" ? "▸" : "·";
            return (
              <div key={l.id} className={`kodand-line-fade ${cls} flex gap-1.5`}>
                <span className="text-muted-foreground/60 flex-shrink-0">{t}</span>
                <span className="flex-shrink-0 opacity-70">{prefix}</span>
                <span className="break-words min-w-0">{l.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
