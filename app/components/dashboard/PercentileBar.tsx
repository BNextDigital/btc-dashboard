export default function PercentileBar({ value }: { value: number }) {
  const color =
    value >= 90 || value <= 10
      ? "#C4614A"
      : value >= 75
        ? "#C89A3F"
        : "#8A8780";

  return (
    <div className="w-full">
      <div className="h-[3px] w-full bg-surface-inset relative overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: `${value}%`,
            backgroundColor: color,
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
