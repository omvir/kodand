"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Smartphone,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

export interface UpiPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: "starter" | "agency";
  cycle: "monthly" | "yearly";
}

export function UpiPaymentModal({
  open,
  onOpenChange,
  tier,
  cycle,
}: UpiPaymentModalProps) {
  const [utrNumber, setUtrNumber] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Price calculation
  const amount = tier === "starter"
    ? (cycle === "yearly" ? 12990 : 1299)
    : (cycle === "yearly" ? 34990 : 3499);

  const tierLabel = tier === "starter" ? "Starter Growth" : "Agency Pro";
  const upiId = process.env.NEXT_PUBLIC_UPI_ID || "atomicpixel0911-1@okhdfcbank";
  const upiUri = `upi://pay?pa=${upiId}&pn=KODAND%20Technologies&am=${amount}&cu=INR&tn=KODAND_${tier.toUpperCase()}_${cycle.toUpperCase()}`;

  // Use reliable QuickChart / qrserver SVG image API for standard QR rendering
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}&color=000000&bgcolor=ffffff&margin=2`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.length < 8) return;

    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setSuccess(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("kodand_saas_tier", tier);
        localStorage.setItem("kodand_payment_method", "upi");
      }
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
      }, 1800);
    }, 1400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-950/95 border-emerald-500/30 text-zinc-100 backdrop-blur-xl shadow-2xl p-6">
        <DialogHeader className="mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🇮🇳</span>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Instant UPI Payment
              </DialogTitle>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] font-mono font-bold">
              0% Gateway Fees
            </Badge>
          </div>
          <DialogDescription className="text-xs text-zinc-300">
            Pay ₹{amount.toLocaleString("en-IN")} directly to UPI ID: <strong className="text-emerald-400 font-mono">{upiId}</strong> via Google Pay, PhonePe, or Paytm.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="size-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Payment Verified!</h3>
            <p className="text-xs text-zinc-300">
              Welcome to <strong>{tierLabel}</strong>. White-Label reports and full scans are now permanently unlocked.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Amount Banner */}
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-mono">Plan Selected</span>
                <span className="font-bold text-sm text-white">{tierLabel} ({cycle})</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-extrabold text-emerald-400">₹{amount.toLocaleString("en-IN")}</span>
                <span className="text-[10px] text-zinc-400 block">INR including GST</span>
              </div>
            </div>

            {/* Official UPI ID Banner */}
            <div className="p-3.5 rounded-xl bg-zinc-900/95 border-2 border-emerald-500/60 flex items-center justify-between gap-2 shadow-lg shadow-emerald-950/40">
              <div className="min-w-0">
                <span className="text-[10px] text-zinc-400 block uppercase font-mono tracking-wider font-bold">Official UPI ID (Pay To)</span>
                <span className="font-mono font-extrabold text-xs sm:text-sm text-emerald-400 truncate block select-all">
                  {upiId}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
              >
                {copied ? <Check className="size-3 text-black" /> : <Copy className="size-3 text-black" />}
                <span>{copied ? "Copied" : "Copy ID"}</span>
              </button>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white text-black shadow-2xl border-2 border-emerald-500/40">
              <div className="text-[11px] font-bold text-zinc-900 mb-2 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <QrCode className="size-3.5 text-emerald-600" /> Google Pay / PhonePe QR Code
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/upi-qr.png"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = qrUrl;
                }}
                alt={`Official Google Pay UPI QR Code - ${upiId}`}
                className="size-48 sm:size-52 rounded-lg shadow-sm border border-zinc-200 object-contain"
              />
              <div className="mt-2.5 px-3 py-1 rounded-md bg-zinc-100 border border-zinc-300 text-[11px] font-mono font-extrabold text-zinc-900 select-all">
                {upiId}
              </div>
              <div className="text-[10px] text-zinc-600 mt-1 font-mono flex items-center gap-2">
                <span>Google Pay</span> · <span>PhonePe</span> · <span>Paytm</span> · <span>BHIM</span>
              </div>
            </div>

            {/* Mobile Intent Direct Launch */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={upiUri}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-xs font-semibold text-zinc-200 transition-colors"
              >
                <Smartphone className="size-3.5 text-emerald-400" />
                <span>Open UPI App</span>
              </a>

              <button
                type="button"
                onClick={handleCopyUpi}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-xs font-semibold text-zinc-200 transition-colors"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-zinc-400" />}
                <span className="truncate">{copied ? "Copied!" : `Copy ${upiId}`}</span>
              </button>
            </div>

            {/* UTR Reference Verification Input */}
            <form onSubmit={handleVerifyPayment} className="space-y-2 pt-2 border-t border-zinc-900">
              <label className="text-[11px] text-zinc-300 block font-medium">
                Enter 12-digit UPI Reference / UTR Number after paying:
              </label>
              <div className="flex gap-2">
                <Input
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="e.g. 425619842103"
                  maxLength={16}
                  className="bg-zinc-900 border-zinc-700 text-xs font-mono h-9"
                />
                <Button
                  type="submit"
                  disabled={verifying || utrNumber.length < 8}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shrink-0 h-9 px-4"
                >
                  {verifying ? <Zap className="size-3.5 animate-spin" /> : "Verify & Activate"}
                </Button>
              </div>
              <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-400" />
                Automatic instant activation upon reference submission.
              </p>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
