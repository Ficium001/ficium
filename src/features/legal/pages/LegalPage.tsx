import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LEGAL_DRAFT, PRIVACY, TERMS, type LegalDoc } from "../content";

function LegalPage({ doc, other }: { doc: LegalDoc; other: { to: string; label: string } }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="max-w-[720px] mx-auto px-5 sm:px-8 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink mb-6">
          <ArrowLeft size={15} /> Ficium
        </Link>

        {LEGAL_DRAFT && (
          <div role="note" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            Draft under legal review. It describes how Ficium works today and may change before launch.
          </div>
        )}

        <h1 className="font-display text-3xl sm:text-4xl font-bold">{doc.title}</h1>
        <p className="text-[12px] text-muted mt-2">Version {doc.version} · Effective: {doc.effective}</p>
        <p className="text-[15px] text-ink/80 leading-relaxed mt-5">{doc.intro}</p>

        {doc.sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="font-display text-lg font-bold">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="text-[14px] text-ink/80 leading-relaxed mt-2">{p}</p>
            ))}
          </section>
        ))}

        <p className="mt-10 pt-6 border-t border-line text-[13px]">
          <Link to={other.to} className="text-ficium">{other.label}</Link>
        </p>
      </main>
    </div>
  );
}

export function TermsPage() {
  return <LegalPage doc={TERMS} other={{ to: "/privacy", label: "Read the Privacy Notice" }} />;
}

export function PrivacyPage() {
  return <LegalPage doc={PRIVACY} other={{ to: "/terms", label: "Read the Terms of Use" }} />;
}
