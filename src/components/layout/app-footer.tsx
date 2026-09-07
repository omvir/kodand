"use client";

import * as React from "react";
import { ImageLogo } from "@/components/kodand-logo";
import { Badge } from "@/components/ui/badge";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-emerald-500/15 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto max-w-[1600px] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <ImageLogo height={18} />
          <span className="font-mono uppercase tracking-wider hidden sm:inline">· 360° audit</span>
        </div>
        <div className="flex items-center gap-2 text-center flex-wrap justify-center">
          <span className="font-mono">Free public sources:</span>
          {["NVD CVE", "RDAP WHOIS", "DNS", "TLS", "crt.sh", "Google Autocomplete"].map((s) => (
            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-emerald-500/30 text-emerald-200 bg-emerald-500/5">
              {s}
            </Badge>
          ))}
          <span className="font-mono opacity-70">KODAND is polite (1 req/800ms · 5-min cache)</span>
        </div>
      </div>
      <div className="mx-auto max-w-[1600px] px-4 pb-2 text-[10px] text-muted-foreground/70 text-center">
        🔒 Your data stays in your browser — we never upload or store it. Save your PDFs; your scan history clears when you close the browser.
      </div>
    </footer>
  );
}
