# UPPCL 11KV Feeder Progressive Energy Audit Dashboard (FY 2026-27)

Comprehensive, high-performance, and interactive 11KV Feeder Progressive Energy Audit Dashboard for **Uttar Pradesh Power Corporation Limited (UPPCL)**.

Based strictly on authoritative data up to August 2026 from:
`11KV total feeders prog audit 2026-27 upto Aug-26 F_excluding absurd CA.xlsx`

---

## 1. Project Overview & Scope
- **Temporal Scope**: FY 2026-27 (April 2026 to August 2026 Progressive).
- **Feeder Scope**: 26,033 feeders across all 5 DISCOMs:
  - **PVVNL** (Paschimanchal)
  - **DVVNL** (Dakshinanchal)
  - **MVVNL** (Madhyanchal)
  - **PUVVNL** (Poorvanchal)
  - **KESCO** (Kanpur Electricity Supply Company)
- **Hierarchy Coverage**: DISCOM (5) → Zone (40) → Circle (120) → Division (392) → Substation (4,711) → Feeder (26,033).
- **Dual PTW Analytics Engine**: Dynamic recalculation engine for Non-PTW vs Non-PTW + PTW datasets.

---

## 2. PTW (Private Tube Well) Business Rule & Modes

### PTW Identification
A connection is treated as PTW when its **Supply Type starts with `"5"`** (LMV-5 Agriculture / Private Tube Well connections).

### Mode 1: Default Mode (PTW EXCLUDED)
- **Checkbox**: `☐ Include PTW Connections (Supply Type starts with "5")` is **unchecked by default**.
- **Dataset Scope**: Dedicated Agriculture/PTW feeders (`Feeder Nature == 'AGRICULTURE'`, 4,106 feeders) are excluded.
- **Total Counted Feeders**: **21,927 Feeders**.
- **Progressive Input Energy**: **63,665.95 MU**.
- **Progressive Sold Energy**: **39,800.75 MU**.
- **Progressive Assessment**: **₹ 29,835.27 Crore**.
- **Progressive Realization**: **₹ 24,123.75 Crore**.
- **Line Loss**: **37.48%**.

### Mode 2: Included Mode (PTW INCLUDED)
- **Checkbox**: `☑ Include PTW Connections (Supply Type starts with "5")` is **checked**.
- **Dataset Scope**: Full dataset of **26,033 Feeders**.
- **Special Business Rule**: **PTW Assessment = PTW Realization**.
  - Revenue Realization is credited with PTW Assessment (`Realization = Base Realization + PTW Assessment`).
  - Matches the authoritative Excel formula in Column 21 (`AT&C Loss_inc_PTW`).
- **Progressive Input Energy**: **68,168.95 MU**.
- **Progressive Sold Energy**: **42,485.44 MU**.
- **Progressive Assessment**: **₹ 30,462.56 Crore**.
- **Progressive Realization (with PTW)**: **₹ 25,151.58 Crore**.
- **Line Loss**: **37.68%**.

---

## 3. Dashboard Features & Capabilities

1. **Control-Room Ledger Interface**: Clean, responsive layout with dark and light theme toggle.
2. **12 Headline KPI Cards**:
   - Total Feeders (Scoped, Counted, Left Out)
   - Audited Feeders
   - Input Energy (MU)
   - Sold Energy (MU)
   - Billing Efficiency (%)
   - Collection Efficiency (%)
   - Line Loss (%)
   - AT&C Loss (%)
   - Average Billing Rate (₹/kWh)
   - Throughput Rate (₹/kWh)
   - Energy Realisation (₹ Cr)
   - AT&C Loss Value (₹ Cr)
3. **Interactive Charts (Chart.js)**:
   - Monthly Input vs Sold Energy (MU) comparison (Apr–Aug)
   - Monthly Line Loss % vs AT&C Loss % Trends
   - Line Loss Slab Distribution (10 Slabs)
   - AT&C Loss Slab Distribution (10 Slabs)
   - Feeder Nature & Project Area breakdowns
4. **Cascading Dropdowns & Multi-Filters**:
   - DISCOM → Zone → Circle → Division → Project Area → Feeder Nature
   - Month range selectors: April to August
   - Feeder / Substation / Division global text search
   - Exclusion filters (Abnormal loss, Billed > Input, Zero Input)
   - Dynamic active filter chips with 1-click removal
5. **Drilldown Explorer (`feeder_drilldown.html`)**:
   - Standalone drilldown tool across all 10 loss slabs for both Line Loss and AT&C Loss.
   - Filter by DISCOM, search, pagination (25, 50, 100 rows per page).
   - Instant export of filtered data to CSV and formatted Excel (.xlsx).
6. **Exports**:
   - Executive Summary CSV
   - Progressive Summary CSV
   - Progressive Summary Excel (.xlsx) with interactive outline row grouping
   - Slab-wise CSV & Excel downloads

---

## 4. Local Setup & Execution

### Prerequisites
- Python 3.9+ (optional, for local static HTTP server)
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Run Locally
```bash
# Navigate to the frontend directory
cd frontend

# Start a local static server
python -m http.server 8000
```
Open [http://localhost:8000/](http://localhost:8000/) in your browser.

Alternatively, double-click `frontend/index.html` directly—it works out-of-the-box thanks to offline dictionary encoding!

---

## 5. Verification & Validation Status
The project includes a full automated test suite (`validation/validate_calculations.py`) that reconciles every KPI against the original Excel workbook formulas:
- **Test A (PTW Excluded)**: 100% Passed (Feeders: 21,927 | IE: 63,665.95 MU | SE: 39,800.75 MU | Assessment: 29,835.27 Cr | Realization: 24,123.75 Cr).
- **Test B (PTW Included)**: 100% Passed (Feeders: 26,033 | IE: 68,168.95 MU | SE: 42,485.44 MU | Assessment: 30,462.56 Cr | Realization: 25,151.58 Cr).
