interface SectionLabelProps {
  numeral: string;
  title: string;
  subtitle?: string;
  variant?: "default" | "compact";
}

export default function SectionLabel({
  numeral,
  title,
  subtitle,
  variant = "default",
}: SectionLabelProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-slate-900">
        <span
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: "italic",
            color: "#D9A84D",
            fontSize: 22,
          }}
        >
          {numeral}
        </span>
        <span
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            color: "#E8E6E0",
            fontSize: 20,
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] font-mono text-slate-600 ml-1">
            {subtitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-between mb-5 hairline-b pb-3">
      <div className="flex items-baseline gap-4">
        <span className="font-display-italic text-amber-sand text-[28px] leading-none">
          {numeral}
        </span>
        <h2 className="font-display text-paper text-[26px] leading-none">
          {title}
        </h2>
      </div>
      {subtitle && <span className="caps-sm text-faint">{subtitle}</span>}
    </div>
  );
}
