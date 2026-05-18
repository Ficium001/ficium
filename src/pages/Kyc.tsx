import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Camera, Upload, ShieldCheck } from "lucide-react";
import { submitKyc } from "../services/kyc";
import { Button, Card, Field, Input, Select } from "../components/ui";

/* ---------- Validation schema ---------- */

const schema = z.object({
  documentType: z.enum(["national_id", "passport", "drivers_license", "other"], {
    message: "Select a document type",
  }),
  documentNumber: z
    .string()
    .trim()
    .min(4, "Document number is too short")
    .max(40, "Document number is too long"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((s) => {
      const d = new Date(s);
      if (isNaN(d.getTime())) return false;
      const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18 && age <= 120;
    }, "You must be at least 18 years old"),
});

type FormData = z.infer<typeof schema>;

/* ---------- Page ---------- */

export default function Kyc() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);

    if (!idFile) {
      setSubmitError("Please upload an image of your ID document.");
      return;
    }
    if (!selfieFile) {
      setSubmitError("Please take a selfie for verification.");
      return;
    }

    const result = await submitKyc({
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      dateOfBirth: data.dateOfBirth,
    });

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    navigate("/onboarding/dossier");
  };

  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[520px]">
        {/* Back link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Step indicator */}
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
            <Field
              label="Document type"
              htmlFor="documentType"
              error={errors.documentType?.message}
            >
              <Select
                id="documentType"
                defaultValue=""
                invalid={!!errors.documentType}
                {...register("documentType")}
              >
                <option value="" disabled>Choose a document</option>
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="other">Other</option>
              </Select>
            </Field>

            <Field
              label="Document number"
              htmlFor="documentNumber"
              error={errors.documentNumber?.message}
            >
              <Input
                id="documentNumber"
                type="text"
                autoComplete="off"
                placeholder="e.g. M1234567"
                invalid={!!errors.documentNumber}
                {...register("documentNumber")}
              />
            </Field>

            <Field
              label="Date of birth"
              htmlFor="dateOfBirth"
              error={errors.dateOfBirth?.message}
            >
              <Input
                id="dateOfBirth"
                type="date"
                invalid={!!errors.dateOfBirth}
                {...register("dateOfBirth")}
              />
            </Field>

            {/* ID upload zone */}
            <UploadZone
              icon={<Upload size={20} />}
              title="Upload your ID document"
              hint="Take a clear photo of the front. JPG or PNG, max 5MB."
              file={idFile}
              onFile={setIdFile}
              inputId="idFile"
            />

            {/* Selfie upload zone */}
            <UploadZone
              icon={<Camera size={20} />}
              title="Selfie verification"
              hint="A clear front-facing photo of you, in good light."
              file={selfieFile}
              onFile={setSelfieFile}
              inputId="selfieFile"
              capture="user"
            />

            {/* Privacy reassurance */}
            <div className="flex gap-3 px-3.5 py-3 bg-ficium/[0.04] border border-ficium/15 rounded-xl">
              <ShieldCheck size={20} className="text-ficium flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-ink/80 leading-relaxed">
                Your documents are encrypted and only used for verification.
                Banks never see them.
              </p>
            </div>

            {submitError && (
              <div
                role="alert"
                className="px-3.5 py-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[13px]"
              >
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              rightIcon={!isSubmitting && <ArrowRight size={18} />}
              fullWidth
              className="mt-2"
            >
              {isSubmitting ? "Verifying…" : "Continue"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Upload zone (stub — accepts file but doesn't upload yet) ---------- */

function UploadZone({
  icon,
  title,
  hint,
  file,
  onFile,
  inputId,
  capture,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  file: File | null;
  onFile: (f: File | null) => void;
  inputId: string;
  capture?: "user" | "environment";
}) {
  return (
    <label
      htmlFor={inputId}
      className={[
        "block cursor-pointer rounded-xl border-[1.5px] border-dashed transition-colors",
        "px-4 py-5",
        file
          ? "bg-mint/[0.15] border-mint"
          : "bg-cream border-ink/15 hover:border-ficium/50 hover:bg-ficium/[0.03]",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "w-10 h-10 rounded-xl grid place-items-center flex-shrink-0",
            file ? "bg-mint text-ink" : "bg-ficium/10 text-ficium",
          ].join(" ")}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-ink">{title}</div>
          <div className="text-xs text-muted mt-0.5">{hint}</div>
          {file && (
            <div className="mt-2 text-xs font-medium text-ink/80 truncate">
              ✓ {file.name}
            </div>
          )}
        </div>
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png"
        capture={capture}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}