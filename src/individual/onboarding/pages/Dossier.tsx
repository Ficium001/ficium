import { useState, useMemo, useEffect } from "react";
import { useNavigate }    from "react-router-dom";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver }    from "@hookform/resolvers/zod";
import { submitDossier }  from "@/individual/onboarding/api/dossier";
import { dossierSchema }  from "@/individual/onboarding/types/dossier";
import type { DossierInput, DossierData } from "@/individual/onboarding/types/dossier";
import { calcHealth }     from "@/individual/onboarding/utils/calcHealth";
import {
  DoneScreen, StepHeader, HealthBar,
} from "@/individual/onboarding/components/dossier/DossierShared";
import { Step1Employment } from "@/individual/onboarding/components/dossier/Step1Employment";
import { Step2AssetsLoans } from "@/individual/onboarding/components/dossier/Step2AssetsLoans";
import { Step3Compliance } from "@/individual/onboarding/components/dossier/Step3Compliance";

// ─────────────────────────────────────────────────────────────────────────────
// Dossier — thin orchestrator.
// Owns form state, step navigation, and submit. Renders nothing itself.
// ─────────────────────────────────────────────────────────────────────────────

export default function Dossier() {
  const navigate = useNavigate();
  const [step,        setStep]        = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [done,        setDone]        = useState(false);

  const form = useForm<DossierInput, unknown, DossierData>({
    resolver: zodResolver(dossierSchema),
    mode: "onTouched",
    defaultValues: {
      employmentStatus: undefined, monthlyIncome: 0, additionalIncome: 0, dependants: 0,
      hasExistingLoans: false, loans: [],
      savings: 0, investments: 0, propertyValue: 0, vehicleValue: 0, businessAssets: 0, otherAssets: 0,
      taxResidency: "MU", isPep: false,
      missedRepayments: false, blacklisted: false, bankruptcy: false, legalDisputes: false,
    },
  });

  const { register, handleSubmit, control, setValue, trigger, formState: { errors, isSubmitting } } = form;

  const allWatched       = useWatch({ control });
  const employmentStatus = useWatch({ control, name: "employmentStatus" });
  const hasLoans         = useWatch({ control, name: "hasExistingLoans" });
  const isPep            = useWatch({ control, name: "isPep" });
  const sourceOfWealth   = useWatch({ control, name: "sourceOfWealth" });

  const { fields: loanFields, append: appendLoan, remove: removeLoan } = useFieldArray({ control, name: "loans" });

  const h = useMemo(() => calcHealth(allWatched as unknown as Partial<DossierInput>), [allWatched]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const goNext = async () => {
    const fields: (keyof DossierData)[] = step === 1
      ? ["employmentStatus","monthlyIncome","dependants","employerName","jobTitle","employmentType","businessName"]
      : ["savings","investments","propertyValue","vehicleValue","businessAssets","otherAssets","loans"];
    const ok = await trigger(fields);
    if (ok) setStep((s) => s + 1);
  };

  const onSubmit = async (data: DossierData) => {
    setSubmitError(null);
    const result = await submitDossier({
      employmentStatus: data.employmentStatus,
      monthlyIncome: data.monthlyIncome, additionalIncome: data.additionalIncome, dependants: data.dependants,
      employmentDetails: {
        employerName: data.employerName||undefined, industry: data.industry||undefined,
        jobTitle: data.jobTitle||undefined, yearsOfEmployment: data.yearsOfEmployment,
        employmentType: data.employmentType, workEmail: data.workEmail||undefined,
        businessName: data.businessName||undefined, brnNumber: data.brnNumber||undefined,
        yearsInBusiness: data.yearsInBusiness, averageMonthlyRevenue: data.averageMonthlyRevenue,
        taxRegistrationNumber: data.taxRegistrationNumber||undefined,
        companyType: data.companyType||undefined, numberOfEmployees: data.numberOfEmployees,
        annualRevenue: data.annualRevenue, primaryProfession: data.primaryProfession||undefined,
        primaryClientsRegion: data.primaryClientsRegion||undefined,
        pensionIncome: data.pensionIncome, otherIncomeSources: data.otherIncomeSources||undefined,
        institutionName: data.institutionName||undefined, sponsorType: data.sponsorType,
        monthlyAllowance: data.monthlyAllowance, partTimeEmployment: false,
      },
      assets: { savings: data.savings, investments: data.investments, propertyValue: data.propertyValue,
        vehicleValue: data.vehicleValue, businessAssets: data.businessAssets, otherAssets: data.otherAssets },
      hasExistingLoans: data.hasExistingLoans, loans: data.loans,
      compliance: {
        sourceOfWealth: data.sourceOfWealth, sourceOfWealthOther: data.sourceOfWealthOther||undefined,
        isPep: data.isPep, pepDetails: data.pepDetails||undefined, taxResidency: data.taxResidency,
        missedRepayments: data.missedRepayments, blacklisted: data.blacklisted,
        bankruptcy: data.bankruptcy, legalDisputes: data.legalDisputes,
      },
    });
    if (!result.ok) { setSubmitError(result.error); return; }
    setDone(true);
    setTimeout(() => navigate("/dashboard"), 2200);
  };

  if (done) return <DoneScreen h={h} />;

  const onBack = () => step > 1 ? setStep((s) => s - 1) : window.history.back();

  return (
    <div className="min-h-screen bg-cream">
      <StepHeader step={step} h={h} onBack={onBack} />
      <HealthBar h={h} />

      <div className="mx-auto max-w-[600px] px-5 pb-16">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {step === 1 && (
            <Step1Employment
              control={control} register={register} errors={errors}
              setValue={setValue} employmentStatus={employmentStatus}
              onNext={goNext}
            />
          )}
          {step === 2 && (
            <Step2AssetsLoans
              control={control} register={register} errors={errors}
              allWatched={allWatched as unknown as Partial<DossierInput>} hasLoans={!!hasLoans} h={h}
              expandedAsset={expandedAsset} setExpandedAsset={setExpandedAsset}
              loanFields={loanFields} appendLoan={appendLoan} removeLoan={removeLoan}
              onNext={goNext}
            />
          )}
          {step === 3 && (
            <Step3Compliance
              control={control} register={register} errors={errors}
              setValue={setValue} isPep={!!isPep}
              sourceOfWealth={sourceOfWealth as DossierData["sourceOfWealth"]}
              h={h} submitError={submitError} isSubmitting={isSubmitting}
            />
          )}
        </form>
      </div>
    </div>
  );
}
