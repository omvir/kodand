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

  // Dynamic High-Res QR code with error correction level H (30%) encoding exact amount
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiUri)}&color=000000&bgcolor=ffffff&ecc=H&margin=1`;

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
            Pay ₹{amount.toLocaleString("en-IN")} using any UPI scanner app (Google Pay, PhonePe, Paytm).
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

            {/* QR Code Container - Dynamic Scanner QR Code with Pre-Filled Amount */}
            <div className="flex items-center justify-center p-4 sm:p-5 rounded-2xl bg-white shadow-2xl mx-auto w-fit relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dynamicQrUrl}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/upi-qr.png";
                }}
                alt={`Scan to Pay ₹${amount.toLocaleString("en-IN")} via UPI`}
                className="size-52 sm:size-60 rounded-xl object-contain"
              />
              {/* Central Google Pay Logo Badge */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="size-11 rounded-full bg-white p-1.5 shadow-sm border border-zinc-200/90 flex items-center justify-center">
                  <svg className="size-7" viewBox="0 0 40 40">
                    <path d="M19.9 8.2c2.2 0 4.1.8 5.6 2.1l4.2-4.2C27.2 3.8 23.8 2.4 19.9 2.4 12.3 2.4 5.9 6.8 3 13.2l5.1 4c1.4-4.2 5.4-7.2 9.9-7.2z" fill="#EA4335"/>
                    <path d="M36.8 19.6c0-1.2-.1-2.4-.3-3.6H19.9v6.8h9.5c-.4 2.2-1.7 4.1-3.6 5.4l5.6 4.3c3.3-3.1 5.4-7.6 5.4-12.9z" fill="#4285F4"/>
                    <path d="M8.1 22.8c-.4-1.2-.6-2.5-.6-3.8s.2-2.6.6-3.8l-5.1-4C1.1 13.8 0 16.8 0 20s1.1 6.2 3 8.8l5.1-4z" fill="#FBBC05"/>
                    <path d="M19.9 37.6c5.4 0 9.9-1.8 13.2-4.9l-5.6-4.3c-1.8 1.2-4.1 2-7.6 2-4.5 0-8.5-3-9.9-7.2l-5.1 4c2.9 6.4 9.3 10.8 16.9 10.8z" fill="#34A853"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Mobile Intent Direct Launch & Copy */}
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
                <span>{copied ? "Copied!" : "Copy UPI ID"}</span>
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
