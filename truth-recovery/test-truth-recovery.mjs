/* node --test : truth-recovery validation for ipd-simulator.
 * Injects known-truth survival IPD, runs the repo's OWN Guyot reconstruction
 * and log-rank HR estimator, asserts bias + coverage of the true HR. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runExperiment } from './harness.mjs';
import { simulateBinary, computeLogRankHR } from './engine.mjs';
import { makeReconInputs } from './dgp-survival.mjs';

const reportTimes = [0, 3, 6, 9, 12, 18, 24];
const base = { nPerArm: 400, lambdaC: 0.03, tMax: 24, reportTimes, nRep: 300, seed0: 12345 };

test('recovers true protective HR=0.70 with small bias', () => {
  const r = runExperiment({ HRtrue: 0.70, ...base });
  // log-HR bias should be tiny (< 0.05 on log scale ~= 5% on HR scale)
  assert.ok(Math.abs(r.biasLogHR_repo) < 0.05,
    `repo log-HR bias too large: ${r.biasLogHR_repo}`);
  assert.ok(r.meanRepoHR > 0.65 && r.meanRepoHR < 0.75,
    `meanRepoHR off target: ${r.meanRepoHR}`);
});

test('recovers null HR=1.00 (no spurious effect)', () => {
  const r = runExperiment({ HRtrue: 1.00, ...base });
  assert.ok(Math.abs(r.biasLogHR_repo) < 0.05,
    `null-case log-HR bias too large: ${r.biasLogHR_repo}`);
});

test('recovers true harmful HR=1.50 with small bias', () => {
  const r = runExperiment({ HRtrue: 1.50, ...base });
  assert.ok(Math.abs(r.biasLogHR_repo) < 0.05,
    `repo log-HR bias too large: ${r.biasLogHR_repo}`);
});

test('Monte-Carlo coverage of true HR is near nominal 95%', () => {
  const r = runExperiment({ HRtrue: 0.70, ...base });
  // allow 88-99% band (MC noise + reconstruction)
  assert.ok(r.coverage >= 0.88 && r.coverage <= 0.99,
    `coverage outside band: ${r.coverage}`);
});

test('reconstruction adds negligible bias vs true-IPD estimator', () => {
  const r = runExperiment({ HRtrue: 0.70, ...base });
  const extra = Math.abs(r.biasLogHR_repo - r.biasLogHR_trueIpd);
  assert.ok(extra < 0.02,
    `Guyot reconstruction injects excess bias: ${extra}`);
});

test('binary simulator preserves marginals exactly (sanity)', () => {
  const { metrics } = simulateBinary(40, 200, 60, 200, 99);
  assert.equal(metrics.marginals_exact, true);
  assert.equal(metrics.events_exp, 40);
  assert.equal(metrics.events_ctrl, 60);
});
