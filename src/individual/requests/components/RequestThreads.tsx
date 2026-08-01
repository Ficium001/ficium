// =============================================================
// Ficium — RequestThreads (borrower side)
//
// A request can carry offers from several lenders. Chat is scoped per lender,
// so the borrower gets one thread each and switches between them here.
//
// Once they accept an offer this collapses to the winning lender alone:
// the losing threads stop being writable (enforced in the DB) and are no
// longer worth surfacing as tabs, so we show the winner and keep the rest
// reachable read-only.
// =============================================================
import { useState, useEffect, useMemo } from "react";
import { Loader2, MessageSquare, Lock } from "lucide-react";
import { supabase } from "../../../shared/lib/supabase";
import { getAcceptedInstitutionId } from "../../../shared/lib/requestChat";
import RequestChat from "../../../shared/components/RequestChat";
import type { Bid } from "../api/requests";

export default function RequestThreads({
  requestId, bids,
}: { requestId: string; bids: Bid[] }) {
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [active, setActive]         = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  // One lender per thread, deduped: a bank that revised its bid still has a
  // single conversation.
  const lenders = useMemo(() => {
    const seen = new Map<string, string>();
    for (const b of bids) {
      if (b.bankId && !seen.has(b.bankId)) seen.set(b.bankId, b.institutionName);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [bids]);

  useEffect(() => {
    let cancelled = false;
    getAcceptedInstitutionId(supabase, requestId)
      .then(id => { if (!cancelled) setAcceptedId(id); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [requestId]);

  // Default to the winner once there is one, otherwise the first lender.
  useEffect(() => {
    if (loading) return;
    setActive(prev => prev ?? acceptedId ?? lenders[0]?.id ?? null);
  }, [loading, acceptedId, lenders]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  if (lenders.length === 0) {
    return (
      <div className="text-center py-10 px-6">
        <MessageSquare className="w-8 h-8 text-ink/15 mx-auto mb-2" />
        <p className="text-[12px] text-muted">
          Once a lender bids on this request you'll be able to ask them questions here.
        </p>
      </div>
    );
  }

  const visible = acceptedId && !showClosed
    ? lenders.filter(l => l.id === acceptedId)
    : lenders;
  const activeLender = lenders.find(l => l.id === active) ?? visible[0] ?? lenders[0];
  const closedCount  = acceptedId ? lenders.length - 1 : 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {visible.length > 1 && (
        <div className="flex gap-1.5 px-3 py-2.5 border-b border-ink/[0.07] bg-white overflow-x-auto shrink-0">
          {visible.map(l => {
            const isActive = l.id === activeLender?.id;
            const frozen   = !!acceptedId && l.id !== acceptedId;
            return (
              <button
                key={l.id}
                onClick={() => setActive(l.id)}
                className={[
                  "px-3 py-1.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
                  isActive
                    ? "bg-ficium text-white"
                    : "bg-surface text-muted hover:text-ink",
                ].join(" ")}
              >
                {frozen && <Lock className="w-2.5 h-2.5" />}
                {l.name}
              </button>
            );
          })}
        </div>
      )}

      {activeLender && (
        <RequestChat
          key={activeLender.id}
          requestId={requestId}
          institutionId={activeLender.id}
          institutionName={activeLender.name}
          senderType="client"
          client={supabase}
          isWinner={!!acceptedId && activeLender.id === acceptedId}
          isFrozen={!!acceptedId && activeLender.id !== acceptedId}
          height="flex-1"
        />
      )}

      {closedCount > 0 && (
        <button
          onClick={() => setShowClosed(v => !v)}
          className="px-4 py-2 text-[10.5px] text-muted hover:text-ink border-t border-ink/[0.07] bg-white shrink-0 text-left"
        >
          {showClosed
            ? "Hide earlier conversations"
            : `Show ${closedCount} earlier conversation${closedCount > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
