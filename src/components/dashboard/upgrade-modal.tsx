"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, Shield, ArrowRight, Building2, UserCheck } from "lucide-react";

export interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTier?: "starter" | "agency";
  sourceFeature?: string;
}

export function UpgradeModal({
  open,
  onOpenChange,
  defaultTier = "agency",
  sourceFeature,
}: UpgradeModalProps) {
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("yearly");
  const [selectedTier, setSelectedTier] = React.useState<"starter" | "agency">(defaultTier);
  const [isUpgrading, setIsUpgrading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (defaultTier) setSelectedTier(defaultTier);
  }, [defaultTier]);

  const handleCheckout = () => {
    setIsUpgrading(true);
    // Simulate activation or redirect to Stripe/LemonSqueezy checkout
    setTimeout(() => {
      setIsUpgrading(false);
      setSuccess(true);
      // Store in localStorage for client demo persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("kodand_saas_tier", selectedTier);
      }
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1600);
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950/95 border-emerald-500/30 text-zinc-100 backdrop-blur-xl shadow-2xl p-0 overflow-hidden">
        {/* Glow Header */}
        <div className="relative p-6 pb-4 border-b border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-950">
          <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <Crown className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Unlock KODAND Pro
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                    Instant Access
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {sourceFeature
                    ? `Upgrade to unlock ${sourceFeature} and client-ready agency capabilities.`
                    : "Supercharge your website audits with white-label reports & deep competitor intelligence."}
                </DialogDescription>
              </div>
            </div>

            {/* Billing Toggle */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  billingCycle === "monthly"
                    ? "bg-zinc-800 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                  billingCycle === "yearly"
                    ? "bg-emerald-500 text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>Yearly</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/30 font-bold uppercase tracking-wider">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Starter Tier */}
          <div
            onClick={() => setSelectedTier("starter")}
            className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
              selectedTier === "starter"
                ? "border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/50"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-zinc-400" />
                <span className="font-bold text-sm text-white">Starter</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-white">
                  {billingCycle === "yearly" ? "$15" : "$19"}
                </span>
                <span className="text-[10px] text-zinc-400">/mo</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-3">For freelancers and solo creators needing deep technical audits.</p>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span><strong>100 scans</strong> per month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span>Full 360° Tech + Security + SEO</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span>Keyword Explorer & SERP Preview</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span>Standard PDF Report Download</span>
              </li>
            </ul>
          </div>

          {/* Agency Pro Tier */}
          <div
            onClick={() => setSelectedTier("agency")}
            className={`cursor-pointer rounded-xl p-4 border transition-all relative ${
              selectedTier === "agency"
                ? "border-emerald-500/80 bg-emerald-950/30 ring-2 ring-emerald-500 shadow-lg shadow-emerald-950/40"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
            }`}
          >
            <div className="absolute -top-2.5 right-4">
              <Badge className="bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-bold text-[10px] px-2 py-0.5 shadow-md">
                MOST POPULAR
              </Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-emerald-400" />
                <span className="font-bold text-sm text-emerald-300">Agency Pro</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-white">
                  {billingCycle === "yearly" ? "$39" : "$49"}
                </span>
                <span className="text-[10px] text-zinc-400">/mo</span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-3">For digital agencies pitching clients & charging for audit deliverables.</p>
            <ul className="space-y-1.5 text-xs text-zinc-200">
              <li className="flex items-center gap-2 font-medium text-emerald-300">
                <Sparkles className="size-3.5 text-emerald-400 shrink-0" />
                <span><strong>White-Label PDF</strong> (Your logo & colors)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span><strong>1,000 scans</strong> / month</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span>Side-by-side <strong>Competitor Audits</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span>Client Presentation Mode</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span>Priority Edge Processing</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer / Action */}
        <div className="p-6 pt-2 border-t border-zinc-900 bg-zinc-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Shield className="size-4 text-emerald-400" />
            <span>14-day money back guarantee · Cancel anytime</span>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={isUpgrading || success}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-6 h-10 shadow-lg shadow-emerald-500/20"
          >
            {success ? (
              <span className="flex items-center gap-1.5 text-emerald-950">
                <Check className="size-4" /> Activated! Welcome to Pro
              </span>
            ) : isUpgrading ? (
              <span className="flex items-center gap-1.5">
                <Zap className="size-4 animate-spin" /> Processing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Upgrade to {selectedTier === "agency" ? "Agency Pro" : "Starter"}
                <ArrowRight className="size-4" />
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
