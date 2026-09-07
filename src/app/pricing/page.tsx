"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";
import { UpiPaymentModal } from "@/components/dashboard/upi-payment-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  Crown,
  Sparkles,
  Zap,
  Shield,
  HelpCircle,
  ArrowRight,
  Calculator,
  QrCode,
  Copy,
  Smartphone,
} from "lucide-react";

export default function PricingPage() {
  const [currency, setCurrency] = React.useState<"INR" | "USD">("INR");
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("yearly");
  const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);
  const [upiModalOpen, setUpiModalOpen] = React.useState(false);
  const [selectedTier, setSelectedTier] = React.useState<"starter" | "agency">("agency");
  const [copiedUpi, setCopiedUpi] = React.useState(false);

  const upiId = process.env.NEXT_PUBLIC_UPI_ID || "atomicpixel0911-1@okhdfcbank";

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Interactive Agency ROI Calculator state
  const [clientCount, setClientCount] = React.useState(5);
  const [auditFee, setAuditFee] = React.useState(currency === "INR" ? 15000 : 250);

  // Update audit fee default when switching currency
  React.useEffect(() => {
    if (currency === "INR") {
      setAuditFee(15000);
    } else {
      setAuditFee(250);
    }
  }, [currency]);

  const monthlyRevenue = clientCount * auditFee;
  const kodandCost = currency === "INR"
    ? (billingCycle === "yearly" ? 2915 : 3499)
    : (billingCycle === "yearly" ? 39 : 49);
  const netProfit = monthlyRevenue - kodandCost;
  const roiMultiplier = Math.round((monthlyRevenue / kodandCost) * 10) / 10;

  const handleOpenUpgrade = (tier: "starter" | "agency") => {
    setSelectedTier(tier);
    if (currency === "INR") {
      setUpiModalOpen(true);
    } else {
      setUpgradeModalOpen(true);
    }
  };

  const faqs = [
    {
      q: "Do you support UPI payments (Google Pay, PhonePe, Paytm, BHIM)?",
      a: "Yes! For users in India, we provide instant 1-click UPI payments via PhonePe, Google Pay, Paytm, and dynamic QR code scan with 0% gateway fees and instant activation.",
    },
    {
      q: "Can I remove all KODAND branding from audit reports?",
      a: "Yes! With the Agency Pro plan, you can upload your agency name, custom subtitle, and website URL. All PDF reports, covers, and headers will carry your custom branding with zero KODAND watermarks, ready to be sent directly to your paying clients.",
    },
    {
      q: "How does KODAND differ from Ahrefs and Semrush?",
      a: "While traditional SEO platforms cost $100–$500/month and focus solely on search engine crawls, KODAND is a true 360° platform. We audit HTTP security headers (CSP, HSTS, X-Frame-Options), SSL certificate chains, DNS-over-HTTPS health, Core Web Vitals, and Schema.org markup alongside SEO — all running on sub-second Cloudflare Edge speed.",
    },
    {
      q: "Can I cancel or switch plans at any time?",
      a: "Absolutely. There are no long-term contracts. You can upgrade, downgrade, or cancel your subscription at any time directly with one click from your billing settings.",
    },
    {
      q: "How do scan limits work?",
      a: "Scans refresh on your monthly billing date. Full 360° scans, individual dimension tests, and competitor side-by-side audits each consume 1 scan credit.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/30 selection:text-emerald-200">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-12 md:py-16 w-full">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="size-3.5" /> Simple, Transparent SaaS Pricing
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Invest in Audits That <span className="text-emerald-400">Win Paying Clients</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">
            Sub-second technical audits, security intelligence, and unbranded white-label client reports designed for web freelancers and agencies worldwide.
          </p>

          {/* Currency and Billing Selectors */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Currency Toggle */}
            <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setCurrency("INR")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  currency === "INR"
                    ? "bg-emerald-500 text-black shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>🇮🇳 INR (₹) · UPI</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  currency === "USD"
                    ? "bg-zinc-800 text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>🌐 USD ($)</span>
              </button>
            </div>

            {/* Billing Cycle Switch */}
            <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-zinc-800 text-white shadow-md"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  billingCycle === "yearly"
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>Yearly</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/25 font-bold uppercase tracking-wider">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-20">
          {/* FREE TIER */}
          <Card className="border border-zinc-800 bg-zinc-950/60 backdrop-blur rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
            <CardContent className="p-6 md:p-8">
              <div className="mb-4">
                <span className="text-sm font-semibold text-zinc-400">Explorer</span>
                <h3 className="text-2xl font-bold text-white mt-1">Free Forever</h3>
                <p className="text-xs text-zinc-400 mt-2">
                  Test out basic website audits and quick on-screen scores.
                </p>
              </div>

              <div className="my-6 pb-6 border-b border-zinc-800">
                <span className="text-4xl font-extrabold text-white">
                  {currency === "INR" ? "₹0" : "$0"}
                </span>
                <span className="text-xs text-zinc-400 ml-1">/ forever</span>
              </div>

              <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span><strong>3 scans</strong> per day</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Basic SEO & Security score</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Keyword research (Top 5 ideas)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>On-screen audit findings</span>
                </li>
              </ul>

              <Button
                asChild
                variant="outline"
                className="w-full border-zinc-700 hover:border-zinc-500 text-xs font-semibold h-11"
              >
                <Link href="/">Use Free Version</Link>
              </Button>
            </CardContent>
          </Card>

          {/* STARTER TIER */}
          <Card className="border border-emerald-500/30 bg-zinc-950/80 backdrop-blur rounded-2xl flex flex-col justify-between hover:border-emerald-500/50 transition-all">
            <CardContent className="p-6 md:p-8">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-400">Starter</span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
                    Solo Creators
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-white mt-1">Growth</h3>
                <p className="text-xs text-zinc-400 mt-2">
                  For freelancers and webmasters managing client sites.
                </p>
              </div>

              <div className="my-6 pb-6 border-b border-zinc-800">
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-white">
                    {currency === "INR"
                      ? (billingCycle === "yearly" ? "₹1,080" : "₹1,299")
                      : (billingCycle === "yearly" ? "$15" : "$19")}
                  </span>
                  <span className="text-xs text-zinc-400 ml-1">/ month</span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  {currency === "INR"
                    ? (billingCycle === "yearly" ? "Billed ₹12,990 annually" : "Billed monthly, cancel anytime")
                    : (billingCycle === "yearly" ? "Billed $180 annually" : "Billed monthly, cancel anytime")}
                </span>
              </div>

              <ul className="space-y-3 text-xs text-zinc-300 mb-8">
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span><strong>100 scans</strong> per month</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Full 360° Audit (Security, SEO, Speed, A11y)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Full Keyword Explorer & Intent insights</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Digital Marketing Studio (Meta tag generator)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Standard PDF Report Download</span>
                </li>
              </ul>

              <Button
                onClick={() => handleOpenUpgrade("starter")}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold h-11"
              >
                {currency === "INR" ? "Pay with UPI (GPay / PhonePe)" : "Choose Starter"}
              </Button>
            </CardContent>
          </Card>

          {/* AGENCY PRO TIER */}
          <Card className="border-2 border-emerald-500 bg-gradient-to-b from-emerald-950/40 via-zinc-950/90 to-zinc-950 rounded-2xl flex flex-col justify-between shadow-2xl shadow-emerald-950/50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-extrabold text-[11px] px-3 py-1 shadow-lg">
                MOST POPULAR FOR AGENCIES
              </Badge>
            </div>

            <CardContent className="p-6 md:p-8">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Crown className="size-4 text-emerald-400" /> Agency Pro
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                    Best ROI
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-white mt-1">Scale Agency</h3>
                <p className="text-xs text-zinc-400 mt-2">
                  Bill clients directly for technical audits with white-label reports.
                </p>
              </div>

              <div className="my-6 pb-6 border-b border-zinc-800">
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-white">
                    {currency === "INR"
                      ? (billingCycle === "yearly" ? "₹2,915" : "₹3,499")
                      : (billingCycle === "yearly" ? "$39" : "$49")}
                  </span>
                  <span className="text-xs text-zinc-400 ml-1">/ month</span>
                </div>
                <span className="text-[11px] text-emerald-400/80">
                  {currency === "INR"
                    ? (billingCycle === "yearly" ? "Billed ₹34,990 annually (₹2,915/mo)" : "Billed monthly, cancel anytime")
                    : (billingCycle === "yearly" ? "Billed $468 annually ($39/mo)" : "Billed monthly, cancel anytime")}
                </span>
              </div>

              <ul className="space-y-3 text-xs text-zinc-200 mb-8">
                <li className="flex items-center gap-2.5 font-bold text-emerald-300">
                  <Sparkles className="size-4 text-emerald-400 shrink-0" />
                  <span><strong>White-Label PDF Reports</strong> (Your Agency Logo)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span><strong>1,000 scans</strong> per month</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Side-by-side <strong>Competitor Comparison</strong></span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Sub-second Cloudflare Edge priority</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Client presentation executive deck mode</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400 shrink-0" />
                  <span>Priority agency support & early feature access</span>
                </li>
              </ul>

              <Button
                onClick={() => handleOpenUpgrade("agency")}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs h-11 shadow-lg shadow-emerald-500/25"
              >
                {currency === "INR" ? (
                  <span className="flex items-center gap-1.5">
                    <QrCode className="size-4" /> Pay via UPI / QR (Instant)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Get Agency Pro <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Dedicated Instant UPI Payment Showcase */}
        <div className="mb-16 p-6 sm:p-8 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-zinc-950 shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                🇮🇳 Instant India UPI Payment Gate
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Scan & Pay with Any UPI App (0% Gateway Fees)
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pay instantly using Google Pay, PhonePe, Paytm, BHIM, or CRED. No foreign transaction fees, no credit card lock-in, and instant activation for Indian agencies and developers.
              </p>

              {/* Official UPI ID Banner */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase block">Official Verified UPI ID</span>
                  <span className="font-mono font-bold text-sm sm:text-base text-emerald-400 truncate block select-all">
                    {upiId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="shrink-0 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  {copiedUpi ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-emerald-400" />}
                  <span>{copiedUpi ? "Copied UPI ID" : "Copy UPI ID"}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  onClick={() => {
                    setSelectedTier("agency");
                    setUpiModalOpen(true);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs h-9 px-4 shadow-md shadow-emerald-500/20"
                >
                  <QrCode className="size-3.5 mr-1.5" /> Open UPI Modal & Verify UTR
                </Button>
                <a
                  href={`upi://pay?pa=${upiId}&pn=KODAND%20Technologies&cu=INR&tn=KODAND_SUBSCRIPTION`}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900"
                >
                  <Smartphone className="size-3.5 text-emerald-400" /> Open Mobile UPI App
                </a>
              </div>
            </div>

            {/* Visual QR Code Display */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white text-black shadow-2xl shrink-0 border-2 border-emerald-500/40">
              <div className="text-[11px] font-bold text-zinc-800 mb-2.5 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <QrCode className="size-4 text-emerald-600" /> Google Pay / PhonePe QR
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/upi-qr.png"
                alt="Official KODAND UPI QR Code"
                className="size-52 sm:size-60 rounded-xl object-contain shadow-sm border border-zinc-200"
              />
              <div className="text-[11px] font-mono font-bold text-zinc-900 mt-2.5">
                {upiId}
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                Google Pay · PhonePe · Paytm · BHIM
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Agency ROI Calculator */}
        <div className="mb-20 p-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Calculator className="size-4" /> Agency Revenue Calculator
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Calculate Your Agency Profit with White-Label Audits
            </h2>
            <p className="text-xs text-muted-foreground mb-8">
              {currency === "INR"
                ? "Agencies typically bill clients between ₹5,000 and ₹25,000 for a detailed website technical & SEO audit report."
                : "Agencies typically bill clients between $150 and $500 for a detailed website technical & SEO audit report."}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              {/* Sliders */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-300">Client Audits Delivered Per Month:</span>
                    <span className="font-bold text-emerald-400">{clientCount} clients</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={clientCount}
                    onChange={(e) => setClientCount(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-300">Fee Charged Per Audit to Client:</span>
                    <span className="font-bold text-emerald-400">
                      {currency === "INR" ? `₹${auditFee.toLocaleString("en-IN")} INR` : `$${auditFee} USD`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={currency === "INR" ? 2000 : 50}
                    max={currency === "INR" ? 50000 : 1000}
                    step={currency === "INR" ? 1000 : 25}
                    value={auditFee}
                    onChange={(e) => setAuditFee(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Profit Card */}
              <div className="p-6 rounded-xl bg-black/60 border border-emerald-500/40 text-center">
                <div className="text-xs text-zinc-400 mb-1">Your Monthly Client Revenue</div>
                <div className="text-3xl font-extrabold text-white mb-2">
                  {currency === "INR" ? `₹${monthlyRevenue.toLocaleString("en-IN")}` : `$${monthlyRevenue.toLocaleString()}`}
                </div>
                <div className="text-[11px] text-zinc-400">
                  KODAND Agency Pro Cost:{" "}
                  <span className="text-zinc-200 font-semibold">
                    {currency === "INR" ? `₹${kodandCost.toLocaleString("en-IN")}/mo` : `$${kodandCost}/mo`}
                  </span>
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <div className="text-xs text-emerald-400 font-bold">
                    Net Profit:{" "}
                    <span className="text-lg">
                      {currency === "INR" ? `₹${netProfit.toLocaleString("en-IN")}` : `$${netProfit.toLocaleString()}`} / mo
                    </span>
                  </div>
                  <Badge className="mt-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                    {roiMultiplier}x Return on Investment
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-muted-foreground mt-1">Everything you need to know about plans and features.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/60">
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                  <HelpCircle className="size-4 text-emerald-400 shrink-0" />
                  {faq.q}
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <AppFooter />

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        defaultTier={selectedTier}
      />

      <UpiPaymentModal
        open={upiModalOpen}
        onOpenChange={setUpiModalOpen}
        tier={selectedTier}
        cycle={billingCycle}
      />
    </div>
  );
}
