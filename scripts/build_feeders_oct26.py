import json
import os
import re
import csv
import sys
import openpyxl
from html.parser import HTMLParser

sys.stdout.reconfigure(encoding='utf-8')

REPO_DIR      = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
BACKUP_JSON   = r"C:\Users\HP\.gemini\antigravity\brain\3a1f71b5-7420-451d-82f6-5187ac767485\scratch\feeders_sep26_backup.json"
ORACLE_XLSX   = r"C:\Users\HP\Downloads\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_OCT26 (1)\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_OCT26.xlsx"
ENERGY_HTML   = r"C:\Users\HP\Downloads\DistributionMasterMeterDataReportExcel_202611251124032315.xls"
DIV_MASTER    = r"D:\MASTER DATA\division_master_final_30.06.2025.csv"
PTW_POS_JSON  = r"C:\Users\HP\.gemini\antigravity\brain\3a1f71b5-7420-451d-82f6-5187ac767485\scratch\oct26_ptw_pos.json"

def norm(s):
    return re.sub(r'[^A-Z0-9]', '', str(s or '').strip().upper())

def fcode(s):
    m = re.search(r'([A-Z0-9]{10,})$', str(s or '').strip().upper())
    return m.group(1) if m else ''

def clean_num(val, digits=2):
    if val is None or val == '' or str(val).strip() in ('', '-', 'None', 'N/A'):
        return 0.0
    try:
        return round(float(str(val).replace(',', '')), digits)
    except:
        return 0.0

def clean_int(val):
    if val is None or val == '' or str(val).strip() in ('', '-', 'None', 'N/A'):
        return 0
    try:
        return int(round(float(str(val).replace(',', ''))))
    except:
        return 0

DISCOM_TO_SHORT = {
    'PASCHIMANCHAL': 'PVVNL',
    'DAKSHINANCHAL': 'DVVNL',
    'MADHYANCHAL':   'MVVNL',
    'POORVANCHAL':   'PUVVNL',
    'KESCO':         'KESCO'
}

def norm_oracle_disc(s):
    u = norm(s)
    if u in ('PUVNL', 'PUVVNL', 'POORVANCHAL'): return 'PUVVNL'
    if u in ('PVVNL', 'PASCHIMANCHAL'): return 'PVVNL'
    if u in ('DVVNL', 'DAKSHINANCHAL'): return 'DVVNL'
    if u in ('MVVNL', 'MADHYANCHAL'): return 'MVVNL'
    if 'KESCO' in u: return 'KESCO'
    return u

print("=" * 75)
print("UPPCL 11KV FEEDER AUDIT — EXTENDING TO OCTOBER 2026 (FULL ACTIVE UNIVERSE)")
print("=" * 75)

# 1. Verify Division Master CSV
dm_divs = {}
with open(DIV_MASTER, 'r', encoding='utf-8', errors='ignore') as f:
    for r in list(csv.reader(f))[1:]:
        if len(r) >= 6:
            dm_divs[norm(r[4])] = (norm_oracle_disc(r[1]), r[2].strip().upper(), r[3].strip().upper(), r[4].strip().upper())
print(f"1. Loaded {len(dm_divs)} normalized divisions from Division Master CSV.")

# 2. Load 6-Month Baseline (26,237 feeders)
with open(BACKUP_JSON, 'r', encoding='utf-8') as f:
    baseline = json.load(f)

N = baseline['d']
R = baseline['rows']
assert len(R) == 26237, f"Expected 26237 rows, got {len(R)}"
print(f"2. Loaded 26,237 baseline feeders (Apr-Sep 2026).")

# Build reverse lookup maps for dimensions
def build_idx_map(lst):
    return {s.strip().upper(): i for i, s in enumerate(lst)}

d_map    = build_idx_map(N['Discom'])
z_map    = build_idx_map(N['Zone'])
c_map    = build_idx_map(N['Circle'])
div_map  = build_idx_map(N['Division'])
a_map    = build_idx_map(N['Area'])
n_map    = build_idx_map(N['Nature'])
ss_map   = build_idx_map(N['SS'])

def get_or_add(val, lst, mp):
    s = str(val or '').strip().upper() or 'UNKNOWN'
    if s not in mp:
        mp[s] = len(lst)
        lst.append(s)
    return mp[s]

def normalize_area(a):
    u = str(a or '').strip().upper()
    if 'TEHSIL' in u: return 'TEHSIL'
    if 'RURAL' in u: return 'RURAL'
    return 'URBAN'

def normalize_nature(n):
    u = str(n or '').strip().upper()
    for valid in N['Nature']:
        if valid == u: return valid
    for valid in N['Nature']:
        if valid in u: return valid
    return 'OTHER'

# 3. Parse Input Energy HTML Report (OCT-26)
class EnergyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.curr = []
        self.cell = ''
        self.in_cell = False
        self.hdr = False
    def handle_starttag(self, t, a):
        if t == 'tr': self.curr = []
        elif t in ('td', 'th'): self.in_cell = True; self.cell = ''
    def handle_endtag(self, t):
        if t == 'tr':
            if len(self.curr) >= 20:
                if not self.hdr:
                    if self.curr[0].strip() == 'Sr.No.':
                        self.hdr = True
                else:
                    self.rows.append(self.curr)
            self.curr = []
        elif t in ('td', 'th'):
            self.curr.append(self.cell.strip())
            self.in_cell = False
    def handle_data(self, data):
        if self.in_cell: self.cell += data

print("3. Parsing October 2026 Input Energy HTML report...")
parser = EnergyHTMLParser()
with open(ENERGY_HTML, 'r', encoding='latin-1', errors='replace') as f:
    for chunk in iter(lambda: f.read(65536), ''):
        parser.feed(chunk)

oct_outgoing_rows = []
e_dsf, e_df, e_sf, e_f, e_fc = {}, {}, {}, {}, {}
for row in parser.rows:
    outgoing = row[9].strip()
    if not outgoing:
        continue
    mon = row[6].strip().lower()
    if mon and 'october' not in mon:
        continue
    div = norm(row[4]); ss = norm(row[5]); fdr = norm(outgoing); fc = fcode(outgoing)
    total_ie = clean_num(row[20], 2)
    ec = clean_num(row[18], 2)
    val = total_ie if total_ie > 0 else ec
    
    oct_outgoing_rows.append((row, val))
    e_dsf[div+ss+fdr] = e_dsf.get(div+ss+fdr, 0.0) + val
    e_df[div+fdr] = e_df.get(div+fdr, 0.0) + val
    e_sf[ss+fdr] = e_sf.get(ss+fdr, 0.0) + val
    e_f[fdr] = e_f.get(fdr, 0.0) + val
    if fc:
        e_fc[fc] = e_fc.get(fc, 0.0) + val
print(f"   Indexed {len(oct_outgoing_rows)} outgoing feeder rows from Energy HTML report.")

# 4. Parse Oracle OCT26 XLSX
print("4. Parsing Oracle OCT26 XLSX (116,822 rows)...")
wb = openpyxl.load_workbook(ORACLE_XLSX, read_only=True, data_only=True)
ws = wb['OCT26']

ora_ddsf, ora_ddf, ora_ddcode = {}, {}, {}
ora_dsf, ora_df, ora_dcode = {}, {}, {}

def add_ora(mp, key, vals):
    if key not in mp:
        mp[key] = {'cons': 0, 'se_kwh': 0.0, 'ass_rs': 0.0, 'ptw_sub_rs': 0.0, 'real_rs': 0.0}
    e = mp[key]
    e['cons'] += vals[0]
    e['se_kwh'] += vals[1]
    e['ass_rs'] += vals[2]
    e['ptw_sub_rs'] += vals[3]
    e['real_rs'] += vals[4]

for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0] is None:
        continue
    disc = norm_oracle_disc(row[0])
    div = norm(row[3])
    ss = norm(row[4])
    fdr = norm(row[5])
    fc = fcode(row[5])
    
    bc = clean_int(row[7])          # Col 7: BILL_CONS
    se_kwh = clean_num(row[10], 2)  # Col 10: CONSUMPTION <=3000/LOAD
    ass_rs = clean_num(row[14], 2)  # Col 14: ASSESSMENT (CA_EX_SUBS)
    ptw_rs = clean_num(row[17], 2)  # Col 17: PTW_SUBS
    real_rs = clean_num(row[21], 2) # Col 21: REALIZATION
    
    vals = (bc, se_kwh, ass_rs, ptw_rs, real_rs)
    add_ora(ora_ddsf, disc+div+ss+fdr, vals)
    add_ora(ora_ddf, disc+div+fdr, vals)
    add_ora(ora_dsf, disc+ss+fdr, vals)
    add_ora(ora_df, disc+fdr, vals)
    if fc:
        add_ora(ora_ddcode, disc+div+fc, vals)
        add_ora(ora_dcode, disc+fc, vals)

wb.close()
print("   Oracle OCT26 indexed.")

# 5. Load PTW_CA_EX_SUBS (positive CA_EX_SUBS where PTW_SUBS > 0 from OCT_2026 CM)
print("5. Loading PTW Assessment from OCT_2026 Consumer Master extract...")
with open(PTW_POS_JSON, 'r', encoding='utf-8') as f:
    ptw_list = json.load(f)

ptw_ddsf, ptw_ddf, ptw_dsf, ptw_df, ptw_dcode = {}, {}, {}, {}, {}
for p in ptw_list:
    disc = norm_oracle_disc(p['discom'])
    div = norm(p['division'])
    ss = norm(p['ss'])
    fdr = norm(p['fdr'])
    fc = fcode(p['fdr'])
    val = float(p['ptw_ass'] or 0.0)
    if val <= 0:
        continue
    ptw_ddsf[disc+div+ss+fdr] = ptw_ddsf.get(disc+div+ss+fdr, 0.0) + val
    ptw_ddf[disc+div+fdr] = ptw_ddf.get(disc+div+fdr, 0.0) + val
    ptw_dsf[disc+ss+fdr] = ptw_dsf.get(disc+ss+fdr, 0.0) + val
    ptw_df[disc+fdr] = ptw_df.get(disc+fdr, 0.0) + val
    if fc:
        ptw_dcode[disc+fc] = ptw_dcode.get(disc+fc, 0.0) + val

# 6A. Extend all 26,237 baseline feeders to Month 6 (Oct-2026)
print("6. Extending 26,237 baseline feeders + adding new/energized Oct-26 feeders...")
matched_ie = 0
matched_ora = 0
matched_ptw = 0
new_rows = []

seen_baseline_keys = set()
seen_baseline_fcodes = set()

for r in R:
    disc_full = N['Discom'][r[0]]
    disc = DISCOM_TO_SHORT.get(disc_full, disc_full)
    div = norm(N['Division'][r[3]])
    ss = norm(N['SS'][r[4]])
    fdr_raw = r[5]
    fdr = norm(fdr_raw)
    fc = fcode(fdr_raw)
    
    seen_baseline_keys.add(norm(disc_full) + fdr)
    if fc:
        seen_baseline_fcodes.add(fc)
    
    # Match IE
    ie_oct = None
    for k, mp in [(div+ss+fdr, e_dsf), (div+fdr, e_df), (ss+fdr, e_sf), (fdr, e_f)]:
        if k in mp:
            ie_oct = mp[k]
            break
    if ie_oct is None and fc and fc in e_fc:
        ie_oct = e_fc[fc]
    if ie_oct is not None:
        matched_ie += 1
        ie_oct = round(ie_oct, 2)
    else:
        ie_oct = 0.0
        
    # Match Oracle
    ora_m = (
        ora_ddsf.get(disc+div+ss+fdr)
        or ora_ddf.get(disc+div+fdr)
        or ora_dsf.get(disc+ss+fdr)
        or ora_df.get(disc+fdr)
        or (ora_ddcode.get(disc+div+fc) if fc else None)
        or (ora_dcode.get(disc+fc) if fc else None)
    )
    if ora_m:
        matched_ora += 1
        cons_oct = int(ora_m['cons'])
        se_oct   = round(ora_m['se_kwh'] / 1000.0, 2)
        ass_oct  = round(ora_m['ass_rs'] / 1e5, 2)
        real_oct = round(ora_m['real_rs'] / 1e5, 2)
        ptw_sub_oct = round(ora_m['ptw_sub_rs'] / 1e5, 2)
    else:
        cons_oct = 0; se_oct = 0.0; ass_oct = 0.0; real_oct = 0.0; ptw_sub_oct = 0.0
        
    # Match PTW_Ass
    ptw_ass_raw = (
        ptw_ddsf.get(disc+div+ss+fdr)
        or ptw_ddf.get(disc+div+fdr)
        or ptw_dsf.get(disc+ss+fdr)
        or ptw_df.get(disc+fdr)
        or (ptw_dcode.get(disc+fc) if fc else 0.0)
        or 0.0
    )
    if ptw_ass_raw > 0:
        matched_ptw += 1
    ptw_ass_oct = round(min(ptw_ass_raw, ass_oct), 2) if ass_oct > 0 else 0.0
    
    ie_arr      = [round(float(x), 2) for x in r[8][:6]] + [ie_oct]
    se_arr      = [round(float(x), 2) for x in r[9][:6]] + [se_oct]
    ass_arr     = [round(float(x), 2) for x in r[10][:6]] + [ass_oct]
    real_arr    = [round(float(x), 2) for x in r[11][:6]] + [real_oct]
    ptw_ass_arr = [round(float(x), 2) for x in r[14][:6]] + [ptw_ass_oct]
    ptw_sub_arr = [round(float(x), 2) for x in r[15][:6]] + [ptw_sub_oct]
    
    cons_cur = cons_oct
    tot_ie = sum(ie_arr); tot_se = sum(se_arr)
    flags = 0
    if tot_ie > 0:
        ll_pct = ((tot_ie - tot_se) / tot_ie) * 100.0
        if ll_pct < 0 or ll_pct > 100: flags |= 1
        if tot_se > tot_ie: flags |= 2
    else:
        flags |= 4
    if cons_cur == 0:
        flags |= 8
        
    new_rows.append([
        r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7],
        ie_arr, se_arr, ass_arr, real_arr,
        cons_cur, flags, ptw_ass_arr, ptw_sub_arr
    ])

# 6B. Append the 418 new/energized October feeders from DistributionMasterMeterDataReportExcel
added_extra = 0
extra_matched_ora = 0
for row, ie_val in oct_outgoing_rows:
    disc_full = row[1].strip().upper()
    out_raw = row[9].strip()
    fdr = norm(out_raw)
    fc = fcode(out_raw)
    if (norm(disc_full) + fdr) in seen_baseline_keys or (fc and fc in seen_baseline_fcodes):
        continue
        
    added_extra += 1
    disc = DISCOM_TO_SHORT.get(disc_full, disc_full)
    zone_raw = row[2].strip().upper()
    circle_raw = row[3].strip().upper()
    div_raw = row[4].strip().upper()
    ss_raw = row[5].strip().upper()
    area_raw = normalize_area(row[10] if len(row) > 10 else '')
    nature_raw = normalize_nature(row[16] if len(row) > 16 else '')
    
    d_idx   = get_or_add(disc_full, N['Discom'], d_map)
    z_idx   = get_or_add(zone_raw, N['Zone'], z_map)
    c_idx   = get_or_add(circle_raw, N['Circle'], c_map)
    div_idx = get_or_add(div_raw, N['Division'], div_map)
    ss_idx  = get_or_add(ss_raw, N['SS'], ss_map)
    a_idx   = get_or_add(area_raw, N['Area'], a_map)
    n_idx   = get_or_add(nature_raw, N['Nature'], n_map)
    
    div = norm(div_raw); ss = norm(ss_raw)
    ora_m = (
        ora_ddsf.get(disc+div+ss+fdr)
        or ora_ddf.get(disc+div+fdr)
        or ora_dsf.get(disc+ss+fdr)
        or ora_df.get(disc+fdr)
        or (ora_ddcode.get(disc+div+fc) if fc else None)
        or (ora_dcode.get(disc+fc) if fc else None)
    )
    if ora_m:
        extra_matched_ora += 1
        cons_oct = int(ora_m['cons'])
        se_oct   = round(ora_m['se_kwh'] / 1000.0, 2)
        ass_oct  = round(ora_m['ass_rs'] / 1e5, 2)
        real_oct = round(ora_m['real_rs'] / 1e5, 2)
        ptw_sub_oct = round(ora_m['ptw_sub_rs'] / 1e5, 2)
    else:
        cons_oct = 0; se_oct = 0.0; ass_oct = 0.0; real_oct = 0.0; ptw_sub_oct = 0.0
        
    ptw_ass_raw = (
        ptw_ddsf.get(disc+div+ss+fdr)
        or ptw_ddf.get(disc+div+fdr)
        or ptw_dsf.get(disc+ss+fdr)
        or ptw_df.get(disc+fdr)
        or (ptw_dcode.get(disc+fc) if fc else 0.0)
        or 0.0
    )
    ptw_ass_oct = round(min(ptw_ass_raw, ass_oct), 2) if ass_oct > 0 else 0.0
    
    ie_oct = round(ie_val, 2)
    ie_arr      = [0.0]*6 + [ie_oct]
    se_arr      = [0.0]*6 + [se_oct]
    ass_arr     = [0.0]*6 + [ass_oct]
    real_arr    = [0.0]*6 + [real_oct]
    ptw_ass_arr = [0.0]*6 + [ptw_ass_oct]
    ptw_sub_arr = [0.0]*6 + [ptw_sub_oct]
    
    cons_cur = cons_oct
    flags = 0
    if ie_oct > 0:
        ll_pct = ((ie_oct - se_oct) / ie_oct) * 100.0
        if ll_pct < 0 or ll_pct > 100: flags |= 1
        if se_oct > ie_oct: flags |= 2
    else:
        flags |= 4
    if cons_cur == 0:
        flags |= 8
        
    new_rows.append([
        d_idx, z_idx, c_idx, div_idx, ss_idx, out_raw, a_idx, n_idx,
        ie_arr, se_arr, ass_arr, real_arr,
        cons_cur, flags, ptw_ass_arr, ptw_sub_arr
    ])

print(f"   Total Feeders: {len(new_rows)} (26,237 Sep baseline + {added_extra} newly active/added Oct feeders)")
print(f"   Extra feeders matched in Oracle OCT26: {extra_matched_ora}")

out_data = {'d': N, 'rows': new_rows}
for folder in ['data', 'frontend/data']:
    target = os.path.join(REPO_DIR, folder, 'feeders.json')
    with open(target, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, separators=(',', ':'))
    print(f"Wrote {target} ({os.path.getsize(target)/1024/1024:.2f} MB)")

# Verify Discom distribution
from collections import Counter
dc = Counter(N['Discom'][r[0]] for r in new_rows)
print("\n=== DISCOM FEEDER COUNTS (OCT-26) ===")
for k, v in sorted(dc.items()):
    print(f"  {k:<15}: {v:,}")

oct_ie = sum(r[8][6] for r in new_rows) / 1000.0
oct_se = sum(r[9][6] for r in new_rows) / 1000.0
oct_ass = sum(r[10][6] for r in new_rows) / 100.0
oct_real = sum(r[11][6] for r in new_rows) / 100.0
prog_ie = sum(sum(r[8]) for r in new_rows) / 1000.0
prog_se = sum(sum(r[9]) for r in new_rows) / 1000.0

print("\n=== OCT-26 SINGLE MONTH TOTALS ===")
print(f"  Input Energy: {oct_ie:,.2f} MU | Sold Energy: {oct_se:,.2f} MU | Line Loss: {100-(oct_se/oct_ie*100):.2f}%")
print(f"  Assessment: Rs {oct_ass:,.2f} Cr | Realization: Rs {oct_real:,.2f} Cr")
print("\n=== APR-OCT PROGRESSIVE TOTALS ===")
print(f"  Input Energy: {prog_ie:,.2f} MU | Sold Energy: {prog_se:,.2f} MU | Line Loss: {100-(prog_se/prog_ie*100):.2f}%")
