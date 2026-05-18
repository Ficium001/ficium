import { Link, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";

export default function CheckEmail() {
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAF7F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        fontFamily: "'Inter Tight', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#0A0A1A",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter+Tight:wght@400;500;600;700&display=swap');
        .display { font-family: 'Bricolage Grotesque', sans-serif; letter-spacing: -0.035em; line-height: 0.95; }
      `}</style>

      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 32px",
            borderRadius: 20,
            background: "rgba(42, 31, 230, 0.08)",
            color: "#2A1FE6",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Mail size={32} />
        </div>

        <h1 className="display" style={{ fontSize: 48, fontWeight: 700, margin: 0, marginBottom: 16 }}>
          Check your email
        </h1>

        <p style={{ fontSize: 17, lineHeight: 1.5, color: "#6B6B85", margin: 0, marginBottom: 8 }}>
          We've sent a confirmation link to
        </p>
        <p style={{ fontSize: 17, fontWeight: 600, margin: 0, marginBottom: 32 }}>
          {email ?? "your email address"}
        </p>

        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#6B6B85", margin: 0, marginBottom: 40 }}>
          Click the link in the email to verify your account. The link expires in 1 hour. If you don't see it, check your spam folder.
        </p>

        <Link
          to="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 32px",
            background: "#2A1FE6",
            color: "white",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 12px 32px rgba(42, 31, 230, 0.25)",
          }}
        >
          Continue to sign in
        </Link>

        <div style={{ marginTop: 32, fontSize: 13, color: "#6B6B85" }}>
          Wrong email?{" "}
          <Link to="/register" style={{ color: "#2A1FE6", textDecoration: "none", fontWeight: 600 }}>
            Sign up again
          </Link>
        </div>
      </div>
    </div>
  );
}