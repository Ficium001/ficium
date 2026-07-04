import { Link } from "react-router-dom";
import {
  Heart, ShieldCheck, Clock, AlertCircle, FileCheck2,
  Loader2, ChevronRight, Home, PiggyBank, Landmark, HandCoins,
} from "lucide-react";
import { PageShell } from "@/shared/ui";
import { useCouple } from "@/individual/couple/hooks/useCouple";

function fmtMUR(n: number): string {
  return `MUR ${new Intl.NumberFormat("en-MU").format(n)}`;
}

const PRODUCT_ICON: Record<string, React.ElementType> = {
  mortgage: Home,
  fixed_deposit: PiggyBank,
  savings_plan: PiggyBank,
  government_bonds: Landmark,
};

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function Couple() {
  const { data, isLoading } = useCouple();

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="text-ficium animate-spin" />
        </div>
      </PageShell>
    );
  }

  const couple = data?.couple ?? null;

  return (
    <PageShell max="max-w-[560px]">
      <div className="mb-6">
        <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">Joint finance</p>
        <h1 className="font-display text-3xl font-extrabold text-ink leading-none">Couple</h1>
      </div>

      {!couple ? <NoCoupleState pending={data} /> : <CoupleCard couple={couple} jointRequests={data?.jointRequests ?? []} />}
    </PageShell>
  );
}

function NoCoupleState({ pending }: { pending: { pendingInvitationsSent?: unknown[]; pendingInvitationsReceived?: unknown[] } | undefined }) {
  const hasSent = (pending?.pendingInvitationsSent?.length ?? 0) > 0;
  const hasReceived = (pending?.pendingInvitationsReceived?.length ?? 0) > 0;

  return (
    <div className="rounded-3xl bg-white border border-line shadow-card p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-ficium/8 grid place-items-center mx-auto mb-4">
        <Heart size={22} className="text-ficium" />
      </div>
      <h2 className="font-display text-[18px] font-bold text-ink mb-2">No linked partner yet</h2>
      <p className="text-[13px] text-muted leading-relaxed mb-6">
        Invite your spouse from a joint request to link your profiles here. Once verified, every future joint
        request skips the certificate step.
      </p>

      {hasSent && (
        <p className="text-[12px] text-muted mb-2">You have a pending invitation waiting on a response.</p>
      )}
      {hasReceived && (
        <p className="text-[12px] text-ficium font-semibold mb-2">You've been invited to a joint request — check your notifications.</p>
      )}

      <Link
        to="/requests/new"
        className="inline-flex items-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold px-5 py-3 rounded-2xl transition-colors text-[14px] no-underline"
      >
        Start a joint request
      </Link>
    </div>
  );
}

function CoupleCard({
  couple,
  jointRequests,
}: {
  couple: NonNullable<import("@/individual/couple/api/couple").CoupleData["couple"]>;
  jointRequests: Array<{ id: string; product_type: string; amount: number; status: string; created_at: string }>;
}) {
  const verified = couple.status === "verified";
  const relDoc = couple.relationshipDocument;
  const partnerName = couple.partner?.name ?? "Partner";

  return (
    <div className="space-y-4">
      {/* Partner card */}
      <div className="rounded-3xl bg-white border border-line shadow-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex -space-x-2.5">
            <div className="w-10 h-10 rounded-full bg-ficium/12 text-ficium flex items-center justify-center text-[13px] font-bold border-2 border-white">
              You
            </div>
            <div className="w-10 h-10 rounded-full bg-ficium/12 text-ficium flex items-center justify-center text-[13px] font-bold border-2 border-white">
              {initials(partnerName)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">You and {partnerName}</p>
            {verified ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-good">
                <ShieldCheck size={11} /> Verified couple
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warn">
                <Clock size={11} /> Pending verification
              </span>
            )}
          </div>
        </div>

        {/* Certificate status */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-paper rounded-xl">
          <FileCheck2 size={16} className={verified ? "text-good" : "text-muted"} />
          <span className="flex-1 text-[13px] text-ink font-medium">Marriage certificate</span>
          {relDoc?.verification_status === "verified" && (
            <span className="text-[12px] font-bold text-good">Verified</span>
          )}
          {relDoc?.verification_status === "rejected" && (
            <span className="text-[12px] font-bold text-bad">Needs attention</span>
          )}
          {(!relDoc || relDoc.verification_status === "pending_ocr") && (
            <span className="text-[12px] font-bold text-warn">Awaiting upload</span>
          )}
        </div>

        {relDoc?.verification_status === "rejected" && relDoc.reject_reason && (
          <div className="mt-3 flex items-start gap-2 bg-bad/6 border border-bad/20 rounded-xl px-3.5 py-2.5">
            <AlertCircle size={13} className="text-bad shrink-0 mt-0.5" />
            <p className="text-[12px] text-bad leading-relaxed">{relDoc.reject_reason} — upload a clearer copy from Document Vault.</p>
          </div>
        )}

        {!relDoc && (
          <Link
            to="/vault"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-ficium no-underline"
          >
            Upload certificate in Document Vault <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-line p-4">
          <p className="text-[12px] text-muted mb-1.5">Joint requests</p>
          <p className="font-display text-[22px] font-extrabold text-ink">{jointRequests.length}</p>
        </div>
        <div className="rounded-2xl bg-white border border-line p-4">
          <p className="text-[12px] text-muted mb-1.5">Combined amount</p>
          <p className="font-display text-[22px] font-extrabold text-ink">
            {fmtMUR(jointRequests.reduce((s, r) => s + Number(r.amount), 0))}
          </p>
        </div>
      </div>

      {/* Joint activity */}
      {jointRequests.length > 0 && (
        <div className="rounded-3xl bg-white border border-line shadow-card overflow-hidden">
          <p className="text-[11px] font-bold text-muted uppercase tracking-widest px-5 pt-4 pb-2">Joint activity</p>
          {jointRequests.map((r, i) => {
            const Icon = PRODUCT_ICON[r.product_type] ?? HandCoins;
            return (
              <Link
                key={r.id}
                to={`/requests/${r.id}`}
                className={[
                  "flex items-center gap-3 px-5 py-3.5 hover:bg-line/30 transition-colors no-underline",
                  i < jointRequests.length - 1 ? "border-b border-line" : "",
                ].join(" ")}
              >
                <Icon size={17} className="text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate capitalize">
                    {r.product_type.replace(/_/g, " ")} · {fmtMUR(Number(r.amount))}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5 capitalize">{r.status.replace(/_/g, " ")}</p>
                </div>
                <ChevronRight size={15} className="text-muted/40 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {verified && (
        <Link
          to="/requests/new"
          className="w-full flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] no-underline"
        >
          Start joint request
        </Link>
      )}
    </div>
  );
}
