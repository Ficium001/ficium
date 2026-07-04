import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, Lock, AlertTriangle, HandCoins } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { FiciumLogo } from "@/shared/ui/FiciumLogo";
import { previewInvitation, respondToInvitation, type InvitationPreview } from "@/individual/couple/api/couple";

function fmtMUR(n: number): string {
  return `MUR ${new Intl.NumberFormat("en-MU").format(n)}`;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<"accept" | "decline" | null>(null);
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    previewInvitation(token).then((result) => {
      if (result.ok) setPreview(result.data);
      else setLoadError(result.error);
      setLoading(false);
    });
  }, [token]);

  const respond = async (action: "accept" | "decline") => {
    if (!token) return;
    setResponding(action);
    setRespondError(null);
    const result = await respondToInvitation(token, action);
    setResponding(null);
    if (!result.ok) { setRespondError(result.error); return; }
    setResponded(action === "accept" ? "accepted" : "declined");
    if (action === "accept") setTimeout(() => navigate("/couple"), 2000);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 size={28} className="text-ficium animate-spin" />
      </div>
    );
  }

  if (loadError || !preview) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle size={32} className="text-warn mb-4" />
        <h1 className="font-display text-xl font-bold text-ink mb-2">This invitation isn't available</h1>
        <p className="text-[13px] text-muted mb-6">{loadError ?? "It may have expired or already been used."}</p>
        <Link to="/dashboard" className="text-[13px] font-bold text-ficium no-underline">Go to dashboard</Link>
      </div>
    );
  }

  if (preview.status !== "pending") {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
        <XCircle size={32} className="text-muted mb-4" />
        <h1 className="font-display text-xl font-bold text-ink mb-2">
          {preview.status === "accepted" ? "Already accepted" : preview.status === "declined" ? "Already declined" : "No longer active"}
        </h1>
        <Link to="/dashboard" className="text-[13px] font-bold text-ficium no-underline">Go to dashboard</Link>
      </div>
    );
  }

  if (responded) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-good/10 grid place-items-center mb-5">
          <CheckCircle2 size={30} className="text-good" />
        </div>
        <h1 className="font-display text-xl font-bold text-ink mb-2">
          {responded === "accepted" ? "You're in!" : "Invitation declined"}
        </h1>
        <p className="text-[13px] text-muted">
          {responded === "accepted" ? "Redirecting you to Couple…" : "The request owner has been notified."}
        </p>
      </div>
    );
  }

  const amount = preview.request ? fmtMUR(preview.request.amount) : "";
  const product = preview.request?.productType.replace(/_/g, " ") ?? "request";

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="max-w-[420px] w-full mx-auto px-6 pt-12 pb-10 flex-1 flex flex-col">
        <FiciumLogo className="h-6 mb-10" />

        <div className="w-14 h-14 rounded-2xl bg-ficium/8 grid place-items-center mb-5">
          <HandCoins size={22} className="text-ficium" />
        </div>

        <h1 className="font-display text-[24px] font-extrabold text-ink leading-tight mb-2">
          {preview.inviterFirstName} invited you to a joint request
        </h1>
        <p className="text-[14px] text-muted leading-relaxed mb-6">
          A {product} for {amount}. Accepting means you'll be jointly responsible for this request.
        </p>

        {!user ? (
          <>
            <div className="flex items-start gap-2.5 bg-ficium/5 border border-ficium/15 rounded-xl px-4 py-3 mb-6">
              <Lock size={13} className="text-ficium shrink-0 mt-0.5" />
              <p className="text-[12px] text-ink/70 leading-relaxed">
                Log in or create an account to review and respond to this invitation.
              </p>
            </div>
            <button
              onClick={() => navigate("/login", { state: { from: `/invite/${token}` } })}
              className="w-full bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] mb-3"
            >
              Log in to respond
            </button>
            <button
              onClick={() => navigate("/register/individual", { state: { from: `/invite/${token}` } })}
              className="w-full border border-line text-ink font-bold py-3.5 rounded-2xl transition-colors text-[14px]"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            {respondError && (
              <p className="text-[12px] text-bad mb-3">{respondError}</p>
            )}
            <button
              onClick={() => respond("accept")}
              disabled={responding !== null}
              className="w-full flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] disabled:opacity-60 mb-3"
            >
              {responding === "accept" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Accept invitation
            </button>
            <button
              onClick={() => respond("decline")}
              disabled={responding !== null}
              className="w-full border border-line text-muted font-bold py-3.5 rounded-2xl transition-colors text-[14px] disabled:opacity-60"
            >
              {responding === "decline" ? "Declining…" : "Decline"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
