import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ScanLine } from "lucide-react";
import { signUpIndividual } from "../../../shared/lib/auth";
import { scanIdDocument } from "../../../shared/lib/kycScan";
import { RegisterShell } from "../../../shared/components/RegisterShell";
import { Button, Field, Input, Select, UploadZone, ScanStatusBanner } from "../../../shared/ui";

const schema = z.object({
  title: z.string().optional(),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  sex: z.enum(["M", "F"]).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().min(2, "Country is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const COUNTRIES = [
  "Mauritius", "Réunion", "Madagascar", "Seychelles", "Comoros",
  "India", "South Africa", "France", "United Kingdom",
  "United States", "Canada", "Australia", "Other",
];

export default function RegisterIndividual() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { country: "Mauritius" },
  });

  /**
   * Scan NIC at signup — prefills name/sex/date of birth from the ID
   * photo so they don't need to be typed twice. Best-effort and always
   * editable: nothing here is trusted silently, and the full document
   * capture + biometric verification still happens later at the KYC
   * step regardless of what this finds.
   */
  const runScan = async (file: File) => {
    setScanState("scanning");
    setScanMessage(null);
    try {
      const result = await scanIdDocument(file);
      if (result.found && (result.firstName || result.lastName || result.sex || result.dateOfBirth)) {
        if (result.firstName)   setValue("firstName", result.firstName, { shouldValidate: true, shouldDirty: true });
        if (result.lastName)    setValue("lastName", result.lastName, { shouldValidate: true, shouldDirty: true });
        if (result.sex)         setValue("sex", result.sex, { shouldValidate: true, shouldDirty: true });
        if (result.dateOfBirth) setValue("dateOfBirth", result.dateOfBirth, { shouldValidate: true, shouldDirty: true });
        setScanState("done");
        setScanMessage(
          result.confidence === "high"
            ? "Details detected from your ID — please check them below and fill in anything missing."
            : "Some details detected from your ID — please double-check them below and fill in anything missing."
        );
      } else {
        setScanState("error");
        setScanMessage((result as { reason?: string }).reason ?? "Couldn't read details from this photo. Please fill in the form manually below.");
      }
    } catch {
      setScanState("error");
      setScanMessage("Scan failed. Please fill in the form manually below.");
    }
  };

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const result = await signUpIndividual({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      middleName: data.middleName || undefined,
      lastName: data.lastName,
      phone: data.phone || undefined,
      title: data.title || undefined,
      country: data.country,
      dateOfBirth: data.dateOfBirth || undefined,
      gender: data.sex || undefined,
    });

    if (!result.ok) { setSubmitError(result.error.message); return; }
    navigate("/onboarding/check-email");
  };

  return (
    <RegisterShell back={{ label: "Back", to: "/register" }}>
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 bg-ficium/10 text-ficium px-3 py-1.5 rounded-pill text-xs font-semibold mb-4">
          Individual account
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold">Create your account</h1>
        <p className="text-sm text-muted mt-2">Personal details for identity verification.</p>
      </div>

      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-ink/6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">

          {/* ── SCAN NIC ── */}
          <UploadZone icon={<ScanLine size={20} />} title="Scan your NIC to speed this up"
            hint="Optional — we'll read your name, sex, and date of birth off the photo. JPG or PNG."
            file={scanFile}
            onFile={(f) => { setScanFile(f); if (f) { void runScan(f); } else { setScanState("idle"); setScanMessage(null); } }}
            inputId="signupScanFile" capture="environment" />

          {scanState !== "idle" && (
            <ScanStatusBanner state={scanState} message={scanMessage} scanningLabel="Scanning your ID…" />
          )}

          <div className="border-t border-ink/6 pt-4" />

          {/* Row 1: Title + First name */}
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field label="Title" htmlFor="title" error={errors.title?.message}>
              <Select id="title" defaultValue="" {...register("title")}>
                <option value="">—</option>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Dr">Dr</option>
              </Select>
            </Field>
            <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
              <Input id="firstName" autoComplete="given-name" invalid={!!errors.firstName} {...register("firstName")} />
            </Field>
          </div>

          {/* Row 2: Last name */}
          <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
            <Input id="lastName" autoComplete="family-name" invalid={!!errors.lastName} {...register("lastName")} />
          </Field>

          <Field label="Middle name" htmlFor="middleName" optional error={errors.middleName?.message}>
            <Input id="middleName" autoComplete="additional-name" {...register("middleName")} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Sex" htmlFor="sex" optional error={errors.sex?.message}>
              <Select id="sex" defaultValue="" {...register("sex")}>
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </Select>
            </Field>
            <Field label="Date of birth" htmlFor="dateOfBirth" optional error={errors.dateOfBirth?.message}>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            </Field>
          </div>

          <Field label="Email address" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" inputMode="email"
              invalid={!!errors.email} {...register("email")} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Phone" htmlFor="phone" optional error={errors.phone?.message}>
              <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" {...register("phone")} />
            </Field>
            <Field label="Country" htmlFor="country" error={errors.country?.message}>
              <Select id="country" invalid={!!errors.country} {...register("country")}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </div>

          <div className="border-t border-ink/6 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Password" htmlFor="password" error={errors.password?.message}>
              <Input id="password" type="password" autoComplete="new-password"
                invalid={!!errors.password} {...register("password")} />
            </Field>
            <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
              <Input id="confirmPassword" type="password" autoComplete="new-password"
                invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
            </Field>
          </div>

          {submitError && (
            <div role="alert" className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]">
              {submitError}
            </div>
          )}

          <Button type="submit" size="lg" loading={isSubmitting}
            rightIcon={!isSubmitting && <ArrowRight size={18} />} fullWidth className="mt-1">
            Create account
          </Button>

          <p className="text-center text-xs text-muted">
            By creating an account you agree to our{" "}
            <a href="#" className="text-ficium no-underline">Terms</a> and{" "}
            <a href="#" className="text-ficium no-underline">Privacy Policy</a>
          </p>
        </form>
      </div>
    </RegisterShell>
  );
}
