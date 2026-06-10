import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Send, Brain, Sparkles,  PiggyBank,
  LineChart, Building2, ArrowRight,
  ChevronRight, RefreshCw, User,
} from "lucide-react";
import { useProfile } from "../../dashboard/hooks/useDashboard";
import { BottomNav } from "../../../shared/ui";
import { type ClaudeMessage } from "@/shared/lib/claude";
import { apiPost } from "@/shared/lib/api";

// Profile-aware Claude call — passes userId so Claude knows the user's finances
async function askClaudeWithProfile(messages: ClaudeMessage[], userId?: string): Promise<string> {
  const res = await apiPost("/api/chat", { messages, userId });
  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return data.reply ?? "";
}

/* ============================================================
   TYPES
   ============================================================ */
type MessageRole = "ai" | "user";

interface OpportunityCard {
  label: string;
  rate: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  text?: string;
  opportunities?: OpportunityCard[];
  chips?: string[];
  thinking?: boolean;
}

/* ============================================================
   CONSTANTS
   ============================================================ */
const QUICK_CHIPS = [
  "Compare personal loans",
  "Best investment opportunities",
  "High-yield deposits",
  "Improve my financial health",
  "Grow my net worth",
  "Which bank fits me?",
];

const OPPORTUNITIES: OpportunityCard[] = [
  {
    label: "Personal Loans",
    rate: "8.2%",
    desc: "Competitive financing offers available",
    icon: Building2,
    color: "text-ficium",
    iconBg: "bg-ficium/10",
  },
  {
    label: "Deposits",
    rate: "5.4%",
    desc: "High-yield savings opportunities",
    icon: PiggyBank,
    color: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  {
    label: "Investments",
    rate: "+12%",
    desc: "Wealth products aligned to your profile",
    icon: LineChart,
    color: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
];

/* ============================================================
   INITIAL GREETING MESSAGE FACTORY
   ============================================================ */
function buildGreeting(firstName: string): ChatMessage {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return {
    id: "greeting",
    role: "ai",
    text: `${greeting} ${firstName}.\n\nI analyzed your financial profile and identified opportunities across lending, savings, and investments.\n\nBased on your current financial position, you may qualify for more competitive borrowing rates, improved deposit yields, and investment products aligned with your goals.\n\nI can also help you compare bank offers, optimize your financial health, and identify strategies to grow your net worth over time.`,
    opportunities: OPPORTUNITIES,
    chips: QUICK_CHIPS,
  };
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
const FREE_LIMIT = 3; // messages per month for free users
const STORAGE_KEY = `ficium_ai_msgs_${new Date().getFullYear()}_${new Date().getMonth()}`;

function getUsedMessages(): number {
  try { return parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10); }
  catch { return 0; }
}
function incrementUsedMessages(): number {
  const next = getUsedMessages() + 1;
  try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
  return next;
}

export default function Advisor() {
  const { data: profile } = useProfile();
  const firstName = profile?.firstName ?? profile?.fullName?.split(" ")[0] ?? "there";

  const [messages, setMessages] = useState<ChatMessage[]>([
    buildGreeting(firstName),
  ]);
  const [input,     setInput]    = useState("");
  const [thinking,  setThinking] = useState(false);
  const [usedMsgs,  setUsedMsgs] = useState(getUsedMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const isFreeTierExhausted = usedMsgs >= FREE_LIMIT;
  const remaining = Math.max(0, FREE_LIMIT - usedMsgs);

  /* Update greeting when profile loads */
  useEffect(() => {
    setMessages([buildGreeting(firstName)]);
  }, [firstName]);

  /* Auto-scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || thinking || isFreeTierExhausted) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    const used = incrementUsedMessages();
    setUsedMsgs(used);

    // Build history with user context
    const history: ClaudeMessage[] = [...messages, userMsg].map((m) => ({
      role:    m.role === "ai" ? "assistant" : "user",
      content: m.text ?? "",
    }));

    try {
      const reply = await askClaudeWithProfile(history, profile?.userId);
      setMessages((prev) => [...prev, {
        id:   (Date.now() + 1).toString(),
        role: "ai",
        text: reply,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id:   (Date.now() + 1).toString(),
        role: "ai",
        text: "Sorry, I couldn't connect right now. Please try again in a moment.",
      }]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  }, [thinking, messages]);

  const handleChip = (chip: string) => sendMessage(chip);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="min-h-screen flex flex-col pb-20 lg:pb-0">

      {/* ── GRADIENT BG ── */}
      <div className="absolute top-0 left-0 right-0 h-[220px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.45) 0%, transparent 60%)",
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#f8f7f4] to-transparent" />
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10 flex flex-col lg:flex-row gap-6 flex-1">

        {/* ── SIDEBAR (desktop only) ── */}
        <aside className="hidden lg:flex flex-col gap-5 w-[280px] flex-shrink-0 pt-10">
          {/* Branding */}
          <div className="rounded-[22px] bg-white/[0.08] backdrop-blur-xl border border-white/[0.10] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center">
                <Brain size={17} className="text-white" />
              </div>
              <div>
                <div className="text-[15px] font-bold text-white leading-tight">Ficium AI</div>
                <div className="text-[11px] text-white/50">Financial Coach</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-white/50">Live</span>
              </div>
            </div>
            <p className="text-[13px] text-white/50 leading-relaxed">
              Powered by Claude. Analyses your real financial data to give personalised, actionable advice.
            </p>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-[22px] border border-ink/[0.06] p-4 shadow-sm">
            <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-3">Quick questions</div>
            <div className="flex flex-col gap-1.5">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  className="text-left px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-ink/75 hover:bg-ficium/[0.06] hover:text-ficium transition-colors flex items-center gap-2 group"
                >
                  <ChevronRight size={12} className="text-ficium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Market snapshot */}
          <div className="bg-white rounded-[22px] border border-ink/[0.06] p-4 shadow-sm">
            <div className="text-[12px] font-bold text-muted uppercase tracking-widest mb-3">Market snapshot</div>
            <div className="flex flex-col gap-3">
              {OPPORTUNITIES.map((o) => {
                const Icon = o.icon;
                return (
                  <div key={o.label} className="flex items-center gap-3">
                    <div className={["w-8 h-8 rounded-lg grid place-items-center flex-shrink-0", o.iconBg].join(" ")}>
                      <Icon size={14} className={o.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-ink">{o.label}</div>
                      <div className="text-[11px] text-muted">{o.desc}</div>
                    </div>
                    <div className={["text-[15px] font-extrabold", o.color].join(" ")}>{o.rate}</div>
                  </div>
                );
              })}
            </div>
            <Link to="/requests/new" className="mt-4 flex items-center justify-center gap-1.5 bg-ficium/[0.06] hover:bg-ficium/10 text-ficium text-[12px] font-bold py-2.5 rounded-xl no-underline transition-colors">
              Get competing bids <ArrowRight size={11} />
            </Link>
          </div>
        </aside>

        {/* ── CHAT AREA ── */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Header */}
          <div className="pt-8 pb-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-1">AI Financial Coach</div>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white leading-tight">Advisor</h1>
            </div>
            <button
              onClick={() => setMessages([buildGreeting(firstName)])}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 grid place-items-center text-white/70 hover:bg-white/15 transition-colors"
              title="New conversation"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-5 py-4 pr-1 scrollbar-hide">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} onChip={handleChip} />
            ))}

            {/* Thinking indicator */}
            {thinking && <ThinkingBubble />}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="pt-3 pb-2">

            {/* Mobile chips */}
            {!isFreeTierExhausted && (
              <div className="flex gap-2 overflow-x-auto pb-3 lg:hidden scrollbar-hide">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleChip(chip)}
                    className="flex-shrink-0 px-3.5 py-2 bg-white border border-ink/[0.08] rounded-pill text-[12px] font-semibold text-ink/70 hover:border-ficium/30 hover:text-ficium transition-colors shadow-sm"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Free tier exhausted wall */}
            {isFreeTierExhausted ? (
              <div className="bg-white rounded-[22px] border border-ink/[0.08] p-6 text-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-ficium/10 grid place-items-center mx-auto mb-4">
                  <Brain size={22} className="text-ficium" />
                </div>
                <div className="font-display text-[18px] font-bold text-ink mb-1">
                  {FREE_LIMIT} free messages used
                </div>
                <p className="text-[13px] text-muted mb-5 max-w-[280px] mx-auto leading-relaxed">
                  Upgrade to Ficium Premium for unlimited AI coaching, deeper financial analysis, and priority insights.
                </p>
                <div className="flex flex-col gap-2">
                  <button className="w-full bg-ficium text-white font-bold py-3.5 rounded-2xl text-[14px] shadow-ficium hover:bg-ficium-deep transition-colors">
                    Upgrade — MUR 199/month
                  </button>
                  <p className="text-[11px] text-muted">Resets on the 1st of each month</p>
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white rounded-[18px] border border-ink/[0.10] px-4 py-3 shadow-sm focus-within:border-ficium/30 focus-within:ring-2 focus-within:ring-ficium/10 transition-all">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything about your finances…"
                    className="flex-1 text-[15px] text-ink placeholder:text-ink/35 outline-none bg-transparent"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || thinking}
                    className="w-9 h-9 rounded-xl bg-ficium text-white grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ficium/90 transition-all flex-shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </form>
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-[11px] text-muted">Ficium AI · Not financial advice</p>
                  <p className={`text-[11px] font-semibold ${remaining === 1 ? "text-amber-500" : "text-muted"}`}>
                    {remaining} free message{remaining !== 1 ? "s" : ""} left this month
                  </p>
                </div>
              </>
            )}

          </div>{/* end input */}
        </div>{/* end chat area */}
      </div>{/* end desktop layout */}

      <BottomNav />
    </div>
  );
}

/* ============================================================
   CHAT BUBBLE
   ============================================================ */
function ChatBubble({ message, onChip }: { message: ChatMessage; onChip: (chip: string) => void }) {
  const isAI = message.role === "ai";

  if (!isAI) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[75%] bg-ficium text-white px-4 py-3 rounded-[18px] rounded-tr-md text-[14px] leading-relaxed font-medium shadow-ficium">
          {message.text}
        </div>
        <div className="w-8 h-8 rounded-full bg-ink/10 grid place-items-center flex-shrink-0 self-end">
          <User size={14} className="text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      {/* AI Avatar */}
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f0c29] to-[#302b63] grid place-items-center flex-shrink-0 shadow-sm border border-ficium/20">
        <Brain size={15} className="text-white" />
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-[22px] rounded-tl-md border border-ink/[0.06] px-5 py-4 shadow-sm">

          {/* Text */}
          {message.text && (
            <p className="text-[15px] text-ink/85 leading-relaxed whitespace-pre-line mb-0">
              {message.text}
            </p>
          )}

          {/* Opportunities */}
          {message.opportunities && (
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-ficium" />
                <span className="text-[12px] font-bold text-ficium uppercase tracking-widest">Financial opportunities for you</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {message.opportunities.map((o) => {
                  const Icon = o.icon;
                  return (
                    <div key={o.label} className="rounded-[16px] bg-[#F8F7FC] border border-ink/[0.05] p-4 hover:-translate-y-0.5 transition-transform">
                      <div className={["w-9 h-9 rounded-xl grid place-items-center mb-3", o.iconBg].join(" ")}>
                        <Icon size={16} className={o.color} />
                      </div>
                      <div className="font-display text-[13px] font-bold text-ink mb-1">{o.label}</div>
                      <div className={["font-display text-[28px] font-extrabold leading-none mb-1", o.color].join(" ")}>{o.rate}</div>
                      <div className="text-[11px] text-muted leading-snug">{o.desc}</div>
                      <Link to="/requests/new" className="mt-3 block text-center bg-ink text-white py-2.5 rounded-xl text-[12px] font-bold no-underline hover:bg-ink/80 transition-colors">
                        Get offers
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chips */}
          {message.chips && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onChip(chip)}
                  className="px-3.5 py-1.5 bg-ficium/[0.07] hover:bg-ficium/15 text-ficium text-[12px] font-semibold rounded-pill transition-colors border border-ficium/10"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI label */}
        <div className="flex items-center gap-1.5 mt-1.5 ml-1">
          <Brain size={10} className="text-muted" />
          <span className="text-[11px] text-muted font-medium">Ficium AI · Powered by Claude</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   THINKING BUBBLE
   ============================================================ */
function ThinkingBubble() {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f0c29] to-[#302b63] grid place-items-center flex-shrink-0 shadow-sm border border-ficium/20">
        <Brain size={15} className="text-white" />
      </div>
      <div className="bg-white rounded-[22px] rounded-tl-md border border-ink/[0.06] px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-ficium/50 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="text-[13px] text-muted font-medium">Ficium AI is analyzing financial opportunities…</span>
        </div>
      </div>
    </div>
  );
}