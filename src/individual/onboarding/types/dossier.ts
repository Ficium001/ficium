import { z } from "zod";

// ── Loan sub-schema ───────────────────────────────────────────────────────────
export const loanSchema = z.object({
  loanType:          z.enum(["personal","mortgage","vehicle","business","credit_card","other"]),
  outstandingAmount: z.number().min(0).max(1_000_000_000),
  monthlyRepayment:  z.number().min(0).max(10_000_000),
  bankName:          z.string().trim().min(1,"Bank name required").max(100),
  remainingMonths:   z.number().int().min(0).max(600).optional().or(z.nan().transform(()=>undefined)),
});

// ── Main schema ───────────────────────────────────────────────────────────────
export const dossierSchema = z.object({
  employmentStatus:     z.enum(["employed","self_employed","business_owner","freelance","retired","student","unemployed"]),
  monthlyIncome:        z.number().min(0).max(100_000_000),
  additionalIncome:     z.number().min(0).max(100_000_000).default(0),
  dependants:           z.number().int().min(0).max(20).default(0),
  employerName:         z.string().max(150).optional().or(z.literal("")),
  industry:             z.string().max(100).optional().or(z.literal("")),
  jobTitle:             z.string().max(100).optional().or(z.literal("")),
  yearsOfEmployment:    z.number().min(0).max(80).optional().or(z.nan().transform(()=>undefined)),
  employmentType:       z.enum(["permanent","contract","temporary"]).optional(),
  workEmail:            z.string().email("Invalid work email").optional().or(z.literal("")),
  businessName:         z.string().max(150).optional().or(z.literal("")),
  brnNumber:            z.string().max(40).optional().or(z.literal("")),
  yearsInBusiness:      z.number().min(0).max(100).optional().or(z.nan().transform(()=>undefined)),
  averageMonthlyRevenue:z.number().min(0).optional().or(z.nan().transform(()=>undefined)),
  taxRegistrationNumber:z.string().max(50).optional().or(z.literal("")),
  companyType:          z.string().max(60).optional().or(z.literal("")),
  numberOfEmployees:    z.number().int().min(0).max(1_000_000).optional().or(z.nan().transform(()=>undefined)),
  annualRevenue:        z.number().min(0).optional().or(z.nan().transform(()=>undefined)),
  primaryProfession:    z.string().max(120).optional().or(z.literal("")),
  primaryClientsRegion: z.string().max(120).optional().or(z.literal("")),
  pensionIncome:        z.number().min(0).optional().or(z.nan().transform(()=>undefined)),
  otherIncomeSources:   z.string().max(300).optional().or(z.literal("")),
  institutionName:      z.string().max(150).optional().or(z.literal("")),
  sponsorType:          z.enum(["parents","self","scholarship","employer","other"]).optional(),
  monthlyAllowance:     z.number().min(0).optional().or(z.nan().transform(()=>undefined)),
  savings:              z.number().min(0).max(10_000_000_000).default(0),
  investments:          z.number().min(0).max(10_000_000_000).default(0),
  propertyValue:        z.number().min(0).max(10_000_000_000).default(0),
  vehicleValue:         z.number().min(0).max(10_000_000_000).default(0),
  businessAssets:       z.number().min(0).max(10_000_000_000).default(0),
  otherAssets:          z.number().min(0).max(10_000_000_000).default(0),
  hasExistingLoans:     z.boolean(),
  loans:                z.array(loanSchema).default([]),
  sourceOfWealth:       z.enum(["salary","business","investments","inheritance","property","savings","other"]).optional(),
  sourceOfWealthOther:  z.string().max(200).optional().or(z.literal("")),
  isPep:                z.boolean().default(false),
  pepDetails:           z.string().max(300).optional().or(z.literal("")),
  taxResidency:         z.string().min(2).max(60).default("MU"),
  missedRepayments:     z.boolean().default(false),
  blacklisted:          z.boolean().default(false),
  bankruptcy:           z.boolean().default(false),
  legalDisputes:        z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.employmentStatus === "employed") {
    if (!data.employerName?.trim()) ctx.addIssue({ code:"custom", path:["employerName"], message:"Employer name required" });
    if (!data.jobTitle?.trim())     ctx.addIssue({ code:"custom", path:["jobTitle"],     message:"Job title required" });
    if (!data.employmentType)       ctx.addIssue({ code:"custom", path:["employmentType"],message:"Select employment type" });
  }
  if (data.employmentStatus === "self_employed" || data.employmentStatus === "business_owner") {
    if (!data.businessName?.trim()) ctx.addIssue({ code:"custom", path:["businessName"], message:"Business name required" });
  }
  if (data.hasExistingLoans && data.loans.length === 0)
    ctx.addIssue({ code:"custom", path:["loans"], message:"Add at least one loan" });
  if (data.isPep && !data.pepDetails?.trim())
    ctx.addIssue({ code:"custom", path:["pepDetails"], message:"Please describe your PEP status" });
  if (data.sourceOfWealth === "other" && !data.sourceOfWealthOther?.trim())
    ctx.addIssue({ code:"custom", path:["sourceOfWealthOther"], message:"Specify your source of wealth" });
});

export type DossierInput = z.input<typeof dossierSchema>;
export type DossierData  = z.infer<typeof dossierSchema>;
