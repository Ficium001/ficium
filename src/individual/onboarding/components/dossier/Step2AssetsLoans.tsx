import { Controller }     from "react-hook-form";
import type { Control, UseFormRegister, FieldErrors } from "react-hook-form";
import type { FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove } from "react-hook-form";
import { TrendingUp, Plus, Trash2, ChevronRight } from "lucide-react";
import { Field, Input, Select } from "@/shared/ui";
import { ASSET_ROWS }    from "@/individual/onboarding/config/dossierOptions";
import { StepButton, formatMUR } from "./DossierShared";
import type { DossierInput } from "@/individual/onboarding/types/dossier";
import type { HealthResult } from "@/individual/onboarding/utils/calcHealth";

interface Step2Props {
  control:          Control<DossierInput>;
  register:         UseFormRegister<DossierInput>;
  errors:           FieldErrors<DossierInput>;
  allWatched:       Partial<DossierInput>;
  hasLoans:         boolean;
  h:                HealthResult;
  expandedAsset:    string | null;
  setExpandedAsset: (name: string | null) => void;
  loanFields:       FieldArrayWithId<DossierInput, "loans">[];
  appendLoan:       UseFieldArrayAppend<DossierInput, "loans">;
  removeLoan:       UseFieldArrayRemove;
  onNext:           () => void;
}

export function Step2AssetsLoans({
  control, register, errors, allWatched, hasLoans, h,
  expandedAsset, setExpandedAsset, loanFields, appendLoan, removeLoan, onNext,
}: Step2Props) {
  return (
    <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="font-display text-2xl font-bold">What do you own?</h2>
        <p className="text-sm text-muted mt-1">Tap each category to add a value</p>
      </div>

      {/* Asset accordion */}
      <div className="flex flex-col gap-2">
        {ASSET_ROWS.map((row) => {
          const isOpen = expandedAsset === row.name;
          const val    = Number((allWatched as Record<string, unknown>)[row.name]) || 0;
          return (
            <div key={row.name} className={[
              "rounded-2xl border overflow-hidden transition-all",
              isOpen ? "border-ficium/40 bg-white shadow-xs" : "border-ink/[0.07] bg-white",
            ].join(" ")}>
              <button type="button" onClick={() => setExpandedAsset(isOpen ? null : row.name)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                <span className="text-2xl w-8 text-center">{row.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-[14px]">{row.label}</div>
                  <div className="text-xs text-muted">{row.desc}</div>
                </div>
                <div className="text-right">
                  <div className={["text-sm font-bold", val > 0 ? "text-ficium" : "text-muted"].join(" ")}>
                    {val > 0 ? formatMUR(val) : "Rs 0"}
                  </div>
                  <ChevronRight size={14} className={["text-muted transition-transform", isOpen ? "rotate-90" : ""].join(" ")} />
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                  <Input type="number" inputMode="numeric" placeholder="0" autoFocus
                    {...register(row.name, { valueAsNumber: true })} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Net worth ticker */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-ink text-white">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} />
          <span className="font-semibold">Total net worth</span>
        </div>
        <span className="font-display text-2xl font-bold">{formatMUR(h.totalAssets)}</span>
      </div>

      {/* Loans */}
      <div>
        <h2 className="font-display text-xl font-bold mb-1">Existing loans?</h2>
        <p className="text-sm text-muted mb-4">Banks use this for affordability checks</p>
        <div className="flex gap-3 mb-4">
          <Controller control={control} name="hasExistingLoans" render={({ field }) => (
            <>
              {[{ v: false, l: "No loans 🎉" }, { v: true, l: "Yes, I have loans" }].map((opt) => (
                <button key={String(opt.v)} type="button" onClick={() => field.onChange(opt.v)}
                  className={[
                    "flex-1 py-3 rounded-2xl text-sm font-semibold border-[1.5px] transition-all",
                    field.value === opt.v ? "bg-ink text-white border-ink" : "bg-white text-ink border-ink/15 hover:border-ink/30",
                  ].join(" ")}>
                  {opt.l}
                </button>
              ))}
            </>
          )} />
        </div>

        {hasLoans && (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {h.totalRepayment > 0 && h.totalIncome > 0 && (
              <div className={`px-4 py-3 rounded-xl text-[13px] font-medium border ${
                h.dti < 30 ? "bg-green-50 border-green-200 text-green-700"
                : h.dti < 45 ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-red-50 border-red-200 text-red-700"
              }`}>
                Debt-to-income: <strong>{h.dti.toFixed(0)}%</strong> —{" "}
                {h.dti < 30 ? "Great. Banks will be comfortable with this."
                  : h.dti < 45 ? "Moderate. May affect some rates."
                  : "High. This could limit your bids."}
              </div>
            )}

            {loanFields.map((field, i) => (
              <div key={field.id} className="p-4 rounded-2xl bg-white border border-ink/[0.07]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold">Loan #{i + 1}</span>
                  <button type="button" onClick={() => removeLoan(i)} className="text-muted hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Type" htmlFor={`loans.${i}.loanType`}>
                    <Select id={`loans.${i}.loanType`} defaultValue="" {...register(`loans.${i}.loanType` as const)}>
                      <option value="" disabled>Type</option>
                      <option value="personal">Personal</option>
                      <option value="mortgage">Mortgage</option>
                      <option value="vehicle">Vehicle</option>
                      <option value="business">Business</option>
                      <option value="credit_card">Credit card</option>
                      <option value="other">Other</option>
                    </Select>
                  </Field>
                  <Field label="Bank" htmlFor={`loans.${i}.bankName`} error={errors.loans?.[i]?.bankName?.message}>
                    <Input id={`loans.${i}.bankName`} {...register(`loans.${i}.bankName` as const)} />
                  </Field>
                  <Field label="Outstanding (MUR)" htmlFor={`loans.${i}.outstandingAmount`}>
                    <Input id={`loans.${i}.outstandingAmount`} type="number" inputMode="numeric" {...register(`loans.${i}.outstandingAmount` as const, { valueAsNumber: true })} />
                  </Field>
                  <Field label="Monthly repayment" htmlFor={`loans.${i}.monthlyRepayment`}>
                    <Input id={`loans.${i}.monthlyRepayment`} type="number" inputMode="numeric" {...register(`loans.${i}.monthlyRepayment` as const, { valueAsNumber: true })} />
                  </Field>
                </div>
              </div>
            ))}

            <button type="button"
              onClick={() => appendLoan({ loanType: "personal", outstandingAmount: 0, monthlyRepayment: 0, bankName: "" })}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-ink/15 rounded-2xl text-sm font-semibold text-muted hover:border-ficium hover:text-ficium transition-colors">
              <Plus size={16} /> Add another loan
            </button>
            {errors.loans?.message && <p className="text-xs text-red-600">{errors.loans.message as string}</p>}
          </div>
        )}
      </div>

      <StepButton onClick={onNext} />
    </div>
  );
}
