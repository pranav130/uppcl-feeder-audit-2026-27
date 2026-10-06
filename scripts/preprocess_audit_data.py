import os
import sys
import json
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

excel_path = r"C:\Users\HP\Downloads\11KV total feeders prog audit 2026-27 upto Aug-26 F_excluding absurd CA.xlsx"
out_dir = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\data"
dict_dir = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data"

os.makedirs(out_dir, exist_ok=True)
os.makedirs(dict_dir, exist_ok=True)

print(f"Loading workbook: {excel_path} ...")
wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
sheet = wb['AUDIT DATA']

discoms = []
zones = []
circles = []
divisions = []
areas = []
natures = []
substations = []

discom_map = {}
zone_map = {}
circle_map = {}
div_map = {}
area_map = {}
nature_map = {}
ss_map = {}

def get_or_add(val, lst, mp):
    s = str(val or '').strip().upper()
    if not s:
        s = 'UNKNOWN'
    if s not in mp:
        mp[s] = len(lst)
        lst.append(s)
    return mp[s]

def clean_num(val, round_digits=2):
    if val is None or val == '' or str(val).strip() == '':
        return 0.0
    try:
        f = float(val)
        if round_digits is not None:
            return round(f, round_digits)
        return f
    except:
        return 0.0

def clean_int(val):
    if val is None or val == '' or str(val).strip() == '':
        return 0
    try:
        return int(float(val))
    except:
        return 0

rows = []
raw_feeders = []

print("Extracting feeder records...")
row_count = 0
for idx, r in enumerate(sheet.iter_rows(values_only=True)):
    if idx < 2:
        continue
    if r[0] is None and r[5] is None:
        continue
    row_count += 1

    discom_str = str(r[0] or '').strip().upper()
    zone_str   = str(r[1] or '').strip().upper()
    circle_str = str(r[2] or '').strip().upper()
    div_str    = str(r[3] or '').strip().upper()
    ss_str     = str(r[4] or '').strip().upper()
    feeder_str = str(r[5] or '').strip()
    area_str   = str(r[6] or '').strip().upper()
    nature_str = str(r[7] or '').strip().upper()

    d_idx = get_or_add(discom_str, discoms, discom_map)
    z_idx = get_or_add(zone_str, zones, zone_map)
    c_idx = get_or_add(circle_str, circles, circle_map)
    v_idx = get_or_add(div_str, divisions, div_map)
    s_idx = get_or_add(ss_str, substations, ss_map)
    a_idx = get_or_add(area_str, areas, area_map)
    n_idx = get_or_add(nature_str, natures, nature_map)

    # Monthly Input Energy (Apr-Aug: cols 24-28)
    ie = [clean_num(r[c], 1) for c in range(24, 29)]
    # Monthly Sold Energy (Apr-Aug: cols 48-52)
    se = [clean_num(r[c], 1) for c in range(48, 53)]
    # Monthly Assessment (Apr-Aug: cols 60-64)
    ass = [clean_num(r[c], 2) for c in range(60, 65)]
    # Monthly Realization (Apr-Aug: cols 72-76)
    real = [clean_num(r[c], 2) for c in range(72, 77)]
    # Monthly PTW Assessment (Apr-Aug: cols 88-92)
    ptw_ass = [clean_num(r[c], 2) for c in range(88, 93)]
    # Monthly PTW Subsidy (Apr-Aug: cols 100-104)
    ptw_sub = [clean_num(r[c], 2) for c in range(100, 105)]

    # Consumers (max billable across Apr-Aug: cols 36-40)
    billable_counts = [clean_int(r[c]) for c in range(36, 41)]
    cons = max(billable_counts) if billable_counts else 0
    if cons == 0:
        cons = clean_int(r[40]) # Col 40 is Aug billable

    # Cumulative progressive calculations
    tot_ie = sum(ie)
    tot_se = sum(se)
    tot_ass = sum(ass)
    tot_real = sum(real)
    tot_ptw_ass = sum(ptw_ass)

    # PTW check: Generic rule: supply_type starts with "5", or Feeder Nature is AGRICULTURE
    # In feeder dataset: Feeder Nature == 'AGRICULTURE' represents pure PTW feeders
    is_ptw_feeder = (nature_str == 'AGRICULTURE')
    has_ptw_connections = (tot_ptw_ass > 0 or any(p > 0 for p in ptw_sub))

    # Flags
    # bit 0 (1): abnormal (loss < 0 or > 100)
    # bit 1 (2): billed > input (tot_ie > 0 and tot_se > tot_ie)
    # bit 2 (4): zero input (tot_ie == 0)
    # bit 3 (8): no consumers (cons == 0)
    # bit 4 (16): is_ptw_feeder
    # bit 5 (32): has_ptw_connections
    # bit 6 (64): audited feeder
    flags = 0
    if tot_ie > 0:
        loss_pct = ((tot_ie - tot_se) / tot_ie) * 100.0
        if loss_pct < 0 or loss_pct > 100:
            flags |= 1
        if tot_se > tot_ie:
            flags |= 2
    else:
        flags |= 4

    if cons == 0:
        flags |= 8
    if is_ptw_feeder:
        flags |= 16
    if has_ptw_connections:
        flags |= 32
    if tot_ie > 0 and cons > 0:
        flags |= 64

    # Compact row representation:
    # 0: discomIdx, 1: zoneIdx, 2: circleIdx, 3: divIdx, 4: ssIdx, 5: feederName
    # 6: areaIdx, 7: natureIdx, 8: ieArr, 9: seArr, 10: assArr, 11: realArr
    # 12: cons, 13: flags, 14: ptwAssArr, 15: ptwSubArr
    row = [
        d_idx, z_idx, c_idx, v_idx, s_idx, feeder_str,
        a_idx, n_idx, ie, se, ass, real,
        cons, flags, ptw_ass, ptw_sub
    ]
    rows.append(row)

wb.close()
print(f"Total feeders processed: {len(rows)}")

dataset = {
    "d": {
        "Discom": discoms,
        "Zone": zones,
        "Circle": circles,
        "Division": divisions,
        "Area": areas,
        "Nature": natures,
        "SS": substations
    },
    "rows": rows
}

# Write JSON
json_path = os.path.join(out_dir, "feeders.json")
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(dataset, f, separators=(',', ':'))
print(f"Wrote {json_path} ({os.path.getsize(json_path) / (1024*1024):.2f} MB)")

# Write JS wrapper for zero-CORS / static file execution
js_path = os.path.join(out_dir, "feeders.js")
with open(js_path, "w", encoding="utf-8") as f:
    f.write("window.__FEEDERS_RAW = ")
    json.dump(dataset, f, separators=(',', ':'))
    f.write(";\n")
print(f"Wrote {js_path} ({os.path.getsize(js_path) / (1024*1024):.2f} MB)")

# Generate cascade hierarchy lookup
cascade = {
    "zones": sorted(list(set(zones))),
    "circles": sorted(list(set(circles))),
    "divisions": sorted(list(set(divisions))),
    "areas": sorted(list(set(areas))),
    "natures": sorted(list(set(natures)))
}
cascade_path = os.path.join(out_dir, "cascade.json")
with open(cascade_path, "w", encoding="utf-8") as f:
    json.dump(cascade, f, indent=2)
print(f"Wrote {cascade_path}")

# Generate Data Dictionary
dict_path = os.path.join(dict_dir, "data_dictionary.md")
with open(dict_path, "w", encoding="utf-8") as f:
    f.write("""# Data Dictionary & Field Mapping: UPPCL 11KV Feeder Progressive Energy Audit (FY 2026-27)

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
   $$\\text{Progressive Input Energy} = \\frac{\\sum_{m=\\text{Apr}}^{\\text{Aug}} \\text{IE}_m}{1000}$$

2. **Progressive Sold Energy (MU)**:
   $$\\text{Progressive Sold Energy} = \\frac{\\sum_{m=\\text{Apr}}^{\\text{Aug}} \\text{SE}_m}{1000}$$

3. **Billing Efficiency (BE %)**:
   $$\\text{BE (\\%)} = \\frac{\\text{Progressive Sold Energy}}{\\text{Progressive Input Energy}} \\times 100$$

4. **Collection Efficiency (CE %)**:
   $$\\text{CE (\\%)} = \\frac{\\text{Progressive Realization}}{\\text{Progressive Assessment}} \\times 100$$
   *(Capped at 100% when assessment is zero but realization > 0)*

5. **Line / Distribution Loss (%)**:
   $$\\text{Line Loss (\\%)} = 100 - \\text{BE (\\%)}$$

6. **AT&C Loss (%)**:
   $$\\text{AT\\&C Loss (\\%)} = 100 - \\left( \\frac{\\text{BE} \\times \\text{CE}}{100} \\right)$$

7. **Average Billing Rate (ABR ₹/kWh)**:
   $$\\text{ABR} = \\frac{\\text{Progressive Assessment (Lakhs)} \\times 100}{\\text{Progressive Sold Energy (MWh)}}$$

8. **Throughput Rate (₹/kWh)**:
   $$\\text{Throughput Rate} = \\frac{\\text{Progressive Realization (Lakhs)} \\times 100}{\\text{Progressive Input Energy (MWh)}}$$

9. **AT&C Loss Value (₹ Cr)**:
   $$\\text{Loss Value} = \\frac{\\text{Input Energy (MWh)} \\times 1000 \\times \\text{ABR} \\times \\frac{\\text{AT\\&C Loss}}{100}}{10,000,000}$$

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
""")
print(f"Wrote {dict_path}")
