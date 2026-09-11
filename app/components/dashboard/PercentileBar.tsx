interface PercentileBarProps {
  value: number;
  color?: string;
  variant?: "default" | "compact";
}

export default function PercentileBar({
  value,
  color,
  variant = "default",
}: PercentileBarProps) {
  const resolvedColor =
    color ??
    (value >= 90 || value <= 10
      ? "#C4614A"
      : value >= 75
        ? "#C89A3F"
        : "#8A8780");
  const width = `${Math.min(100, Math.max(0, value))}%`;

  if (variant === "compact") {
    return (
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width, backgroundColor: resolvedColor }}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="h-[3px] w-full bg-surface-inset relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width,
            backgroundColor: resolvedColor,
            transition: "width 600ms ease-out",
          }}
        />
        {[10, 75, 90].map((marker) => (
          <div
            key={marker}
            className="absolute top-0 h-full w-px"
            style={{ left: `${marker}%`, backgroundColor: "#2F2F2F" }}
          />
        ))}
      </div>
    </div>
  );
}
