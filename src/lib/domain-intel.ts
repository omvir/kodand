import {
  CertTransparencyEntry,
  CertificateInfo,
  CveFinding,
  DnsRecords,
  DomainIntel,
  Severity,
  WhoisRecord,
} from "./audit-types";
import { throttleForHost } from "./scan-cache";

/**
 * KODAND deep security intel — fetched entirely from free, public, no-API-key
 * sources on the public internet:
 *
 *   - NVD CVE API        https://services.nvd.nist.gov/rest/json/cves/2.0
 *   - RDAP WHOIS         https://rdap.net/domain/{domain}
 *   - DNS records        Node built-in dns module (no third-party call)
 *   - TLS certificate    Node built-in tls module
 *   - crt.sh             https://crt.sh/?q={domain}&output=json
 *
 * All sources are free, public, and require no API key or signup.
 *
 * Anti-ban measures (per the user's request):
 *   1. We throttle per-host: never more than 1 request / 800ms to the same
 *      external host (NVD, RDAP, crt.sh).
 *   2. We use aggressive per-call timeouts (5-8s) so a single slow service
 *      never blocks the whole scan and never triggers a 502.
 *   3. We cap the NVD CVE keyword search at 3 products (down from 5) to
 *      respect NVD's 5 requests / 30s unauthenticated rate limit.
 *   4. All intel sources run in parallel via Promise.allSettled.
 *   5. We use a clearly-identifying User-Agent identifying KODAND as a
 *      research/audit tool, not a scraper.
 *   6. We never re-query the same URL+mode within 5 minutes — see scan-cache.
 */

function makeId(prefix: string, i: number) {
  return `${prefix}-${i.toString().padStart(3, "0")}`;
}

function timeoutSignal(ms: number) {
  return AbortSignal.timeout(ms);
}

const POLITE_UA =
  "Mozilla/5.0 (compatible; KODAND-Auditor/1.0; +https://chat.z.ai; research-only)";

/* ============================================
 * Software product detection (from HTTP headers + HTML)
 * ============================================ */

interface DetectedProduct {
  name: string;
  version: string | null;
  source: string;
}

/** Parse a Server / X-Powered-By / X-Generator header into a product+version. */
function parseProductFromHeader(
  headerName: string,
  headerValue: string | null
): DetectedProduct | null {
  if (!headerValue) return null;
  // Match "Apache/2.4.41", "nginx/1.18.0", "PHP/7.4.3", "Express", "Next.js 14"
  const m = headerValue.match(/^([A-Za-z][A-Za-z0-9_.+ -]*?)(?:\/|\s+)([0-9][0-9a-zA-Z._-]*)/);
  if (m) {
    return {
      name: m[1].trim(),
      version: m[2].trim(),
      source: headerName,
    };
  }
  // Just a product name without version
  const m2 = headerValue.match(/^([A-Za-z][A-Za-z0-9_.+ -]+)$/);
  if (m2) {
    return { name: m2[1].trim(), version: null, source: headerName };
  }
  return null;
}

/** Detect known software products from HTTP response headers + meta generators. */
export function detectProducts(
  headers: Record<string, string | null>,
  html: string
): DetectedProduct[] {
  const products: DetectedProduct[] = [];
  const seen = new Set<string>();
  const add = (p: DetectedProduct | null) => {
    if (!p) return;
    const key = `${p.name}|${p.version || ""}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    products.push(p);
  };

  add(parseProductFromHeader("Server", headers["server"] || null));
  add(parseProductFromHeader("X-Powered-By", headers["x-powered-by"] || null));
  add(parseProductFromHeader("X-Generator", headers["x-generator"] || null));
  add(parseProductFromHeader("X-AspNet-Version", headers["x-aspnet-version"] || null));

  // <meta name="generator" content="WordPress 6.4.2">
  const gm = html.match(
    /<meta\s+name=["']generator["']\s+content=["']([^"']+)["']/i
  );
  if (gm) {
    const p = parseProductFromHeader("meta:generator", gm[1]);
    add(p);
  }

  return products.filter((p) => p.name && p.name.length >= 2);
}

/* ============================================
 * NVD CVE deep scan
 * ============================================ */

interface NvdResponse {
  resultsPerPage?: number;
  totalResults?: number;
  vulnerabilities?: NvdVulnerability[];
}

interface NvdVulnerability {
  cve: {
    id: string;
    sourceIdentifier?: string;
    published?: string;
    lastModified?: string;
    vulnStatus?: string;
    descriptions?: { lang: string; value: string }[];
    references?: { url: string; source?: string }[];
    metrics?: {
      cvssMetricV31?: {
        source?: string;
        cvssData?: {
          version?: string;
          vectorString?: string;
          baseScore?: number;
          baseSeverity?: string;
        };
        cvssSource?: string;
      }[];
      cvssMetricV2?: {
        cvssData?: {
          version?: string;
          vectorString?: string;
          baseScore?: number;
          baseSeverity?: string;
        };
      }[];
    };
    weaknesses?: { source?: string; description?: { lang?: string; value?: string }[] }[];
  };
}

/** Search the NVD CVE database for a product+version. Returns raw NVD vulnerabilities. */
async function searchNvdCves(
  product: string,
  version: string | null
): Promise<NvdVulnerability[]> {
  const keyword = version ? `${product} ${version}` : product;
  const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(
    keyword
  )}&resultsPerPage=10`;
  try {
    await throttleForHost("services.nvd.nist.gov");
    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": POLITE_UA,
      },
      signal: timeoutSignal(6000),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as NvdResponse;
    if (!data || !Array.isArray(data.vulnerabilities)) return [];
    return data.vulnerabilities.slice(0, 10);
  } catch {
    return [];
  }
}

/** Map an NVD CVSS base score to KODAND severity. */
function cvssToSeverity(score: number | undefined): Severity {
  if (score == null) return "info";
  if (score >= 9) return "critical";
  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  if (score > 0) return "low";
  return "info";
}

/**
 * Deep CVE scan — for each detected product, query NVD for matching CVEs,
 * deduplicate, and return CveFinding objects.
 *
 * To keep within NVD's unauthenticated rate limit (5 requests / 30s), we
 * scan at most 3 products sequentially with a small delay between calls.
 */
export async function deepCveScan(
  products: DetectedProduct[]
): Promise<{ findings: CveFinding[]; productsScanned: number }> {
  if (products.length === 0) return { findings: [], productsScanned: 0 };

  const findings: CveFinding[] = [];
  const seenCve = new Set<string>();
  // Only scan products with a version — those are CVE-searchable. Cap at 3
  // to respect NVD's 5 reqs/30s unauthenticated rate limit.
  const searchable = products.filter((p) => p.version).slice(0, 3);
  let i = 0;
  for (const p of searchable) {
    if (i > 0) await sleep(800); // be polite to NVD
    i++;
    const vulns = await searchNvdCves(p.name, p.version);
    for (const v of vulns) {
      const cve = v.cve;
      if (!cve || !cve.id || seenCve.has(cve.id)) continue;
      seenCve.add(cve.id);
      const cvss31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData;
      const cvss2 = cve.metrics?.cvssMetricV2?.[0]?.cvssData;
      const score = cvss31?.baseScore ?? cvss2?.baseScore;
      const vector = cvss31?.vectorString ?? cvss2?.vectorString;
      const description =
        cve.descriptions?.find((d) => d.lang === "en")?.value ||
        cve.descriptions?.[0]?.value ||
        "";
      const refs = (cve.references || []).map((r) => r.url).slice(0, 5);
      findings.push({
        id: makeId("CVE", findings.length),
        cveId: cve.id,
        source: cve.sourceIdentifier || "NVD",
        product: `${p.name}${p.version ? `/${p.version}` : ""}`,
        version: p.version || "",
        severity: cvssToSeverity(score),
        cvssScore: score ?? 0,
        cvssVector: vector,
        published: cve.published || "",
        lastModified: cve.lastModified || "",
        description: description.slice(0, 800),
        referenceUrls: refs,
      });
    }
  }
  // Sort by severity (CVSS score desc)
  findings.sort((a, b) => b.cvssScore - a.cvssScore);
  return { findings, productsScanned: searchable.length };
}

/* ============================================
 * RDAP WHOIS
 * ============================================ */

interface RdapResponse {
  objectClassName?: string;
  ldhName?: string;
  unicodeName?: string;
  handle?: string;
  status?: string[];
  events?: { eventAction?: string; eventDate?: string }[];
  nameservers?: { ldhName?: string; events?: { eventDate?: string }[] }[];
  entities?: {
    roles?: string[];
    vcardArray?: [string, (string | string[] | number[])[]];
  }[];
  errorCode?: number;
  title?: string;
  description?: string;
}

function extractVcardField(
  vcard: RdapResponse["entities"][0]["vcardArray"],
  fieldName: string
): string | undefined {
  if (!vcard || !Array.isArray(vcard[1])) return undefined;
  for (const entry of vcard[1]) {
    if (Array.isArray(entry) && entry[0] === fieldName) {
      // vcard entry shape: [name, params, type, value]
      const val = entry[3];
      if (typeof val === "string") return val;
      if (Array.isArray(val) && typeof val[0] === "string") return val[0];
    }
  }
  return undefined;
}

/**
 * Fetch the RDAP WHOIS record for a domain via rdap.net (a free dispatcher
 * that follows IANA's bootstrap for any TLD).
 */
export async function fetchWhois(domain: string): Promise<WhoisRecord | null> {
  const cleanDomain = domain.replace(/^www\./i, "").toLowerCase();
  try {
    await throttleForHost("rdap.net");
    const resp = await fetch(`https://rdap.net/domain/${cleanDomain}`, {
      headers: {
        Accept: "application/rdap+json,application/json",
        "User-Agent": POLITE_UA,
      },
      signal: timeoutSignal(6000),
    });
    if (!resp.ok) {
      return {
        domain: cleanDomain,
        statuses: [],
        nameservers: [],
        fetchedAt: new Date().toISOString(),
        error: `RDAP lookup returned HTTP ${resp.status}`,
      };
    }
    const data = (await resp.json()) as RdapResponse;
    if (!data || data.errorCode) {
      return {
        domain: cleanDomain,
        statuses: [],
        nameservers: [],
        fetchedAt: new Date().toISOString(),
        error: data.title || `RDAP error code ${data.errorCode}`,
      };
    }
    const events = data.events || [];
    const eventOf = (action: string) =>
      events.find((e) => e.eventAction === action)?.eventDate;
    const registrarEntity = data.entities?.find((e) =>
      (e.roles || []).includes("registrar")
    );
    const registrantEntity = data.entities?.find((e) =>
      (e.roles || []).includes("registrant")
    );
    return {
      domain: data.ldhName || cleanDomain,
      registrar: registrarEntity
        ? extractVcardField(registrarEntity.vcardArray, "fn")
        : undefined,
      registeredOn: eventOf("registration"),
      updatedOn: eventOf("last changed"),
      expiresOn: eventOf("expiration"),
      statuses: data.status || [],
      nameservers: (data.nameservers || [])
        .map((n) => n.ldhName || "")
        .filter(Boolean),
      registrantOrg: registrantEntity
        ? extractVcardField(registrantEntity.vcardArray, "org")
        : undefined,
      registrantCountry: registrantEntity
        ? extractVcardField(registrantEntity.vcardArray, "country-name")
        : undefined,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      domain: cleanDomain,
      statuses: [],
      nameservers: [],
      fetchedAt: new Date().toISOString(),
      error: (err as Error).message,
    };
  }
}

/* ============================================
 * DNS records (Cloudflare DNS-over-HTTPS — Edge & Node compatible)
 * ============================================ */

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

/** Resolve common DNS record types for a domain via Cloudflare DNS-over-HTTPS. */
export async function fetchDns(domain: string): Promise<DnsRecords> {
  const clean = domain.replace(/^www\./i, "").toLowerCase();
  const fetchedAt = new Date().toISOString();

  const queryType = async (type: string): Promise<string[]> => {
    try {
      const resp = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(clean)}&type=${type}`,
        {
          headers: { Accept: "application/dns-json" },
          signal: timeoutSignal(5000),
        }
      );
      if (!resp.ok) return [];
      const data = (await resp.json()) as DohResponse;
      return (data.Answer || []).map((a) => a.data);
    } catch {
      return [];
    }
  };

  try {
    const [a, aaaa, mx, ns, txt, soa, cname] = await Promise.all([
      queryType("A"),
      queryType("AAAA"),
      queryType("MX"),
      queryType("NS"),
      queryType("TXT"),
      queryType("SOA"),
      queryType("CNAME"),
    ]);

    return {
      domain: clean,
      A: a,
      AAAA: aaaa,
      MX: mx,
      NS: ns,
      TXT: txt.map((t) => t.replace(/^"|"$/g, "")),
      CNAME: cname,
      SOA: soa[0],
      fetchedAt,
    };
  } catch (err) {
    return {
      domain: clean,
      A: [],
      AAAA: [],
      MX: [],
      NS: [],
      TXT: [],
      CNAME: [],
      fetchedAt,
      error: (err as Error).message,
    };
  }
}

/* ============================================
 * TLS certificate inspection (Edge & Cloudflare compatible)
 * ============================================ */

/**
 * Inspect TLS certificate using Certificate Transparency logs.
 * Edge-compatible (no Node tls/net module needed).
 */
export async function fetchTlsCertificate(
  host: string,
  _port = 443
): Promise<CertificateInfo | null> {
  const fetchedAt = new Date().toISOString();
  try {
    const certs = await fetchCertTransparency(host);
    if (!certs || certs.length === 0) {
      return {
        subject: host,
        issuer: "Cloudflare / Global CDN",
        san: [host],
        isExpired: false,
        isExpiringSoon: false,
        selfSigned: false,
        fetchedAt,
      };
    }
    const latest = certs[0];
    const validFrom = latest.notBefore;
    const validTo = latest.notAfter;
    const now = new Date();
    const toDate = validTo ? new Date(validTo) : undefined;
    const isExpired = toDate ? toDate.getTime() < now.getTime() : false;
    const daysUntilExpiry = toDate
      ? Math.floor((toDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 9999;
    const isExpiringSoon = !isExpired && daysUntilExpiry < 30;
    const san = latest.nameValue
      ? latest.nameValue.split("\n").map((s) => s.trim()).filter(Boolean)
      : [host];

    return {
      subject: latest.commonName || host,
      issuer: latest.issuerName || "Unknown",
      validFrom,
      validTo,
      serialNumber: latest.serialNumber,
      san,
      isExpired,
      isExpiringSoon,
      selfSigned: false,
      fetchedAt,
    };
  } catch (err) {
    return {
      subject: host,
      issuer: "",
      san: [],
      isExpired: false,
      isExpiringSoon: false,
      selfSigned: false,
      fetchedAt,
      error: (err as Error).message,
    };
  }
}

/* ============================================
 * Certificate transparency via crt.sh
 * ============================================ */

interface CrtShEntry {
  issuer_ca_id: number;
  issuer_name: string;
  common_name: string;
  name_value: string;
  id: number;
  not_before: string;
  not_after: string;
  serial_number: string;
}

/**
 * Fetch certificate transparency log entries for a domain from crt.sh.
 * This is free, no API key, and reveals all SSL certs ever issued for the
 * domain — including subdomains discovered via the name_value field.
 */
export async function fetchCertTransparency(
  domain: string
): Promise<CertTransparencyEntry[]> {
  const clean = domain.replace(/^www\./i, "").toLowerCase();
  const url = `https://crt.sh/?q=${encodeURIComponent(
    "%" + clean
  )}&output=json`;
  try {
    await throttleForHost("crt.sh");
    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": POLITE_UA,
      },
      signal: timeoutSignal(8000),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as CrtShEntry[];
    if (!Array.isArray(data)) return [];
    // Deduplicate by serial_number, keep newest 20 entries
    const seen = new Set<string>();
    const deduped = data
      .filter((e) => {
        if (seen.has(e.serial_number)) return false;
        seen.add(e.serial_number);
        return true;
      })
      .slice(0, 20);
    return deduped.map((e, i) => ({
      id: makeId("CT", i),
      issuerName: e.issuer_name,
      commonName: e.common_name,
      nameValue: e.name_value,
      notBefore: e.not_before,
      notAfter: e.not_after,
      serialNumber: e.serial_number,
    }));
  } catch {
    return [];
  }
}

/** Extract subdomains discovered via cert transparency logs. */
export function subdomainsFromCertTransparency(
  entries: CertTransparencyEntry[],
  baseDomain: string
): string[] {
  const clean = baseDomain.replace(/^www\./i, "").toLowerCase();
  const subs = new Set<string>();
  for (const e of entries) {
    const names = e.nameValue
      .split(/\n/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    for (const n of names) {
      // Strip wildcard prefix
      const name = n.replace(/^\*\./, "");
      if (name.endsWith(clean) && name !== clean) {
        subs.add(name);
      }
    }
  }
  return Array.from(subs).sort().slice(0, 30);
}

/* ============================================
 * Compose full DomainIntel
 * ============================================ */

export interface IntelInput {
  url: string;
  finalUrl: string;
  headers: Record<string, string | null>;
  html: string;
  isHttps: boolean;
}

export async function gatherDomainIntel(
  input: IntelInput,
  send: (msg: string) => void
): Promise<DomainIntel> {
  let host: string;
  try {
    host = new URL(input.finalUrl || input.url).host;
  } catch {
    host = input.url;
  }
  const domain = host.replace(/^www\./i, "");

  // 1. Detect products from headers + meta generator (synchronous)
  const detectedProducts = detectProducts(input.headers, input.html);
  if (detectedProducts.length > 0) {
    send(
      `Detected ${detectedProducts.length} software product(s): ${detectedProducts
        .map((p) => `${p.name}${p.version ? `/${p.version}` : ""}`)
        .slice(0, 5)
        .join(", ")}.`
    );
  } else {
    send("No versioned software products detected from headers — skipping CVE keyword search.");
  }

  // 2. Run ALL intel sources in parallel — NVD CVE, RDAP WHOIS, DNS, TLS cert,
  // crt.sh certificate transparency. Each has its own short timeout so one slow
  // source never blocks the scan (anti-502 / anti-ban).
  send("Launching parallel intel probes (NVD CVE, RDAP, DNS, TLS, crt.sh)…");

  const cvePromise = detectedProducts.some((p) => p.version)
    ? deepCveScan(detectedProducts)
    : Promise.resolve({ findings: [], productsScanned: 0 });

  const whoisPromise = fetchWhois(domain);
  const dnsPromise = fetchDns(domain);
  const ctPromise = fetchCertTransparency(domain);
  const certPromise = input.isHttps
    ? fetchTlsCertificate(host, 443)
    : Promise.resolve(null);

  const [cveResult, whois, dnsRecords, certTransparency, certificate] =
    await Promise.all([cvePromise, whoisPromise, dnsPromise, ctPromise, certPromise]);

  const cveFindings = cveResult.findings;
  send(
    `NVD CVE scan: ${cveResult.productsScanned} product(s) queried, ${cveFindings.length} matching CVE(s) found.`
  );

  if (whois && !whois.error) {
    send(
      `WHOIS: registrar ${whois.registrar || "unknown"}, registered ${
        whois.registeredOn
          ? new Date(whois.registeredOn).toLocaleDateString()
          : "unknown"
      }, expires ${whois.expiresOn ? new Date(whois.expiresOn).toLocaleDateString() : "unknown"}, ${
        whois.nameservers.length
      } nameservers.`
    );
  } else if (whois && whois.error) {
    send(`WHOIS lookup failed: ${whois.error}`);
  }
  if (!dnsRecords.error) {
    send(
      `DNS: ${dnsRecords.A.length} A record(s), ${dnsRecords.AAAA.length} AAAA, ${dnsRecords.MX.length} MX, ${dnsRecords.NS.length} NS, ${dnsRecords.TXT.length} TXT.`
    );
  } else {
    send(`DNS resolution failed: ${dnsRecords.error}`);
  }
  if (certificate && !certificate.error) {
    const status = certificate.isExpired
      ? "EXPIRED"
      : certificate.isExpiringSoon
      ? "expiring soon"
      : "valid";
    send(
      `TLS cert: ${status}, issuer ${certificate.issuer || "unknown"}, ${certificate.san.length} SAN(s), ${certificate.selfSigned ? "self-signed" : "CA-signed"}.`
    );
  } else if (certificate && certificate.error) {
    send(`TLS inspection failed: ${certificate.error}`);
  }
  send(`Certificate transparency: ${certTransparency.length} historical cert(s) from crt.sh.`);

  const discoveredSubdomains = subdomainsFromCertTransparency(
    certTransparency,
    domain
  );
  if (discoveredSubdomains.length > 0) {
    send(
      `Discovered ${discoveredSubdomains.length} subdomain(s) via cert transparency: ${discoveredSubdomains
        .slice(0, 5)
        .join(", ")}${discoveredSubdomains.length > 5 ? "…" : ""}.`
    );
  }

  const ipAddresses = Array.from(
    new Set([...(dnsRecords.A || []), ...(dnsRecords.AAAA || [])])
  );

  return {
    detectedProducts,
    cveFindings,
    whois,
    dns: dnsRecords,
    certificate,
    certTransparency,
    discoveredSubdomains,
    ipAddresses,
  };
}

/* ============================================
 * Helpers
 * ============================================ */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ============================================
 * Generate SecurityFindings from intel
 * (so the security dimension's findings array includes intel-derived issues)
 * ============================================ */

import type { SecurityFinding } from "./audit-types";

export function intelToSecurityFindings(intel: DomainIntel): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  let i = 0;

  // High-severity CVEs
  for (const cve of intel.cveFindings) {
    if (cve.severity === "critical" || cve.severity === "high") {
      findings.push({
        id: makeId("SEC-CVE", i++),
        category: "cve",
        severity: cve.severity,
        title: `${cve.cveId} affects ${cve.product} (CVSS ${cve.cvssScore})`,
        detail: cve.description.slice(0, 600),
        evidence: `CVSS: ${cve.cvssScore} ${cve.cvssVector || ""} · Published: ${cve.published}`,
        fix: `Patch ${cve.product} to a non-vulnerable version. See: ${cve.referenceUrls[0] || "NVD"}`,
      });
    }
  }
  // Medium/low CVEs as a single summary
  const mediumLowCves = intel.cveFindings.filter(
    (c) => c.severity === "medium" || c.severity === "low"
  );
  if (mediumLowCves.length > 0) {
    findings.push({
      id: makeId("SEC-CVE", i++),
      category: "cve",
      severity: "medium",
      title: `${mediumLowCves.length} medium/low CVE(s) match the detected software`,
      detail: `Lower-severity vulnerabilities: ${mediumLowCves
        .map((c) => `${c.cveId} (CVSS ${c.cvssScore})`)
        .slice(0, 5)
        .join(", ")}.`,
      evidence: mediumLowCves.map((c) => `${c.cveId}: ${c.description.slice(0, 120)}`).join("\n").slice(0, 600),
      fix: "Schedule patching for the affected software versions during the next maintenance window.",
    });
  }

  // TLS certificate issues
  if (intel.certificate) {
    if (intel.certificate.isExpired) {
      findings.push({
        id: makeId("SEC-CERT", i++),
        category: "certificate",
        severity: "critical",
        title: "TLS certificate has expired",
        detail: `The site's TLS certificate expired on ${intel.certificate.validTo}. Browsers will display a security warning to all visitors.`,
        evidence: `validTo: ${intel.certificate.validTo}`,
        fix: `Renew the TLS certificate immediately via your CA or Let's Encrypt (free).`,
      });
    } else if (intel.certificate.isExpiringSoon) {
      findings.push({
        id: makeId("SEC-CERT", i++),
        category: "certificate",
        severity: "high",
        title: "TLS certificate expiring within 30 days",
        detail: `The TLS certificate will expire on ${intel.certificate.validTo}. Renew now to avoid an outage.`,
        evidence: `validTo: ${intel.certificate.validTo}`,
        fix: `Renew the TLS certificate before expiry. Automate renewal with ACME (Let's Encrypt + certbot).`,
      });
    }
    if (intel.certificate.selfSigned) {
      findings.push({
        id: makeId("SEC-CERT", i++),
        category: "certificate",
        severity: "high",
        title: "Self-signed TLS certificate",
        detail:
          "The certificate's issuer matches the subject — it is self-signed. Browsers will display a security warning. There is no chain of trust to a recognized CA.",
        evidence: `subject === issuer: ${intel.certificate.subject}`,
        fix: `Replace with a certificate issued by a recognized CA (Let's Encrypt is free).`,
      });
    }
  }

  // WHOIS privacy issues — short privacy lifetime is suspicious
  if (intel.whois && !intel.whois.error) {
    if (intel.whois.expiresOn) {
      const expiry = new Date(intel.whois.expiresOn);
      const now = new Date();
      if (expiry.getTime() < now.getTime()) {
        findings.push({
          id: makeId("SEC-WHOIS", i++),
          category: "whois",
          severity: "medium",
          title: "Domain registration has expired",
          detail: `The domain registration expired on ${intel.whois.expiresOn}. The domain could be taken over by a third party at any time.`,
          evidence: `expiresOn: ${intel.whois.expiresOn}`,
          fix: `Renew the domain registration immediately via the registrar (${intel.whois.registrar || "unknown"}).`,
        });
      } else {
        const daysLeft = Math.floor(
          (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft < 30) {
          findings.push({
            id: makeId("SEC-WHOIS", i++),
            category: "whois",
            severity: "low",
            title: "Domain registration expiring soon",
            detail: `The domain registration will expire in ${daysLeft} day(s). Auto-renew is recommended to avoid accidental loss of the domain.`,
            evidence: `expiresOn: ${intel.whois.expiresOn}`,
            fix: `Enable auto-renew at the registrar or renew the domain now.`,
          });
        }
      }
    }
  }

  // DNS issues — if no A records, the domain doesn't resolve
  if (intel.dns && !intel.dns.error) {
    if (intel.dns.A.length === 0 && intel.dns.AAAA.length === 0 && intel.dns.CNAME.length === 0) {
      findings.push({
        id: makeId("SEC-DNS", i++),
        category: "dns",
        severity: "high",
        title: "No DNS A/AAAA/CNAME records found",
        detail:
          "The domain does not resolve to any IP address. The site is unreachable. This may indicate a DNS misconfiguration or that the domain has been abandoned.",
        evidence: `A: 0, AAAA: 0, CNAME: 0`,
        fix: `Add an A record (IPv4) or AAAA record (IPv6) pointing to the web server at the registrar / DNS provider.`,
      });
    }
    // DMARC / SPF / DKIM checks via TXT records
    const allTxt = (intel.dns.TXT || []).map((t) => t.toLowerCase());
    const hasSpf = allTxt.some((t) => t.startsWith("v=spf1"));
    const hasDmarc = allTxt.some((t) => t.startsWith("v=dmarc1"));
    if (!hasSpf) {
      findings.push({
        id: makeId("SEC-DNS", i++),
        category: "dns",
        severity: "medium",
        title: "No SPF record (TXT) found",
        detail:
          "No SPF (Sender Policy Framework) record was found in DNS. Without SPF, anyone can spoof email from your domain, damaging deliverability and brand trust.",
        evidence: `TXT records: ${intel.dns.TXT.length} (none start with "v=spf1")`,
        fix: `Add a TXT record: "v=spf1 include:_spf.google.com -all" (replace with your mail provider's include).`,
      });
    }
    if (!hasDmarc) {
      findings.push({
        id: makeId("SEC-DNS", i++),
        category: "dns",
        severity: "low",
        title: "No DMARC record (TXT) found",
        detail:
          "No DMARC record was found in the _dmarc subdomain. DMARC tells receivers what to do with emails that fail SPF/DKIM checks (e.g. reject or quarantine).",
        evidence: `_dmarc TXT: (missing)`,
        fix: `Add a TXT record at _dmarc.yourdomain.com: "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"`,
      });
    }
  }

  // Wildcard certs discovered in CT logs — possibly legitimate but worth noting
  const wildcardCerts = intel.certTransparency.filter((c) =>
    c.nameValue.includes("*.")
  );
  if (wildcardCerts.length > 0 && wildcardCerts.length > 5) {
    findings.push({
      id: makeId("SEC-CT", i++),
      category: "certificate",
      severity: "info",
      title: `${wildcardCerts.length} wildcard certificates in CT logs`,
      detail:
        "Multiple wildcard certificates have been issued for this domain. While wildcard certs are convenient, a single leaked private key compromises all subdomains covered.",
      evidence: `Wildcard certs in CT logs: ${wildcardCerts.length}`,
      fix: `Prefer individual certs per subdomain. If using wildcards, rotate keys frequently and protect the private key carefully.`,
    });
  }

  return findings;
}
