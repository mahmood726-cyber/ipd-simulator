/* ============================================================================
 * truth-recovery/engine.mjs
 * Pure functions extracted VERBATIM from index.html (lines 310-748).
 * Additive only: original source unchanged. export {} appended at end.
 * ==========================================================================*/

function splitmix32(a) {
  return function() {
    a |= 0; a = a + 0x9e3779b9 | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const sm = splitmix32(seed);
  const s = new Uint32Array(4);
  for (let i = 0; i < 4; i++) s[i] = (sm() * 4294967296) >>> 0;

  return {
    /** Returns float in [0, 1) */
    next() {
      const r = Math.imul(s[1], 5) >>> 0;
      const rot = ((r << 7) | (r >>> 25)) >>> 0;
      const val = (Math.imul(rot, 9) >>> 0) / 4294967296;
      const t = s[1] << 9;
      s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
      s[2] ^= t;
      s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
      return val;
    },

    /** Box-Muller: returns pair of standard normal deviates */
    nextGaussianPair() {
      let u1, u2;
      do { u1 = this.next(); } while (u1 === 0);
      u2 = this.next();
      const r = Math.sqrt(-2 * Math.log(u1));
      return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
    },

    _gaussianSpare: null,
    _hasSpare: false,

    /** Single standard normal deviate (caches Box-Muller spare) */
    nextGaussian() {
      if (this._hasSpare) {
        this._hasSpare = false;
        return this._gaussianSpare;
      }
      const pair = this.nextGaussianPair();
      this._gaussianSpare = pair[1];
      this._hasSpare = true;
      return pair[0];
    },

    /** Fisher-Yates shuffle (in-place) */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

/* ================================================================
   BINARY SIMULATOR
   ================================================================ */

function simulateBinary(eventsExp, nExp, eventsCtrl, nCtrl, seed) {
  if (eventsExp > nExp || eventsCtrl > nCtrl) throw new Error('Events cannot exceed N');
  if (nExp < 1 || nCtrl < 1) throw new Error('N must be >= 1');
  if (eventsExp < 0 || eventsCtrl < 0) throw new Error('Events must be >= 0');

  const rng = makeRng(seed);
  const expOutcomes = Array(nExp).fill(0);
  for (let i = 0; i < eventsExp; i++) expOutcomes[i] = 1;
  rng.shuffle(expOutcomes);

  const ctrlOutcomes = Array(nCtrl).fill(0);
  for (let i = 0; i < eventsCtrl; i++) ctrlOutcomes[i] = 1;
  rng.shuffle(ctrlOutcomes);

  const ipd = [];
  let pid = 1;
  for (let i = 0; i < nExp; i++) {
    ipd.push({ patient_id: pid++, arm: 'experimental', outcome: expOutcomes[i] });
  }
  for (let i = 0; i < nCtrl; i++) {
    ipd.push({ patient_id: pid++, arm: 'control', outcome: ctrlOutcomes[i] });
  }

  // Validate marginals (deterministic — must always match)
  const reExp = ipd.filter(p => p.arm === 'experimental' && p.outcome === 1).length;
  const reCtrl = ipd.filter(p => p.arm === 'control' && p.outcome === 1).length;
  if (reExp !== eventsExp || reCtrl !== eventsCtrl) {
    throw new Error('Internal error: marginal mismatch after shuffle');
  }

  return {
    ipd,
    metrics: {
      n_exp: nExp, n_ctrl: nCtrl,
      events_exp: eventsExp, events_ctrl: eventsCtrl,
      event_rate_exp: eventsExp / nExp,
      event_rate_ctrl: eventsCtrl / nCtrl,
      marginals_exact: true,
    },
  };
}

/* ================================================================
   CONTINUOUS SIMULATOR
   ================================================================ */

/**
 * Post-hoc adjust an array so its sample mean and SD exactly match targets.
 * Must be defined before simulateContinuous to avoid reference errors.
 */
function postHocAdjust(arr, targetMean, targetSd) {
  const n = arr.length;
  if (n < 2) return arr.map(() => targetMean);
  const m = arr.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
  if (sd === 0) return arr.map(() => targetMean);
  return arr.map(v => ((v - m) / sd) * targetSd + targetMean);
}

function simulateContinuous(meanExp, sdExp, nExp, meanCtrl, sdCtrl, nCtrl, correlation, seed) {
  if (sdExp <= 0 || sdCtrl <= 0) throw new Error('SD must be > 0');
  if (nExp < 2 || nCtrl < 2) throw new Error('N must be >= 2');
  if (correlation < 0 || correlation >= 1) throw new Error('Correlation must be in [0, 1)');

  const rng = makeRng(seed);

  function generateNormal(n, targetMean, targetSd) {
    const raw = [];
    for (let i = 0; i < n; i += 2) {
      const pair = rng.nextGaussianPair();
      raw.push(pair[0]);
      if (i + 1 < n) raw.push(pair[1]);
    }
    return postHocAdjust(raw, targetMean, targetSd);
  }

  let expValues, ctrlValues;

  if (correlation === 0) {
    expValues = generateNormal(nExp, meanExp, sdExp);
    ctrlValues = generateNormal(nCtrl, meanCtrl, sdCtrl);
  } else {
    // Bivariate normal via Cholesky decomposition
    const nPaired = Math.min(nExp, nCtrl);
    const L22 = Math.sqrt(1 - correlation * correlation);
    const rawExp = [], rawCtrl = [];
    for (let i = 0; i < nPaired; i++) {
      const z1 = rng.nextGaussian();
      const z2 = rng.nextGaussian();
      rawExp.push(z1);
      rawCtrl.push(z1 * correlation + z2 * L22);
    }
    // Start from paired raw values
    expValues = [...rawExp];
    ctrlValues = [...rawCtrl];
    // Fill remaining if arms differ in N (unpaired extras)
    if (nExp > nPaired) {
      for (let i = 0; i < nExp - nPaired; i++) expValues.push(rng.nextGaussian());
    }
    if (nCtrl > nPaired) {
      for (let i = 0; i < nCtrl - nPaired; i++) ctrlValues.push(rng.nextGaussian());
    }
    // Note: Post-hoc mean/SD adjustment may slightly distort the achieved between-arm correlation.
    expValues = postHocAdjust(expValues, meanExp, sdExp);
    ctrlValues = postHocAdjust(ctrlValues, meanCtrl, sdCtrl);
  }

  const ipd = [];
  let pid = 1;
  for (let i = 0; i < nExp; i++) ipd.push({ patient_id: pid++, arm: 'experimental', value: expValues[i] });
  for (let i = 0; i < nCtrl; i++) ipd.push({ patient_id: pid++, arm: 'control', value: ctrlValues[i] });

  // Compute reconstructed statistics
  const rMeanE = expValues.reduce((s, v) => s + v, 0) / nExp;
  const rSdE = Math.sqrt(expValues.reduce((s, v) => s + (v - rMeanE) ** 2, 0) / (nExp - 1));
  const rMeanC = ctrlValues.reduce((s, v) => s + v, 0) / nCtrl;
  const rSdC = Math.sqrt(ctrlValues.reduce((s, v) => s + (v - rMeanC) ** 2, 0) / (nCtrl - 1));

  return {
    ipd,
    metrics: {
      n_exp: nExp, n_ctrl: nCtrl,
      input_mean_exp: meanExp, input_sd_exp: sdExp,
      input_mean_ctrl: meanCtrl, input_sd_ctrl: sdCtrl,
      recon_mean_exp: rMeanE, recon_sd_exp: rSdE,
      recon_mean_ctrl: rMeanC, recon_sd_ctrl: rSdC,
      mean_diff_pct_exp: Math.abs(rMeanE - meanExp) / (Math.abs(meanExp) || 1) * 100,
      sd_diff_pct_exp: Math.abs(rSdE - sdExp) / sdExp * 100,
      mean_diff_pct_ctrl: Math.abs(rMeanC - meanCtrl) / (Math.abs(meanCtrl) || 1) * 100,
      sd_diff_pct_ctrl: Math.abs(rSdC - sdCtrl) / sdCtrl * 100,
    },
  };
}

/* ================================================================
   KM RECONSTRUCTION — Guyot Algorithm (Guyot et al. BMC MRM 2012)
   ================================================================ */

function parseCoordinates(text) {
  /** Parse "time, survival" lines. Returns sorted array of {t, s}. */
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l && !l.match(/^[a-zA-Z]/));
  const coords = lines.map(l => {
    const parts = l.split(/[,\t\s]+/).map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return { t: parts[0], s: parts[1] };
  }).filter(Boolean);
  coords.sort((a, b) => a.t - b.t);
  return coords;
}

function parseAtRisk(text) {
  /** Parse "time, nrisk_exp, nrisk_ctrl" lines. Returns sorted array of {t, nExp, nCtrl}. */
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l && !l.match(/^[a-zA-Z]/));
  return lines.map(l => {
    const parts = l.split(/[,\t\s]+/).map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    return { t: parts[0], nExp: parts[1], nCtrl: parts[2] };
  }).filter(Boolean).sort((a, b) => a.t - b.t);
}

function interpolateSurvival(coords, times) {
  /** Piecewise linear interpolation of survival at given times. */
  return times.map(t => {
    if (t <= coords[0].t) return coords[0].s;
    if (t >= coords[coords.length - 1].t) return coords[coords.length - 1].s;
    for (let i = 0; i < coords.length - 1; i++) {
      if (t >= coords[i].t && t <= coords[i + 1].t) {
        const frac = (coords[i + 1].t - coords[i].t) === 0 ? 0
          : (t - coords[i].t) / (coords[i + 1].t - coords[i].t);
        return coords[i].s + frac * (coords[i + 1].s - coords[i].s);
      }
    }
    return coords[coords.length - 1].s;
  });
}

function guyotReconstruct(coords, atRiskTimes, atRiskN, seed) {
  /**
   * Reconstruct pseudo-IPD from one arm using the Guyot algorithm.
   * coords:       [{t, s}]  digitised KM coordinates (will be shallow-copied)
   * atRiskTimes:  [t0, t1, ...]  at-risk reporting times
   * atRiskN:      [n0, n1, ...]  at-risk numbers at each time
   * Returns: { patients: [{time, event}], warnings: [] }
   */
  const rng = makeRng(seed);
  const warnings = [];

  // Work on a copy to avoid mutating caller's data
  coords = coords.map(c => ({ t: c.t, s: c.s }));

  // Ensure curve starts at S=1.0 at t=0 (before monotonicity check so
  // the first user coordinate is also checked against S=1.0)
  if (coords[0].t > 0 || coords[0].s < 1) {
    coords.unshift({ t: 0, s: 1.0 });
  }

  // Enforce monotonicity (survival can only decrease)
  for (let i = 1; i < coords.length; i++) {
    if (coords[i].s > coords[i - 1].s) {
      warnings.push('Monotonicity violation at t=' + coords[i].t + ': S=' + coords[i].s + ' > ' + coords[i - 1].s + '. Clamped.');
      coords[i].s = coords[i - 1].s;
    }
  }

  // Interpolate survival at at-risk times
  const survAtRisk = interpolateSurvival(coords, atRiskTimes);

  const patients = [];

  for (let j = 0; j < atRiskTimes.length - 1; j++) {
    const nj = atRiskN[j];
    const njNext = atRiskN[j + 1];
    const sj = survAtRisk[j];
    const sjNext = survAtRisk[j + 1];
    const tStart = atRiskTimes[j];
    const tEnd = atRiskTimes[j + 1];

    if (nj === 0 || sj === 0) {
      warnings.push('Zero at-risk or survival at t=' + tStart + '. Skipping interval.');
      continue;
    }

    const hj = 1 - sjNext / sj;  // interval hazard
    let dj = Math.round(nj * hj); // events in interval
    dj = Math.max(0, dj);
    let cj = nj - dj - njNext;    // censored in interval
    cj = Math.max(0, cj);

    // Distribute events uniformly within the interval
    for (let e = 0; e < dj; e++) {
      const time = tStart + rng.next() * (tEnd - tStart);
      patients.push({ time: time, event: 1 });
    }
    // Distribute censorings uniformly within the interval
    for (let c = 0; c < cj; c++) {
      const time = tStart + rng.next() * (tEnd - tStart);
      patients.push({ time: time, event: 0 });
    }
  }

  // Last interval: censor all remaining at last reported time
  const lastIdx = atRiskTimes.length - 1;
  const remaining = atRiskN[lastIdx];
  const lastTime = atRiskTimes[lastIdx];
  for (let i = 0; i < remaining; i++) {
    patients.push({ time: lastTime, event: 0 });
  }

  patients.sort((a, b) => a.time - b.time);

  // Check total N vs input
  const totalReconstructed = patients.length;
  const totalInput = atRiskN[0];
  if (Math.abs(totalReconstructed - totalInput) > 2) {
    warnings.push('Reconstructed N=' + totalReconstructed + ' vs input N=' + totalInput + '. Difference > 2.');
  }

  return { patients: patients, warnings: warnings };
}

function reconstructKM(coordsExp, coordsCtrl, atRisk, seed) {
  /** Full two-arm KM reconstruction. */
  const atRiskTimes = atRisk.map(r => r.t);
  const atRiskNExp = atRisk.map(r => r.nExp);
  const atRiskNCtrl = atRisk.map(r => r.nCtrl);

  const expResult = guyotReconstruct(coordsExp, atRiskTimes, atRiskNExp, seed);
  const ctrlResult = guyotReconstruct(coordsCtrl, atRiskTimes, atRiskNCtrl, seed + 1);

  const ipd = [];
  let pid = 1;
  for (const p of expResult.patients) {
    ipd.push({ patient_id: pid++, arm: 'experimental', time: p.time, event: p.event });
  }
  for (const p of ctrlResult.patients) {
    ipd.push({ patient_id: pid++, arm: 'control', time: p.time, event: p.event });
  }

  // Compute reconstructed KM curves for validation overlay
  const kmExp = computeKMCurve(expResult.patients);
  const kmCtrl = computeKMCurve(ctrlResult.patients);

  // Compute HR via incidence rate ratio (Nelson-Aalen-style)
  const hr = computeLogRankHR(ipd);

  // Compute median survival from reconstructed KM
  const medianExp = computeMedianSurvival(kmExp);
  const medianCtrl = computeMedianSurvival(kmCtrl);

  const nEventsExp = expResult.patients.filter(p => p.event === 1).length;
  const nEventsCtrl = ctrlResult.patients.filter(p => p.event === 1).length;

  return {
    ipd: ipd,
    kmExp: kmExp,
    kmCtrl: kmCtrl,
    hr: hr,
    medianExp: medianExp,
    medianCtrl: medianCtrl,
    nExp: expResult.patients.length,
    nCtrl: ctrlResult.patients.length,
    nEventsExp: nEventsExp,
    nEventsCtrl: nEventsCtrl,
    warnings: [
      ...expResult.warnings.map(w => '[Exp] ' + w),
      ...ctrlResult.warnings.map(w => '[Ctrl] ' + w),
    ],
  };
}

function computeKMCurve(patients) {
  /** Compute step-function KM estimate from individual-level data. */
  const sorted = [...patients].sort((a, b) => a.time - b.time);
  const steps = [{ t: 0, s: 1.0 }];
  let nRisk = sorted.length;
  let surv = 1.0;
  let i = 0;
  while (i < sorted.length) {
    const t = sorted[i].time;
    let d = 0, c = 0;
    // Count all events and censorings at the same time point
    while (i < sorted.length && sorted[i].time === t) {
      if (sorted[i].event === 1) d++;
      else c++;
      i++;
    }
    if (d > 0 && nRisk > 0) {
      surv *= (1 - d / nRisk);
      steps.push({ t: t, s: surv });
    }
    nRisk -= (d + c);
  }
  return steps;
}

function computeLogRankHR(ipd) {
  /** Mantel-Haenszel O-E/V log-rank HR estimator. */
  const sorted = [...ipd].sort((a, b) => a.time - b.time);
  let nRiskExp = ipd.filter(p => p.arm === 'experimental').length;
  let nRiskCtrl = ipd.filter(p => p.arm === 'control').length;
  let sumOE = 0, sumV = 0;
  let i = 0;
  while (i < sorted.length) {
    const t = sorted[i].time;
    let dExp = 0, dCtrl = 0, cExp = 0, cCtrl = 0;
    while (i < sorted.length && sorted[i].time === t) {
      if (sorted[i].event === 1) { if (sorted[i].arm === 'experimental') dExp++; else dCtrl++; }
      else { if (sorted[i].arm === 'experimental') cExp++; else cCtrl++; }
      i++;
    }
    const d = dExp + dCtrl;
    const n = nRiskExp + nRiskCtrl;
    if (d > 0 && n > 1) {
      const eExp = nRiskExp * d / n;
      sumOE += (dExp - eExp);
      sumV += nRiskExp * nRiskCtrl * d * (n - d) / (n * n * (n - 1));
    }
    nRiskExp -= (dExp + cExp);
    nRiskCtrl -= (dCtrl + cCtrl);
  }
  if (sumV === 0) return null;
  return Math.exp(sumOE / sumV);
}

function computeMedianSurvival(kmCurve) {
  /** Find the first time at which survival drops to <= 0.5. */
  for (let i = 0; i < kmCurve.length; i++) {
    if (kmCurve[i].s <= 0.5) return kmCurve[i].t;
  }
  return null; // median not reached
}

export {
  splitmix32, makeRng,
  simulateBinary, postHocAdjust, simulateContinuous,
  parseCoordinates, parseAtRisk, interpolateSurvival,
  guyotReconstruct, reconstructKM, computeKMCurve,
  computeLogRankHR, computeMedianSurvival,
};
