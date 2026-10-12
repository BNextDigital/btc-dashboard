import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL("../app/lib/liquidity-stress.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const compiledModule = { exports: {} };
new Function("require", "module", "exports", compiled)(require, compiledModule, compiledModule.exports);
const { stressScenario, liquidityStressInputs, pressureContext, parseDepthUsd } = compiledModule.exports;
const assumptions = { unwindPct: 0.5, spotTransmissionPct: 10, retainedDepthPct: 60 };
const now = Date.parse("2026-10-12T17:00:00Z");
const depth = { updated_at: "2026-10-12T16:55:00Z", visible_depth_usd: "$50M", ask_depth_2_0pct_usd: "$100M", venues_online: ["Coinbase"], oi_age_seconds: 60 };
const pressure = { updated_at: "2026-10-12T16:55:05Z", positioning: { oi_usd: 60e9 }, state: { code: "balanced", primary_side: "mixed" } };

test("a shock combines closing notional, spot transmission and retained liquidity independently", () => {
  const result = stressScenario(60e9, 50e6, 100e6, assumptions);
  assert.equal(result.unwindUsd, 300e6);
  assert.equal(result.pressureUsd, 30e6);
  assert.equal(result.retainedBidUsd, 30e6);
  assert.equal(result.retainedAskUsd, 60e6);
  assert.equal(result.bidCoverage, 1);
  assert.equal(result.askCoverage, 2);
});

test("more closing or transmission increases pressure and reduces sample coverage", () => {
  const baseline = stressScenario(60e9, 50e6, 100e6, assumptions);
  for (const change of [{ unwindPct: 1 }, { spotTransmissionPct: 20 }]) {
    const stressed = stressScenario(60e9, 50e6, 100e6, { ...assumptions, ...change });
    assert.equal(stressed.pressureUsd, 2 * baseline.pressureUsd);
    assert.equal(stressed.bidCoverage, baseline.bidCoverage / 2);
  }
});

test("withdrawn bids and asks reduce coverage without changing the shock", () => {
  const result = stressScenario(60e9, 50e6, 100e6, { ...assumptions, retainedDepthPct: 0 });
  assert.equal(result.pressureUsd, 30e6);
  assert.equal(result.bidCoverage, 0);
  assert.equal(result.askCoverage, 0);
});

test("zero closing or zero transmission produces zero pressure rather than infinite coverage", () => {
  for (const change of [{ unwindPct: 0 }, { spotTransmissionPct: 0 }]) {
    const result = stressScenario(60e9, 50e6, 100e6, { ...assumptions, ...change });
    assert.equal(result.pressureUsd, 0);
    assert.equal(result.bidCoverage, null);
    assert.equal(result.askCoverage, null);
  }
});

test("invalid numeric inputs cannot become a reassuring model result", () => {
  for (const value of [NaN, Infinity, -1, 0]) assert.equal(stressScenario(value, 50e6, 100e6, assumptions), null);
  for (const value of [NaN, Infinity, -1, 101])
    for (const key of Object.keys(assumptions))
      assert.equal(stressScenario(60e9, 50e6, 100e6, { ...assumptions, [key]: value }), null);
  assert.equal(stressScenario(60e9, -1, 100e6, assumptions), null);
  assert.equal(stressScenario(60e9, 50e6, Infinity, assumptions), null);
  assert.equal(stressScenario(60e9, 50e6, 100e6, {}), null);
});

test("source dollar units are parsed; placeholders and malformed strings remain missing", () => {
  for (const [text, expected] of [["$50M", 50e6], ["$1.25B", 1.25e9], ["$25k", 25e3], ["$1,250", 1250], ["$0", 0], ["$1T", 1e12]])
    assert.equal(parseDepthUsd(text), expected);
  for (const text of ["—", "", "NaN", "$-1M", "$5M rubbish", null]) assert.equal(parseDepthUsd(text), null);
});

test("fresh synchronized inputs support the model", () => {
  const result = liquidityStressInputs(depth, pressure, now);
  assert.equal(result.ready, true);
  assert.equal(result.oiUsd, 60e9);
  assert.equal(result.bidUsd, 50e6);
  assert.equal(result.ageMinutes, 5);
});

test("stale, future, undated or badly misaligned snapshots suppress current modeling", () => {
  for (const changed of [
    { updated_at: "2026-10-12T16:00:00Z" },
    { updated_at: "2026-10-12T17:02:00Z" },
    { updated_at: "invalid" },
    { updated_at: "2026-10-12T16:35:00Z" },
    { oi_age_seconds: 1800 },
    { oi_age_seconds: NaN },
  ]) assert.equal(liquidityStressInputs({ ...depth, ...changed }, pressure, now).ready, false);
  assert.equal(liquidityStressInputs(depth, { ...pressure, updated_at: "2026-10-12T16:00:00Z" }, now).ready, false);
  assert.equal(liquidityStressInputs(depth, pressure, null).ready, false);
});

test("missing leverage, missing books and failed endpoints are unavailable rather than zero", () => {
  assert.equal(liquidityStressInputs(depth, null, now).ready, false);
  assert.equal(liquidityStressInputs(depth, { ...pressure, positioning: { oi_usd: null } }, now).ready, false);
  assert.equal(liquidityStressInputs({ ...depth, visible_depth_usd: "—" }, pressure, now).ready, false);
  assert.equal(liquidityStressInputs({ ...depth, venues_online: [] }, pressure, now).ready, false);
  assert.equal(liquidityStressInputs({ error: "All sources unavailable" }, pressure, now).ready, false);
});

test("direction comes from independent leverage context, including balanced and unresolved states", () => {
  assert.equal(pressureContext(pressure).label, "No one-sided pressure confirmed");
  assert.equal(pressureContext({ state: { primary_side: "longs" } }).label, "Downside vulnerability context");
  assert.equal(pressureContext({ state: { primary_side: "shorts" } }).label, "Upside vulnerability context");
  assert.equal(pressureContext({ state: { code: "leverage_building", primary_side: "mixed" } }).label, "Direction unresolved");
  assert.equal(pressureContext(null).label, "Direction unresolved");
});
