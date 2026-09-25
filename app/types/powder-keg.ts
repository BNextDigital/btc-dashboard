export interface PowderKegFactor {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  available: boolean;
  value: string;
  explanation: string;
  source: string;
}

export interface PowderKegStage {
  name: string;
  score: number | null;
  coverage: number;
  factors: PowderKegFactor[];
  eligible?: boolean;
  eligible_reason?: string;
  recent_peak_cascade?: number | null;
}

export interface PowderKegData {
  name: string;
  updated_at: string;
  state: {
    code: "CALM" | "FRAGILE" | "TRIGGERED" | "CASCADE" | "EXHAUSTION";
    label: string;
    color: string;
    confidence: number;
    summary: string;
  };
  stages: {
    fragility: PowderKegStage;
    trigger: PowderKegStage;
    cascade: PowderKegStage;
    exhaustion: PowderKegStage;
  };
  supporting: string[];
  contradicting: string[];
  limitations: string[];
  diagnostics: {
    leverage?: Record<string, unknown>;
    macro?: Record<string, unknown>;
    market_structure?: Record<string, unknown>;
    options?: Record<string, unknown>;
    flows?: Record<string, unknown>;
    exhaustion?: Record<string, unknown>;
  };
  model?: {
    version?: string;
    state_flow?: string[];
    principles?: string[];
  };
}
