// =============================================================
// Ficium — KYC Pending page
// Shown after a user submits KYC and it's queued for manual review.
// =============================================================
import { Link } from "react-router-dom";
import { ShieldCheck, Clock, Mail } from "lucide-react";

export default function KycPending() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-[440px] text-center">

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-ficium/10 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={36} className="text-ficium" />
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-3">
          Documents received
        </h1>
        <p className="text-muted text-[15px] leading-relaxed mb-8">
          Your identity documents are under review. Our team typically
          verifies submissions within <strong className="text-ink">1–2 business days</strong>.
          You'll receive an email once a decision is made.
        </p>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-card p-6 text-left space-y-4 mb-8">
          {[
            { icon: <ShieldCheck size={18} />, title: "Documents uploaded", done: true,  desc: "Your ID, selfie and proof of address are stored securely." },
            { icon: <Clock         size={18} />, title: "Under review",      done: false, desc: "A Ficium compliance officer will verify your documents." },
            { icon: <Mail          size={18} />, title: "Decision by email", done: false, desc: "You'll be notified as soon as verification is complete." },
          ].map((step) => (
            <div key={step.title} className="flex gap-3.5 items-start">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                step.done ? "bg-good/15 text-good" : "bg-ink/6 text-muted"
              }`}>
                {step.icon}
              </div>
              <div>
                <div className={`text-[14px] font-semibold ${step.done ? "text-ink" : "text-muted"}`}>
                  {step.title}
                  {step.done && <span className="ml-2 text-[11px] text-green-600 font-bold">✓ Done</span>}
                </div>
                <div className="text-[12px] text-muted mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 bg-ficium text-white font-bold px-6 py-3 rounded-xl hover:bg-ficium-deep transition-colors text-[15px]"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
