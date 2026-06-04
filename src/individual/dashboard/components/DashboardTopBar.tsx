import { Link }    from "react-router-dom";
import { Bell, LogOut } from "lucide-react";

interface DashboardTopBarProps {
  initial:      string;
  name:         string;
  greeting:     string;
  totalNewBids: number;
  onSignOut:    () => void;
}

// Pure presentational — all data and callbacks come from the page.
export function DashboardTopBar({
  initial, name, greeting, totalNewBids, onSignOut,
}: DashboardTopBarProps) {
  return (
    <div className="flex items-center justify-between pt-6 pb-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/15 text-white grid place-items-center font-bold text-xl backdrop-blur-sm border border-white/10">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] text-white/50 font-medium">{greeting},</div>
          <div className="text-[20px] font-bold text-white truncate leading-tight">{name}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/alerts"
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 grid place-items-center text-white/80 hover:bg-white/15 transition-colors relative no-underline"
          aria-label="Alerts"
        >
          <Bell size={16} />
          {totalNewBids > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">
              {totalNewBids}
            </span>
          )}
        </Link>
        <button
          onClick={onSignOut}
          aria-label="Sign out"
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 grid place-items-center text-white/80 hover:bg-white/15 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
