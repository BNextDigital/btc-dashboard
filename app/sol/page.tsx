import { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

// ═══ Design Tokens — same dark theme as BTC, Solana brand colors ══════════════
const S = {
  bg:       '#0B0B0C',
  surface:  '#111113',
  surface2: '#16161A',
  surface3: '#0E0C17',           // OUSD section — subtle purple tint
  border:   '#1E1E22',
  borderB:  '#2A2A30',
  text:     '#F0EDE8',
  muted:    '#70709A',
  dim:      '#38384A',
  // Solana brand — replaces BTC amber
  purple:   '#9945FF',
  purpleBg: 'rgba(153,69,255,0.09)',
  // Positive values
  teal:     '#14F195',
  tealBg:   'rgba(20,241,149,0.09)',
  // Shared alert colors
  amber:    '#D9A84D',
  amberBg:  'rgba(217,168,77,0.09)',
  red:      '#E24B4A',
  redBg:    'rgba(226,75,74,0.09)',
};

// ═══ Metric Data (mock — matches /sol/metrics schema in production) ════════════
const METRICS = {
  price_move:    { label:'Price Move',       current:'+8.1%',  d7:'+18.7%',   vs30d:'+23%',   p:76, alert:'Large move',      level:'notable', pattern:'OUSD catalyst — recovery from $67.88 → $80.51' },
  volume:        { label:'Volume',           current:'$2.8B',  d7:'$17.6B',   vs30d:'+52%',   p:79, alert:'High activity',   level:'notable', pattern:'OUSD announcement Jun 30 — volume surge confirmed' },
  funding:       { label:'Funding Rate',     current:'0.028%', d7:'0.021%',   vs30d:'+33%',   p:68, alert:'—',               level:'none',    pattern:'Moderate — below 0.04% extreme threshold' },
  open_interest: { label:'Open Interest',    current:'$3.2B',  d7:'+22%',     vs30d:'+38%',   p:74, alert:'Rapid build-up',  level:'notable', pattern:'OI expanding concurrent with price — not diverging' },
  cme_basis:     { label:'CME Basis',        current:'8.4%',   d7:'7.2% avg', vs30d:'+1.8pp', p:65, alert:'—',               level:'none',    pattern:'Healthy carry — CME SOL futures (SOL=F) vs spot' },
  defi_tvl:      { label:'DeFi TVL',         current:'$8.2B',  d7:'+$420M',   vs30d:'+18%',   p:71, alert:'TVL acceleration', level:'notable', pattern:'Capital returning to ecosystem — DeFiLlama' },
  dex_volume:    { label:'DEX Volume',       current:'$1.4B',  d7:'$8.9B',    vs30d:'+52%',   p:81, alert:'High activity',   level:'notable', pattern:'Jupiter ~70% of flow — Raydium AMM surge' },
  staking_rate:  { label:'Staking Rate',     current:'64.8%',  d7:'+0.3pp',   vs30d:'−1.2pp', p:55, alert:'—',               level:'none',    pattern:'Stable validator participation — 1,463 active' },
  stablecoin:    { label:'Stablecoin (SOL)', current:'$9.1B',  d7:'+$380M',   vs30d:'+12%',   p:76, alert:'Notable inflow',  level:'notable', pattern:'USDC+USDT on Solana — pre-OUSD accumulation signal' },
  dominance:     { label:'SOL Dominance',    current:'2.1%',   d7:'+0.3pp',   vs30d:'+0.8pp', p:62, alert:'—',               level:'none',    pattern:'Market share recovery — from 1.3% floor to 2.1%' },
};

// ═══ Sparkline seed data ══════════════════════════════════════════════════════
const SPARKS = {
  price_move:    [55,58,62,60,65,68,70,72,75,77,80,80],
  volume:        [1.2,1.4,1.8,2.1,1.9,2.3,2.5,2.2,2.6,2.9,2.8,2.8],
  funding:       [15,18,22,20,25,24,27,26,28,28,28,28],
  open_interest: [2.1,2.2,2.3,2.5,2.6,2.7,2.8,3.0,3.1,3.3,3.2,3.2],
  cme_basis:     [6.2,6.5,6.8,7.0,7.2,7.5,7.8,8.0,8.2,8.4,8.4,8.4],
  defi_tvl:      [6.5,6.8,7.0,7.1,7.3,7.5,7.6,7.8,8.0,8.2,8.2,8.2],
  dex_volume:    [0.7,0.8,0.9,1.0,1.1,1.2,1.3,1.2,1.3,1.5,1.4,1.4],
  staking_rate:  [66,65.8,65.5,65.2,65,64.8,64.5,64.6,64.7,64.8,64.8,64.8],
  stablecoin:    [7.5,7.7,7.9,8.0,8.2,8.4,8.5,8.7,8.9,9.0,9.1,9.1],
  dominance:     [1.3,1.4,1.5,1.6,1.7,1.8,1.9,2.0,2.0,2.1,2.1,2.1],
};

// ═══ Helpers ═════════════════════════════════════════════════════════════════
const lC  = l => ({ extreme: S.red,    notable: S.amber,    none: S.dim   }[l] || S.dim);
const lBg = l => ({ extreme: S.redBg,  notable: S.amberBg,  none: 'transparent' }[l] || 'transparent');

// ═══ Sub-components ══════════════════════════════════════════════════════════

function Spark({ data, color }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={26}>
      <LineChart data={pts} margin={{ top:1, bottom:1, left:0, right:0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PBar({ v, color }) {
  return (
    <div style={{ background: S.border, borderRadius: 2, height: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, v))}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>
  );
}

function MetricCard({ id }) {
  const m = METRICS[id];
  const [hov, setHov] = useState(false);
  const ac = lC(m.level);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? S.surface2 : S.surface,
        border: `1px solid ${hov ? S.borderB : S.border}`,
        borderRadius: 10, padding: 12, transition: 'all 0.15s', cursor: 'default',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {m.label}
        </span>
        {m.alert !== '—' && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: ac, background: lBg(m.level),
            border: `1px solid ${ac}50`, borderRadius: 3, padding: '1px 5px',
            whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 4,
          }}>
            {m.alert}
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{ fontSize: 19, fontWeight: 700, color: S.text, fontFamily: 'IBM Plex Mono,monospace', marginBottom: 5, lineHeight: 1.1 }}>
        {m.current}
      </div>

      {/* Sparkline */}
      <Spark data={SPARKS[id]} color={m.level === 'none' ? S.dim : ac} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', margin: '7px 0' }}>
        {[['7d', m.d7], ['vs 30d', m.vs30d]].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 9, color: S.dim, marginBottom: 1 }}>{l}</div>
            <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono,monospace', color: S.muted }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Percentile bar */}
      <div style={{ marginBottom: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: S.dim }}>90d percentile</span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: S.dim }}>{m.p}%</span>
        </div>
        <PBar v={m.p} color={m.level === 'none' ? S.dim : ac} />
      </div>

      {/* Pattern */}
      <div style={{ fontSize: 10, color: S.dim, lineHeight: 1.35, borderTop: `1px solid ${S.border}`, paddingTop: 5 }}>
        {m.pattern}
      </div>
    </div>
  );
}

// ═══ OUSD Thesis Tracker — signature element, no BTC equivalent ═══════════════
function OUSDTracker() {
  const signals = [
    { k: 'Stripe',      r: 'Default stablecoin for all business txns', ok: true  },
    { k: 'Visa',        r: 'Payment network partner',                  ok: true  },
    { k: 'Mastercard',  r: 'Payment network partner',                  ok: true  },
    { k: 'BlackRock',   r: 'Asset manager signatory',                  ok: true  },
    { k: 'Google',      r: 'Tech platform signatory',                  ok: true  },
    { k: 'Coinbase',    r: 'Exchange + Base chain partner',            ok: true  },
    { k: 'Custodian',   r: 'Reserve custodian — unpublished',          ok: false },
    { k: 'Attestation', r: 'Audit cadence — not confirmed',            ok: false },
  ];
  return (
    <div style={{
      background: S.surface3, border: `1px solid rgba(153,69,255,0.22)`,
      borderRadius: 12, padding: '18px 20px', marginBottom: 18,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.amber, display: 'inline-block' }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: S.purple, letterSpacing: '0.1em' }}>
              OUSD THESIS TRACKER
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: S.text, marginBottom: 3 }}>
            Open USD — Native Solana Launch
          </div>
          <div style={{ fontSize: 11, color: S.muted }}>
            140+ partners confirmed · Pre-launch · H2 2026 expected · Announced Jun 30, 2026
          </div>
        </div>
        <div style={{
          background: S.amberBg, border: `1px solid rgba(217,168,77,0.35)`,
          borderRadius: 7, padding: '7px 14px', textAlign: 'center', flexShrink: 0, marginLeft: 16,
        }}>
          <div style={{ fontSize: 9, color: S.amber, fontWeight: 700, letterSpacing: '0.07em' }}>STATUS</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: S.amber }}>PRE-LAUNCH</div>
        </div>
      </div>

      {/* Partner signals grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 14 }}>
        {signals.map(s => (
          <div key={s.k} style={{
            background: s.ok ? S.tealBg : S.surface,
            border: `1px solid ${s.ok ? 'rgba(20,241,149,0.2)' : S.border}`,
            borderRadius: 7, padding: '7px 9px',
          }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 2 }}>
              <span style={{ color: s.ok ? S.teal : S.dim, fontSize: 11, fontWeight: 700 }}>{s.ok ? '✓' : '○'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: s.ok ? S.text : S.muted }}>{s.k}</span>
            </div>
            <div style={{ fontSize: 9, color: S.dim, lineHeight: 1.3 }}>{s.r}</div>
          </div>
        ))}
      </div>

      {/* Thesis check — confirms vs invalidates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: S.teal, letterSpacing: '0.08em', marginBottom: 7 }}>
            CONFIRMS THESIS ↗
          </div>
          {[
            'Solana named as native chain — day-one deployment confirmed',
            'Stripe making OUSD the default stablecoin for business transactions',
            'Stablecoin supply on Solana +$380M this week — pre-launch inflow',
            'DeFi TVL +$420M — ecosystem primed ahead of OUSD activity wave',
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6, fontSize: 11, color: S.text }}>
              <span style={{ color: S.teal, flexShrink: 0 }}>↗</span>
              <span style={{ lineHeight: 1.45 }}>{s}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: S.red, letterSpacing: '0.08em', marginBottom: 7 }}>
            WATCH / INVALIDATES ↘
          </div>
          {[
            'Reserve custodian and composition still unpublished pre-launch',
            'Attestation cadence unconfirmed — USDC monthly Big Four = standard',
            'Partner integration rate at go-live vs 140 signatories — key gap',
            'Launch delay past H2 2026 compresses the opportunity window',
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 6, fontSize: 11, color: S.text }}>
              <span style={{ color: S.red, flexShrink: 0 }}>↘</span>
              <span style={{ lineHeight: 1.45 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ Ecosystem Panel — DeFi TVL + Network Activity ════════════════════════════
function EcoPanel() {
  const protos = [
    { n: 'Jupiter',    tvl: '$2.4B', cat: 'DEX Aggregator',   pct: 29, c: S.purple },
    { n: 'Raydium',    tvl: '$1.8B', cat: 'AMM / DEX',        pct: 22, c: S.teal   },
    { n: 'Marinade',   tvl: '$1.2B', cat: 'Liquid Staking',   pct: 15, c: S.teal   },
    { n: 'Jito',       tvl: '$0.9B', cat: 'Liquid Staking',   pct: 11, c: S.dim    },
    { n: 'Velocity',   tvl: '$0.6B', cat: 'Perps (ex-Drift)', pct: 7,  c: S.dim    },
    { n: 'Other',      tvl: '$1.3B', cat: 'All others',       pct: 16, c: S.dim    },
  ];
  const stats = [
    { l: 'Daily transactions', v: '89.4M', sub: '+12% vs 7d avg',     ok: true  },
    { l: 'Avg TPS (7d)',        v: '4,218', sub: 'Near yearly high',    ok: true  },
    { l: 'Staking APY',         v: '6.8%',  sub: 'vs SOL price return', ok: null  },
    { l: 'Active validators',   v: '1,463', sub: 'Decentralization OK', ok: true  },
    { l: 'Fee revenue (7d)',    v: '$8.2M', sub: '+28% week-over-week', ok: true  },
    { l: 'Failed tx rate',      v: '0.4%',  sub: 'Network health normal', ok: true },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
      {/* TVL breakdown */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 10 }}>
          DEFI TVL — DEFILLAMA (FREE API)
        </div>
        {protos.map(p => (
          <div key={p.n} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: S.text }}>
                {p.n} <span style={{ color: S.dim }}>· {p.cat}</span>
              </span>
              <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono,monospace', color: S.muted }}>{p.tvl}</span>
            </div>
            <div style={{ background: S.border, borderRadius: 2, height: 2, overflow: 'hidden' }}>
              <div style={{ width: `${p.pct}%`, height: '100%', background: p.c, borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
      {/* Network stats */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 10 }}>
          NETWORK ACTIVITY
        </div>
        {stats.map((s, i) => (
          <div key={s.l} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '5px 0', borderBottom: i < stats.length - 1 ? `1px solid ${S.border}` : 'none',
          }}>
            <div>
              <div style={{ fontSize: 11, color: S.text }}>{s.l}</div>
              <div style={{ fontSize: 9, color: S.dim }}>{s.sub}</div>
            </div>
            <div style={{
              fontSize: 13, fontFamily: 'IBM Plex Mono,monospace', fontWeight: 600,
              color: s.ok === true ? S.teal : s.ok === false ? S.red : S.text,
            }}>
              {s.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ Judgment Panel — same structure as BTC ═══════════════════════════════════
function JudgmentPanel() {
  const [f, setF] = useState({ read: '', supports: '', contradicts: '', invalidates: '', plan: '' });
  const [risk, setRisk] = useState('medium');
  const [saved, setSaved] = useState(false);
  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }));
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const inp = {
    width: '100%', background: S.bg, border: `1px solid ${S.border}`,
    borderRadius: 5, padding: '6px 8px', color: S.text, fontSize: 11,
    fontFamily: 'IBM Plex Mono,monospace', resize: 'vertical', minHeight: 42,
    outline: 'none', boxSizing: 'border-box',
  };
  return (
    <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 10 }}>
        VII · JUDGMENT PANEL
      </div>
      {[
        ['read',        'My current read'],
        ['supports',    'Supports this view'],
        ['contradicts', 'Contradicts'],
        ['invalidates', 'What would change my mind'],
        ['plan',        'Action plan'],
      ].map(([k, l]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 10, color: S.dim, display: 'block', marginBottom: 3 }}>{l}</label>
          <textarea value={f[k]} onChange={set(k)} style={inp} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: S.dim }}>Risk</span>
        {['low', 'medium', 'high', 'extreme'].map(r => (
          <button key={r} onClick={() => setRisk(r)} style={{
            background: risk === r ? (r === 'extreme' ? S.red : r === 'high' ? S.amber : r === 'medium' ? S.purple : S.teal) : 'transparent',
            border: `1px solid ${risk === r ? 'transparent' : S.border}`,
            borderRadius: 4, padding: '3px 9px', fontSize: 10, fontWeight: 600,
            color: risk === r ? '#000' : S.dim, cursor: 'pointer', textTransform: 'capitalize',
          }}>
            {r}
          </button>
        ))}
      </div>
      <button onClick={save} style={{
        background: saved ? S.teal : S.purple, color: '#fff', border: 'none',
        borderRadius: 6, padding: '8px 0', fontSize: 11, fontWeight: 700,
        cursor: 'pointer', width: '100%', transition: 'all 0.2s',
      }}>
        {saved ? '✓ Saved to log' : 'Commit judgment to log'}
      </button>
    </div>
  );
}

// ═══ Section Label ════════════════════════════════════════════════════════════
function SL({ children, top = 14 }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.09em',
      marginBottom: 10, marginTop: top,
    }}>
      {children}
    </div>
  );
}

// ═══ Main Dashboard ═══════════════════════════════════════════════════════════
export default function SolDecisionDashboard() {
  const [tick, setTick] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const keys     = Object.keys(METRICS);
  const notables = keys.filter(k => METRICS[k].level === 'notable').length;
  const extremes = keys.filter(k => METRICS[k].level === 'extreme').length;

  return (
    <div style={{
      background: S.bg, minHeight: '100vh', color: S.text,
      fontFamily: 'IBM Plex Sans,system-ui,sans-serif', padding: 18,
    }}>
      <style>{`
        @keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
        textarea:focus { border-color: ${S.purple} !important; outline: none !important; }
        textarea::placeholder { color: ${S.dim}; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 1240, margin: '0 auto' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${S.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, background: S.purple,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: '#fff',
            }}>◎</div>
            <div>
              <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                SOL Decision Dashboard
              </div>
              <div style={{ fontSize: 10, color: S.muted, marginTop: 1 }}>
                AI organizes reality · Humans make decisions · SEM improves how you decide
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', marginBottom: 3 }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace' }}>$80.51</div>
              <span style={{
                fontSize: 12, fontWeight: 700, color: S.teal, background: S.tealBg,
                border: `1px solid rgba(20,241,149,0.35)`, borderRadius: 4,
                padding: '2px 8px', fontFamily: 'monospace',
              }}>+8.1%</span>
            </div>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: S.muted }}>
                7d <span style={{ color: S.teal, fontFamily: 'monospace' }}>+18.7%</span>
              </span>
              <span style={{ fontSize: 11, color: S.muted }}>
                ATH <span style={{ color: S.dim, fontFamily: 'monospace' }}>−73%</span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: S.dim }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', background: S.teal,
                  display: 'inline-block', animation: 'blink 2s infinite',
                }} />
                LIVE · {tick.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* ── Market State Bar ─────────────────────────────────────────────── */}
        <div style={{
          background: S.surface, border: `1px solid ${S.border}`, borderRadius: 9,
          padding: '9px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            background: S.amberBg, border: `1px solid rgba(217,168,77,0.4)`,
            borderRadius: 5, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: S.amber,
          }}>
            ◈ RECOVERY
          </div>
          <div style={{ fontSize: 11, color: S.muted }}>
            <span style={{ color: S.red, fontWeight: 600 }}>{extremes} extreme</span>
            {' · '}
            <span style={{ color: S.amber, fontWeight: 600 }}>{notables} notable</span>
            {' · '}
            <span style={{ color: S.dim }}>{keys.length - extremes - notables} neutral</span>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 9, color: S.dim, fontFamily: 'monospace' }}>
            Jul 3, 2026 · Prototype — mock data
          </span>
        </div>

        {/* ── Section I: Core Metrics ──────────────────────────────────────── */}
        <SL top={0}>I · MARKET STATE SNAPSHOT — CORE</SL>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(130px,1fr))', gap: 8, marginBottom: 8 }}>
          {['price_move', 'volume', 'funding', 'open_interest', 'cme_basis'].map(k => (
            <MetricCard key={k} id={k} />
          ))}
        </div>

        {/* ── Section II: Solana-specific Metrics ─────────────────────────── */}
        <SL>II · SOLANA ECOSYSTEM METRICS</SL>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(130px,1fr))', gap: 8, marginBottom: 16 }}>
          {['defi_tvl', 'dex_volume', 'staking_rate', 'stablecoin', 'dominance'].map(k => (
            <MetricCard key={k} id={k} />
          ))}
        </div>

        {/* ── Section III: OUSD Thesis Tracker ─────────────────────────────── */}
        <SL>III · INVESTMENT THESIS — OUSD CATALYST</SL>
        <OUSDTracker />

        {/* ── Section IV: Ecosystem Deep-Dive ─────────────────────────────── */}
        <SL>IV · ECOSYSTEM DEEP-DIVE</SL>
        <EcoPanel />

        {/* ── Sections V–VII ───────────────────────────────────────────────── */}
        <SL>V–VII · EVENTS · CAUSAL ANALYSIS · JUDGMENT</SL>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>

          {/* Events */}
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 10 }}>
              V · TOP EVENTS
            </div>
            {[
              { date: 'Jul 3',  tag: 'Structural', text: 'OpenUSD confirmed native on Solana — 140+ partners. Stripe making OUSD default stablecoin for business transactions.' },
              { date: 'Jul 1',  tag: 'Adoption',   text: 'Solana on-chain activity near yearly highs — 89.4M daily transactions, fee revenue +28% week-over-week.' },
              { date: 'Jun 28', tag: 'Protocol',   text: 'Solana onchain governance live — stake-weighted validator voting with 15% cluster support threshold.' },
            ].map((e, i) => (
              <div key={i} style={{
                marginBottom: 10, paddingBottom: 10,
                borderBottom: i < 2 ? `1px solid ${S.border}` : 'none',
              }}>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: S.dim, fontFamily: 'monospace' }}>{e.date}</span>
                  <span style={{
                    fontSize: 9, color: S.purple, background: S.purpleBg,
                    border: `1px solid rgba(153,69,255,0.3)`, borderRadius: 3, padding: '1px 5px',
                  }}>{e.tag}</span>
                </div>
                <div style={{ fontSize: 11, color: S.text, lineHeight: 1.5 }}>{e.text}</div>
              </div>
            ))}
          </div>

          {/* Causal */}
          <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 10 }}>
              VI · CAUSAL ANALYSIS
            </div>
            {[
              'OUSD announced native on Solana — day-one deployment',
              'Stripe + Visa signal payment-scale adoption demand incoming',
              'Stablecoin supply on Solana +$380M this week — pre-launch',
              'DeFi TVL +$420M — capital anticipating yield opportunities',
              'Network activity + DEX volume near yearly highs',
              'CME basis 8.4% — institutional carry trade active',
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <span style={{
                  color: S.purple, fontWeight: 700, fontFamily: 'IBM Plex Mono,monospace',
                  fontSize: 11, flexShrink: 0, minWidth: 20,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 11, color: S.text, lineHeight: 1.5 }}>{s}</span>
              </div>
            ))}
            <div style={{
              padding: '8px 10px', background: S.redBg,
              border: `1px solid rgba(226,75,74,0.3)`,
              borderRadius: 6, fontSize: 10, color: S.red, marginTop: 8, lineHeight: 1.5,
            }}>
              ⚠ Main contradiction: OUSD is pre-launch. Reserve composition and attestation cadence unpublished. All signals are forward-looking until go-live.
            </div>
          </div>

          {/* Judgment */}
          <JudgmentPanel />
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div style={{
          textAlign: 'center', fontSize: 9, color: S.dim,
          paddingTop: 12, borderTop: `1px solid ${S.border}`,
        }}>
          SOL Decision Dashboard · Prototype v0.1 · Mock data only · Production wires to /sol/* FastAPI routes · Jul 3 2026
        </div>
      </div>
    </div>
  );
}
