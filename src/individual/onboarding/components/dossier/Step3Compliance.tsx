import { Controller }     from "react-hook-form";
import type { Control, UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { Field, Input, Select } from "@/shared/ui";
import { WEALTH_OPTIONS }  from "@/individual/onboarding/config/dossierOptions";
import type { DossierInput, DossierData } from "@/individual/onboarding/types/dossier";
import type { HealthResult } from "@/individual/onboarding/utils/calcHealth";

interface Step3Props {
  control:        Control<DossierInput>;
  register:       UseFormRegister<DossierInput>;
  errors:         FieldErrors<DossierInput>;
  setValue:       UseFormSetValue<DossierInput>;
  isPep:          boolean;
  sourceOfWealth: DossierData["sourceOfWealth"];
  h:              HealthResult;
  submitError:    string | null;
  isSubmitting:   boolean;
}

export function Step3Compliance({
  control, register, errors, setValue, isPep, sourceOfWealth,
  h, submitError, isSubmitting,
}: Step3Props) {
  return (
    <div className="flex flex-col gap-6 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h2 className="font-display text-2xl font-bold">Almost done.</h2>
        <p className="text-sm text-muted mt-1">Required by financial regulations — takes 1 minute</p>
      </div>

      {/* Source of wealth */}
      <div>
        <div className="text-sm font-semibold text-ink mb-3">Where does your money primarily come from?</div>
        <div className="grid grid-cols-4 gap-2">
          {WEALTH_OPTIONS.map((opt) => {
            const active = sourceOfWealth === opt.value;
            return (
              <button key={opt.value} type="button"
                onClick={() => setValue("sourceOfWealth", opt.value as DossierData["sourceOfWealth"], { shouldValidate: true })}
                className={[
                  "flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-[1.5px] transition-all",
                  active
                    ? "bg-ficium border-ficium text-white shadow-md shadow-ficium/20 scale-[1.04]"
                    : "bg-white border-ink/10 hover:border-ficium/40",
                ].join(" ")}>
                <span className="text-2xl leading-none">{opt.icon}</span>
                <span className={["text-[11px] font-semibold", active ? "text-white" : "text-ink"].join(" ")}>{opt.label}</span>
                {active && <Check size={10} className="text-white" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
        {sourceOfWealth === "other" && (
          <div className="mt-3">
            <Field label="Please specify" htmlFor="sourceOfWealthOther" error={errors.sourceOfWealthOther?.message}>
              <Input id="sourceOfWealthOther" {...register("sourceOfWealthOther")} />
            </Field>
          </div>
        )}
      </div>

      {/* Tax residency */}
      <Field label="Tax residency" htmlFor="taxResidency" hint="Country where you pay tax">
        <Select id="taxResidency" {...register("taxResidency")}>
          <option value="MU">🇲🇺 Mauritius</option>
          <option value="IN">🇮🇳 India</option>
          <option value="ZA">🇿🇦 South Africa</option>
          <option value="RE">🇷🇪 Réunion</option>
          <option value="SC">🇸🇨 Seychelles</option>
          <option value="FR">🇫🇷 France</option>
          <option value="GB">🇬🇧 United Kingdom</option>
          <option value="OTHER">🌍 Other</option>
        </Select>
      </Field>

      {/* PEP */}
      <div>
        <div className="text-sm font-semibold text-ink mb-2">Are you a politically exposed person (PEP)?</div>
        <div className="grid grid-cols-2 gap-3">
          <Controller control={control} name="isPep" render={({ field }) => (
            <>
              {[{ v: false, l: "No", e: "✓" }, { v: true, l: "Yes", e: "!" }].map((opt) => (
                <button key={String(opt.v)} type="button" onClick={() => field.onChange(opt.v)}
                  className={[
                    "flex items-center justify-center gap-2 py-4 rounded-2xl border-[1.5px] text-sm font-bold transition-all",
                    field.value === opt.v
                      ? opt.v ? "bg-amber-500 text-white border-amber-500" : "bg-green-500 text-white border-green-500"
                      : "bg-white text-ink border-ink/15 hover:border-ink/30",
                  ].join(" ")}>
                  <span className="text-lg">{opt.e}</span> {opt.l}
                </button>
              ))}
            </>
          )} />
        </div>
        {isPep && (
          <div className="mt-3">
            <Field label="Describe your PEP status" htmlFor="pepDetails" error={errors.pepDetails?.message}>
              <Input id="pepDetails" placeholder="Role, country, dates" {...register("pepDetails")} />
            </Field>
          </div>
        )}
      </div>

      {/* Credit history */}
      <div>
        <div className="text-sm font-semibold text-ink mb-1">Credit history</div>
        <p className="text-xs text-muted mb-3">Have any of these ever applied to you?</p>
        <div className="flex flex-col gap-2">
          {[
            { name: "missedRepayments" as const, label: "Missed loan repayments",         icon: "⚠️" },
            { name: "blacklisted"      as const, label: "Blacklisted by a credit bureau", icon: "🚫" },
            { name: "bankruptcy"       as const, label: "Declared bankruptcy",             icon: "📉" },
            { name: "legalDisputes"    as const, label: "Legal financial disputes",        icon: "⚖️" },
          ].map((item) => (
            <Controller key={item.name} control={control} name={item.name} render={({ field }) => (
              <button type="button" onClick={() => field.onChange(!field.value)}
                className={[
                  "flex items-center gap-3 px-4 py-3.5 rounded-2xl border-[1.5px] text-left transition-all",
                  field.value
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-white border-ink/8 text-ink hover:border-ink/20",
                ].join(" ")}>
                <span className="text-xl w-7 text-center">{item.icon}</span>
                <span className="text-sm font-medium flex-1">{item.label}</span>
                <div className={["w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0",
                  field.value ? "bg-red-500 border-red-500" : "border-ink/20"].join(" ")}>
                  {field.value && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            )} />
          ))}
        </div>
      </div>

      {/* Privacy note */}
      <div className="flex gap-3 px-4 py-3 bg-ficium/4 border border-ficium/15 rounded-2xl">
        <span className="text-lg shrink-0">🔒</span>
        <p className="text-[12px] text-ink/70 leading-relaxed">
          Banks see your profile anonymized — never your name or contact details — until you accept a bid.
        </p>
      </div>

      {/* Score encouragement */}
      {h.score >= 50 && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-linear-to-r from-ficium/10 to-mint/10 border border-ficium/20 rounded-2xl">
          <Sparkles size={20} className="text-ficium shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-ink">Score: {h.score}/100 — {h.label}</p>
            <p className="text-[12px] text-muted">{h.insight}</p>
          </div>
        </div>
      )}

      {submitError && (
        <div role="alert" className="px-4 py-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-[13px]">
          {submitError}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}
        className="w-full py-4 rounded-2xl bg-ficium text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-ficium/90 transition-all disabled:opacity-60 shadow-lg shadow-ficium/25">
        {isSubmitting
          ? <><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Saving…</>
          : <>Complete my profile <ArrowRight size={18} /></>
        }
      </button>
    </div>
  );
}
