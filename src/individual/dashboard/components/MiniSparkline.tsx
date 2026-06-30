// Pure presentational — renders a smooth SVG sparkline from a points array.
// No state, no side effects.

export function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const w = 200; const h = 50; const pad = 6;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return [x, y] as [number, number];
  });

  const line = coords
    .map(([x, y], i) => {
      if (i === 0) return `M ${x} ${y}`;
      const [px, py] = coords[i - 1];
      const cx = (px + x) / 2;
      return `C ${cx} ${py}, ${cx} ${y}, ${x} ${y}`;
    })
    .join(" ");

  const fill = `${line} L ${coords[coords.length - 1][0]} ${h} L ${coords[0][0]} ${h} Z`;
  const dot  = coords[coords.length - 1];
  const gid  = `ms-${color.replace("#", "")}`;
  const glowId = `ms-glow-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
        <filter id={glowId} x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={fill} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.25"
            strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`} />
      <circle cx={dot[0]} cy={dot[1]} r="3" fill={color} filter={`url(#${glowId})`} />
    </svg>
  );
}
