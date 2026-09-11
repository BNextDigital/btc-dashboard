import type { OusdStatus } from "@/app/types/sol-dashboard";

interface SolOusdTrackerProps {
  ousd: OusdStatus | null;
}

const PARTNER_SIGNALS = [
  { key: "Stripe", role: "Default stablecoin for business txns", confirmed: true },
  { key: "Visa", role: "Payment network partner", confirmed: true },
  { key: "Mastercard", role: "Payment network partner", confirmed: true },
  { key: "BlackRock", role: "Asset manager signatory", confirmed: true },
  { key: "Google", role: "Tech platform signatory", confirmed: true },
  { key: "Coinbase", role: "Exchange + Base chain partner", confirmed: true },
  { key: "Custodian", role: "Reserve custodian — unpublished", confirmed: false },
  { key: "Attestation", role: "Audit cadence — not confirmed", confirmed: false },
] as const;

const FALLBACK_CONFIRMS = [
  "Solana named as native chain — day-one deployment",
  "Stripe making OUSD default for all business transactions",
  "Stablecoin supply on Solana +$380M this week — pre-launch signal",
  "DeFi TVL +$420M — ecosystem primed ahead of OUSD demand wave",
] as const;

const FALLBACK_INVALIDATES = [
  "Reserve custodian and composition still unpublished",
  "Attestation cadence unconfirmed — USDC monthly Big Four = standard",
  "Partner integration rate at go-live vs 140 signatories",
  "Launch delay past H2 2026 compresses the opportunity window",
] as const;

export default function SolOusdTracker({ ousd }: SolOusdTrackerProps) {
  const confirms = ousd?.thesis_signals?.confirms ?? FALLBACK_CONFIRMS;
  const invalidates =
    ousd?.thesis_signals?.invalidates ?? FALLBACK_INVALIDATES;

  return (
    <div className="rounded-xl border border-amber-900/40 bg-slate-950 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-[10px] font-mono text-amber-600 uppercase tracking-widest">
              OUSD thesis tracker
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: 18,
              color: "#E8E6E0",
            }}
          >
            Open USD — Native Solana Launch
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">
            {ousd?.partner_count ?? 140}+ partners · Pre-launch ·{" "}
            {ousd?.expected_live ?? "H2 2026"} expected · Announced Jun 30,
            2026
          </div>
        </div>
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-center shrink-0">
          <div className="text-[9px] font-mono text-amber-600 uppercase tracking-widest">
            Status
          </div>
          <div className="text-sm font-mono font-bold text-amber-500">
            Pre-launch
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PARTNER_SIGNALS.map((signal) => (
          <div
            key={signal.key}
            className={`rounded-lg p-2.5 border ${
              signal.confirmed
                ? "border-green-900/40 bg-green-950/20"
                : "border-slate-800 bg-slate-950"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className={`text-[11px] font-mono font-bold ${
                  signal.confirmed ? "text-green-500" : "text-slate-700"
                }`}
              >
                {signal.confirmed ? "✓" : "○"}
              </span>
              <span
                className={`text-[11px] font-mono font-medium ${
                  signal.confirmed ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {signal.key}
              </span>
            </div>
            <div className="text-[9px] text-slate-600 leading-tight">
              {signal.role}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
        <div>
          <div className="text-[10px] font-mono text-green-600 uppercase tracking-widest mb-2">
            Confirms thesis
          </div>
          {confirms.map((signal) => (
            <div key={signal} className="flex items-start gap-2 mb-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: "#6A9A6A" }}>
                ▲
              </span>
              <span className="text-xs text-slate-400">{signal}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-[10px] font-mono text-red-600 uppercase tracking-widest mb-2">
            Watch / invalidates
          </div>
          {invalidates.map((signal) => (
            <div key={signal} className="flex items-start gap-2 mb-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: "#E05252" }}>
                ▼
              </span>
              <span className="text-xs text-slate-400">{signal}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
