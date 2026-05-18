import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { signIn } from "../services/auth";

/* ---------- Validation schema ---------- */

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

/* ---------- Page ---------- */

export default function Login() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    const result = await signIn(data.email, data.password);

    if (!result.ok) {
      // Login errors get a friendlier blanket message — we don't tell attackers
      // which of email/password was wrong.
      setSubmitError("Incorrect email or password. Please try again.");
      return;
    }

    navigate("/dashboard");
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
        .ficium-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #0A0A1A;
          margin-bottom: 6px;
        }
        .ficium-error {
          margin-top: 6px;
          font-size: 12px;
          color: #DC2626;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ maxWidth: 440, margin: "0 auto" }}>
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

        {/* Header */}
        <h1 className="display" style={{ fontSize: 48, fontWeight: 700, margin: 0, marginTop: 16 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 16, color: "#6B6B85", margin: 0, marginTop: 8, marginBottom: 40 }}>
          Sign in to see your bids and manage your requests.
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
          {/* Email */}
          <div>
            <label className="ficium-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="ficium-input"
              autoComplete="email"
              inputMode="email"
              autoFocus
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <div className="ficium-error">{errors.email.message}</div>}
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="ficium-label" htmlFor="password">Password</label>
              <a href="#" style={{ fontSize: 12, color: "#2A1FE6", textDecoration: "none", fontWeight: 600 }}>
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              className="ficium-input"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && <div className="ficium-error">{errors.password.message}</div>}
          </div>

          {/* Submit error */}
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
                Signing in…
              </>
            ) : (
              <>
                Sign in <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Sign-up link */}
        <div style={{ textAlign: "center", marginTop: 32, fontSize: 14, color: "#6B6B85" }}>
          New to Ficium?{" "}
          <Link to="/register" style={{ color: "#2A1FE6", textDecoration: "none", fontWeight: 600 }}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}