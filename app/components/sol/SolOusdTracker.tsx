import type { OusdStatus } from "@/app/types/sol-dashboard";

interface SolOusdTrackerProps {
  ousd: OusdStatus | null;
}

export default function SolOusdTracker({ ousd }: SolOusdTrackerProps) {
  // Legacy snapshots contain unsupported launch claims; wait for verified context.
  const context = ousd?._data_mode === "verified_static_context" ? ousd : null;
  const confirms = context?.thesis_signals?.confirms ?? [];
  const invalidates = context?.thesis_signals?.invalidates ?? [];
  const signals = context?.partner_signals ?? [];
  const live = context?.status === "live";
  const statusLabel = live ? "Live" : "Unverified";
  const reviewDue = context?.data_quality?.status === "review_due";

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
            Open USD — Solana adoption
          </div>
          <div className="text-xs text-slate-600 font-mono mt-1">
            {context?.partner_count_display ? `${context.partner_count_display} partners` : "Partner count unavailable"}
            {context?.launched_at && ` · Launched ${context.launched_at}`}
          </div>
        </div>
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-center shrink-0">
          <div className="text-[9px] font-mono text-amber-600 uppercase tracking-widest">
            Status
          </div>
          <div className={`text-sm font-mono font-bold ${live ? "text-green-500" : "text-amber-500"}`}>
            {statusLabel}
          </div>
        </div>
      </div>

      {!context && (
        <p className="text-xs text-slate-400">
          Verified OUSD context is unavailable. Refresh after the API snapshot updates.
        </p>
      )}
      {context?.native_chains && (
        <p className="text-xs text-slate-400">
          Native chains: {context.native_chains.join(", ")}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {signals.map((signal) => (
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
            Verified launch facts
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
            Adoption to watch
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

      {context && (
        <div className="border-t border-slate-900 pt-3 text-[10px] font-mono text-slate-500 space-y-2">
          <p>
            Verified {context.data_quality?.verified_at ?? context._last_updated ?? "date unavailable"}
            {reviewDue && <span className="text-amber-500"> · Source review due</span>}
            {" · Published context; live adoption is not measured here."}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {context.sources?.map((source) => (
              <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
                {source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
