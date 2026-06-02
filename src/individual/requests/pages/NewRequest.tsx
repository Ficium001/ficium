import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Brain, Lock, CheckCircle2,
  Loader2, AlertCircle, RotateCcw, Sparkles,
} from "lucide-react";
import { useProfile } from "../../dashboard/hooks/useDashboard";
import { createRequest } from "../api/requests";
import { streamClaude } from "../../../lib/claude";
import { BottomNav } from "../../../shared/ui";

/* ─── Types ─────────────────────────────────────────────── */
type Msg = { id: string; role: "user" | "assistant"; text: string; thinking?: boolean };

type ParsedRequest = {
  productType: string;
  amount: number;
  purpose: string;
  preferredTermMonths: number;
  maxRate: number | null;
  decisionDeadline: string | null;
};

/* ─── Chip sets ─────────────────────────────────────────── */
const STARTER_CHIPS = [
  "I need a personal loan",
  "I want a fixed deposit",
  "SME / business funding",
  "I'm looking at a mortgage",
  "Investment account",
];

/* ─── Parse READY block from Claude's text ──────────────── */
function extractReady(text: string): ParsedRequest | null {
  const match = text.match(/READY:(\{.*?\})/s);
  if (!match) return null;
  try { return JSON.parse(match[1]) as ParsedRequest; }
  catch { return null; }
}

/* ─── Strip READY block from display text ───────────────── */
function stripReady(text: string): string {
  return text.replace(/READY:\{.*?\}/s, "").trim();
}

/* ─── Main page ─────────────────────────────────────────── */
export default function NewRequest() {
  const navigate   = useNavigate();
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useProfile();

  /* Gate: KYC + dossier */
  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.kycStatus !== "verified") { navigate("/onboarding/kyc", { replace: true }); return; }
    if (!profile.hasDossier)               { navigate("/onboarding/dossier", { replace: true }); }
  }, [profile, profileLoading, navigate]);

  const firstName = profile?.firstName ?? profile?.fullName?.split(" ")[0] ?? "there";

  const GREETING: Msg = {
    id: "0",
    role: "assistant",
    text: `Hi ${firstName}! I'm Ficium AI — I'll help you post a request so banks can compete with their best offers.\n\nWhat are you looking for today? You can tell me in your own words, or pick one below.`,
  };

  const [messages,    setMessages]    = useState<Msg[]>([GREETING]);
  const [input,       setInput]       = useState("");
  const [streaming,   setStreaming]   = useState(false);
  const [parsed,      setParsed]      = useState<ParsedRequest | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  /* Scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const profileContext = profile ? {
    monthlyIncome: profile.totalNetWorth,
    netWorth:      profile.totalNetWorth,
    healthScore:   profile.healthScore,
  } : undefined;

  /* Send a message to Claude */
  const send = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Msg = { id: Date.now().toString(), role: "user", text };
    const aiId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, userMsg, { id: aiId, role: "assistant", text: "", thinking: true }]);
    setInput("");
    setStreaming(true);

    const history = [...messages, userMsg].map(m => ({
      role:    m.role === "assistant" ? "assistant" as const : "user" as const,
      content: m.text,
    }));

    let full = "";

    await streamClaude(
      "/api/request-builder",
      { messages: history, profile: profileContext },
      {
        onToken: (token) => {
          full += token;
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, text: stripReady(full), thinking: false } : m
          ));
        },
        onDone: (complete) => {
          const ready = extractReady(complete);
          if (ready) setParsed(ready);
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, text: stripReady(complete), thinking: false } : m
          ));
          setStreaming(false);
          inputRef.current?.focus();
        },
        onError: (err) => {
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, text: `Sorry, something went wrong: ${err}`, thinking: false } : m
          ));
          setStreaming(false);
        },
      }
    );
  }, [messages, streaming, profileContext]);

  /* Submit the parsed request to Supabase */
  const submitRequest = async () => {
    if (!parsed) return;
    setSubmitting(true);
    setSubmitError(null);

    const result = await createRequest({
      productType:         parsed.productType as any,
      amount:              parsed.amount,
      purpose:             parsed.purpose,
      preferredTermMonths: parsed.preferredTermMonths,
      maxRate:             parsed.maxRate ?? undefined,
      decisionDeadline:    parsed.decisionDeadline ?? undefined,
    });

    if (!result.ok) {
      setSubmitError(result.error);
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setTimeout(() => navigate("/dashboard"), 2000);
  };

  const reset = () => {
    setMessages([GREETING]);
    setParsed(null);
    setSubmitError(null);
    setSubmitted(false);
    setInput("");
  };

  if (profileLoading) return null;

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 grid place-items-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="font-display text-3xl font-bold text-ink mb-2">Request posted!</h2>
          <p className="text-muted text-[15px]">Banks are already reviewing your request. You'll be notified when bids arrive.</p>
          <p className="text-muted text-[13px] mt-2">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">

      {/* ── Top gradient ── */}
      <div className="absolute top-0 left-0 right-0 h-[180px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cream to-transparent" />
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 max-w-[720px] mx-auto w-full px-5 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-white transition-colors no-underline">
            <ArrowLeft size={15} /> Back
          </Link>
          <button onClick={reset} title="Start over" className="w-9 h-9 rounded-full bg-white/10 border border-white/10 grid place-items-center text-white/60 hover:text-white hover:bg-white/15 transition-colors">
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="mt-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-ficium grid place-items-center">
              <Brain size={13} className="text-white" />
            </div>
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Ficium AI</span>
          </div>
          <h1 className="font-display text-[28px] font-extrabold text-white leading-tight">Request Builder</h1>
        </div>

        {/* Privacy note */}
        <div className="flex items-center gap-2 bg-white/[0.08] border border-white/10 rounded-xl px-3.5 py-2.5 mb-2">
          <Lock size={13} className="text-white/50 flex-shrink-0" />
          <p className="text-[12px] text-white/50">Your identity stays anonymous. Banks only see your request details.</p>
        </div>
      </div>

      {/* ── Chat messages ── */}
      <div className="flex-1 overflow-y-auto max-w-[720px] mx-auto w-full px-5 py-4 space-y-4 relative z-10">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}

        {/* ── Parsed confirmation card ── */}
        {parsed && !submitted && (
          <div className="bg-white rounded-[22px] border border-ficium/20 shadow-ficium overflow-hidden">
            <div className="bg-gradient-to-r from-ficium to-ficium-deep px-5 py-4 flex items-center gap-2">
              <Sparkles size={15} className="text-white" />
              <span className="text-[13px] font-bold text-white">Ready to post</span>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              <RequestRow label="Product"    value={parsed.productType.replace(/_/g, " ")} />
              <RequestRow label="Amount"     value={`MUR ${parsed.amount.toLocaleString("en-MU")}`} />
              <RequestRow label="Purpose"    value={parsed.purpose} />
              <RequestRow label="Term"       value={`${parsed.preferredTermMonths} months`} />
              {parsed.maxRate && <RequestRow label="Max rate" value={`${parsed.maxRate}% APR`} />}
              {parsed.decisionDeadline && <RequestRow label="Deadline" value={parsed.decisionDeadline} />}
            </div>

            {submitError && (
              <div className="mx-5 mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-[13px] text-red-600">{submitError}</p>
              </div>
            )}

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={submitRequest}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-ficium hover:bg-ficium-deep text-white font-bold py-3.5 rounded-2xl transition-colors text-[14px] disabled:opacity-60 shadow-ficium"
              >
                {submitting
                  ? <><Loader2 size={16} className="animate-spin" /> Posting…</>
                  : <><CheckCircle2 size={16} /> Post request</>
                }
              </button>
              <button
                onClick={() => { setParsed(null); send("Let me change something"); }}
                disabled={submitting}
                className="px-5 py-3.5 rounded-2xl border border-ink/10 text-[13px] font-semibold text-muted hover:bg-ink/[0.03] transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Starter chips (only when on first message) ── */}
      {messages.length === 1 && !streaming && (
        <div className="max-w-[720px] mx-auto w-full px-5 pb-3 relative z-10">
          <div className="flex gap-2 flex-wrap">
            {STARTER_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => send(chip)}
                className="px-3.5 py-2 bg-white border border-ink/[0.08] rounded-pill text-[12px] font-semibold text-ink/70 hover:border-ficium/30 hover:text-ficium transition-colors shadow-sm"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      {!parsed && (
        <div className="max-w-[720px] mx-auto w-full px-5 pb-6 pt-2 relative z-10">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-3 bg-white rounded-[18px] border border-ink/[0.10] px-4 py-3 shadow-sm focus-within:border-ficium/30 focus-within:ring-2 focus-within:ring-ficium/10 transition-all"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me what you need…"
              className="flex-1 text-[15px] text-ink placeholder:text-ink/35 outline-none bg-transparent"
              disabled={streaming}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim() || streaming}
              className="w-9 h-9 rounded-xl bg-ficium text-white grid place-items-center disabled:opacity-40 hover:bg-ficium-deep transition-all flex-shrink-0"
            >
              {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
          <p className="text-center text-[11px] text-muted mt-2">
            Ficium AI · Powered by Claude · Not financial advice
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

/* ─── Chat bubble ─────────────────────────────────────────── */
function ChatBubble({ msg }: { msg: Msg }) {
  const isAI = msg.role === "assistant";

  if (!isAI) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-ficium text-white px-4 py-3 rounded-[18px] rounded-tr-md text-[14px] leading-relaxed font-medium shadow-ficium">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f0c29] to-[#302b63] grid place-items-center flex-shrink-0 border border-ficium/20 shadow-sm">
        <Brain size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-[22px] rounded-tl-md border border-ink/[0.06] px-5 py-4 shadow-sm">
          {msg.thinking ? (
            <div className="flex items-center gap-2">
              {[0,1,2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-ficium/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-ink/85 leading-relaxed whitespace-pre-line m-0">
              {msg.text}
            </p>
          )}
        </div>
        <p className="text-[11px] text-muted mt-1 ml-1">Ficium AI · Powered by Claude</p>
      </div>
    </div>
  );
}

/* ─── Request detail row ──────────────────────────────────── */
function RequestRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[12px] text-muted font-medium capitalize w-24 flex-shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-ink text-right capitalize">{value}</span>
    </div>
  );
}
