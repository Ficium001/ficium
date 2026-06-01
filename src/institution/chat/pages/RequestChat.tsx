// =============================================================
// Ficium 3 — Request Chat (Institution side)
// Per-request chat between institution and client.
// Uses Supabase Realtime on public.request_messages.
// =============================================================
import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, X, Loader2 } from "lucide-react";
import institutionSupabase from "../../lib/institutionSupabase";
import { useMyInstitution } from "../../hooks/useInstitution";

interface Message {
  id: string;
  request_id: string;
  sender_type: "institution" | "client";
  sender_id: string;
  body: string;
  created_at: string;
}

interface RequestChatProps {
  requestId: string;
  requestLabel?: string;
  onClose?: () => void;
  embedded?: boolean; // true = rendered inline in drawer, false = floating panel
}

export default function RequestChat({
  requestId, requestLabel, onClose, embedded = false,
}: RequestChatProps) {
  const { data: institution } = useMyInstitution();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // ── Load history ──────────────────────────────────────────
  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    institutionSupabase
      .from("request_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []) as Message[]);
        setLoading(false);
      });
  }, [requestId]);

  // ── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    if (!requestId) return;
    const channel = institutionSupabase
      .channel(`request_chat:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          setMessages(prev => {
            // avoid duplicates
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => { institutionSupabase.removeChannel(channel); };
  }, [requestId]);

  // ── Scroll to bottom on new messages ─────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────
  const send = async () => {
    const text = body.trim();
    if (!text || sending || !institution) return;
    setSending(true);
    setBody("");

    const { data: { user } } = await institutionSupabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const { error } = await institutionSupabase
      .from("request_messages")
      .insert({
        request_id:  requestId,
        sender_type: "institution",
        sender_id:   user.id,
        body:        text,
      });

    if (error) console.error("Chat send error:", error);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const fmtTime = (s: string) =>
    new Date(s).toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" });

  const containerCls = embedded
    ? "flex flex-col border border-ink/[0.08] rounded-2xl overflow-hidden bg-white"
    : "flex flex-col h-full";

  return (
    <div className={containerCls}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/[0.07] bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-ficium" />
            <span className="font-semibold text-[14px] text-ink">
              Chat {requestLabel ? `· ${requestLabel}` : ""}
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {embedded && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink/[0.07]">
          <MessageSquare className="w-3.5 h-3.5 text-ficium" />
          <span className="text-[11px] font-bold text-ficium uppercase tracking-wider">Chat with client</span>
          <span className="ml-auto text-[10px] text-muted">Messages are visible to both parties</span>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-cream/30 ${embedded ? "min-h-[200px] max-h-[280px]" : ""}`}>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-ink/15 mx-auto mb-2" />
            <p className="text-[12px] text-muted">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_type === "institution";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                    isMe
                      ? "bg-ficium text-white rounded-br-sm"
                      : "bg-white border border-ink/[0.08] text-ink rounded-bl-sm"
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

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-ink/[0.07] bg-white flex-shrink-0">
        <input
          ref={inputRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          className="flex-1 bg-cream rounded-xl px-3.5 py-2.5 text-[13px] outline-none border border-transparent focus:border-ficium/30 transition-colors placeholder:text-muted"
        />
        <button
          onClick={send}
          disabled={!body.trim() || sending}
          className="w-9 h-9 bg-ficium hover:bg-ficium-deep disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
