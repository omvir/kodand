/**
 * KODAND audit result types — shared between client and server.
 *
 * KODAND supports six scan modes; each emits a focused, quick report:
 *   - content       — content optimization (was "grammar"): spelling, grammar,
 *                     style, clarity, readability, tone, keyword density,
 *                     reading time, SEO content fit
 *   - security      — transport, headers, content vulns, CVE deep scan,
 *                     WHOIS, DNS, certificate transparency, domain intel
 *   - seo           — meta tags, headings, structured data, mobile
 *   - performance   — page weight, render-blocking, images, caching
 *   - accessibility — alt text, ARIA, contrast, forms, keyboard
 *   - full          — all five dimensions combined (360° audit)
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type ScanMode =
  | "content"
  | "security"
  | "seo"
  | "performance"
  | "accessibility"
  | "full";

export interface ScanModeMeta {
  id: ScanMode;
  label: string;
  short: string;
  blurb: string;
  accent: "emerald" | "rose" | "sky" | "amber" | "violet" | "teal";
  icon: "Sparkles" | "ShieldAlert" | "Search" | "Gauge" | "Accessibility" | "Radar";
  estSeconds: number;
}

export const SCAN_MODES: ScanModeMeta[] = [
  {
    id: "content",
    label: "Content Optimizer",
    short: "Content",
    blurb:
      "Spelling, grammar, style, clarity, readability, tone, keyword density, reading time, and SEO content fit.",
    accent: "emerald",
    icon: "Sparkles",
    estSeconds: 4,
  },
  {
    id: "security",
    label: "Security Deep Scan",
    short: "Security",
    blurb:
      "HTTPS, security headers, content vulns + NVD CVE deep scan, RDAP WHOIS, DNS records, certificate transparency logs, and domain intel.",
    accent: "rose",
    icon: "ShieldAlert",
    estSeconds: 12,
  },
  {
    id: "seo",
    label: "SEO & Discoverability",
    short: "SEO",
    blurb: "Meta tags, canonical URL, Open Graph, headings, structured data, mobile.",
    accent: "sky",
    icon: "Search",
    estSeconds: 4,
  },
  {
    id: "performance",
    label: "Performance & Speed",
    short: "Performance",
    blurb: "Page weight, render-blocking scripts, image strategy, caching, compression.",
    accent: "amber",
    icon: "Gauge",
    estSeconds: 3,
  },
  {
    id: "accessibility",
    label: "Accessibility & a11y",
    short: "Accessibility",
    blurb: "Alt text, ARIA roles, labels, contrast, keyboard navigation, language.",
    accent: "violet",
    icon: "Accessibility",
    estSeconds: 4,
  },
  {
    id: "full",
    label: "Full 360° Audit",
    short: "Full 360°",
    blurb: "All five dimensions combined into one comprehensive digital health report.",
    accent: "teal",
    icon: "Radar",
    estSeconds: 18,
  },
];

export interface ContentFinding {
  id: string;
  type:
    | "spelling"
    | "grammar"
    | "punctuation"
    | "style"
    | "clarity"
    | "consistency"
    | "readability"
    | "tone"
    | "keyword"
    | "seo-content";
  severity: Severity;
  excerpt: string;
  explanation: string;
  suggestion: string;
}

export interface SecurityFinding {
  id: string;
  category:
    | "transport"
    | "headers"
    | "content"
    | "forms"
    | "cookies"
    | "scripts"
    | "infrastructure"
    | "cve"
    | "dns"
    | "certificate"
    | "whois";
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  fix: string;
}

export interface SeoFinding {
  id: string;
  category: "meta" | "headings" | "structured-data" | "links" | "content" | "mobile" | "social";
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  fix: string;
}

export interface PerformanceFinding {
  id: string;
  category:
    | "weight"
    | "render-blocking"
    | "images"
    | "scripts"
    | "fonts"
    | "caching"
    | "compression";
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  fix: string;
}

export interface AccessibilityFinding {
  id: string;
  category:
    | "alt-text"
    | "aria"
    | "contrast"
    | "labels"
    | "headings"
    | "keyboard"
    | "language"
    | "forms";
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
  fix: string;
}

/* ============================================
 * Deep security intel types
 * ============================================ */

export interface CveFinding {
  id: string;
  cveId: string;
  source: string;
  product: string;
  version: string;
  severity: Severity;
  cvssScore: number;
  cvssVector?: string;
  published: string;
  lastModified: string;
  description: string;
  referenceUrls: string[];
}

export interface WhoisRecord {
  domain: string;
  registrar?: string;
  registeredOn?: string;
  updatedOn?: string;
  expiresOn?: string;
  statuses: string[];
  nameservers: string[];
  registrantOrg?: string;
  registrantCountry?: string;
  raw?: unknown;
  fetchedAt: string;
  error?: string;
}

export interface DnsRecords {
  domain: string;
  A: string[];
  AAAA: string[];
  MX: string[];
  NS: string[];
  TXT: string[];
  CNAME: string[];
  SOA?: string;
  fetchedAt: string;
  error?: string;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom?: string;
  validTo?: string;
  serialNumber?: string;
  fingerprint?: string;
  san: string[];
  keyAlgorithm?: string;
  keyBits?: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  selfSigned: boolean;
  fetchedAt: string;
  error?: string;
}

export interface CertTransparencyEntry {
  id: string;
  issuerName: string;
  commonName: string;
  nameValue: string;
  notBefore: string;
  notAfter: string;
  serialNumber: string;
}

export interface DomainIntel {
  detectedProducts: { name: string; version: string | null; source: string }[];
  cveFindings: CveFinding[];
  whois: WhoisRecord | null;
  dns: DnsRecords | null;
  certificate: CertificateInfo | null;
  certTransparency: CertTransparencyEntry[];
  discoveredSubdomains: string[];
  ipAddresses: string[];
}

/* ============================================
 * Content Optimizer metrics (NEW)
 * ============================================ */

export interface ContentMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  /** Flesch Reading Ease score 0-100 (higher = easier to read) */
  fleschReadingEase: number;
  /** Flesch-Kincaid Grade Level (years of education needed) */
  fleschKincaidGrade: number;
  /** Gunning Fog index */
  gunningFog: number;
  /** Estimated reading time in minutes */
  readingTimeMin: number;
  /** Reading level label: "Elementary" | "Middle School" | "High School" | "College" | "Graduate" | "Professional" */
  readingLevel: string;
  /** Top 10 keywords with frequency counts */
  topKeywords: { word: string; count: number; density: number }[];
  /** Estimated tone: formal | neutral | casual */
  tone: "formal" | "neutral" | "casual";
  /** Passive voice sentence count */
  passiveVoiceSentences: number;
  /** Sentence count with more than 20 words (long-sentence count) */
  longSentences: number;
  /** Unique word count (vocabulary richness) */
  uniqueWords: number;
  /** Type-token ratio (unique words / total words) */
  typeTokenRatio: number;
}

export interface PageMeta {
  title?: string;
  description?: string;
  url: string;
  httpStatus?: number;
  finalUrl?: string;
  contentType?: string;
  server?: string;
  wordCount?: number;
  fetchMs?: number;
}

export interface ContentDimension {
  score: number;
  findings: ContentFinding[];
  summary: string;
  metrics?: ContentMetrics;
}

export interface SecurityDimension {
  score: number;
  findings: SecurityFinding[];
  summary: string;
  headers: Record<string, string | null>;
  https: boolean;
  mixedContent: boolean;
  intel?: DomainIntel;
}

export interface SeoDimension {
  score: number;
  findings: SeoFinding[];
  summary: string;
  checks: {
    hasTitle: boolean;
    titleLength: number;
    hasDescription: boolean;
    descriptionLength: number;
    hasCanonical: boolean;
    hasOgTags: boolean;
    hasTwitterCard: boolean;
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasStructuredData: boolean;
    hasViewport: boolean;
    hasRobotsMeta: boolean;
    hasLang: boolean;
    lang: string | null;
    hasFavicon: boolean;
  };
}

export interface PerformanceDimension {
  score: number;
  findings: PerformanceFinding[];
  summary: string;
  metrics: {
    pageSizeKb: number;
    htmlBytes: number;
    inlineScriptCount: number;
    externalScriptCount: number;
    externalStylesheetCount: number;
    inlineScriptBytes: number;
    inlineStyleBytes: number;
    imgCount: number;
    hasLazyLoading: boolean;
    hasCompression: boolean;
    hasPreconnect: boolean;
    hasAsyncDeferScripts: boolean;
  };
}

export interface AccessibilityDimension {
  score: number;
  findings: AccessibilityFinding[];
  summary: string;
}

export interface ScanResult {
  id: string;
  url: string;
  mode: ScanMode;
  modeLabel: string;
  scannedAt: string;
  meta: PageMeta;
  content?: ContentDimension;
  grammar?: ContentDimension; // alias for content (backward-compat)
  security?: SecurityDimension;
  seo?: SeoDimension;
  performance?: PerformanceDimension;
  accessibility?: AccessibilityDimension;
  digitalHealthScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  executiveSummary: string;
  topPriorities: string[];
}

export type ProgressEvent =
  | {
      type: "stage";
      stage: ScanStage;
      label: string;
      progress: number;
      detail?: string;
    }
  | { type: "log"; message: string }
  | { type: "heartbeat" }
  | { type: "complete"; result: ScanResult }
  | { type: "error"; message: string };

export type ScanStage =
  | "init"
  | "fetch"
  | "parse"
  | "content"
  | "grammar" // legacy alias
  | "security-headers"
  | "security-content"
  | "security-cve"
  | "security-whois"
  | "security-dns"
  | "security-cert"
  | "seo-meta"
  | "seo-content"
  | "performance-metrics"
  | "performance-analysis"
  | "accessibility-analysis"
  | "score"
  | "finalize";

/* ============================================
 * Local storage types
 * ============================================ */

export interface ScanHistoryEntry {
  id: string;
  url: string;
  mode: ScanMode;
  modeLabel: string;
  score: number;
  grade: string;
  scannedAt: string;
  summary: string;
}

export const SCAN_HISTORY_KEY = "kodand:scan-history";
export const SCAN_HISTORY_MAX = 50;

/** Stored in browser localStorage under key `kodand:target-domain` */
export const TARGET_DOMAIN_KEY = "kodand:target-domain";
