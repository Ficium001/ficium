import { Link } from "react-router-dom";

interface MarketTileProps {
  icon:        React.ReactNode;
  label:       string;
  title:       string;
  metric:      string;
  metricValue: string;
  bg:          string;
  dark?:       boolean;
  href:        string;
}

export function MarketTile({ icon, label, title, metric, metricValue, bg, dark, href }: MarketTileProps) {
  const txt = dark ? "text-ink" : "text-white";
  const sub = dark ? "opacity-70" : "opacity-60";
  return (
    <Link to={href} className="no-underline">
      <div className={[bg, txt, "rounded-[20px] p-4 sm:p-5 min-h-[185px] flex flex-col relative overflow-hidden hover:-translate-y-0.5 transition-transform"].join(" ")}>
        <div className={["w-10 h-10 rounded-xl grid place-items-center mb-3", dark ? "bg-black/10" : "bg-white/15"].join(" ")}>
          {icon}
        </div>
        <div className={["text-[10px] font-bold uppercase tracking-widest absolute top-4 right-4 px-2 py-1 rounded-pill", dark ? "bg-black/10" : "bg-white/15"].join(" ")}>
          {label}
        </div>
        <div className="font-display text-[16px] font-bold leading-snug flex-1">{title}</div>
        <div className={["h-px my-3", dark ? "bg-black/10" : "bg-white/15"].join(" ")} />
        <div>
          <div className={["text-[10px] uppercase tracking-widest font-bold mb-0.5", sub].join(" ")}>{metric}</div>
          <div className="font-display text-[20px] font-extrabold">{metricValue}</div>
        </div>
      </div>
    </Link>
  );
}
