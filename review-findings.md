## REVIEW CLEAN — All P0, P1, and P2 fixed (2026-04-03)

## Multi-Persona Review: index.html
### Date: 2026-03-31 (P2 pass: 2026-04-03)
### Summary: 2 P0, 6 P1, 6 P2 → **All FIXED, 25/25 tests pass**

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

#### P2 -- Minor (all fixed 2026-04-03)
- **P2-1** [FIXED]: Monotonicity check moved after (0,1.0) prepend so first user coordinate is also checked against S=1.0
- **P2-2** [FIXED]: All three select elements now have `aria-label` attributes
- **P2-3** [FIXED]: nextGaussian() now caches Box-Muller spare value for 2x efficiency
- **P2-4** [FIXED]: downloadBlob anchor element set to `display:none` before appending to DOM
- **P2-5** [FIXED]: Metrics and summary tables now use proper `<thead>` for header rows
- **P2-6** [FIXED]: All parseInt calls now include radix parameter (10)

#### False Positive Watch
- escapeHtml via createTextNode IS correct
- ${'<'}/script> pattern IS correct
- Div balance verified: 55/55
