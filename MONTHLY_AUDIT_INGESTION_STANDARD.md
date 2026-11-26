# UPPCL 11KV Feeder Audit — Monthly Ingestion Standard & Business Logic Rules

This document records the exact standards, business logic formulas, and deployment workflows established with Prabhakar Sir's official energy audit methodology. All future monthly updates (October 2026, November 2026, and beyond) must strictly follow these rules.

---

## 1. Feeder Universe Definition
* **Active Universe Only**: The total feeder count for any given month must strictly match the active feeders in that month's official **Input Energy Master** (e.g. `Sheet1`, where the validation flag is `True`).
* **No Defunct/Ghost Feeders**: Defunct, unmetered, or inactive historical stubs from past months must **never** be added to the active dataset. 

---

## 2. Numerical Precision
* **Minimum 2 Decimal Places**: All energy metrics ($\text{IE}$ and $\text{SE}$) must retain at least **2 decimal places** (`round(val, 2)`).
* **Do Not Round to 1 Decimal**: Rounding to 1 decimal place truncates fractional energy ($0.01$ to $0.04\text{ MU}$ for auxiliary/PTW meters) to `0.0`, artificially inflating *"I.E. is 0 or not filled"*.

---

## 3. Prabhakar Sir's Sequential / Mutually Exclusive Logic
The evaluation sequence must strictly follow this order:

1. **Step 1 — Input Energy Check**:
   $$\text{If } \text{Progressive IE} = 0 \longrightarrow \textbf{"I.E. is 0 or not filled"}$$
2. **Step 2 — Consumer Tagging Check (Sequential `else if`)**:
   $$\text{Else if } \text{Consumers}_{\text{Current Month}} = 0 \longrightarrow \textbf{"No Consumers Tagged"}$$
3. **Step 3 — Loss Calculation**:
   $$\text{Else } \text{BE} = \frac{\text{Progressive SE}}{\text{Progressive IE}}$$

> **Important**: In all rollup tables, accumulators, and classification functions, use strict `if ... else if ...` so that a feeder with both $\text{IE}=0$ and $\text{Cons}=0$ is categorized under **"I.E. is 0"** only, never double-counted.

---

## 4. Collection Efficiency & AT&C Loss Equations
* **Collection Efficiency (CE)**:
  $$\text{CE} = \begin{cases} 1.0 \text{ (100\%)} & \text{if } \text{Progressive Assessment} = 0 \\ \frac{\text{Progressive Realization}}{\text{Progressive Assessment}} & \text{otherwise} \end{cases}$$
  *(Evaluates to 100% when assessment is 0 so AT&C loss equals line loss instead of defaulting to error/abnormal).*

* **Line Loss %**:
  $$\text{Line Loss} = (1 - \text{BE}) \times 100$$

* **AT&C Loss %**:
  $$\text{AT\&C Loss} = (1 - \text{BE} \times \text{CE}) \times 100$$

* **AT&C Abnormal Classification**:
  * **AT&C Abnormal** evaluates strictly on **$\text{AT\&C Loss} < 0\%$** (or $> 100\%$).
  * It is **decoupled** from the line loss abnormal flag.

* **Standard Slabs**:
  * `0% to 5%`, `5% to 10%`, `10% to 20%`, `20% to 30%`, `30% to 50%`, `50% to 70%`, `Above 70%`, `Abnormal`.

---

## 5. UI & Presentation Standards
* **Discom Short Codes in Brackets**:
  * `PASCHIMANCHAL (PV)`
  * `DAKSHINANCHAL (DV)`
  * `MADHYANCHAL (MV)`
  * `POORVANCHAL (PuV)`
  * `KESCO (Ksco)`
* **Progressive Summary — Slab Mix by Discom & Zone**: Keep commented out unless requested.
* **Progressive Summary Table**: Folded by default with per-row fold/unfold toggles.

---

## 6. Ingestion & Matching Rules (F1–F7 Standard)
* **F1 — Input Energy Column Only**: Use MDM `Total Energy Consumption` (Col 20) only; blank or `≤ 0` becomes `0`. Never fall back to `Energy Consumption` (Col 18), because MDM nets out cancelled provisional assessments (`+X` and `-X` → `0`).
* **F2 — KESCO Oracle Matching**: For `KESCO`, match on `(discom, norm(division), norm(feeder))` summing all matching Oracle rows (do not include `substation` in primary key). For the other 4 Discoms (`PVVNL`, `DVVNL`, `MVVNL`, `PUVNL`), use `(discom, norm(division), norm(substation), norm(feeder))` summed.
* **F3 — Fallback Matching Without Double Counting**: After primary key, use `(discom, norm(division), norm(feeder))`, then `(discom, feeder_code)` (alphanumeric suffix after last `_`, `≥ 10` chars) only when unique. Track `used_oracle_groups` so no Oracle group is assigned to more than one feeder, and log recovered/unmatched feeders to CSV.
* **F4 — Period-Scoped Feeder Universe**: Keep historical-only feeders (e.g. 11 Sep-only feeders) in the dataset with `r[18] = last_active_month` and new feeders with `r[17] = first_active_month`. Filter in UI, slab exports, and drilldown using `r[17]` / `r[18]` so each period shows its exact active feeder count.
* **F5 — Period-Scoped Consumers**: Store prior-month billable consumers (`r[16]`) alongside current-month `r[12]` and resolve via `consFor(r, mTo)`. Never use static `flags & 8` to classify `"No Cons"`; always evaluate `(cons === 0)`.
* **F6 — Absurd-Bill Correction Toggle**: Flag feeder-months where `assessment > ₹500 lakh` and `assessment × 100 / SE > ₹1,000/kWh`, replacing with the median of the feeder's other non-zero months via a default-ON toggle (`Remove Absurd CA`), while keeping raw Oracle values in `feeders.json`.
* **F7 — Optional Sep Re-match Toggle**: Keep `Sep Oracle Re-match (760)` toggleable (default OFF) using `r[19]` patches mapped by `Division + Substation + Feeder`.

---

## 7. End-to-End Monthly Update Checklist
1. **Ingest new month data**: Map month slots (0=Apr, 1=May, 2=Jun, 3=Jul, 4=Aug, 5=Sep, 6=Oct, 7=Nov, etc.).
2. **Rebuild `data/feeders.json`**: Compact schema with 2-decimal precision.
3. **Encrypt `data/feeders.js`**: Run `node scripts/encrypt_feeders.js` (AES-256-GCM).
4. **Regenerate Slab Exports**: Run `python scripts/generate_slab_exports.py` (all 40 Excel workbooks).
5. **Encrypt Slab Data**: Run `node scripts/encrypt_slabs.js` (all 40 encrypted datasets).
6. **Run League Table Tests**: Run `node scripts/test_league_table.js` (5 levels verified).
7. **Bump Cache Busters**: Update timestamp in `scripts/update_cache_busters.js` and run it.
8. **Sync to Mirror Repo**: Run `node scripts/sync_to_github_pages.js`.
9. **Git Commit & Push**: Commit & push both `UPPCL_11KV_PSR_Dashboard_2026_27` and `github_pages`.
10. **Live Verification**: Fetch live GitHub Pages site and verify HTTP 200, cache buster, and decrypted feeder count.
