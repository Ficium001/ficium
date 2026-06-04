// ─────────────────────────────────────────────────────────────────────────────
// Sparkline — renders a tiny SVG line chart from an array of numbers.
// Pure presentational component. No state, no side effects.
// ─────────────────────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, color, width = 64, height = 28 }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1; // 1px padding top/bottom
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePoints = points.join(" ");
  const fillPoints = `0,${height} ${linePoints} ${width},${height}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points={fillPoints}
        fill={color}
        opacity="0.12"
      />
      <polyline
        points={linePoints}
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Endpoint dot */}
      <circle
        cx={points[points.length - 1].split(",")[0]}
        cy={points[points.length - 1].split(",")[1]}
        r="2.2"
        fill={color}
      />
    </svg>
  );
}
