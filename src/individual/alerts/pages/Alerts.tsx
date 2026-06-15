import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BellOff, ShieldCheck, ShieldAlert, FileText, Sparkles,
  TrendingDown, TrendingUp, Clock, CheckCheck, Zap,
} from "lucide-react";
import { useNotifications, useMarkAllRead, useMarkOneRead } from "../hooks/useAlerts";
import { timeAgo } from "../api/notifications";
import type { AppNotification, NotificationKind } from "../api/notifications";
import { PageShell } from "../../../shared/ui";
import { Hero } from "../../../shared/ui/dashboard";

/* ============================================================
   KIND CONFIG
   ============================================================ */
const KIND_CONFIG: Record<NotificationKind, {
  icon: React.ElementType;
  bg: string;
  fg: string;
  dot: string;
  label: string;
  actionRequired: boolean;
}> = {
  kyc_verified:     { icon: ShieldCheck,  bg: "bg-emerald-50", fg: "text-emerald-600", dot: "bg-emerald-400", label: "KYC",     actionRequired: false },
  kyc_rejected:     { icon: ShieldAlert,  bg: "bg-red-50",     fg: "text-red-500",     dot: "bg-red-400",     label: "KYC",     actionRequired: true  },
  request_created:  { icon: FileText,     bg: "bg-ficium/10",  fg: "text-ficium",      dot: "bg-ficium",      label: "Request", actionRequired: false },
  request_expiring: { icon: Clock,        bg: "bg-amber-50",   fg: "text-amber-600",   dot: "bg-amber-400",   label: "Request", actionRequired: true  },
  bid_received:     { icon: TrendingUp,   bg: "bg-ficium/10",  fg: "text-ficium",      dot: "bg-ficium",      label: "Bid",     actionRequired: true  },
  bid_accepted:     { icon: Sparkles,     bg: "bg-emerald-50", fg: "text-emerald-600", dot: "bg-emerald-400", label: "Bid",     actionRequired: true  },
  bid_expired:      { icon: TrendingDown, bg: "bg-ink/[0.06]", fg: "text-muted",       dot: "bg-ink/25",      label: "Bid",     actionRequired: false },
  system:           { icon: Sparkles,     bg: "bg-ficium/10",  fg: "text-ficium",      dot: "bg-ficium",      label: "System",  actionRequired: false },
};

type FilterTab = "all" | "action";

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function Alerts() {
  const { data: items = [], isLoading } = useNotifications();
  const { mutate: markAll, isPending: markingAll } = useMarkAllRead();
  const { mutate: markOne } = useMarkOneRead();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const unreadCount  = items.filter((n) => !n.readAt).length;
  const actionCount  = items.filter((n) => KIND_CONFIG[n.kind].actionRequired && !n.readAt).length;
  const filtered     = activeTab === "action"
    ? items.filter((n) => KIND_CONFIG[n.kind].actionRequired)
    : items;

  const todayItems    = filtered.filter((n) => isToday(n.createdAt));
  const earlierItems  = filtered.filter((n) => !isToday(n.createdAt));

  const handleClick = (n: AppNotification) => {
    if (!n.readAt) markOne(n.id);
  };

  return (
    <PageShell max="720px">

      {/* ── HEADER ── */}
      <Hero
        eyebrow="Notifications"
        headline={
          <span className="inline-flex items-center gap-3">
            Alerts
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-ficium text-white text-[13px] font-extrabold shadow-ficium">
                {unreadCount}
              </span>
            )}
          </span>
        }
        subline={
          unreadCount > 0
            ? `${unreadCount} unread · ${actionCount} need action`
            : "You're all caught up"
        }
        actions={
          unreadCount > 0 ? (
            <button
              onClick={() => markAll()}
              disabled={markingAll}
              className="flex items-center gap-1.5 bg-white/[0.08] border border-white/[0.16] text-white/85 text-[12px] font-semibold px-3.5 py-2 rounded-xl hover:bg-white/[0.14] transition-colors disabled:opacity-40"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          ) : undefined
        }
      />

      {/* ── TABS ── */}
      <div className="flex gap-2 mt-6 mb-6">
        <TabButton
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
          label="All"
          count={items.length}
        />
        <TabButton
          active={activeTab === "action"}
          onClick={() => setActiveTab("action")}
          label="Action required"
          count={actionCount}
          highlight
        />
      </div>

      {/* ── CONTENT ── */}
      {isLoading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="flex flex-col gap-6">
          <NotificationGroup title="Today"   items={todayItems}   onMark={handleClick} />
          <NotificationGroup title="Earlier" items={earlierItems} onMark={handleClick} />
        </div>
      )}
    </PageShell>
  );
}

/* ============================================================
   TAB BUTTON
   ============================================================ */
function TabButton({
  active, onClick, label, count, highlight,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold transition-all",
        "rounded-full border",
        active
          ? highlight
            ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/25"
            : "bg-ficium border-ficium text-white shadow-lg shadow-ficium/25"
          : "bg-white border-ink/[0.10] text-muted hover:border-ink/25 hover:text-ink",
      ].join(" ")}
    >
      {label}
      {count > 0 && (
        <span className={[
          "text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none",
          active ? "bg-white/20 text-white" : "bg-ink/[0.07] text-ink/60",
        ].join(" ")}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ============================================================
   NOTIFICATION GROUP
   ============================================================ */
function NotificationGroup({
  title, items, onMark,
}: {
  title: string;
  items: AppNotification[];
  onMark: (n: AppNotification) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-3 px-1">
        {title}
      </div>
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
  notification, onClick,
}: {
  notification: AppNotification;
  onClick: () => void;
}) {
  const cfg   = KIND_CONFIG[notification.kind];
  const Icon  = cfg.icon;
  const unread = !notification.readAt;
  const needsAction = cfg.actionRequired;

  const Content = (
    <div className={[
      "flex items-start gap-3.5 px-4 py-4 rounded-[18px] border transition-all duration-200",
      unread
        ? "bg-white border-ink/[0.10] shadow-sm hover:shadow-md"
        : "bg-white/50 border-ink/[0.05] hover:bg-white hover:border-ink/[0.10]",
    ].join(" ")}>

      {/* Icon */}
      <div className={["w-10 h-10 rounded-[13px] grid place-items-center flex-shrink-0", cfg.bg].join(" ")}>
        <Icon size={17} className={cfg.fg} />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          {/* Kind pill */}
          <span className={[
            "text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full",
            cfg.bg, cfg.fg,
          ].join(" ")}>
            {cfg.label}
          </span>
          {/* Action required badge */}
          {needsAction && unread && (
            <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
              Action needed
            </span>
          )}
        </div>

        {/* Title — bold if unread */}
        <p className={[
          "text-[14px] leading-snug mt-1",
          unread ? "font-bold text-ink" : "font-medium text-ink/65",
        ].join(" ")}>
          {notification.title}
        </p>

        {notification.body && (
          <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
            {notification.body}
          </p>
        )}

        <span className="text-[11px] text-muted/70 mt-1.5 block">
          {timeAgo(notification.createdAt)}
        </span>
      </div>

      {/* Unread dot */}
      {unread && (
        <div className={["w-2 h-2 rounded-full flex-shrink-0 mt-1.5", cfg.dot].join(" ")} />
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
function EmptyState({ tab }: { tab: FilterTab }) {
  return (
    <div className="bg-white rounded-[22px] border border-ink/[0.06] p-10 text-center shadow-sm">
      <div className="w-14 h-14 rounded-[20px] bg-ink/[0.04] grid place-items-center mx-auto mb-4">
        {tab === "action"
          ? <Zap size={22} className="text-muted" />
          : <BellOff size={22} className="text-muted" />}
      </div>
      <div className="font-display text-[20px] font-bold mb-2">
        {tab === "action" ? "Nothing needs action" : "No alerts yet"}
      </div>
      <p className="text-[13px] text-muted max-w-[260px] mx-auto leading-relaxed">
        {tab === "action"
          ? "You're on top of everything. We'll notify you when bids arrive or a request needs attention."
          : "We'll notify you when banks bid, KYC is verified, or your requests need attention."}
      </p>
    </div>
  );
}

/* ============================================================
   SKELETON
   ============================================================ */
function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-[18px] border border-ink/[0.06] p-4 flex gap-3.5 animate-pulse">
          <div className="w-10 h-10 rounded-[13px] bg-ink/10 flex-shrink-0" />
          <div className="flex-1">
            <div className="h-2.5 w-12 bg-ink/10 rounded-full mb-2" />
            <div className="h-3.5 w-44 bg-ink/10 rounded mb-1.5" />
            <div className="h-2.5 w-full bg-ink/10 rounded" />
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
  const d   = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate()     === now.getDate()     &&
    d.getMonth()    === now.getMonth()    &&
    d.getFullYear() === now.getFullYear()
  );
}