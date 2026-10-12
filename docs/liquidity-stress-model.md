# Liquidity stress trial

The BTC dashboard replaces the Spot Depth / Cascade Risk card with an exploratory scenario. It uses the existing BTC bundle, with no additional requests or collector cadence changes. The backend's legacy risk ratio and slippage fields are not consumed by this card. The model appears in the live view only, so current inputs are not mixed with a selected historical date.

## Model

Modeled spot pressure = current BTC derivatives OI × closing share × spot transmission share.

Retained sampled liquidity = reported bid or ask sample × retained-liquidity share.

Sample coverage = retained sampled liquidity / modeled spot pressure. A zero-pressure scenario has no ratio. A scenario that exceeds the sample reports its excess and explicitly leaves wider capacity unknown. It does not estimate a price move beyond the observed book.

The exploration defaults are 0.5% OI closing, 10% transmission and 60% retention. These are uncalibrated user-adjustable assumptions, not inferred liquidation sizes or probabilities. The scenario has no fixed time horizon. It assumes one net direction for the chosen shock; voluntary position closure, liquidation and hedging are not separately measured. OI is gross contract notional, not cash capital. Transmission is a sensitivity assumption rather than a measured conversion of futures activity into spot transactions.

The current directional context is borrowed from the separately built Perps Pressure state (funding, OI and price). It is labelled inferred. Long-side context maps to downside vulnerability; short-side context maps to upside vulnerability. Balanced/mixed context does not acquire a direction from the chosen shock. This is not a second independent directional signal.

## Partial books and freshness

Reported depth is treated as a sample; the API's 2% label is not shown because its limited number of levels can stop before 2%. Unknown liquidity, new orders, replenishment, execution venue access, cross-venue routing and price targets are excluded. Inputs are rounded USD display amounts from the current endpoint; USDT-based samples use its existing approximate USD convention. The comparison is not an execution guarantee or proof of full-market absorption.

Both depth and Perps Pressure snapshots must be dated and at most 30 minutes old. More than 15 minutes of timestamp skew suppresses the model. If supplied, underlying OI age plus elapsed depth-snapshot age must also be at most 30 minutes. Invalid/missing numeric inputs or an empty venue list remain unavailable. Freshness is rechecked every minute in the browser. Exploration settings are local and do not write to the API.

## What the trial can establish

This exposes how conclusions change with the chosen shock and liquidity assumptions. Its directional context inherits the existing Perps inference. Predictive value has not been established. To evaluate it, fix assumptions before collecting observations, retain those observations and compare them with subsequent price/OI changes at predefined horizons. Use chronological holdouts, compare with Perps Pressure and price-only baselines, and control for venue/sample changes. Do not tune assumptions against the same outcomes used to claim performance.

Backend legacy fields remain for compatibility with existing API consumers. A later API cleanup can retire them independently.

## Validation

Run `node --test tests/liquidity-stress.test.mjs`, `npx tsc --noEmit` and ESLint on the changed frontend files. Tests cover arithmetic, bid/ask asymmetry, monotonic sensitivity, zero pressure, invalid values, stale and asynchronous data, partial-input failure and independent direction.
