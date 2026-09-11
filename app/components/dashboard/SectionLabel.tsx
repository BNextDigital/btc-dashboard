interface SectionLabelProps {
  numeral: string;
  title: string;
  subtitle?: string;
}

export default function SectionLabel({
  numeral,
  title,
  subtitle,
}: SectionLabelProps) {
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
