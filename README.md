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

## 2. PTW (Private Tube Well) Business Rule & Invariance

### Core Business Rule
- **Assessment Invariance**: The **Assessment Amount (₹ 30,462.55 Cr)**, **Total Feeders (26,033)**, **Input Energy (68,168.95 MU)**, **Sold Energy (42,485.45 MU)**, and **Line Loss % (37.68%)** remain strictly **CONSTANT** irrespective of whether PTW connections are included or excluded.
- **Dynamic Realization & Throughput Rate**: Under the business principle **PTW Assessment = PTW Realization**, only the **Revenue Realization**, **Throughput Rate (₹/kWh)**, **Collection Efficiency (%)**, and **AT&C Loss (%)** change upon including PTW connections:
  - **PTW Excluded (Default)**: Normal / Base Realization collected without crediting PTW subsidy assessment (**₹ 24,293.94 Cr**; Throughput Rate: **₹ 3.56/kWh**; Collection Eff: **79.75%**; AT&C Loss: **50.30%**).
  - **PTW Included**: PTW Assessment (**₹ 857.63 Cr**) is credited as realized revenue (**Realization = ₹ 25,151.58 Cr**; Throughput Rate increases to **₹ 3.69/kWh**; Collection Eff improves to **82.57%**; AT&C Loss drops to **48.54%**), exactly matching the official Excel Column 21 formula (`AT&C Loss_inc_PTW`).

| Parameter | Mode 1: Default (`PTW EXCLUDED`) | Mode 2: Dynamic Toggle (`PTW INCLUDED`) | Impact |
| :--- | :--- | :--- | :--- |
| **PTW Checkbox** | `☐ Include PTW Connections` (Unchecked) | `☑ Include PTW Connections` (Checked) | Toggle Control |
| **Status Badge** | `PTW Status: EXCLUDED` | `PTW Status: INCLUDED` | Visual Indicator |
| **Total Feeders** | **26,033 Feeders** | **26,033 Feeders** | **CONSTANT** |
| **Progressive Assessment** | **₹ 30,462.55 Crore** | **₹ 30,462.55 Crore** | **CONSTANT** |
| **Progressive Input Energy** | **68,168.95 MU** | **68,168.95 MU** | **CONSTANT** |
| **Progressive Sold Energy** | **42,485.45 MU** | **42,485.45 MU** | **CONSTANT** |
| **Billing Efficiency** | **62.32%** | **62.32%** | **CONSTANT** |
| **Line Loss %** | **37.68%** | **37.68%** | **CONSTANT** |
| **Progressive Realization** | **₹ 24,293.94 Crore** | **₹ 25,151.58 Crore** | **+ ₹ 857.63 Cr Credited** |
| **Throughput Rate** | **₹ 3.56 / kWh** | **₹ 3.69 / kWh** | **+ ₹ 0.13 / kWh** |
| **Collection Efficiency** | **79.75%** | **82.57%** | **+ 2.82%** |
| **AT&C Loss %** | **50.30%** | **48.54%** | **- 1.76% Reduction** |

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

```bash
# Navigate to project directory
cd C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27

# Start a local static server
python -m http.server 8080
```
Open [http://localhost:8080/](http://localhost:8080/) in your browser.
