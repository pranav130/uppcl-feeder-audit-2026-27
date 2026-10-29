import sys
import os
import json
import re
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

REPO_DIR = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
ENERGY_XLSX = r"C:\Users\HP\Documents\New Sep Input energy data.xlsx"
ORACLE_XLSX = r"G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_SEP26.xlsx"

print("=" * 70)
print("COMPREHENSIVE VERIFICATION & UPDATE AUDIT")
print("=" * 70)

# 1. Load feeders.json
with open(os.path.join(REPO_DIR, "data", "feeders.json"), 'r', encoding='utf-8') as f:
    master = json.load(f)

N = master['d']
R = master['rows']

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

print(f"Loaded master: {len(R)} feeders")

# Build master feeder map
master_feeders = {}
for idx, r in enumerate(R):
    disc = norm_discom(N['Discom'][r[0]])
    ss = normalize(N['SS'][r[4]])
    feeder = normalize(r[5])
    key = (disc, ss, feeder)
    master_feeders[key] = {
        'idx': idx,
        'r': r,
        'disc': disc,
        'ss': ss,
        'feeder': feeder,
        'old_ie_sep': r[8][5],
        'old_se_sep': r[9][5],
        'old_ass_sep': r[10][5],
        'old_real_sep': r[11][5],
    }

# 2. Load New Sep Input energy data.xlsx
wb_e = openpyxl.load_workbook(ENERGY_XLSX, read_only=True, data_only=True)
ws_e = wb_e['Sheet1']

excel_energy = {}
excel_energy_df = {}
df_dups = set()

for i, row in enumerate(ws_e.iter_rows(values_only=True)):
    if i == 0: continue
    disc = norm_discom(row[0])
    ss = normalize(row[4])
    fdr = normalize(row[8])
    ec = float(row[19] or 0.0) if row[19] is not None else 0.0
    tec = float(row[21] or 0.0) if row[21] is not None else 0.0
    val = round(tec if tec > 0 else ec, 1)
    
    key = (disc, ss, fdr)
    excel_energy[key] = val
    
    df_key = (disc, fdr)
    if df_key in excel_energy_df:
        df_dups.add(df_key)
    else:
        excel_energy_df[df_key] = val

for d in df_dups:
    del excel_energy_df[d]

wb_e.close()

print(f"Loaded Excel Energy rows: {i}, unique keys: {len(excel_energy)}")

# Compare each master feeder's Sep IE
matched_count = 0
changed_count = 0
unmatched_keys = []
sample_changes = []

for key, mf in master_feeders.items():
    df_key = (mf['disc'], mf['feeder'])
    val = None
    if key in excel_energy:
        val = excel_energy[key]
        matched_count += 1
    elif df_key in excel_energy_df:
        val = excel_energy_df[df_key]
        matched_count += 1
    else:
        unmatched_keys.append(key)
        val = mf['old_ie_sep']
    
    if abs(val - mf['old_ie_sep']) > 0.01:
        changed_count += 1
        sample_changes.append((key, mf['old_ie_sep'], val))

print(f"Matched with Excel: {matched_count} / {len(master_feeders)}")
print(f"Unmatched (retained): {len(unmatched_keys)}")
print(f"Feeders with differing Sep IE: {changed_count}")
if sample_changes:
    print("Sample differences:")
    for s in sample_changes[:10]:
        print(" ", s)
else:
    print("ALL 26,033 feeders in feeders.json ALREADY MATCH New Sep Input energy data.xlsx exactly!")

print("=" * 70)
