# Truth-Recovery Validation -- ipd-simulator

**Verdict: SHIP (genuine methods engine -- reconstruction + recoverable estimator).**

## What this repo is

`index.html` (~1,370-line single-file app) reconstructs pseudo-IPD from published
aggregate summaries: Guyot Kaplan-Meier reconstruction, exact binary 2x2
recreation, and parametric continuous simulation. The triage question was whether
this is only a data-generation (DGP) tool -- which would have nothing to
truth-recover -- or whether it also contains an estimator whose output can be
checked against a known simulation truth.

It contains a genuine estimator. `reconstructKM()` rebuilds individual-level
survival data from digitised KM coordinates + at-risk tables, and
`computeLogRankHR()` is a Mantel-Haenszel O-E/V log-rank hazard-ratio estimator
run on that reconstructed IPD. The reconstructed HR is therefore checkable against
a known true HR. This makes the repo a methods engine, not a pure DGP tool.

## Method

`truth-recovery/dgp-survival.mjs` is a STANDALONE seeded DGP independent of the
repo's own RNG. It simulates two-arm exponential survival under proportional
hazards (control hazard lambdaC, experimental hazard lambdaC*HR_true,
administrative censoring at tMax), then summarises the known-truth cohort into
exactly the inputs the repo consumes (true KM coordinates per arm + an at-risk
table at reporting times [0,3,6,9,12,18,24]).

`truth-recovery/harness.mjs` runs the repo's OWN `reconstructKM()` and
`computeLogRankHR()` (imported verbatim from `engine.mjs`, extracted from
`index.html` lines 310-748) over 300 Monte-Carlo replicates per scenario, and
measures bias of the recovered log-HR plus Monte-Carlo coverage of the true HR.
As a reference, the same repo estimator is also run on the TRUE simulated IPD
(no reconstruction) to isolate how much bias the Guyot step itself injects.

## Results (nPerArm=400, lambdaC=0.03, tMax=24, 300 replicates)

| HR_true | mean recovered HR | log-HR bias (repo) | log-HR bias (true IPD) | MC coverage | warnings |
|--------:|------------------:|-------------------:|-----------------------:|------------:|---------:|
| 0.70    | 0.7057            | +0.0082            | +0.0076                | 93.7%       | 0%       |
| 1.00    | 1.0066            | +0.0065            | +0.0070                | 94.7%       | 0%       |
| 1.50    | 1.5092            | +0.0061            | +0.0072                | 94.0%       | 0%       |

## Findings

- Truth recovered with negligible bias. Recovered log-HR bias is ~0.006-0.008
  across protective, null, and harmful effects -- under 1% on the HR scale. No
  spurious effect appears in the null (HR=1.00) case.
- Guyot reconstruction adds essentially nothing. The repo's log-HR bias on
  reconstructed IPD is within ~0.001 of its bias on the TRUE IPD; the
  reconstruction step does not measurably degrade the estimate at these
  well-reported at-risk intervals.
- Coverage is close to nominal. Monte-Carlo coverage of the true HR is
  93.7-94.7% against the nominal 95% -- well-calibrated.
- No warnings fired (reconstructed N matched input within tolerance every
  replicate; no monotonicity clamps needed on clean truth inputs).

These confirm the published E156 claim that reconstruction agreement is excellent
for densely-reported curves; per the source's own caveat, accuracy is expected to
degrade with sparser at-risk reporting (not stress-tested here).

## Recommendation

SHIP. The repo is a legitimate methods engine: its KM reconstruction plus
log-rank HR estimator recover a known true hazard ratio with small bias and
near-nominal coverage across a protective/null/harmful sweep. Validation is
additive (truth-recovery/ only); original source untouched.

## Reproduce

    node truth-recovery/harness.mjs                      # prints results table
    node --test truth-recovery/test-truth-recovery.mjs   # 6 assertions
