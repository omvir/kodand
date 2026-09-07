/**
 * KODAND Marketing Intelligence & Competitor Benchmark Engine
 * Contains data models, target buyer personas, tele-calling sales scripts,
 * competitor comparison matrices, and strategic SaaS growth recommendations.
 */

export interface TargetPersona {
  id: string;
  name: string;
  badge: string;
  targetRole: string;
  marketRegion: "India" | "Global" | "Both";
  estimatedMarketSize: string;
  idealPricingPlan: string;
  averageDealValue: string;
  primaryPainPoint: string;
  currentWorkaround: string;
  whyKodandWins: string;
  killerPitch: string;
  topChannels: string[];
}

export interface OutreachScript {
  id: string;
  title: string;
  type: "phone" | "whatsapp" | "email" | "linkedin";
  targetPersonaId: string;
  subject?: string;
  hook: string;
  body: string;
  callToAction: string;
  objectionHandlers: { objection: string; response: string }[];
}

export interface CompetitorData {
  id: string;
  name: string;
  logo: string;
  startingPrice: string;
  inrEstimate: string;
  primaryFocus: string;
  strengths: string[];
  weaknesses: string[];
  kodandAdvantages: string[];
  featureRatings: {
    edgeSpeed: number; // 1-5
    securityThreatIntel: number;
    seoReadability: number;
    performanceVitals: number;
    accessibilityWcag: number;
    whiteLabelPdf: number;
    indiaUpiSupport: boolean;
  };
  battlecard: {
    whenTheySay: string;
    youSay: string;
  }[];
}

export interface StrategicImprovement {
  id: string;
  title: string;
  category: "Revenue & Monetization" | "User Acquisition" | "Product Stickiness" | "Enterprise / Agency";
  impact: "High" | "Critical" | "Medium";
  effort: "Low" | "Medium" | "High";
  description: string;
  expectedOutcome: string;
  implementationHint: string;
}

export const TARGET_PERSONAS: TargetPersona[] = [
  {
    id: "india-agencies",
    name: "Indian Web & Digital Agencies",
    badge: "Highest Conversion in India",
    targetRole: "Agency Founders, SEO Directors, Freelance Web Consultants",
    marketRegion: "India",
    estimatedMarketSize: "45,000+ Active Agencies (Mumbai, Delhi NCR, Bengaluru, Hyderabad, Pune, Chennai)",
    idealPricingPlan: "Agency Pro (₹3,499/month or ₹34,990/year)",
    averageDealValue: "₹34,990/year",
    primaryPainPoint: "Ahrefs & Semrush cost $139+/mo (₹12,000+/mo) with 18% foreign transaction fees and credit card restrictions. Clients demand professional white-label audit reports covering Speed, SEO, and Security in one place.",
    currentWorkaround: "Stitching together free Google PageSpeed, manual SEO checklists, and taking screenshots into PowerPoint slides.",
    whyKodandWins: "Zero-fee Instant UPI checkout (PhonePe/GPay/Paytm) at 1/4th the price of Semrush (₹3,499 vs ₹12,000), 5-in-1 audit, and 1-click branded PDF reports.",
    killerPitch: "Stop paying ₹12,000/month for Semrush with credit cards. KODAND gives your agency a 360° Speed, Security, and SEO audit suite with unlimited white-label PDF reports for your clients at just ₹3,499/mo with instant UPI.",
    topChannels: ["Direct Phone Calls to Agency Founders", "WhatsApp Business", "LinkedIn InMail", "Agency Facebook/Telegram Groups"],
  },
  {
    id: "ecommerce-merchants",
    name: "E-Commerce & Shopify Brands",
    badge: "High Retainer Value",
    targetRole: "E-Commerce Managers, Shopify Plus Store Owners, D2C Growth Leads",
    marketRegion: "Both",
    estimatedMarketSize: "120,000+ D2C Brands (India + USA/UK/Europe)",
    idealPricingPlan: "Starter Growth (₹1,299/mo or $29/mo) / Agency Pro",
    averageDealValue: "₹12,990 - ₹34,990/year",
    primaryPainPoint: "Every 100ms speed delay drops conversion rates by 7%. E-commerce stores face ADA/WCAG accessibility lawsuit risks and need constant SSL, TLS, and DNS security validation.",
    currentWorkaround: "Relying purely on Shopify basic speed score, without deep CVE vulnerability checking or WCAG accessibility compliance verification.",
    whyKodandWins: "Sub-second Cloudflare edge performance diagnostics combined with instant WCAG 2.1 compliance audits and real-time DNS/DoH intelligence.",
    killerPitch: "Did you know 68% of shopping cart abandons happen due to slow mobile script blocking and missing alt attributes? KODAND scans your entire checkout funnel across 5 dimensions in 2 seconds.",
    topChannels: ["Shopify Community Forums", "Cold Email to D2C Founders", "LinkedIn Sales Navigator"],
  },
  {
    id: "cybersecurity-devops",
    name: "Cybersecurity & DevOps Teams",
    badge: "High Tech Credibility",
    targetRole: "Penetration Testers, DevSecOps Engineers, Security Compliance Leads",
    marketRegion: "Global",
    estimatedMarketSize: "85,000+ Teams worldwide",
    idealPricingPlan: "Agency Pro ($79/mo or ₹3,499/mo)",
    averageDealValue: "$790/year",
    primaryPainPoint: "Tools like SecurityTrails and Shodan are heavily paywalled ($99+/mo) and separated from web performance and content tooling.",
    currentWorkaround: "Running multiple terminal CLI tools (dig, whois, nmap, crt.sh query scripts).",
    whyKodandWins: "Zero-configuration Edge Security Intel with native DNS-over-HTTPS (DoH), crt.sh certificate transparency logs, WHOIS RDAP, and CVE exposure checking in a single stream.",
    killerPitch: "Get full external perimeter threat intelligence — DNS DoH, Certificate Transparency subdomains, and CVE exposure — in 500ms directly from Cloudflare edge nodes.",
    topChannels: ["Twitter/X DevSecOps", "GitHub Security discussions", "Reddit r/netsec"],
  },
  {
    id: "sme-founders",
    name: "SME & Startup Founders",
    badge: "Mass Market Volume",
    targetRole: "Founders, Solopreneurs, Local Business Owners (Clinics, Real Estate, Law)",
    marketRegion: "India",
    estimatedMarketSize: "500,000+ Businesses with online presence",
    idealPricingPlan: "Starter Growth (₹1,299/mo or ₹12,990/year)",
    averageDealValue: "₹12,990/year",
    primaryPainPoint: "Non-technical owners who have no idea why their website isn't getting leads from Google, and get overcharged by digital agencies.",
    currentWorkaround: "Asking their website developer or ignoring SEO altogether.",
    whyKodandWins: "Simple 0-100 Digital Health Score, plain-English recommendations, Google autocomplete keyword ideas, and auto-generated high-converting meta tags.",
    killerPitch: "Enter your website URL and get an instant report on why competitors are outranking you on Google, plus 100+ keywords your customers are searching for right now.",
    topChannels: ["WhatsApp Outreach", "Local Chamber of Commerce", "Google My Business Tele-calling"],
  },
];

export const OUTREACH_SCRIPTS: OutreachScript[] = [
  {
    id: "script-phone-agency",
    title: "Agency Founder Tele-Calling Pitch (Phone Call)",
    type: "phone",
    targetPersonaId: "india-agencies",
    hook: "Hi [Founder Name], this is [Your Name] from KODAND Security Labs. I saw your agency recently launched [Client Website/Portfolio], looks fantastic! Quick 30 seconds — are you currently using Semrush or Ahrefs to run website audits for your clients?",
    body: `Most agency founders we speak with in Mumbai and Bengaluru tell us they're tired of paying ₹12,000 every month on international credit cards for foreign tools, while clients still complain about website speed and security.

We built KODAND specifically for Indian agencies. It runs a full 360° audit — Speed, Security, SEO, WCAG Accessibility, and Content — in under 2 seconds from Cloudflare edge servers.

Best of all:
1. You can generate unlimited branded White-Label PDF reports with your agency logo to pitch new clients.
2. It's just ₹3,499/month with instant 1-click UPI (GPay/PhonePe) — 70% cheaper than Semrush.`,
    callToAction: "Can I shoot you a 60-second test audit of your agency's website on WhatsApp right now so you can see the difference?",
    objectionHandlers: [
      {
        objection: "We already use Google PageSpeed Insights (it's free).",
        response: "Google PageSpeed is great for developers, but it gives zero security threat intel, no WHOIS/CVE scans, no keyword suggestions, and clients find Lighthouse metrics confusing. KODAND gives you a single 0-100 score plus client-friendly PDF audit reports you can bill clients for.",
      },
      {
        objection: "We already have an Ahrefs / Semrush subscription.",
        response: "Ahrefs is primarily a backlink tool. They don't test WebGL GPU rendering, real edge latency, certificate transparency logs, or WCAG compliance. Most of our agency partners use KODAND as their instant client pitch weapon because scans finish in 2 seconds right on sales calls.",
      },
      {
        objection: "How do we pay or start a trial?",
        response: "You can pay instantly via UPI to atomicpixel0911-1@okhdfcbank with Google Pay or PhonePe with 0% gateway fees and instant activation.",
      },
    ],
  },
  {
    id: "script-whatsapp-agency",
    title: "High-Converting WhatsApp Direct Pitch",
    type: "whatsapp",
    targetPersonaId: "india-agencies",
    hook: "Hey [Name] 👋 Saw the great digital work your agency [Agency Name] is doing in [City]!",
    body: `Quick question: Are you guys still paying ₹10k–₹15k/mo on credit cards for Ahrefs/Semrush to audit client websites?

We built *KODAND* — a Cloudflare Edge website intelligence platform built specifically for Indian digital agencies:
🚀 *360° Full Audit in 2 seconds* (Speed + SEO + Security + WCAG + Keywords)
📄 *Unlimited White-Label Client PDF Reports* (Pitch & close new web design clients)
🇮🇳 *Native India UPI Payment* at ₹3,499/mo (PhonePe / GPay / Paytm)

Check out live instant demo: https://kodand.pages.dev/compare?u1=swiggy.com&u2=zomato.com`,
    callToAction: `Would you like me to send an instant free audit report of [Agency Website]? Reply 'YES' and I'll generate it right now! 🚀

Pay via UPI: *atomicpixel0911-1@okhdfcbank*`,
    objectionHandlers: [
      {
        objection: "Send details on pricing.",
        response: "Starter is ₹1,299/mo (100 scans). Agency Pro is ₹3,499/mo (unlimited scans + white-label PDFs + multi-seat). Yearly plan gives 2 months free! Instant UPI to atomicpixel0911-1@okhdfcbank.",
      },
    ],
  },
  {
    id: "script-email-d2c",
    title: "E-Commerce / D2C Founder Cold Email",
    type: "email",
    targetPersonaId: "ecommerce-merchants",
    subject: "3 hidden issues hurting [Brand Name]'s mobile conversion rate",
    hook: "Hi [First Name], I noticed [Brand Name] is running paid ads on Meta/Google, but your mobile page load time might be costing you 15-20% of your cart conversions.",
    body: `I ran an instant edge audit of [Store URL] using KODAND (an edge diagnostics scanner). Here were the top 3 quick wins:

1. ⚠️ Uncompressed third-party tracking scripts are delaying the First Contentful Paint by ~800ms.
2. ⚠️ Missing OpenGraph image metadata causing broken previews when customers share products on WhatsApp.
3. ⚠️ High DOM complexity impacting checkout speed on Android devices.

Unlike Google PageSpeed which takes 30 seconds to crawl, KODAND benchmarks your store across Speed, Security, and WCAG Accessibility in under 1.5 seconds from Cloudflare nodes.`,
    callToAction: "I've attached the full PDF audit report. Would you have 5 minutes this Thursday for a quick walkthrough on how to fix these?",
    objectionHandlers: [
      {
        objection: "Our Shopify agency handles this.",
        response: "Understood! Forward them this audit PDF. Many agencies actually use KODAND themselves to monitor their clients' daily uptime and Core Web Vitals.",
      },
    ],
  },
  {
    id: "script-linkedin-cmo",
    title: "LinkedIn InMail for Agency Directors & CMOs",
    type: "linkedin",
    targetPersonaId: "india-agencies",
    subject: "Supercharging [Company Name]'s client pitch deck with instant audits",
    hook: "Hi [Name], loved your recent post on client acquisition strategies in the digital marketing space.",
    body: `One quick trend we've observed with 40+ agency partners: agencies that attach an automated 360° website audit (Speed + Threat Intel + SEO) to their initial prospect pitch close deals 2.4x faster.

KODAND allows your business development team to audit any prospect domain on the fly in 2 seconds and download a white-labeled audit report with your agency's branding.`,
    callToAction: "Would love to set your team up with an Agency Pro access trial. Do you have 2 minutes to test it on your agency domain?",
    objectionHandlers: [
      {
        objection: "What makes it different from Lighthouse?",
        response: "Lighthouse only tests client-side browser performance. KODAND combines Lighthouse speed with DNS-over-HTTPS threat intel, SSL certificate logs, Google autocomplete keyword discovery, and competitor side-by-side benchmarking.",
      },
    ],
  },
];

export const COMPETITORS: CompetitorData[] = [
  {
    id: "ahrefs",
    name: "Ahrefs",
    logo: "🔴",
    startingPrice: "$99 - $999/month",
    inrEstimate: "₹8,600 - ₹87,000/month + 18% GST",
    primaryFocus: "Backlink Analysis & SEO Keyword Explorer",
    strengths: ["Massive backlink web crawler", "Deep historical keyword database", "High industry brand recognition"],
    weaknesses: [
      "Extremely expensive for Indian agencies & startups",
      "No security or DNS threat intelligence",
      "No accessibility (WCAG) audit",
      "Strict credit card billing only (no Indian UPI)",
      "Crawl speed is slow (takes 2-5 minutes per site audit)",
    ],
    kodandAdvantages: [
      "Instant Cloudflare Edge execution (< 500ms vs minutes)",
      "70% lower price point (₹3,499/mo vs ₹8,600+/mo)",
      "Zero-fee 1-click India UPI payment (atomicpixel0911-1@okhdfcbank)",
      "Includes Security (DoH, crt.sh, CVEs) & WCAG Accessibility",
      "Real-time Google Autocomplete keyword expansion with zero credit limits",
    ],
    featureRatings: {
      edgeSpeed: 2,
      securityThreatIntel: 1,
      seoReadability: 5,
      performanceVitals: 3,
      accessibilityWcag: 1,
      whiteLabelPdf: 4,
      indiaUpiSupport: false,
    },
    battlecard: [
      {
        whenTheySay: "We already pay for Ahrefs Lite ($99/mo).",
        youSay: "Ahrefs is great for deep backlinks, but have you noticed your team only uses 10% of their complex features while still lacking security checks, accessibility compliance, and real-time edge speed diagnostics? KODAND gives you the speed, security, and white-label client reports for a fraction of the cost.",
      },
    ],
  },
  {
    id: "semrush",
    name: "Semrush",
    logo: "🟠",
    startingPrice: "$139.95 - $499/month",
    inrEstimate: "₹12,200 - ₹43,000/month + GST",
    primaryFocus: "Enterprise Marketing & Paid Search (PPC)",
    strengths: ["Comprehensive PPC ad spy tools", "Extensive content marketing suite", "Enterprise brand"],
    weaknesses: [
      "Overwhelming user interface with steep learning curve",
      "Very high price barrier for freelancers and growing agencies",
      "Credit card recurring lock-in with complicated cancellation",
      "Zero server-level threat intel or hardware fingerprinting",
    ],
    kodandAdvantages: [
      "1-Click zero friction scan without 50 complicated sub-menus",
      "Native INR currency & instant UPI payment",
      "Instant competitor side-by-side comparison (/compare)",
      "Integrated hardware telemetry tracking for user management",
    ],
    featureRatings: {
      edgeSpeed: 3,
      securityThreatIntel: 2,
      seoReadability: 4,
      performanceVitals: 3,
      accessibilityWcag: 2,
      whiteLabelPdf: 4,
      indiaUpiSupport: false,
    },
    battlecard: [
      {
        whenTheySay: "Semrush has everything in one place.",
        youSay: "Semrush is a $140/mo behemoth designed for 50-person marketing teams. If your goal is closing web design and SEO clients with instant 2-second audit reports and threat intelligence, KODAND is 4x faster, 75% cheaper, and payable instantly via UPI.",
      },
    ],
  },
  {
    id: "gtmetrix",
    name: "GTmetrix",
    logo: "🔵",
    startingPrice: "$14 - $40/month",
    inrEstimate: "₹1,200 - ₹3,500/month",
    primaryFocus: "Page Speed & Waterfall Charts",
    strengths: ["Detailed browser waterfall analysis", "Global test server locations", "Video playback"],
    weaknesses: [
      "Only tests speed (zero SEO, zero Security, zero Content, zero Keywords)",
      "Queues on free tier (waiting 2-3 minutes during peak hours)",
      "No UPI payment in India",
      "Reports look technical and overwhelm non-developer clients",
    ],
    kodandAdvantages: [
      "Full 5-in-1 multi-dimension audit (Speed + SEO + Security + WCAG + Content)",
      "Zero queue wait times — sub-second edge streaming",
      "Executive-ready 0-100 score that clients understand immediately",
      "Integrated India UPI checkout",
    ],
    featureRatings: {
      edgeSpeed: 3,
      securityThreatIntel: 1,
      seoReadability: 1,
      performanceVitals: 5,
      accessibilityWcag: 1,
      whiteLabelPdf: 3,
      indiaUpiSupport: false,
    },
    battlecard: [
      {
        whenTheySay: "We just check GTmetrix for free.",
        youSay: "GTmetrix only tells you how fast your HTML loads. It doesn't tell you if your SSL certificates are expiring, if you have CVE vulnerabilities, if your site violates WCAG accessibility laws, or what keywords your rivals are targeting. KODAND does all of that in one pass.",
      },
    ],
  },
  {
    id: "securitytrails",
    name: "SecurityTrails / Shodan",
    logo: "🛡️",
    startingPrice: "$99/month",
    inrEstimate: "₹8,600/month",
    primaryFocus: "Cybersecurity & Attack Surface Intelligence",
    strengths: ["Comprehensive DNS database", "Subdomain enumeration", "Threat intelligence"],
    weaknesses: [
      "Purely for cybersecurity specialists, completely detached from SEO/Web performance",
      "High price barrier for web developers and agencies",
      "No website marketing or content guidance",
    ],
    kodandAdvantages: [
      "Brings Enterprise DNS-over-HTTPS & Certificate Transparency to web marketing teams",
      "Combines security audit with PageSpeed & SEO in a single report",
      "Affordable for indie web developers and security freelancers",
    ],
    featureRatings: {
      edgeSpeed: 4,
      securityThreatIntel: 5,
      seoReadability: 1,
      performanceVitals: 1,
      accessibilityWcag: 1,
      whiteLabelPdf: 2,
      indiaUpiSupport: false,
    },
    battlecard: [
      {
        whenTheySay: "We use specialized security scanners for threats.",
        youSay: "KODAND doesn't replace a $10,000 enterprise SOC, but it equips your web design and marketing team with instant DoH and CVE visibility so you never deliver an insecure site to a client.",
      },
    ],
  },
  {
    id: "woorank",
    name: "Woorank / Sitechecker",
    logo: "🟢",
    startingPrice: "$49 - $89/month",
    inrEstimate: "₹4,200 - ₹7,700/month",
    primaryFocus: "Website Audit & Lead Generation Widget",
    strengths: ["Lead generation form for agencies", "Simple layout", "Basic SEO scoring"],
    weaknesses: [
      "Outdated scoring algorithm",
      "No real-time DoH/TLS threat intelligence",
      "Expensive foreign credit card billing only",
      "Slow crawl times",
    ],
    kodandAdvantages: [
      "Modern Cloudflare Edge architecture with sub-second execution",
      "Comprehensive Threat Intel (DNS DoH, CVEs, WHOIS RDAP)",
      "India UPI native support with atomicpixel0911-1@okhdfcbank",
      "Modern sleek dark-mode glassmorphism interface",
    ],
    featureRatings: {
      edgeSpeed: 3,
      securityThreatIntel: 1,
      seoReadability: 4,
      performanceVitals: 3,
      accessibilityWcag: 3,
      whiteLabelPdf: 3,
      indiaUpiSupport: false,
    },
    battlecard: [
      {
        whenTheySay: "We've been using Woorank for years.",
        youSay: "Woorank hasn't innovated in years. KODAND runs on Cloudflare Workers edge nodes, giving you modern Core Web Vitals, active certificate transparency logs, and Google autocomplete keyword intelligence in real-time.",
      },
    ],
  },
];

export const STRATEGIC_IMPROVEMENTS: StrategicImprovement[] = [
  {
    id: "imp-01",
    title: "KODAND 1-Click Chrome Extension for Agencies",
    category: "User Acquisition",
    impact: "Critical",
    effort: "Medium",
    description: "Build a lightweight Chrome Extension that lets agency founders click an icon on ANY client or prospect website to trigger an instant background KODAND audit and copy the shareable report link.",
    expectedOutcome: "3.5x increase in daily active scans and viral lead generation as agency sales reps use it during discovery calls.",
    implementationHint: "Package the existing `/api/scan` SSE client into a Manifest V3 extension popup.",
  },
  {
    id: "imp-02",
    title: "Embeddable 'Free Website Audit' Lead Widget for Agency Websites",
    category: "Enterprise / Agency",
    impact: "Critical",
    effort: "Low",
    description: "Provide Agency Pro subscribers with an embeddable HTML `<script>` widget for their own website. Visitors enter their URL and email to get a free audit — delivering qualified leads to both the agency and KODAND.",
    expectedOutcome: "Strongest selling point for the ₹3,499/mo Agency Pro plan. Agencies buy purely for automated inbound lead generation.",
    implementationHint: "Create a simple iframe/widget route `/embed/audit` with configurable agency branding.",
  },
  {
    id: "imp-03",
    title: "Automated Weekly Domain Health Monitoring & Cron Alerts",
    category: "Product Stickiness",
    impact: "High",
    effort: "Medium",
    description: "Allow users to subscribe a domain for weekly automated re-auditing. If their Digital Health Score drops below 80 or an SSL cert is within 14 days of expiry, trigger an automated email or WhatsApp alert.",
    expectedOutcome: "Transforms KODAND from a one-off audit tool into an indispensable recurring monitoring subscription, slashing churn by 60%.",
    implementationHint: "Leverage Cloudflare Cron Triggers or Node cron scheduler with D1 database storage.",
  },
  {
    id: "imp-04",
    title: "Automated WhatsApp PDF Audit Delivery via Gupshup/Twilio",
    category: "Revenue & Monetization",
    impact: "High",
    effort: "Medium",
    description: "Add an option in the UI: 'Send PDF Report to WhatsApp'. Users enter their phone number and receive the formatted audit PDF directly in their WhatsApp chat within 5 seconds.",
    expectedOutcome: "Drives massive conversion in India where business owners open WhatsApp within 3 minutes compared to 20% email open rates.",
    implementationHint: "Integrate with WhatsApp Cloud API using standard document messaging templates.",
  },
  {
    id: "imp-05",
    title: "White-Label Custom Domain CNAME for Agency Pro",
    category: "Enterprise / Agency",
    impact: "Critical",
    effort: "High",
    description: "Allow Agency Pro customers to point their custom domain (e.g. `audit.apexmedia.in`) via Cloudflare for SaaS, so client reports load entirely on the agency's own domain name.",
    expectedOutcome: "Enables raising Agency Pro pricing to ₹4,999/mo ($99/mo) and locks in long-term enterprise agency contracts.",
    implementationHint: "Use Cloudflare Custom Hostnames (SSL for SaaS) or reverse proxy mapping.",
  },
];
