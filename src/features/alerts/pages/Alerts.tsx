import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellOff,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCheck,
} from "lucide-react";
import {
  getMyNotifications,
  markAllRead,
  markOneRead,
  timeAgo,
} from "../../alerts/api/notifications";
import type { AppNotification, NotificationKind } from "../../alerts/api/notifications";
import { BottomNav, Card, Button } from "../../../shared/ui";

const KIND_STYLE: Record<NotificationKind, { icon: typeof ShieldCheck; bg: string; fg: string }> = {
  kyc_verified:    { icon: ShieldCheck,  bg: "bg-mint/20",   fg: "text-ink" },
  kyc_rejected:    { icon: ShieldAlert,  bg: "bg-red-100",   fg: "text-red-700" },
  request_created: { icon: FileText,     bg: "bg-ficium/10", fg: "text-ficium" },
  request_expiring:{ icon: Clock,        bg: "bg-accent/30", fg: "text-ink" },
  bid_received:    { icon: TrendingUp,   bg: "bg-mint/20",   fg: "text-ink" },
  bid_accepted:    { icon: Sparkles,     bg: "bg-ficium/10", fg: "text-ficium" },
  bid_expired:     { icon: TrendingDown, bg: "bg-ink/5",     fg: "text-muted" },
  system:          { icon: Sparkles,     bg: "bg-ficium/10", fg: "text-ficium" },
};

export default function Alerts() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyNotifications().then((data) => {
      if (cancelled) return;
      setItems(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const unreadCount = items.filter((n) => !n.readAt).length;

  const handleMarkAllRead = async () => {
    // optimistic
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    await markAllRead();
  };

  const handleClick = async (n: AppNotification) => {
    if (!n.readAt) {
      // optimistic
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x))
      );
      markOneRead(n.id);
    }
  };

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="mx-auto w-full max-w-[640px] px-5 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Alerts</h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<CheckCheck size={14} />}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <SkeletonList />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((n) => (
              <NotificationRow key={n.id} notification={n} onClick={() => handleClick(n)} />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: AppNotification;
  onClick: () => void;
}) {
  const style = KIND_STYLE[notification.kind];
  const Icon = style.icon;
  const unread = !notification.readAt;

  const Content = (
    <Card padded={false} className={["p-4 transition-colors", unread ? "border-ficium/30 bg-white" : "bg-white/60"].join(" ")}>
      <div className="flex gap-3">
        <div className={["w-10 h-10 rounded-xl grid place-items-center flex-shrink-0", style.bg, style.fg].join(" ")}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className={["text-[14px] sm:text-[15px] font-semibold leading-snug", unread ? "text-ink" : "text-ink/80"].join(" ")}>
              {notification.title}
            </div>
            <div className="text-[11px] text-muted flex-shrink-0 mt-0.5">
              {timeAgo(notification.createdAt)}
            </div>
          </div>
          {notification.body && (
            <div className="text-[13px] text-muted mt-1 leading-relaxed">
              {notification.body}
            </div>
          )}
        </div>
        {unread && (
          <div className="w-2 h-2 rounded-full bg-ficium flex-shrink-0 mt-2" aria-label="unread" />
        )}
      </div>
    </Card>
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

function EmptyState() {
  return (
    <Card className="text-center py-10">
      <div className="w-14 h-14 rounded-2xl bg-ink/5 text-muted grid place-items-center mx-auto mb-4">
        <BellOff size={22} />
      </div>
      <div className="font-display text-xl font-bold mb-2">No alerts yet</div>
      <div className="text-sm text-muted max-w-[280px] mx-auto">
        We'll let you know when banks bid, when KYC is verified, and when requests need attention.
      </div>
    </Card>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} padded={false} className="p-4">
          <div className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-ink/10 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3 w-32 bg-ink/10 rounded mb-2" />
              <div className="h-3 w-48 bg-ink/10 rounded" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}