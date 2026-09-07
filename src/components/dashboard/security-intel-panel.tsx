"use client";

import * as React from "react";
import {
  CertificateInfo,
  CertTransparencyEntry,
  CveFinding,
  DnsRecords,
  SecurityDimension,
  WhoisRecord,
} from "@/lib/audit-types";
import {
  AlertTriangle,
  Bug,
  Cpu,
  Database,
  ExternalLink,
  ListTree,
  Network,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { severityStyle } from "./score-gauge";
import { FindingsList, securityItem } from "./findings-table";

export function IntelCard({ icon: I, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 mb-2 text-xs">
        <I className="size-3.5 text-emerald-300" />
        <span className="font-bold text-emerald-200">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, accent = "border-emerald-500/20" }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className={`px-2.5 py-2 rounded-lg border bg-emerald-950/20 ${accent}`}>
      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider truncate">{label}</div>
      <div className="text-sm font-bold text-emerald-200 truncate">{value}</div>
    </div>
  );
}

export function InfoRow({ k, v, breakAll = false }: { k: string; v?: string | null; breakAll?: boolean }) {
  if (!v) return null;
  return (
    <div className="flex gap-2 text-[11px]">
      <span className="text-muted-foreground w-20 flex-shrink-0">{k}:</span>
      <span className={`text-foreground/90 ${breakAll ? "break-all" : "truncate"}`}>{v}</span>
    </div>
  );
}

export function CveCard({ cve }: { cve: CveFinding }) {
  const sev = severityStyle(cve.severity);
  const nvdUrl = cve.referenceUrls[0] || `https://nvd.nist.gov/vuln/detail/${cve.cveId}`;
  return (
    <div className={`rounded-lg border ${sev.border} bg-card/40 p-3`}>
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bug className={`size-3.5 ${sev.text} flex-shrink-0`} />
          <a href={nvdUrl} target="_blank" rel="noreferrer" className="font-mono font-bold text-xs hover:underline truncate">
            {cve.cveId}
          </a>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${sev.pill}`}>{cve.severity}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-200 border border-emerald-500/30">
            CVSS {cve.cvssScore}
          </span>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground mb-1 font-mono">
        Product: <span className="text-foreground">{cve.product}{cve.version ? ` ${cve.version}` : ""}</span>
      </div>
      <p className="text-xs text-foreground/80 line-clamp-2 mb-1.5">{cve.description}</p>
      <a href={nvdUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-emerald-300 hover:text-emerald-200 underline">
        <ExternalLink className="size-3" /> NVD detail
      </a>
    </div>
  );
}

export function WhoisCard({ whois }: { whois: WhoisRecord }) {
  if (whois.error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
        <Database className="size-3 inline mr-1" />
        WHOIS error: {whois.error}
      </div>
    );
  }
  return (
    <IntelCard icon={Database} title="RDAP / WHOIS">
      <div className="space-y-0.5">
        <InfoRow k="Registrar" v={whois.registrar} />
        <InfoRow k="Registrant" v={whois.registrantOrg} />
        <InfoRow k="Country" v={whois.registrantCountry} />
        <InfoRow k="Registered" v={whois.registeredOn} />
        <InfoRow k="Expires" v={whois.expiresOn} />
        <InfoRow k="Updated" v={whois.updatedOn} />
      </div>
      {whois.nameservers.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] text-muted-foreground font-mono uppercase mb-0.5">Nameservers ({whois.nameservers.length})</div>
          <div className="text-[10px] font-mono text-foreground/80 break-all">{whois.nameservers.join(" · ")}</div>
        </div>
      )}
      {whois.statuses.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {whois.statuses.map((s, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
              {s}
            </span>
          ))}
        </div>
      )}
    </IntelCard>
  );
}

export function DnsCard({ dns }: { dns: DnsRecords }) {
  if (dns.error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
        <Network className="size-3 inline mr-1" />
        DNS error: {dns.error}
      </div>
    );
  }
  const sections: [string, string[]][] = [
    ["A", dns.A],
    ["AAAA", dns.AAAA],
    ["MX", dns.MX],
    ["NS", dns.NS],
    ["TXT", dns.TXT],
    ["CNAME", dns.CNAME],
  ];
  return (
    <IntelCard icon={Network} title="DNS Records">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {sections.map(([t, records]) => (
          <div key={t} className="rounded border border-emerald-500/15 bg-emerald-950/20 p-2">
            <div className="text-[10px] font-mono uppercase text-emerald-300 mb-1">{t} ({records.length})</div>
            {records.length === 0 ? (
              <div className="text-[10px] text-muted-foreground italic">none</div>
            ) : (
              <ul className="space-y-0.5 text-[10px] font-mono text-foreground/80 break-all">
                {records.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </IntelCard>
  );
}

export function TlsCard({ cert }: { cert: CertificateInfo }) {
  if (cert.error) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
        <ShieldCheck className="size-3 inline mr-1" />
        TLS error: {cert.error}
      </div>
    );
  }
  const status = cert.isExpired ? "EXPIRED" : cert.isExpiringSoon ? "EXPIRING SOON" : cert.selfSigned ? "SELF-SIGNED" : "VALID";
  const statusCls = cert.isExpired
    ? "bg-red-500/20 text-red-200 border-red-500/40"
    : cert.isExpiringSoon || cert.selfSigned
    ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
    : "bg-emerald-500/20 text-emerald-200 border-emerald-500/40";
  return (
    <IntelCard icon={ShieldCheck} title="TLS Certificate">
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusCls}`}>{status}</span>
        {cert.selfSigned && (
          <span className="text-[10px] text-amber-300 flex items-center gap-1">
            <AlertTriangle className="size-3" /> self-signed
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <InfoRow k="Issuer" v={cert.issuer} breakAll />
        <InfoRow k="Subject" v={cert.subject} breakAll />
        <InfoRow k="Valid from" v={cert.validFrom} />
        <InfoRow k="Valid to" v={cert.validTo} />
        <InfoRow k="Key" v={cert.keyAlgorithm && cert.keyBits ? `${cert.keyAlgorithm} · ${cert.keyBits} bits` : undefined} />
        <InfoRow k="SAN entries" v={String(cert.san.length)} />
      </div>
    </IntelCard>
  );
}

export function CtCard({ entries, subdomains }: { entries: CertTransparencyEntry[]; subdomains: string[] }) {
  return (
    <IntelCard icon={ListTree} title={`Certificate Transparency (${entries.length})`}>
      {subdomains.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] font-mono uppercase text-emerald-300 mb-1">Discovered subdomains ({subdomains.length})</div>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto kodand-chat-scroll">
            {subdomains.map((s) => (
              <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {entries.length > 0 && (
        <div className="space-y-0.5 max-h-40 overflow-y-auto kodand-chat-scroll">
          {entries.slice(0, 15).map((e) => (
            <div key={e.id} className="text-[10px] font-mono text-muted-foreground border-l-2 border-emerald-500/30 pl-1.5">
              <div className="text-foreground/80 truncate">{e.commonName}</div>
              <div className="text-[9px]">{e.notBefore} → {e.notAfter}</div>
            </div>
          ))}
        </div>
      )}
      {entries.length === 0 && subdomains.length === 0 && (
        <div className="text-[10px] text-muted-foreground italic">No CT log entries found.</div>
      )}
    </IntelCard>
  );
}

export function HeadersTable({ headers }: { headers: Record<string, string | null> }) {
  const entries = Object.entries(headers);
  const securityHeaders = [
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
  ];
  if (entries.length === 0) return null;
  return (
    <IntelCard icon={Server} title="HTTP Headers">
      <div className="space-y-0.5 max-h-48 overflow-y-auto kodand-chat-scroll">
        {entries.map(([k, v]) => {
          const missing = v === null;
          const isSec = securityHeaders.includes(k.toLowerCase());
          return (
            <div
              key={k}
              className={`flex items-start gap-2 text-[10px] p-1.5 rounded ${missing && isSec ? "bg-red-500/10 border border-red-500/30" : "bg-emerald-950/20"}`}
            >
              <span className="font-mono text-muted-foreground flex-shrink-0">{k}:</span>
              <span className={`font-mono break-all ${missing ? "text-red-300 italic" : "text-foreground/80"}`}>
                {missing ? "MISSING" : (v as string).slice(0, 120)}
              </span>
              {missing && isSec && <XCircle className="size-3 text-red-400 ml-auto flex-shrink-0 mt-0.5" />}
            </div>
          );
        })}
      </div>
    </IntelCard>
  );
}

export function SecurityIntelDashboard({ dim }: { dim: SecurityDimension }) {
  const intel = dim.intel;
  const dnsCount = intel?.dns
    ? intel.dns.A.length + intel.dns.AAAA.length + intel.dns.MX.length + intel.dns.NS.length
    : 0;
  return (
    <div className="space-y-3">
      {dim.summary && <p className="text-xs text-foreground/80 italic">{dim.summary}</p>}
      {intel && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          <Stat label="CVEs" value={intel.cveFindings.length} accent="border-rose-500/30" />
          <Stat label="WHOIS" value={intel.whois?.error ? "err" : "ok"} accent="border-emerald-500/30" />
          <Stat label="DNS records" value={dnsCount} accent="border-emerald-500/30" />
          <Stat
            label="TLS cert"
            value={intel.certificate?.isExpired ? "exp" : intel.certificate?.isExpiringSoon ? "soon" : "ok"}
            accent="border-emerald-500/30"
          />
          <Stat label="CT entries" value={intel.certTransparency.length} accent="border-emerald-500/30" />
          <Stat label="Subdomains" value={intel.discoveredSubdomains.length} accent="border-emerald-500/30" />
        </div>
      )}
      {intel && intel.detectedProducts.length > 0 && (
        <IntelCard icon={Cpu} title={`Detected software (${intel.detectedProducts.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {intel.detectedProducts.map((p, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-200"
              >
                {p.name}
                {p.version ? ` ${p.version}` : ""} <span className="text-muted-foreground">({p.source})</span>
              </span>
            ))}
          </div>
        </IntelCard>
      )}
      {intel && intel.cveFindings.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase text-rose-300 mb-1.5 flex items-center gap-1.5">
            <Bug className="size-3" /> NVD CVE Deep Scan · {intel.cveFindings.length}
          </div>
          <div className="space-y-1.5">
            {intel.cveFindings.map((c) => (
              <CveCard key={c.id} cve={c} />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {intel?.whois && <WhoisCard whois={intel.whois} />}
        {intel?.dns && <DnsCard dns={intel.dns} />}
      </div>
      {intel?.certificate && <TlsCard cert={intel.certificate} />}
      {intel && (intel.certTransparency.length > 0 || intel.discoveredSubdomains.length > 0) && (
        <CtCard entries={intel.certTransparency} subdomains={intel.discoveredSubdomains} />
      )}
      <HeadersTable headers={dim.headers} />
      <FindingsList items={dim.findings.map(securityItem)} defaultOpenCount={2} />
    </div>
  );
}
