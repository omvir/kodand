"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScanResult } from "@/lib/audit-types";
import { downloadReportPdf, WhiteLabelOptions } from "@/lib/pdf-report";
import { Crown, Download, FileText, Sparkles, Building2, Globe, Shield, CheckCircle2 } from "lucide-react";

export interface WhiteLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ScanResult | null;
  onOpenUpgradeModal: () => void;
}

export function WhiteLabelModal({
  open,
  onOpenChange,
  result,
  onOpenUpgradeModal,
}: WhiteLabelModalProps) {
  const [agencyName, setAgencyName] = React.useState("");
  const [agencyTagline, setAgencyTagline] = React.useState("Confidential 360° Technical & SEO Audit");
  const [agencyWebsite, setAgencyWebsite] = React.useState("");
  const [isExporting, setIsExporting] = React.useState(false);

  // Check if active subscription in localStorage
  const [isPro, setIsPro] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const tier = localStorage.getItem("kodand_saas_tier");
      setIsPro(tier === "agency" || tier === "starter");
      const savedAgency = localStorage.getItem("kodand_agency_name");
      if (savedAgency) setAgencyName(savedAgency);
      const savedWeb = localStorage.getItem("kodand_agency_web");
      if (savedWeb) setAgencyWebsite(savedWeb);
    }
  }, [open]);

  if (!result) return null;

  const handleStandardDownload = () => {
    downloadReportPdf(result);
    onOpenChange(false);
  };

  const handleWhiteLabelDownload = () => {
    if (!agencyName.trim()) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("kodand_agency_name", agencyName);
      localStorage.setItem("kodand_agency_web", agencyWebsite);
    }

    setIsExporting(true);
    setTimeout(() => {
      const options: WhiteLabelOptions = {
        agencyName: agencyName.trim(),
        agencyTagline: agencyTagline.trim(),
        agencyWebsite: agencyWebsite.trim(),
        hideWatermark: true,
      };
      downloadReportPdf(result, options);
      setIsExporting(false);
      onOpenChange(false);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-zinc-950/95 border-emerald-500/30 text-zinc-100 backdrop-blur-xl shadow-2xl p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Export Executive Audit PDF
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Choose standard KODAND report or export a custom-branded White-Label audit for your clients.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Option 1: Standard */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-zinc-200">Standard Audit Report</div>
              <p className="text-xs text-zinc-400">Includes complete scores, breakdown, and KODAND branding.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStandardDownload}
              className="border-zinc-700 hover:border-zinc-500 text-xs shrink-0"
            >
              <Download className="size-3.5 mr-1.5" />
              Download Free
            </Button>
          </div>

          {/* Option 2: White-Label Agency */}
          <div className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-950/20 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-emerald-400" />
                <span className="font-bold text-sm text-emerald-300">Agency White-Label Report</span>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                Agency Pro Feature
              </Badge>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Replace all KODAND logos and footers with your agency branding so you can bill clients directly for this audit.
            </p>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-300 flex items-center gap-1.5 mb-1">
                  <Building2 className="size-3.5 text-emerald-400" /> Agency / Company Name
                </Label>
                <Input
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Apex Growth Digital"
                  className="h-9 text-xs bg-zinc-900/90 border-zinc-700 focus:border-emerald-500"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-300 flex items-center gap-1.5 mb-1">
                  <Globe className="size-3.5 text-emerald-400" /> Agency Website (Optional)
                </Label>
                <Input
                  value={agencyWebsite}
                  onChange={(e) => setAgencyWebsite(e.target.value)}
                  placeholder="e.g. https://apexgrowth.agency"
                  className="h-9 text-xs bg-zinc-900/90 border-zinc-700 focus:border-emerald-500"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-300 flex items-center gap-1.5 mb-1">
                  <Shield className="size-3.5 text-emerald-400" /> Custom Subtitle
                </Label>
                <Input
                  value={agencyTagline}
                  onChange={(e) => setAgencyTagline(e.target.value)}
                  placeholder="e.g. Confidential 360° Technical & SEO Audit"
                  className="h-9 text-xs bg-zinc-900/90 border-zinc-700 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Live Branding Preview */}
            {agencyName.trim() && (
              <div className="mt-3 p-2.5 rounded-lg bg-black/60 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">PDF Cover Header Preview:</span>
                  <span className="font-bold text-amber-300">{agencyName.toUpperCase()}</span>
                  {agencyWebsite && <span className="text-zinc-400 ml-2">· {agencyWebsite}</span>}
                </div>
                <CheckCircle2 className="size-4 text-emerald-400" />
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              {!isPro ? (
                <Button
                  onClick={onOpenUpgradeModal}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-bold text-xs h-9 shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles className="size-3.5 mr-1.5" />
                  Unlock Agency White-Label ($49/mo)
                </Button>
              ) : (
                <Button
                  onClick={handleWhiteLabelDownload}
                  disabled={!agencyName.trim() || isExporting}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-9 shadow-lg shadow-emerald-500/20"
                >
                  <Download className="size-3.5 mr-1.5" />
                  {isExporting ? "Generating Client PDF..." : "Export White-Label PDF"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
