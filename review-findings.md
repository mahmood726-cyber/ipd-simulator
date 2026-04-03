## REVIEW CLEAN — All P0 and P1 fixed (2026-03-31)

## Multi-Persona Review: index.html
### Date: 2026-03-31
### Summary: 2 P0, 6 P1, 6 P2 → **All P0+P1 FIXED, 25/25 tests pass**

#### P0 -- Critical
- **P0-1** [Statistical Methodologist]: `computeLogRankHR` computes incidence rate ratio, NOT log-rank HR. Biased under non-constant hazards. (line ~699)
  - Suggested fix: Implement Mantel-Haenszel O-E/V log-rank HR estimator [FIXED]
- **P0-2** [Statistical Methodologist]: xoshiro128** scrambler is incorrect — computes `rotl(s[1]*35, 7)` instead of canonical `rotl(s[1]*5, 7) * 9`. Missing final `* 9` step. (line ~329)
  - Suggested fix: Separate multiply-by-5 from rotl, then multiply result by 9 [FIXED]

#### P1 -- Important
- **P1-1** [UX/Accessibility]: Plotly charts invisible in dark mode — default text color #444 on dark bg (line ~770)
  - Suggested fix: Detect dark mode, set font.color in Plotly layout
- **P1-2** [UX/Accessibility]: Badge contrast fails WCAG AA — green 3.30:1, amber 3.19:1 (line ~65-66)
  - Suggested fix: Use darker badge colors (#15803d green, #92400e amber)
- **P1-3** [Statistical Methodologist]: Continuous with correlation>0 and unequal N — concatenated arrays don't preserve exact mean/SD (line ~460)
  - Suggested fix: Apply single post-hoc adjustment to full concatenated array
- **P1-4** [Statistical Methodologist]: Post-hoc adjustment on correlated arms destroys correlation structure (line ~460)
  - Suggested fix: Document limitation, or implement joint adjustment
- **P1-5** [UX/Accessibility]: Result boxes lack aria-live for screen reader announcement (lines 143, 178, 220)
  - Suggested fix: Add aria-live="polite" to result divs
- **P1-6** [Security]: crypto.subtle unavailable on plain HTTP causes silent export failure (line ~868)
  - Suggested fix: Add fallback guard

#### P2 -- Minor
- **P2-1** [Statistical]: Monotonicity check before (0,1.0) prepend misses edge case (line ~556)
- **P2-2** [UX/Accessibility]: Select elements lack aria-label (lines 135, 171, 213)
- **P2-3** [Statistical]: nextGaussian() wastes half Box-Muller output (line ~349)
- **P2-4** [Security]: downloadBlob briefly adds visible element to DOM (line ~874)
- **P2-5** [UX/Accessibility]: Metrics table header in tbody, should use thead (line ~819)
- **P2-6** [Security]: parseInt missing radix parameter (lines ~1041)

#### False Positive Watch
- escapeHtml via createTextNode IS correct
- ${'<'}/script> pattern IS correct
- Div balance verified: 55/55
