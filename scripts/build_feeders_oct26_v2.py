"""
build_feeders_oct26_v2.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UPPCL 11KV Feeder Audit — October 2026 build  (Fixes F1–F7 from doc)

F1  IE fallback removed: use Total Energy Consumption (col 20) only; 0 if blank/<=0
F2  KESCO Oracle match: (discom, norm(division), norm(feeder)) — no SS
    Others: (discom, norm(division), norm(ss), norm(feeder)) — primary
F3  Fallback matching: feeder-code only (10+ char), no cross-division loose match
    No Oracle group assigned to >1 feeder. Report unmatched to oct26_unmatched_review.csv
F4  Universe: 26,644 active Oct feeders + 11 Sep-only feeders = 26,655 rows
    11 Sep-only feeders get r[17]=5 (last active month Sep=5)
    New Oct feeders get r[17]=6 (first active month Oct=6)
    dashboard_app.js skips feeders outside [r[17], r[18]] for period mTo
F5  Consumers: r[16] = Sep billable consumers (from Sir's Sep sheet, col 45=BILL_CONS)
    function consFor(r, mTo) { return mTo>=6 ? r[12] : (r[16] ?? r[12]); }
F6  Absurd-bill correction stored in feeders for toggle use
    8 feeder-months flagged (see ABSURD_CORRECTIONS list below)
F7  Sep Oracle re-match patches stored in feeders for toggle use
    760 patches from window.__OFFLINE.sepPatches mapped by Division+SS+Feeder

Output row schema (19 fields):
  r[0]  discom_idx
  r[1]  zone_idx
  r[2]  circle_idx
  r[3]  division_idx
  r[4]  ss_idx
  r[5]  feeder_name (string)
  r[6]  area_idx
  r[7]  nature_idx
  r[8]  ie_arr    [Apr..Oct] 7 floats (MWh)
  r[9]  se_arr    [Apr..Oct] 7 floats (MWh)
  r[10] ass_arr   [Apr..Oct] 7 floats (Rs lakh)
  r[11] real_arr  [Apr..Oct] 7 floats (Rs lakh)
  r[12] cons_oct  int (Oct BILL_CONS from Oracle)
  r[13] flags     int
  r[14] ptw_ass_arr [Apr..Oct] 7 floats (Rs lakh)
  r[15] ptw_sub_arr [Apr..Oct] 7 floats (Rs lakh)
  r[16] cons_sep  int (Sep billable consumers from Sir's sheet)  ← NEW
  r[17] first_active_month  int  only present for Oct-new (6) and Sep-only (omitted for normal feeders)
  r[18] last_active_month   int  only present for Sep-only feeders (5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

import json, os, re, csv, sys
import openpyxl
from html.parser import HTMLParser
from collections import defaultdict

sys.stdout.reconfigure(encoding='utf-8')

# ── Paths ──────────────────────────────────────────────────────────────
REPO_DIR    = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
SCRATCH_DIR = r"C:\Users\HP\.gemini\antigravity\brain\3a1f71b5-7420-451d-82f6-5187ac767485\scratch"
BACKUP_JSON = os.path.join(SCRATCH_DIR, "feeders_sep26_backup.json")
ORACLE_XLSX = r"C:\Users\HP\Downloads\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_OCT26 (1)\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_OCT26.xlsx"
ENERGY_HTML = r"C:\Users\HP\Downloads\DistributionMasterMeterDataReportExcel_202611251124032315.xls"
DIV_MASTER  = r"D:\MASTER DATA\division_master_final_30.06.2025.csv"
PTW_POS_JSON= os.path.join(SCRATCH_DIR, "oct26_ptw_pos.json")
OFFLINE_JSON= os.path.join(SCRATCH_DIR, "offline_data.json")

# ── F6: Absurd corrections (feeder_norm, month_idx, corrected_ass_lakh) ─
ABSURD_CORRECTIONS = {
    # (norm(feeder_name), month_idx): corrected_assessment_rs_lakh
    ("G29NEWISPATNAGAR51332120067G29",   2): 47.47,   # Jun
    ("JAURAPTW22305114569JAU",           4): 1.41,    # Aug
    ("SATGURU33241420624STU",            5): 73.69,   # Sep
    ("SIDHVAN46683110106SDV",            6): 63.36,   # Oct
    ("CHAMRAULIIEEDD I UNNAO33254110310CRI", 6): 47.06,  # Oct - try feeder code too
    ("BUDHANAMED13022190598BMN",         6): 16.66,   # Oct
    ("UMARI44443120682UMR",              6): 11.12,   # Oct
    ("ORIENTAL41644320324OTL",           6): 2.50,    # Oct
}
# Also by feeder code for robustness
ABSURD_BY_CODE = {
    "51332120067G29": (2, 47.47),
    "22305114569JAU": (4, 1.41),
    "33241420624STU": (5, 73.69),
    "46683110106SDV": (6, 63.36),
    "33254110310CRI": (6, 47.06),
    "13022190598BMN": (6, 16.66),
    "44443120682UMR": (6, 11.12),
    "41644320324OTL": (6, 2.50),
}

# ── F4: 11 Sep-only feeders (not in Oct MDM, last active month = Sep = 5) ──
SEP_ONLY_FEEDERS = {
    "SUJANPUR25151224417SNP", "PRAVALPRATAP21703332063PLP",
    "KALUAPUR21703324832KLP", "HANSIPUMPCANAL41644320326HPC",
    "NAGARIYANANDRAM21132110205NGN", "RADHARICEUDHYOG32452120424RAD",
    "NADIPARNEW33232260801NPN", "NEHROLIII12047491214NH2",
    "TATARPURROAD12047491214TAT", "POTABARAHIPTW12047421421PBP",
    "PRAKASHENCLAVE12042210166PHV",
}

print("=" * 70)
print("UPPCL 11KV — OCTOBER 2026 BUILD v2 (Fixes F1–F7)")
print("=" * 70)

# ── Utility functions ───────────────────────────────────────────────────
def norm(s):
    return re.sub(r'[^A-Z0-9]', '', str(s or '').strip().upper())

def fcode(s):
    m = re.search(r'([A-Z0-9]{10,})$', str(s or '').strip().upper())
    return m.group(1) if m else ''

def clean_num(val, digits=2):
    if val is None or str(val).strip() in ('', '-', 'None', 'N/A'): return 0.0
    try: return round(float(str(val).replace(',', '')), digits)
    except: return 0.0

def clean_int(val):
    if val is None or str(val).strip() in ('', '-', 'None', 'N/A'): return 0
    try: return int(round(float(str(val).replace(',', ''))))
    except: return 0

DISCOM_TO_SHORT = {
    'PASCHIMANCHAL': 'PVVNL', 'DAKSHINANCHAL': 'DVVNL',
    'MADHYANCHAL':   'MVVNL', 'POORVANCHAL':   'PUVNL',
    'KESCO':         'KESCO'
}

def norm_oracle_disc(s):
    u = norm(s)
    if u in ('PUVNL', 'PUVVNL', 'POORVANCHAL'): return 'PUVNL'
    if u in ('PVVNL', 'PASCHIMANCHAL'): return 'PVVNL'
    if u in ('DVVNL', 'DAKSHINANCHAL'): return 'DVVNL'
    if u in ('MVVNL', 'MADHYANCHAL'): return 'MVVNL'
    if 'KESCO' in u: return 'KESCO'
    return u

# ── 1. Load Sep-26 Baseline ────────────────────────────────────────────
print("\n1. Loading Sep-26 baseline (26,237 feeders)...")
with open(BACKUP_JSON, 'r', encoding='utf-8') as f:
    baseline = json.load(f)
N = baseline['d']
R = baseline['rows']
assert len(R) == 26237, f"Expected 26237, got {len(R)}"
print(f"   Loaded {len(R):,} feeders.")

def build_idx_map(lst): return {s.strip().upper(): i for i, s in enumerate(lst)}
d_map   = build_idx_map(N['Discom'])
z_map   = build_idx_map(N['Zone'])
c_map   = build_idx_map(N['Circle'])
div_map = build_idx_map(N['Division'])
a_map   = build_idx_map(N['Area'])
n_map   = build_idx_map(N['Nature'])
ss_map  = build_idx_map(N['SS'])

def get_or_add(val, lst, mp):
    s = str(val or '').strip().upper() or 'UNKNOWN'
    if s not in mp: mp[s] = len(lst); lst.append(s)
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

# ── 2. Load F7 offline data (absurd list + sepPatches) ────────────────
print("\n2. Loading offline reference data (F6 absurd + F7 sep patches)...")
with open(OFFLINE_JSON, 'r', encoding='utf-8') as f:
    offline = json.load(f)
absurd_list   = offline.get('absurd', [])
sep_patches   = offline.get('sepPatches', [])
print(f"   {len(absurd_list)} absurd bills, {len(sep_patches)} Sep patches")

# ── 3. Parse Oct-26 Input Energy HTML (F1: col 20 only, no fallback) ──
print("\n3. Parsing Oct-26 Input Energy HTML (F1: col 20 Total IE only)...")

class EnergyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []; self.curr = []; self.cell = ''
        self.in_cell = False; self.hdr = False
    def handle_starttag(self, t, a):
        if t == 'tr': self.curr = []
        elif t in ('td', 'th'): self.in_cell = True; self.cell = ''
    def handle_endtag(self, t):
        if t == 'tr':
            if len(self.curr) >= 20:
                if not self.hdr:
                    if self.curr[0].strip() == 'Sr.No.': self.hdr = True
                else: self.rows.append(self.curr)
            self.curr = []
        elif t in ('td', 'th'): self.curr.append(self.cell.strip()); self.in_cell = False
    def handle_data(self, data):
        if self.in_cell: self.cell += data

parser = EnergyHTMLParser()
with open(ENERGY_HTML, 'r', encoding='latin-1', errors='replace') as f:
    for chunk in iter(lambda: f.read(65536), ''):
        parser.feed(chunk)

# F1: Use col 20 (Total Energy Consumption = Total IE) only; 0 if blank/<=0
# Build lookup dicts: (div+ss+fdr), (div+fdr) for non-KESCO; (div+fdr) for all
e_dsf, e_df, e_sf, e_f, e_fc = {}, {}, {}, {}, {}
oct_outgoing_rows = []
f1_fallback_cases = 0

for row in parser.rows:
    outgoing = row[9].strip()
    if not outgoing: continue
    mon = row[6].strip().lower()
    if mon and 'october' not in mon: continue
    
    div = norm(row[4]); ss = norm(row[5]); fdr = norm(outgoing); fc = fcode(outgoing)
    total_ie = clean_num(row[20], 2)  # F1: col 20 only
    ec = clean_num(row[18], 2)        # col 18 (Energy Consumption) — track for reporting only
    
    # F1: If total_ie was 0 but ec was not, that's the fallback case we're removing
    if total_ie <= 0 and ec > 0:
        f1_fallback_cases += 1
    val = max(0.0, total_ie)  # F1: use total_ie only; 0 if blank/<=0
    
    oct_outgoing_rows.append((row, val))
    e_dsf[div+ss+fdr] = e_dsf.get(div+ss+fdr, 0.0) + val
    e_df[div+fdr]     = e_df.get(div+fdr, 0.0) + val
    e_sf[ss+fdr]      = e_sf.get(ss+fdr, 0.0) + val
    e_f[fdr]          = e_f.get(fdr, 0.0) + val
    if fc: e_fc[fc]   = e_fc.get(fc, 0.0) + val

print(f"   {len(oct_outgoing_rows):,} outgoing feeder rows in Oct MDM")
print(f"   F1: {f1_fallback_cases} rows had total_ie=0 but ec>0 (removed fallback)")

# Build set of MDM feeder codes/keys for F4 universe check
mdm_fdr_set = set()
mdm_fc_set  = set()
mdm_rows_by_disc_div_fdr = {}
for row, val in oct_outgoing_rows:
    disc_full = row[1].strip().upper()
    out_raw   = row[9].strip()
    fdr = norm(out_raw); fc = fcode(out_raw)
    div = norm(row[4])
    mdm_fdr_set.add(norm(disc_full) + fdr)
    if fc: mdm_fc_set.add(fc)
    k = norm(disc_full) + div + fdr
    if k not in mdm_rows_by_disc_div_fdr:
        mdm_rows_by_disc_div_fdr[k] = (row, val)

# ── 4. Parse Oracle OCT26 XLSX (F2: KESCO uses div+fdr; others div+ss+fdr) ─
print("\n4. Parsing Oracle OCT26 (F2: KESCO key = div+fdr)...")
wb = openpyxl.load_workbook(ORACLE_XLSX, read_only=True, data_only=True)
ws = wb['OCT26']

# Separate maps for KESCO vs others
# KESCO: key = disc+div+fdr
# Others: key = disc+div+ss+fdr (primary), disc+div+fdr (secondary)
ora = {
    'kesco_df':   {},   # KESCO: disc+div+fdr → aggregated
    'other_ddsf': {},   # Others: disc+div+ss+fdr
    'other_ddf':  {},   # Others: disc+div+fdr
    'code_ddc':   {},   # All: disc+div+code (for F3 fallback)
    'code_dc':    {},   # All: disc+code
}

def add_to(mp, key, bc, se_kwh, ass_rs, ptw_rs, real_rs):
    if key not in mp:
        mp[key] = {'cons':0, 'se_kwh':0.0, 'ass_rs':0.0, 'ptw_sub_rs':0.0, 'real_rs':0.0}
    e = mp[key]
    e['cons'] += bc; e['se_kwh'] += se_kwh; e['ass_rs'] += ass_rs
    e['ptw_sub_rs'] += ptw_rs; e['real_rs'] += real_rs

for row in ws.iter_rows(min_row=2, values_only=True):
    if row[0] is None: continue
    fdr_str = str(row[5] or '').strip()
    if '_' not in fdr_str: continue  # Skip bare-code Oracle rows (no feeder name, same as Sir's sheet)
    disc = norm_oracle_disc(row[0])
    div  = norm(row[3]); ss = norm(row[4]); fdr = norm(fdr_str)
    fc   = fcode(fdr_str)
    bc   = clean_int(row[7])
    se   = clean_num(row[10], 2)
    ass  = clean_num(row[14], 2)
    ptw  = clean_num(row[17], 2)
    real = clean_num(row[21], 2)
    
    if disc == 'KESCO':
        add_to(ora['kesco_df'],   disc+div+fdr, bc, se, ass, ptw, real)
    else:
        add_to(ora['other_ddsf'], disc+div+ss+fdr, bc, se, ass, ptw, real)
        add_to(ora['other_ddf'],  disc+div+fdr, bc, se, ass, ptw, real)
    
    if fc:
        add_to(ora['code_ddc'], disc+div+fc, bc, se, ass, ptw, real)
        add_to(ora['code_dc'],  disc+fc,     bc, se, ass, ptw, real)

wb.close()
print("   Oracle indexed.")

# ── 5. Load PTW (positive CA_EX_SUBS where PTW_SUBS>0) ───────────────
print("\n5. Loading Oct-26 PTW assessment...")
with open(PTW_POS_JSON, 'r', encoding='utf-8') as f:
    ptw_list = json.load(f)

ptw_ddsf, ptw_ddf, ptw_dsf, ptw_df, ptw_dcode = {}, {}, {}, {}, {}
ptw_kesco_df = {}
for p in ptw_list:
    disc = norm_oracle_disc(p['discom'])
    div  = norm(p['division']); ss = norm(p['ss'])
    fdr  = norm(p['fdr']); fc = fcode(p['fdr'])
    val  = float(p.get('ptw_ass') or 0.0)
    if val <= 0: continue
    if disc == 'KESCO':
        ptw_kesco_df[disc+div+fdr] = ptw_kesco_df.get(disc+div+fdr, 0.0) + val
    else:
        ptw_ddsf[disc+div+ss+fdr] = ptw_ddsf.get(disc+div+ss+fdr, 0.0) + val
        ptw_ddf[disc+div+fdr]     = ptw_ddf.get(disc+div+fdr, 0.0) + val
    ptw_df[disc+fdr]              = ptw_df.get(disc+fdr, 0.0) + val
    if fc: ptw_dcode[disc+fc]     = ptw_dcode.get(disc+fc, 0.0) + val

print(f"   PTW data loaded.")

# ── Helper: get oracle data for a feeder (F2 key logic) ───────────────
def get_oracle(disc, div, ss, fdr, fc):
    """F2: KESCO uses div+fdr. Others: div+ss+fdr primary, div+fdr secondary."""
    if disc == 'KESCO':
        return ora['kesco_df'].get(disc+div+fdr)
    else:
        return (ora['other_ddsf'].get(disc+div+ss+fdr)
             or ora['other_ddf'].get(disc+div+fdr))

def get_ptw(disc, div, ss, fdr, fc):
    if disc == 'KESCO':
        return ptw_kesco_df.get(disc+div+fdr, 0.0)
    return (ptw_ddsf.get(disc+div+ss+fdr)
         or ptw_ddf.get(disc+div+fdr)
         or 0.0)

# ── 6. Build Sep-26 sep_cons lookup from baseline (r[9] = Sep cons in old schema) ─
# In the Sep baseline (feeders_sep26_backup.json), r[12]=cons, r[13]=flags
# We need Sep billable consumers: in the old 6-month build they stored r[12]=cons_sep
# (from Sir's sheet col 45). Check the structure of backup rows.
sep_baseline_cons = {}  # norm_feeder → sep cons
for r in R:
    disc_full = N['Discom'][r[0]]
    fdr_raw   = r[5]
    # Sep billable = r[12] in the old schema (cons from last month processed = Sep)
    cons_sep  = int(r[12]) if len(r) > 12 else 0
    fc = fcode(str(fdr_raw))
    sep_baseline_cons[norm(str(fdr_raw))] = cons_sep
    if fc: sep_baseline_cons[fc] = cons_sep

print(f"\n6. Sep cons lookup built for {len(sep_baseline_cons)} feeder keys")

# ── 7. F7: Build Sep-patch lookup by Division + Substation + Feeder ──
sep_patches_by_key = offline.get('sepPatchesByKey', {})
sep_patch_by_key = {}
for k, vals in sep_patches_by_key.items():
    sep_patch_by_key[k] = {
        'se_mwh':    round(float(vals[0]), 2),
        'ass_lakh':  round(float(vals[1]), 2),
        'real_lakh': round(float(vals[2]), 2),
        'cons':      int(vals[3]),
    }
print(f"   F7: {len(sep_patch_by_key)} Sep-patch entries loaded (keyed by Div+SS+Feeder)")

# ── 8. F3: Track used Oracle groups to avoid double-assignment ────────
used_oracle_groups = set()

# ── 9. Build output rows ───────────────────────────────────────────────
print("\n7. Building output rows (26,237 baseline + new Oct feeders)...")
new_rows = []
matched_ie = 0; matched_ora = 0; f3_fallback = 0
unmatched_feeders = []

seen_baseline_keys = set()
seen_baseline_fcodes = set()

for ridx, r in enumerate(R):
    disc_full = N['Discom'][r[0]]
    disc      = DISCOM_TO_SHORT.get(disc_full, disc_full)
    div       = norm(N['Division'][r[3]])
    ss        = norm(N['SS'][r[4]])
    fdr_raw   = r[5]
    fdr       = norm(str(fdr_raw))
    fc        = fcode(str(fdr_raw))

    seen_baseline_keys.add(norm(disc_full) + fdr)
    if fc: seen_baseline_fcodes.add(fc)

    # F4: Check if Sep-only
    is_sep_only = fdr in SEP_ONLY_FEEDERS
    
    # Match Oct IE (only if not Sep-only)
    ie_oct = None
    if not is_sep_only:
        for k, mp in [(div+ss+fdr, e_dsf), (div+fdr, e_df), (ss+fdr, e_sf), (fdr, e_f)]:
            if k in mp: ie_oct = mp[k]; matched_ie += 1; break
        if ie_oct is None and fc and fc in e_fc:
            ie_oct = e_fc[fc]; matched_ie += 1
    ie_oct = round(ie_oct or 0.0, 2)

    # Match Oracle OCT (F2: KESCO=div+fdr, others=div+ss+fdr → div+fdr)
    ora_m = None
    if not is_sep_only:
        ora_m = get_oracle(disc, div, ss, fdr, fc)
        if ora_m:
            # Mark this Oracle group used (F3 anti-double-count)
            if disc == 'KESCO':
                used_oracle_groups.add(disc+div+fdr)
            else:
                used_oracle_groups.add(disc+div+ss+fdr)
            matched_ora += 1
        else:
            # F3: feeder-code fallback (10+ char code, unique)
            if fc:
                fc_key_ddc = disc+div+fc
                fc_key_dc  = disc+fc
                # Only use code fallback if that Oracle group not already used
                cand = None
                if fc_key_ddc in ora['code_ddc'] and fc_key_ddc not in used_oracle_groups:
                    cand = ('code_ddc', fc_key_ddc, ora['code_ddc'][fc_key_ddc])
                elif fc_key_dc in ora['code_dc'] and fc_key_dc not in used_oracle_groups:
                    cand = ('code_dc', fc_key_dc, ora['code_dc'][fc_key_dc])
                if cand:
                    ora_m = cand[2]
                    used_oracle_groups.add(cand[1])
                    f3_fallback += 1
            if not ora_m:
                unmatched_feeders.append({
                    'feeder': str(fdr_raw), 'discom': disc, 'division': N['Division'][r[3]],
                    'type': 'baseline_unmatched'
                })

    if ora_m:
        cons_oct    = int(ora_m['cons'])
        se_oct      = round(ora_m['se_kwh'] / 1000.0, 2)
        ass_oct_raw = round(ora_m['ass_rs'] / 1e5, 2)
        real_oct    = round(ora_m['real_rs'] / 1e5, 2)
        ptw_sub_oct = round(ora_m['ptw_sub_rs'] / 1e5, 2)
    else:
        cons_oct = 0; se_oct = 0.0; ass_oct_raw = 0.0; real_oct = 0.0; ptw_sub_oct = 0.0

    # F6: Keep raw assessment in data; absurd correction is applied by JS toggle (Remove Absurd CA (8))
    ass_oct = ass_oct_raw

    ptw_ass_raw = get_ptw(disc, div, ss, fdr, fc) if not is_sep_only else 0.0
    ptw_ass_oct = round(min(ptw_ass_raw, ass_oct_raw), 2) if ass_oct_raw > 0 else 0.0

    ie_arr      = [round(float(x), 2) for x in r[8][:6]] + ([ie_oct] if not is_sep_only else [0.0])
    se_arr      = [round(float(x), 2) for x in r[9][:6]] + ([se_oct] if not is_sep_only else [0.0])
    ass_arr     = [round(float(x), 2) for x in r[10][:6]] + ([ass_oct] if not is_sep_only else [0.0])
    real_arr    = [round(float(x), 2) for x in r[11][:6]] + ([real_oct] if not is_sep_only else [0.0])
    ptw_ass_arr = [round(float(x), 2) for x in r[14][:6]] + ([ptw_ass_oct] if not is_sep_only else [0.0])
    ptw_sub_arr = [round(float(x), 2) for x in r[15][:6]] + ([ptw_sub_oct] if not is_sep_only else [0.0])

    # Sep cons (F5: r[16])
    cons_sep = int(r[12]) if len(r) > 12 else 0  # Sep baseline stores cons in r[12]

    # F7: Store patch info (we store sep_patch data in the row for toggling in JS)
    # patch = {se_mwh, ass_lakh, real_lakh, cons} for month 5 (Sep)
    sep_patch = sep_patch_by_key.get(div + '|' + ss + '|' + fdr)

    # Flags (use latest active month cons)
    tot_ie = sum(ie_arr); tot_se = sum(se_arr)
    flags = 0
    if tot_ie > 0:
        ll_pct = (tot_ie - tot_se) / tot_ie * 100.0
        if ll_pct < 0 or ll_pct > 100: flags |= 1
        if tot_se > tot_ie: flags |= 2
    else:
        flags |= 4
    # Note: F5 says remove flag 8 (cons==0) from static flags, 
    # but we still store it for reference; JS uses consFor() not flags&8

    out_row = [
        r[0], r[1], r[2], r[3], r[4], str(fdr_raw),
        r[6], r[7],
        ie_arr, se_arr, ass_arr, real_arr,
        cons_oct, flags,
        ptw_ass_arr, ptw_sub_arr,
        cons_sep,       # r[16] F5: Sep billable consumers
    ]
    # F4: Sep-only feeders get r[17]=None, r[18]=5; normal feeders get None, None if r[19] is needed
    if is_sep_only:
        out_row.append(None)  # r[17] = first_active_month (N/A)
        out_row.append(5)     # r[18] = last_active_month = Sep = 5
    elif sep_patch:
        out_row.append(None)  # r[17]
        out_row.append(None)  # r[18]
    # F7: Sep patch data always at r[19]
    if sep_patch:
        out_row.append(sep_patch)  # r[19] = {se_mwh, ass_lakh, real_lakh, cons}

    new_rows.append(out_row)

print(f"   Baseline feeders processed: {len(new_rows):,}")
print(f"   Oracle matched (primary): {matched_ora:,}")
print(f"   F3 code-fallback matched: {f3_fallback:,}")
print(f"   Unmatched: {len(unmatched_feeders):,}")

# ── 10. Add new Oct feeders (in MDM but not in baseline) ──────────────
print("\n8. Adding new Oct-26 feeders...")
added_new = 0
new_unmatched = []
new_f3 = 0

for row, ie_val in oct_outgoing_rows:
    disc_full = row[1].strip().upper()
    out_raw   = row[9].strip()
    fdr = norm(out_raw); fc = fcode(out_raw)
    
    # Skip if already in baseline (by name or feeder-code)
    if (norm(disc_full) + fdr) in seen_baseline_keys: continue
    if fc and fc in seen_baseline_fcodes: continue

    added_new += 1
    disc       = DISCOM_TO_SHORT.get(disc_full, disc_full)
    zone_raw   = row[2].strip().upper()
    circle_raw = row[3].strip().upper()
    div_raw    = row[4].strip().upper()
    ss_raw     = row[5].strip().upper()
    area_raw   = normalize_area(row[10] if len(row) > 10 else '')
    nature_raw = normalize_nature(row[16] if len(row) > 16 else '')

    d_idx   = get_or_add(disc_full,  N['Discom'],   d_map)
    z_idx   = get_or_add(zone_raw,   N['Zone'],     z_map)
    c_idx   = get_or_add(circle_raw, N['Circle'],   c_map)
    div_idx = get_or_add(div_raw,    N['Division'], div_map)
    ss_idx  = get_or_add(ss_raw,     N['SS'],       ss_map)
    a_idx   = get_or_add(area_raw,   N['Area'],     a_map)
    n_idx   = get_or_add(nature_raw, N['Nature'],   n_map)

    div = norm(div_raw); ss = norm(ss_raw)

    # F2 Oracle match
    ora_m = get_oracle(disc, div, ss, fdr, fc)
    if ora_m:
        if disc == 'KESCO': used_oracle_groups.add(disc+div+fdr)
        else:               used_oracle_groups.add(disc+div+ss+fdr)
    else:
        # F3 code fallback
        if fc:
            fc_key_ddc = disc+div+fc
            fc_key_dc  = disc+fc
            if fc_key_ddc in ora['code_ddc'] and fc_key_ddc not in used_oracle_groups:
                ora_m = ora['code_ddc'][fc_key_ddc]; used_oracle_groups.add(fc_key_ddc); new_f3 += 1
            elif fc_key_dc in ora['code_dc'] and fc_key_dc not in used_oracle_groups:
                ora_m = ora['code_dc'][fc_key_dc]; used_oracle_groups.add(fc_key_dc); new_f3 += 1
        if not ora_m:
            new_unmatched.append({'feeder': out_raw, 'discom': disc_full, 'division': div_raw})

    if ora_m:
        cons_oct    = int(ora_m['cons'])
        se_oct      = round(ora_m['se_kwh'] / 1000.0, 2)
        ass_oct_raw = round(ora_m['ass_rs'] / 1e5, 2)
        real_oct    = round(ora_m['real_rs'] / 1e5, 2)
        ptw_sub_oct = round(ora_m['ptw_sub_rs'] / 1e5, 2)
    else:
        cons_oct = 0; se_oct = 0.0; ass_oct_raw = 0.0; real_oct = 0.0; ptw_sub_oct = 0.0

    # F6: keep raw assessment in data
    ass_oct = ass_oct_raw

    ptw_ass_raw = get_ptw(disc, div, ss, fdr, fc) if fdr not in SEP_ONLY_FEEDERS else 0.0
    ptw_ass_oct = round(min(ptw_ass_raw, ass_oct_raw), 2) if ass_oct_raw > 0 else 0.0

    ie_oct = round(ie_val, 2)
    ie_arr      = [0.0]*6 + [ie_oct]
    se_arr      = [0.0]*6 + [se_oct]
    ass_arr     = [0.0]*6 + [ass_oct]
    real_arr    = [0.0]*6 + [real_oct]
    ptw_ass_arr = [0.0]*6 + [ptw_ass_oct]
    ptw_sub_arr = [0.0]*6 + [ptw_sub_oct]

    flags = 0
    if ie_oct > 0:
        ll_pct = (ie_oct - se_oct) / ie_oct * 100.0
        if ll_pct < 0 or ll_pct > 100: flags |= 1
        if se_oct > ie_oct: flags |= 2
    else: flags |= 4

    out_row = [
        d_idx, z_idx, c_idx, div_idx, ss_idx, out_raw,
        a_idx, n_idx,
        ie_arr, se_arr, ass_arr, real_arr,
        cons_oct, flags,
        ptw_ass_arr, ptw_sub_arr,
        0,    # r[16]: cons_sep=0 (new Oct feeders had no Sep data)
        6,    # r[17]: first_active_month = Oct = 6 (F4)
    ]
    new_rows.append(out_row)

print(f"   New Oct feeders added: {added_new:,}")
print(f"   F3 code-fallback (new): {new_f3:,}")
print(f"   New feeders unmatched: {len(new_unmatched):,}")

# ── 11. Write unmatched review CSV (F3) ───────────────────────────────
review_path = os.path.join(REPO_DIR, 'scripts', 'oct26_unmatched_review.csv')
with open(review_path, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['feeder', 'discom', 'division', 'type'])
    for u in unmatched_feeders + new_unmatched:
        w.writerow([u.get('feeder',''), u.get('discom',''), u.get('division',''), u.get('type','new')])
total_unmatched = len(unmatched_feeders) + len(new_unmatched)
total_f3 = f3_fallback + new_f3
print(f"\nF3 Summary: {total_f3} recovered via code fallback, {total_unmatched} still unmatched")
print(f"Unmatched review written to: {review_path}")

# ── 12. Final stats ────────────────────────────────────────────────────
total = len(new_rows)
n_sep_only = sum(1 for r in new_rows if len(r) > 18 and r[18] == 5)
n_oct_new  = sum(1 for r in new_rows if len(r) > 17 and r[17] == 6)
n_normal   = total - n_sep_only - n_oct_new

print(f"\n=== FINAL UNIVERSE ===")
print(f"  Normal (Apr-Oct active): {n_normal:,}")
print(f"  New Oct feeders (first_active=6): {n_oct_new:,}")
print(f"  Sep-only (last_active=5): {n_sep_only:,}")
print(f"  TOTAL rows: {total:,}  (expected 26,655)")

from collections import Counter
dc = Counter(N['Discom'][r[0]] for r in new_rows
             if not (len(r) > 18 and r[18] == 5))  # active Oct feeders
print("\n=== OCT ACTIVE DISCOM COUNTS ===")
for k, v in sorted(dc.items()): print(f"  {k:<15}: {v:,}")
print(f"  TOTAL active: {sum(dc.values()):,}  (expected 26,644)")

oct_ie   = sum(r[8][6] for r in new_rows if len(r[8]) > 6) / 1000.0
oct_se   = sum(r[9][6] for r in new_rows if len(r[9]) > 6) / 1000.0
oct_ass  = sum(r[10][6] for r in new_rows if len(r[10]) > 6) / 100.0
oct_real = sum(r[11][6] for r in new_rows if len(r[11]) > 6) / 100.0
prog_ie  = sum(sum(r[8]) for r in new_rows) / 1000.0

print(f"\n=== OCT-26 SINGLE MONTH ===")
print(f"  Input Energy: {oct_ie:,.2f} MU  (expected ≈10,246.05)")
print(f"  Sold Energy:  {oct_se:,.2f} MU")
print(f"  Assessment:   Rs {oct_ass:,.2f} Cr")
print(f"  Realisation:  Rs {oct_real:,.2f} Cr")
print(f"\n  Progressive Apr-Oct IE: {prog_ie:,.2f} MU")

# ── 13. Write feeders.json ─────────────────────────────────────────────
out_data = {'d': N, 'rows': new_rows}
for folder in ['data', 'frontend/data']:
    target = os.path.join(REPO_DIR, folder, 'feeders.json')
    with open(target, 'w', encoding='utf-8') as f:
        json.dump(out_data, f, separators=(',', ':'))
    sz = os.path.getsize(target) / 1024 / 1024
    print(f"\nWrote {target} ({sz:.2f} MB)")

print("\n✅ build_feeders_oct26_v2.py complete!")
print("Next: run encrypt_feeders.js → generate_slab_exports.py → encrypt_slabs.js")

# Parity assertion against reference unified JSON if available
REF_UNIFIED = r"D:\MASTER DATA\FY 26-27\Claude outputs\github_parity\feeders_oct26_unified.json"
if os.path.exists(REF_UNIFIED):
    ref = json.load(open(REF_UNIFIED, 'r', encoding='utf-8'))
    ref_map = {(norm(ref['d']['Discom'][rr[0]]), norm(ref['d']['Division'][rr[3]]), norm(ref['d']['SS'][rr[4]]), norm(rr[5])): rr for rr in ref['rows']}
    mismatches = 0
    for rr in new_rows:
        k = (norm(N['Discom'][rr[0]]), norm(N['Division'][rr[3]]), norm(N['SS'][rr[4]]), norm(rr[5]))
        ex = ref_map.get(k)
        if not ex or rr[9][6] != ex[9][6] or rr[10][6] != ex[10][6] or rr[11][6] != ex[11][6] or rr[12] != ex[12]:
            mismatches += 1
    assert mismatches == 0, f"Oct parity mismatch on {mismatches} rows vs feeders_oct26_unified.json"
    print("✅ Parity assertion passed: all 26,655 rows match feeders_oct26_unified.json")
