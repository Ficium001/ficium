// =============================================================
// Ficium — RequestChat
// One thread between the borrower and ONE lender on ONE request.
// Used by both the borrower app and the institution portal.
//
// Chat is scoped per lender (request_id, institution_id): a request with
// offers from MCB and Absa has two separate threads, and neither bank can
// see the other's. Before a bid is accepted the marketplace is anonymous,
// so the composer offers only the structured template catalogue — free
// text would let a borrower volunteer identifying detail. Free text
// appears once this lender has won, when identity is revealed anyway.
//
// The database enforces all of that in a trigger; the UI just reflects it.
// =============================================================
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageSquare, Loader2, Lock, ShieldCheck } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCachedUser } from "../lib/supabase";
import {
  getTemplates, getThread, sendStructured, sendFree,
  type ChatMessage, type MessageTemplate,
} from "../lib/requestChat";

interface RequestChatProps {
  requestId:      string;
  institutionId:  string;
  /** Shown in the header so the borrower knows which lender they're in. */
  institutionName?: string;
  senderType:     "institution" | "client";
  client:         SupabaseClient;
  /** True once this lender's bid is the accepted one. Unlocks free text. */
  isWinner?:      boolean;
  /** True once some OTHER lender won — thread is read-only history. */
  isFrozen?:      boolean;
  height?:        string;
}

export default function RequestChat({
  requestId, institutionId, institutionName, senderType, client,
  isWinner = false, isFrozen = false, height = "flex-1",
}: RequestChatProps) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [body,      setBody]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!requestId || !institutionId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getThread(client, requestId, institutionId),
      getTemplates(client, senderType),
    ])
      .then(([msgs, tpls]) => {
        if (cancelled) return;
        setMessages(msgs);
        setTemplates(tpls);
      })
      .catch(() => { if (!cancelled) setError("Couldn't load this conversation."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [requestId, institutionId, senderType, client]);

  // Realtime is filtered to this lender's thread, so a bank never receives a
  // push for a competitor's conversation on the same request.
  useEffect(() => {
    if (!requestId || !institutionId) return;
    const channel = client
      .channel(`chat:${requestId}:${institutionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT", schema: "public", table: "request_messages",
          filter: `institution_id=eq.${institutionId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.request_id !== requestId) return;
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        },
      )
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [requestId, institutionId, client]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const senderId = useCallback(async () => {
    const { data: { user } } = await getCachedUser();
    return user?.id ?? null;
  }, []);

  const pickTemplate = async (tpl: MessageTemplate) => {
    if (sending || isFrozen) return;
    setSending(true); setError(null);
    try {
      const uid = await senderId();
      if (!uid) throw new Error("no session");
      await sendStructured(client, {
        requestId, institutionId, senderType, senderId: uid, template: tpl,
      });
    } catch {
      setError("Message not sent. Please try again.");
    } finally { setSending(false); }
  };

  const sendFreeText = async () => {
    const text = body.trim();
    if (!text || sending || !isWinner || isFrozen) return;
    setSending(true); setError(null); setBody("");
    try {
      const uid = await senderId();
      if (!uid) throw new Error("no session");
      await sendFree(client, {
        requestId, institutionId, senderType, senderId: uid, body: text,
      });
    } catch {
      setError("Message not sent. Please try again.");
      setBody(text);
    } finally { setSending(false); inputRef.current?.focus(); }
  };

  const fmtTime = (s: string) =>
    new Date(s).toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" });

  const otherLabel = senderType === "client" ? (institutionName ?? "Lender") : "Client";

  return (
    <div className={`flex flex-col ${height} min-h-0`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink/[0.07] shrink-0 bg-white">
        <MessageSquare className="w-3.5 h-3.5 text-ficium" />
        <span className="text-[11px] font-bold text-ficium uppercase tracking-wider truncate">
          {senderType === "client" ? (institutionName ?? "Lender") : "Client"}
        </span>
        {!isWinner && !isFrozen && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted shrink-0">
            <ShieldCheck className="w-3 h-3" /> Anonymous
          </span>
        )}
        {isFrozen && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted shrink-0">
            <Lock className="w-3 h-3" /> Closed
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface/30 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-ink/15 mx-auto mb-2" />
            <p className="text-[12px] text-muted">
              {isFrozen
                ? "This conversation closed when another offer was accepted."
                : `No messages yet with ${otherLabel}.`}
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_type === senderType;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && <span className="text-[10px] text-muted px-1">{otherLabel}</span>}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    isMe
                      ? "bg-ficium text-white rounded-br-sm"
                      : "bg-white border border-ink/8 text-ink rounded-bl-sm"
                  }`}>
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-muted px-1">{fmtTime(msg.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 py-2 text-[11px] text-red-600 bg-red-50 border-t border-red-100 shrink-0">
          {error}
        </div>
      )}

      {isFrozen ? (
        <div className="flex items-center gap-2 px-4 py-3 border-t border-ink/[0.07] bg-white shrink-0">
          <Lock className="w-3.5 h-3.5 text-muted shrink-0" />
          <span className="text-[11px] text-muted">
            Read-only — another offer was accepted on this request.
          </span>
        </div>
      ) : isWinner ? (
        <div className="flex items-center gap-2 px-3 py-3 border-t border-ink/[0.07] bg-white shrink-0">
          <input
            ref={inputRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFreeText(); } }}
            placeholder="Type a message…"
            className="flex-1 bg-surface rounded-xl px-3.5 py-2.5 text-[13px] outline-hidden border border-transparent focus:border-ficium/30 transition-colors placeholder:text-muted"
          />
          <button
            onClick={sendFreeText}
            disabled={!body.trim() || sending}
            className="w-9 h-9 bg-ficium hover:bg-ficium-deep disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        // Pre-acceptance: pick a question. No free-text field at all — the
        // surest way not to leak identity is to give no place to type it.
        <div className="border-t border-ink/[0.07] bg-white shrink-0">
          <div className="px-4 pt-2.5 pb-1 text-[10px] text-muted">
            Your identity stays hidden until you accept an offer — choose a question to send.
          </div>
          <div className="px-3 pb-3 flex flex-wrap gap-1.5 max-h-[132px] overflow-y-auto">
            {templates.map(t => (
              <button
                key={t.code}
                onClick={() => pickTemplate(t)}
                disabled={sending}
                className="px-3 py-1.5 rounded-full border border-ficium/25 bg-ficium/5 text-ficium text-[11.5px] font-medium hover:bg-ficium/10 disabled:opacity-40 transition-colors text-left"
              >
                {t.label}
              </button>
            ))}
            {templates.length === 0 && !loading && (
              <span className="text-[11px] text-muted px-1 py-1.5">No questions available.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
