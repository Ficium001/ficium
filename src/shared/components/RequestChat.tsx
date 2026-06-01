// =============================================================
// Ficium — Shared RequestChat component
// Used by both client (individual) and institution portals.
// Reads/writes public.request_messages via the passed supabase client.
// Realtime via Supabase channel subscription.
// =============================================================
import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Loader2 } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  request_id: string;
  sender_type: "institution" | "client";
  sender_id: string;
  body: string;
  created_at: string;
}

interface RequestChatProps {
  requestId: string;
  senderType: "institution" | "client";
  client: SupabaseClient;        // pass the right supabase client for the portal
  height?: string;               // e.g. "flex-1" or "h-[400px]"
}

export default function RequestChat({
  requestId, senderType, client, height = "flex-1",
}: RequestChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body,     setBody]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Load history
  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    client
      .from("request_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []) as ChatMessage[]);
        setLoading(false);
      });
  }, [requestId, client]);

  // Realtime
  useEffect(() => {
    if (!requestId) return;
    const channel = client
      .channel(`chat:${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_messages", filter: `request_id=eq.${requestId}` },
        (payload) => {
          setMessages(prev =>
            prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new as ChatMessage]
          );
        }
      )
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [requestId, client]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setBody("");
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setSending(false); return; }
    const { error } = await client
      .from("request_messages")
      .insert({ request_id: requestId, sender_type: senderType, sender_id: user.id, body: text });
    if (error) console.error("Chat send error:", error);
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const fmtTime = (s: string) =>
    new Date(s).toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex flex-col ${height} min-h-0`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-ink/[0.07] flex-shrink-0 bg-white">
        <MessageSquare className="w-3.5 h-3.5 text-ficium" />
        <span className="text-[11px] font-bold text-ficium uppercase tracking-wider">
          {senderType === "client" ? "Chat with your bank" : "Chat with client"}
        </span>
        <span className="ml-auto text-[10px] text-muted">Messages visible to both parties</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-cream/30 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-8 h-8 text-ink/15 mx-auto mb-2" />
            <p className="text-[12px] text-muted">
              {senderType === "client"
                ? "No messages yet. Ask the bank a question."
                : "No messages yet. Start the conversation."}
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_type === senderType;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <span className="text-[10px] text-muted px-1 capitalize">{msg.sender_type}</span>
                  )}
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
