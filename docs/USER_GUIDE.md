# Ficium — User Guide

_For individuals and financial institutions using the Ficium platform._

---

## For Individuals

### What is Ficium?

Ficium flips the traditional banking relationship. Instead of you going to multiple banks and begging for a loan, you post one request on Ficium and licensed Mauritian banks compete with their best offers. You compare them side by side and pick the winner.

It's free for you. Banks pay to participate — not you.

---

### Getting started

#### 1. Create your account

Go to [ficium.vercel.app/register](https://ficium.vercel.app/register) and choose **Individual** or **Business**.

You'll need:
- A valid email address
- A password (minimum 8 characters)

#### 2. Verify your identity (KYC)

Before banks can see your requests, you need to verify your identity. This is a legal requirement and takes 2–5 minutes.

You'll need:
- A national ID card or passport
- A selfie (taken live in the app)

Your identity is verified by our secure KYC system. Banks never see your ID or selfie — only your financial indicators.

**KYC statuses:**
- **Pending** — your submission is being reviewed
- **Verified** — you're cleared to post requests
- **Rejected** — please contact support at hello@ficium.mu

#### 3. Complete your financial profile

Your financial profile (dossier) is what banks use to assess your requests. Fill it out once and it applies to all your future requests.

The dossier covers:
- Employment status and income
- Assets (savings, property, investments, vehicles)
- Existing loans and repayments
- Compliance declarations (source of wealth, tax residency, PEP status)

As you fill it out, you'll see a live **health score** (0–100). A higher score means more competitive bids.

Your profile is **anonymised** — banks see your income range and scores, never your name or contact details.

---

### Posting a request

1. Tap **New Request** from your dashboard or the requests page
2. Choose your product type (Personal Loan, Mortgage, Fixed Deposit, etc.)
3. Set the amount and preferred term
4. Describe your purpose (briefly — this helps banks tailor their offer)
5. Optionally set a maximum rate you're willing to accept
6. Review and submit

Your request is live immediately. Banks can start bidding within minutes.

**Product types available:**

| Product | Min amount | Max amount | Notes |
|---|---|---|---|
| Personal Loan | Rs 50,000 | Rs 2,000,000 | 12–84 months |
| SME Loan | Rs 200,000 | Rs 10,000,000 | For registered businesses |
| Mortgage | Rs 500,000 | Rs 20,000,000 | 5–30 years |
| Fixed Deposit | Rs 50,000 | Rs 10,000,000 | 3–60 months |
| Investment | Rs 100,000 | Rs 10,000,000 | Managed portfolios |
| Business Loan | Rs 500,000 | Rs 50,000,000 | Corporate credit |
| Credit Card | Rs 10,000 | Rs 500,000 | Compare card offers |
| Vehicle Leasing | Rs 100,000 | Rs 5,000,000 | 12–60 months |
| Overdraft | Rs 20,000 | Rs 2,000,000 | Revolving credit |

---

### Reviewing and accepting bids

When a bank places a bid on your request, you'll receive a notification.

From your request detail page, you can:
- See all bids ranked by rate (lowest first)
- Compare rate, term, amount offered, and conditions side by side
- Chat with a bank directly to ask questions
- Accept the bid you want

When you accept a bid:
- Your request is closed
- The bank is notified immediately
- Ficium handles the introduction — the bank contacts you to complete the process

**You are never obligated to accept any bid.** If no offer suits you, simply let the request expire.

---

### Understanding your scores

Your dashboard shows three key scores:

**Health Score (0–100)**
A composite measure of your financial fitness. Banks use this to assess how attractive your request is. Improve it by:
- Completing your financial profile
- Reducing existing debt
- Demonstrating stable income

**Risk Score (0–100)**
Lower is better. Driven by debt-to-income ratio, compliance flags, and employment stability.

**Affordability Score (0–100)**
How much of your income is available for new commitments. Driven by your DTI ratio and net worth.

---

### Financial tools

Ficium includes several tools to help you understand and improve your financial position:

- **AI Financial Coach** (`/advisor`) — ask questions in plain language, get personalised answers based on your actual numbers
- **Financial Health** (`/health`) — detailed breakdown of your financial health metrics
- **Net Worth Tracker** (`/networth`) — track assets and liabilities over time
- **Markets** (`/markets`) — live market data: SEMDEX, FX rates, current lending/deposit rates
- **Goals** (`/goals`) — set and track financial goals (house, car, education, retirement)
- **Journeys** (`/journeys`) — guided step-by-step financial planning

---

### Privacy and security

- Your name, email, NIC, and address are **never visible to banks**
- Banks see only anonymised financial indicators (income range, score, request details)
- Your data is encrypted at rest and in transit
- We do not sell your data to any third party
- You can request deletion of your account at any time: hello@ficium.mu

---

## For Financial Institutions

### What is Ficium for institutions?

Ficium gives you access to a live feed of pre-screened, KYC-verified clients who are actively seeking the financial products you offer. Instead of cold outreach, you receive warm qualified leads and compete for them with your best offer.

Ficium is FSC-compliant. All activity goes through our maker-checker approval workflow.

---

### Registration and onboarding

1. Register at `/register/institution`
2. Provide your institution details, FSC license number, and regulatory body
3. Complete compliance onboarding (documents, AML/KYC policy acknowledgement)
4. Await platform approval from Ficium admin (typically 1–3 business days)
5. Set up your team members and products

---

### The institution portal

After approval, your team accesses the institution portal at `/institution`.

**Dashboard** — KPI overview: marketplace value, open opportunities, pending approvals, bid win rate, response time.

**Marketplace** — Live feed of open client requests. Each card shows:
- Product type and amount
- Client's anonymous financial profile (income range, health score, risk score)
- Time remaining in bid window
- Live market intelligence (average rates, winning bid patterns)

**Bids** — All bids your institution has placed, with status and response tracking.

**Approvals** — Maker-checker queue. All bids require a second admin to approve before submission.

**Products** — Your product catalogue and rate configurations.

**Audit** — Full audit trail of all institution actions.

**Settings** — Institution profile, member management, webhooks.

---

### Placing a bid

1. Browse the marketplace and open a request that matches your criteria
2. Review the client's anonymised financial profile
3. Click **Place Bid**
4. Enter your rate, amount, term, and any conditions
5. Submit — the bid enters the **Approvals** queue

A second admin (checker) must approve the bid in the Approvals section. The checker cannot be the same person as the maker. This is a compliance requirement.

Once approved, the bid is live and visible to the client.

**Best practices:**
- Respond within 24 hours — first-bid advantage matters
- Competitive rates win, but clients also value clarity and low conditions
- Use the Live Market Intelligence panel to benchmark your offer

---

### Maker-checker workflow

All material actions (bid submission, bid withdrawal, rate changes) go through maker-checker:

1. **Maker** submits an action → enters Approvals queue
2. **Checker** reviews and approves or rejects (must be a different user)
3. On approval, the action executes automatically
4. All actions expire after 4 hours if not reviewed

This is enforced at the database level — no workarounds exist.

---

### Webhooks

Ficium can send webhooks to your systems for key events:

- `request.new` — new client request matches your product types
- `bid.accepted` — a client accepted your bid
- `request.expired` — a request you bid on expired

Configure webhooks at `/institution/settings`.

---

### Rate limits and fair use

- Maximum 10 bids per institution per request (first bid wins ties)
- Bids cannot be modified after submission — they must be withdrawn (maker-checker) and resubmitted
- Institutions that consistently withdraw bids after submission may be reviewed

---

### Support

For platform issues: hello@ficium.mu
For compliance questions: compliance@ficium.mu
For onboarding: onboarding@ficium.mu
