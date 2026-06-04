import { Activity, Zap, FileText } from "lucide-react";
import { MiniSparkline }           from "./MiniSparkline";
import {
  SPARK_HEALTH, SPARK_NETWORTH, SPARK_REQUESTS,
  healthLabel,
} from "@/individual/dashboard/config/dashboard";

interface FlipCardsProps {
  loading:       boolean;
  healthScore:   number | null;
  bankReadiness: number | null;
  activeRequests: number;
  totalNewBids:  number;
  flipped:       Record<string, boolean>;
  onFlip:        (id: string) => void;
}

// Three glass-morphism cards that flip on tap to reveal secondary stats.
// Flip state is lifted to the parent so it can be reset (e.g. on route change).
export function FlipCards({
  loading, healthScore, bankReadiness, activeRequests,
  totalNewBids, flipped, onFlip,
}: FlipCardsProps) {
  const hs = healthLabel(healthScore);

  return (
    <div className="grid grid-cols-3 gap-2.5 mb-5">

      {/* ── Health Score ── */}
      <FlipCard id="health" flipped={!!flipped.health} onFlip={onFlip}>
        <FlipFront>
          <FlipIcon bg="bg-red-500/20"><Activity size={13} className="text-red-400" /></FlipIcon>
          <Badge style={{ background: `${hs.color}20`, color: hs.color }}>
            <Dot color={hs.color} /> {hs.label}
          </Badge>
          <FlipValue loading={loading} value={healthScore} suffix="/100" />
          <FlipLabel>Financial Health</FlipLabel>
          <SparkSlot><MiniSparkline points={SPARK_HEALTH} color="#dc2626" /></SparkSlot>
        </FlipFront>
        <FlipBack>
          <Stat value="↓ 3 pts" color="text-red-400"   label="vs last month" />
          <Divider />
          <Stat value="2 flags" color="text-white"     label="need action"   />
        </FlipBack>
      </FlipCard>

      {/* ── Bank Readiness ── */}
      <FlipCard id="nw" flipped={!!flipped.nw} onFlip={onFlip}>
        <FlipFront>
          <FlipIcon bg="bg-ficium/20"><Zap size={13} className="text-indigo-300" /></FlipIcon>
          <Badge className="bg-emerald-400/20 text-emerald-300">
            <Dot color="#34d399" /> Strong
          </Badge>
          <FlipValue loading={loading} value={bankReadiness} suffix="%" />
          <FlipLabel>Readiness</FlipLabel>
          <SparkSlot><MiniSparkline points={SPARK_NETWORTH} color="#4f46e5" /></SparkSlot>
        </FlipFront>
        <FlipBack>
          <Stat value="↑ 5 pts" color="text-emerald-300" label="vs last month" />
          <Divider />
          <Stat value="Top 20%"  color="text-white"       label="of applicants" />
        </FlipBack>
      </FlipCard>

      {/* ── Requests ── */}
      <FlipCard id="req" flipped={!!flipped.req} onFlip={onFlip}>
        <FlipFront>
          <FlipIcon bg="bg-emerald-400/20"><FileText size={13} className="text-emerald-300" /></FlipIcon>
          <Badge className="bg-ficium/20 text-indigo-300">
            <Dot color="#818cf8" /> {activeRequests > 0 ? "Open" : "None"}
          </Badge>
          <FlipValue loading={loading} value={activeRequests} suffix=" active" />
          <FlipLabel>Requests</FlipLabel>
          <SparkSlot><MiniSparkline points={SPARK_REQUESTS} color="#16a47a" /></SparkSlot>
        </FlipFront>
        <FlipBack>
          <Stat value={`${totalNewBids} bids`} color="text-white"     label="awaiting review" />
          <Divider />
          <Stat value="~2 days"               color="text-amber-300" label="avg. response"   />
        </FlipBack>
      </FlipCard>

    </div>
  );
}

// ── Internal primitives ───────────────────────────────────────────────────────

function FlipCard({
  id, flipped, onFlip, children,
}: { id: string; flipped: boolean; onFlip: (id: string) => void; children: React.ReactNode }) {
  return (
    <div className="cursor-pointer" onClick={() => onFlip(id)} style={{ perspective: "800px" }}>
      <div
        className={["relative transition-transform duration-500", flipped ? "[transform:rotateY(180deg)]" : ""].join(" ")}
        style={{ transformStyle: "preserve-3d", minHeight: "165px" }}
      >
        {children}
      </div>
    </div>
  );
}

function FlipFront({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col [backface-visibility:hidden]">
      {children}
    </div>
  );
}

function FlipBack({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.12] p-3.5 flex flex-col justify-center gap-3 [backface-visibility:hidden] [transform:rotateY(180deg)]">
      {children}
    </div>
  );
}

function FlipIcon({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div className={["w-7 h-7 rounded-lg grid place-items-center mb-2", bg].join(" ")}>
      {children}
    </div>
  );
}

function Badge({ children, className, style }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={["absolute top-3 right-3 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-pill", className].join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <div className="w-1 h-1 rounded-full" style={{ background: color }} />;
}

function FlipValue({ loading, value, suffix }: { loading: boolean; value: number | null; suffix: string }) {
  return (
    <div className="font-display text-[32px] font-extrabold text-white leading-none">
      {loading ? "—" : (value ?? "—")}
      <span className="text-[13px] font-semibold text-white/40 ml-0.5">{suffix}</span>
    </div>
  );
}

function FlipLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] text-white/50 font-semibold mt-1">{children}</div>;
}

function SparkSlot({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto -mx-3.5 -mb-3.5">{children}</div>;
}

function Stat({ value, color, label }: { value: string; color: string; label: string }) {
  return (
    <div>
      <div className={["text-[15px] font-extrabold", color].join(" ")}>{value}</div>
      <div className="text-[9px] text-white/40 font-semibold">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/10" />;
}
