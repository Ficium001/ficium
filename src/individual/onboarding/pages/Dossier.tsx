import { useState, useMemo, useEffect } from "react";
import { useNavigate }    from "react-router-dom";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { zodResolver }    from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 }        from "lucide-react";
import { submitDossier, getDossier, previewScores } from "@/individual/onboarding/api/dossier";
import { dossierSchema }  from "@/individual/onboarding/types/dossier";
import type { DossierInput, DossierData } from "@/individual/onboarding/types/dossier";
import { calcHealth, summarise } from "@/individual/onboarding/utils/calcHealth";
import {
  DoneScreen, StepHeader, HealthBar,
} from "@/individual/onboarding/components/dossier/DossierShared";
import { Step1Employment } from "@/individual/onboarding/components/dossier/Step1Employment";
import { Step2AssetsLoans } from "@/individual/onboarding/components/dossier/Step2AssetsLoans";
import { Step3Compliance } from "@/individual/onboarding/components/dossier/Step3Compliance";

// ─────────────────────────────────────────────────────────────────────────────
// Dossier — thin orchestrator.
// Owns form state, step navigation, and submit. Renders nothing itself.
// Opens with the saved profile filled in, so "Update financial profile" edits
// it rather than starting from blank and overwriting it.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS: DossierInput = {
  employmentStatus: undefined as unknown as DossierInput["employmentStatus"],
  monthlyIncome: 0, additionalIncome: 0, dependants: 0,
  hasExistingLoans: false, loans: [],
  savings: 0, investments: 0, propertyValue: 0, vehicleValue: 0, businessAssets: 0, otherAssets: 0,
  taxResidency: "MU", isPep: false,
  missedRepayments: false, blacklisted: false, bankruptcy: false, legalDisputes: false,
};

/** Waits this long after the last keystroke before asking the database for a score. */
const PREVIEW_DEBOUNCE_MS = 400;

export default function Dossier() {
  const navigate = useNavigate();
  const [step,        setStep]        = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [saved,       setSaved]       = useState<{ score: number | null } | null>(null);
  const [preview,     setPreview]     = useState<number | null>(null);
  const queryClient = useQueryClient();

  const loaded = useQuery({ queryKey: ["dossier"], queryFn: getDossier, staleTime: 0 });
  const isUpdate = !!loaded.data?.exists;

  const form = useForm<DossierInput, unknown, DossierData>({
    resolver: zodResolver(dossierSchema),
    mode: "onTouched",
    defaultValues: DEFAULTS,
  });

  const { register, handleSubmit, control, setValue, trigger, reset, formState: { errors, isSubmitting } } = form;

  useEffect(() => {
    if (loaded.data?.exists) reset({ ...DEFAULTS, ...loaded.data.values });
  }, [loaded.data, reset]);

  const allWatched       = useWatch({ control });
  const employmentStatus = useWatch({ control, name: "employmentStatus" });
  const hasLoans         = useWatch({ control, name: "hasExistingLoans" });
  const isPep            = useWatch({ control, name: "isPep" });
  const sourceOfWealth   = useWatch({ control, name: "sourceOfWealth" });

  const { fields: loanFields, append: appendLoan, remove: removeLoan } = useFieldArray({ control, name: "loans" });

  // Live score: the same database formula that scores the saved profile.
  const watched = allWatched as unknown as Partial<DossierInput>;
  const totals  = useMemo(() => summarise(watched), [watched]);
  const previewKey = JSON.stringify([
    totals.totalIncome, totals.netWorth, totals.totalAssets, totals.totalRepayment,
    watched.employmentStatus, watched.annualRevenue, watched.isPep, watched.bankruptcy,
    watched.blacklisted, watched.missedRepayments, watched.legalDisputes,
  ]);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const score = await previewScores({
        income: totals.totalIncome, employmentStatus: watched.employmentStatus,
        netWorth: totals.netWorth, totalAssets: totals.totalAssets,
        monthlyRepayment: totals.totalRepayment, annualRevenue: Number(watched.annualRevenue) || 0,
        isPep: watched.isPep, bankruptcy: watched.bankruptcy, blacklisted: watched.blacklisted,
        missedRepayments: watched.missedRepayments, legalDisputes: watched.legalDisputes,
      });
      if (!cancelled) setPreview(score);
    }, PREVIEW_DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(t); };
    // previewKey captures every input the score reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey]);

  const h = useMemo(() => calcHealth(watched, preview), [watched, preview]);

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
    }, { isUpdate });
    if (!result.ok) { setSubmitError(result.error); return; }
    // Everything that shows these figures re-reads them from the database.
    for (const key of [["dossier"], ["profile"], ["financial_snapshot"]]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
    setSaved({ score: result.healthScore });
    setTimeout(() => navigate("/dashboard"), 2200);
  };

  if (saved) return <DoneScreen h={calcHealth(watched, saved.score)} isUpdate={isUpdate} />;

  if (loaded.isLoading) {
    return (
      <div className="min-h-screen bg-paper grid place-items-center">
        <Loader2 size={24} className="text-ficium animate-spin" />
      </div>
    );
  }

  if (loaded.isError) {
    return (
      <div className="min-h-screen bg-paper grid place-items-center px-6 text-center">
        <div>
          <p className="text-[14px] font-semibold text-ink">We couldn't load your financial profile.</p>
          <button onClick={() => loaded.refetch()} className="mt-3 text-[13px] font-bold text-ficium hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const itemised = loaded.data?.itemised;
  const locked = {
    ...(itemised?.accounts ? { savings: "Kept in Money → Accounts. Change it there." } : {}),
    ...(itemised?.holdings ? { investments: "Kept in Money → Accounts (holdings). Change it there." } : {}),
  };

  const onBack = () => step > 1 ? setStep((s) => s - 1) : window.history.back();

  return (
    <div className="min-h-screen bg-paper">
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
              locked={locked} onNext={goNext}
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
