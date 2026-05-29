import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BellOff, ShieldCheck, ShieldAlert, FileText, Sparkles,
  TrendingDown, TrendingUp, Clock, CheckCheck,
  Filter,
} from "lucide-react";
import { useNotifications, useMarkAllRead, useMarkOneRead } from "../hooks/useAlerts";
import { timeAgo } from "../api/notifications";
import type { AppNotification, NotificationKind } from "../api/notifications";
import { BottomNav } from "../../../shared/ui";

/* ============================================================
   KIND CONFIG
   ============================================================ */
const KIND_CONFIG: Record<NotificationKind, {
  icon: React.ElementType;
  bg: string;
  fg: string;
  dot: string;
  label: string;
}> = {
  kyc_verified:     { icon: ShieldCheck,  bg: "bg-emerald-50",  fg: "text-emerald-600", dot: "bg-emerald-400", label: "KYC" },
  kyc_rejected:     { icon: ShieldAlert,  bg: "bg-red-50",      fg: "text-red-600",     dot: "bg-red-400",     label: "KYC" },
  request_created:  { icon: FileText,     bg: "bg-ficium/10",   fg: "text-ficium",      dot: "bg-ficium",      label: "Request" },
  request_expiring: { icon: Clock,        bg: "bg-amber-50",    fg: "text-amber-600",   dot: "bg-amber-400",   label: "Request" },
  bid_received:     { icon: TrendingUp,   bg: "bg-ficium/10",   fg: "text-ficium",      dot: "bg-ficium",      label: "Bid" },
  bid_accepted:     { icon: Sparkles,     bg: "bg-emerald-50",  fg: "text-emerald-600", dot: "bg-emerald-400", label: "Bid" },
  bid_expired:      { icon: TrendingDown, bg: "bg-ink/[0.06]",  fg: "text-muted",       dot: "bg-ink/30",      label: "Bid" },
  system:           { icon: Sparkles,     bg: "bg-ficium/10",   fg: "text-ficium",      dot: "bg-ficium",      label: "System" },
};

type FilterTab = "all" | "unread" | "bids" | "kyc" | "system";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",    label: "All" },
  { id: "unread", label: "Unread" },
  { id: "bids",   label: "Bids" },
  { id: "kyc",    label: "KYC" },
  { id: "system", label: "System" },
];

function filterItems(items: AppNotification[], tab: FilterTab): AppNotification[] {
  switch (tab) {
    case "unread": return items.filter((n) => !n.readAt);
    case "bids":   return items.filter((n) => n.kind.startsWith("bid"));
    case "kyc":    return items.filter((n) => n.kind.startsWith("kyc"));
    case "system": return items.filter((n) => n.kind === "system");
    default:       return items;
  }
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function Alerts() {
  const { data: items = [], isLoading } = useNotifications();
  const { mutate: markAll, isPending: markingAll } = useMarkAllRead();
  const { mutate: markOne } = useMarkOneRead();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const unreadCount = items.filter((n) => !n.readAt).length;
  const filtered = filterItems(items, activeTab);

  const handleClick = (n: AppNotification) => {
    if (!n.readAt) markOne(n.id);
  };

  return (
    <div className="min-h-screen pb-28">

      {/* ── GRADIENT BG ── */}
      <div className="absolute top-0 left-0 right-0 h-[280px] overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#1a1040] to-[#302b63]" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(79,70,229,0.45) 0%, transparent 60%), radial-gradient(ellipse at 85% 30%, rgba(201,168,76,0.15) 0%, transparent 50%)"
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f8f7f4] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[700px] px-4 sm:px-6">

        {/* ── HEADER ── */}
        <div className="pt-10 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[12px] font-bold text-white/50 uppercase tracking-widest mb-2">Notifications</div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight">
                  Alerts
                </h1>
                {unreadCount > 0 && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ficium text-white text-[14px] font-extrabold shadow-ficium mt-1">
                    {unreadCount}
                  </div>
                )}
              </div>
              <p className="text-white/50 text-[15px] mt-2">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "You're all caught up"}
              </p>
            </div>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                onClick={() => markAll()}
                disabled={markingAll}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl hover:bg-white/15 transition-colors disabled:opacity-50 flex-shrink-0 mt-2"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* ── FILTER TABS ── */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {FILTER_TABS.map((tab) => {
            const count = tab.id === "unread"
              ? unreadCount
              : tab.id === "all"
              ? items.length
              : filterItems(items, tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-pill text-[13px] font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-ficium text-white shadow-ficium"
                    : "bg-white border border-ink/[0.08] text-muted hover:border-ficium/30 hover:text-ficium",
                ].join(" ")}
              >
                {tab.label}
                {count > 0 && (
                  <span className={[
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-ink/[0.07] text-muted",
                  ].join(" ")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── LIST ── */}
        {isLoading ? (
          <SkeletonList />
        ) : filtered.length === 0 ? (
          <EmptyState tab={activeTab} unreadCount={unreadCount} />
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Group by today vs earlier */}
            <NotificationGroup
              title="Today"
              items={filtered.filter((n) => isToday(n.createdAt))}
              onMark={handleClick}
            />
            <NotificationGroup
              title="Earlier"
              items={filtered.filter((n) => !isToday(n.createdAt))}
              onMark={handleClick}
            />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

/* ============================================================
   NOTIFICATION GROUP
   ============================================================ */
function NotificationGroup({
  title,
  items,
  onMark,
}: {
  title: string;
  items: AppNotification[];
  onMark: (n: AppNotification) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="text-[11px] font-bold text-muted uppercase tracking-widest px-1 mb-2">{title}</div>
      <div className="flex flex-col gap-2">
        {items.map((n) => (
          <NotificationRow key={n.id} notification={n} onClick={() => onMark(n)} />
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   NOTIFICATION ROW
   ============================================================ */
function NotificationRow({
  notification,
  onClick,
}: {
  notification: AppNotification;
  onClick: () => void;
}) {
  const cfg = KIND_CONFIG[notification.kind];
  const Icon = cfg.icon;
  const unread = !notification.readAt;

  const Content = (
    <div className={[
      "flex gap-4 px-4 py-4 rounded-[20px] border transition-all duration-200",
      unread
        ? "bg-white border-ficium/15 shadow-sm hover:shadow-md hover:border-ficium/25"
        : "bg-white/60 border-ink/[0.06] hover:bg-white hover:border-ink/[0.12]",
    ].join(" ")}>

      {/* Icon */}
      <div className={[
        "w-11 h-11 rounded-[14px] grid place-items-center flex-shrink-0",
        cfg.bg,
      ].join(" ")}>
        <Icon size={19} className={cfg.fg} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Kind badge */}
            <span className={[
              "text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-pill",
              cfg.bg, cfg.fg,
            ].join(" ")}>
              {cfg.label}
            </span>
            {unread && (
              <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-pill bg-ficium/10 text-ficium">
                New
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted flex-shrink-0">{timeAgo(notification.createdAt)}</span>
        </div>

        <div className={[
          "text-[14px] font-semibold leading-snug mt-1.5",
          unread ? "text-ink" : "text-ink/70",
        ].join(" ")}>
          {notification.title}
        </div>

        {notification.body && (
          <p className="text-[13px] text-muted mt-1 leading-relaxed">{notification.body}</p>
        )}
      </div>

      {/* Unread dot */}
      {unread && (
        <div className={["w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5", cfg.dot].join(" ")} />
      )}
    </div>
  );

  return notification.link ? (
    <Link to={notification.link} onClick={onClick} className="no-underline block">
      {Content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="text-left block w-full">
      {Content}
    </button>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState({ tab, unreadCount }: { tab: FilterTab; unreadCount: number }) {
  const isFiltered = tab !== "all";

  return (
    <div className="bg-white rounded-[24px] border border-ink/[0.06] p-10 text-center shadow-sm">
      <div className="w-14 h-14 rounded-[22px] bg-ink/[0.05] grid place-items-center mx-auto mb-4">
        {isFiltered ? <Filter size={22} className="text-muted" /> : <BellOff size={22} className="text-muted" />}
      </div>
      <div className="font-display text-[22px] font-bold mb-2">
        {isFiltered
          ? `No ${tab} notifications`
          : unreadCount === 0 && tab === "all"
          ? "All caught up"
          : "No alerts yet"}
      </div>
      <p className="text-[14px] text-muted max-w-[280px] mx-auto leading-relaxed">
        {isFiltered
          ? "Try switching to a different filter above."
          : "We'll notify you when banks bid, KYC is verified, or requests need attention."}
      </p>
    </div>
  );
}

/* ============================================================
   SKELETON
   ============================================================ */
function SkeletonList() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-[20px] border border-ink/[0.06] p-4 flex gap-4 animate-pulse">
          <div className="w-11 h-11 rounded-[14px] bg-ink/10 flex-shrink-0" />
          <div className="flex-1">
            <div className="h-3 w-16 bg-ink/10 rounded-pill mb-2.5" />
            <div className="h-4 w-48 bg-ink/10 rounded mb-2" />
            <div className="h-3 w-full bg-ink/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */
function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}