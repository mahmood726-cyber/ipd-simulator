# IPD Simulator: Design Specification

**Date:** 2026-03-31
**Author:** Mahmood Ahmad
**Location:** `C:\Models\IPDSimulator\`
**Target journal:** Statistics in Medicine or BMC Medical Research Methodology
**Status:** Design approved, pending implementation

---

## 1. Purpose

Generate synthetic Individual Participant Data (IPD) from published aggregate summaries — enabling IPD-level analyses (time-to-event modelling, subgroup interactions, dose-response) when only aggregate data is available. Works standalone and exports in IPD-Meta-Pro-compatible format.

### Success Criteria

1. Guyot KM reconstruction produces pseudo-IPD whose reconstructed KM curve has RMSE < 0.05 against digitised input on 2+ built-in examples
2. Binary simulator preserves exact marginals (reconstructed 2x2 matches input perfectly)
3. Continuous simulator produces mean/SD within 2% of input at N >= 100
4. All three modes export CSV, IPD-Meta-Pro JSON, and R script
5. 25+ Selenium tests pass
6. Single HTML file, offline-capable, WCAG AA accessible

---

## 2. Architecture

### 2.1 Single-File HTML App

One `index.html` file following the established portfolio pattern (PairwisePro, NNTMapper, CardioOracle). Vanilla JS, Plotly CDN for charts, no build step, no framework.

### 2.2 Tab Structure

| Tab | ID | Purpose |
|-----|----|---------|
| KM Reconstruct | `tab-km` | Paste digitised KM coordinates + at-risk table, run Guyot algorithm |
| Binary Simulate | `tab-binary` | Enter 2x2 table, generate binary pseudo-IPD |
| Continuous Simulate | `tab-continuous` | Enter mean/SD/N per arm, generate continuous pseudo-IPD |
| Validation | `tab-validation` | Overlay reconstructed vs original, agreement metrics, export |

### 2.3 Data Flow

```
Input (paste/form/KMcurve JSON)
  -> Parse & validate (type detection, monotonicity check, range validation)
  -> Algorithm (Guyot / binary shuffle / normal simulation)
  -> Pseudo-IPD array (in-memory)
  -> Validation panel (overlay chart, metrics table, summary)
  -> Export (CSV / IPD-Meta-Pro JSON / R script)
```

### 2.4 Shared Infrastructure

- **Seeded PRNG:** xoshiro128** for deterministic, reproducible output. User-visible seed field (default: 42). "Regenerate" button increments seed.
- **localStorage:** Key `ipdsim_draft` persists current tab inputs across sessions.
- **Dark mode:** CSS variables, `prefers-color-scheme` media query.
- **Accessibility:** Skip-nav, aria-live regions for results, keyboard-navigable tabs, focus traps on modals, `prefers-reduced-motion`.
- **TruthCert provenance:** SHA-256 hash of input data, algorithm version, seed, timestamp — embedded in all exports.

---

## 3. KM Reconstruction (Guyot Algorithm)

### 3.1 Input Format

**Digitised coordinates** (required):
```
Time,Survival
0,1.000
2,0.923
4,0.871
...
```

Accepts comma, tab, or space delimited. Header row optional (auto-detected). One block per arm, separated by a blank line or arm selector.

**At-risk table** (required):
```
Time,NRisk_Exp,NRisk_Ctrl
0,150,148
6,132,121
12,110,98
...
```

**Published summary** (optional, for validation):
- Median survival per arm
- Hazard ratio + 95% CI
- Total events per arm

**KMcurve JSON import** (optional):
"Load from KMcurve" button accepts JSON output from the TrOCR neural OCR tool. Auto-populates coordinate and at-risk fields.

### 3.2 Algorithm Steps (per arm)

1. **Parse and sort** coordinates by time. Enforce survival starts at 1.0 (t=0).
2. **Monotonicity enforcement** — if any S(t_i) > S(t_{i-1}), clamp to previous value and emit warning.
3. **Interpolate** survival at each at-risk reporting time using monotone piecewise linear interpolation.
4. **For each interval [t_j, t_{j+1}]:**
   - `n_j` = number at risk at start of interval
   - `S_j`, `S_{j+1}` = survival at interval boundaries
   - `h_j` = 1 - S_{j+1}/S_j (interval hazard). Guard: if S_j = 0, skip interval.
   - `d_j` = round(n_j * h_j) (events in interval)
   - `c_j` = n_j - d_j - n_{j+1} (censorings, using next at-risk number)
   - Clamp `d_j >= 0`, `c_j >= 0`
5. **Distribute** events uniformly within interval (or at random times using seeded PRNG).
6. **Distribute** censorings uniformly within interval, after events.
7. **Output:** `patient_id`, `arm`, `time`, `event` (1=event, 0=censored).

### 3.3 Edge Cases

- **Last interval:** All remaining at-risk patients are censored at last reported time.
- **Zero at-risk:** Skip interval with warning.
- **Rounding errors:** If total reconstructed N differs from input N by > 2, emit warning.
- **Single-arm input:** Supported (no HR computation in validation).

---

## 4. Binary Simulator

### 4.1 Input

Form fields: `events_exp`, `n_exp`, `events_ctrl`, `n_ctrl`.

Validation: events <= N, N >= 1, events >= 0.

### 4.2 Algorithm

1. Generate `n_exp` binary outcomes: first `events_exp` are 1, rest are 0.
2. Shuffle using seeded PRNG (Fisher-Yates).
3. Repeat for control arm.
4. Merge with `patient_id`, `arm`, `outcome` columns.

### 4.3 Properties

- **Exact marginal preservation:** Reconstructed 2x2 table always matches input exactly.
- **No simulation noise:** Only the patient ordering is random; totals are deterministic.

---

## 5. Continuous Simulator

### 5.1 Input

Form fields per arm: `mean`, `sd`, `n`. Optional: `correlation` (default 0, for paired/crossover designs).

Validation: SD > 0, N >= 2.

### 5.2 Algorithm

1. **If correlation = 0:** Independent draws. For each arm, generate N values from N(mean, SD^2) using Box-Muller transform with seeded PRNG.
2. **If correlation > 0:** Bivariate normal. Generate paired (X, Y) with specified means, SDs, and correlation using Cholesky decomposition.
3. Output: `patient_id`, `arm`, `value`.

### 5.3 Post-hoc Adjustment

After generation, scale and shift samples so that sample mean and SD exactly match input values:
```
x_adjusted = (x - sample_mean) / sample_sd * target_sd + target_mean
```
Guard: if `sample_sd = 0` (degenerate case), skip scaling and set all values to `target_mean`.
This ensures reconstructed summary statistics match input precisely (no simulation noise for validation).

---

## 6. Validation Panel

### 6.1 Visual Overlay

**KM mode:** Plotly chart with:
- Original digitised points (blue scatter markers)
- Reconstructed KM step function from pseudo-IPD (red line)
- Shaded region showing absolute difference
- At-risk table below x-axis

**Binary mode:** Grouped bar chart comparing input vs reconstructed event counts per arm.

**Continuous mode:** Side-by-side density plot (input normal distribution vs histogram of pseudo-IPD).

### 6.2 Agreement Metrics Table

| Metric | Applies to | Good | Acceptable | Poor |
|--------|-----------|------|------------|------|
| RMSE (survival difference) | KM | < 0.02 | < 0.05 | >= 0.05 |
| Max absolute error | KM | < 0.05 | < 0.10 | >= 0.10 |
| Median survival difference | KM | < 5% | < 10% | >= 10% |
| HR difference (vs published) | KM | < 5% | < 10% | >= 10% |
| Event count match | Binary | Exact | - | Not exact |
| Mean difference | Continuous | < 1% | < 2% | >= 2% |
| SD difference | Continuous | < 1% | < 5% | >= 5% |

Traffic-light colour coding: green / amber / red.

### 6.3 Pseudo-IPD Summary

Table showing: N per arm, events per arm (KM/binary), median follow-up (KM), event rate (binary), mean/SD (continuous). Quick sanity check before export.

---

## 7. Export Formats

### 7.1 CSV

```csv
patient_id,arm,time,event
1,experimental,3.2,1
2,experimental,12.0,0
...
```

Column names adapt per mode: `time,event` (KM), `outcome` (binary), `value` (continuous).

### 7.2 IPD-Meta-Pro JSON

```json
{
  "study_id": "User-provided or auto-generated",
  "source": "IPD-Simulator v1.0",
  "seed": 42,
  "outcome_type": "time-to-event",
  "arms": [
    {
      "name": "Experimental",
      "n": 150,
      "patients": [
        {"id": 1, "time": 3.2, "event": 1}
      ]
    },
    {
      "name": "Control",
      "n": 148,
      "patients": [
        {"id": 1, "time": 5.1, "event": 1}
      ]
    }
  ],
  "reconstruction_quality": {
    "rmse": 0.012,
    "max_abs_error": 0.031
  },
  "provenance": {
    "input_hash": "sha256:abc123...",
    "algorithm": "guyot-2012",
    "version": "1.0.0",
    "seed": 42,
    "timestamp": "2026-03-31T14:30:00Z"
  }
}
```

### 7.3 R Script

```r
# IPD-Simulator v1.0 — Reconstructed pseudo-IPD
# Source: Guyot algorithm | Seed: 42 | Date: 2026-03-31
# Input hash: sha256:abc123...

df <- data.frame(
  patient_id = 1:298,
  arm = c(rep("experimental", 150), rep("control", 148)),
  time = c(3.2, 12.0, ...),
  event = c(1, 0, ...)
)
```

### 7.4 Blob URL Management

All downloads use `URL.createObjectURL()`. Revoke with `URL.revokeObjectURL()` after download completes (5-second timeout).

---

## 8. Built-in Examples

| # | Name | Type | Data source |
|---|------|------|-------------|
| 1 | DAPA-HF (dapagliflozin in HFrEF) | KM | Pre-digitised coordinates from published KM figure + at-risk table, NEJM 2019 |
| 2 | PARADIGM-HF (sacubitril/valsartan) | KM | Pre-digitised coordinates from published KM figure + at-risk table, NEJM 2014 |
| 3 | SGLT2i HF hospitalization | Binary | Pooled events from 4 trials (matches NNTMapper) |
| 4 | Systolic BP reduction (amlodipine vs placebo) | Continuous | Mean/SD/N from representative trial |

Each example has a "Load Example" button that pre-fills all input fields and auto-runs the algorithm.

---

## 9. Testing Plan

**25+ Selenium tests covering:**

- **KM reconstruction (8 tests):** DAPA-HF example produces RMSE < 0.05, monotonicity violation handled, missing at-risk warning, single-arm mode, empty input rejected, HR reconstruction within 10% of published, edge case k=2 time points, large dataset (500 patients)
- **Binary simulator (5 tests):** Exact marginal preservation, zero-event arm, seed reproducibility (same seed = same output), export CSV parseable, export JSON schema valid
- **Continuous simulator (5 tests):** Mean/SD match after adjustment, correlation=0 independence, correlation>0 produces expected r, negative mean handled, N=2 edge case
- **Validation panel (4 tests):** Metrics table renders with correct traffic-light colours, overlay chart has correct number of traces, agreement thresholds applied correctly, summary table values match pseudo-IPD
- **Export (4 tests):** CSV download triggers and parses correctly, IPD-Meta-Pro JSON validates against schema, R script is syntactically valid, provenance hash changes with different input
- **Accessibility (2 tests):** Tab keyboard navigation, skip-nav link present

---

## 10. Non-Goals (v1)

- No built-in image digitiser (use WebPlotDigitizer or KMcurve externally)
- No batch processing (one study at a time)
- No network meta-analysis IPD simulation
- No time-varying covariates
- No competing risks reconstruction
- No Python engine (browser-only for v1)

---

## 11. File Structure

```
C:\Models\IPDSimulator\
  index.html          (single-file app, ~2,000-3,000 lines estimated)
  tests/
    test_ipdsim.py    (Selenium test suite)
  paper/
    manuscript.md     (Stat Med / BMC MRM paper)
  docs/
    superpowers/
      specs/2026-03-31-ipd-simulator-design.md  (this file)
      plans/  (implementation plan, to be written)
  README.md
  LICENSE             (MIT)
  CITATION.cff
```

---

## 12. References

1. Guyot P, Ades AE, Ouwens MJ, Welton NJ. Enhanced secondary analysis of survival data: reconstructing the data from published Kaplan-Meier survival curves. *BMC Med Res Methodol*. 2012;12:9.
2. Wei Y, Royston P. Reconstructing time-to-event data from published Kaplan-Meier curves. *Stata J*. 2017;17(4):786-802.
3. Marsaglia G. Xoshiro / xoroshiro generators and the JUMP function. 2018.
