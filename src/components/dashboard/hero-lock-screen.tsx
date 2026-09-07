"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ScanMode, SCAN_MODES } from "@/lib/audit-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KodandLogo } from "@/components/kodand-logo";
import { History, Lock, Target } from "lucide-react";
import {
  MODE_ACCENT,
  MODE_ICON,
  gradeBadgeClass,
  modeShort,
  normalizeUrl,
  prettyHost,
} from "./dashboard-types";

export function LockTargetScreen({
  onSubmit,
  recent,
  onReRun,
}: {
  onSubmit: (url: string) => void;
  recent: { id: string; url: string; mode: ScanMode; grade: string; score: number; scannedAt: string }[];
  onReRun: (entry: { url: string; mode: ScanMode }) => void;
}) {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const norm = normalizeUrl(value);
    if (!norm) {
      setError("That doesn't look like a valid URL. Try something like example.com");
      return;
    }
    setError(null);
    onSubmit(norm);
  };

  return (
    <div className="relative flex-1 flex flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="kodand-float absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="kodand-float-slow absolute top-1/3 right-0 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="kodand-float absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 py-10 sm:py-14 flex flex-col items-center text-center flex-1">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <KodandLogo size="lg" className="justify-center mb-6" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm sm:text-base text-emerald-200/80 font-mono uppercase tracking-[0.18em] mb-2"
        >
          360° anonymous website audit
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="text-muted-foreground max-w-2xl mb-8 text-sm sm:text-base"
        >
          Content · Security · SEO · Performance · Accessibility — six independent
          scanners, one target. Pick a target once; every scan reuses it.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          onSubmit={submit}
          className="w-full max-w-2xl flex flex-col sm:flex-row gap-2 items-stretch"
        >
          <div className="relative flex-1">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-emerald-400" />
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter your website URL to begin (e.g. example.com)"
              className="pl-10 h-12 text-base bg-card/80 border-emerald-500/30 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/30"
              aria-label="Website URL"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <Button
            type="submit"
            className="h-12 px-6 text-base bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border border-emerald-400/40 shadow-lg shadow-emerald-500/25"
          >
            <Lock className="size-4 mr-2" /> Lock Target
          </Button>
        </motion.form>

        {error && (
          <Alert className="mt-3 max-w-2xl border-rose-500/40 bg-rose-500/10 text-rose-200 text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5 flex-wrap">
          <Lock className="size-3.5 text-emerald-400" />
          You only enter your domain once. All subsequent scans reuse it.
        </p>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-3 w-full">
          {SCAN_MODES.map((m, i) => {
            const Icon = MODE_ICON[m.id];
            const a = MODE_ACCENT[m.id];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
              >
                <Card className={`kodand-mode-card h-full bg-card/60 backdrop-blur border ${a.border} hover:${a.bg} overflow-hidden`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`size-9 rounded-lg flex items-center justify-center ${a.bg} ${a.text} border ${a.border}`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold ${a.text}`}>{m.short}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">~{m.estSeconds}s</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-3">
                      {m.blurb}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {recent.length > 0 && (
          <div className="mt-10 w-full">
            <div className="flex items-center justify-center gap-2 mb-3 text-xs text-emerald-300/80 font-mono uppercase tracking-wider">
              <History className="size-3.5" /> Recent scans — click to re-run with locked target
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {recent.slice(0, 6).map((e) => {
                const a = MODE_ACCENT[e.mode];
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onReRun({ url: e.url, mode: e.mode })}
                    className="kodand-chip text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 bg-card/60 hover:bg-emerald-500/10 flex items-center gap-2"
                  >
                    <span className={`font-mono px-1.5 py-0.5 rounded border text-[10px] ${gradeBadgeClass(e.grade)}`}>
                      {e.grade} {e.score}
                    </span>
                    <span className={`${a.text} font-semibold`}>{modeShort(e.mode)}</span>
                    <span className="text-muted-foreground truncate max-w-[160px]">
                      {prettyHost(e.url)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
