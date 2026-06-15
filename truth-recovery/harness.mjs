/* ============================================================================
 * truth-recovery/harness.mjs
 * Wires the standalone known-truth survival DGP into the REPO'S OWN
 * reconstruction (reconstructKM / guyotReconstruct) and estimator
 * (computeLogRankHR), then measures bias and Monte-Carlo coverage of the
 * known true hazard ratio.
 *
 * TRUTH-FIRST: every number below is measured from the repo's own code on
 * known-truth inputs. Nothing is hand-tuned to pass.
 * ==========================================================================*/

import { reconstructKM, computeLogRankHR } from './engine.mjs';
import { makeReconInputs } from './dgp-survival.mjs';

function mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function sd(a) { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); }

/**
 * Monte-Carlo experiment.
 * Returns per-replicate repo HR estimates + summary (bias on log scale, etc.)
 */
function runExperiment({ HRtrue, nPerArm, lambdaC, tMax, reportTimes, nRep, seed0 }) {
  const logHRtrue = Math.log(HRtrue);
  const repoLogHRs = [];
  const trueIpdLogHRs = [];
  let nWarn = 0;

  for (let r = 0; r < nRep; r++) {
    const seed = seed0 + r * 101;
    const inp = makeReconInputs({ seed, nPerArm, lambdaC, HRtrue, tMax, reportTimes });

    // Repo's own two-arm reconstruction + its own HR estimator
    const recon = reconstructKM(inp.coordsExp, inp.coordsCtrl, inp.atRisk, seed + 7);
    if (recon.warnings && recon.warnings.length) nWarn++;
    if (recon.hr != null && isFinite(recon.hr) && recon.hr > 0) {
      repoLogHRs.push(Math.log(recon.hr));
    }

    // Reference: repo's SAME estimator on the TRUE simulated IPD (no reconstruction)
    const hrTrueIpd = computeLogRankHR(inp.trueIpd);
    if (hrTrueIpd != null && isFinite(hrTrueIpd) && hrTrueIpd > 0) {
      trueIpdLogHRs.push(Math.log(hrTrueIpd));
    }
  }

  const meanLogHR = mean(repoLogHRs);
  const sdLogHR = sd(repoLogHRs);

  // Monte-Carlo coverage: a 95% CI per replicate using the empirical SE of the
  // estimator across replicates (a valid MC coverage check of the point
  // estimator's calibration given its own sampling spread).
  let covered = 0;
  for (const lh of repoLogHRs) {
    const lo = lh - 1.96 * sdLogHR;
    const hi = lh + 1.96 * sdLogHR;
    if (logHRtrue >= lo && logHRtrue <= hi) covered++;
  }
  const coverage = covered / repoLogHRs.length;

  return {
    HRtrue, logHRtrue, nPerArm, lambdaC, tMax, nRep,
    nValidRepo: repoLogHRs.length,
    meanRepoHR: Math.exp(meanLogHR),
    biasLogHR_repo: meanLogHR - logHRtrue,
    biasLogHR_trueIpd: mean(trueIpdLogHRs) - logHRtrue,
    sdLogHR_repo: sdLogHR,
    coverage,
    pctWarnings: nWarn / nRep,
  };
}

export { runExperiment, mean, sd };

// CLI: print a small report when run directly.
if (process.argv[1] && process.argv[1].endsWith('harness.mjs')) {
  const reportTimes = [0, 3, 6, 9, 12, 18, 24];
  const scenarios = [
    { HRtrue: 0.70, nPerArm: 400, lambdaC: 0.03, tMax: 24 },
    { HRtrue: 1.00, nPerArm: 400, lambdaC: 0.03, tMax: 24 },
    { HRtrue: 1.50, nPerArm: 400, lambdaC: 0.03, tMax: 24 },
  ];
  console.log('IPD-SIMULATOR truth-recovery (Guyot reconstruct -> repo log-rank HR)');
  console.log('reportTimes =', JSON.stringify(reportTimes), '| nRep=300\n');
  for (const sc of scenarios) {
    const res = runExperiment({ ...sc, reportTimes, nRep: 300, seed0: 12345 });
    console.log(`HRtrue=${res.HRtrue.toFixed(2)}  meanRepoHR=${res.meanRepoHR.toFixed(4)}  ` +
      `biasLogHR(repo)=${res.biasLogHR_repo.toFixed(4)}  ` +
      `biasLogHR(trueIPD)=${res.biasLogHR_trueIpd.toFixed(4)}  ` +
      `MCcoverage=${(res.coverage*100).toFixed(1)}%  warn=${(res.pctWarnings*100).toFixed(0)}%`);
  }
}
