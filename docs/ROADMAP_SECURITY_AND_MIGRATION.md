# Ficium — Strategic Roadmap, Security Hardening & Environment Migration Plan

> **Version:** 1.0 | **Date:** June 2026 | **Status:** Planning Document
> **Audience:** Founder, Engineering, Security Reviewers, FSC Compliance
> **Scope:** What to enhance, what to watch, how to build for the future, and how to migrate to UAT and a Disaster Recovery site

---

## How to Read This Document

This is a forward-looking plan, not a description of what exists today. It is divided into four parts:

1. **Part 1 — Enhancements** — concrete improvements to make the platform stronger
2. **Part 2 — Security** — the security posture Ficium must reach before handling real financial data at scale
3. **Part 3 — Future Development** — the bigger strategic build-outs
4. **Part 4 — Environment Migration** — how to move from a single production setup to a proper Production + UAT + Disaster Recovery (DR) architecture

Throughout, items are marked by priority: 🔴 **Critical** · 🟠 **High** · 🟡 **Medium** · 🟢 **Nice-to-have**.

---

---

# PART 1 — WHAT SHOULD BE ENHANCED

---

## 1.1 Immediate Technical Debt (Carry-over from Architecture Review)

These were already flagged and should be cleared before any major new build.

| Item | Priority | Why It Matters |
|---|---|---|
| **Automated tests on maker-checker flow** | 🔴 Critical | This is the core compliance control. A silent break in the Postgres `submit_for_approval → approve_action` functions could let a single bank user approve their own bid — a serious governance failure. Needs pgTAP tests covering enforcement, expiry, and self-approval rejection. |
| **Consolidate the two health-score functions** | 🟠 High | The live UI preview (`calcHealth`) and the saved score (`computeHealthScore`) use different logic and can diverge. A client could see "75" then have "68" saved. Both must call one shared pure function. |
| **Fix `toActionCategory` audit mapping** | 🟠 High | Login/logout events are mis-categorised as `request.submit`. This corrupts audit reporting — a problem for any future regulatory audit. |
| **Error boundary on bid submission** | 🟡 Medium | Currently a failed bid logs to console and the user sees nothing. Surface errors via a toast/error state. |
| **Migrate intelligence cache to React Query** | 🟢 Low | The module-level cache double-fetches in StrictMode and is inconsistent with the rest of the app. |

## 1.2 Product & UX Enhancements

| Enhancement | Priority | Description |
|---|---|---|
| **Real-time bid notifications** | 🟠 High | The dashboard activity feed currently uses mock data. Wire it to Supabase Realtime so clients see bids arrive live without refreshing. |
| **Bid comparison view** | 🟠 High | A side-by-side table comparing all bids on a request (rate, term, total cost, conditions) with a clear "best value" highlight. This is the moment of decision for the client — it deserves a dedicated, polished screen. |
| **Document re-request flow** | 🟡 Medium | Let banks request additional documents from a client mid-bid, with a secure upload channel. The "Pending Docs" stat already exists in the UI but has no backing flow. |
| **Email + push notification system** | 🟠 High | Extend the Resend integration beyond KYC emails to cover: new bid received, bid expiring, request closing, KYC reminders. |
| **Mobile app (Expo/React Native)** | 🟡 Medium | The migration path is already scoped. Backend logic is reused; primary effort is recreating the glassmorphism UI and flip-card animations natively. |
| **Multi-language support** | 🟡 Medium | Mauritius is multilingual (English, French, Kreol). French at minimum will materially widen the addressable market. |

## 1.3 Data & Intelligence Enhancements

| Enhancement | Priority | Description |
|---|---|---|
| **Materialise intelligence views** | 🟠 High | Replace live-computed market views with `pg_cron`-refreshed materialised views once request volume grows. Removes a per-request DB load. |
| **Live market data ingestion** | 🟡 Medium | The Live Data Plan exists (BOM, SEM, bank FX scraping). Implementing it replaces mock market data with real Mauritius figures — a credibility differentiator. |
| **Credit scoring model maturity** | 🟠 High | The current health score is rule-based. Over time, as real repayment/acceptance data accumulates, evolve toward a data-driven scoring model — but only with proper governance and explainability (banks and regulators will demand the latter). |

---

---

# PART 2 — SECURITY (WEB & PLATFORM)

This is the most important section. Ficium handles identity documents, biometric data, and financial profiles. The security bar is not "good for a startup" — it is "defensible to a bank's security team and the FSC."

## 2.1 🔴 CRITICAL — Immediate Remediation

### 2.1.1 Rotate and remove all exposed credentials

Several live secrets have been shared in plaintext during development, including a Google Vision API key, a GitHub personal access token, and AWS IAM credentials. **Every one of these must be treated as compromised and rotated immediately.**

| Credential | Action |
|---|---|
| Google Vision API key (`Ficium_kyc`) | Revoke in Google Cloud Console; issue a new restricted key |
| GitHub personal access token | Revoke in GitHub settings; issue a fine-grained token scoped to the single repo |
| AWS IAM access key (`AWSficium_Rekognition`) | Deactivate and delete the key pair; issue new keys; attach least-privilege policy |
| Supabase service role key | Rotate; this key bypasses all Row Level Security |
| Resend API key | Rotate |
| Anthropic API key | Rotate |

**Rule going forward:** secrets live only in Vercel environment variables and a secrets manager — never in chat, never in committed files, never in client-side code. Add a pre-commit secret scanner (e.g. `gitleaks`) to block accidental commits.

### 2.1.2 Tighten AWS IAM to least privilege

The IAM user currently holds `AmazonRekognitionFullAccess` + `AmazonTextractFullAccess`. Full-access policies are an over-grant. Scope down to only the specific Rekognition actions the pipeline uses: `DetectText`, `DetectFaces`, `CompareFaces`, `DetectLabels`, `SearchFacesByImage`, `IndexFaces`, `CreateFaceLivenessSession`, `GetFaceLivenessSessionResults`, `CreateCollection`. Deny everything else.

### 2.1.3 Strengthen the admin endpoint authentication

`/api/kyc-admin-faces` is protected only by a shared static secret in a header. A shared secret is weak: it can leak, doesn't expire, and gives no per-user accountability. Move admin endpoints behind proper authenticated admin sessions (Supabase Auth + an `admin` role check enforced server-side), and log every admin action to the append-only audit trail.

## 2.2 🟠 HIGH — Web Application Security

### 2.2.1 Content Security Policy (CSP) and security headers

The current `vercel.json` sets caching headers but no security headers. Add:

| Header | Purpose |
|---|---|
| `Content-Security-Policy` | Prevents cross-site scripting (XSS) by controlling which scripts/styles/images can load |
| `Strict-Transport-Security` (HSTS) | Forces HTTPS, prevents downgrade attacks |
| `X-Content-Type-Options: nosniff` | Stops browsers guessing content types |
| `X-Frame-Options: DENY` | Prevents clickjacking via iframes |
| `Referrer-Policy: strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | Restricts access to camera/mic/geolocation to only what KYC needs |

### 2.2.2 Rate limiting and abuse protection

| Surface | Risk | Control |
|---|---|---|
| KYC verify endpoint | Costly AWS calls; abuse drains budget | Per-user rate limit (velocity check exists at 3/24h — enforce at the edge too) |
| AI chat / market / request-builder | Token cost abuse | Per-user and per-IP rate limiting (Upstash Ratelimit or Vercel middleware) |
| Login | Credential stuffing | Lockout after N failed attempts; CAPTCHA on repeated failures |
| Request posting | Spam requests to banks | Require verified KYC (already enforced) + reasonable per-day caps |

### 2.2.3 Input validation everywhere

Client-side Zod validation exists on the KYC form. Server-side validation must mirror it on **every** API route — never trust the client. Validate types, lengths, and ranges before any processing or DB write.

### 2.2.4 File upload hardening

KYC documents are user-uploaded files. Enforce:
- File type allow-list (JPEG, PNG, PDF only) verified by content inspection, not just extension
- Maximum file size limits
- Virus/malware scanning before storage (e.g. via a scanning step or service)
- Stripping EXIF/metadata that could leak location or device data
- Signed, time-limited URLs for all document access (already in use for admin viewing — confirm it's used everywhere)

## 2.3 🟠 HIGH — Data Protection & Privacy

| Area | Requirement |
|---|---|
| **Encryption at rest** | Confirm Supabase storage and database encryption at rest is enabled (it is by default on managed Supabase — document it). |
| **Encryption in transit** | TLS everywhere (enforced by HSTS). |
| **Biometric data handling** | Face data in the Rekognition collection is sensitive personal data. Define a retention policy: how long are faces kept, when are they purged (e.g. on account deletion). Mauritius Data Protection Act compliance is mandatory. |
| **Data minimisation** | Only store what is needed. KYC document images especially — consider whether raw images need long-term retention or only the verification result + audit reference. |
| **Right to erasure** | Build an account deletion flow that purges personal data, including the Rekognition face record (the admin-faces DELETE endpoint is the building block). |
| **PII access logging** | Every time an admin views a client's documents, log it. This is both a security control and a regulatory expectation. |

## 2.4 🟡 MEDIUM — Operational Security

| Control | Description |
|---|---|
| **Dependency scanning** | Automated scanning (Dependabot, Snyk) for vulnerable npm packages. The stack uses bleeding-edge versions (React 19, Vite 8, TS 6) — keep them patched. |
| **Penetration testing** | Before processing real money or signing a bank partner, commission an independent pen test. Banks will ask for the report. |
| **Security monitoring / SIEM** | Centralise logs; alert on anomalies (spike in failed logins, unusual admin activity, KYC abuse). |
| **Incident response plan** | A written, tested runbook: who does what when there's a breach, how clients are notified, regulatory reporting timelines. |
| **Bug bounty / responsible disclosure** | A `security.txt` and a disclosure policy so researchers report issues rather than exploit them. |

## 2.5 Regulatory Security Alignment

Because Ficium intends to operate under the FSC Mauritius framework and partner with licensed banks, the security program should map to recognised standards:

- **ISO 27001** — the information security management baseline banks expect of partners
- **SOC 2 Type II** — increasingly requested by financial institutions before integration
- **PCI DSS** — only if/when card data is ever handled directly (currently Stripe handles this; keep it that way to stay out of scope)
- **Mauritius Data Protection Act 2017** — mandatory; governs all personal and biometric data

Achieving these is a journey, not a launch-day requirement — but architecting toward them now (audit logging, access controls, encryption, least privilege) avoids expensive retrofits later.

---

---

# PART 3 — FUTURE DEVELOPMENT (THINK BIG)

## 3.1 Platform Capabilities

| Capability | Strategic Value |
|---|---|
| **Bank API / direct integration** | The webhook foundation exists. Build out a full bank-facing API so large banks can pull requests and push bids from their own loan origination systems. This is what makes Ficium sticky for enterprise partners. |
| **E-signature & document workflow** | Once a client accepts a bid, the loan agreement process happens off-platform. Bringing e-signature (e.g. via a provider) and document exchange onto Ficium closes the loop and captures more value. |
| **Secondary verticals beyond SME loans** | The platform already supports 9 product types. Focus launch on one vertical (SME loans), then expand deliberately to mortgages and deposits where competition between banks is fiercest. |
| **Financial advisor referral network** | Partner with independent advisors as a referral channel — they bring pre-qualified clients; Ficium gives them tools. |
| **Embedded analytics for banks** | Give banks a dashboard of their win rate, competitiveness, and market position. This is a premium, monetisable feature. |

## 3.2 Intelligence & AI Roadmap

| Initiative | Description |
|---|---|
| **Explainable credit scoring** | As repayment data accumulates, move from rule-based to model-based scoring — but with full explainability. Banks and the FSC will reject black-box models for credit decisions. |
| **Bid recommendation for banks** | Help banks bid competitively by suggesting a rate range based on live market data and their historical win rate (without revealing competitor bids). |
| **Fraud detection maturity** | The KYC pipeline has strong fraud signals. Over time, layer in behavioural signals (device fingerprinting, session anomalies) and a feedback loop from confirmed fraud cases. |
| **AI advisor guardrails** | As the AI advisor scales, add stronger guardrails: it must never guarantee approval, never give regulated financial advice, and always disclaim. Log all advice for review. |

## 3.3 Geographic Expansion

The architecture (Vercel global edge + Supabase) supports multi-region. The expansion sequence:

```
Mauritius (launch + prove model)
      ↓
Indian Ocean (Réunion, Seychelles, Madagascar)
      ↓
East/Southern Africa (where Mauritian banks already operate)
      ↓
Broader African + India corridor (Mauritius as the gateway)
```

Each new jurisdiction brings its own regulator, data residency rules, and KYC requirements — which is precisely why the DR/multi-region work in Part 4 matters.

---

---

# PART 4 — MIGRATION TO UAT AND DR SITE

This is the core operational ask. Today Ficium effectively runs as a single environment. To be production-grade and bank-partner-ready, it needs **three distinct environments** and a **disaster recovery capability**.

## 4.1 Why This Matters

| Problem with a single environment | Consequence |
|---|---|
| Testing happens against production | A bad test can corrupt real client data |
| No safe place to validate releases | Bugs reach real users; banks lose confidence |
| No isolated copy for partner UAT | Banks can't safely test integration before go-live |
| Single region, single provider | One outage (or region failure) takes the whole platform down |
| No proven recovery procedure | A disaster means improvised, slow, error-prone recovery |

## 4.2 Target Environment Topology

```
┌──────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT (DEV)                          │
│  Purpose: day-to-day coding, local + preview deploys               │
│  Data: synthetic/seed data only — never real PII                   │
│  Vercel: preview deployments per branch                            │
│  Supabase: dev project (separate)                                  │
└──────────────────────────────────────────────────────────────────┘
                              ↓ promote
┌──────────────────────────────────────────────────────────────────┐
│                  USER ACCEPTANCE TESTING (UAT)                     │
│  Purpose: pre-production validation; bank partner integration test │
│  Data: realistic but anonymised/masked data — no real client PII   │
│  Vercel: dedicated UAT project (uat.ficium.net)                    │
│  Supabase: UAT project — schema-identical to production            │
│  Access: restricted to internal team + invited bank testers       │
└──────────────────────────────────────────────────────────────────┘
                              ↓ promote (approved release)
┌──────────────────────────────────────────────────────────────────┐
│                      PRODUCTION (PROD)                             │
│  Purpose: live platform serving real clients and banks             │
│  Data: real, encrypted, access-controlled                          │
│  Vercel: production project (ficium.net)                           │
│  Supabase: production project (primary region, e.g. ap-south-1)    │
└──────────────────────────────────────────────────────────────────┘
                              ↓ continuous replication
┌──────────────────────────────────────────────────────────────────┐
│              DISASTER RECOVERY (DR) — Warm Standby                 │
│  Purpose: take over if the primary region/provider fails           │
│  Data: continuously replicated from production                     │
│  Region: a different region from primary (e.g. eu-west / af-south) │
│  State: kept in sync, ready to promote within RTO                  │
└──────────────────────────────────────────────────────────────────┘
```

## 4.3 Defining the Recovery Targets (RTO & RPO)

Before building DR, agree on two numbers. These drive every design decision.

| Term | Plain English | Recommended Target (Launch) | Recommended Target (Bank-grade) |
|---|---|---|---|
| **RTO** (Recovery Time Objective) | How long can the platform be down before we must be back up? | ≤ 4 hours | ≤ 1 hour |
| **RPO** (Recovery Point Objective) | How much data can we afford to lose (measured in time)? | ≤ 1 hour | ≤ 5 minutes |

A tighter RTO/RPO costs more (warm/hot standby, continuous replication). Start at the launch target and tighten as bank partnerships demand it.

## 4.4 How to Achieve UAT

### Step 1 — Provision a separate UAT Supabase project
- Create a new Supabase project dedicated to UAT (not a branch of prod — a real, isolated project).
- It must be **schema-identical** to production. Achieve this with versioned, repeatable migrations.

### Step 2 — Adopt database migrations as the source of truth
The repo already has a `supabase/migrations` folder. Formalise this:
- Every schema change is a numbered, committed migration file.
- Migrations are applied to DEV → UAT → PROD in that order, never by hand.
- This guarantees all three environments stay structurally identical.

```
supabase/migrations/  →  applied via CI to each environment in sequence
   0001_init.sql
   0002_kyc_columns.sql
   0003_maker_checker.sql
   ...
```

### Step 3 — Seed UAT with anonymised data
- Never copy raw production PII into UAT.
- Build a **data masking script** that takes a production snapshot and replaces names, emails, document numbers, addresses, and face images with synthetic equivalents — preserving shape and volume for realistic testing.
- For bank integration testing, provide a set of fixed test personas.

### Step 4 — Separate Vercel project + environment variables
- Create a dedicated Vercel project (or a UAT environment within the project) bound to `uat.ficium.net`.
- Each environment gets its **own** set of secrets: separate Supabase keys, a separate AWS IAM user/collection, separate Resend domain, separate Anthropic key (or usage tracking). This prevents UAT activity from touching production data or quotas.
- A separate Rekognition face collection (`ficium-kyc-faces-uat`) so UAT faces never mix with production.

### Step 5 — CI/CD promotion pipeline
```
Developer merges to `main`
        ↓
CI runs: lint → type-check → automated tests → build
        ↓
Auto-deploy to UAT (uat.ficium.net)
        ↓
Apply pending migrations to UAT database
        ↓
Run smoke tests + manual/partner UAT sign-off
        ↓
Manual approval gate (release manager)
        ↓
Apply migrations to PROD → Promote build to PROD (ficium.net)
        ↓
Post-deploy smoke tests + monitoring watch
```

### Step 6 — Access control for UAT
- UAT is not public. Protect it (Vercel password protection, IP allow-list, or an auth gate).
- Invite bank partners with scoped test accounts so they can validate integration without seeing internal data.

## 4.5 How to Achieve the DR Site

A disaster is any event that makes the primary production environment unavailable: a region outage, a provider incident, data corruption, or a security event. DR is the ability to keep operating despite it.

### Choose a DR strategy (cost vs. recovery speed)

| Strategy | How It Works | RTO | Cost | Recommendation |
|---|---|---|---|---|
| **Backup & Restore** | Regular backups; restore on failure | Hours–days | $ | Minimum baseline only |
| **Pilot Light** | Core data replicated; minimal standby; scale up on failover | ~1–4 hrs | $$ | Good launch choice |
| **Warm Standby** | Scaled-down full copy always running; scale up on failover | Minutes–1 hr | $$$ | Target for bank-grade |
| **Hot Standby / Active-Active** | Full duplicate serving traffic; instant failover | Seconds | $$$$ | Only at large scale |

**Recommended path:** start at **Pilot Light**, move to **Warm Standby** as bank partnerships and volume justify it. Avoid active-active multi-region *writes* until truly necessary — distributed write transactions are extremely hard and the Scaling Guide rightly warns against premature adoption.

### DR Building Blocks

**1. Database replication & backups (the heart of DR)**
- Enable **Point-in-Time Recovery (PITR)** on the production Supabase project — this alone gives a strong RPO by letting you restore to any moment.
- Configure a **read replica in a different region** (Supabase Team plan supports this). The replica is the DR data copy.
- Automated daily backups, stored encrypted, in a separate region, with periodic restore drills (a backup you've never restored is not a backup).

**2. Storage replication**
- KYC documents in Supabase Storage must be replicated to the DR region (or an independent backup bucket) on the same schedule.

**3. Frontend & API (stateless — easy part)**
- Vercel already deploys globally to its edge network, so the frontend and serverless functions are inherently multi-region and resilient. The hard part of DR is always the data, not the stateless compute.

**4. DNS failover**
- Use a DNS provider with health checks (the domain is on Namecheap; consider a DNS layer like Cloudflare for health-check-based failover). On primary failure, DNS redirects `ficium.net` to the DR endpoint.

**5. Configuration & secrets**
- DR environment variables (pointing at the DR database/region) are pre-staged so failover doesn't require manual secret entry under pressure.

### DR Failover Flowchart

```
Primary production healthy → normal operation
        ↓
Continuous replication: PROD primary DB → DR replica (different region)
Continuous backup: Storage + PITR enabled
        ↓
        ┌─────────────── MONITORING ───────────────┐
        │ Health checks on API, DB, region status   │
        └───────────────────────────────────────────┘
        ↓
   Disaster detected (region down / DB unreachable / corruption)
        ↓
   Declare incident → invoke DR runbook
        ↓
   Promote DR read replica to primary (read-write)
        ↓
   Repoint API environment variables to DR database
        ↓
   DNS health check redirects ficium.net → DR endpoint
        ↓
   Smoke test critical paths (login, KYC status, marketplace, bids)
        ↓
   Service restored on DR site (within RTO)
        ↓
   ── Later, when primary region recovers ──
        ↓
   Reconcile data → fail back to primary during a planned window
```

### DR Testing Discipline
A DR plan that has never been tested will fail when needed. Mandate:
- **Quarterly DR drills** — actually fail over to DR in a controlled window and measure real RTO/RPO against targets.
- **Restore drills** — regularly restore a backup to a scratch environment to confirm backups are valid.
- **Runbook upkeep** — every drill updates the written runbook with what was learned.

## 4.6 Migration Sequencing (Recommended Order)

```
Phase 0 (now):   🔴 Rotate all exposed credentials + add secret scanning
                 🔴 Add maker-checker automated tests
                 🟠 Add security headers (CSP, HSTS, etc.)
                       ↓
Phase 1:         Formalise migrations as single source of truth (DEV→UAT→PROD)
                 Stand up isolated DEV project with seed data
                       ↓
Phase 2:         Provision UAT (separate Supabase + Vercel + scoped secrets)
                 Build data-masking/seed pipeline
                 Wire CI/CD promotion pipeline with approval gate
                       ↓
Phase 3:         Enable PROD hardening: PITR, automated encrypted backups,
                 PII access logging, rate limiting, least-privilege IAM
                       ↓
Phase 4:         Stand up DR (Pilot Light): cross-region read replica +
                 storage replication + pre-staged DR config + DNS failover
                       ↓
Phase 5:         First DR drill → measure RTO/RPO → tighten toward Warm Standby
                 as bank partnerships require
                       ↓
Ongoing:         Quarterly DR drills · dependency scanning · pen test before
                 first bank go-live · pursue ISO 27001 / SOC 2 alignment
```

## 4.7 Environment Comparison Summary

| Dimension | DEV | UAT | PROD | DR |
|---|---|---|---|---|
| **Purpose** | Build & experiment | Validate & partner-test | Serve real users | Survive disaster |
| **Data** | Synthetic seed | Anonymised/masked | Real (encrypted) | Replica of PROD |
| **Domain** | preview URLs | uat.ficium.net | ficium.net | failover endpoint |
| **Supabase** | Dev project | UAT project | Prod (primary region) | Replica (other region) |
| **AWS collection** | dev | -uat | -prod | replicated |
| **Secrets** | Dev keys | UAT keys | Prod keys | Pre-staged DR keys |
| **Access** | Engineers | Internal + invited banks | Public | Internal (until failover) |
| **Who can deploy** | Anyone | CI auto | Approval gate only | Failover runbook only |

---

## Closing Note

The fastest way to lose a bank partnership is a security incident or an unrecoverable outage. The work in Parts 2 and 4 is not glamorous, but it is what turns Ficium from a working product into a platform a regulated financial institution will trust with its name and its customers. The good news: the foundations (schema isolation, maker-checker, append-only audit, global edge deployment) are already the hard parts to retrofit — and they're in place. The remaining work is largely additive and can be sequenced as above without rewriting what exists.

---

*This is a living planning document. Revisit at each milestone and after every DR drill, pen test, and regulatory review.*
