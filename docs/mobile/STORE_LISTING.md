# Store listing pack

Everything to paste into Play Console and App Store Connect, plus the review
risks to settle before submitting. Build and upload steps are in
[RELEASE.md](RELEASE.md).

Items marked **OWNER** need a decision or a fact only Ficium has.

## Review risks: settle these first

These are the things most likely to get the app rejected. None is a code
problem.

1. **Apple treats a loan marketplace as a regulated financial app.** Guideline
   3.2.1(viii) expects financial apps to be submitted by the institution
   providing the service, and reviewers have rejected finance apps whose
   account name, email domain or product-page domains did not match the legal
   entity. Ficium is an introducer, not a lender, and has no FSC licence yet.
   Expect App Review to ask what Ficium is and what authorises it. Have ready:
   the certificate of incorporation, a one-page description of the introducer
   model (Ficium never lends, holds money or makes credit decisions), and the
   signed agreement with at least one licensed institution. **OWNER**
2. **The app is served from `ficium.vercel.app`.** For a finance app, privacy,
   support and marketing URLs on a domain Ficium does not own are a likely
   3.2.1(viii) rejection, and they look wrong to users. Move the borrower app
   to a Ficium domain (for example `app.ficium.net`) **before** the first
   submission: the universal-link domain is compiled into the apps, so changing
   it later needs a new release. The three places to change are listed in
   README.md and enforced by `npm run check:native`. **OWNER**
3. **Google Play's personal-loans policy covers apps that connect borrowers to
   lenders**, not only lenders. It requires the Finance category, the Financial
   features declaration, and these disclosures in the store description:
   minimum and maximum repayment period, maximum APR, and a representative
   example of total cost. Loans repayable in 60 days or less are not allowed.
   Apple now has matching rules (terms disclosed, APR no higher than 36%, no
   60-day loans). The figures must come from the participating institutions.
   **OWNER**
4. **The Privacy Notice is still marked as a draft** (`LEGAL_DRAFT = true`).
   Both stores require a final privacy policy at a public URL.
5. **Account deletion must be switched on in production**
   (`ACCOUNT_CLOSURE_RETENTION_YEARS`). Both stores test it.
6. **Reviewers need a working sign-in.** Create a demo borrower that has
   already passed identity verification, with one open request that has at
   least one offer, and give the credentials in the review notes. Without it
   the reviewer stops at the KYC step and rejects. **OWNER**

## Listing text

| Field | Value |
|---|---|
| App name | Ficium |
| Category | Finance |
| Subtitle (App Store, 30) | Banks compete for you |
| Short description (Play, 80) | Post what you need. Banks compete with offers. You choose. |
| Keywords (App Store, 100) | loan,mortgage,savings,invest,bank,offers,compare,rates,mauritius,finance |
| Content rating | Everyone / 4+. Users must be 18 or over to register. |
| Countries | Mauritius only at launch (recommended: each added country brings its own lending rules) |
| Price | Free |

**Full description**

> Ficium turns banking around. Instead of going from bank to bank, you post
> what you need once and financial institutions compete to offer it to you.
>
> HOW IT WORKS
> • Post a request to borrow, save or invest. It takes a few minutes.
> • Institutions see an anonymous profile, never your name or contact details.
> • They respond with offers. Compare them side by side.
> • Accept the one you want. Only then does that institution learn who you are.
>
> WHAT YOU GET
> • One request, several offers
> • Your identity stays private until you choose
> • A secure vault for your documents
> • A money tracker for your accounts, loans and investments
> • Fia, an assistant that explains offers in plain language
>
> SECURITY
> • Face ID or fingerprint lock
> • Your session is stored in your phone's secure hardware
> • Screenshots are blocked on Android; the app is hidden in the app switcher
>
> Ficium is an introducer operated by Ficium Ltd, Mauritius. Ficium is not a
> bank or a lender, does not hold your money and does not make credit
> decisions. Every offer is made by the institution that sends it, and any
> agreement is between you and that institution.
>
> [OWNER: loan disclosure block required by both stores. Minimum and maximum
> repayment period, maximum APR including fees, and a representative example,
> taken from the participating institutions.]

**URLs** (replace the host once the app is on a Ficium domain)

| Field | URL |
|---|---|
| Privacy policy | `https://<host>/privacy` |
| Terms | `https://<host>/terms` |
| Account deletion (Play Data safety) | `https://<host>/delete-account` |
| Support | **OWNER**: a support page or mailbox on a Ficium domain |
| Marketing | `https://<host>/how-it-works` |

**Screenshots** (portrait, real screens, no personal data): dashboard, new
request, offers comparison, request detail with an offer, vault, lock screen.
App Store: 6.9-inch iPhone set. Play: at least 4 phone screenshots, a 512 px
icon and a 1024 × 500 feature graphic. The app is iPhone-only, so no iPad set.

## Data collected

This table is the single source for the Play Data safety form, the App Store
privacy answers and `ios/App/App/PrivacyInfo.xcprivacy`. It follows the Privacy
Notice (`src/features/legal/content.ts`). If one changes, change all of them.

For every row: collected **yes**, linked to the user **yes**, used for tracking
**no**, purpose **app functionality** (plus fraud prevention and compliance
where noted), encrypted in transit **yes**.

| Data | Play category | App Store category | Notes |
|---|---|---|---|
| Name | Personal info → Name | Contact Info → Name | |
| Email | Personal info → Email address | Contact Info → Email Address | |
| Phone | Personal info → Phone number | Contact Info → Phone Number | Optional at signup |
| Address, country | Personal info → Address | Contact Info → Physical Address | |
| Date of birth, sex | Personal info → Other info | Other Data | |
| ID document images, selfie, face match | Personal info → Government ID; Photos | Sensitive Info; Photos or Videos | Fraud prevention, compliance. Biometric. |
| Income, employment, loans, accounts, holdings | Financial info → Other financial info | Financial Info → Other Financial Info | |
| Risk and affordability scores | Financial info → Credit score | Financial Info → Credit Info | Computed by Ficium |
| Vault documents | Files and docs | User Content → Other User Content | |
| Messages with institutions, Fia chats | Messages → Other in-app messages | User Content → Other User Content | |
| User ID | Personal info → User IDs | Identifiers → User ID | |
| Sign-in records, IP address, audit trail | App activity → Other actions | Usage Data → Product Interaction | Security |

Not collected: location, contacts, calendar, health, browsing history,
advertising ID, purchases. No advertising or analytics SDK is in the app.

**Shared with third parties** (Play asks separately): after the user accepts an
offer, identifying details go to that one institution, with consent given at
acceptance. Declare this as sharing of personal and financial info for app
functionality. Processors acting for Ficium (hosting, database, identity
checks, the assistant, email) are service providers, not sharing, under both
stores' definitions.

**Data deletion** (Play): users can request deletion: yes. URL:
`/delete-account`. Some data is retained for a legal period: yes.

**Security practices** (Play): data is encrypted in transit: yes. Independent
security review: answer no until the penetration test is complete.

## Declarations

| Declaration | Answer |
|---|---|
| Play: Financial features | Personal loans: "facilitator / connects users to third-party lenders". Add savings and investment introductions under "Other". Attach licences where the form asks for the country. **OWNER** |
| Play: Target audience | 18 and over |
| Play: Ads | No ads |
| Play: Government app | No |
| Play: News app | No |
| App Store: Export compliance | Uses only standard encryption (`ITSAppUsesNonExemptEncryption` is already `false`) |
| App Store: Sign-in required | Yes, demo account supplied |
| App Store: Content rights | Contains no third-party content needing rights |
| App Store: Age rating | 4+ (no restricted content); 18+ enforced at registration |
| Both: Camera permission | Scanning the identity card and capturing documents the user chooses to share |
| iOS: Face ID | Unlocking the app and confirming actions such as accepting an offer |

## Review notes (paste into "Notes for review")

> Ficium is a marketplace operated by Ficium Ltd (Mauritius). A user posts a
> request to borrow, save or invest; licensed financial institutions respond
> with offers; the user accepts one. Ficium is an introducer only. It does not
> lend, hold customer money or make credit decisions, and it charges users
> nothing. Each offer and any resulting agreement is between the user and the
> institution.
>
> Demo account (identity already verified, one request with offers):
> email: [OWNER]   password: [OWNER]
>
> The app locks with Face ID / passcode when reopened. On a simulator without
> a passcode it signs out instead; sign in again with the demo account.
>
> Account deletion: Profile → Close account.
>
> Native features: biometric app lock, hardware-backed session storage, camera
> capture for identity documents, verified universal links.
