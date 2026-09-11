interface SparklineProps {
  data: number[];
  direction?: string;
  dir?: string;
  color?: string;
  width?: number;
  height?: number;
  verticalPadding?: number;
  className?: string;
  strokeWidth?: number;
}

export default function Sparkline({
  data,
  direction,
  dir,
  color,
  width = 80,
  height = 24,
  verticalPadding = 0,
  className,
  strokeWidth = 1.25,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  if (!Number.isFinite(max) || !Number.isFinite(min)) return null;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const plotHeight = Math.max(0, height - verticalPadding * 2);
      const y =
        height - verticalPadding - ((value - min) / range) * plotHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const resolvedDirection = direction ?? dir ?? "up";

  return (
    <svg
      width={width}
      height={height}
      className={`overflow-visible ${className ?? ""}`}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={
          color ?? (resolvedDirection === "down" ? "#C4614A" : "#D9A84D")
        }
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
        opacity="0.85"
      />
    </svg>
  );
}
