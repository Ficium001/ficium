import { Activity, Zap, FileText } from "lucide-react";
import { MiniSparkline }           from "./MiniSparkline";
import {
  SPARK_HEALTH, SPARK_NETWORTH, SPARK_REQUESTS,
  healthLabel,
} from "@/individual/dashboard/config/dashboard";

interface FlipCardsProps {
  loading:        boolean;
  healthScore:    number | null;
  bankReadiness:  number | null;
  activeRequests: number;
  totalNewBids:   number;
  flipped:        Record<string, boolean>;
  onFlip:         (id: string) => void;
  /** When true uses white-text glassmorphism (dark bg). Default false = light card. */
  dark?:          boolean;
}

export function FlipCards({
  loading, healthScore, bankReadiness, activeRequests,
  totalNewBids, flipped, onFlip, dark = false,
}: FlipCardsProps) {
  const hs = healthLabel(healthScore);

  return (
    <div className="grid grid-cols-3 gap-2.5">

      {/* ── Health Score ── */}
      <FlipCard id="health" flipped={!!flipped.health} onFlip={onFlip}>
        <FlipFront dark={dark}>
          <FlipIcon bg={dark ? "bg-red-500/20" : "bg-red-50"}>
            <Activity size={13} className="text-red-500" />
          </FlipIcon>
          <StatusBadge
            label={hs.label}
            dotColor={hs.color}
            textColor={hs.color}
            bg={dark ? `${hs.color}20` : `${hs.color}15`}
          />
          <FlipValue loading={loading} value={healthScore} suffix="/100" dark={dark} />
          <FlipLabel dark={dark}>Financial Health</FlipLabel>
          <SparkSlot><MiniSparkline points={SPARK_HEALTH} color="#ef4444" /></SparkSlot>
        </FlipFront>
        <FlipBack dark={dark}>
          <Stat value="↓ 3 pts" color="text-red-500"  label="vs last month"/>
          <Divider dark={dark} />
          <Stat value="2 flags" color={dark ? "text-white" : "text-ink"} label="need action"/>
        </FlipBack>
      </FlipCard>

      {/* ── Bank Readiness ── */}
      <FlipCard id="nw" flipped={!!flipped.nw} onFlip={onFlip}>
        <FlipFront dark={dark}>
          <FlipIcon bg={dark ? "bg-ficium/20" : "bg-ficium/10"}>
            <Zap size={13} className="text-ficium" />
          </FlipIcon>
          <StatusBadge label="Strong" dotColor="#10b981" textColor="#059669" bg="rgba(5,150,105,0.12)" />
          <FlipValue loading={loading} value={bankReadiness} suffix="%" dark={dark} />
          <FlipLabel dark={dark}>Readiness</FlipLabel>
          <SparkSlot><MiniSparkline points={SPARK_NETWORTH} color="#2A1FE6" /></SparkSlot>
        </FlipFront>
        <FlipBack dark={dark}>
          <Stat value="↑ 5 pts" color="text-emerald-600" label="vs last month"/>
          <Divider dark={dark} />
          <Stat value="Top 20%" color={dark ? "text-white" : "text-ink"} label="of applicants"/>
        </FlipBack>
      </FlipCard>

      {/* ── Requests ── */}
      <FlipCard id="req" flipped={!!flipped.req} onFlip={onFlip}>
        <FlipFront dark={dark}>
          <FlipIcon bg={dark ? "bg-emerald-400/20" : "bg-emerald-50"}>
            <FileText size={13} className="text-emerald-600" />
          </FlipIcon>
          <StatusBadge
            label={activeRequests > 0 ? "Open" : "None"}
            dotColor="#6b7280"
            textColor="#6b7280"
            bg="rgba(107,114,128,0.10)"
          />
          <FlipValue loading={loading} value={activeRequests} suffix=" active" dark={dark} />
          <FlipLabel dark={dark}>Requests</FlipLabel>
          <SparkSlot><MiniSparkline points={SPARK_REQUESTS} color="#10b981" /></SparkSlot>
        </FlipFront>
        <FlipBack dark={dark}>
          <Stat value={`${totalNewBids} bids`} color={dark ? "text-white" : "text-ink"} label="awaiting review"/>
          <Divider dark={dark} />
          <Stat value="~2 days" color="text-amber-600" label="avg. response"/>
        </FlipBack>
      </FlipCard>

    </div>
  );
}

// ── Internal primitives ───────────────────────────────────────────────────────

function FlipCard({ id, flipped, onFlip, children }: {
  id: string; flipped: boolean; onFlip: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="cursor-pointer" onClick={() => onFlip(id)} style={{ perspective: "800px" }}>
      <div
        className={["relative transition-transform duration-500", flipped ? "transform-[rotateY(180deg)]" : ""].join(" ")}
        style={{ transformStyle: "preserve-3d", minHeight: "165px" }}
      >
        {children}
      </div>
    </div>
  );
}

function FlipFront({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <div className={[
      "absolute inset-0 rounded-2xl p-3.5 flex flex-col backface-hidden",
      dark
        ? "bg-white/8 backdrop-blur-xl border border-white/12"
        : "bg-[#F7F6F3] border border-ink/[0.07]",
    ].join(" ")}>
      {children}
    </div>
  );
}

function FlipBack({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <div className={[
      "absolute inset-0 rounded-2xl p-3.5 flex flex-col justify-center gap-3 backface-hidden transform-[rotateY(180deg)]",
      dark
        ? "bg-white/12 backdrop-blur-xl border border-white/12"
        : "bg-ficium/6 border border-ficium/15",
    ].join(" ")}>
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

function StatusBadge({ label, dotColor, textColor, bg }: {
  label: string; dotColor: string; textColor: string; bg: string;
}) {
  return (
    <div
      className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-pill"
      style={{ background: bg, color: textColor }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
      {label}
    </div>
  );
}

function FlipValue({ loading, value, suffix, dark }: {
  loading: boolean; value: number | null; suffix: string; dark: boolean;
}) {
  return (
    <div className={["font-display text-[30px] font-extrabold leading-none", dark ? "text-white" : "text-ink"].join(" ")}>
      {loading ? "—" : (value ?? "—")}
      <span className={["text-[12px] font-semibold ml-0.5", dark ? "text-white/40" : "text-muted"].join(" ")}>
        {suffix}
      </span>
    </div>
  );
}

function FlipLabel({ children, dark }: { children: React.ReactNode; dark: boolean }) {
  return (
    <div className={["text-[11px] font-semibold mt-1", dark ? "text-white/50" : "text-muted"].join(" ")}>
      {children}
    </div>
  );
}

function SparkSlot({ children }: { children: React.ReactNode }) {
  return <div className="mt-auto -mx-3.5 -mb-3.5">{children}</div>;
}

function Stat({ value, color, label }: {
  value: string; color: string; label: string;
}) {
  return (
    <div>
      <div className={["text-[15px] font-extrabold", color].join(" ")}>{value}</div>
      <div className="text-[9px] font-semibold text-muted">{label}</div>
    </div>
  );
}

function Divider({ dark }: { dark: boolean }) {
  return <div className={["h-px", dark ? "bg-white/10" : "bg-ink/6"].join(" ")} />;
}
