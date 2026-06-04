import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, RefreshCw, DollarSign, BarChart2, Globe, Newspaper, Percent, Landmark } from "lucide-react";
import { BottomNav } from "../../../shared/ui";

// ── Types ────────────────────────────────────────────────────────────────────
interface Ticker {
  label: string;
  value: string;
  change?: number;    // percent or bps, positive = up
  unit?: string;
  icon: React.ElementType;
  color: string;
  story: string;      // human-friendly one-liner
}

interface NewsItem {
  headline: string;
  tag: string;
  tagColor: string;
  what: string;       // plain-english "what this means for you"
  emoji: string;
}

// ── Mock data (replace with live API calls) ──────────────────────────────────
function buildTickers(): Ticker[] {
  return [
    {
      label: "Repo Rate",
      value: "4.50%",
      change: 0,
      unit: "",
      icon: Percent,
      color: "#3D6EF5",
      story: "The rate the Bank of Mauritius charges banks — influences your loan & savings rates.",
    },
    {
      label: "USD / MUR",
      value: "46.20",
      change: -0.3,
      unit: "",
      icon: DollarSign,
      color: "#16a34a",
      story: "It costs MUR 46.20 to buy 1 US Dollar today.",
    },
    {
      label: "EUR / MUR",
      value: "50.15",
      change: 0.5,
      unit: "",
      icon: Globe,
      color: "#d97706",
      story: "If you bought something priced in Euros, expect to pay more rupees this week.",
    },
    {
      label: "GBP / MUR",
      value: "58.80",
      change: -0.1,
      unit: "",
      icon: Globe,
      color: "#7c3aed",
      story: "The British pound is slightly cheaper than last week — good news if you send money to the UK.",
    },
    {
      label: "SEMDEX",
      value: "2,341",
      change: 1.2,
      unit: "pts",
      icon: BarChart2,
      color: "#0891b2",
      story: "Mauritius's main stock index is up — local businesses are feeling optimistic.",
    },
    {
      label: "Avg Deposit Rate",
      value: "3.80%",
      change: 0.1,
      unit: "",
      icon: Landmark,
      color: "#16a34a",
      story: "Banks are offering slightly more on savings this month. Shop around — Ficium can help.",
    },
    {
      label: "Avg Lending Rate",
      value: "8.25%",
      change: -0.2,
      unit: "",
      icon: TrendingDown,
      color: "#dc2626",
      story: "Average loan rates dipped a little — a good time to request a better deal through Ficium.",
    },
  ];
}

const NEWS: NewsItem[] = [
  {
    headline: "Bank of Mauritius holds repo rate steady at 4.50%",
    tag: "Interest Rates",
    tagColor: "#3D6EF5",
    emoji: "🏦",
    what: "Your existing loan EMIs won't change for now. But if rates drop next quarter, you could refinance for less.",
  },
  {
    headline: "Rupee weakens slightly against USD as global oil prices rise",
    tag: "Currency",
    tagColor: "#d97706",
    emoji: "💱",
    what: "Imported goods like electronics and petrol may cost a bit more. If you have USD savings, they're worth more now.",
  },
  {
    headline: "SEMDEX closes 1.2% higher led by banking and telecom stocks",
    tag: "Stock Market",
    tagColor: "#0891b2",
    emoji: "📈",
    what: "Local companies are doing well. If you have pension savings or unit trusts, this is likely good news for your balance.",
  },
  {
    headline: "Competition pushes local banks to offer better deposit rates",
    tag: "Savings",
    tagColor: "#16a34a",
    emoji: "🏧",
    what: "Banks are competing for your deposits. Use Ficium to post a savings request and let banks compete to give you the best rate.",
  },
  {
    headline: "Personal loan demand rises ahead of end-of-year spending",
    tag: "Lending",
    tagColor: "#7c3aed",
    emoji: "💳",
    what: "Many people are borrowing now. Posting on Ficium means banks compete to offer you the lowest rate — instead of you going door to door.",
  },
];

// ── Sparkline ────────────────────────────────────────────────────────────────
function Spark({ data, color, up }: { data: number[]; color: string; up: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 64, h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline
        points={`0,${h} ${pts} ${w},${h}`}
        fill={color}
        opacity="0.12"
      />
    </svg>
  );
}

// ── Change badge ─────────────────────────────────────────────────────────────
function ChangeBadge({ change }: { change?: number }) {
  if (change === undefined || change === 0) return <span className="text-[11px] text-muted font-semibold">— no change</span>;
  const up = change > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-bold ${up ? "text-green-600" : "text-red-500"}`}>
      <Icon size={11} />
      {up ? "+" : ""}{change.toFixed(2)}%
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Markets() {
  const [tickers] = useState<Ticker[]>(buildTickers());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [activeStory, setActiveStory] = useState<Ticker | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const sparkData: Record<string, number[]> = {
    "Repo Rate":        [4.5, 4.5, 4.5, 4.5, 4.5, 4.5, 4.5],
    "USD / MUR":        [46.0, 46.1, 46.3, 46.5, 46.4, 46.2, 46.2],
    "EUR / MUR":        [49.6, 49.7, 49.9, 50.0, 50.1, 50.0, 50.15],
    "GBP / MUR":        [59.1, 58.9, 58.8, 59.0, 58.9, 58.85, 58.8],
    "SEMDEX":           [2280, 2295, 2310, 2300, 2315, 2330, 2341],
    "Avg Deposit Rate": [3.6, 3.65, 3.7, 3.72, 3.75, 3.78, 3.8],
    "Avg Lending Rate": [8.5, 8.45, 8.4, 8.35, 8.3, 8.28, 8.25],
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setRefreshing(false);
    }, 800);
  };

  return (
    <div className="min-h-screen pb-28 relative">

      {/* ── HEADER GRADIENT ── */}
      <div className="absolute top-0 left-0 right-0 h-[300px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.45) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(8,145,178,0.25) 0%, transparent 55%)"
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cream to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[680px] px-4 pt-6">

        {/* ── TOP BAR ── */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[12px] font-bold text-white/40 uppercase tracking-widest mb-1">Live</div>
            <h1 className="text-[26px] font-bold text-white leading-tight">Markets</h1>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white/70 text-[12px] font-semibold hover:bg-white/15 transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {lastUpdated.toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" })}
          </button>
        </div>

        {/* ── TICKER SCROLL STRIP ── */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-4 px-4 scrollbar-hide">
          {tickers.map((t) => {
            const Icon = t.icon;
            const up = (t.change ?? 0) > 0;
            const down = (t.change ?? 0) < 0;
            return (
              <button
                key={t.label}
                onClick={() => setActiveStory(activeStory?.label === t.label ? null : t)}
                className="flex-shrink-0 bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-4 w-[140px] text-left transition-all hover:shadow-md"
                style={activeStory?.label === t.label ? { borderColor: t.color, boxShadow: `0 0 0 2px ${t.color}22` } : {}}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: `${t.color}18` }}>
                    <Icon size={14} style={{ color: t.color }} />
                  </div>
                  {(t.change ?? 0) !== 0 && (
                    <div className={`w-5 h-5 rounded-full grid place-items-center ${up ? "bg-green-50" : "bg-red-50"}`}>
                      {up ? <TrendingUp size={10} className="text-green-600" /> : <TrendingDown size={10} className="text-red-500" />}
                    </div>
                  )}
                  {(t.change ?? 0) === 0 && <Minus size={10} className="text-muted" />}
                </div>
                <div className="text-[18px] font-bold text-ink leading-none mb-0.5">{t.value}</div>
                <div className="text-[10px] font-semibold text-muted leading-tight mb-2">{t.label}</div>
                <Spark data={sparkData[t.label] ?? [1, 1, 1, 1, 1, 1, 1]} color={t.color} up={up} />
              </button>
            );
          })}
        </div>

        {/* ── ACTIVE STORY CALLOUT ── */}
        {activeStory && (
          <div
            className="mb-5 p-4 rounded-2xl border text-sm text-ink animate-[fadeSlide_0.2s_ease]"
            style={{ background: `${activeStory.color}0D`, borderColor: `${activeStory.color}33` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: activeStory.color }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: activeStory.color }}>
                What this means
              </span>
            </div>
            <p className="text-[13px] text-ink/80 leading-relaxed">{activeStory.story}</p>
          </div>
        )}

        {/* ── DIVIDER ── */}
        <div className="flex items-center gap-3 mb-5">
          <Newspaper size={15} className="text-muted" />
          <span className="text-[12px] font-bold text-muted uppercase tracking-widest">Financial Stories</span>
          <div className="flex-1 h-px bg-ink/[0.07]" />
        </div>

        {/* ── NEWS CARDS ── */}
        <div className="space-y-3">
          {NEWS.map((n, i) => (
            <NewsCard key={i} item={n} />
          ))}
        </div>

        {/* ── FICIUM CTA ── */}
        <div className="mt-8 mb-2 rounded-2xl overflow-hidden" style={{
          background: "linear-gradient(135deg, #1a1040 0%, #0f0c29 60%, #302b63 100%)"
        }}>
          <div className="p-5">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Ficium Tip</div>
            <p className="text-[15px] font-semibold text-white leading-snug mb-4">
              Banks on Ficium are competing right now — lending rates are easing. Lock in a great deal before they go up again.
            </p>
            <a
              href="/requests/new"
              className="inline-flex items-center gap-2 bg-[#3D6EF5] text-white text-[13px] font-bold px-5 py-2.5 rounded-xl no-underline hover:bg-[#3360e0] transition-colors"
            >
              Post a Request
              <TrendingUp size={14} />
            </a>
          </div>
        </div>

      </div>

      <BottomNav />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── News Card ─────────────────────────────────────────────────────────────────
function NewsCard({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <button
      onClick={() => setExpanded((p) => !p)}
      className="w-full text-left bg-white rounded-2xl border border-ink/[0.06] shadow-sm p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5">{item.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
              style={{ background: item.tagColor }}
            >
              {item.tag}
            </span>
          </div>
          <p className="text-[14px] font-semibold text-ink leading-snug">{item.headline}</p>
          {expanded && (
            <div className="mt-3 pt-3 border-t border-ink/[0.06]">
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">What this means for you</div>
              <p className="text-[13px] text-muted leading-relaxed">{item.what}</p>
            </div>
          )}
          <div className="text-[11px] text-muted/60 mt-2 font-medium">
            {expanded ? "Tap to collapse ↑" : "Tap to learn more ↓"}
          </div>
        </div>
      </div>
    </button>
  );
}
