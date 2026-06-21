# Ficium — User Manual

> **Version:** 1.0 | **Audience:** Clients, Banks, and Administrators | **Platform:** Web (ficium.net)

---

## What Is Ficium?

Ficium is a **reverse banking marketplace**. Instead of you walking into a bank and asking for a loan or deposit account, you post what you need on Ficium — and banks come to you with their best offers.

Think of it like a job listing site, but for financial products. You are the employer. Banks are the candidates. Ficium makes sure the process is fair, private, and competitive.

There are three types of users on Ficium:

| Who | What they do |
|---|---|
| **Client** | Posts financial needs, receives and compares bank offers |
| **Bank (Institution)** | Reviews client requests, submits bids, manages approvals |
| **Admin** | Oversees the platform, reviews identity verifications, manages settings |

---

## Table of Contents

**Part A — Client Portal**
1. Getting Started (Registration & Login)
2. Identity Verification (KYC)
3. Financial Dossier
4. Dashboard
5. Making a Financial Request
6. Viewing Your Requests & Bids
7. Financial Goals
8. Financial Journeys
9. Net Worth Tracker
10. Financial Health Score
11. Market Rates
12. AI Financial Advisor
13. Financial Tools (Calculators)
14. Alerts & Notifications
15. Activity Log
16. Profile

**Part B — Bank (Institution) Portal**
17. Bank Registration & Login
18. Bank Dashboard
19. Marketplace — Viewing Client Requests
20. Submitting a Bid
21. Approvals (Maker-Checker)
22. My Bids
23. Product Catalogue
24. Webhooks
25. Audit Log
26. Bank Settings

**Part C — Admin Panel**
27. KYC Review Dashboard
28. Platform Settings

---

---

# PART A — CLIENT PORTAL

---

## 1. Getting Started — Registration & Login

### What Is This?

This is where you create your Ficium account. You can register as an **Individual** (a person managing personal finances) or a **Business** (a company looking for business finance). Once registered, you log in with your email and password.

### Why You Are Asked For This

Ficium needs to know who you are at a basic level so your account is secure and your financial requests can be sent to the right banks.

### What the Screen Shows You

- **Register button** — opens a selection: "I'm an individual" or "I'm a business"
- **Email field** — your email becomes your username
- **Password field** — kept private and encrypted
- **"Check your email" page** — after registering, Ficium sends a confirmation link so your email is verified
- **Login page** — enter your email and password; a "Forgot password" link is available if you lose access

### What Ficium Is Trying to Achieve

A secure, verified account for every user so the marketplace remains trustworthy for banks and clients alike.

### Flowchart

```
Visit ficium.net
      ↓
Click "Register"
      ↓
Choose: Individual or Business
      ↓
Fill in name, email, password
      ↓
Check email → click confirmation link
      ↓
Account is active → Redirected to Dashboard
      ↓
Must complete KYC before posting requests
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Register with a valid email | Confirmation email arrives within 2 minutes |
| Register with an email already in use | Error: "Account already exists" |
| Login with wrong password | Error: "Invalid credentials" |
| Click "Forgot password" | Reset link sent to email |
| Login before email is verified | Warning to verify email first |

---

## 2. Identity Verification (KYC)

### What Is This?

KYC stands for **Know Your Customer**. This is the step where Ficium confirms you are who you say you are. It is a legal and regulatory requirement — banks cannot receive bids or process financial products without confirmed identity.

### Why You Are Asked For This

Banks need to trust that clients on the platform are real, verified people. Without KYC, anonymous actors could abuse the system. Ficium uses this information to comply with Mauritius financial regulations.

### What the Screen Shows You and Why

| Field / Upload | Why It's Asked |
|---|---|
| **Document Type** (National ID, Passport, Driver's Licence) | To know which official document you are presenting |
| **Document Number** | Cross-referenced with the photo of your document to confirm authenticity |
| **Date of Birth** | Confirms you are at least 18 years old (legal requirement) |
| **Nationality** | Required for regulatory reporting |
| **Residence Status** (Citizen, Permanent Resident, Work Permit, etc.) | Banks in Mauritius have different rules for different resident types |
| **Address (Line 1, Line 2, City, Postal Code, Country)** | Required by law for financial service providers to know where their clients live |
| **Upload: ID Document photo** | Ficium's AI checks the document is real and reads the details automatically |
| **Upload: Selfie / Photo of your face** | Ficium checks your face matches the photo on your ID document |
| **Upload: Proof of Address** (utility bill, bank statement, etc.) | Confirms you actually live at the address you declared |
| **Upload: Work/Student Permit** (if applicable) | Required if your residence status is on a permit |

### What Ficium Is Trying to Achieve

Once you submit these documents, Ficium's system automatically:
1. Reads and extracts details from your ID using AI (Google Vision OCR)
2. Checks your selfie matches the ID photo (liveness/face match)
3. Scores the submission as Low / Medium / High risk
4. Sends the result to a Ficium admin for final human review
5. Notifies you by email once you are verified or if more information is needed

### What the Bank Sees Later

Banks **never see your personal identity documents**. They only see anonymised financial details from your request. Your verified status is shown as a trust badge — not your name or documents.

### Flowchart

```
Complete registration
      ↓
Go to Dashboard → "Verify Identity" banner appears
      ↓
Click "Verify Now" → KYC form opens
      ↓
Fill in personal details + upload documents
      ↓
Click "Submit"
      ↓
Ficium AI scans documents (10–20 seconds)
      ↓
        ┌─────────────────────┬──────────────────────────┐
        ↓                     ↓                          ↓
  Auto-verified          Needs Admin Review        Rejected
  → Proceed to Dossier   → KYC Pending page        → Re-submit with correct docs
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Submit with all correct documents | Auto-verification or "Pending Review" status |
| Submit without a selfie | Error: "Please take a selfie for verification" |
| Submit with a blurry ID photo | Higher risk score; flagged for admin review |
| Submit under age 18 date of birth | Error: "You must be at least 18 years old" |
| Submit work permit holder without permit file | Error: "Please upload your work or student permit" |
| Admin approves KYC | Email notification sent; client can proceed to Dossier |

---

## 3. Financial Dossier

### What Is This?

The Financial Dossier is your financial profile. After your identity is verified, you complete this step to give banks the financial context they need to make you a realistic, competitive bid.

### Why You Are Asked For This

Without knowing your income, expenses, and existing obligations, banks cannot make accurate offers. This step is what allows the marketplace to work — banks use this data to calculate what rate they can offer you and what product suits your situation.

### What the Screen Shows You

The Dossier is broken into sections covering:
- Monthly income and expenses
- Existing loans or credit commitments
- Employment or business details
- Savings and assets overview

### What Ficium Is Trying to Achieve

A complete dossier:
- Generates your **Financial Health Score** (a number from 0–100 showing your creditworthiness)
- Allows banks to assess whether they can serve you
- Improves the quality of bids you receive

### Flowchart

```
KYC Verified
      ↓
Dashboard shows "Complete your Dossier" banner
      ↓
Fill in financial sections (income, expenses, obligations)
      ↓
Submit Dossier
      ↓
Health Score calculated automatically
      ↓
"Ready to Request" status unlocked
      ↓
Can now post financial requests to the marketplace
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Complete all dossier sections | Health score generated; ready-to-request unlocked |
| Skip dossier and try to post a request | Redirected back to complete dossier |
| Enter monthly expenses greater than income | System accepts it but health score reflects the risk |

---

## 4. Dashboard

### What Is This?

The Dashboard is your home screen on Ficium. It gives you a summary of everything happening with your financial life and your requests on the platform.

### What the Screen Shows You and Why

| Element | Why It's There |
|---|---|
| **Greeting + your initial/avatar** | Confirms you are logged into your account |
| **Onboarding banners** (KYC, Dossier) | Guides you to complete setup steps before you can use the marketplace |
| **"What are you planning?" section** | Quick shortcuts to start a new request (e.g. Loan, Mortgage, Fixed Deposit) |
| **Financial Goals section** | Shows your active goals and their progress |
| **Net Worth card** | Displays your total assets minus total liabilities |
| **Financial Health card** | Shows your health score out of 100 |
| **Smart Insights feed** | AI-generated observations about your financial situation (e.g. "Your debt-to-income ratio improved this month") |
| **Market Tile** | Shows current average interest rates on the Ficium marketplace |
| **Next Actions** | Suggests what to do next (e.g. "Upload proof of address", "Review 3 new bids") |
| **Active Requests count** | Total open requests you have on the marketplace |
| **Total new bids count** | How many bank offers have arrived since your last login |
| **Bottom navigation bar** | Links to Requests, Goals, Markets, Advisor, and Tools |

### What Ficium Is Trying to Achieve

One place to see your full financial picture and action items — so you never miss a bid or an opportunity to improve your financial position.

### Flowchart

```
Login
  ↓
Dashboard loads
  ↓
   ├── KYC/Dossier incomplete? → Show banners → Guide to completion
   ├── New bids arrived? → Badge on Requests icon
   ├── Goals behind? → Needs-attention pill on goal card
   └── All good? → Full marketplace and insights available
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Login with KYC not done | Onboarding banner appears; marketplace restricted |
| 3 new bids on a request | Badge shows "3" on requests navigation item |
| Net worth entered | Net worth card shows correct figure |
| No dossier yet | Health score shows "—" placeholder |

---

## 5. Making a Financial Request

### What Is This?

This is the core feature of Ficium. You post exactly what financial product you are looking for — and banks compete to give you their best offer.

### Why You Are Asked For Each Step

The request is a 4-step wizard:

**Step 1 — Choose a Product**

| Product | Why It Exists |
|---|---|
| Personal Loan | For personal needs — travel, medical, debt consolidation, home improvements |
| SME Loan | For small business working capital, equipment, or growth |
| Mortgage | To buy or build property |
| Fixed Deposit | To invest savings — you tell banks how much you want to lock away, and they compete on the rate they'll give you |
| Investment | Managed portfolio products — banks pitch their best investment product |
| Business Loan | Larger corporate credit for expansion or acquisition |
| Credit Card | Banks compete on cashback, rewards, and credit limits |
| Vehicle Leasing | Lease a car or commercial vehicle |
| Overdraft | A flexible credit line for short-term needs |

Each product card also shows the **current average market rate** on Ficium — so you know what a competitive offer looks like before you even submit.

**Step 2 — Amount & Term**

| Field | Why It's Asked |
|---|---|
| **Amount (MUR)** | Banks need to know the size of your need to assess affordability |
| **Term (months)** | The repayment period affects the monthly payment and the interest charged |
| **Max acceptable rate %** (optional) | You can cap what rate you'll accept — banks won't bid above this |
| **Decision deadline** (optional) | You can set a date by which you need an answer |

A live market data box shows you what similar requests are getting on Ficium — average rates, winning bid rates, and average term.

**Step 3 — Purpose**

You describe in plain language what the money is for. Banks read this (not your name) and use it to decide whether to bid and at what rate. Being specific helps — "Fund restaurant kitchen equipment for second branch" attracts better bids than "business expenses."

**Step 4 — Review & Submit**

You see a summary of everything before it goes live. A privacy notice confirms that your identity remains anonymous to banks — they only see the details above.

### What Ficium Is Trying to Achieve

A clear, competitive, anonymous request that goes onto the live marketplace so multiple banks can bid. The client gets better rates through competition. Banks get pre-screened, serious, verified leads.

### What the Bank Sees and Does

Once you submit, the request appears immediately on the bank's marketplace screen. Banks can see:
- Product type (e.g. "Personal Loan")
- Amount and term
- Your purpose description
- Market intelligence about similar requests
- Your anonymised financial health (not your name)

Banks then prepare and submit their bid (interest rate, conditions, amount) which goes through their internal approval process before you see it.

### Flowchart

```
Dashboard → "New Request" button
      ↓
Step 1: Select Product (e.g. Personal Loan)
      ↓
Step 2: Set Amount (e.g. MUR 300,000) & Term (e.g. 36 months)
        Optionally: cap rate at 12%; set deadline
      ↓
Step 3: Write purpose (e.g. "Home renovation and debt consolidation")
      ↓
Step 4: Review summary → Click "Post Request"
      ↓
Request goes LIVE on bank marketplace instantly
      ↓
"Request posted!" confirmation screen → Redirect to Dashboard
      ↓
Banks start reviewing and submitting bids
      ↓
You receive notification when bids arrive
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Post request with KYC not done | Redirected to KYC page |
| Post request without entering amount | "Continue" button disabled |
| Write a purpose under 10 characters | "Continue" button disabled |
| Post successfully | "Request posted!" screen; request visible in Requests list |
| Set max rate of 10% | Banks whose rate is above 10% cannot bid |
| Set a past date as deadline | Date picker blocks past dates |

---

## 6. Viewing Your Requests & Bids

### What Is This?

The Requests page shows all the financial requests you have posted on Ficium, and any bids (offers) that banks have submitted in response.

### What the Screen Shows You

**Summary stats at the top:**
- Open Requests — how many are currently live
- Banks Interested — total bids across all your requests
- Best Rate — the lowest interest rate offered to you so far
- Pending Docs — if a bank asks for additional documents

**Request cards:**
Each card shows:
- The product type and amount
- The status (Open, Bidding, Offer Ready, Closed)
- Number of bids received
- A journey progress bar (Submitted → Under Review → Banks Bidding → Offer Ready)
- An activity feed with the most recent bank actions

**Bid details:**
Click on a request to see individual bids from each bank, including their offered rate, term, conditions, and when the bid expires.

### What Ficium Is Trying to Achieve

Full visibility of your marketplace activity so you can compare offers side by side and make an informed decision about which bank's offer to accept.

### What Happens When You Accept a Bid

When you accept a bank's offer, Ficium notifies the bank. The formal process (signing agreements, disbursement) then happens directly between you and the bank, guided by Ficium.

### Flowchart

```
Dashboard → Requests (bottom nav)
      ↓
View list of all requests (Open / Closed)
      ↓
Click a request → See bid details
      ↓
Compare rate, term, conditions from each bank
      ↓
Accept the best offer → Bank is notified
      ↓
Bank processes the application on their side
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| No requests posted yet | Empty state with "New Request" prompt |
| 1 request, 3 bids received | "Banks Interested: 3" in stats |
| Click on a request | Detail view opens with bid list |
| Request deadline passes | Status changes to "Closed" |
| Filter by "open" status | Only active requests shown |

---

## 7. Financial Goals

### What Is This?

Goals let you plan and track your major financial milestones — buying a house, buying a car, saving for education, building an investment portfolio.

### Why It Exists

Most people have a financial goal but no way to track whether they are on track. Ficium lets you set a target amount and date, and tracks your progress. When you are ready to act on a goal (e.g. apply for a mortgage), you can convert it into a marketplace request directly.

### What the Screen Shows You

Each goal card shows:
- Goal type (Mortgage, Vehicle, Education, Business, Investment, Savings, Personal, Other)
- Target amount in MUR
- Amount saved so far
- Progress bar (percentage toward target)
- Status pill: **On Track**, **Needs Attention**, or **Ahead**
- Target date

### Creating a New Goal

Click "New Goal" and fill in:
- Goal type
- Name (e.g. "Buy apartment in Grand Baie")
- Target amount
- Target date
- Current amount saved

### What Ficium Is Trying to Achieve

A structured savings and planning view that connects your personal financial ambitions directly to the marketplace — so when you are ready to borrow or invest, your data is already in Ficium.

### Flowchart

```
Goals page → "New Goal"
      ↓
Choose type (e.g. Mortgage)
      ↓
Enter name, target amount, target date, current savings
      ↓
Goal created → Progress tracked automatically
      ↓
Status updates to "Needs Attention" if behind schedule
      ↓
When ready → "Request Finance" links to New Request wizard
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Create a goal with a past target date | System accepts it; shows "Needs Attention" |
| Reach 100% of target amount | Goal shows as completed |
| No goals created | Empty state with "Create first goal" prompt |

---

## 8. Financial Journeys

### What Is This?

Journeys are step-by-step guides that walk you through a major financial life event — such as "Buying My First Home" or "Starting a Business." Each journey is a workspace where Ficium AI helps you understand what documents you need, what steps to take, and how to prepare for the marketplace.

### Why It Exists

Financial decisions are complex and often overwhelming. Journeys break a big goal into manageable steps and keep you on track.

### What the Screen Shows You

- Active journeys with their current step
- A "New Journey" button to start fresh
- Each journey workspace shows a checklist of tasks, documents, and milestones

### What Ficium Is Trying to Achieve

To reduce the intimidation of big financial decisions and prepare clients to get the best possible outcome from the marketplace.

### Flowchart

```
Journeys page → "New Journey"
      ↓
Choose journey type (e.g. "Buy a property")
      ↓
Ficium AI generates a step-by-step plan
      ↓
Complete steps one by one (gather docs, assess budget, etc.)
      ↓
Final step: Post your request to the marketplace
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Start a "First Home" journey | AI generates a checklist including savings, deposit, KYC, mortgage request |
| Complete a journey step | Step marked with green tick |
| Start journey without KYC | KYC step appears first in the plan |

---

## 9. Net Worth Tracker

### What Is This?

The Net Worth Tracker is a simple tool where you enter your assets (what you own) and liabilities (what you owe). Ficium calculates your net worth automatically.

### Why It Exists

Banks want to understand your overall financial position. Your net worth is one of the key signals they use when deciding whether and at what rate to bid on your request.

### What the Screen Shows You

**Assets section:**
- Cash savings
- Property value
- Investments
- Vehicle value
- Other assets

**Liabilities section:**
- Existing loans
- Credit card balances
- Mortgage outstanding balance
- Other debts

**Calculated totals:**
- Total Assets
- Total Liabilities
- **Net Worth** = Total Assets − Total Liabilities

Monthly change is also shown (based on your savings entries).

### What Ficium Is Trying to Achieve

An accurate financial snapshot that feeds directly into your Health Score and makes your marketplace profile stronger.

### Flowchart

```
Dashboard → "Net Worth" card → "View breakdown"
      ↓
Enter assets (property, cash, investments, vehicle, other)
      ↓
Enter liabilities (loans, cards, mortgage, other)
      ↓
Net Worth calculated automatically
      ↓
Updated figure appears on Dashboard card
      ↓
Health Score recalculated to reflect new data
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Assets MUR 5M, liabilities MUR 2M | Net Worth shows MUR 3,000,000 |
| Update a figure | Dashboard card reflects change instantly |
| No data entered | Net Worth shows "—" with prompt to add data |

---

## 10. Financial Health Score

### What Is This?

Your Financial Health Score is a number from **0 to 100** that summarises how strong your financial position looks to a bank. It is calculated automatically from your Net Worth and Dossier data.

### Why It Exists

Banks use this score (alongside the full dossier) to assess risk. A higher score means you are more likely to receive competitive bids.

### What the Screen Shows You

A breakdown of four key metrics:

| Metric | What It Measures | Good Threshold |
|---|---|---|
| **Debt-to-Income Ratio** | Your total debt as a % of your annual income | Below 30% |
| **Savings Rate** | How much of your monthly income you save | Above 20% |
| **Liquidity (Emergency Fund)** | How many months of expenses you could cover with cash | At least 3 months |
| **Loan-to-Income Ratio** | Your monthly loan payments as a % of monthly income | Below 35% |

Each metric is shown with a score (0–100), a status (Good / Fair / Poor), and a specific action you can take to improve it.

An overall score ring at the top summarises everything in one number.

### Flowchart

```
Health page (Dashboard → "Financial Health" card)
      ↓
System reads Net Worth and Dossier data
      ↓
Calculates 4 metrics
      ↓
Overall score computed (weighted average)
      ↓
Displayed as a ring chart (green = good, amber = fair, red = poor)
      ↓
Action tips shown for any "Fair" or "Poor" metric
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| DTI = 15% | DTI shown as "Good" — 100/100 score |
| DTI = 55% | DTI shown as "Poor" — red colour; action tip shown |
| No financial data entered | Score shows "—"; prompt to complete dossier |

---

## 11. Market Rates

### What Is This?

The Markets page shows you live average interest rates and bid data from across the Ficium marketplace — so you know what banks are currently offering on each product type.

### Why It Exists

Information is power. Knowing the market rate before you post a request helps you set realistic expectations and spot when a bank's bid is exceptional or disappointing.

### What the Screen Shows You

For each product type (Personal Loan, SME Loan, Mortgage, etc.):
- **Average market rate** (APR %)
- **Rate range** (lowest to highest on the platform)
- **Winning bid average** — what the offers that clients actually accepted looked like
- **Average bids per request** — how competitive each product category is

### Flowchart

```
Dashboard → Markets tab
      ↓
System pulls live rate intelligence from marketplace data
      ↓
Display table/tiles per product type
      ↓
Updated every 5 minutes automatically
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| No bids on platform yet | Market rates show "—" or "No data yet" |
| 10 banks have bid on personal loans | Average rate calculated and displayed |
| User visits during off-peak hours | Data shown from last update (refreshes every 5 min) |

---

## 12. AI Financial Advisor

### What Is This?

The AI Advisor is a chat interface powered by Ficium's AI system. You can ask it financial questions in plain language and get personalised, context-aware answers based on your Ficium profile.

### Why It Exists

Most people don't have access to a personal financial adviser. The Ficium AI Advisor bridges that gap — giving you accessible, relevant guidance 24/7.

### What You Can Ask It

- "Am I ready to apply for a mortgage?"
- "What should I do to improve my health score?"
- "Which type of loan is cheapest on the market right now?"
- "How long will it take to reach my savings goal?"
- "Explain what a fixed deposit is"

### What Ficium Is Trying to Achieve

An AI assistant that knows your financial data and can give you genuinely useful, personalised advice — not generic tips.

### Important Note

The AI Advisor is a guidance tool. It is not a licensed financial adviser. For major decisions, always consult a qualified professional.

### Flowchart

```
Dashboard → "Advisor" icon (bottom nav)
      ↓
Chat interface opens
      ↓
Type your question
      ↓
AI reads your profile, health score, goals, and marketplace data
      ↓
Gives personalised answer with action suggestions
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Ask "What is my health score?" | AI cites your actual score and explains it |
| Ask general question ("What is APR?") | Clear explanation in simple terms |
| Ask about mortgage before KYC done | AI notes you need to complete KYC first |

---

## 13. Financial Tools (Calculators)

### What Is This?

A set of free financial calculators built into Ficium to help you plan before posting a request.

### What Tools Are Available

| Tool | What It Does |
|---|---|
| **Loan Calculator** | Enter amount, rate, and term — see your monthly payment |
| **Mortgage Calculator** | Estimate property loan repayments |
| **Savings Calculator** | Project how much your savings will grow |
| **Affordability Calculator** | Check how much you can safely borrow based on your income |

### Why It Exists

Before you post a request, you need to know what you can realistically afford. These tools give you that clarity in seconds.

### Flowchart

```
Dashboard → Tools icon (bottom nav)
      ↓
Choose a calculator
      ↓
Enter the numbers
      ↓
Instant result shown
      ↓
Use result to guide your request (e.g. target amount, max rate)
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Loan: MUR 500,000 at 9% over 60 months | Monthly payment calculated correctly |
| Enter 0 as amount | Error or 0 result shown |

---

## 14. Alerts & Notifications

### What Is This?

The Alerts page collects all important notifications about your requests — new bids, bid expirations, document requests from banks, and system messages.

### Why It Exists

You should never miss a bank offer. Alerts ensure you are notified in-app (and by email) whenever something happens on your account.

### What the Screen Shows You

- A chronological list of alerts
- Each alert shows the bank action (e.g. "MCB submitted a new offer on your Personal Loan")
- Timestamp (e.g. "2 mins ago", "Yesterday")
- Colour-coded dots indicating urgency (blue = new bid, amber = pending action, green = success)

### Flowchart

```
Bank submits bid
      ↓
Ficium generates alert → appears in Alerts page
      ↓
Email notification also sent to client's email
      ↓
Client clicks alert → taken to request detail to view bid
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Bank submits bid | New alert appears in list |
| Bid is about to expire | Urgent alert with expiry countdown |
| Client reads all alerts | "All clear" state shown |

---

## 15. Activity Log

### What Is This?

A full audit trail of everything that has happened on your account — logins, document uploads, requests posted, bids accepted, and more.

### Why It Exists

Transparency and security. You can always check whether any action on your account was done by you or not.

### What the Screen Shows You

A time-stamped list of events:
- When you logged in and from where
- When you submitted KYC documents
- When you posted a request
- When a bid was accepted

### Flowchart

```
Dashboard → Activity (bottom nav or menu)
      ↓
Full event log loaded from secure database
      ↓
Browse chronologically
      ↓
Suspicious activity? → Contact Ficium support
```

---

## 16. Profile

### What Is This?

Your personal profile page where you can view and update your basic account details.

### What the Screen Shows You

- Name, email address
- KYC status badge (Not submitted / Pending / Verified)
- Option to update profile details
- Link to sign out

---

---

# PART B — BANK (INSTITUTION) PORTAL

---

## 17. Bank Registration & Login

### What Is This?

Banks register on Ficium as an institution. The registration process is more thorough than individual registration because banks must be approved by Ficium before they can access the marketplace.

### What the Screen Shows You

- Institution name, type (bank, leasing company, etc.)
- Contact details and primary administrator information
- Licence/regulatory information

### Flowchart

```
Visit ficium.net/institution/register
      ↓
Fill in institution details
      ↓
Submit application
      ↓
"Application Pending" page shown
      ↓
Ficium admin reviews and approves the institution
      ↓
Primary admin receives email confirmation
      ↓
Login at ficium.net/institution/login
      ↓
Complete institution onboarding (product setup, team setup)
      ↓
Access to marketplace unlocked
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Register without completing all fields | Validation errors shown |
| Register with duplicate institution name | Flagged for Ficium admin review |
| Login before admin approval | "Application pending" message |
| Admin approves institution | Email sent; login now allowed |

---

## 18. Bank Dashboard

### What Is This?

The main screen for bank users. Shows a live overview of marketplace activity and the bank's performance.

### What the Screen Shows You

- Open client requests available to bid on
- Total bids the bank has submitted
- Accepted bids (won deals)
- Win rate (% of bids that were accepted by clients)
- Live market intelligence — average rates across product categories
- Pending approvals waiting for a second sign-off

---

## 19. Marketplace — Viewing Client Requests

### What Is This?

The Marketplace is where bank users see all open client requests currently available for bidding. This is the live feed of client demand.

### Why It Exists

Banks need a single place to see all verified, pre-screened client requests without having to source leads through traditional channels.

### What the Screen Shows You

**Live header:**
- Number of open requests
- "LIVE" indicator — the feed refreshes every 30 seconds automatically
- Refresh button for manual update

**Market Intelligence panel:**
Before the request list, a panel shows current rates across product types — so bank analysts can calibrate their bids:
- Average market APR per product
- Rate range (min to max)
- Winning bid average rate
- Average number of bids per request (competitiveness indicator)

**Product filter:**
Banks can filter requests by product type — e.g. show only "Mortgage" requests.

**Request cards:**
Each card shows:
- Product type and amount (in MUR)
- Preferred term
- Client's purpose description (anonymous)
- Time posted and deadline (if set)
- "View Details" and "Place Bid" buttons

**Maker-Checker notice:**
A banner reminds bank users that all bids must go through a second admin for approval before they are visible to the client. This is a regulatory control (four-eyes principle).

### What Ficium Is Trying to Achieve

Banks discover high-quality, verified leads without cold-calling or advertising. Competition between banks drives better rates for clients.

### Flowchart

```
Bank logs in → Marketplace
      ↓
View all open client requests
      ↓
Filter by product type if needed
      ↓
Click "View Details" → See full request information + client dossier summary
      ↓
Decide to bid → Click "Place Bid"
      ↓
Fill in bid form → Submit for internal approval
      ↓
Approval granted by second admin → Bid goes live to client
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| 0 open requests | "No open requests" empty state shown |
| Filter by "Mortgage" | Only mortgage requests displayed |
| Click "Refresh" | Feed updates with latest requests |
| Request deadline has passed | Request removed from live feed |

---

## 20. Submitting a Bid

### What Is This?

When a bank decides to make an offer on a client's request, they fill in the Bid form. This is the bank's formal proposal to the client.

### Why You Are Asked For Each Field

| Field | Why It's Required |
|---|---|
| **Interest Rate (%)** | The core of the offer — the APR the bank is offering |
| **Rate Type** (Fixed / Variable) | Client needs to know whether the rate can change |
| **Amount Offered (MUR)** | May differ from what the client asked — bank may offer a partial amount |
| **Term (months)** | Repayment period the bank proposes |
| **Notes / Conditions** | Any conditions attached to the offer (e.g. salary account required, collateral required) |

### What Ficium Is Trying to Achieve

A structured, comparable offer that clients can evaluate side-by-side against other banks' bids.

### Important: Maker-Checker

After the bank user (the "Maker") submits a bid, it does **not go live immediately**. It enters the Approvals queue where a second bank admin (the "Checker") must review and approve it. This is a financial governance control.

### Flowchart

```
Bank user clicks "Place Bid" on a request
      ↓
Bid modal opens
      ↓
Fill in rate, rate type, amount, term, conditions
      ↓
Click "Submit Bid"
      ↓
Bid enters internal Approvals queue
      ↓
Second admin reviews and approves
      ↓
Bid goes live → Client sees it in their request view
      ↓
Client accepts or declines the bid
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Submit bid with rate above client's max rate | System still accepts (client's cap is enforced on their end) |
| Same admin tries to approve their own bid | Blocked — "You cannot approve an action you initiated" |
| Second admin approves bid | "Bid submitted for approval" toast → Bid appears to client |
| Client's deadline passes before bid approved | Bid expires; not shown to client |

---

## 21. Approvals (Maker-Checker)

### What Is This?

The Approvals page is an internal governance control. Every significant action a bank user takes — submitting a bid, withdrawing a bid, updating settings — must be approved by a second bank admin before it takes effect.

### Why It Exists

This is a **four-eyes principle**: two pairs of eyes must check every material action. It is a standard requirement in financial services to prevent errors and fraud.

### What the Screen Shows You

- A queue of pending actions waiting for approval
- Each action shows: what it is, who initiated it, when it expires
- Urgent actions are highlighted in amber (expiring within 4 hours)

**For each action, the second admin can:**
- **Expand** to see full details (client dossier summary, bid parameters)
- **Approve** — action goes live
- **Reject** — action is cancelled; initiator is notified with the rejection reason

### Important Rules

- You **cannot approve your own action**
- Expired actions automatically cancel
- All approvals and rejections are logged in the Audit trail

### Flowchart

```
Bank user (Maker) submits bid / takes action
      ↓
Action enters Approvals queue
      ↓
Second admin (Checker) logs in → sees pending action
      ↓
Reviews action details
      ↓
      ├── Approves → Action goes live immediately
      └── Rejects → Enters rejection reason → Action cancelled
      ↓
Audit record created for both outcomes
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| No pending actions | "All clear" screen shown |
| Action expiring in 2 hours | Amber highlight + urgency countdown |
| Checker tries to approve their own action | Button disabled with explanation |
| Checker approves bid | Bid immediately visible to client |
| Checker rejects bid | Bid cancelled; maker can resubmit |

---

## 22. My Bids

### What Is This?

A record of all bids the bank has ever submitted — across all statuses.

### What the Screen Shows You

**Stats at the top:**
- Total bids submitted
- Currently active bids
- Accepted bids (client chose this bank's offer)
- Win rate (%)

**Filter tabs:**
- All bids
- Active (submitted, awaiting client decision)
- Accepted
- Rejected (client chose another bank)
- Expired (client didn't respond before deadline)
- Withdrawn

**Each bid card shows:**
- Request summary (product type, amount, purpose excerpt)
- Offered rate and term
- Current status badge
- Time since submission
- Option to withdraw (must go through Approvals)

### Flowchart

```
Bank portal → "My Bids"
      ↓
View full bid history
      ↓
Filter by status
      ↓
Click a bid → Expand for full details
      ↓
If still active: option to withdraw bid
      ↓
Withdrawal enters Approvals queue for second sign-off
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Bank has 10 bids, 3 accepted | Win rate shows 30% |
| Filter by "Accepted" | Only accepted bids displayed |
| Withdraw a bid | Withdrawal enters Approvals queue; bid not withdrawn until approved |

---

## 23. Product Catalogue

### What Is This?

Banks can configure which financial products they offer on Ficium, and set their default parameters (minimum/maximum amounts, term ranges, standard rates).

### Why It Exists

Not every bank offers every product. The catalogue ensures banks only appear in marketplace searches relevant to what they actually offer.

### What the Screen Shows You

A list of product types the bank has enabled, with configuration options for each.

---

## 24. Webhooks

### What Is This?

A technical feature for banks that want to connect Ficium to their own internal systems. When a new request arrives or a bid is accepted, Ficium can automatically send a notification to the bank's own software.

### Why It Exists

Large banks run their own CRM or loan origination systems. Webhooks allow Ficium events to trigger automatic actions in those systems — reducing manual data entry.

### Who Uses This

Typically the bank's IT or technical team, not front-line staff.

---

## 25. Audit Log (Bank)

### What Is This?

A full record of every action taken in the bank's portal — who logged in, who submitted a bid, who approved it, when, and from where.

### Why It Exists

Financial regulation requires institutions to maintain detailed records of all activity for compliance, investigation, and reporting purposes.

### What the Screen Shows You

- Timestamped event list
- User who performed the action
- Action type
- Affected resource (e.g. bid ID, request ID)

---

## 26. Bank Settings

### What Is This?

The configuration area for the bank's Ficium account.

### Tabs Available

| Tab | What It Does |
|---|---|
| **Profile** | Bank name, logo, contact details, regulatory information |
| **Team** | Add or remove bank users; assign roles (Admin / Analyst / Viewer) |
| **API Keys** | Generate API keys for technical integrations |
| **SLA Config** | Set internal service level agreements — how quickly the bank commits to reviewing and responding to each product type |

### Why Team Roles Matter

- **Admin** — full access including approvals, settings, and team management
- **Analyst** — can view marketplace and submit bids; cannot approve
- **Viewer** — read-only access for compliance or management reporting

---

---

# PART C — ADMIN PANEL

---

## 27. KYC Review Dashboard

### What Is This?

The Ficium internal admin panel where Ficium staff review client identity verification submissions that could not be automatically approved.

### Why It Exists

Not every KYC submission is clean enough for automatic approval — some have blurry documents, partial information, or high risk scores that need a human eye.

### What the Screen Shows You

**KYC Stats:**
- Total verified users
- Pending review queue size
- Rejected submissions
- Average AI risk score

**KYC Queue:**
Each client in the queue shows:
- Name and email
- Submission date
- Document type
- AI-generated risk score (0–100; higher = more risk)
- Status: Pending Review / Verified / Rejected / Not Submitted

**For each client, admin can:**
- View their ID document photo
- View their selfie
- View their proof of address
- Read the auto-extracted data (document number, date of birth, address)
- See any AI flags (e.g. "Face match confidence low")

**Admin actions:**
- **Approve** — mark as verified; client is notified by email and can proceed
- **Reject** — enter a reason; client is notified by email with the reason and asked to resubmit

### What Ficium Is Trying to Achieve

A thorough, auditable human review process that catches edge cases the AI cannot confidently resolve — ensuring the marketplace is populated only with verified, legitimate clients.

### Flowchart

```
Client submits KYC documents
      ↓
AI scans documents and generates risk score
      ↓
      ├── Risk score low + face match good → Auto-verified
      └── Risk score high OR uncertain → Enters admin queue
            ↓
      Admin opens client record
            ↓
      Reviews documents and AI flags
            ↓
            ├── Approve → Client status = Verified; email sent
            └── Reject  → Rejection reason recorded; email sent to client
```

### Test Scenarios

| Scenario | Expected Result |
|---|---|
| Client submits clear, matching documents | Risk score low; may auto-verify |
| Client submits mismatched face/ID | High risk score; enters manual queue |
| Admin approves client | Client receives "You're verified!" email; dossier step unlocks |
| Admin rejects client | Client receives email with reason; can resubmit |
| Admin clicks "View ID" with no document uploaded | "Not uploaded" placeholder shown |

---

## 28. Platform Settings (Admin)

### What Is This?

The Ficium admin area also includes global platform settings — KYC configuration, institution approvals, and system monitoring.

### What Admins Can Do

- **Approve or reject institution applications** (bank registrations)
- **Configure KYC settings** — adjust which document types are accepted, set risk score thresholds for auto-approval
- **Monitor platform health** — view error logs, uptime, and API usage
- **Manage admin users** — add or remove Ficium staff accounts

---

---

## Appendix A — Glossary

| Term | Meaning |
|---|---|
| **KYC** | Know Your Customer — the legal process of verifying a user's identity |
| **Dossier** | Your financial profile on Ficium (income, expenses, obligations) |
| **APR** | Annual Percentage Rate — the true yearly cost of a loan including interest and fees |
| **Bid** | A bank's formal offer in response to your request |
| **Maker-Checker** | A governance rule requiring two separate people to initiate and approve a financial action |
| **Market Rate** | The average interest rate currently being offered across all Ficium bids |
| **Health Score** | A 0–100 score summarising your financial strength based on your dossier data |
| **Fixed Rate** | An interest rate that stays the same for the entire loan term |
| **Variable Rate** | An interest rate that can change over time (usually linked to market rates) |
| **SME** | Small and Medium-sized Enterprise — a small business |
| **DTI** | Debt-to-Income ratio — your total debt divided by your annual income |
| **Net Worth** | Total assets minus total liabilities |
| **MUR** | Mauritian Rupee — the currency used throughout Ficium |
| **Webhook** | An automatic notification sent from Ficium to a bank's own system when an event occurs |

---

## Appendix B — Privacy Summary

| Data | Who Sees It |
|---|---|
| Your full name | Ficium admin only |
| Your ID documents | Ficium admin only (during KYC review) |
| Your financial dossier | Ficium system (for scoring) + anonymised summary to banks |
| Your request purpose | Banks (without your name attached) |
| Your bids received | You only |
| Market rate averages | All users (public marketplace intelligence) |

Your identity is **never shared with banks**. Banks bid on anonymised financial profiles only.

---

## Appendix C — Support & Contact

For any issues with your account, documents, or bids, please contact Ficium support via the platform or at **support@ficium.net**.

---

*This manual covers the Ficium platform as of Version 1.0. Features may be updated — check the platform for the latest version.*
