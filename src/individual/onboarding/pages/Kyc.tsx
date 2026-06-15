import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Camera, Upload, ShieldCheck, MapPin, FileText, Globe } from "lucide-react";
import { submitKyc } from "../api/kyc";
import { Button, Card, Field, Input, Select } from "../../../shared/ui";

/* ---------- Schema ---------- */

const schema = z.object({
  documentType: z.enum(["national_id", "passport", "drivers_license", "other"], {
    message: "Select a document type",
  }),
  documentNumber: z.string().trim().min(4, "Document number is too short").max(40),
  dateOfBirth: z.string().min(1, "Date of birth is required").refine((s) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return false;
    const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18 && age <= 120;
  }, "You must be at least 18 years old"),
  // Nationality / residency
  sameNationalityResidence: z.boolean(),
  nationality: z.string().min(2, "Nationality is required"),
  residenceStatus: z.enum(["citizen", "permanent_resident", "work_permit", "student_permit", "other"]),
  // Address
  addressLine1: z.string().trim().min(2, "Address is required").max(200),
  addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "City is required").max(100),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().min(2, "Country is required"),
});

type FormData = z.infer<typeof schema>;

const COUNTRIES = [
  "Mauritius", "Réunion", "Madagascar", "Seychelles", "Comoros",
  "India", "South Africa", "France", "United Kingdom",
  "United States", "Canada", "China", "Other",
];

/* ---------- Page ---------- */

export default function Kyc() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [verifyStep, setVerifyStep] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      country: "Mauritius",
      nationality: "Mauritius",
      sameNationalityResidence: true,
      residenceStatus: "citizen",
    },
  });

  const sameNatRes     = useWatch({ control, name: "sameNationalityResidence" });
  const residenceStatus = useWatch({ control, name: "residenceStatus" });
  const needsPermit    = residenceStatus === "work_permit" || residenceStatus === "student_permit";

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);

    if (!idFile)    { setSubmitError("Please upload an image of your ID document."); return; }
    if (!selfieFile){ setSubmitError("Please take a selfie for verification."); return; }
    if (!proofFile) { setSubmitError("Please upload a proof of address document."); return; }
    if (needsPermit && !permitFile) { setSubmitError("Please upload your work or student permit."); return; }

    setVerifyStep("Uploading documents securely…");
    await new Promise(r => setTimeout(r, 400));
    setVerifyStep("Verifying identity document…");
    await new Promise(r => setTimeout(r, 600));
    setVerifyStep("Matching face to ID…");
    await new Promise(r => setTimeout(r, 500));
    setVerifyStep("Checking proof of address…");
    await new Promise(r => setTimeout(r, 400));
    setVerifyStep("Running fraud checks…");
    const result = await submitKyc({
      documentType:       data.documentType,
      documentNumber:     data.documentNumber,
      dateOfBirth:        data.dateOfBirth,
      idFile,
      selfieFile,
      proofOfAddressFile: proofFile,
      addressLine1:       data.addressLine1,
      addressLine2:       data.addressLine2 || undefined,
      city:               data.city,
      postalCode:         data.postalCode   || undefined,
      country:            data.country,
      nationality:        data.sameNationalityResidence ? data.country : data.nationality,
      residenceStatus:    data.residenceStatus,
      sameNationalityResidence: data.sameNationalityResidence,
      permitFile:         permitFile || undefined,
    });

    setVerifyStep(null);
    if (!result.ok) { setSubmitError(result.error); return; }
    navigate(result.needsReview ? "/onboarding/kyc-pending" : "/onboarding/dossier");
  };

  return (
    <>
    {verifyStep && (
      <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        <div className="text-center">
          <p className="text-white font-semibold text-lg">{verifyStep}</p>
          <p className="text-white/60 text-sm mt-1">This usually takes 10–20 seconds</p>
        </div>
        <div className="flex gap-2 mt-2">
          {["Uploading", "Identity", "Face", "Address", "Fraud"].map((s, i) => (
            <div key={i} className={[
              "h-1.5 w-8 rounded-full transition-all duration-500",
              verifyStep.toLowerCase().includes(s.toLowerCase()) ? "bg-white" : "bg-white/25"
            ].join(" ")} />
          ))}
        </div>
      </div>
    )}
    <div className="min-h-screen bg-paper px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[520px]">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8">
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <div className="h-1 w-8 rounded-pill bg-ink/10" />
          <span className="ml-2 text-xs text-muted">Step 2 of 3</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
          Verify your identity
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          We need to confirm who you are before banks can bid on your requests.
          Your details stay encrypted and private.
        </p>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

            {/* ── IDENTITY DOCUMENT ── */}
            <div className="text-xs font-bold tracking-[0.08em] uppercase text-muted -mb-1">
              Identity document
            </div>

            <Field label="Document type" htmlFor="documentType" error={errors.documentType?.message}>
              <Select id="documentType" defaultValue="" invalid={!!errors.documentType} {...register("documentType")}>
                <option value="" disabled>Choose a document</option>
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="other">Other</option>
              </Select>
            </Field>

            <Field label="Document number" htmlFor="documentNumber" error={errors.documentNumber?.message}>
              <Input id="documentNumber" type="text" autoComplete="off" placeholder="e.g. M1234567"
                invalid={!!errors.documentNumber} {...register("documentNumber")} />
            </Field>

            <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
              <Input id="dateOfBirth" type="date" invalid={!!errors.dateOfBirth} {...register("dateOfBirth")} />
            </Field>

            <UploadZone icon={<Upload size={20} />} title="Upload your ID document"
              hint="Clear photo of the front. JPG or PNG, max 5MB."
              file={idFile} onFile={setIdFile} inputId="idFile" />

            <UploadZone icon={<Camera size={20} />} title="Selfie verification"
              hint="A clear front-facing photo of you, in good light."
              file={selfieFile} onFile={setSelfieFile} inputId="selfieFile" capture="user" />

            {/* ── NATIONALITY & RESIDENCY ── */}
            <div className="pt-2 -mb-1 text-xs font-bold tracking-[0.08em] uppercase text-muted flex items-center gap-1.5">
              <Globe size={12} /> Nationality & residency
            </div>

            {/* Same nationality / residence toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" {...register("sameNationalityResidence")}
                className="w-4 h-4 rounded border-ink/20 text-ficium focus:ring-ficium/30 cursor-pointer" />
              <span className="text-sm text-ink">My nationality and country of residence are the same</span>
            </label>

            {/* Nationality — only shown when different */}
            {!sameNatRes && (
              <Field label="Nationality" htmlFor="nationality" error={errors.nationality?.message}>
                <Select id="nationality" invalid={!!errors.nationality} {...register("nationality")}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            )}

            <Field label="Residence status" htmlFor="residenceStatus" error={errors.residenceStatus?.message}>
              <Select id="residenceStatus" invalid={!!errors.residenceStatus} {...register("residenceStatus")}>
                <option value="citizen">Citizen</option>
                <option value="permanent_resident">Permanent Resident</option>
                <option value="work_permit">Work Permit Holder</option>
                <option value="student_permit">Student Permit Holder</option>
                <option value="other">Other</option>
              </Select>
            </Field>

            {/* Permit upload — conditional */}
            {needsPermit && (
              <UploadZone
                icon={<FileText size={20} />}
                title={residenceStatus === "work_permit" ? "Upload work permit" : "Upload student permit"}
                hint="Clear photo or scan of your valid permit. JPG, PNG or PDF, max 5MB."
                file={permitFile}
                onFile={setPermitFile}
                inputId="permitFile"
                accept="image/jpeg,image/png,application/pdf"
              />
            )}

            {/* ── ADDRESS ── */}
            <div className="pt-2 -mb-1 text-xs font-bold tracking-[0.08em] uppercase text-muted flex items-center gap-1.5">
              <MapPin size={12} /> Address
            </div>

            <Field label="Address line 1" htmlFor="addressLine1" error={errors.addressLine1?.message}>
              <Input id="addressLine1" type="text" autoComplete="address-line1" placeholder="Street + number"
                invalid={!!errors.addressLine1} {...register("addressLine1")} />
            </Field>

            <Field label="Address line 2" htmlFor="addressLine2" optional error={errors.addressLine2?.message}>
              <Input id="addressLine2" type="text" autoComplete="address-line2" placeholder="Apartment, floor, etc."
                invalid={!!errors.addressLine2} {...register("addressLine2")} />
            </Field>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="City" htmlFor="city" error={errors.city?.message}>
                <Input id="city" type="text" autoComplete="address-level2"
                  invalid={!!errors.city} {...register("city")} />
              </Field>
              <Field label="Postal code" htmlFor="postalCode" optional error={errors.postalCode?.message}>
                <Input id="postalCode" type="text" autoComplete="postal-code" {...register("postalCode")} />
              </Field>
            </div>

            <Field label="Country of residence" htmlFor="country" error={errors.country?.message}>
              <Select id="country" invalid={!!errors.country} {...register("country")}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>

            {/* ── PROOF OF ADDRESS ── */}
            <div className="pt-2 -mb-1 text-xs font-bold tracking-[0.08em] uppercase text-muted flex items-center gap-1.5">
              <FileText size={12} /> Proof of address
            </div>

            <UploadZone
              icon={<FileText size={20} />}
              title="Upload proof of address"
              hint="Utility bill, bank statement or official letter dated within 3 months. If your utility bill is not in your name, use your bank statement instead. JPG, PNG or PDF, max 5MB."
              file={proofFile}
              onFile={setProofFile}
              inputId="proofFile"
              accept="image/jpeg,image/png,application/pdf"
            />

            {/* Privacy reassurance */}
            <div className="flex gap-3 px-3.5 py-3 bg-ficium/[0.04] border border-ficium/15 rounded-xl">
              <ShieldCheck size={20} className="text-ficium flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-ink/80 leading-relaxed">
                Your documents are encrypted and only used for verification. Banks never see them.
              </p>
            </div>

            {submitError && (
              <div role="alert" className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]">
                {submitError}
              </div>
            )}

            <Button type="submit" size="lg" loading={isSubmitting}
              rightIcon={!isSubmitting && <ArrowRight size={18} />} fullWidth className="mt-2">
              {isSubmitting ? "Verifying…" : "Continue"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
    </>
  );
}

/* ---------- Upload zone ---------- */

function UploadZone({
  icon, title, hint, file, onFile, inputId, capture, accept = "image/jpeg,image/png",
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  inputId: string;
  capture?: "user" | "environment";
  accept?: string;
}) {
  return (
    <label htmlFor={inputId} className={[
      "block cursor-pointer rounded-xl border-[1.5px] border-dashed transition-colors px-4 py-5",
      file ? "bg-good/[0.10] border-good" : "bg-surface border-ink/15 hover:border-ficium/50 hover:bg-ficium/[0.03]",
    ].join(" ")}>
      <div className="flex items-start gap-3">
        <div className={["w-10 h-10 rounded-xl grid place-items-center flex-shrink-0", file ? "bg-good/15 text-good" : "bg-ficium/10 text-ficium"].join(" ")}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">{title}</div>
          <div className="text-xs text-muted mt-0.5">{hint}</div>
          {file && <div className="mt-2 text-xs font-medium text-ink/80 truncate">✓ {file.name}</div>}
        </div>
      </div>
      <input id={inputId} type="file" accept={accept} capture={capture} className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </label>
  );
}
