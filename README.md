# IPD Simulator

Browser-based tool for reconstructing Individual Participant Data (IPD) from published aggregate summaries.

## Features

- **KM Reconstruction** -- Guyot algorithm converts digitised Kaplan-Meier coordinates + at-risk table into pseudo-IPD with individual event times and censoring
- **Binary Simulation** -- 2x2 table to individual-level binary outcomes with exact marginal preservation
- **Continuous Simulation** -- Mean/SD/N to individual-level continuous values with post-hoc adjustment
- **Validation Panel** -- overlay charts, agreement metrics (RMSE, traffic-light ratings), summary statistics
- **Multi-format Export** -- CSV, IPD-Meta-Pro JSON, R script with TruthCert provenance (SHA-256 hashing)
- **Built-in Examples** -- DAPA-HF, PARADIGM-HF, SGLT2i, Blood Pressure
- **KMcurve JSON Import** -- compatible with TrOCR neural OCR output

## Usage

Open `index.html` in any modern browser. No installation required.

## Citation

Ahmad M. IPD Simulator: Browser-based reconstruction of individual participant data from published aggregate summaries. 2026. https://github.com/mahmood789/ipdsimulator

## License

MIT
