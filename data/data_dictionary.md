# Data Dictionary & Field Mapping: UPPCL 11KV Feeder Progressive Energy Audit (FY 2026-27)

## 1. Source Information
- **Source Files**: 
  - Master Reference (Apr–Sep): `11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx` (Sheet: `AUDIT DATA`)
  - October Billing/Realization: `UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_OCT26.xlsx` (Sheet: `OCT26`)
  - October Energy: `DistributionMasterMeterDataReportExcel_202611251124032315.xls` (Col 20: Total Energy Consumption)
  - October Consumer Master (PTW & Categories): `D:\MASTER DATA\FY 26-27\OCT_2026\<DISCOM>\*_OCT_2026.csv.gz`
- **Financial Year**: FY 2026-27
- **Reporting Period**: April 2026 to October 2026 (Progressive 7 Months)
- **Feeder Records**: 26,655 total rows (26,644 active in October + 11 Sep-only feeders)

## 2. Field Definitions & Mapping (`feeders.json` / `feeders.js` — 19-field row schema)

| Index / Field Name | Source Column | Data Type | Description |
| :--- | :--- | :--- | :--- |
| `r[0]` **Discom** | Col 0 (`Discom`) | Integer idx | Distribution Company: DVVNL, MVVNL, PVVNL, PUVVNL, KESCO |
| `r[1]` **Zone** | Col 1 (`Zone`) | Integer idx | Operational Zone (40 zones across UP) |
| `r[2]` **Circle** | Col 2 (`Circle`) | Integer idx | Electricity Distribution Circle (EDC / EUDC, 120 circles) |
| `r[3]` **Division** | Col 3 (`Division`) | Integer idx | Electricity Distribution Division (EDD / EUDD, 392 divisions) |
| `r[4]` **Substation** | Col 4 (`Substation`) | Integer idx | 33/11 KV Substation Name and Identifier (4,783 substations) |
| `r[5]` **Outgoing Feeder** | Col 5 (`Outgoing Feeder`) | String | 11 KV Outgoing Feeder Name and Code |
| `r[6]` **Project Area** | Col 6 (`Project Area`) | Integer idx | Operational Area category: RURAL, TEHSIL, URBAN |
| `r[7]` **Feeder Nature** | Col 7 (`Feeder Nature`) | Integer idx | Feeders type: AGRICULTURE, MIXED ABOVE 25%, MIXED ABOVE 50%, INDUSTRIAL ABOVE 75%, INDEPENDENT, OTHER, SPARE, SUBSTATION |
| `r[8]` **Input Energy (Monthly)** | 7-element array `[Apr..Oct]` | Float[] | Feeder Input Energy in MWh (Total MU = Sum / 1,000) |
| `r[9]` **Sold Energy (Monthly)** | 7-element array `[Apr..Oct]` | Float[] | Billed / Sold Energy to consumers in MWh (Total MU = Sum / 1,000) |
| `r[10]` **Assessment (Monthly)** | 7-element array `[Apr..Oct]` | Float[] | Revenue Assessment billed in ₹ Lakhs (Total ₹ Cr = Sum / 100) |
| `r[11]` **Realization (Monthly)** | 7-element array `[Apr..Oct]` | Float[] | Revenue Realization collected in ₹ Lakhs (Total ₹ Cr = Sum / 100) |
| `r[12]` **Oct Billable Consumers** | Oracle `BILL_CONS` (Col 7) | Integer | Count of billable consumers in October |
| `r[13]` **Flags** | Bitmask | Integer | 1=LL Abnormal, 2=SE>IE, 4=IE==0, 8=Cons==0 (legacy) |
| `r[14]` **PTW Assessment** | 7-element array `[Apr..Oct]` | Float[] | Positive `CA_EX_SUBS` for `PTW_SUBS > 0` in ₹ Lakhs, capped at feeder Assessment |
| `r[15]` **PTW Subsidy** | 7-element array `[Apr..Oct]` | Float[] | Government PTW Subsidy in ₹ Lakhs |
| `r[16]` **Sep Billable Consumers** | Sir's Sep Col 45 | Integer | Count of billable consumers for periods ending ≤ Sep (`consFor`) |
| `r[17]` **First Active Month** | `6` for Oct-new, else `null` | Integer/null | Period-gating lower bound (skips feeder when `mTo < r[17]`) |
| `r[18]` **Last Active Month** | `5` for 11 Sep-only, else omitted | Integer | Period-gating upper bound (skips feeder when `mTo > r[18]`) |
| `r[19]` **Sep Oracle Patch** | Optional object `{se_mwh, ass_lakh, real_lakh, cons}` | Object | Present on 760 feeders for the optional `Sep Oracle Re-match (760)` toggle |

## 3. Mathematical Formulas & KPIs

1. **Progressive Input Energy (MU)**:
   $$\text{Progressive Input Energy} = \frac{\sum_{m=\text{Apr}}^{\text{Sep}} \text{IE}_m}{1000}$$

2. **Progressive Sold Energy (MU)**:
   $$\text{Progressive Sold Energy} = \frac{\sum_{m=\text{Apr}}^{\text{Sep}} \text{SE}_m}{1000}$$

3. **Billing Efficiency (BE %)**:
   $$\text{BE (\%)} = \frac{\text{Progressive Sold Energy}}{\text{Progressive Input Energy}} \times 100$$

4. **Collection Efficiency (CE %)**:
   $$\text{CE (\%)} = \frac{\text{Progressive Realization}}{\text{Progressive Assessment}} \times 100$$
   *(Capped at 100% when assessment is zero but realization > 0)*

5. **Line / Distribution Loss (%)**:
   $$\text{Line Loss (\%)} = 100 - \text{BE (\%)}$$

6. **AT&C Loss (%)**:
   $$\text{AT\&C Loss (\%)} = 100 - \left( \frac{\text{BE} \times \text{CE}}{100} \right)$$

7. **Average Billing Rate (ABR ₹/kWh)**:
   $$\text{ABR} = \frac{\text{Progressive Assessment (Lakhs)} \times 100}{\text{Progressive Sold Energy (MWh)}}$$

8. **Throughput Rate (₹/kWh)**:
   $$\text{Throughput Rate} = \frac{\text{Progressive Realization (Lakhs)} \times 100}{\text{Progressive Input Energy (MWh)}}$$

9. **AT&C Loss Value (₹ Cr)**:
   $$\text{Loss Value} = \frac{\text{Input Energy (MWh)} \times 1000 \times \text{ABR} \times \frac{\text{AT\&C Loss}}{100}}{10,000,000}$$

## 4. PTW Business Rules

- **PTW Definition**: Any connection where Supply Type begins with `"5"` (LMV-5 Private Tube Well / Agriculture).
- **Default Mode (PTW Excluded)**:
  - All dedicated PTW feeders (`Feeder Nature == 'AGRICULTURE'`, 4,106 feeders) are excluded.
  - Total counted feeders: 21,927.
  - Energy totals, assessment, realization, loss slabs, and drilldowns are calculated strictly for Non-PTW.
- **Included Mode (PTW Included)**:
  - All 26,033 feeders are included.
  - **Special Business Rule**: For PTW connections, **PTW Assessment = PTW Realization**.
  - For pure PTW feeders, Collection Efficiency is 100% (`Realization = Assessment`).
  - For mixed feeders with PTW connections, Realization is credited with PTW Assessment (`Realization = Base Realization + PTW Assessment`), matching the Excel workbook formula in Col 21 (`AT&C Loss_inc_PTW`).

## 5. Loss Slab Classifications
1. `0% to 5%`: Loss < 5%
2. `5% to 10%`: 5% <= Loss < 10%
3. `10% to 20%`: 10% <= Loss < 20%
4. `20% to 30%`: 20% <= Loss < 30%
5. `30% to 50%`: 30% <= Loss < 50%
6. `50% to 70%`: 50% <= Loss < 70%
7. `Above 70%`: Loss >= 70%
8. `Abnormal`: Loss < 0% or Loss > 100%
9. `IE 0`: Input Energy == 0
10. `No Cons`: Connected Consumers == 0
