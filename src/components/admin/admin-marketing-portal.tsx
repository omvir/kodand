"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TARGET_PERSONAS,
  OUTREACH_SCRIPTS,
  COMPETITORS,
  STRATEGIC_IMPROVEMENTS,
  TargetPersona,
  CompetitorData,
} from "@/lib/marketing-intelligence";
import {
  Target,
  PhoneCall,
  Swords,
  Lightbulb,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Mail,
  Linkedin,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Zap,
  Building2,
  Users,
  ChevronRight,
  AlertCircle,
  Flame,
  Globe2,
  Sparkles,
  Search,
  Layers,
  ArrowRight,
} from "lucide-react";

export function AdminMarketingPortal() {
  const [subTab, setSubTab] = React.useState<"audience" | "calling" | "competitors" | "improvements">("audience");

  // Audience State
  const [regionFilter, setRegionFilter] = React.useState<"All" | "India" | "Global">("All");
  const [selectedPersona, setSelectedPersona] = React.useState<TargetPersona>(TARGET_PERSONAS[0]);

  // Tele-Calling Customizer State
  const [prospectName, setProspectName] = React.useState("Rahul");
  const [agencyName, setAgencyName] = React.useState("Apex Media");
  const [websiteUrl, setWebsiteUrl] = React.useState("apexmedia.in");
  const [activeScriptType, setActiveScriptType] = React.useState<"phone" | "whatsapp" | "email" | "linkedin">("phone");
  const [copiedScriptId, setCopiedScriptId] = React.useState<string | null>(null);

  // Competitor State
  const [selectedCompetitor, setSelectedCompetitor] = React.useState<CompetitorData>(COMPETITORS[0]);

  // Calculator State
  const [agencyCount, setAgencyCount] = React.useState(25);

  const filteredPersonas = TARGET_PERSONAS.filter((p) => {
    if (regionFilter === "All") return true;
    return p.marketRegion === regionFilter || p.marketRegion === "Both";
  });

  const activeScript = OUTREACH_SCRIPTS.find((s) => s.type === activeScriptType) || OUTREACH_SCRIPTS[0];

  const formatCustomizedText = (text: string) => {
    return text
      .replace(/\[Founder Name\]/g, prospectName || "Founder")
      .replace(/\[Name\]/g, prospectName || "Partner")
      .replace(/\[First Name\]/g, prospectName || "Friend")
      .replace(/\[Agency Name\]/g, agencyName || "your agency")
      .replace(/\[Company Name\]/g, agencyName || "your company")
      .replace(/\[Brand Name\]/g, agencyName || "your brand")
      .replace(/\[Agency Website\]/g, websiteUrl || "your website")
      .replace(/\[Store URL\]/g, websiteUrl || "your store")
      .replace(/\[Client Website\/Portfolio\]/g, websiteUrl || "your recent project")
      .replace(/\[City\]/g, "Mumbai/Delhi");
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScriptId(id);
    setTimeout(() => setCopiedScriptId(null), 2000);
  };

  const projectedMmr = agencyCount * 3499;
  const projectedArr = projectedMmr * 12;

  return (
    <div className="space-y-6">
      {/* Marketing Header Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-zinc-950/80 to-emerald-950/40 p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono text-[10px] tracking-wider uppercase flex items-center gap-1">
                <Sparkles className="size-3" /> Growth & Sales Command
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-[10px] tracking-wider uppercase">
                Active UPI: atomicpixel0911-1@okhdfcbank
              </Badge>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              KODAND SaaS Marketing & Acquisition Portal
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Target high-value Indian agencies & global brands, execute high-converting phone/WhatsApp sales pitches, benchmark against Semrush/Ahrefs, and deploy revenue improvements.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase font-mono">Total Target Pool</div>
              <div className="text-lg font-bold text-white mt-0.5">750,000+</div>
              <div className="text-[10px] text-emerald-400">Agencies & SMBs</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] text-zinc-400 uppercase font-mono">Agency Pro ARR</div>
              <div className="text-lg font-bold text-amber-300 mt-0.5">₹34,990/yr</div>
              <div className="text-[10px] text-zinc-400">Avg deal size</div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-zinc-400 uppercase font-mono">UPI Conversion</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">4.8%</div>
              <div className="text-[10px] text-zinc-400">On warm tele-pitch</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setSubTab("audience")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "audience"
              ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Target className="size-4" />
          <span>Target Audience Finder</span>
        </button>

        <button
          onClick={() => setSubTab("calling")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "calling"
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <PhoneCall className="size-4" />
          <span>Tele-Calling & Outreach Studio</span>
        </button>

        <button
          onClick={() => setSubTab("competitors")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "competitors"
              ? "bg-purple-500 text-black shadow-md shadow-purple-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Swords className="size-4" />
          <span>Competitors & 360° Service Comparison</span>
        </button>

        <button
          onClick={() => setSubTab("improvements")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            subTab === "improvements"
              ? "bg-sky-500 text-black shadow-md shadow-sky-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Lightbulb className="size-4" />
          <span>Strategic SaaS Improvements</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TARGET AUDIENCE FINDER                                             */}
      {/* ========================================================================= */}
      {subTab === "audience" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="size-4 text-emerald-400" /> Discover High-Yield Buyer Personas
              </h3>
              <p className="text-xs text-zinc-400">
                Segmented B2B decision makers who have urgent pain points solved by KODAND.
              </p>
            </div>

            {/* Region Filter */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
              {(["All", "India", "Global"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRegionFilter(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    regionFilter === r
                      ? "bg-emerald-500 text-black font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {r === "India" ? "🇮🇳 India First" : r === "Global" ? "🌍 Global" : "🌐 All Markets"}
                </button>
              ))}
            </div>
          </div>

          {/* Persona Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPersonas.map((persona) => {
              const isSelected = selectedPersona.id === persona.id;
              return (
                <div
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900/60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge className="bg-zinc-800 text-zinc-300 text-[10px] font-mono">
                        {persona.marketRegion === "India" ? "🇮🇳 India" : persona.marketRegion === "Global" ? "🌍 Global" : "🌐 Dual"}
                      </Badge>
                      <span className="text-[10px] text-emerald-400 font-semibold">{persona.badge}</span>
                    </div>

                    <h4 className="font-bold text-sm text-white">{persona.name}</h4>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                      {persona.targetRole}
                    </p>

                    <div className="mt-3 p-2.5 rounded-lg bg-black/40 border border-zinc-800/80 text-[11px] space-y-1">
                      <div className="text-zinc-400 flex justify-between">
                        <span>Plan Target:</span>
                        <span className="text-emerald-300 font-medium">{persona.idealPricingPlan.split("(")[0]}</span>
                      </div>
                      <div className="text-zinc-400 flex justify-between">
                        <span>Avg Deal:</span>
                        <span className="text-amber-300 font-bold">{persona.averageDealValue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Click to view playbook</span>
                    <ChevronRight className={`size-3.5 transition-transform ${isSelected ? "text-emerald-400 translate-x-1" : ""}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Persona Deep Playbook */}
          {selectedPersona && (
            <Card className="border border-zinc-800 bg-zinc-950/80 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{selectedPersona.name}</h3>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px]">
                      {selectedPersona.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Target Decision Makers: <span className="text-zinc-200 font-medium">{selectedPersona.targetRole}</span>
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => setSubTab("calling")}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5"
                >
                  <PhoneCall className="size-3.5" /> Launch Calling Script for this Persona
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-mono uppercase text-red-400 flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="size-3.5" /> Primary Pain Point & Friction
                    </h5>
                    <p className="text-xs text-zinc-300 bg-red-950/10 border border-red-900/30 p-3 rounded-lg leading-relaxed">
                      {selectedPersona.primaryPainPoint}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-xs font-mono uppercase text-zinc-400 mb-1.5">Current Broken Workaround</h5>
                    <p className="text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800 p-3 rounded-lg leading-relaxed">
                      {selectedPersona.currentWorkaround}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-xs font-mono uppercase text-emerald-400 flex items-center gap-1.5 mb-1.5">
                      <ShieldCheck className="size-3.5" /> Why KODAND Wins The Deal
                    </h5>
                    <p className="text-xs text-emerald-200/90 bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg leading-relaxed">
                      {selectedPersona.whyKodandWins}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-mono uppercase text-amber-400 flex items-center gap-1.5 mb-1.5">
                      <Flame className="size-3.5" /> High-Converting Killer Pitch
                    </h5>
                    <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs leading-relaxed font-medium">
                      "{selectedPersona.killerPitch}"
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800">
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">Market Pool</div>
                      <div className="text-xs font-semibold text-white mt-1">{selectedPersona.estimatedMarketSize}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800">
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">Recommended Plan</div>
                      <div className="text-xs font-semibold text-emerald-400 mt-1">{selectedPersona.idealPricingPlan}</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-mono uppercase text-zinc-400 mb-1.5">Best Acquisition Channels</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPersona.topChannels.map((c) => (
                        <Badge key={c} variant="outline" className="bg-zinc-900 text-zinc-300 border-zinc-700 text-[11px] py-1">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Revenue & Agency Growth Calculator */}
          <Card className="border border-zinc-800 bg-zinc-950/90 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-400" /> Agency Pro Acquisition Revenue Calculator
                </h4>
                <p className="text-xs text-zinc-400">
                  Calculate projected SaaS subscription income based on onboarding Indian agencies at ₹3,499/month (or ₹34,990/year).
                </p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-mono text-xs">
                Zero Gateway Fees via UPI
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Active Agency Customers:</span>
                  <span className="text-emerald-400 font-bold text-sm">{agencyCount} Agencies</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={agencyCount}
                  onChange={(e) => setAgencyCount(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>5 Agencies</span>
                  <span>100 Agencies</span>
                  <span>200 Agencies</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                <div className="text-[11px] text-zinc-400 uppercase font-mono">Projected Monthly (MRR)</div>
                <div className="text-2xl font-black text-white mt-1">₹{projectedMmr.toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-emerald-400 mt-0.5">Recurring into atomicpixel0911-1@okhdfcbank</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-center">
                <div className="text-[11px] text-emerald-300 uppercase font-mono">Projected Annual (ARR)</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">₹{projectedArr.toLocaleString("en-IN")}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">~${(projectedArr / 86).toFixed(0)} USD Annual Run Rate</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TELE-CALLING & SALES OUTREACH STUDIO                              */}
      {/* ========================================================================= */}
      {subTab === "calling" && (
        <div className="space-y-6">
          {/* Customizer Bar */}
          <Card className="border border-zinc-800 bg-zinc-950 p-4 rounded-xl">
            <div className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5">
              <Users className="size-3.5 text-amber-400" /> Prospect Live Customizer (Auto-replaces variables in scripts below)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 font-mono uppercase block mb-1">Decision Maker Name</label>
                <Input
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="bg-zinc-900 border-zinc-700 h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-mono uppercase block mb-1">Agency / Company Name</label>
                <Input
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Apex Media Agency"
                  className="bg-zinc-900 border-zinc-700 h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 font-mono uppercase block mb-1">Prospect Website URL</label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="e.g. apexmedia.in"
                  className="bg-zinc-900 border-zinc-700 h-9 text-xs"
                />
              </div>
            </div>
          </Card>

          {/* Script Type Selector */}
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 flex-wrap">
            <button
              onClick={() => setActiveScriptType("phone")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeScriptType === "phone"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <PhoneCall className="size-3.5" />
              <span>Cold Phone Call Script</span>
            </button>

            <button
              onClick={() => setActiveScriptType("whatsapp")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeScriptType === "whatsapp"
                  ? "bg-emerald-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <MessageSquare className="size-3.5" />
              <span>WhatsApp Direct Pitch (with UPI)</span>
            </button>

            <button
              onClick={() => setActiveScriptType("email")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeScriptType === "email"
                  ? "bg-sky-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Mail className="size-3.5" />
              <span>Cold Email Sequence</span>
            </button>

            <button
              onClick={() => setActiveScriptType("linkedin")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeScriptType === "linkedin"
                  ? "bg-blue-500 text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Linkedin className="size-3.5" />
              <span>LinkedIn InMail / DM</span>
            </button>
          </div>

          {/* Teleprompter Card */}
          <Card className="border border-zinc-800 bg-zinc-950 p-6 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  {activeScriptType === "phone" && <PhoneCall className="size-4 text-amber-400" />}
                  {activeScriptType === "whatsapp" && <MessageSquare className="size-4 text-emerald-400" />}
                  {activeScriptType === "email" && <Mail className="size-4 text-sky-400" />}
                  {activeScriptType === "linkedin" && <Linkedin className="size-4 text-blue-400" />}
                  {activeScript.title}
                </h4>
                {activeScript.subject && (
                  <div className="text-xs text-zinc-400 mt-1">
                    Subject Line: <span className="text-amber-300 font-medium font-mono">{formatCustomizedText(activeScript.subject)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeScriptType === "whatsapp" && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `${formatCustomizedText(activeScript.hook)}\n\n${formatCustomizedText(activeScript.body)}\n\n${formatCustomizedText(activeScript.callToAction)}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all"
                  >
                    <MessageSquare className="size-3.5" /> Open WhatsApp Web
                  </a>
                )}

                <Button
                  size="sm"
                  onClick={() =>
                    handleCopy(
                      `${formatCustomizedText(activeScript.hook)}\n\n${formatCustomizedText(activeScript.body)}\n\n${formatCustomizedText(activeScript.callToAction)}`,
                      activeScript.id
                    )
                  }
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {copiedScriptId === activeScript.id ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" /> Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copy Script
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Script Text View */}
            <div className="space-y-3 font-sans text-xs leading-relaxed">
              <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800">
                <span className="text-[10px] font-mono text-amber-400 uppercase block mb-1">1. The Hook (First 10 seconds)</span>
                <p className="text-zinc-200">{formatCustomizedText(activeScript.hook)}</p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 whitespace-pre-line">
                <span className="text-[10px] font-mono text-emerald-400 uppercase block mb-1">2. Core Value & Difference</span>
                <p className="text-zinc-300">{formatCustomizedText(activeScript.body)}</p>
              </div>

              <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800">
                <span className="text-[10px] font-mono text-sky-400 uppercase block mb-1">3. Call to Action (The Close)</span>
                <p className="text-zinc-200 font-medium">{formatCustomizedText(activeScript.callToAction)}</p>
              </div>
            </div>

            {/* Objection Handling Matrix */}
            {activeScript.objectionHandlers.length > 0 && (
              <div className="mt-5 pt-4 border-t border-zinc-800 space-y-3">
                <h5 className="text-xs font-bold text-zinc-300 uppercase font-mono flex items-center gap-1.5">
                  <Flame className="size-3.5 text-red-400" /> Instant Objection Handlers on the Call
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeScript.objectionHandlers.map((obj, i) => (
                    <div key={i} className="p-3 rounded-lg bg-black/40 border border-zinc-800 text-xs space-y-1.5">
                      <div className="text-red-300 font-semibold flex items-center gap-1">
                        <span>Prospect:</span> "{obj.objection}"
                      </div>
                      <div className="text-emerald-300/90 leading-relaxed">
                        <span className="text-zinc-400 font-medium">You Say:</span> {obj.response}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Quick UPI Link Generator for Callers */}
          <Card className="border border-emerald-500/30 bg-emerald-950/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                🇮🇳
              </div>
              <div>
                <div className="text-xs font-bold text-white">Instant UPI Close: atomicpixel0911-1@okhdfcbank</div>
                <div className="text-[11px] text-zinc-400">Tell the prospect: "Send ₹3,499 via Google Pay/PhonePe to atomicpixel0911-1@okhdfcbank for instant Agency Pro activation."</div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => handleCopy("atomicpixel0911-1@okhdfcbank", "upi-copy")}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shrink-0"
            >
              {copiedScriptId === "upi-copy" ? "Copied UPI ID" : "Copy UPI VPA"}
            </Button>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: COMPETITOR INTELLIGENCE & SERVICE COMPARISON                      */}
      {/* ========================================================================= */}
      {subTab === "competitors" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Swords className="size-4 text-purple-400" /> Competitor 360° Benchmark & Talking Points
            </h3>
            <p className="text-xs text-zinc-400">
              Complete feature-by-feature comparison against market alternatives to win every competitive objection.
            </p>
          </div>

          {/* Competitor Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {COMPETITORS.map((comp) => {
              const isSelected = selectedCompetitor.id === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => setSelectedCompetitor(comp)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? "border-purple-500 bg-purple-950/30 ring-1 ring-purple-500 text-white"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <span className="text-xl">{comp.logo}</span>
                  <div>
                    <div className="text-xs font-bold leading-tight">{comp.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{comp.startingPrice}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Deep Battlecard View */}
          {selectedCompetitor && (
            <Card className="border border-zinc-800 bg-zinc-950/80 p-6 rounded-xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedCompetitor.logo}</span>
                  <div>
                    <h4 className="text-lg font-black text-white">{selectedCompetitor.name} vs KODAND</h4>
                    <p className="text-xs text-zinc-400">
                      Primary Focus: <span className="text-zinc-200 font-medium">{selectedCompetitor.primaryFocus}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 uppercase font-mono">{selectedCompetitor.name} Price</div>
                    <div className="text-sm font-bold text-red-400">{selectedCompetitor.inrEstimate}</div>
                  </div>
                  <div className="text-right pl-3 border-l border-zinc-800">
                    <div className="text-[10px] text-emerald-400 uppercase font-mono">KODAND Agency Pro</div>
                    <div className="text-sm font-bold text-emerald-400">₹3,499/mo (UPI)</div>
                  </div>
                </div>
              </div>

              {/* Strengths & Weaknesses vs KODAND */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-mono uppercase text-red-400 mb-2 flex items-center gap-1.5">
                      <AlertCircle className="size-3.5" /> Where {selectedCompetitor.name} Falls Short
                    </h5>
                    <ul className="space-y-2">
                      {selectedCompetitor.weaknesses.map((w, idx) => (
                        <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2 bg-red-950/10 border border-red-900/20 p-2.5 rounded-lg">
                          <span className="text-red-400 font-bold shrink-0">✕</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-mono uppercase text-emerald-400 mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" /> KODAND's Decisive Advantages
                    </h5>
                    <ul className="space-y-2">
                      {selectedCompetitor.kodandAdvantages.map((adv, idx) => (
                        <li key={idx} className="text-xs text-emerald-200 flex items-start gap-2 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-lg">
                          <span className="text-emerald-400 font-bold shrink-0">✓</span>
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Battlecard Counter-Script */}
              {selectedCompetitor.battlecard.length > 0 && (
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                  <div className="text-xs font-mono uppercase text-purple-300 flex items-center gap-1.5 font-bold">
                    <Swords className="size-3.5" /> Phone Battlecard: When the prospect says "{selectedCompetitor.battlecard[0].whenTheySay}"
                  </div>
                  <div className="text-xs text-zinc-200 leading-relaxed font-medium pl-5 border-l-2 border-purple-500">
                    "{selectedCompetitor.battlecard[0].youSay}"
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Master 360° Comparison Matrix Table */}
          <Card className="border border-zinc-800 bg-zinc-950/90 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="size-4 text-emerald-400" /> Full Platform Comparison Matrix
              </h4>
              <Badge className="bg-zinc-800 text-zinc-300 text-[10px] font-mono">Real-Time Feature Audit</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 text-zinc-400 font-mono uppercase text-[10px] border-b border-zinc-800">
                  <tr>
                    <th className="p-3.5">Platform</th>
                    <th className="p-3.5">Price in India</th>
                    <th className="p-3.5">Native UPI</th>
                    <th className="p-3.5">Scan Speed</th>
                    <th className="p-3.5">Threat Intel (DNS/CVE)</th>
                    <th className="p-3.5">Speed / Vitals</th>
                    <th className="p-3.5">WCAG A11y</th>
                    <th className="p-3.5">White-Label PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {/* KODAND Highlighted Row */}
                  <tr className="bg-emerald-950/30 font-semibold text-white">
                    <td className="p-3.5 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-emerald-300">KODAND (Our Platform)</span>
                    </td>
                    <td className="p-3.5 text-emerald-300 font-bold">₹1,299 - ₹3,499/mo</td>
                    <td className="p-3.5 text-emerald-400 font-bold">✓ Yes (GPay/PhonePe)</td>
                    <td className="p-3.5 text-emerald-300">&lt; 500ms (Edge)</td>
                    <td className="p-3.5 text-emerald-400">✓ Full DoH/crt.sh</td>
                    <td className="p-3.5 text-emerald-300">✓ 360° Vitals</td>
                    <td className="p-3.5 text-emerald-400">✓ WCAG 2.1</td>
                    <td className="p-3.5 text-emerald-300 font-bold">✓ Unlimited</td>
                  </tr>

                  {COMPETITORS.map((c) => (
                    <tr key={c.id} className="text-zinc-300 hover:bg-zinc-900/40">
                      <td className="p-3.5 font-medium flex items-center gap-2">
                        <span>{c.logo}</span>
                        <span>{c.name}</span>
                      </td>
                      <td className="p-3.5 text-zinc-400">{c.inrEstimate.split("+")[0]}</td>
                      <td className="p-3.5 text-red-400 font-semibold">✕ Credit Card Only</td>
                      <td className="p-3.5 text-zinc-400">{c.featureRatings.edgeSpeed >= 4 ? "Fast" : "Slow (Crawlers)"}</td>
                      <td className="p-3.5">{c.featureRatings.securityThreatIntel >= 4 ? "✓ Yes" : "✕ None"}</td>
                      <td className="p-3.5">{c.featureRatings.performanceVitals >= 4 ? "✓ Yes" : "Partial"}</td>
                      <td className="p-3.5">{c.featureRatings.accessibilityWcag >= 3 ? "✓ Yes" : "✕ No"}</td>
                      <td className="p-3.5">{c.featureRatings.whiteLabelPdf >= 4 ? "✓ Enterprise Only" : "✕ Limited"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STRATEGIC SAAS IMPROVEMENTS & ROADMAP                             */}
      {/* ========================================================================= */}
      {subTab === "improvements" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lightbulb className="size-4 text-sky-400" /> Strategic SaaS Growth Recommendations
              </h3>
              <p className="text-xs text-zinc-400">
                Actionable product engineering and marketing features to increase subscription conversion and outpace competitors.
              </p>
            </div>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 font-mono text-[10px] uppercase">
              Prioritized by ROI & Effort
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STRATEGIC_IMPROVEMENTS.map((item, idx) => (
              <Card key={item.id} className="border border-zinc-800 bg-zinc-950 p-5 rounded-xl flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="bg-zinc-900 text-zinc-400 text-[10px]">
                      {item.category}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={`text-[10px] font-mono ${
                          item.impact === "Critical"
                            ? "bg-red-950/40 text-red-400 border-red-500/40"
                            : "bg-amber-950/40 text-amber-400 border-amber-500/40"
                        }`}
                      >
                        {item.impact} Impact
                      </Badge>
                      <Badge className="bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                        {item.effort} Effort
                      </Badge>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-emerald-400 font-mono">#{idx + 1}</span> {item.title}
                  </h4>
                  <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-[11px] text-emerald-300 flex items-start gap-1.5">
                    <TrendingUp className="size-3.5 shrink-0 mt-0.5 text-emerald-400" />
                    <span><strong className="text-emerald-200">Expected Outcome:</strong> {item.expectedOutcome}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-zinc-900/80 text-[10px] font-mono text-zinc-400">
                    🛠️ <span className="text-zinc-500">Tech Implementation:</span> {item.implementationHint}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
