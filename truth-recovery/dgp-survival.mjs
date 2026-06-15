/* ============================================================================
 * truth-recovery/dgp-survival.mjs
 * STANDALONE seeded known-truth DGP for two-arm survival data.
 *
 * Truth model: exponential survival, proportional hazards.
 *   control hazard  = lambdaC
 *   exper.  hazard  = lambdaC * HR_true     (constant HR -> PH holds)
 *   admin. censoring at tMax (uniform recruitment optional; here fixed tMax)
 *
 * We generate true individual event/censor times, then SUMMARISE the truth
 * into exactly the inputs the repo's Guyot reconstructor consumes:
 *   - digitised KM coordinates per arm (computed from the TRUE KM of the
 *     simulated cohort, so no digitisation noise is injected by us)
 *   - an at-risk table at a set of reporting times.
 * Then the repo's OWN reconstructKM() rebuilds pseudo-IPD and its OWN
 * computeLogRankHR() estimates the HR. We compare to HR_true.
 * ==========================================================================*/

// Simple seeded RNG (mulberry32) -- independent of repo RNG, for the DGP only.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function expSample(rng, lambda) {
  // inverse-CDF exponential
  let u = rng();
  while (u <= 0) u = rng();
  return -Math.log(u) / lambda;
}

/**
 * Generate one arm of true IPD under exponential survival + admin censoring.
 * Returns array of {time, event}.
 */
function simulateArmTrue(rng, n, lambda, tMax) {
  const arm = [];
  for (let i = 0; i < n; i++) {
    const tEvent = expSample(rng, lambda);
    if (tEvent <= tMax) arm.push({ time: tEvent, event: 1 });
    else arm.push({ time: tMax, event: 0 });
  }
  return arm;
}

/** True KM curve (Kaplan-Meier) from individual {time,event}. Returns [{t,s}]. */
function trueKM(arm) {
  const sorted = [...arm].sort((a, b) => a.time - b.time);
  const steps = [{ t: 0, s: 1.0 }];
  let nRisk = sorted.length, surv = 1.0, i = 0;
  while (i < sorted.length) {
    const t = sorted[i].time;
    let d = 0, c = 0;
    while (i < sorted.length && sorted[i].time === t) {
      if (sorted[i].event === 1) d++; else c++;
      i++;
    }
    if (d > 0 && nRisk > 0) { surv *= (1 - d / nRisk); steps.push({ t, s: surv }); }
    nRisk -= (d + c);
  }
  return steps;
}

/** Survival at time t from a KM step curve. */
function survAt(km, t) {
  let s = 1.0;
  for (const p of km) { if (p.t <= t) s = p.s; else break; }
  return s;
}

/** Number still at risk at time t (n with time >= t). */
function atRiskAt(arm, t) {
  return arm.filter(p => p.time >= t).length;
}

/**
 * Produce repo-shaped reconstruction inputs from a known-truth cohort.
 * reportTimes: at-risk reporting times (must start at 0).
 * Returns { coordsExp, coordsCtrl, atRisk, truth:{...} }.
 */
function makeReconInputs({ seed, nPerArm, lambdaC, HRtrue, tMax, reportTimes }) {
  const rng = mulberry32(seed);
  const armC = simulateArmTrue(rng, nPerArm, lambdaC, tMax);
  const armE = simulateArmTrue(rng, nPerArm, lambdaC * HRtrue, tMax);

  const kmC = trueKM(armC);
  const kmE = trueKM(armE);

  // Digitised coordinates = KM survival sampled at reportTimes (truth, no noise)
  const coordsExp = reportTimes.map(t => ({ t, s: survAt(kmE, t) }));
  const coordsCtrl = reportTimes.map(t => ({ t, s: survAt(kmC, t) }));

  const atRisk = reportTimes.map(t => ({
    t,
    nExp: atRiskAt(armE, t),
    nCtrl: atRiskAt(armC, t),
  }));

  // Reference: log-rank HR on the TRUE simulated IPD (best achievable estimate)
  const trueIpd = [
    ...armE.map(p => ({ arm: 'experimental', time: p.time, event: p.event })),
    ...armC.map(p => ({ arm: 'control', time: p.time, event: p.event })),
  ];

  return {
    coordsExp, coordsCtrl, atRisk,
    truth: { HRtrue, lambdaC, nPerArm, tMax },
    trueIpd,
  };
}

export { mulberry32, simulateArmTrue, trueKM, survAt, atRiskAt, makeReconInputs };
