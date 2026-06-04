// =============================================================
// Ficium Admin — KYC Settings
// Toggles for each KYC check stored in Supabase kyc_settings table.
// Changes take effect immediately on next submission.
// =============================================================
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../shared/lib/supabase";

/* ---------- Types ---------- */

export interface KycSettings {
  id:                    number;
  ai_analysis:           boolean;
  face_match:            boolean;
  duplicate_face:        boolean;
  ocr_name_match:        boolean;
  proof_of_address:      boolean;
  velocity_check:        boolean;
  document_reuse:        boolean;
  liveness_check:        boolean;
  mrz_validation:        boolean;
  permit_check:          boolean;
  updated_at:            string;
}

const CHECKS: {
  key:    keyof Omit<KycSettings, "id" | "updated_at">;
  label:  string;
  desc:   string;
  icon:   string;
  risk:   "high" | "medium" | "low";
}[] = [
  {
    key:   "face_match",
    label: "Face Match",
    desc:  "Compare selfie to ID photo using AWS Rekognition CompareFaces.",
    icon:  "👤",
    risk:  "high",
  },
  {
    key:   "duplicate_face",
    label: "Duplicate Face Detection",
    desc:  "Check if this face is already registered under another account.",
    icon:  "👥",
    risk:  "high",
  },
  {
    key:   "ai_analysis",
    label: "AI Fraud Analysis",
    desc:  "Claude AI cross-checks OCR text + ID image for tampering, name/DOB mismatches and fraud patterns.",
    icon:  "🤖",
    risk:  "high",
  },
  {
    key:   "ocr_name_match",
    label: "OCR Name Match",
    desc:  "Extract text from ID and verify name matches user-provided details.",
    icon:  "📄",
    risk:  "medium",
  },
  {
    key:   "proof_of_address",
    label: "Proof of Address Check",
    desc:  "Run OCR on proof of address document and verify it is a valid utility bill or bank statement.",
    icon:  "🏠",
    risk:  "medium",
  },
  {
    key:   "mrz_validation",
    label: "MRZ Validation",
    desc:  "Parse machine-readable zone on passports to verify document authenticity and expiry.",
    icon:  "🛂",
    risk:  "medium",
  },
  {
    key:   "velocity_check",
    label: "Velocity Check",
    desc:  "Flag users submitting too many KYC attempts in a short period.",
    icon:  "⏱️",
    risk:  "medium",
  },
  {
    key:   "document_reuse",
    label: "Document Reuse Check",
    desc:  "Prevent the same document number from being used across multiple accounts.",
    icon:  "🔁",
    risk:  "medium",
  },
  {
    key:   "permit_check",
    label: "Work / Student Permit Check",
    desc:  "Validate permit document for non-citizen residents — name match and expiry check.",
    icon:  "📋",
    risk:  "low",
  },
  {
    key:   "liveness_check",
    label: "Liveness Detection",
    desc:  "Detect if selfie is a real person vs a photo of a photo or screen.",
    icon:  "👁️",
    risk:  "low",
  },
];

const RISK_COLOURS = {
  high:   "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low:    "bg-green-50 text-green-700 border-green-200",
};

/* ---------- Hooks ---------- */

function useKycSettings() {
  return useQuery({
    queryKey: ["kyc_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_settings")
        .select("*")
        .order("id")
        .limit(1)
        .single();
      if (error) throw error;
      return data as KycSettings;
    },
  });
}

function useUpdateKycSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("kyc_settings")
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onMutate: async ({ key, value }) => {
      await qc.cancelQueries({ queryKey: ["kyc_settings"] });
      const prev = qc.getQueryData<KycSettings>(["kyc_settings"]);
      if (prev) qc.setQueryData(["kyc_settings"], { ...prev, [key]: value });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["kyc_settings"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["kyc_settings"] }),
  });
}

/* ---------- Component ---------- */

export default function KycSettings() {
  const { data: settings, isLoading, error } = useKycSettings();
  const update = useUpdateKycSetting();
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const handleToggle = async (key: string, current: boolean) => {
    await update.mutateAsync({ key, value: !current });
    setJustSaved(key);
    setTimeout(() => setJustSaved(null), 1500);
  };

  const enabledCount = settings
    ? CHECKS.filter(c => settings[c.key]).length
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-ficium border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
        <p className="font-semibold mb-1">Could not load KYC settings</p>
        <p className="text-red-500 text-xs">Run the migration SQL in Supabase to create the kyc_settings table.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header summary */}
      <div className="bg-white rounded-2xl border border-ink/[0.07] p-5 flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-[18px] text-ink">KYC verification checks</h2>
          <p className="text-[13px] text-muted mt-0.5">
            Toggle each check on or off. Changes take effect on the next submission.
          </p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-ficium font-display">{enabledCount}</div>
          <div className="text-[11px] text-muted">of {CHECKS.length} active</div>
        </div>
      </div>

      {/* Warning if high-risk checks disabled */}
      {CHECKS.filter(c => c.risk === "high" && !settings[c.key]).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex gap-3 items-start">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-[13px] font-semibold text-amber-800">High-risk checks disabled</p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              {CHECKS.filter(c => c.risk === "high" && !settings[c.key]).map(c => c.label).join(", ")} {" "}
              {CHECKS.filter(c => c.risk === "high" && !settings[c.key]).length === 1 ? "is" : "are"} disabled.
              This significantly reduces fraud detection capability.
            </p>
          </div>
        </div>
      )}

      {/* Check toggles */}
      <div className="space-y-3">
        {CHECKS.map(check => {
          const enabled = settings[check.key] as boolean;
          const saving  = update.isPending && justSaved === null;
          return (
            <div
              key={check.key}
              className={[
                "bg-white rounded-2xl border transition-all p-5 flex items-center gap-4",
                enabled ? "border-ink/[0.07]" : "border-ink/[0.04] opacity-60",
              ].join(" ")}
            >
              {/* Icon */}
              <div className={[
                "w-11 h-11 rounded-xl grid place-items-center text-xl flex-shrink-0 transition-all",
                enabled ? "bg-ficium/10" : "bg-ink/[0.04]",
              ].join(" ")}>
                {check.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[14px] text-ink">{check.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${RISK_COLOURS[check.risk]}`}>
                    {check.risk} impact
                  </span>
                  {justSaved === check.key && (
                    <span className="text-[11px] text-green-600 font-semibold">✓ Saved</span>
                  )}
                </div>
                <p className="text-[12px] text-muted mt-0.5 leading-relaxed">{check.desc}</p>
              </div>

              {/* Toggle */}
              <button
                onClick={() => handleToggle(check.key, enabled)}
                disabled={saving}
                className={[
                  "relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0 focus:outline-none",
                  enabled ? "bg-ficium" : "bg-ink/20",
                  saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
                aria-label={`${enabled ? "Disable" : "Enable"} ${check.label}`}
              >
                <span className={[
                  "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200",
                  enabled ? "left-6" : "left-0.5",
                ].join(" ")} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Last updated */}
      <p className="text-[11px] text-muted text-right">
        Last updated: {new Date(settings.updated_at).toLocaleString("en-MU")}
      </p>
    </div>
  );
}
