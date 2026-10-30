import sys, os, openpyxl, json, re
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

REPO_DIR    = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
ENERGY_XLSX = r"C:\Users\HP\Documents\New Sep Input energy data.xlsx"
ORACLE_XLSX = r"G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_SEP26.xlsx"
AUG_WORKBOOK = r"C:\Users\HP\Downloads\11KV total feeders prog audit 2026-27 upto Aug-26 F_excluding absurd CA.xlsx"

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

DISCOM_MAP = {
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

def norm_discom(d):
    s = normalize(d)
    return DISCOM_MAP.get(s, s)

def feeder_key(discom, substation, feeder):
    return (norm_discom(discom), normalize(substation), normalize(feeder))

print("1. Loading August Workbook...")
wb_aug = openpyxl.load_workbook(AUG_WORKBOOK, read_only=True, data_only=True)
ws_aug = wb_aug['AUDIT DATA']

aug_data = {}
for row in ws_aug.iter_rows(min_row=3, values_only=True):
    if row[0] is None and row[5] is None: continue
    disc = norm_discom(row[0])
    ss = normalize(row[4])
    fdr = normalize(row[5])
    k = feeder_key(disc, ss, fdr)
    
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
print(f"Loaded August data for {len(aug_data)} feeders.")

print("2. Loading Oracle September Data...")
wb_o = openpyxl.load_workbook(ORACLE_XLSX, read_only=True, data_only=True)
ws_o = wb_o['SEP26']

oracle_exact = {}
oracle_df = {}
df_dups = set()

for i, r in enumerate(ws_o.iter_rows(values_only=True)):
    if i == 0: continue
    disc = norm_discom(r[0])
    ss = normalize(r[4])
    fdr = normalize(r[5])
    k = feeder_key(disc, ss, fdr)
    df_k = (disc, fdr)
    
    rec = {
        'total_cons': clean_int(r[7]),
        'bill_cons': clean_int(r[8]),
        'billed': clean_int(r[9]),
        'kwh': clean_num(r[13], 1),
        'ass_rs': clean_num(r[15], 2), # Rs
        'real_rs': clean_num(r[22], 2), # Rs
        'ptw_subs_rs': clean_num(r[18], 2), # Rs
        'tariff_subs_rs': clean_num(r[17], 2), # Rs
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

for d in df_dups:
    del oracle_df[d]

wb_o.close()
print(f"Loaded Oracle September data: {len(oracle_exact)} exact keys, {len(oracle_df)} fallback keys.")

print("3. Loading 26,237 feeders from New Sep Input energy data.xlsx...")
wb_e = openpyxl.load_workbook(ENERGY_XLSX, read_only=True, data_only=True)
ws_e = wb_e['Sheet1']

rows_26237 = []
for i, row in enumerate(ws_e.iter_rows(values_only=True)):
    if i == 0: continue
    if row[9] is True or str(row[9]).upper() == 'TRUE':
        rows_26237.append(row)
wb_e.close()
print(f"Loaded {len(rows_26237)} feeders.")

# Build complete 26,237 feeder records
built_feeders = []
hist_matched = 0
hist_unmatched = 0
sep_oracle_matched = 0

for row in rows_26237:
    discom = norm_discom(row[0])
    zone = normalize(row[1])
    circle = normalize(row[2])
    division = normalize(row[3])
    substation = normalize(row[4])
    feeder_name = str(row[8] or '').strip()
    area = normalize(row[11]) if len(row) > 11 and row[11] else 'RURAL'
    nature = normalize(row[17]) if len(row) > 17 and row[17] else 'OTHER'
    
    ec = clean_num(row[19], 1) if len(row) > 19 else 0.0
    tec = clean_num(row[21], 1) if len(row) > 21 else 0.0
    ie_sep = tec if tec > 0 else ec
    
    k = feeder_key(discom, substation, feeder_name)
    df_k = (discom, normalize(feeder_name))
    
    # 1. Historical Apr-Aug data
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
        hist_unmatched += 1
        ie_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        se_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        ass_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        real_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        ptw_ass_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        ptw_sub_apr_aug = [0.0, 0.0, 0.0, 0.0, 0.0]
        billable_apr_aug = [0, 0, 0, 0, 0]
        
    # 2. September Oracle billing data
    oracle_match = oracle_exact.get(k) or oracle_df.get(df_k)
    if oracle_match:
        sep_oracle_matched += 1
        se_sep = round(oracle_match['kwh'] / 1000.0, 1)
        ass_sep = round(oracle_match['ass_rs'] / 1e5, 2)
        real_sep = round(oracle_match['real_rs'] / 1e5, 2)
        ptw_ass_sep = round(oracle_match['ptw_subs_rs'] / 1e5, 2)
        ptw_sub_sep = round(oracle_match['tariff_subs_rs'] / 1e5, 2)
        billable_sep = oracle_match['bill_cons']
    else:
        se_sep = 0.0
        ass_sep = 0.0
        real_sep = 0.0
        ptw_ass_sep = 0.0
        ptw_sub_sep = 0.0
        billable_sep = 0
        
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
        
    built_feeders.append({
        'discom': discom, 'zone': zone, 'circle': circle, 'division': division,
        'substation': substation, 'feeder': feeder_name, 'area': area, 'nature': nature,
        'ie': ie, 'se': se, 'ass': ass, 'real': real,
        'cons': cons, 'flags': flags, 'ptw_ass': ptw_ass, 'ptw_sub': ptw_sub
    })

print(f"\nBuilt {len(built_feeders)} feeders.")
print(f"Historical matched: {hist_matched}, historical new (Apr-Aug=0): {hist_unmatched}")
print(f"Oracle Sep matched: {sep_oracle_matched} / {len(built_feeders)}")

# Summary Metrics
tot_sep_ie = sum(f['ie'][5] for f in built_feeders) / 1000.0
tot_sep_se = sum(f['se'][5] for f in built_feeders) / 1000.0
tot_sep_ass = sum(f['ass'][5] for f in built_feeders) / 100.0
tot_sep_real = sum(f['real'][5] for f in built_feeders) / 100.0

tot_prog_ie = sum(sum(f['ie']) for f in built_feeders) / 1000.0
tot_prog_se = sum(sum(f['se']) for f in built_feeders) / 1000.0
tot_prog_ass = sum(sum(f['ass']) for f in built_feeders) / 100.0
tot_prog_real = sum(sum(f['real']) for f in built_feeders) / 100.0

print(f"\nSep 2026 Monthly Totals ({len(built_feeders)} feeders):")
print(f"  Input Energy: {tot_sep_ie:.2f} MU")
print(f"  Sold Energy:  {tot_sep_se:.2f} MU")
print(f"  Assessment:   Rs {tot_sep_ass:.2f} Cr")
print(f"  Realization:  Rs {tot_sep_real:.2f} Cr")

print(f"\nProgressive (Apr-Sep) Totals ({len(built_feeders)} feeders):")
print(f"  Input Energy: {tot_prog_ie:.2f} MU")
print(f"  Sold Energy:  {tot_prog_se:.2f} MU")
print(f"  Assessment:   Rs {tot_prog_ass:.2f} Cr")
print(f"  Realization:  Rs {tot_prog_real:.2f} Cr")
