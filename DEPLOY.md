# KODAND — Cloudflare Pages Deployment Guide

This guide walks you through deploying KODAND to Cloudflare Pages from start to finish.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js 18+** | Required by the build |
| **bun** (or npm/pnpm) | Package manager used by this project |
| **A GitHub/GitLab account** | For the Git-connected dashboard deploy (recommended) |
| **A Cloudflare account** | Free tier works — [sign up here](https://dash.cloudflare.com/sign-up) |
| **wrangler CLI** | Install via `npm install -g wrangler` (for CLI deploy) |

---

## Method 1 — Git-Connected Dashboard Deploy (Recommended)

This is the easiest method. Cloudflare Pages watches your Git repo and auto-deploys on every push.

### Step 1 — Push your code to GitHub

```bash
# Initialize git (if not already)
git init
git add -A
git commit -m "KODAND — initial commit"

# Create a repo on GitHub, then push
git remote add origin https://github.com/YOUR_USERNAME/kodand.git
git branch -M main
git push -u origin main
```

### Step 2 — Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Select your GitHub/GitLab account and find the `kodand` repository
3. Click **Begin setup**

### Step 3 — Configure Build Settings

| Setting | Value |
|---|---|
| **Framework preset** | Next.js (Static HTML Export) or None |
| **Build command** | `npx @cloudflare/next-on-pages@1` |
| **Build output directory** | `.vercel/output/static` |
| **Root directory** | `/` (leave empty) |

### Step 4 — Add Environment Variables

Under **Environment variables (advanced)**, add:

| Variable | Value | Notes |
|---|---|---|
| `NODE_VERSION` | `20` | Cloudflare Pages default may be older |
| `SKIP_DEPENDENCY_INSTALL` | `false` | |
| `NEXT_ON_PAGES_BACKENDS` | `true` | Enable API route support |

> **Important:** The `/api/scan` endpoint uses Server-Sent Events (SSE) with Node.js built-in modules (`dns`, `tls`). Cloudflare Workers have a different runtime — see **API Route Notes** below.

### Step 5 — Deploy

Click **Save and Deploy**. Cloudflare will:
1. Clone your repo
2. Run `npx @cloudflare/next-on-pages@1`
3. Deploy the output to Cloudflare's global edge network

Your site will be live at `https://kodand.pages.dev` within 2–5 minutes.

### Step 6 — Custom Domain (Optional)

1. Go to your Pages project → **Custom domains** → **Set up a custom domain**
2. Enter your domain (e.g. `kodand.yourdomain.com`)
3. Add the CNAME record Cloudflare shows you to your DNS provider
4. Cloudflare auto-provisions SSL

---

## Method 2 — CLI Deploy with Wrangler

Use this if you don't want Git integration or need more control.

### Step 1 — Install wrangler

```bash
npm install -g wrangler
wrangler login   # opens browser to authenticate
```

### Step 2 — Install the Cloudflare Pages adapter

```bash
cd kodand
bun add -D @cloudflare/next-on-pages
```

### Step 3 — Build for Cloudflare

```bash
npx @cloudflare/next-on-pages@1
```

This creates a `.vercel/output/static` directory compatible with Cloudflare Pages.

### Step 4 — Deploy

```bash
wrangler pages deploy .vercel/output/static --project-name kodand
```

First deploy will prompt you to create the project. Subsequent deploys just update it.

### Step 5 — View your site

```bash
wrangler pages deployment list --project-name kodand
```

Or visit `https://kodand.pages.dev` directly.

---

## API Route Notes (Important)

KODAND's `/api/scan` endpoint uses **Server-Sent Events (SSE)** and Node.js built-in modules (`dns`, `tls`, `node:dns`, `node:tls`) to perform:

- DNS lookups (A, AAAA, MX, NS, TXT records)
- TLS certificate inspection
- NVD CVE API queries
- RDAP WHOIS lookups
- crt.sh certificate transparency searches

### Cloudflare Workers Runtime Limitations

Cloudflare Workers run on V8 (not Node.js), so:

| Feature | Status on Cloudflare Workers | KODAND Impact |
|---|---|---|
| `node:dns` module | ❌ Not available | DNS record lookups will fail |
| `node:tls` module | ❌ Not available | TLS cert inspection will fail |
| `fetch()` | ✅ Available | NVD CVE + RDAP + crt.sh work fine |
| SSE streaming | ⚠️ Limited | Cloudflare Workers don't support long-lived SSE connections natively |

### Recommended Solutions

**Option A — Deploy frontend only, use an external API (Recommended)**

Deploy the frontend (lock screen, dashboard, PDF generation) to Cloudflare Pages, and run the `/api/scan` endpoint on a separate Node.js host (Fly.io, Railway, Render, a VPS).

```bash
# In the frontend, point API requests to your external host:
# src/app/page.tsx — change the fetch URL:
#   fetch("/api/scan", ...) → fetch("https://api.yourdomain.com/scan", ...)
```

**Option B — Use Cloudflare Workers with nodejs_compat flag**

Cloudflare Workers now support limited Node.js compatibility:

1. In `wrangler.toml` (or Pages dashboard), enable:
   ```toml
   compatibility_flags = ["nodejs_compat"]
   ```

2. The `fetch()`-based intel sources (NVD, RDAP, crt.sh) will work.
3. For DNS records, replace `node:dns` with Cloudflare's DNS over HTTPS:
   ```typescript
   // Replace Node dns with DNS-over-HTTPS (works on Cloudflare Workers)
   const dnsResponse = await fetch(
     `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
     { headers: { Accept: "application/dns-json" } }
   );
   ```

4. For TLS certificate inspection, use a third-party API (e.g. SSL Labs API).

**Option C — Deploy on a Node.js platform instead**

If you need full API route support, deploy on a platform that runs Node.js natively:
- **Vercel** (recommended for Next.js)
- **Railway** (simple, affordable)
- **Fly.io** (global edge, Docker-based)
- **Render** (free tier available)
- **A VPS** (DigitalOcean, Hetzner) with PM2

See the **Alternative Deployments** section below.

---

## Build Configuration

### next.config.ts

The project is pre-configured with:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};
export default nextConfig;
```

For Cloudflare Pages, you may need to add:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  // For Cloudflare Pages compatibility:
  experimental: {
    runtime: "edge",  // if using edge runtime for API routes
  },
};
```

### wrangler.toml (for CLI deploys)

Create `wrangler.toml` in the project root:

```toml
name = "kodand"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

---

## Alternative Deployments (if Cloudflare is too limiting)

### Vercel (Easiest — Recommended for Next.js)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Vercel runs Node.js natively — all API routes, SSE, `node:dns`, `node:tls` work out of the box. Free tier covers 100GB bandwidth.

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

Add a `railway.json` or use the Nixpacks builder. Railway runs full Node.js.

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Launch
fly launch
fly deploy
```

### Docker / VPS

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", ".next/standalone/server.js"]
```

```bash
docker build -t kodand .
docker run -p 3000:3000 kodand
```

---

## Environment Variables

KODAND is designed to be **completely anonymous** — no environment variables are required for the core app. However, if you want to add optional features:

| Variable | Purpose | Required? |
|---|---|---|
| `ZAI_API_KEY` | If you want to use z-ai-web-dev-sdk with a key | No (uses default) |
| `DATABASE_URL` | If you add Prisma database persistence | No (app is localStorage-based) |

---

## Post-Deploy Verification

After deploying, verify:

1. **Lock target screen loads** — enter a URL and click "Lock Target"
2. **Dashboard renders** — mode tabs, sidebar, activity panel appear
3. **Scan runs** — click a mode tab → "Run [mode] scan" → scan completes with score
4. **PDF downloads** — click "PDF" on a completed scan → PDF downloads
5. **localStorage persists** — refresh the page, your target domain + history remain

### Common Issues

| Issue | Fix |
|---|---|
| Build fails on Cloudflare | Ensure `NODE_VERSION=20` env var is set |
| API route 404 | Cloudflare Pages needs `@cloudflare/next-on-pages` adapter |
| DNS/TLS scan fails | Cloudflare Workers don't support `node:dns`/`node:tls` — use external API |
| SSE connection drops | Cloudflare Workers have a 30s CPU limit — enable heartbeats (already implemented) |
| PDF generation fails | PDF is generated client-side via jsPDF — works everywhere |

---

## Project Structure

```
kodand/
├── src/
│   ├── app/
│   │   ├── api/scan/route.ts     # SSE scan endpoint (Node.js required)
│   │   ├── globals.css           # Theme + animations
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Dashboard UI (client component)
│   ├── components/
│   │   ├── kodand-logo.tsx       # Logo component (transparent PNG)
│   │   └── ui/                   # shadcn/ui components
│   └── lib/
│       ├── audit-types.ts        # Shared types
│       ├── content-metrics.ts    # Readability/tone/keyword metrics
│       ├── domain-intel.ts       # CVE/WHOIS/DNS/TLS/CT intel
│       ├── pdf-report.ts         # Client-side PDF generation (jsPDF)
│       ├── scan-cache.ts         # In-memory cache + rate limiting
│       └── scan-history.ts       # localStorage hooks
├── public/
│   └── kodand-logo.png           # Transparent logo
├── next.config.ts
├── package.json
└── tailwind.config.ts
```

---

## Support

- **Project**: KODAND — 360° Anonymous Website Audit
- **Tech**: Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, jsPDF, z-ai-web-dev-sdk
- **Data sources**: NVD CVE, RDAP WHOIS, DNS, TLS, crt.sh (all free, no API keys)
- **Privacy**: All data stays in the browser (localStorage). No server-side storage.
