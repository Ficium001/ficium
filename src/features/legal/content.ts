/**
 * Terms of Use and Privacy Notice, as data.
 *
 * DRAFT: written from what the platform actually does (checked against the code), for review by
 * Ficium's lawyer before launch. While LEGAL_DRAFT is true every page shows a "draft" banner.
 * After sign-off: set LEGAL_DRAFT = false, bump the version and effective date, and keep the old
 * text in git history: signups record the version they agreed to.
 */

export const LEGAL_DRAFT = true;

export const CONTACT_EMAIL = "kishan.jeebun@ficium.net";

export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { title: string; version: string; effective: string; intro: string; sections: LegalSection[] };

export const TERMS: LegalDoc = {
  title: "Terms of Use",
  version: "1.0",
  effective: "Pending legal review",
  intro:
    "These terms govern your use of Ficium, operated by Ficium Ltd, a company registered in Mauritius. " +
    "By creating an account you agree to them. Please read them with our Privacy Notice.",
  sections: [
    {
      heading: "1. What Ficium is",
      body: [
        "Ficium is a marketplace. You post a request to borrow, save or invest, and licensed financial institutions may respond with offers.",
        "Ficium is an introducer. We are not a bank, lender, deposit-taker or investment adviser, and we do not lend, hold your money or make credit decisions.",
        "Each offer is made by the institution that sends it. Any agreement you sign is between you and that institution, on its own terms.",
      ],
    },
    {
      heading: "2. Who can use Ficium",
      body: [
        "You must be at least 18 years old and able to enter a binding contract.",
        "Accounts are for individuals acting for themselves. Business accounts are not yet available.",
        "You must complete identity verification before your requests are shown to institutions.",
      ],
    },
    {
      heading: "3. Your account",
      body: [
        "Give accurate, complete and current information, and update it when it changes. Institutions rely on it to make offers.",
        "Keep your password secret and tell us at once if you think someone else has used your account.",
        "You may close your account at any time from your profile. Some records must be kept after closure; see the Privacy Notice.",
      ],
    },
    {
      heading: "4. Requests, offers and acceptance",
      body: [
        "While a request is open, institutions see it without your name or contact details.",
        "You may cancel an open request at any time. Cancelling closes it for every institution.",
        "When you accept one offer, you consent to that institution receiving the identifying details shown to you at acceptance, so it can start its own process. Other institutions do not receive them.",
        "Accepting an offer is not a loan or investment contract. The institution will carry out its own checks and may decline. If it does, you can post a new request.",
      ],
    },
    {
      heading: "5. Information, tools and Fia",
      body: [
        "Calculators, market data, insights and the Fia assistant are for general information. They are not financial, legal or tax advice and do not take your full circumstances into account.",
        "Market prices may be delayed or inaccurate. Check with the institution before you rely on any figure.",
      ],
    },
    {
      heading: "6. Fees",
      body: [
        "Ficium is free for individuals. Institutions may pay Ficium a fee when a deal is completed through the platform. That fee does not change the terms an institution offers you.",
      ],
    },
    {
      heading: "7. Acceptable use",
      body: [
        "Do not give false information or documents, use someone else's identity, try to identify institutions or other users outside the platform's process, interfere with the service or its security, or use it for any unlawful purpose.",
        "We may suspend or close an account that breaks these terms, and we may report suspected fraud or money laundering to the authorities as the law requires.",
      ],
    },
    {
      heading: "8. Liability",
      body: [
        "We work to keep Ficium available and secure but cannot promise it will always be uninterrupted or error-free.",
        "We are not responsible for an institution's offers, decisions or products. Nothing in these terms limits liability that cannot be limited under Mauritian law.",
      ],
    },
    {
      heading: "9. Changes and law",
      body: [
        "We may update these terms. We will tell you of material changes before they take effect, and the version you agreed to is recorded on your account.",
        "These terms are governed by the laws of Mauritius, and the courts of Mauritius have jurisdiction.",
      ],
    },
    {
      heading: "10. Contact and complaints",
      body: [
        `Write to ${CONTACT_EMAIL}. We acknowledge complaints within 5 working days and aim to resolve them within 30 days.`,
      ],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: "Privacy Notice",
  version: "1.0",
  effective: "Pending legal review",
  intro:
    "Ficium Ltd is the controller of your personal data under the Mauritius Data Protection Act 2017. " +
    "This notice explains what we collect, why, who receives it and your rights.",
  sections: [
    {
      heading: "1. What we collect",
      body: [
        "Identity and contact: name, email, phone, date of birth, sex, address and country.",
        "Identity verification: images of your national identity card or passport and a selfie, the details read from them, and a face comparison result.",
        "Financial: employment and income, existing loans and commitments, accounts, holdings and goals you add, and the requests you post.",
        "Documents you upload to your vault or send to an institution, and messages you exchange with institutions.",
        "Technical: sign-in records, device and IP address, and an audit trail of actions on your account.",
      ],
    },
    {
      heading: "2. Why we use it",
      body: [
        "To run the marketplace you asked to use (performance of our contract with you).",
        "To verify your identity and prevent fraud and money laundering (legal obligation).",
        "To pass your details to the one institution whose offer you accept (your consent, given at acceptance).",
        "To secure and improve the service (legitimate interest).",
        "Face data is biometric, special category data. We process it only to verify that you are the person on your document and to stop duplicate or fraudulent accounts.",
      ],
    },
    {
      heading: "3. Who receives it",
      body: [
        "Institutions, while a request is open: an anonymous profile only, such as amount, product, income band, debt ratios, age and risk scores. Never your name, contact details, identity number or employer.",
        "The institution whose offer you accept: the identifying details shown to you before you confirm.",
        "Service providers that process data for us under contract: Supabase (database and file storage), Vercel and Railway (hosting), Amazon Web Services and Google Cloud (document reading and face comparison), Anthropic (the Fia assistant and document reading) and Resend (email).",
        "Authorities, when the law requires it.",
        "We do not sell your data.",
      ],
    },
    {
      heading: "4. Transfers outside Mauritius",
      body: [
        "Some of these providers store or process data outside Mauritius. We use them only with safeguards required by the Data Protection Act 2017, such as contractual protections.",
      ],
    },
    {
      heading: "5. How long we keep it",
      body: [
        "While your account is open, and after you close it for at least 7 years, as anti-money-laundering law requires for identity and transaction records.",
        "When that period ends, the records are erased.",
      ],
    },
    {
      heading: "6. Security",
      body: [
        "Data is encrypted in transit and at rest. Access is restricted per user and per institution at the database level, and staff access is logged.",
      ],
    },
    {
      heading: "7. Your rights",
      body: [
        "You can ask to access, correct or erase your data, to object to or restrict its use, and to withdraw consent where we rely on it. Erasure is limited by the records we must legally keep.",
        `To use a right, write to ${CONTACT_EMAIL}. We reply within one month.`,
        "You can also complain to the Data Protection Office of Mauritius.",
      ],
    },
    {
      heading: "8. Changes",
      body: [
        "We will tell you of material changes to this notice before they take effect.",
      ],
    },
  ],
};
