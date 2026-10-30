import sys
import os
import json
import re
import openpyxl
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

REPO_DIR     = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
ENERGY_XLSX  = r"C:\Users\HP\Documents\New Sep Input energy data.xlsx"
ORACLE_XLSX  = r"G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_SEP26.xlsx"
AUG_WORKBOOK = r"C:\Users\HP\Downloads\11KV total feeders prog audit 2026-27 upto Aug-26 F_excluding absurd CA.xlsx"

print("=" * 75)
print("REBUILDING UPPCL 11KV FEEDER AUDIT DATASET TO EXACTLY 26,237 FEEDERS")
print("=" * 75)

def clean_num(val, digits=2):
    if val is None or val == '' or str(val).strip() in ('', '-', 'N/A', 'None'):
        return 0.0
    try:
        f = float(str(val).replace(',', ''))
        return round(f, digits) if digits is not None else f
    except:
        return 0.0

def clean_int(val):
    if val is None or val == '' or str(val).strip() in ('', '-', 'N/A', 'None'):
        return 0
    try:
        return int(float(str(val).replace(',', '')))
    except:
        return 0

def normalize(s):
    return re.sub(r'\s+', ' ', str(s or '').strip().upper())

DISCOM_NORM = {
    'DAKSHINANCHAL': 'DVVNL',
    'MADHYANCHAL': 'MVVNL',
    'PASCHIMANCHAL': 'PVVNL',
    'POORVANCHAL': 'PUVVNL',
    'PUVNL': 'PUVVNL',
    'PUVVNL': 'PUVVNL',
    'DVVNL': 'DVVNL',
    'MVVNL': 'MVVNL',
    'PVVNL': 'PVVNL',
    'KESCO': 'KESCO'
}

DISCOM_DISPLAY = {
    'PVVNL': 'PASCHIMANCHAL',
    'DVVNL': 'DAKSHINANCHAL',
    'PUVVNL': 'POORVANCHAL',
    'MVVNL': 'MADHYANCHAL',
    'KESCO': 'KESCO'
}

def feeder_key(discom, substation, feeder):
    d_norm = DISCOM_NORM.get(normalize(discom), normalize(discom))
    return (d_norm, normalize(substation), normalize(feeder))

# ── Step 1: Load August Reference Workbook (Historical Baseline Apr-Aug) ──
print("\n[Step 1] Loading August Reference Workbook...")
wb_aug = openpyxl.load_workbook(AUG_WORKBOOK, read_only=True, data_only=True)
ws_aug = wb_aug['AUDIT DATA']

aug_data = {}
for row in ws_aug.iter_rows(min_row=3, values_only=True):
    if row[0] is None and row[5] is None:
        continue
    k = feeder_key(row[0], row[4], row[5])
    
    ie = [clean_num(row[c], 1) for c in range(24, 29)]
    se = [clean_num(row[c], 1) for c in range(48, 53)]
    ass = [clean_num(row[c], 2) for c in range(60, 65)]
    real = [clean_num(row[c], 2) for c in range(72, 77)]
    ptw_ass = [clean_num(row[c], 2) for c in range(88, 93)]
    ptw_sub = [clean_num(row[c], 2) for c in range(100, 105)]
    billable = [clean_int(row[c]) for c in range(36, 41)]
    
    aug_data[k] = {
        'ie': ie, 'se': se, 'ass': ass, 'real': real,
        'ptw_ass': ptw_ass, 'ptw_sub': ptw_sub, 'billable': billable
    }
wb_aug.close()
print(f"Loaded historical Apr-Aug baseline for {len(aug_data)} feeders.")

# ── Step 2: Load Oracle September Billing Data ──────────────────────────────
print("\n[Step 2] Loading Oracle September Billing Data...")
wb_o = openpyxl.load_workbook(ORACLE_XLSX, read_only=True, data_only=True)
ws_o = wb_o['SEP26']

oracle_exact = {}
oracle_df = {}
df_dups = set()
oracle_base = {}

for i, r in enumerate(ws_o.iter_rows(values_only=True)):
    if i == 0: continue
    disc_norm = DISCOM_NORM.get(normalize(r[0]), normalize(r[0]))
    ss = normalize(r[4])
    fdr = normalize(r[5])
    k = (disc_norm, ss, fdr)
    df_k = (disc_norm, fdr)
    
    base_fdr = fdr.split('_')[0].strip()
    base_k = (disc_norm, ss, base_fdr)
    
    rec = {
        'total_cons': clean_int(r[7]),
        'bill_cons': clean_int(r[8]),
        'billed': clean_int(r[9]),
        'kwh': clean_num(r[13], 1),
        'ass_rs': clean_num(r[15], 2),       # Rs
        'real_rs': clean_num(r[22], 2),      # Rs
        'ptw_subs_rs': clean_num(r[18], 2),  # Rs
        'tariff_subs_rs': clean_num(r[17], 2)# Rs
    }
    
    if k in oracle_exact:
        oe = oracle_exact[k]
        for f in rec: oe[f] += rec[f]
    else:
        oracle_exact[k] = rec.copy()
        
    if df_k in oracle_df:
        df_dups.add(df_k)
    else:
        oracle_df[df_k] = rec.copy()
        
    if base_k not in oracle_base:
        oracle_base[base_k] = rec.copy()

for d in df_dups:
    del oracle_df[d]

wb_o.close()
print(f"Loaded Oracle SEP26 records: {len(oracle_exact)} exact keys, {len(oracle_df)} fallback keys.")

# ── Step 3: Load September 26,237 Feeders from New Sep Input Energy ─────────
print("\n[Step 3] Loading 26,237 feeders from New Sep Input Energy Excel...")
wb_e = openpyxl.load_workbook(ENERGY_XLSX, read_only=True, data_only=True)
ws_e = wb_e['Sheet1']

rows_26237 = []
for i, row in enumerate(ws_e.iter_rows(values_only=True)):
    if i == 0: continue
    # Only process valid rows (marked True in Col 9 / row index 9)
    if row[9] is True or str(row[9]).upper() == 'TRUE':
        rows_26237.append(row)
wb_e.close()
print(f"Loaded exactly {len(rows_26237)} valid feeders from September input energy data.")

# ── Step 4: Build Dimension Dictionaries & Compact Rows ─────────────────────
print("\n[Step 4] Building Compact Rows and Normalizing Dimensions...")

# Seed standard dimension lists
discoms_list = ['PASCHIMANCHAL', 'DAKSHINANCHAL', 'POORVANCHAL', 'MADHYANCHAL', 'KESCO']
discom_map = {d: idx for idx, d in enumerate(discoms_list)}

areas_list = ['URBAN', 'TEHSIL', 'RURAL']
area_map = {a: idx for idx, a in enumerate(areas_list)}

natures_list = [
    'OTHER', 'INDEPENDENT', 'MIXED ABOVE 50%', 'SPARE',
    'SUBSTATION', 'MIXED ABOVE 25%', 'AGRICULTURE', 'INDUSTRIAL ABOVE 75%'
]
nature_map = {n: idx for idx, n in enumerate(natures_list)}

zones_list = []; zone_map = {}
circles_list = []; circle_map = {}
divisions_list = []; div_map = {}
substations_list = []; ss_map = {}

def get_or_add(val, lst, mp):
    s = normalize(val) or 'UNKNOWN'
    if s not in mp:
        mp[s] = len(lst)
        lst.append(s)
    return mp[s]

output_rows = []
hist_matched = 0
hist_new = 0
oracle_matched = 0

for row in rows_26237:
    disc_norm = DISCOM_NORM.get(normalize(row[0]), normalize(row[0]))
    disc_display = DISCOM_DISPLAY.get(disc_norm, normalize(row[0]))
    
    zone = normalize(row[1])
    circle = normalize(row[2])
    division = normalize(row[3])
    substation = normalize(row[4])
    feeder_name = str(row[8] or '').strip()
    
    raw_area = normalize(row[11]) if len(row) > 11 and row[11] else 'RURAL'
    if raw_area in ('IPDS', 'DISTRICT HQ'):
        area = 'URBAN'
    elif raw_area in ('URBAN', 'TEHSIL', 'RURAL'):
        area = raw_area
    else:
        area = 'RURAL'
        
    raw_nature = normalize(row[17]) if len(row) > 17 and row[17] else 'OTHER'
    if raw_nature in nature_map:
        nature = raw_nature
    else:
        nature = 'OTHER'
        
    ec = clean_num(row[19], 1) if len(row) > 19 else 0.0
    tec = clean_num(row[21], 1) if len(row) > 21 else 0.0
    ie_sep = round(tec if tec > 0 else ec, 1)
    
    k = feeder_key(disc_norm, substation, feeder_name)
    df_k = (disc_norm, normalize(feeder_name))
    base_fdr = normalize(feeder_name).split('_')[0].strip()
    base_k = (disc_norm, normalize(substation), base_fdr)
    
    # Historical Apr-Aug data
    if k in aug_data:
        hist = aug_data[k]
        hist_matched += 1
        ie_apr_aug = hist['ie']
        se_apr_aug = hist['se']
        ass_apr_aug = hist['ass']
        real_apr_aug = hist['real']
        ptw_ass_apr_aug = hist['ptw_ass']
        ptw_sub_apr_aug = hist['ptw_sub']
        billable_apr_aug = hist['billable']
    else:
        hist_new += 1
        ie_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        se_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        ass_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        real_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        ptw_ass_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        ptw_sub_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        billable_apr_aug = [0, 0, 0, 0, 0]
        
    # September Oracle billing match
    om = oracle_exact.get(k) or oracle_df.get(df_k) or oracle_base.get(base_k)
    if om:
        oracle_matched += 1
        se_sep = round(om['kwh'] / 1000.0, 1)
        ass_sep = round(om['ass_rs'] / 1e5, 2)
        real_sep = round(om['real_rs'] / 1e5, 2)
        ptw_ass_sep = round(om['ptw_subs_rs'] / 1e5, 2)
        ptw_sub_sep = round(om['tariff_subs_rs'] / 1e5, 2)
        billable_sep = om['bill_cons']
    else:
        se_sep = 0.0
        ass_sep = 0.0
        real_sep = 0.0
        ptw_ass_sep = 0.0
        ptw_sub_sep = 0.0
        billable_sep = 0
        
    # 6-month arrays
    ie = ie_apr_aug + [ie_sep]
    se = se_apr_aug + [se_sep]
    ass = ass_apr_aug + [ass_sep]
    real = real_apr_aug + [real_sep]
    ptw_ass = ptw_ass_apr_aug + [ptw_ass_sep]
    ptw_sub = ptw_sub_apr_aug + [ptw_sub_sep]
    billable = billable_apr_aug + [billable_sep]
    
    tot_ie = sum(ie)
    tot_se = sum(se)
    tot_ass = sum(ass)
    tot_real = sum(real)
    tot_ptw_ass = sum(ptw_ass)
    
    cons = max(billable) if billable else 0
    if cons == 0:
        cons = billable_sep or (max(billable_apr_aug) if billable_apr_aug else 0)
        
    is_ptw_feeder = (nature == 'AGRICULTURE')
    has_ptw_connections = (tot_ptw_ass > 0 or any(p > 0 for p in ptw_sub))
    
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
        
    d_idx = discom_map[disc_display]
    z_idx = get_or_add(zone, zones_list, zone_map)
    c_idx = get_or_add(circle, circles_list, circle_map)
    v_idx = get_or_add(division, divisions_list, div_map)
    s_idx = get_or_add(substation, substations_list, ss_map)
    a_idx = area_map[area]
    n_idx = nature_map[nature]
    
    row_compact = [
        d_idx, z_idx, c_idx, v_idx, s_idx, feeder_name,
        a_idx, n_idx, ie, se, ass, real,
        cons, flags, ptw_ass, ptw_sub
    ]
    output_rows.append(row_compact)

print(f"Total output rows: {len(output_rows)}")
print(f"  Existing feeders with historical baseline: {hist_matched}")
print(f"  New feeders inducted (Apr-Aug=0): {hist_new}")
print(f"  Feeders with September billing matched: {oracle_matched}")

dataset = {
    "d": {
        "Discom": discoms_list,
        "Zone": zones_list,
        "Circle": circles_list,
        "Division": divisions_list,
        "Area": areas_list,
        "Nature": natures_list,
        "SS": substations_list
    },
    "rows": output_rows
}

# ── Step 5: Write Output Files ─────────────────────────────────────────────
print("\n[Step 5] Writing feeders.json and feeders_sep26_raw.js...")

for target_dir in [os.path.join(REPO_DIR, "data"), os.path.join(REPO_DIR, "frontend", "data")]:
    os.makedirs(target_dir, exist_ok=True)
    
    # 1. feeders.json
    json_path = os.path.join(target_dir, "feeders.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, separators=(',', ':'))
    print(f"  Wrote {json_path} ({os.path.getsize(json_path)/1024/1024:.2f} MB)")
    
    # 2. feeders_sep26_raw.js
    raw_js_path = os.path.join(target_dir, "feeders_sep26_raw.js")
    with open(raw_js_path, 'w', encoding='utf-8') as f:
        f.write("window.__FEEDERS_RAW = ")
        json.dump(dataset, f, separators=(',', ':'))
        f.write(";\n")
    print(f"  Wrote {raw_js_path} ({os.path.getsize(raw_js_path)/1024/1024:.2f} MB)")

print("\nRebuild dataset script completed successfully.")
