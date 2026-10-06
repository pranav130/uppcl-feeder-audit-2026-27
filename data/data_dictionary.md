# Data Dictionary & Field Mapping: UPPCL 11KV Feeder Progressive Energy Audit (FY 2026-27)

## 1. Source Information
- **Source File**: `11KV total feeders prog audit 2026-27 upto Aug-26 F_excluding absurd CA.xlsx`
- **Sheet**: `AUDIT DATA`
- **Financial Year**: FY 2026-27
- **Reporting Period**: April 2026 to August 2026 (Progressive 5 Months)
- **Feeder Records**: 26,033

## 2. Field Definitions & Mapping

| Field Name | Source Column | Data Type | Description |
| :--- | :--- | :--- | :--- |
| **Discom** | Col 0 (`Discom`) | String | Distribution Company: DVVNL, MVVNL, PVVNL, PUVVNL, KESCO |
| **Zone** | Col 1 (`Zone`) | String | Operational Zone (40 zones across UP) |
| **Circle** | Col 2 (`Circle`) | String | Electricity Distribution Circle (EDC / EUDC, 120 circles) |
| **Division** | Col 3 (`Division`) | String | Electricity Distribution Division (EDD / EUDD, 392 divisions) |
| **Substation** | Col 4 (`Substation`) | String | 33/11 KV Substation Name and Identifier (4,711 substations) |
| **Outgoing Feeder** | Col 5 (`Outgoing Feeder`) | String | 11 KV Outgoing Feeder Name and Code (26,033 feeders) |
| **Project Area** | Col 6 (`Project Area`) | String | Operational Area category: RURAL, TEHSIL, URBAN |
| **Feeder Nature** | Col 7 (`Feeder Nature`) | String | Feeders type: AGRICULTURE, MIXED ABOVE 25%, MIXED ABOVE 50%, INDUSTRIAL ABOVE 75%, INDEPENDENT, OTHER, SPARE, SUBSTATION |
| **Input Energy (Monthly)** | Cols 24–28 (`I.E._Apr'26`..`Aug'26`) | Float | Feeder Input Energy measured in MWh (or '000 kWh). Total MU = Sum / 1,000 |
| **Sold Energy (Monthly)** | Cols 48–52 (`S.E._Apr'26`..`Aug'26`) | Float | Billed / Sold Energy to consumers in MWh (or '000 kWh). Total MU = Sum / 1,000 |
| **Assessment (Monthly)** | Cols 60–64 (`Assessment_Apr'26`..`Aug'26`) | Float | Revenue Assessment billed in ₹ Lakhs. Total ₹ Cr = Sum / 100 |
| **Realization (Monthly)** | Cols 72–76 (`Realization_Apr'26`..`Aug'26`) | Float | Revenue Realization collected in ₹ Lakhs. Total ₹ Cr = Sum / 100 |
| **PTW Assessment** | Cols 88–92 (`PTW_CA_EX_ SUBS_Apr'26`..`Aug'26`) | Float | Current Assessment for Private Tube Well connections in ₹ Lakhs |
| **PTW Subsidy** | Cols 100–104 (`PTW_ SUBS _Apr'26`..`Aug'26`) | Float | Government PTW Subsidy in ₹ Lakhs |
| **Billable Consumers** | Cols 36–40 (`Billable _Apr'26`..`Aug'26`) | Integer | Count of billable consumers connected to the feeder |

## 3. Mathematical Formulas & KPIs

1. **Progressive Input Energy (MU)**:
   $$\text{Progressive Input Energy} = \frac{\sum_{m=\text{Apr}}^{\text{Aug}} \text{IE}_m}{1000}$$

2. **Progressive Sold Energy (MU)**:
   $$\text{Progressive Sold Energy} = \frac{\sum_{m=\text{Apr}}^{\text{Aug}} \text{SE}_m}{1000}$$

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
