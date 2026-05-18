import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card } from "../components/ui";

export default function Dossier() {
  return (
    <div className="min-h-screen bg-cream px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[520px]">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <div className="h-1 w-8 rounded-pill bg-ficium" />
          <span className="ml-2 text-xs text-muted">Step 3 of 3</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-4">
          Financial profile
        </h1>
        <p className="text-sm sm:text-base text-muted mt-2 mb-8 sm:mb-10">
          Tell us about your income and assets. We'll build a private profile
          banks can use to bid more accurately.
        </p>

        <Card>
          <div className="text-muted">
            Dossier form coming in the next session — this is a placeholder.
            Your identity verification was saved.
          </div>
        </Card>
      </div>
    </div>
  );
}