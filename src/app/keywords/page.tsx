"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { KodandLogo } from "@/components/kodand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Sparkles,
  ArrowLeft,
  TrendingUp,
  HelpCircle,
  Lightbulb,
  Target,
  Zap,
  BarChart3,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { AppFooter } from "@/components/layout/app-footer";

interface KeywordSuggestion {
  keyword: string;
  source: string;
}

interface KeywordAnalysis {
  keyword: string;
  intent: string;
  difficulty: string;
  difficultyScore: number;
  suggestedTitle: string;
  suggestedDescription: string;
  relatedKeywords: string[];
  longTailVariations: string[];
  contentIdeas: string[];
  serpFeatures: string[];
}

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  navigational: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  transactional: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  commercial: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  hard: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  "very-hard": "bg-red-500/20 text-red-300 border-red-500/40",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-300 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export default function KeywordsPage() {
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = React.useState(false);
  const [loadingQuestions, setLoadingQuestions] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<KeywordSuggestion[]>([]);
  const [questions, setQuestions] = React.useState<KeywordSuggestion[]>([]);
  const [analysis, setAnalysis] = React.useState<KeywordAnalysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const search = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setLoadingAnalysis(true);
    setLoadingQuestions(true);
    setError(null);
    setSuggestions([]);
    setQuestions([]);
    setAnalysis(null);

    // Fetch suggestions
    fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "suggest", query: query.trim() }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.suggestions) setSuggestions(d.suggestions); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch analysis
    fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze", query: query.trim() }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.analysis) setAnalysis(d.analysis); })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingAnalysis(false));

    // Fetch question keywords
    fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "questions", query: query.trim() }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.suggestions) setQuestions(d.suggestions); })
      .catch(() => {})
      .finally(() => setLoadingQuestions(false));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-emerald-500/15 bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 text-sm">
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <div className="w-px h-6 bg-emerald-500/20" />
            <KodandLogo size="md" />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/marketing">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-emerald-300">
                <BarChart3 className="size-3.5 mr-1" /> Marketing
              </Button>
            </Link>
            <Link href="/backlinks">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-emerald-300">
                <TrendingUp className="size-3.5 mr-1" /> Backlinks
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-3 mb-2">
              <Search className="size-7 text-sky-400" />
              Keyword Research
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Discover keyword opportunities, analyze search intent, and generate content ideas — powered by Google Autocomplete and AI analysis.
            </p>
          </div>

          {/* Search form */}
          <form onSubmit={search} className="max-w-2xl mx-auto flex gap-2 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sky-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter a keyword or topic (e.g. web development)"
                className="pl-10 h-12 text-base bg-card/80 border-sky-500/30 focus-visible:border-sky-400 focus-visible:ring-sky-400/30"
              />
            </div>
            <Button
              type="submit"
              disabled={loading && loadingAnalysis}
              className="h-12 px-6 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white border border-sky-400/40"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              <span className="ml-2 hidden sm:inline">Research</span>
            </Button>
          </form>

          {error && (
            <div className="max-w-2xl mx-auto mb-6 p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm">
              {error}
            </div>
          )}

          {/* Results grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keyword suggestions */}
            <Card className="bg-card/60 border-sky-500/20">
              <CardContent className="p-5">
                <h2 className="text-sm font-bold text-sky-300 flex items-center gap-2 mb-3">
                  <Sparkles className="size-4" /> Keyword Suggestions
                  {suggestions.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-sky-500/30 text-sky-300">{suggestions.length}</Badge>
                  )}
                </h2>
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                    <Loader2 className="size-4 animate-spin" /> Fetching suggestions…
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-muted-foreground text-xs py-4 text-center">Enter a keyword above to see suggestions</p>
                ) : (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-sky-500/5 group">
                        <span className="text-sm text-foreground">{s.keyword}</span>
                        <CopyButton text={s.keyword} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Question keywords */}
            <Card className="bg-card/60 border-violet-500/20">
              <CardContent className="p-5">
                <h2 className="text-sm font-bold text-violet-300 flex items-center gap-2 mb-3">
                  <HelpCircle className="size-4" /> People Also Ask
                  {questions.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-300">{questions.length}</Badge>
                  )}
                </h2>
                {loadingQuestions ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                    <Loader2 className="size-4 animate-spin" /> Finding questions…
                  </div>
                ) : questions.length === 0 ? (
                  <p className="text-muted-foreground text-xs py-4 text-center">Question-based keywords will appear here</p>
                ) : (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {questions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-violet-500/5 group">
                        <span className="text-sm text-foreground">{s.keyword}</span>
                        <CopyButton text={s.keyword} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis */}
            {(loadingAnalysis || analysis) && (
              <Card className="bg-card/60 border-emerald-500/20 lg:col-span-2">
                <CardContent className="p-5">
                  <h2 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-4">
                    <Zap className="size-4" /> AI Keyword Analysis
                  </h2>
                  {loadingAnalysis ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                      <Loader2 className="size-4 animate-spin" /> Analyzing keyword with AI…
                    </div>
                  ) : analysis ? (
                    <div className="space-y-5">
                      {/* Intent & difficulty */}
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono uppercase">Intent</span>
                          <Badge className={`text-xs ${INTENT_COLORS[analysis.intent] || "bg-gray-500/20 text-gray-300"}`}>
                            {analysis.intent}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono uppercase">Difficulty</span>
                          <Badge className={`text-xs ${DIFFICULTY_COLORS[analysis.difficulty] || "bg-gray-500/20 text-gray-300"}`}>
                            {analysis.difficulty} ({analysis.difficultyScore}/100)
                          </Badge>
                        </div>
                      </div>

                      {/* Suggested meta */}
                      <div className="space-y-2">
                        <h3 className="text-xs text-muted-foreground font-mono uppercase flex items-center gap-1"><Target className="size-3" /> Suggested Title</h3>
                        <div className="p-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 text-sm flex items-center justify-between">
                          <span>{analysis.suggestedTitle}</span>
                          <CopyButton text={analysis.suggestedTitle} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xs text-muted-foreground font-mono uppercase">Suggested Description</h3>
                        <div className="p-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 text-sm flex items-center justify-between">
                          <span>{analysis.suggestedDescription}</span>
                          <CopyButton text={analysis.suggestedDescription} />
                        </div>
                      </div>

                      {/* Related & long-tail */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-xs text-muted-foreground font-mono uppercase mb-2 flex items-center gap-1">
                            <TrendingUp className="size-3" /> Related Keywords
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.relatedKeywords.map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-[11px] border-sky-500/25 text-sky-200 cursor-pointer hover:bg-sky-500/10" onClick={() => { setQuery(kw); }}>
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xs text-muted-foreground font-mono uppercase mb-2 flex items-center gap-1">
                            <Search className="size-3" /> Long-Tail Variations
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.longTailVariations.map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-[11px] border-violet-500/25 text-violet-200 cursor-pointer hover:bg-violet-500/10" onClick={() => { setQuery(kw); }}>
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Content ideas */}
                      <div>
                        <h3 className="text-xs text-muted-foreground font-mono uppercase mb-2 flex items-center gap-1">
                          <Lightbulb className="size-3" /> Content Ideas
                        </h3>
                        <div className="space-y-1.5">
                          {analysis.contentIdeas.map((idea, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-amber-500/10 bg-amber-500/5">
                              <Lightbulb className="size-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{idea}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SERP features */}
                      {analysis.serpFeatures.length > 0 && (
                        <div>
                          <h3 className="text-xs text-muted-foreground font-mono uppercase mb-2">Expected SERP Features</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.serpFeatures.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-[11px] border-emerald-500/25 text-emerald-200">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </main>
      <AppFooter />
    </div>
  );
}
