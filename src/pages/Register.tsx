import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { signUp } from "../services/auth";

/* ---------- Validation schema ---------- */

const schema = z.object({
  title: z.enum(["mr", "mrs", "ms", "miss", "dr", "prof", "other"]).optional(),
  firstName: z.string().trim().min(1, "First name is required").max(50),
  middleName: z.string().trim().max(50).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s+()-]{6,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  terms: z.literal(true, { message: "You must accept the terms to continue" }),
});

type FormData = z.infer<typeof schema>;

/* ---------- Page ---------- */

export default function Register() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { terms: false as unknown as true },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    const result = await signUp({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      middleName: data.middleName || undefined,
      lastName: data.lastName,
      phone: data.phone || undefined,
      title: data.title,
    });

    if (!result.ok) {
      setSubmitError(result.error.message);
      return;
    }

    if (result.needsEmailConfirmation) {
      navigate("/onboarding/check-email", { state: { email: data.email } });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF7F0",
        padding: "32px 24px",
        fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#0A0A1A",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap');
        .display { font-family: 'Bricolage Grotesque', sans-serif; letter-spacing: -0.035em; line-height: 0.95; }
        .ficium-input {
          width: 100%;
          padding: 14px 16px;
          font-size: 15px;
          font-family: inherit;
          color: #0A0A1A;
          background: white;
          border: 1.5px solid rgba(10,10,26,0.12);
          border-radius: 12px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ficium-input:focus {
          border-color: #2A1FE6;
          box-shadow: 0 0 0 3px rgba(42, 31, 230, 0.1);
        }
        .ficium-input[aria-invalid="true"] {
          border-color: #DC2626;
        }
        .ficium-input[aria-invalid="true"]:focus {
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }
        .ficium-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #0A0A1A;
          margin-bottom: 6px;
        }
        .ficium-label-muted {
          color: #6B6B85;
          font-weight: 500;
          margin-left: 6px;
        }
        .ficium-error {
          margin-top: 6px;
          font-size: 12px;
          color: #DC2626;
        }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* Back link */}
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#6B6B85",
            textDecoration: "none",
            fontSize: 14,
            marginBottom: 32,
          }}
        >
          <ArrowLeft size={16} /> Back
        </Link>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ height: 4, width: 32, borderRadius: 999, background: "#2A1FE6" }} />
          <div style={{ height: 4, width: 32, borderRadius: 999, background: "rgba(10,10,26,0.12)" }} />
          <div style={{ height: 4, width: 32, borderRadius: 999, background: "rgba(10,10,26,0.12)" }} />
          <div style={{ fontSize: 12, color: "#6B6B85", marginLeft: 8 }}>Step 1 of 3</div>
        </div>

        {/* Header */}
        <h1 className="display" style={{ fontSize: 48, fontWeight: 700, margin: 0, marginTop: 16 }}>
          Create your account
        </h1>
        <p style={{ fontSize: 16, color: "#6B6B85", margin: 0, marginTop: 8, marginBottom: 40 }}>
          Banks will compete for your business. Let's start with the basics.
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          style={{
            background: "white",
            borderRadius: 24,
            padding: 32,
            border: "1px solid rgba(10,10,26,0.06)",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Title + First name row */}
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
            <div>
              <label className="ficium-label" htmlFor="title">Title</label>
              <select
                id="title"
                className="ficium-input"
                {...register("title")}
                defaultValue=""
                style={{ appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B6B85' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center", paddingRight: 36 }}
              >
                <option value="">—</option>
                <option value="mr">Mr</option>
                <option value="mrs">Mrs</option>
                <option value="ms">Ms</option>
                <option value="miss">Miss</option>
                <option value="dr">Dr</option>
                <option value="prof">Prof</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="ficium-label" htmlFor="firstName">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                className="ficium-input"
                autoComplete="given-name"
                aria-invalid={!!errors.firstName}
                {...register("firstName")}
              />
              {errors.firstName && <div className="ficium-error">{errors.firstName.message}</div>}
            </div>
          </div>

          {/* Middle name */}
          <div>
            <label className="ficium-label" htmlFor="middleName">
              Middle name <span className="ficium-label-muted">optional</span>
            </label>
            <input
              id="middleName"
              type="text"
              className="ficium-input"
              autoComplete="additional-name"
              aria-invalid={!!errors.middleName}
              {...register("middleName")}
            />
            {errors.middleName && <div className="ficium-error">{errors.middleName.message}</div>}
          </div>

          {/* Last name */}
          <div>
            <label className="ficium-label" htmlFor="lastName">Last name</label>
            <input
              id="lastName"
              type="text"
              className="ficium-input"
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              {...register("lastName")}
            />
            {errors.lastName && <div className="ficium-error">{errors.lastName.message}</div>}
          </div>

          {/* Email */}
          <div>
            <label className="ficium-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="ficium-input"
              autoComplete="email"
              inputMode="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <div className="ficium-error">{errors.email.message}</div>}
          </div>

          {/* Phone */}
          <div>
            <label className="ficium-label" htmlFor="phone">
              Phone <span className="ficium-label-muted">optional, with country code</span>
            </label>
            <input
              id="phone"
              type="tel"
              className="ficium-input"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+230 5xxx xxxx"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
            {errors.phone && <div className="ficium-error">{errors.phone.message}</div>}
          </div>

          {/* Password */}
          <div>
            <label className="ficium-label" htmlFor="password">
              Password <span className="ficium-label-muted">at least 8 characters</span>
            </label>
            <input
              id="password"
              type="password"
              className="ficium-input"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && <div className="ficium-error">{errors.password.message}</div>}
          </div>

          {/* Terms */}
          <label style={{ display: "flex", gap: 12, alignItems: "flex-start", marginTop: 4, cursor: "pointer", fontSize: 13, color: "#6B6B85", lineHeight: 1.5 }}>
            <input
              type="checkbox"
              {...register("terms")}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: "#2A1FE6", cursor: "pointer" }}
            />
            <span>
              I agree to Ficium's{" "}
              <a href="#" style={{ color: "#2A1FE6", textDecoration: "none", fontWeight: 600 }}>Terms</a>
              {" "}and{" "}
              <a href="#" style={{ color: "#2A1FE6", textDecoration: "none", fontWeight: 600 }}>Privacy Policy</a>.
            </span>
          </label>
          {errors.terms && <div className="ficium-error" style={{ marginTop: -8 }}>{errors.terms.message}</div>}

          {/* Submit error from server */}
          {submitError && (
            <div
              role="alert"
              style={{
                padding: "12px 14px",
                background: "rgba(220, 38, 38, 0.06)",
                border: "1px solid rgba(220, 38, 38, 0.2)",
                color: "#991B1B",
                borderRadius: 12,
                fontSize: 13,
              }}
            >
              {submitError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: 8,
              padding: "16px 24px",
              borderRadius: 999,
              border: "none",
              background: isSubmitting ? "#5A52E8" : "#2A1FE6",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: isSubmitting ? "wait" : "pointer",
              boxShadow: "0 12px 32px rgba(42, 31, 230, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.15s",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                Creating account…
              </>
            ) : (
              <>
                Continue <ArrowRight size={18} />
              </>
            )}
          </button>

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </form>

        {/* Sign-in link */}
        <div style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: "#6B6B85" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#2A1FE6", textDecoration: "none", fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}