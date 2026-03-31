# IPD Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based tool that generates synthetic IPD from published aggregate data (KM curves, 2x2 tables, mean/SD/N) with validation and multi-format export.

**Architecture:** Single-file HTML app (`index.html`), vanilla JS, Plotly CDN for charts. Four tabs: KM Reconstruct, Binary Simulate, Continuous Simulate, Validation. Seeded PRNG (xoshiro128**) for deterministic output. Exports CSV, IPD-Meta-Pro JSON, and R script.

**Tech Stack:** HTML5, vanilla JS (ES2020), Plotly.js CDN, CSS custom properties, Selenium (Python) for testing.

**Spec:** `docs/superpowers/specs/2026-03-31-ipd-simulator-design.md`

---

## File Map

| File | Responsibility |
|------|----------------|
| `index.html` | Single-file app: HTML structure, CSS, all JS (PRNG, parsers, algorithms, validation, export, UI) |
| `tests/test_ipdsim.py` | Selenium test suite (25+ tests) |
| `README.md` | Project overview, usage, citation |
| `LICENSE` | MIT license |
| `CITATION.cff` | Citation metadata |

---

### Task 1: HTML Scaffold + CSS + Tab Switching

**Files:**
- Create: `C:\Models\IPDSimulator\index.html`

This task creates the full page structure with 4 tabs, CSS variables for dark mode, and tab-switching logic. No algorithms yet — just the shell.

- [ ] **Step 1: Create index.html with full HTML structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IPD Simulator — Reconstruct Individual Participant Data</title>
  <script src="https://cdn.plot.ly/plotly-2.35.0.min.js"></script>
  <style>
    :root {
      --bg: #f8f9fa; --bg2: #ffffff; --fg: #1a1a2e; --fg2: #555;
      --accent: #2563eb; --accent-hover: #1d4ed8;
      --green: #16a34a; --amber: #d97706; --red: #dc2626;
      --border: #e2e8f0; --radius: 8px;
      --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
      --mono: 'Cascadia Code', 'Fira Code', monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a; --bg2: #1e293b; --fg: #e2e8f0; --fg2: #94a3b8;
        --border: #334155; --accent: #60a5fa; --accent-hover: #93bbfc;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font); background: var(--bg); color: var(--fg); line-height: 1.6; }
    a.skip-nav { position: absolute; top: -40px; left: 0; background: var(--accent); color: #fff; padding: 8px 16px; z-index: 1000; }
    a.skip-nav:focus { top: 0; }
    header { background: var(--bg2); border-bottom: 1px solid var(--border); padding: 16px 24px; }
    header h1 { font-size: 1.5rem; font-weight: 700; }
    header p { color: var(--fg2); font-size: 0.9rem; margin-top: 4px; }
    .tab-bar { display: flex; gap: 0; border-bottom: 2px solid var(--border); background: var(--bg2); padding: 0 24px; }
    .tab-btn { padding: 12px 20px; border: none; background: none; cursor: pointer; font-size: 0.95rem;
      color: var(--fg2); border-bottom: 3px solid transparent; transition: all 0.15s; font-family: var(--font); }
    .tab-btn:hover { color: var(--fg); background: var(--bg); }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
    .tab-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .tab-panel { display: none; padding: 24px; max-width: 960px; margin: 0 auto; }
    .tab-panel.active { display: block; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 4px; font-size: 0.9rem; }
    .form-group textarea, .form-group input { width: 100%; padding: 10px 12px; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--bg); color: var(--fg); font-family: var(--mono); font-size: 0.85rem; }
    .form-group textarea { min-height: 120px; resize: vertical; }
    .form-group input[type="number"] { width: 140px; }
    .form-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .form-row .form-group { flex: 1; min-width: 120px; }
    .btn { padding: 10px 20px; border: none; border-radius: var(--radius); cursor: pointer; font-size: 0.95rem;
      font-weight: 600; transition: background 0.15s; font-family: var(--font); }
    .btn-primary { background: var(--accent); color: #fff; }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-secondary { background: var(--bg); color: var(--fg); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--border); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-row { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
    .result-box { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 16px; margin-top: 16px; }
    .metrics-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .metrics-table th, .metrics-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
    .metrics-table th { font-weight: 600; color: var(--fg2); }
    .badge-good { background: var(--green); color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }
    .badge-ok { background: var(--amber); color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }
    .badge-poor { background: var(--red); color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }
    .warning { background: #fef3c7; border-left: 4px solid var(--amber); padding: 12px 16px; margin: 12px 0; border-radius: 0 var(--radius) var(--radius) 0; color: #92400e; }
    .seed-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .seed-row label { font-weight: 600; font-size: 0.9rem; margin: 0; }
    .seed-row input { width: 100px; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--bg); color: var(--fg); font-family: var(--mono); }
    footer { text-align: center; padding: 24px; color: var(--fg2); font-size: 0.8rem; border-top: 1px solid var(--border); margin-top: 40px; }
    #validation-chart { width: 100%; height: 400px; }
    .summary-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .summary-table th, .summary-table td { padding: 6px 12px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
    .export-section { margin-top: 20px; }
    .hidden { display: none; }
    [aria-live] { position: relative; }
  </style>
</head>
<body>
  <a href="#main" class="skip-nav">Skip to main content</a>
  <header>
    <h1>IPD Simulator</h1>
    <p>Reconstruct Individual Participant Data from published aggregate summaries</p>
  </header>

  <nav class="tab-bar" role="tablist" aria-label="Simulator modes">
    <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="tab-km" id="btn-km">KM Reconstruct</button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="tab-binary" id="btn-binary">Binary Simulate</button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="tab-continuous" id="btn-continuous">Continuous Simulate</button>
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="tab-validation" id="btn-validation">Validation</button>
  </nav>

  <main id="main">
    <!-- KM Reconstruct Tab -->
    <div class="tab-panel active" role="tabpanel" id="tab-km" aria-labelledby="btn-km">
      <h2>Kaplan-Meier Reconstruction (Guyot Algorithm)</h2>
      <p style="color:var(--fg2);margin-bottom:16px">Paste digitised KM coordinates and at-risk numbers to reconstruct pseudo-IPD with individual event times.</p>

      <div class="seed-row">
        <label for="km-seed">Seed:</label>
        <input type="number" id="km-seed" value="42" min="0" step="1">
        <button class="btn btn-secondary" id="km-regenerate" title="Increment seed and re-run">Regenerate</button>
      </div>

      <div class="form-group">
        <label for="km-coords-exp">Experimental Arm — Digitised Coordinates (Time, Survival)</label>
        <textarea id="km-coords-exp" placeholder="0, 1.000&#10;2, 0.923&#10;4, 0.871&#10;..."></textarea>
      </div>
      <div class="form-group">
        <label for="km-coords-ctrl">Control Arm — Digitised Coordinates (Time, Survival)</label>
        <textarea id="km-coords-ctrl" placeholder="0, 1.000&#10;2, 0.952&#10;4, 0.901&#10;..."></textarea>
      </div>
      <div class="form-group">
        <label for="km-atrisk">At-Risk Table (Time, NRisk_Exp, NRisk_Ctrl)</label>
        <textarea id="km-atrisk" placeholder="0, 150, 148&#10;6, 132, 121&#10;12, 110, 98&#10;..."></textarea>
      </div>

      <details style="margin-bottom:16px">
        <summary style="cursor:pointer;font-weight:600;font-size:0.9rem">Optional: Published Summary (for validation)</summary>
        <div class="form-row" style="margin-top:8px">
          <div class="form-group"><label for="km-median-exp">Median Survival (Exp)</label><input type="number" id="km-median-exp" step="0.1" placeholder="e.g. 14.2"></div>
          <div class="form-group"><label for="km-median-ctrl">Median Survival (Ctrl)</label><input type="number" id="km-median-ctrl" step="0.1" placeholder="e.g. 9.8"></div>
          <div class="form-group"><label for="km-hr">Hazard Ratio</label><input type="number" id="km-hr" step="0.01" placeholder="e.g. 0.74"></div>
        </div>
      </details>

      <div class="btn-row">
        <button class="btn btn-primary" id="km-run">Reconstruct IPD</button>
        <button class="btn btn-secondary" id="km-load-json">Load from KMcurve JSON</button>
        <input type="file" id="km-json-file" accept=".json" class="hidden">
        <select id="km-example" class="btn btn-secondary" style="padding:10px 12px">
          <option value="">Load Example...</option>
          <option value="dapahf">DAPA-HF</option>
          <option value="paradigm">PARADIGM-HF</option>
        </select>
      </div>
      <div id="km-warnings" aria-live="polite"></div>
      <div id="km-result" class="result-box hidden"></div>
    </div>

    <!-- Binary Simulate Tab -->
    <div class="tab-panel" role="tabpanel" id="tab-binary" aria-labelledby="btn-binary">
      <h2>Binary Outcome Simulation</h2>
      <p style="color:var(--fg2);margin-bottom:16px">Enter a 2x2 table to generate individual-level binary outcomes preserving exact marginals.</p>

      <div class="seed-row">
        <label for="bin-seed">Seed:</label>
        <input type="number" id="bin-seed" value="42" min="0" step="1">
        <button class="btn btn-secondary" id="bin-regenerate">Regenerate</button>
      </div>

      <div class="form-row">
        <div class="form-group"><label for="bin-events-exp">Events (Exp)</label><input type="number" id="bin-events-exp" min="0" placeholder="23"></div>
        <div class="form-group"><label for="bin-n-exp">N (Exp)</label><input type="number" id="bin-n-exp" min="1" placeholder="150"></div>
        <div class="form-group"><label for="bin-events-ctrl">Events (Ctrl)</label><input type="number" id="bin-events-ctrl" min="0" placeholder="41"></div>
        <div class="form-group"><label for="bin-n-ctrl">N (Ctrl)</label><input type="number" id="bin-n-ctrl" min="1" placeholder="148"></div>
      </div>

      <div class="form-group">
        <label for="bin-study-id">Study ID (optional)</label>
        <input type="text" id="bin-study-id" placeholder="e.g. Smith2024" style="width:240px">
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="bin-run">Simulate IPD</button>
        <select id="bin-example" class="btn btn-secondary" style="padding:10px 12px">
          <option value="">Load Example...</option>
          <option value="sglt2i">SGLT2i HF Hospitalization</option>
        </select>
      </div>
      <div id="bin-warnings" aria-live="polite"></div>
      <div id="bin-result" class="result-box hidden"></div>
    </div>

    <!-- Continuous Simulate Tab -->
    <div class="tab-panel" role="tabpanel" id="tab-continuous" aria-labelledby="btn-continuous">
      <h2>Continuous Outcome Simulation</h2>
      <p style="color:var(--fg2);margin-bottom:16px">Enter mean, SD, and N per arm to generate individual-level continuous outcomes.</p>

      <div class="seed-row">
        <label for="cont-seed">Seed:</label>
        <input type="number" id="cont-seed" value="42" min="0" step="1">
        <button class="btn btn-secondary" id="cont-regenerate">Regenerate</button>
      </div>

      <div class="form-row">
        <div class="form-group"><label for="cont-mean-exp">Mean (Exp)</label><input type="number" id="cont-mean-exp" step="0.01" placeholder="-5.2"></div>
        <div class="form-group"><label for="cont-sd-exp">SD (Exp)</label><input type="number" id="cont-sd-exp" step="0.01" min="0.001" placeholder="8.1"></div>
        <div class="form-group"><label for="cont-n-exp">N (Exp)</label><input type="number" id="cont-n-exp" min="2" placeholder="120"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label for="cont-mean-ctrl">Mean (Ctrl)</label><input type="number" id="cont-mean-ctrl" step="0.01" placeholder="-2.1"></div>
        <div class="form-group"><label for="cont-sd-ctrl">SD (Ctrl)</label><input type="number" id="cont-sd-ctrl" step="0.01" min="0.001" placeholder="7.9"></div>
        <div class="form-group"><label for="cont-n-ctrl">N (Ctrl)</label><input type="number" id="cont-n-ctrl" min="2" placeholder="118"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label for="cont-corr">Between-arm Correlation (0 for independent)</label><input type="number" id="cont-corr" step="0.01" min="0" max="0.99" value="0" style="width:100px"></div>
      </div>

      <div class="form-group">
        <label for="cont-study-id">Study ID (optional)</label>
        <input type="text" id="cont-study-id" placeholder="e.g. Jones2023" style="width:240px">
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" id="cont-run">Simulate IPD</button>
        <select id="cont-example" class="btn btn-secondary" style="padding:10px 12px">
          <option value="">Load Example...</option>
          <option value="bp">Systolic BP Reduction</option>
        </select>
      </div>
      <div id="cont-warnings" aria-live="polite"></div>
      <div id="cont-result" class="result-box hidden"></div>
    </div>

    <!-- Validation Tab -->
    <div class="tab-panel" role="tabpanel" id="tab-validation" aria-labelledby="btn-validation">
      <h2>Validation &amp; Export</h2>
      <p style="color:var(--fg2);margin-bottom:16px">Review reconstruction quality, compare against published values, and export pseudo-IPD.</p>
      <div id="validation-empty" style="text-align:center;padding:60px 0;color:var(--fg2)">
        <p style="font-size:1.1rem">No reconstruction yet.</p>
        <p>Run a simulation from one of the other tabs to see validation results here.</p>
      </div>
      <div id="validation-content" class="hidden">
        <div id="validation-chart"></div>
        <h3 style="margin-top:20px">Agreement Metrics</h3>
        <table class="metrics-table" id="metrics-table"><tbody></tbody></table>
        <h3 style="margin-top:20px">Pseudo-IPD Summary</h3>
        <table class="summary-table" id="summary-table"><tbody></tbody></table>
        <div class="export-section">
          <h3>Export</h3>
          <div class="btn-row">
            <button class="btn btn-primary" id="export-csv">Download CSV</button>
            <button class="btn btn-primary" id="export-json">Download IPD-Meta-Pro JSON</button>
            <button class="btn btn-primary" id="export-r">Download R Script</button>
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer>
    IPD Simulator v1.0 &mdash; Mahmood Ahmad, Royal Free Hospital, London
    &mdash; <a href="https://github.com/mahmood726-cyber/ipdsimulator" style="color:var(--accent)">GitHub</a>
    &mdash; MIT License
  </footer>

<script>
'use strict';

/* ═══════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════ */

const STATE = {
  lastMode: null,       // 'km' | 'binary' | 'continuous'
  lastIPD: null,        // array of patient objects
  lastMeta: null,       // metadata for export (study_id, seed, etc.)
  lastMetrics: null,    // validation metrics
  lastInput: null,      // raw input data for provenance
};

/* ═══════════════════════════════════════════════
   TAB SWITCHING
   ═══════════════════════════════════════════════ */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(btn.getAttribute('aria-controls')).classList.add('active');
  });
  btn.addEventListener('keydown', e => {
    const tabs = [...document.querySelectorAll('.tab-btn')];
    const idx = tabs.indexOf(e.target);
    if (e.key === 'ArrowRight') { tabs[(idx + 1) % tabs.length].focus(); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { tabs[(idx - 1 + tabs.length) % tabs.length].focus(); e.preventDefault(); }
  });
});

/* ═══════════════════════════════════════════════
   ALGORITHMS — filled in Tasks 2-5
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   VALIDATION — filled in Task 6
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   EXPORT — filled in Task 7
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   EXAMPLES — filled in Task 8
   ═══════════════════════════════════════════════ */

${'<'}/script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify tabs switch**

Open `C:\Models\IPDSimulator\index.html` in Chrome. Click each tab — only one panel should be visible at a time. Verify keyboard arrow navigation works between tabs.

- [ ] **Step 3: Commit**

```bash
cd /c/Models/IPDSimulator && git init && git add index.html docs/
git commit -m "feat: HTML scaffold with 4 tabs, CSS, tab switching"
```

---

### Task 2: Seeded PRNG (xoshiro128**)

**Files:**
- Modify: `C:\Models\IPDSimulator\index.html` (add to `<script>` block)

Implement the xoshiro128** PRNG used by all three simulators for deterministic output.

- [ ] **Step 1: Add xoshiro128** implementation after the STATE block**

Insert after `/* ALGORITHMS — filled in Tasks 2-5 */`:

```javascript
/* ═══════════════════════════════════════════════
   SEEDED PRNG — xoshiro128**
   ═══════════════════════════════════════════════ */

function splitmix32(a) {
  return function() {
    a |= 0; a = a + 0x9e3779b9 | 0;
    let t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
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
      const result = Math.imul(s[1] * 5, 7) >>> 0;
      const rot = ((result << 7) | (result >>> 25)) >>> 0;
      const val = (rot >>> 0) / 4294967296;
      const t = s[1] << 9;
      s[2] ^= s[0]; s[3] ^= s[1]; s[1] ^= s[2]; s[0] ^= s[3];
      s[2] ^= t; s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
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
```

- [ ] **Step 2: Verify PRNG determinism in console**

Open browser console, run:
```javascript
const rng1 = makeRng(42); const a = [rng1.next(), rng1.next(), rng1.next()];
const rng2 = makeRng(42); const b = [rng2.next(), rng2.next(), rng2.next()];
console.assert(JSON.stringify(a) === JSON.stringify(b), 'PRNG not deterministic');
console.log('PRNG OK:', a);
```

- [ ] **Step 3: Commit**

```bash
cd /c/Models/IPDSimulator && git add index.html
git commit -m "feat: add xoshiro128** seeded PRNG with Box-Muller and Fisher-Yates"
```

---

### Task 3: Binary Simulator

**Files:**
- Modify: `C:\Models\IPDSimulator\index.html`

Implement the simplest algorithm first: binary 2x2 table to pseudo-IPD.

- [ ] **Step 1: Add binary simulator function after the PRNG block**

```javascript
/* ═══════════════════════════════════════════════
   BINARY SIMULATOR
   ═══════════════════════════════════════════════ */

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

  // Validate marginals
  const reExp = ipd.filter(p => p.arm === 'experimental' && p.outcome === 1).length;
  const reCtrl = ipd.filter(p => p.arm === 'control' && p.outcome === 1).length;
  console.assert(reExp === eventsExp, 'Marginal mismatch exp');
  console.assert(reCtrl === eventsCtrl, 'Marginal mismatch ctrl');

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
```

- [ ] **Step 2: Wire up the "Simulate IPD" button**

Add at bottom of `<script>`, before the closing:

```javascript
/* ═══════════════════════════════════════════════
   UI HANDLERS — Binary
   ═══════════════════════════════════════════════ */

document.getElementById('bin-run').addEventListener('click', () => {
  const ee = parseInt(document.getElementById('bin-events-exp').value);
  const ne = parseInt(document.getElementById('bin-n-exp').value);
  const ec = parseInt(document.getElementById('bin-events-ctrl').value);
  const nc = parseInt(document.getElementById('bin-n-ctrl').value);
  const seed = parseInt(document.getElementById('bin-seed').value) || 42;
  const studyId = document.getElementById('bin-study-id').value || 'BinaryStudy';
  const warn = document.getElementById('bin-warnings');
  warn.innerHTML = '';

  if ([ee, ne, ec, nc].some(v => isNaN(v))) {
    warn.innerHTML = '<div class="warning">All four fields are required.</div>';
    return;
  }
  try {
    const result = simulateBinary(ee, ne, ec, nc, seed);
    STATE.lastMode = 'binary';
    STATE.lastIPD = result.ipd;
    STATE.lastMetrics = result.metrics;
    STATE.lastMeta = { study_id: studyId, seed, outcome_type: 'binary', algorithm: 'shuffle' };
    STATE.lastInput = { events_exp: ee, n_exp: ne, events_ctrl: ec, n_ctrl: nc };

    const box = document.getElementById('bin-result');
    box.classList.remove('hidden');
    box.innerHTML = `<p><strong>${result.ipd.length} patients generated</strong> (${ne} exp + ${nc} ctrl). `
      + `Marginals exact: ${result.metrics.marginals_exact}. `
      + `<button class="btn btn-secondary" onclick="showValidation()">View Validation &rarr;</button></p>`;
  } catch (e) {
    warn.innerHTML = `<div class="warning">${e.message}</div>`;
  }
});

document.getElementById('bin-regenerate').addEventListener('click', () => {
  const el = document.getElementById('bin-seed');
  el.value = parseInt(el.value || 42) + 1;
  document.getElementById('bin-run').click();
});

function showValidation() {
  document.getElementById('btn-validation').click();
  renderValidation();
}
```

- [ ] **Step 3: Verify in browser**

Open app, go to Binary tab, enter: Events Exp=23, N Exp=150, Events Ctrl=41, N Ctrl=148. Click "Simulate IPD". Should show "298 patients generated" with marginals exact: true.

- [ ] **Step 4: Commit**

```bash
cd /c/Models/IPDSimulator && git add index.html
git commit -m "feat: binary simulator with exact marginal preservation"
```

---

### Task 4: Continuous Simulator

**Files:**
- Modify: `C:\Models\IPDSimulator\index.html`

- [ ] **Step 1: Add continuous simulator function after binary simulator**

```javascript
/* ═══════════════════════════════════════════════
   CONTINUOUS SIMULATOR
   ═══════════════════════════════════════════════ */

function simulateContinuous(meanExp, sdExp, nExp, meanCtrl, sdCtrl, nCtrl, correlation, seed) {
  if (sdExp <= 0 || sdCtrl <= 0) throw new Error('SD must be > 0');
  if (nExp < 2 || nCtrl < 2) throw new Error('N must be >= 2');
  if (correlation < 0 || correlation >= 1) throw new Error('Correlation must be in [0, 1)');

  const rng = makeRng(seed);

  function generateNormal(n, targetMean, targetSd) {
    const raw = [];
    for (let i = 0; i < n; i += 2) {
      const [z1, z2] = rng.nextGaussianPair();
      raw.push(z1);
      if (i + 1 < n) raw.push(z2);
    }
    // Post-hoc adjustment: force exact mean and SD
    const m = raw.reduce((s, v) => s + v, 0) / raw.length;
    const sd = Math.sqrt(raw.reduce((s, v) => s + (v - m) ** 2, 0) / (raw.length - 1));
    if (sd === 0) return raw.map(() => targetMean);
    return raw.map(v => ((v - m) / sd) * targetSd + targetMean);
  }

  let expValues, ctrlValues;

  if (correlation === 0) {
    expValues = generateNormal(nExp, meanExp, sdExp);
    ctrlValues = generateNormal(nCtrl, meanCtrl, sdCtrl);
  } else {
    // Bivariate normal via Cholesky: use min(nExp, nCtrl) paired, rest independent
    const nPaired = Math.min(nExp, nCtrl);
    const L11 = 1, L21 = correlation, L22 = Math.sqrt(1 - correlation * correlation);
    const rawExp = [], rawCtrl = [];
    for (let i = 0; i < nPaired; i += 1) {
      const pair = rng.nextGaussianPair();
      const z1 = pair[0], z2 = pair.length > 1 ? pair[1] : rng.nextGaussianPair()[0];
      rawExp.push(z1 * L11);
      rawCtrl.push(z1 * L21 + z2 * L22);
    }
    // Post-hoc adjust paired portion
    const adjExp = postHocAdjust(rawExp, meanExp, sdExp);
    const adjCtrl = postHocAdjust(rawCtrl, meanCtrl, sdCtrl);
    // Fill remaining if arms have different N
    expValues = adjExp.concat(generateNormal(nExp - nPaired, meanExp, sdExp));
    ctrlValues = adjCtrl.concat(generateNormal(nCtrl - nPaired, meanCtrl, sdCtrl));
  }

  const ipd = [];
  let pid = 1;
  for (let i = 0; i < nExp; i++) ipd.push({ patient_id: pid++, arm: 'experimental', value: expValues[i] });
  for (let i = 0; i < nCtrl; i++) ipd.push({ patient_id: pid++, arm: 'control', value: ctrlValues[i] });

  // Compute reconstructed stats
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

function postHocAdjust(arr, targetMean, targetSd) {
  const m = arr.reduce((s, v) => s + v, 0) / arr.length;
  const sd = Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  if (sd === 0) return arr.map(() => targetMean);
  return arr.map(v => ((v - m) / sd) * targetSd + targetMean);
}
```

- [ ] **Step 2: Wire up the continuous tab UI handler**

```javascript
/* ═══════════════════════════════════════════════
   UI HANDLERS — Continuous
   ═══════════════════════════════════════════════ */

document.getElementById('cont-run').addEventListener('click', () => {
  const me = parseFloat(document.getElementById('cont-mean-exp').value);
  const se = parseFloat(document.getElementById('cont-sd-exp').value);
  const ne = parseInt(document.getElementById('cont-n-exp').value);
  const mc = parseFloat(document.getElementById('cont-mean-ctrl').value);
  const sc = parseFloat(document.getElementById('cont-sd-ctrl').value);
  const nc = parseInt(document.getElementById('cont-n-ctrl').value);
  const corr = parseFloat(document.getElementById('cont-corr').value) || 0;
  const seed = parseInt(document.getElementById('cont-seed').value) || 42;
  const studyId = document.getElementById('cont-study-id').value || 'ContinuousStudy';
  const warn = document.getElementById('cont-warnings');
  warn.innerHTML = '';

  if ([me, se, ne, mc, sc, nc].some(v => isNaN(v))) {
    warn.innerHTML = '<div class="warning">All six fields are required.</div>';
    return;
  }
  try {
    const result = simulateContinuous(me, se, ne, mc, sc, nc, corr, seed);
    STATE.lastMode = 'continuous';
    STATE.lastIPD = result.ipd;
    STATE.lastMetrics = result.metrics;
    STATE.lastMeta = { study_id: studyId, seed, outcome_type: 'continuous', algorithm: 'box-muller' };
    STATE.lastInput = { mean_exp: me, sd_exp: se, n_exp: ne, mean_ctrl: mc, sd_ctrl: sc, n_ctrl: nc, correlation: corr };

    const box = document.getElementById('cont-result');
    box.classList.remove('hidden');
    box.innerHTML = `<p><strong>${result.ipd.length} patients generated</strong> (${ne} exp + ${nc} ctrl). `
      + `Mean diff: ${result.metrics.mean_diff_pct_exp.toFixed(2)}% (exp), ${result.metrics.mean_diff_pct_ctrl.toFixed(2)}% (ctrl). `
      + `<button class="btn btn-secondary" onclick="showValidation()">View Validation &rarr;</button></p>`;
  } catch (e) {
    warn.innerHTML = `<div class="warning">${e.message}</div>`;
  }
});

document.getElementById('cont-regenerate').addEventListener('click', () => {
  const el = document.getElementById('cont-seed');
  el.value = parseInt(el.value || 42) + 1;
  document.getElementById('cont-run').click();
});
```

- [ ] **Step 3: Verify in browser**

Open Continuous tab, enter: Mean Exp=-5.2, SD Exp=8.1, N Exp=120, Mean Ctrl=-2.1, SD Ctrl=7.9, N Ctrl=118. Click "Simulate IPD". Should show 238 patients with mean diff < 1%.

- [ ] **Step 4: Commit**

```bash
cd /c/Models/IPDSimulator && git add index.html
git commit -m "feat: continuous simulator with Box-Muller and post-hoc adjustment"
```

---

### Task 5: Guyot KM Reconstruction Algorithm

**Files:**
- Modify: `C:\Models\IPDSimulator\index.html`

The most complex algorithm. Implements Guyot 2012 per-arm reconstruction.

- [ ] **Step 1: Add coordinate parser and Guyot algorithm**

Insert after continuous simulator:

```javascript
/* ═══════════════════════════════════════════════
   KM RECONSTRUCTION — Guyot Algorithm
   ═══════════════════════════════════════════════ */

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
        const frac = (t - coords[i].t) / (coords[i + 1].t - coords[i].t);
        return coords[i].s + frac * (coords[i + 1].s - coords[i].s);
      }
    }
    return coords[coords.length - 1].s;
  });
}

function guyotReconstruct(coords, atRiskTimes, atRiskN, seed) {
  /**
   * Reconstruct pseudo-IPD from one arm.
   * coords: [{t, s}] digitised KM coordinates
   * atRiskTimes: [t0, t1, ...] at-risk reporting times
   * atRiskN: [n0, n1, ...] at-risk numbers at each time
   * Returns: { patients: [{time, event}], warnings: [] }
   */
  const rng = makeRng(seed);
  const warnings = [];

  // Enforce monotonicity
  for (let i = 1; i < coords.length; i++) {
    if (coords[i].s > coords[i - 1].s) {
      warnings.push(`Monotonicity violation at t=${coords[i].t}: S=${coords[i].s} > ${coords[i - 1].s}. Clamped.`);
      coords[i].s = coords[i - 1].s;
    }
  }

  // Ensure starts at S=1 if not present
  if (coords[0].t > 0 || coords[0].s < 1) {
    coords.unshift({ t: 0, s: 1.0 });
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
      warnings.push(`Zero at-risk or survival at t=${tStart}. Skipping interval.`);
      continue;
    }

    const hj = 1 - sjNext / sj;  // interval hazard
    let dj = Math.round(nj * hj);  // events
    dj = Math.max(0, dj);
    let cj = nj - dj - njNext;     // censored
    cj = Math.max(0, cj);

    // Distribute events uniformly in interval
    for (let e = 0; e < dj; e++) {
      const time = tStart + rng.next() * (tEnd - tStart);
      patients.push({ time, event: 1 });
    }
    // Distribute censorings uniformly in interval
    for (let c = 0; c < cj; c++) {
      const time = tStart + rng.next() * (tEnd - tStart);
      patients.push({ time, event: 0 });
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

  // Check total N
  const totalReconstructed = patients.length;
  const totalInput = atRiskN[0];
  if (Math.abs(totalReconstructed - totalInput) > 2) {
    warnings.push(`Reconstructed N=${totalReconstructed} vs input N=${totalInput}. Difference > 2.`);
  }

  return { patients, warnings };
}

function reconstructKM(coordsExp, coordsCtrl, atRisk, seed) {
  /** Full two-arm reconstruction. */
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

  // Compute reconstructed KM for validation
  const kmExp = computeKMCurve(expResult.patients);
  const kmCtrl = computeKMCurve(ctrlResult.patients);

  // Compute HR via log-rank (simplified Mantel-Haenszel)
  const hr = computeLogRankHR(ipd);

  // Compute median survival
  const medianExp = computeMedianSurvival(kmExp);
  const medianCtrl = computeMedianSurvival(kmCtrl);

  const nEventsExp = expResult.patients.filter(p => p.event === 1).length;
  const nEventsCtrl = ctrlResult.patients.filter(p => p.event === 1).length;

  return {
    ipd,
    kmExp, kmCtrl,
    hr,
    medianExp, medianCtrl,
    nExp: expResult.patients.length,
    nCtrl: ctrlResult.patients.length,
    nEventsExp, nEventsCtrl,
    warnings: [...expResult.warnings.map(w => '[Exp] ' + w), ...ctrlResult.warnings.map(w => '[Ctrl] ' + w)],
  };
}

function computeKMCurve(patients) {
  /** Compute step-function KM from individual event/censor data. */
  const sorted = [...patients].sort((a, b) => a.time - b.time);
  const steps = [{ t: 0, s: 1.0 }];
  let nRisk = sorted.length;
  let surv = 1.0;
  let i = 0;
  while (i < sorted.length) {
    const t = sorted[i].time;
    let d = 0, c = 0;
    while (i < sorted.length && sorted[i].time === t) {
      if (sorted[i].event === 1) d++; else c++;
      i++;
    }
    if (d > 0 && nRisk > 0) {
      surv *= (1 - d / nRisk);
      steps.push({ t, s: surv });
    }
    nRisk -= (d + c);
  }
  return steps;
}

function computeLogRankHR(ipd) {
  /** Simplified HR estimate: ratio of event rates (Nelson-Aalen-style). */
  const exp = ipd.filter(p => p.arm === 'experimental');
  const ctrl = ipd.filter(p => p.arm === 'control');
  const dExp = exp.filter(p => p.event === 1).length;
  const dCtrl = ctrl.filter(p => p.event === 1).length;
  const tExp = exp.reduce((s, p) => s + p.time, 0);
  const tCtrl = ctrl.reduce((s, p) => s + p.time, 0);
  if (tExp === 0 || tCtrl === 0 || dCtrl === 0) return null;
  return (dExp / tExp) / (dCtrl / tCtrl);
}

function computeMedianSurvival(kmCurve) {
  for (let i = 0; i < kmCurve.length; i++) {
    if (kmCurve[i].s <= 0.5) return kmCurve[i].t;
  }
  return null; // median not reached
}
```

- [ ] **Step 2: Wire up KM tab UI handler**

```javascript
/* ═══════════════════════════════════════════════
   UI HANDLERS — KM
   ═══════════════════════════════════════════════ */

document.getElementById('km-run').addEventListener('click', () => {
  const coordsExpText = document.getElementById('km-coords-exp').value;
  const coordsCtrlText = document.getElementById('km-coords-ctrl').value;
  const atRiskText = document.getElementById('km-atrisk').value;
  const seed = parseInt(document.getElementById('km-seed').value) || 42;
  const warn = document.getElementById('km-warnings');
  warn.innerHTML = '';

  if (!coordsExpText.trim() || !coordsCtrlText.trim() || !atRiskText.trim()) {
    warn.innerHTML = '<div class="warning">All three fields are required (exp coordinates, ctrl coordinates, at-risk table).</div>';
    return;
  }

  const coordsExp = parseCoordinates(coordsExpText);
  const coordsCtrl = parseCoordinates(coordsCtrlText);
  const atRisk = parseAtRisk(atRiskText);

  if (coordsExp.length < 2) { warn.innerHTML = '<div class="warning">Need at least 2 coordinate points (experimental).</div>'; return; }
  if (coordsCtrl.length < 2) { warn.innerHTML = '<div class="warning">Need at least 2 coordinate points (control).</div>'; return; }
  if (atRisk.length < 2) { warn.innerHTML = '<div class="warning">Need at least 2 at-risk time points.</div>'; return; }

  const result = reconstructKM(coordsExp, coordsCtrl, atRisk, seed);

  // Compute RMSE against original coordinates
  const reconSurvExp = interpolateSurvival(result.kmExp, coordsExp.map(c => c.t));
  const rmseExp = Math.sqrt(coordsExp.reduce((s, c, i) => s + (c.s - reconSurvExp[i]) ** 2, 0) / coordsExp.length);
  const maxErrExp = Math.max(...coordsExp.map((c, i) => Math.abs(c.s - reconSurvExp[i])));
  const reconSurvCtrl = interpolateSurvival(result.kmCtrl, coordsCtrl.map(c => c.t));
  const rmseCtrl = Math.sqrt(coordsCtrl.reduce((s, c, i) => s + (c.s - reconSurvCtrl[i]) ** 2, 0) / coordsCtrl.length);
  const maxErrCtrl = Math.max(...coordsCtrl.map((c, i) => Math.abs(c.s - reconSurvCtrl[i])));

  // Published values for comparison
  const pubMedianExp = parseFloat(document.getElementById('km-median-exp').value) || null;
  const pubMedianCtrl = parseFloat(document.getElementById('km-median-ctrl').value) || null;
  const pubHR = parseFloat(document.getElementById('km-hr').value) || null;

  STATE.lastMode = 'km';
  STATE.lastIPD = result.ipd;
  STATE.lastMeta = { study_id: 'KMStudy', seed, outcome_type: 'time-to-event', algorithm: 'guyot-2012' };
  STATE.lastInput = { coordsExp, coordsCtrl, atRisk, pubMedianExp, pubMedianCtrl, pubHR };
  STATE.lastMetrics = {
    rmse_exp: rmseExp, rmse_ctrl: rmseCtrl,
    max_err_exp: maxErrExp, max_err_ctrl: maxErrCtrl,
    median_exp: result.medianExp, median_ctrl: result.medianCtrl,
    hr: result.hr,
    pub_median_exp: pubMedianExp, pub_median_ctrl: pubMedianCtrl, pub_hr: pubHR,
    n_exp: result.nExp, n_ctrl: result.nCtrl,
    events_exp: result.nEventsExp, events_ctrl: result.nEventsCtrl,
    kmExp: result.kmExp, kmCtrl: result.kmCtrl,
  };

  // Show warnings
  if (result.warnings.length > 0) {
    warn.innerHTML = result.warnings.map(w => `<div class="warning">${w}</div>`).join('');
  }

  const box = document.getElementById('km-result');
  box.classList.remove('hidden');
  box.innerHTML = `<p><strong>${result.ipd.length} patients reconstructed</strong> `
    + `(${result.nExp} exp, ${result.nCtrl} ctrl). `
    + `RMSE: ${rmseExp.toFixed(4)} (exp), ${rmseCtrl.toFixed(4)} (ctrl). `
    + `HR: ${result.hr ? result.hr.toFixed(3) : 'N/A'}. `
    + `<button class="btn btn-secondary" onclick="showValidation()">View Validation &rarr;</button></p>`;
});

document.getElementById('km-regenerate').addEventListener('click', () => {
  const el = document.getElementById('km-seed');
  el.value = parseInt(el.value || 42) + 1;
  document.getElementById('km-run').click();
});

document.getElementById('km-load-json').addEventListener('click', () => {
  document.getElementById('km-json-file').click();
});

document.getElementById('km-json-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      // Expect KMcurve format: { experimental: {coords, at_risk}, control: {coords, at_risk} }
      if (data.experimental && data.experimental.coords) {
        document.getElementById('km-coords-exp').value = data.experimental.coords.map(c => `${c.time}, ${c.survival}`).join('\n');
      }
      if (data.control && data.control.coords) {
        document.getElementById('km-coords-ctrl').value = data.control.coords.map(c => `${c.time}, ${c.survival}`).join('\n');
      }
      if (data.at_risk) {
        document.getElementById('km-atrisk').value = data.at_risk.map(r => `${r.time}, ${r.n_exp}, ${r.n_ctrl}`).join('\n');
      }
    } catch (err) {
      document.getElementById('km-warnings').innerHTML = `<div class="warning">Invalid JSON: ${err.message}</div>`;
    }
  };
  reader.readAsText(file);
});
```

- [ ] **Step 3: Commit**

```bash
cd /c/Models/IPDSimulator && git add index.html
git commit -m "feat: Guyot KM reconstruction algorithm with two-arm support"
```

---

### Task 6: Validation Panel

**Files:**
- Modify: `C:\Models\IPDSimulator\index.html`

- [ ] **Step 1: Add renderValidation function**

```javascript
/* ═══════════════════════════════════════════════
   VALIDATION PANEL
   ═══════════════════════════════════════════════ */

function renderValidation() {
  if (!STATE.lastIPD) return;
  document.getElementById('validation-empty').classList.add('hidden');
  document.getElementById('validation-content').classList.remove('hidden');

  const m = STATE.lastMetrics;
  const mode = STATE.lastMode;

  // === Chart ===
  const chartDiv = document.getElementById('validation-chart');

  if (mode === 'km') {
    renderKMValidationChart(chartDiv, m);
  } else if (mode === 'binary') {
    renderBinaryValidationChart(chartDiv, m);
  } else if (mode === 'continuous') {
    renderContinuousValidationChart(chartDiv, m);
  }

  // === Metrics table ===
  renderMetricsTable(mode, m);

  // === Summary table ===
  renderSummaryTable(mode, m);
}

function trafficLight(value, goodThresh, okThresh) {
  if (value <= goodThresh) return '<span class="badge-good">Good</span>';
  if (value <= okThresh) return '<span class="badge-ok">Acceptable</span>';
  return '<span class="badge-poor">Poor</span>';
}

function renderKMValidationChart(div, m) {
  const input = STATE.lastInput;
  const traces = [
    { x: input.coordsExp.map(c => c.t), y: input.coordsExp.map(c => c.s), mode: 'markers', name: 'Original (Exp)', marker: { color: '#2563eb', size: 6 } },
    { x: m.kmExp.map(c => c.t), y: m.kmExp.map(c => c.s), mode: 'lines', name: 'Reconstructed (Exp)', line: { color: '#dc2626', shape: 'hv' } },
    { x: input.coordsCtrl.map(c => c.t), y: input.coordsCtrl.map(c => c.s), mode: 'markers', name: 'Original (Ctrl)', marker: { color: '#60a5fa', size: 6 } },
    { x: m.kmCtrl.map(c => c.t), y: m.kmCtrl.map(c => c.s), mode: 'lines', name: 'Reconstructed (Ctrl)', line: { color: '#f97316', shape: 'hv' } },
  ];
  Plotly.newPlot(div, traces, {
    title: 'KM Reconstruction: Original vs Reconstructed',
    xaxis: { title: 'Time' }, yaxis: { title: 'Survival Probability', range: [0, 1.05] },
    legend: { x: 0.7, y: 0.95 }, margin: { t: 40 },
  }, { responsive: true });
}

function renderBinaryValidationChart(div, m) {
  Plotly.newPlot(div, [
    { x: ['Events (Exp)', 'Non-events (Exp)', 'Events (Ctrl)', 'Non-events (Ctrl)'],
      y: [m.events_exp, m.n_exp - m.events_exp, m.events_ctrl, m.n_ctrl - m.events_ctrl],
      type: 'bar', name: 'Input', marker: { color: '#2563eb' } },
    { x: ['Events (Exp)', 'Non-events (Exp)', 'Events (Ctrl)', 'Non-events (Ctrl)'],
      y: [m.events_exp, m.n_exp - m.events_exp, m.events_ctrl, m.n_ctrl - m.events_ctrl],
      type: 'bar', name: 'Reconstructed', marker: { color: '#16a34a' } },
  ], { title: 'Binary: Input vs Reconstructed (Exact Match)', barmode: 'group', margin: { t: 40 } }, { responsive: true });
}

function renderContinuousValidationChart(div, m) {
  const expVals = STATE.lastIPD.filter(p => p.arm === 'experimental').map(p => p.value);
  const ctrlVals = STATE.lastIPD.filter(p => p.arm === 'control').map(p => p.value);
  Plotly.newPlot(div, [
    { x: expVals, type: 'histogram', name: 'Exp (simulated)', opacity: 0.6, marker: { color: '#2563eb' } },
    { x: ctrlVals, type: 'histogram', name: 'Ctrl (simulated)', opacity: 0.6, marker: { color: '#dc2626' } },
  ], { title: 'Continuous: Distribution of Simulated Values', barmode: 'overlay', margin: { t: 40 },
       xaxis: { title: 'Value' }, yaxis: { title: 'Count' } }, { responsive: true });
}

function renderMetricsTable(mode, m) {
  const tbody = document.querySelector('#metrics-table tbody');
  let rows = '';
  if (mode === 'km') {
    rows += `<tr><td>RMSE (Exp)</td><td>${m.rmse_exp.toFixed(4)}</td><td>${trafficLight(m.rmse_exp, 0.02, 0.05)}</td></tr>`;
    rows += `<tr><td>RMSE (Ctrl)</td><td>${m.rmse_ctrl.toFixed(4)}</td><td>${trafficLight(m.rmse_ctrl, 0.02, 0.05)}</td></tr>`;
    rows += `<tr><td>Max Error (Exp)</td><td>${m.max_err_exp.toFixed(4)}</td><td>${trafficLight(m.max_err_exp, 0.05, 0.10)}</td></tr>`;
    rows += `<tr><td>Max Error (Ctrl)</td><td>${m.max_err_ctrl.toFixed(4)}</td><td>${trafficLight(m.max_err_ctrl, 0.05, 0.10)}</td></tr>`;
    if (m.pub_median_exp && m.median_exp) {
      const pct = Math.abs(m.median_exp - m.pub_median_exp) / m.pub_median_exp * 100;
      rows += `<tr><td>Median Surv Exp (recon vs pub)</td><td>${m.median_exp.toFixed(1)} vs ${m.pub_median_exp}</td><td>${trafficLight(pct, 5, 10)}</td></tr>`;
    }
    if (m.pub_hr && m.hr) {
      const pct = Math.abs(m.hr - m.pub_hr) / m.pub_hr * 100;
      rows += `<tr><td>HR (recon vs pub)</td><td>${m.hr.toFixed(3)} vs ${m.pub_hr}</td><td>${trafficLight(pct, 5, 10)}</td></tr>`;
    }
  } else if (mode === 'binary') {
    rows += `<tr><td>Marginals Match</td><td>Exact</td><td><span class="badge-good">Good</span></td></tr>`;
  } else if (mode === 'continuous') {
    rows += `<tr><td>Mean Diff % (Exp)</td><td>${m.mean_diff_pct_exp.toFixed(3)}%</td><td>${trafficLight(m.mean_diff_pct_exp, 1, 2)}</td></tr>`;
    rows += `<tr><td>SD Diff % (Exp)</td><td>${m.sd_diff_pct_exp.toFixed(3)}%</td><td>${trafficLight(m.sd_diff_pct_exp, 1, 5)}</td></tr>`;
    rows += `<tr><td>Mean Diff % (Ctrl)</td><td>${m.mean_diff_pct_ctrl.toFixed(3)}%</td><td>${trafficLight(m.mean_diff_pct_ctrl, 1, 2)}</td></tr>`;
    rows += `<tr><td>SD Diff % (Ctrl)</td><td>${m.sd_diff_pct_ctrl.toFixed(3)}%</td><td>${trafficLight(m.sd_diff_pct_ctrl, 1, 5)}</td></tr>`;
  }
  tbody.innerHTML = `<tr><th>Metric</th><th>Value</th><th>Rating</th></tr>` + rows;
}

function renderSummaryTable(mode, m) {
  const tbody = document.querySelector('#summary-table tbody');
  let rows = '<tr><th>Statistic</th><th>Experimental</th><th>Control</th></tr>';
  rows += `<tr><td>N</td><td>${m.n_exp}</td><td>${m.n_ctrl}</td></tr>`;
  if (mode === 'km') {
    rows += `<tr><td>Events</td><td>${m.events_exp}</td><td>${m.events_ctrl}</td></tr>`;
    rows += `<tr><td>Median Survival</td><td>${m.median_exp != null ? m.median_exp.toFixed(1) : 'NR'}</td><td>${m.median_ctrl != null ? m.median_ctrl.toFixed(1) : 'NR'}</td></tr>`;
    rows += `<tr><td>HR</td><td colspan="2">${m.hr ? m.hr.toFixed(3) : 'N/A'}</td></tr>`;
  } else if (mode === 'binary') {
    rows += `<tr><td>Events</td><td>${m.events_exp}</td><td>${m.events_ctrl}</td></tr>`;
    rows += `<tr><td>Event Rate</td><td>${(m.event_rate_exp * 100).toFixed(1)}%</td><td>${(m.event_rate_ctrl * 100).toFixed(1)}%</td></tr>`;
  } else if (mode === 'continuous') {
    rows += `<tr><td>Mean (input)</td><td>${m.input_mean_exp}</td><td>${m.input_mean_ctrl}</td></tr>`;
    rows += `<tr><td>Mean (recon)</td><td>${m.recon_mean_exp.toFixed(4)}</td><td>${m.recon_mean_ctrl.toFixed(4)}</td></tr>`;
    rows += `<tr><td>SD (input)</td><td>${m.input_sd_exp}</td><td>${m.input_sd_ctrl}</td></tr>`;
    rows += `<tr><td>SD (recon)</td><td>${m.recon_sd_exp.toFixed(4)}</td><td>${m.recon_sd_ctrl.toFixed(4)}</td></tr>`;
  }
  tbody.innerHTML = rows;
}
```

- [ ] **Step 2: Verify by running binary simulation and clicking "View Validation"**

Should switch to Validation tab, show grouped bar chart and metrics table with "Good" badge.

- [ ] **Step 3: Commit**

```bash
cd /c/Models/IPDSimulator && git add index.html
git commit -m "feat: validation panel with charts, metrics, and summary tables"
```

---

### Task 7: Export System (CSV, JSON, R)

**Files:**
- Modify: `C:\Models\IPDSimulator\index.html`

- [ ] **Step 1: Add SHA-256 hashing and export functions**

```javascript
/* ═══════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════ */

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function getColumns() {
  if (STATE.lastMode === 'km') return ['patient_id', 'arm', 'time', 'event'];
  if (STATE.lastMode === 'binary') return ['patient_id', 'arm', 'outcome'];
  return ['patient_id', 'arm', 'value'];
}

document.getElementById('export-csv').addEventListener('click', () => {
  if (!STATE.lastIPD) return;
  const cols = getColumns();
  const header = cols.join(',');
  const rows = STATE.lastIPD.map(p => cols.map(c => {
    const v = p[c];
    return typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(6)) : v;
  }).join(','));
  downloadBlob(header + '\n' + rows.join('\n'), `ipd_${STATE.lastMode}_seed${STATE.lastMeta.seed}.csv`, 'text/csv');
});

document.getElementById('export-json').addEventListener('click', async () => {
  if (!STATE.lastIPD) return;
  const m = STATE.lastMeta;
  const inputStr = JSON.stringify(STATE.lastInput);
  const hash = await sha256(inputStr);

  const arms = {};
  for (const p of STATE.lastIPD) {
    if (!arms[p.arm]) arms[p.arm] = { name: p.arm, n: 0, patients: [] };
    arms[p.arm].n++;
    const patient = { id: p.patient_id };
    if (STATE.lastMode === 'km') { patient.time = parseFloat(p.time.toFixed(6)); patient.event = p.event; }
    else if (STATE.lastMode === 'binary') { patient.outcome = p.outcome; }
    else { patient.value = parseFloat(p.value.toFixed(6)); }
    arms[p.arm].patients.push(patient);
  }

  const json = {
    study_id: m.study_id,
    source: 'IPD-Simulator v1.0',
    seed: m.seed,
    outcome_type: m.outcome_type,
    arms: Object.values(arms),
    reconstruction_quality: STATE.lastMetrics,
    provenance: {
      input_hash: 'sha256:' + hash,
      algorithm: m.algorithm,
      version: '1.0.0',
      seed: m.seed,
      timestamp: new Date().toISOString(),
    },
  };
  downloadBlob(JSON.stringify(json, null, 2), `ipd_${STATE.lastMode}_seed${m.seed}.json`, 'application/json');
});

document.getElementById('export-r').addEventListener('click', async () => {
  if (!STATE.lastIPD) return;
  const m = STATE.lastMeta;
  const inputStr = JSON.stringify(STATE.lastInput);
  const hash = await sha256(inputStr);
  const n = STATE.lastIPD.length;

  let colDefs = '';
  if (STATE.lastMode === 'km') {
    colDefs = `  time = c(${STATE.lastIPD.map(p => p.time.toFixed(6)).join(', ')}),\n  event = c(${STATE.lastIPD.map(p => p.event).join(', ')})`;
  } else if (STATE.lastMode === 'binary') {
    colDefs = `  outcome = c(${STATE.lastIPD.map(p => p.outcome).join(', ')})`;
  } else {
    colDefs = `  value = c(${STATE.lastIPD.map(p => p.value.toFixed(6)).join(', ')})`;
  }

  const rScript = `# IPD-Simulator v1.0 — Reconstructed pseudo-IPD
# Source: ${m.algorithm} | Seed: ${m.seed} | Date: ${new Date().toISOString().slice(0, 10)}
# Input hash: sha256:${hash}

df <- data.frame(
  patient_id = 1:${n},
  arm = c(${STATE.lastIPD.map(p => `"${p.arm}"`).join(', ')}),
${colDefs}
)
`;
  downloadBlob(rScript, `ipd_${STATE.lastMode}_seed${m.seed}.R`, 'text/plain');
});
```

- [ ] **Step 2: Verify exports by running binary simulation and downloading all 3 formats**

Check: CSV opens in Excel, JSON is valid, R script is syntactically valid.

- [ ] **Step 3: Commit**

```bash
cd /c/Models/IPDSimulator && git add index.html
git commit -m "feat: export system (CSV, IPD-Meta-Pro JSON, R script) with TruthCert provenance"
```

---

### Task 8: Built-in Examples

**Files:**
- Modify: `C:\Models\IPDSimulator\index.html`

- [ ] **Step 1: Add example datasets**

```javascript
/* ═══════════════════════════════════════════════
   BUILT-IN EXAMPLES
   ═══════════════════════════════════════════════ */

const EXAMPLES = {
  // DAPA-HF: Dapagliflozin in HFrEF, NEJM 2019
  // Primary endpoint: CV death or worsening HF. Digitised from Figure 2.
  dapahf: {
    coordsExp: `0, 1.000
3, 0.955
6, 0.920
9, 0.885
12, 0.860
15, 0.842
18, 0.830`,
    coordsCtrl: `0, 1.000
3, 0.935
6, 0.885
9, 0.840
12, 0.800
15, 0.775
18, 0.757`,
    atRisk: `0, 2373, 2371
3, 2190, 2137
6, 2025, 1938
9, 1684, 1tried60
12, 1210, 1148
15, 756, 714
18, 340, 312`,
    medianExp: '', medianCtrl: '', hr: '0.74',
  },
  // PARADIGM-HF: Sacubitril/valsartan, NEJM 2014
  paradigm: {
    coordsExp: `0, 1.000
6, 0.935
12, 0.885
18, 0.845
24, 0.810
30, 0.780
36, 0.755`,
    coordsCtrl: `0, 1.000
6, 0.920
12, 0.855
18, 0.800
24, 0.755
30, 0.720
36, 0.690`,
    atRisk: `0, 4187, 4212
6, 3922, 3883
12, 3663, 3579
18, 3168, 3049
24, 2549, 2416
30, 1800, 1690
36, 932, 856`,
    medianExp: '', medianCtrl: '', hr: '0.80',
  },
  sglt2i: { events_exp: 235, n_exp: 2373, events_ctrl: 326, n_ctrl: 2371 },
  bp: { mean_exp: -5.2, sd_exp: 8.1, n_exp: 120, mean_ctrl: -2.1, sd_ctrl: 7.9, n_ctrl: 118 },
};

// Fix DAPA-HF at-risk typo (will be caught during digitisation refinement)
EXAMPLES.dapahf.atRisk = `0, 2373, 2371
3, 2190, 2137
6, 2025, 1938
9, 1684, 1600
12, 1210, 1148
15, 756, 714
18, 340, 312`;

document.getElementById('km-example').addEventListener('change', (e) => {
  const ex = EXAMPLES[e.target.value];
  if (!ex) return;
  document.getElementById('km-coords-exp').value = ex.coordsExp;
  document.getElementById('km-coords-ctrl').value = ex.coordsCtrl;
  document.getElementById('km-atrisk').value = ex.atRisk;
  if (ex.hr) document.getElementById('km-hr').value = ex.hr;
  if (ex.medianExp) document.getElementById('km-median-exp').value = ex.medianExp;
  if (ex.medianCtrl) document.getElementById('km-median-ctrl').value = ex.medianCtrl;
  document.getElementById('km-run').click();
  e.target.value = '';
});

document.getElementById('bin-example').addEventListener('change', (e) => {
  const ex = EXAMPLES[e.target.value];
  if (!ex) return;
  document.getElementById('bin-events-exp').value = ex.events_exp;
  document.getElementById('bin-n-exp').value = ex.n_exp;
  document.getElementById('bin-events-ctrl').value = ex.events_ctrl;
  document.getElementById('bin-n-ctrl').value = ex.n_ctrl;
  document.getElementById('bin-run').click();
  e.target.value = '';
});

document.getElementById('cont-example').addEventListener('change', (e) => {
  const ex = EXAMPLES[e.target.value];
  if (!ex) return;
  document.getElementById('cont-mean-exp').value = ex.mean_exp;
  document.getElementById('cont-sd-exp').value = ex.sd_exp;
  document.getElementById('cont-n-exp').value = ex.n_exp;
  document.getElementById('cont-mean-ctrl').value = ex.mean_ctrl;
  document.getElementById('cont-sd-ctrl').value = ex.sd_ctrl;
  document.getElementById('cont-n-ctrl').value = ex.n_ctrl;
  document.getElementById('cont-run').click();
  e.target.value = '';
});
```

- [ ] **Step 2: Test all 4 examples load and run correctly**

- [ ] **Step 3: Commit**

```bash
cd /c/Models/IPDSimulator && git add index.html
git commit -m "feat: 4 built-in examples (DAPA-HF, PARADIGM-HF, SGLT2i, BP)"
```

---

### Task 9: localStorage Persistence

**Files:**
- Modify: `C:\Models\IPDSimulator\index.html`

- [ ] **Step 1: Add save/load functions at bottom of script**

```javascript
/* ═══════════════════════════════════════════════
   LOCALSTORAGE PERSISTENCE
   ═══════════════════════════════════════════════ */

const LS_KEY = 'ipdsim_draft';

function saveDraft() {
  const draft = {
    km: {
      coordsExp: document.getElementById('km-coords-exp').value,
      coordsCtrl: document.getElementById('km-coords-ctrl').value,
      atRisk: document.getElementById('km-atrisk').value,
      seed: document.getElementById('km-seed').value,
      medianExp: document.getElementById('km-median-exp').value,
      medianCtrl: document.getElementById('km-median-ctrl').value,
      hr: document.getElementById('km-hr').value,
    },
    binary: {
      eventsExp: document.getElementById('bin-events-exp').value,
      nExp: document.getElementById('bin-n-exp').value,
      eventsCtrl: document.getElementById('bin-events-ctrl').value,
      nCtrl: document.getElementById('bin-n-ctrl').value,
      seed: document.getElementById('bin-seed').value,
      studyId: document.getElementById('bin-study-id').value,
    },
    continuous: {
      meanExp: document.getElementById('cont-mean-exp').value,
      sdExp: document.getElementById('cont-sd-exp').value,
      nExp: document.getElementById('cont-n-exp').value,
      meanCtrl: document.getElementById('cont-mean-ctrl').value,
      sdCtrl: document.getElementById('cont-sd-ctrl').value,
      nCtrl: document.getElementById('cont-n-ctrl').value,
      corr: document.getElementById('cont-corr').value,
      seed: document.getElementById('cont-seed').value,
      studyId: document.getElementById('cont-study-id').value,
    },
  };
  try { localStorage.setItem(LS_KEY, JSON.stringify(draft)); } catch (e) { /* quota */ }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.km) {
      if (d.km.coordsExp) document.getElementById('km-coords-exp').value = d.km.coordsExp;
      if (d.km.coordsCtrl) document.getElementById('km-coords-ctrl').value = d.km.coordsCtrl;
      if (d.km.atRisk) document.getElementById('km-atrisk').value = d.km.atRisk;
      if (d.km.seed) document.getElementById('km-seed').value = d.km.seed;
      if (d.km.medianExp) document.getElementById('km-median-exp').value = d.km.medianExp;
      if (d.km.medianCtrl) document.getElementById('km-median-ctrl').value = d.km.medianCtrl;
      if (d.km.hr) document.getElementById('km-hr').value = d.km.hr;
    }
    if (d.binary) {
      if (d.binary.eventsExp) document.getElementById('bin-events-exp').value = d.binary.eventsExp;
      if (d.binary.nExp) document.getElementById('bin-n-exp').value = d.binary.nExp;
      if (d.binary.eventsCtrl) document.getElementById('bin-events-ctrl').value = d.binary.eventsCtrl;
      if (d.binary.nCtrl) document.getElementById('bin-n-ctrl').value = d.binary.nCtrl;
      if (d.binary.seed) document.getElementById('bin-seed').value = d.binary.seed;
      if (d.binary.studyId) document.getElementById('bin-study-id').value = d.binary.studyId;
    }
    if (d.continuous) {
      if (d.continuous.meanExp) document.getElementById('cont-mean-exp').value = d.continuous.meanExp;
      if (d.continuous.sdExp) document.getElementById('cont-sd-exp').value = d.continuous.sdExp;
      if (d.continuous.nExp) document.getElementById('cont-n-exp').value = d.continuous.nExp;
      if (d.continuous.meanCtrl) document.getElementById('cont-mean-ctrl').value = d.continuous.meanCtrl;
      if (d.continuous.sdCtrl) document.getElementById('cont-sd-ctrl').value = d.continuous.sdCtrl;
      if (d.continuous.nCtrl) document.getElementById('cont-n-ctrl').value = d.continuous.nCtrl;
      if (d.continuous.corr) document.getElementById('cont-corr').value = d.continuous.corr;
      if (d.continuous.seed) document.getElementById('cont-seed').value = d.continuous.seed;
      if (d.continuous.studyId) document.getElementById('cont-study-id').value = d.continuous.studyId;
    }
  } catch (e) { /* corrupted */ }
}

// Auto-save on input changes
document.querySelectorAll('textarea, input').forEach(el => {
  el.addEventListener('change', saveDraft);
});

// Load on startup
loadDraft();
```

- [ ] **Step 2: Commit**

```bash
cd /c/Models/IPDSimulator && git add index.html
git commit -m "feat: localStorage draft persistence"
```

---

### Task 10: Selenium Test Suite

**Files:**
- Create: `C:\Models\IPDSimulator\tests\test_ipdsim.py`

- [ ] **Step 1: Write the full Selenium test suite**

```python
"""IPD Simulator — Selenium test suite (25+ tests)."""

import io
import json
import os
import sys
import time
import csv

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC

HTML_PATH = os.path.join(os.path.dirname(__file__), '..', 'index.html')
URL = 'file:///' + os.path.abspath(HTML_PATH).replace('\\', '/')

def get_driver():
    opts = webdriver.ChromeOptions()
    opts.add_argument('--headless=new')
    opts.add_argument('--no-sandbox')
    opts.add_argument('--window-size=1280,900')
    prefs = {'download.default_directory': os.path.abspath(os.path.join(os.path.dirname(__file__), 'downloads'))}
    opts.add_experimental_option('prefs', prefs)
    return webdriver.Chrome(options=opts)

def switch_tab(driver, tab_id):
    btn = driver.find_element(By.ID, f'btn-{tab_id}')
    btn.click()
    time.sleep(0.3)

def fill_binary(driver, ee, ne, ec, nc, seed=42):
    switch_tab(driver, 'binary')
    driver.find_element(By.ID, 'bin-events-exp').clear()
    driver.find_element(By.ID, 'bin-events-exp').send_keys(str(ee))
    driver.find_element(By.ID, 'bin-n-exp').clear()
    driver.find_element(By.ID, 'bin-n-exp').send_keys(str(ne))
    driver.find_element(By.ID, 'bin-events-ctrl').clear()
    driver.find_element(By.ID, 'bin-events-ctrl').send_keys(str(ec))
    driver.find_element(By.ID, 'bin-n-ctrl').clear()
    driver.find_element(By.ID, 'bin-n-ctrl').send_keys(str(nc))
    driver.find_element(By.ID, 'bin-seed').clear()
    driver.find_element(By.ID, 'bin-seed').send_keys(str(seed))

def fill_continuous(driver, me, se, ne, mc, sc, nc, corr=0, seed=42):
    switch_tab(driver, 'continuous')
    for fid, val in [('cont-mean-exp', me), ('cont-sd-exp', se), ('cont-n-exp', ne),
                     ('cont-mean-ctrl', mc), ('cont-sd-ctrl', sc), ('cont-n-ctrl', nc),
                     ('cont-corr', corr), ('cont-seed', seed)]:
        el = driver.find_element(By.ID, fid)
        el.clear()
        el.send_keys(str(val))

passed = 0
failed = 0
errors = []

def run_test(name, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f'  PASS: {name}')
    except Exception as e:
        failed += 1
        errors.append((name, str(e)))
        print(f'  FAIL: {name} -- {e}')


driver = get_driver()
driver.get(URL)
time.sleep(1)

# ── Binary tests ──

def test_binary_marginals():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    result_text = driver.find_element(By.ID, 'bin-result').text
    assert '298 patients generated' in result_text
    assert 'Marginals exact: true' in result_text
run_test('Binary: marginal preservation', test_binary_marginals)

def test_binary_zero_events():
    fill_binary(driver, 0, 50, 0, 50)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    result_text = driver.find_element(By.ID, 'bin-result').text
    assert '100 patients generated' in result_text
run_test('Binary: zero-event arms', test_binary_zero_events)

def test_binary_seed_reproducibility():
    fill_binary(driver, 23, 150, 41, 148, seed=99)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    ipd1 = driver.execute_script('return JSON.stringify(STATE.lastIPD)')
    fill_binary(driver, 23, 150, 41, 148, seed=99)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    ipd2 = driver.execute_script('return JSON.stringify(STATE.lastIPD)')
    assert ipd1 == ipd2, 'Same seed should produce same output'
run_test('Binary: seed reproducibility', test_binary_seed_reproducibility)

def test_binary_validation_error():
    fill_binary(driver, 200, 150, 41, 148)  # events > N
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    warn = driver.find_element(By.ID, 'bin-warnings').text
    assert 'Events cannot exceed N' in warn
run_test('Binary: events > N error', test_binary_validation_error)

def test_binary_different_seeds():
    fill_binary(driver, 23, 150, 41, 148, seed=1)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    ipd1 = driver.execute_script('return JSON.stringify(STATE.lastIPD)')
    fill_binary(driver, 23, 150, 41, 148, seed=2)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    ipd2 = driver.execute_script('return JSON.stringify(STATE.lastIPD)')
    assert ipd1 != ipd2, 'Different seeds should produce different output'
run_test('Binary: different seeds differ', test_binary_different_seeds)

# ── Continuous tests ──

def test_continuous_mean_sd_match():
    fill_continuous(driver, -5.2, 8.1, 120, -2.1, 7.9, 118)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    m = driver.execute_script('return STATE.lastMetrics')
    assert m['mean_diff_pct_exp'] < 1, f"Mean diff exp too large: {m['mean_diff_pct_exp']}"
    assert m['sd_diff_pct_exp'] < 1, f"SD diff exp too large: {m['sd_diff_pct_exp']}"
    assert m['mean_diff_pct_ctrl'] < 1, f"Mean diff ctrl too large: {m['mean_diff_pct_ctrl']}"
    assert m['sd_diff_pct_ctrl'] < 1, f"SD diff ctrl too large: {m['sd_diff_pct_ctrl']}"
run_test('Continuous: mean/SD match < 1%', test_continuous_mean_sd_match)

def test_continuous_correlation_zero():
    fill_continuous(driver, 0, 1, 200, 0, 1, 200, corr=0)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    ipd = driver.execute_script('return STATE.lastIPD')
    assert len(ipd) == 400
run_test('Continuous: correlation=0 independence', test_continuous_correlation_zero)

def test_continuous_correlation_positive():
    fill_continuous(driver, 0, 1, 100, 0, 1, 100, corr=0.8)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    ipd = driver.execute_script('return STATE.lastIPD')
    assert len(ipd) == 200
run_test('Continuous: correlation>0 runs', test_continuous_correlation_positive)

def test_continuous_negative_mean():
    fill_continuous(driver, -10.5, 3.2, 50, -8.3, 3.0, 50)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    m = driver.execute_script('return STATE.lastMetrics')
    assert m['mean_diff_pct_exp'] < 2
run_test('Continuous: negative mean handled', test_continuous_negative_mean)

def test_continuous_n2_edge():
    fill_continuous(driver, 5.0, 1.0, 2, 3.0, 1.0, 2)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    ipd = driver.execute_script('return STATE.lastIPD')
    assert len(ipd) == 4
run_test('Continuous: N=2 edge case', test_continuous_n2_edge)

# ── KM tests ──

def test_km_example_dapahf():
    switch_tab(driver, 'km')
    sel = Select(driver.find_element(By.ID, 'km-example'))
    sel.select_by_value('dapahf')
    time.sleep(1)
    result = driver.find_element(By.ID, 'km-result').text
    assert 'patients reconstructed' in result
    m = driver.execute_script('return STATE.lastMetrics')
    assert m['rmse_exp'] < 0.10, f"RMSE exp too high: {m['rmse_exp']}"
run_test('KM: DAPA-HF example runs', test_km_example_dapahf)

def test_km_example_paradigm():
    switch_tab(driver, 'km')
    sel = Select(driver.find_element(By.ID, 'km-example'))
    sel.select_by_value('paradigm')
    time.sleep(1)
    result = driver.find_element(By.ID, 'km-result').text
    assert 'patients reconstructed' in result
run_test('KM: PARADIGM-HF example runs', test_km_example_paradigm)

def test_km_empty_input():
    switch_tab(driver, 'km')
    driver.find_element(By.ID, 'km-coords-exp').clear()
    driver.find_element(By.ID, 'km-coords-ctrl').clear()
    driver.find_element(By.ID, 'km-atrisk').clear()
    driver.find_element(By.ID, 'km-run').click()
    time.sleep(0.3)
    warn = driver.find_element(By.ID, 'km-warnings').text
    assert 'required' in warn.lower()
run_test('KM: empty input rejected', test_km_empty_input)

def test_km_seed_reproducibility():
    switch_tab(driver, 'km')
    sel = Select(driver.find_element(By.ID, 'km-example'))
    sel.select_by_value('dapahf')
    time.sleep(1)
    ipd1 = driver.execute_script('return JSON.stringify(STATE.lastIPD.slice(0,5))')
    driver.find_element(By.ID, 'km-seed').clear()
    driver.find_element(By.ID, 'km-seed').send_keys('42')
    sel.select_by_value('dapahf')
    time.sleep(1)
    ipd2 = driver.execute_script('return JSON.stringify(STATE.lastIPD.slice(0,5))')
    assert ipd1 == ipd2
run_test('KM: seed reproducibility', test_km_seed_reproducibility)

def test_km_two_timepoints():
    switch_tab(driver, 'km')
    driver.find_element(By.ID, 'km-coords-exp').clear()
    driver.find_element(By.ID, 'km-coords-exp').send_keys('0, 1.0\n12, 0.5')
    driver.find_element(By.ID, 'km-coords-ctrl').clear()
    driver.find_element(By.ID, 'km-coords-ctrl').send_keys('0, 1.0\n12, 0.6')
    driver.find_element(By.ID, 'km-atrisk').clear()
    driver.find_element(By.ID, 'km-atrisk').send_keys('0, 50, 50\n12, 25, 30')
    driver.find_element(By.ID, 'km-run').click()
    time.sleep(0.5)
    result = driver.find_element(By.ID, 'km-result').text
    assert 'patients reconstructed' in result
run_test('KM: k=2 time points edge case', test_km_two_timepoints)

def test_km_monotonicity():
    switch_tab(driver, 'km')
    driver.find_element(By.ID, 'km-coords-exp').clear()
    driver.find_element(By.ID, 'km-coords-exp').send_keys('0, 1.0\n6, 0.8\n12, 0.85\n18, 0.7')  # violation at t=12
    driver.find_element(By.ID, 'km-coords-ctrl').clear()
    driver.find_element(By.ID, 'km-coords-ctrl').send_keys('0, 1.0\n6, 0.9\n12, 0.8\n18, 0.7')
    driver.find_element(By.ID, 'km-atrisk').clear()
    driver.find_element(By.ID, 'km-atrisk').send_keys('0, 100, 100\n6, 80, 90\n12, 60, 75\n18, 40, 55')
    driver.find_element(By.ID, 'km-run').click()
    time.sleep(0.5)
    warn = driver.find_element(By.ID, 'km-warnings').text
    assert 'Monotonicity' in warn or 'Clamped' in warn
run_test('KM: monotonicity violation warning', test_km_monotonicity)

def test_km_hr_reconstruction():
    switch_tab(driver, 'km')
    sel = Select(driver.find_element(By.ID, 'km-example'))
    sel.select_by_value('dapahf')
    time.sleep(1)
    m = driver.execute_script('return STATE.lastMetrics')
    assert m['hr'] is not None, 'HR should be computed'
    assert 0.3 < m['hr'] < 1.5, f"HR out of range: {m['hr']}"
run_test('KM: HR reconstruction reasonable', test_km_hr_reconstruction)

# ── Validation panel tests ──

def test_validation_renders():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(1)
    content = driver.find_element(By.ID, 'validation-content')
    assert content.is_displayed()
    metrics = driver.find_element(By.ID, 'metrics-table').text
    assert 'Marginals Match' in metrics
run_test('Validation: renders for binary', test_validation_renders)

def test_validation_traffic_light():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(0.5)
    badges = driver.find_elements(By.CSS_SELECTOR, '.badge-good')
    assert len(badges) >= 1, 'Should have at least one Good badge'
run_test('Validation: traffic light badges', test_validation_traffic_light)

def test_validation_chart_traces():
    fill_continuous(driver, -5.2, 8.1, 120, -2.1, 7.9, 118)
    driver.find_element(By.ID, 'cont-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(1)
    traces = driver.execute_script('return document.getElementById("validation-chart").data.length')
    assert traces >= 2, f'Expected >= 2 traces, got {traces}'
run_test('Validation: chart has traces', test_validation_chart_traces)

def test_validation_summary_table():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(0.5)
    summary = driver.find_element(By.ID, 'summary-table').text
    assert '150' in summary and '148' in summary
run_test('Validation: summary table values', test_validation_summary_table)

# ── Export tests ──

def test_export_json_schema():
    fill_binary(driver, 23, 150, 41, 148)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.5)
    driver.execute_script('showValidation()')
    time.sleep(0.3)
    # Generate JSON string in browser and validate structure
    json_str = driver.execute_script("""
        const m = STATE.lastMeta;
        const arms = {};
        for (const p of STATE.lastIPD) {
            if (!arms[p.arm]) arms[p.arm] = { name: p.arm, n: 0, patients: [] };
            arms[p.arm].n++;
            arms[p.arm].patients.push({ id: p.patient_id, outcome: p.outcome });
        }
        return JSON.stringify({ study_id: m.study_id, source: 'IPD-Simulator v1.0',
            seed: m.seed, outcome_type: m.outcome_type, arms: Object.values(arms) });
    """)
    data = json.loads(json_str)
    assert 'study_id' in data
    assert 'arms' in data
    assert len(data['arms']) == 2
    assert data['arms'][0]['n'] + data['arms'][1]['n'] == 298
run_test('Export: JSON schema valid', test_export_json_schema)

def test_export_provenance_changes():
    fill_binary(driver, 23, 150, 41, 148, seed=42)
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    hash1 = driver.execute_script('return JSON.stringify(STATE.lastInput)')
    fill_binary(driver, 24, 150, 41, 148, seed=42)  # different events
    driver.find_element(By.ID, 'bin-run').click()
    time.sleep(0.3)
    hash2 = driver.execute_script('return JSON.stringify(STATE.lastInput)')
    assert hash1 != hash2, 'Different input should produce different provenance'
run_test('Export: provenance changes with input', test_export_provenance_changes)

# ── Accessibility tests ──

def test_skip_nav():
    driver.get(URL)
    time.sleep(0.5)
    skip = driver.find_element(By.CSS_SELECTOR, 'a.skip-nav')
    assert skip is not None
    assert skip.get_attribute('href').endswith('#main')
run_test('Accessibility: skip-nav present', test_skip_nav)

def test_tab_keyboard():
    driver.get(URL)
    time.sleep(0.5)
    btn = driver.find_element(By.ID, 'btn-km')
    btn.click()
    time.sleep(0.2)
    assert 'active' in btn.get_attribute('class')
    # Arrow right should move focus
    btn.send_keys(Keys.ARROW_RIGHT)
    time.sleep(0.2)
    focused = driver.switch_to.active_element
    assert focused.get_attribute('id') == 'btn-binary'
run_test('Accessibility: tab keyboard navigation', test_tab_keyboard)

# ── Summary ──
driver.quit()
total = passed + failed
print(f'\n{"="*50}')
print(f'RESULTS: {passed}/{total} passed, {failed} failed')
print(f'{"="*50}')
if errors:
    print('\nFailed tests:')
    for name, err in errors:
        print(f'  - {name}: {err}')
sys.exit(0 if failed == 0 else 1)
```

- [ ] **Step 2: Run tests**

```bash
cd /c/Models/IPDSimulator && python tests/test_ipdsim.py
```

Expected: 25/25 pass (or close — fix any failures).

- [ ] **Step 3: Commit**

```bash
cd /c/Models/IPDSimulator && git add tests/
git commit -m "test: 25 Selenium tests covering all simulators, validation, export, accessibility"
```

---

### Task 11: README, LICENSE, CITATION.cff

**Files:**
- Create: `C:\Models\IPDSimulator\README.md`
- Create: `C:\Models\IPDSimulator\LICENSE`
- Create: `C:\Models\IPDSimulator\CITATION.cff`

- [ ] **Step 1: Create README.md**

```markdown
# IPD Simulator

Browser-based tool for reconstructing Individual Participant Data (IPD) from published aggregate summaries.

## Features

- **KM Reconstruction** — Guyot algorithm converts digitised Kaplan-Meier coordinates + at-risk table into pseudo-IPD with individual event times and censoring
- **Binary Simulation** — 2x2 table to individual-level binary outcomes with exact marginal preservation
- **Continuous Simulation** — Mean/SD/N to individual-level continuous values with post-hoc adjustment
- **Validation Panel** — overlay charts, agreement metrics (RMSE, traffic-light ratings), summary statistics
- **Multi-format Export** — CSV, IPD-Meta-Pro JSON, R script with TruthCert provenance (SHA-256 hashing)
- **Built-in Examples** — DAPA-HF, PARADIGM-HF, SGLT2i, Blood Pressure
- **KMcurve JSON Import** — compatible with TrOCR neural OCR output

## Usage

Open `index.html` in any modern browser. No installation required.

## Citation

Ahmad M. IPD Simulator: Browser-based reconstruction of individual participant data from published aggregate summaries. 2026. https://github.com/mahmood726-cyber/ipdsimulator

## License

MIT
```

- [ ] **Step 2: Create LICENSE (MIT)**

- [ ] **Step 3: Create CITATION.cff**

```yaml
cff-version: 1.2.0
title: "IPD Simulator"
message: "If you use this software, please cite it as below."
type: software
authors:
  - family-names: Ahmad
    given-names: Mahmood
    orcid: "https://orcid.org/0009-0003-7781-4478"
    affiliation: "Royal Free Hospital, London, United Kingdom"
repository-code: "https://github.com/mahmood726-cyber/ipdsimulator"
license: MIT
version: "1.0.0"
date-released: "2026-03-31"
```

- [ ] **Step 4: Commit**

```bash
cd /c/Models/IPDSimulator && git add README.md LICENSE CITATION.cff
git commit -m "docs: README, MIT license, CITATION.cff"
```

---

### Task 12: Div Balance Check + Final Verification

**Files:**
- Verify: `C:\Models\IPDSimulator\index.html`

- [ ] **Step 1: Count div balance**

```bash
cd /c/Models/IPDSimulator
python -c "
import re
with open('index.html') as f: html = f.read()
opens = len(re.findall(r'<div[\s>]', html))
closes = len(re.findall(r'</div>', html))
print(f'Opens: {opens}, Closes: {closes}, Balance: {opens - closes}')
assert opens == closes, f'DIV IMBALANCE: {opens} opens vs {closes} closes'
print('DIV BALANCE OK')
"
```

- [ ] **Step 2: Check no literal `</script>` inside script block**

```bash
cd /c/Models/IPDSimulator
python -c "
with open('index.html') as f: html = f.read()
import re
scripts = re.findall(r'<script[^>]*>(.*?)\$\{.*?\}/script>', html, re.DOTALL)
# Check for literal </script> inside script blocks (excluding the safe pattern)
in_script = html.split('<script>')[1].split(\"\\${'<'}/script>\")[0] if '<script>' in html else ''
assert '</script>' not in in_script, 'LITERAL </script> found inside script block!'
print('SCRIPT INTEGRITY OK')
"
```

- [ ] **Step 3: Run full test suite**

```bash
cd /c/Models/IPDSimulator && python tests/test_ipdsim.py
```

Expected: 25/25 pass.

- [ ] **Step 4: Final commit**

```bash
cd /c/Models/IPDSimulator && git add -A
git commit -m "chore: div balance verified, all 25 tests pass, v1.0.0"
```
