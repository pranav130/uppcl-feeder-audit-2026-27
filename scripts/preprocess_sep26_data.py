# UPPCL 11KV Feeder Audit Dashboard - September 2026 Data Processing Script
# Purpose: Extend the existing FY 2026-27 dashboard from August 2026 to September 2026.
#
# Source files:
#   A. Oracle Assessment/Realization (Sep26): UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_SEP26.xlsx
#      - 115,995 feeder-level consumer account records (aggregated from CA level)
#      - Month: September 2026 only
#   B. Energy data Oct06 (companion HTML, report date 06/10/2026)
#   C. Energy data Oct14 (plain HTML, report date 14/10/2026) <-- AUTHORITATIVE
#   D. August reference workbook (feeder master + Aug historical data)
#
# Column mapping (August workbook AUDIT DATA, 0-indexed):
#   Input Energy monthly: Apr=24, May=25, Jun=26, Jul=27, Aug=28, Sep=29
#   Billable consumers:   Apr=36, May=37, Jun=38, Jul=39, Aug=40, Sep=41
#   Sold Energy monthly:  Apr=48, May=49, Jun=50, Jul=51, Aug=52, Sep=53
#   Assessment monthly:   Apr=60, May=61, Jun=62, Jul=63, Aug=64, Sep=65
#   Realization monthly:  Apr=72, May=73, Jun=74, Jul=75, Aug=76, Sep=77
#   PTW Assessment:       Apr=88, May=89, Jun=90, Jul=91, Aug=92, Sep=93
#   PTW Subsidy:          Apr=100,May=101,Jun=102,Jul=103,Aug=104,Sep=105

import os, sys, json, re
import openpyxl
from html.parser import HTMLParser

sys.stdout.reconfigure(encoding='utf-8')

# Paths - all raw strings to avoid unicode escape errors
REPO_DIR    = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
ORACLE_XLSX = r"C:\Users\HP\Downloads\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_SEP26\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_SEP26.xlsx"
ENERGY_OCT14 = r"C:\Users\HP\Downloads\DistributionMasterMeterDataReportExcel_202610141205585478.xls"
ENERGY_OCT06 = r"C:\Users\HP\Downloads\DistributionMasterMeterDataReportExcel_202610061719588307_files\sheet001.htm"
AUG_WORKBOOK = r"C:\Users\HP\Downloads\11KV total feeders prog audit 2026-27 upto Aug-26 F_excluding absurd CA.xlsx"
OUT_FRONTEND = os.path.join(REPO_DIR, "frontend", "data")
OUT_DATA     = os.path.join(REPO_DIR, "data")
SCRATCH_DIR  = r"C:\Users\HP\.gemini\antigravity\brain\cf67968e-33b0-4d97-87d6-5f20fc2e8ced\scratch"

for d in [OUT_FRONTEND, OUT_DATA, SCRATCH_DIR]:
    os.makedirs(d, exist_ok=True)

# ── Helper Functions ────────────────────────────────────────────────────────

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
    """Normalize identifier for matching."""
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

def normalize_discom(d):
    s = normalize(d)
    return DISCOM_MAP.get(s, s)

def feeder_key(discom, substation, feeder):
    """Canonical feeder match key."""
    return (normalize_discom(discom), normalize(substation), normalize(feeder))

# ── HTML Table Parser ───────────────────────────────────────────────────────

class FastTableParser(HTMLParser):
    """Efficient HTML-table parser that returns all data rows after header."""
    def __init__(self, header_row_idx=8):
        super().__init__()
        self.all_rows = []
        self.current_row = []
        self.current_cell = ''
        self.in_cell = False
        self.header_row_idx = header_row_idx
        self.row_count = 0
        self.header = None

    def handle_starttag(self, tag, attrs):
        if tag in ('tr',):
            self.current_row = []
        elif tag in ('td', 'th'):
            self.in_cell = True
            self.current_cell = ''

    def handle_endtag(self, tag):
        if tag == 'tr':
            if self.current_row:
                self.row_count += 1
                if self.row_count == self.header_row_idx:
                    self.header = [re.sub(r'\s+', ' ', c).strip() for c in self.current_row]
                elif self.row_count > self.header_row_idx and len(self.current_row) >= 10:
                    self.all_rows.append([re.sub(r'\s+', ' ', c).strip() for c in self.current_row])
            self.current_row = []
        elif tag in ('td', 'th'):
            self.current_row.append(self.current_cell.strip())
            self.in_cell = False

    def handle_data(self, data):
        if self.in_cell:
            self.current_cell += data


def load_energy_html(path, is_companion=False):
    """Load feeder energy data from HTML table file.
    Returns dict: {feeder_key -> {'IE_Sep': float, 'MF': float, ...}}
    Energy col 18 = 'Energy Consumption' (MWh or kWh - need to check unit)
    Energy col 20 = 'Total Energy Consumption'
    """
    print(f"  Loading energy file: {path[-60:]}")
    with open(path, 'rb') as f:
        raw = f.read()
    content = raw.decode('latin-1', errors='replace')
    
    # Determine header_row_idx (plain file=7th data row index, companion=9th)
    header_idx = 9 if is_companion else 7
    
    parser = FastTableParser(header_row_idx=header_idx)
    parser.feed(content)
    
    print(f"  Parsed {len(parser.all_rows)} data rows, header: {parser.header[:5] if parser.header else 'NOT FOUND'}")
    
    # Build feeder energy dict
    # Columns: 0=Sr.No, 1=Discom, 2=Zone, 3=Circle, 4=Division, 5=Substation,
    #           6=Month, 7=Year, 8=Incoming Feeder, 9=Outgoing Feeder, 10=Project Area,
    #           11=Meter Make, 12=Meter SlNo, 13=Prev Reading, 14=Present Reading,
    #           15=Difference, 16=Feeder Nature, 17=OverallMF, 18=Energy Consumption,
    #           19=Energy Assessed, 20=Total Energy Consumption, 21=Meter Status,
    #           22=Date Of Defect, 23=Remark, 24=DateAndTime
    
    feeder_data = {}
    incoming_only = 0  # Rows with outgoing feeder blank (incoming meter readings)
    outgoing_count = 0
    
    for row in parser.all_rows:
        if len(row) < 18:
            continue
        month_val = row[6].strip().lower() if len(row) > 6 else ''
        if 'september' not in month_val and month_val != '':
            continue  # Skip non-September rows
        
        outgoing = normalize(row[9]) if len(row) > 9 else ''
        substation = normalize(row[5]) if len(row) > 5 else ''
        discom = normalize(row[1]) if len(row) > 1 else ''
        
        if not outgoing:
            incoming_only += 1
            continue  # Only process outgoing feeder rows
        
        outgoing_count += 1
        
        # Energy consumption in kWh (col 18 = 'Energy Consumption')
        # Total Energy Consumption (col 20) = Consumption + Assessed 
        # We need col 18 for actual metered energy
        energy_kwh = clean_num(row[18], 2) if len(row) > 18 else 0.0
        total_energy_kwh = clean_num(row[20], 2) if len(row) > 20 else 0.0
        mf = clean_num(row[17], 3) if len(row) > 17 else 1.0
        
        key = feeder_key(discom, substation, outgoing)
        
        if key in feeder_data:
            # Duplicate: sum readings (same feeder multiple readings is unusual)
            feeder_data[key]['IE_Sep_kWh'] += energy_kwh
            feeder_data[key]['Total_IE_Sep_kWh'] += total_energy_kwh
            feeder_data[key]['dup_count'] += 1
        else:
            feeder_data[key] = {
                'IE_Sep_kWh': energy_kwh,
                'Total_IE_Sep_kWh': total_energy_kwh,
                'MF': mf,
                'dup_count': 1,
                'discom': normalize(row[1]),
                'zone': normalize(row[2]),
                'circle': normalize(row[3]),
                'division': normalize(row[4]),
                'substation': substation,
                'feeder': outgoing,
                'feeder_nature': normalize(row[16]) if len(row) > 16 else '',
                'project_area': normalize(row[10]) if len(row) > 10 else '',
            }
    
    print(f"  Outgoing feeders with energy: {outgoing_count}")
    print(f"  Incoming-only rows skipped: {incoming_only}")
    print(f"  Unique feeder keys: {len(feeder_data)}")
    dups = {k: v for k, v in feeder_data.items() if v['dup_count'] > 1}
    print(f"  Feeders with duplicate rows: {len(dups)}")
    
    return feeder_data


# ── Step 1: Load August Workbook (Master Feeder List) ──────────────────────

print("=" * 70)
print("STEP 1: Loading August 2026 Reference Workbook (Feeder Master)")
print("=" * 70)

wb_aug = openpyxl.load_workbook(AUG_WORKBOOK, read_only=True, data_only=True)
ws_aug = wb_aug['AUDIT DATA']

aug_feeders = []  # List of dicts with all August feeder data
aug_key_to_idx = {}  # feeder_key -> index in aug_feeders

row_idx = 0
for row in ws_aug.iter_rows(min_row=3, values_only=True):  # Skip 2 header rows
    if row[0] is None and row[5] is None:
        continue
    
    discom = normalize(row[0])
    zone = normalize(row[1])
    circle = normalize(row[2])
    division = normalize(row[3])
    substation = normalize(row[4])
    feeder_name = str(row[5] or '').strip()
    area = normalize(row[6])
    nature = normalize(row[7])
    
    # Aug workbook columns (0-indexed, confirmed from header inspection):
    # Input Energy Apr-Aug: cols 24-28, Sep=29
    # Billable consumers Apr-Aug: cols 36-40, Sep=41
    # Sold Energy Apr-Aug: cols 48-52, Sep=53
    # Assessment Apr-Aug: cols 60-64, Sep=65
    # Realization Apr-Aug: cols 72-76, Sep=77
    # PTW Assessment Apr-Aug: cols 88-92, Sep=93
    # PTW Subsidy Apr-Aug: cols 100-104, Sep=105
    
    ie = [clean_num(row[c], 1) for c in range(24, 29)]   # Apr-Aug (5 months)
    se = [clean_num(row[c], 1) for c in range(48, 53)]   # Apr-Aug
    ass = [clean_num(row[c], 2) for c in range(60, 65)]  # Apr-Aug (Rs Lakhs)
    real = [clean_num(row[c], 2) for c in range(72, 77)] # Apr-Aug (Rs Lakhs)
    ptw_ass = [clean_num(row[c], 2) for c in range(88, 93)]  # Apr-Aug
    ptw_sub = [clean_num(row[c], 2) for c in range(100, 105)] # Apr-Aug
    
    billable_counts = [clean_int(row[c]) for c in range(36, 41)]  # Apr-Aug
    
    # Sep column values from Aug workbook (may be blank/zero, will be filled from sources)
    ie_sep_aug_wb = clean_num(row[29], 1) if len(row) > 29 else 0.0
    se_sep_aug_wb = clean_num(row[53], 1) if len(row) > 53 else 0.0
    ass_sep_aug_wb = clean_num(row[65], 2) if len(row) > 65 else 0.0
    real_sep_aug_wb = clean_num(row[77], 2) if len(row) > 77 else 0.0
    ptw_ass_sep_aug_wb = clean_num(row[93], 2) if len(row) > 93 else 0.0
    ptw_sub_sep_aug_wb = clean_num(row[105], 2) if len(row) > 105 else 0.0
    billable_sep_aug_wb = clean_int(row[41]) if len(row) > 41 else 0
    
    key = feeder_key(discom, substation, feeder_name)
    
    feeder_rec = {
        'discom': discom, 'zone': zone, 'circle': circle,
        'division': division, 'substation': substation,
        'feeder': feeder_name, 'area': area, 'nature': nature,
        'ie': ie,         # Apr-Aug (5 values)
        'se': se,         # Apr-Aug
        'ass': ass,       # Apr-Aug
        'real': real,     # Apr-Aug
        'ptw_ass': ptw_ass,
        'ptw_sub': ptw_sub,
        'billable': billable_counts,  # Apr-Aug
        'ie_sep_wb': ie_sep_aug_wb,
        'se_sep_wb': se_sep_aug_wb,
        'ass_sep_wb': ass_sep_aug_wb,
        'real_sep_wb': real_sep_aug_wb,
        'ptw_ass_sep_wb': ptw_ass_sep_aug_wb,
        'ptw_sub_sep_wb': ptw_sub_sep_aug_wb,
        'billable_sep_wb': billable_sep_aug_wb,
        '_key': key,
    }
    
    aug_feeders.append(feeder_rec)
    if key not in aug_key_to_idx:
        aug_key_to_idx[key] = row_idx
    row_idx += 1

wb_aug.close()
print(f"Loaded {len(aug_feeders)} feeders from August workbook")
print(f"Unique feeder keys: {len(aug_key_to_idx)}")
dups_in_aug = len(aug_feeders) - len(aug_key_to_idx)
if dups_in_aug > 0:
    print(f"WARNING: {dups_in_aug} duplicate feeder keys in August workbook")

# Count Sep column non-zero values in Aug workbook 
sep_ie_nonzero = sum(1 for f in aug_feeders if f['ie_sep_wb'] > 0)
sep_se_nonzero = sum(1 for f in aug_feeders if f['se_sep_wb'] > 0)
sep_ass_nonzero = sum(1 for f in aug_feeders if f['ass_sep_wb'] > 0)
print(f"Aug workbook Sep IE non-zero: {sep_ie_nonzero}, SE non-zero: {sep_se_nonzero}, Ass non-zero: {sep_ass_nonzero}")

# ── Step 2: Load Oracle Sep26 Data ────────────────────────────────────────

print()
print("=" * 70)
print("STEP 2: Loading Oracle September 2026 Assessment/Realization Data")
print("=" * 70)

wb_oracle = openpyxl.load_workbook(ORACLE_XLSX, read_only=True, data_only=True)
ws_oracle = wb_oracle['SEP26']

oracle_data = {}   # feeder_key -> aggregated Oracle data
oracle_duplicates = {}  # keys with multiple records
oracle_total = 0

for row in ws_oracle.iter_rows(min_row=2, values_only=True):
    if row[0] is None:
        continue
    oracle_total += 1
    
    discom = normalize(row[0])
    # zone = normalize(row[1])   # for reference only
    # circle = normalize(row[2])
    # division = normalize(row[3])
    substation = normalize(row[4])
    feeder_name = normalize(row[5])
    
    total_cons = clean_int(row[6])
    bill_cons = clean_int(row[7])
    billed = clean_int(row[8])
    load_kw = clean_num(row[9], 1)
    
    # Consumption <=3000/LOAD (col 10): used for sold energy (billed units kWh)
    consumption_le3000 = clean_num(row[10], 1)
    # Consumption <=3000/LOAD excl (col 11)
    consumption_le3000_excl = clean_num(row[11], 1)
    # Consumption (KWH) <=3000/LOAD (col 12): actual kWh consumed
    consumption_kwh = clean_num(row[12], 1)
    # Consumption (KWH) <=3000/LOAD excl (col 13)
    consumption_kwh_excl = clean_num(row[13], 1)
    
    # Assessment (CA_EX_SUBS) - col 14: Assessment excluding subsidies (Rs)
    assessment_ca_ex_subs = clean_num(row[14], 2)
    # Current Assessment - col 15: total current assessment (Rs)
    current_assessment = clean_num(row[15], 2)
    
    # Subsidies
    tariff_subs = clean_num(row[16], 2)
    ptw_subs = clean_num(row[17], 2)
    cross_subs = clean_num(row[18], 2)
    powerloom_subs = clean_num(row[19], 2)
    wmcr_subs = clean_num(row[20], 2)
    
    realization = clean_num(row[21], 2)  # Rs
    
    key = feeder_key(discom, substation, feeder_name)
    
    # Oracle data is at CA-level → aggregate to feeder level
    if key in oracle_data:
        oracle_duplicates[key] = oracle_duplicates.get(key, 1) + 1
        # Aggregate: sum numeric fields
        od = oracle_data[key]
        od['total_cons'] += total_cons
        od['bill_cons'] += bill_cons
        od['billed'] += billed
        od['load_kw'] += load_kw
        od['consumption_le3000'] += consumption_le3000
        od['consumption_le3000_excl'] += consumption_le3000_excl
        od['consumption_kwh'] += consumption_kwh
        od['consumption_kwh_excl'] += consumption_kwh_excl
        od['assessment_ca_ex_subs'] += assessment_ca_ex_subs
        od['current_assessment'] += current_assessment
        od['tariff_subs'] += tariff_subs
        od['ptw_subs'] += ptw_subs
        od['cross_subs'] += cross_subs
        od['powerloom_subs'] += powerloom_subs
        od['wmcr_subs'] += wmcr_subs
        od['realization'] += realization
        od['record_count'] += 1
    else:
        oracle_data[key] = {
            'discom': discom, 'substation': substation, 'feeder': feeder_name,
            'total_cons': total_cons, 'bill_cons': bill_cons, 'billed': billed,
            'load_kw': load_kw,
            'consumption_le3000': consumption_le3000,
            'consumption_le3000_excl': consumption_le3000_excl,
            'consumption_kwh': consumption_kwh,
            'consumption_kwh_excl': consumption_kwh_excl,
            'assessment_ca_ex_subs': assessment_ca_ex_subs,
            'current_assessment': current_assessment,
            'tariff_subs': tariff_subs,
            'ptw_subs': ptw_subs,
            'cross_subs': cross_subs,
            'powerloom_subs': powerloom_subs,
            'wmcr_subs': wmcr_subs,
            'realization': realization,
            'record_count': 1,
        }

wb_oracle.close()

print(f"Oracle total CA records: {oracle_total}")
print(f"Oracle unique feeder keys (after aggregation): {len(oracle_data)}")
print(f"Oracle feeders with multiple CA records (aggregated): {len(oracle_duplicates)}")

# Oracle Assessment unit: The Aug workbook uses Rs Lakhs, Oracle is Rs (not Lakhs)
# Verify: Total assessment from Oracle (Rs) -> should be ~30,000 Cr when /10^7
total_oracle_ass = sum(v['assessment_ca_ex_subs'] for v in oracle_data.values())
print(f"Oracle total Assessment (CA_EX_SUBS) in Rs: {total_oracle_ass:,.0f}")
print(f"  = {total_oracle_ass / 1e7:.2f} Crores (sanity check - Sep month only)")
total_oracle_real = sum(v['realization'] for v in oracle_data.values())
print(f"Oracle total Realization in Rs: {total_oracle_real:,.0f}")
print(f"  = {total_oracle_real / 1e7:.2f} Crores")
total_oracle_kwh = sum(v['consumption_kwh'] for v in oracle_data.values())
print(f"Oracle total Consumption kWh: {total_oracle_kwh:,.0f}")
print(f"  = {total_oracle_kwh / 1e6:.2f} MU (sold energy for Sep)")

# Build fallback dictionary by (discom, feeder) for minor substation name discrepancies
oracle_df = {}
oracle_df_dups = set()
for k, od in oracle_data.items():
    df_key = (k[0], k[2])
    if df_key in oracle_df:
        oracle_df_dups.add(df_key)
    else:
        oracle_df[df_key] = od
for df_key in oracle_df_dups:
    del oracle_df[df_key]
print(f"Oracle unique (discom, feeder) fallback keys: {len(oracle_df)}")


# ── Step 3: Load Energy Data (Oct14 as Primary Source) ────────────────────

print()
print("=" * 70)
print("STEP 3: Loading Energy Data (Oct14 = Authoritative, Oct06 = Cross-check)")
print("=" * 70)
print("Loading Oct14 (primary, report date 14/10/2026)...")
energy_oct14 = load_energy_html(ENERGY_OCT14, is_companion=False)

# Unit check: energy values from HTML table
# Col 20 = 'Total Energy Consumption' (includes assessed energy for defective/stopped meters)
# Col 18 = 'Energy Consumption' (metered energy)
# Both are in MWh ('000 kWh), matching August workbook column format directly.
print(f"\nEnergy unit note: HTML table energy values are already in MWh ('000 kWh)")
print(f"  August workbook IE is also in MWh ('000 kWh), e.g. 751.64 MWh")
print(f"  No division by 1000 needed when populating monthly IE array")

# Sample check
sample_keys = list(energy_oct14.keys())[:3]
for sk in sample_keys:
    sd = energy_oct14[sk]
    tot_val = sd['Total_IE_Sep_kWh'] if sd['Total_IE_Sep_kWh'] > 0 else sd['IE_Sep_kWh']
    print(f"  Sample: {sk[2][:30]} | Total_IE_MWh={tot_val:.1f}")


# ── Step 4: Reconcile Energy Sources (Oct06 vs Oct14) ─────────────────────

print()
print("=" * 70)  
print("STEP 4: Cross-checking Oct06 vs Oct14 Energy Files")
print("=" * 70)
print("Loading Oct06 (cross-check, report date 06/10/2026)...")
energy_oct06 = load_energy_html(ENERGY_OCT06, is_companion=True)

# Compare overlapping feeders
common_keys = set(energy_oct14.keys()) & set(energy_oct06.keys())
only_in_oct14 = set(energy_oct14.keys()) - set(energy_oct06.keys())
only_in_oct06 = set(energy_oct06.keys()) - set(energy_oct14.keys())

print(f"\nReconciliation summary:")
print(f"  Oct14 unique feeders: {len(energy_oct14)}")
print(f"  Oct06 unique feeders: {len(energy_oct06)}")
print(f"  Common feeders: {len(common_keys)}")
print(f"  Only in Oct14 (new/added): {len(only_in_oct14)}")
print(f"  Only in Oct06 (dropped/revised out): {len(only_in_oct06)}")

# Check value differences in common feeders
conflicts = []
for k in common_keys:
    ie14 = energy_oct14[k]['Total_IE_Sep_kWh'] if energy_oct14[k]['Total_IE_Sep_kWh'] > 0 else energy_oct14[k]['IE_Sep_kWh']
    ie06 = energy_oct06[k]['Total_IE_Sep_kWh'] if energy_oct06[k]['Total_IE_Sep_kWh'] > 0 else energy_oct06[k]['IE_Sep_kWh']
    if abs(ie14 - ie06) > 0.01:
        conflicts.append({
            'key': k,
            'ie_oct14': ie14,
            'ie_oct06': ie06,
            'diff': ie14 - ie06,
            'diff_pct': (ie14 - ie06) / max(ie06, 0.01) * 100
        })

conflicts.sort(key=lambda x: abs(x['diff']), reverse=True)
print(f"  Feeders with conflicting IE values: {len(conflicts)}")
if conflicts:
    print(f"  Top 10 conflicts (largest absolute difference):")
    for c in conflicts[:10]:
        print(f"    {c['key'][2][:35]} | Oct14={c['ie_oct14']:.1f} Oct06={c['ie_oct06']:.1f} Diff={c['diff']:+.1f} ({c['diff_pct']:+.1f}%)")

# Save conflict report
conflict_report_path = os.path.join(SCRATCH_DIR, 'energy_conflict_report.json')
with open(conflict_report_path, 'w', encoding='utf-8') as f:
    json.dump({
        'total_oct14': len(energy_oct14),
        'total_oct06': len(energy_oct06),
        'common': len(common_keys),
        'only_oct14': len(only_in_oct14),
        'only_oct06': len(only_in_oct06),
        'conflicts': len(conflicts),
        'top_conflicts': [
            {'feeder': k[2], 'ss': k[1], 'discom': k[0], 
             'ie_oct14': v['ie_oct14'], 'ie_oct06': v['ie_oct06'], 
             'diff': v['diff'], 'diff_pct': v['diff_pct']}
            for k, v in [(c['key'], c) for c in conflicts[:50]]
        ]
    }, f, indent=2, ensure_ascii=False)
print(f"\nConflict report saved: {conflict_report_path}")

# DECISION: Use Oct14 as authoritative (later date, complete/revised)
# Document feeders with conflicts as flagged
energy_primary = energy_oct14
conflicted_keys = {c['key'] for c in conflicts}
print(f"\nDecision: Oct14 ({len(energy_oct14)} feeders) = AUTHORITATIVE energy source")
print(f"Flagged {len(conflicted_keys)} feeders with conflicting values between Oct06 and Oct14")

# Build fallback energy dictionary by (discom, feeder)
energy_df = {}
energy_df_dups = set()
for k, ed in energy_primary.items():
    df_key = (k[0], k[2])
    if df_key in energy_df:
        energy_df_dups.add(df_key)
    else:
        energy_df[df_key] = ed
for df_key in energy_df_dups:
    del energy_df[df_key]
print(f"Energy unique (discom, feeder) fallback keys: {len(energy_df)}")


# ── Step 5: Match Feeders (Aug Master → Energy → Oracle) ──────────────────

print()
print("=" * 70)
print("STEP 5: Matching Feeders Across Sources")
print("=" * 70)

matched_energy = 0
unmatched_energy = 0
matched_oracle = 0
unmatched_oracle = 0
zero_energy = 0

sep_data_by_feeder = {}  # key -> {ie_sep, se_sep, ass_sep, real_sep, ...}

for feeder_rec in aug_feeders:
    key = feeder_rec['_key']
    df_key = (key[0], key[2])
    
    # Energy match: exact then fallback
    energy_match = energy_primary.get(key)
    if not energy_match:
        energy_match = energy_df.get(df_key)
        
    if energy_match:
        matched_energy += 1
        total_val = energy_match.get('Total_IE_Sep_kWh', 0.0)
        ec_val = energy_match.get('IE_Sep_kWh', 0.0)
        ie_sep_mwh = round(total_val if total_val > 0 else ec_val, 1)
        if ie_sep_mwh == 0:
            zero_energy += 1
    else:
        unmatched_energy += 1
        ie_sep_mwh = 0.0
    
    # Oracle match: exact then fallback
    oracle_match = oracle_data.get(key)
    if not oracle_match:
        oracle_match = oracle_df.get(df_key)
        
    if oracle_match:
        matched_oracle += 1
        # Oracle assessment is in Rs → convert to Rs Lakhs (same as Aug workbook)
        ass_sep_lakh = round(oracle_match['assessment_ca_ex_subs'] / 1e5, 2)  # Rs -> Rs Lakhs
        real_sep_lakh = round(oracle_match['realization'] / 1e5, 2)
        ptw_subs_sep_lakh = round(oracle_match['ptw_subs'] / 1e5, 2)
        tariff_subs_sep_lakh = round(oracle_match['tariff_subs'] / 1e5, 2)
        powerloom_subs_sep_lakh = round(oracle_match['powerloom_subs'] / 1e5, 2)
        
        # Sold Energy (consumption_kwh -> MWh, same as Aug workbook SE)
        se_sep_mwh = round(oracle_match['consumption_kwh'] / 1000.0, 1)
        bill_cons_sep = oracle_match['bill_cons']
        load_kw_sep = oracle_match['load_kw']
    else:
        unmatched_oracle += 1
        ass_sep_lakh = 0.0
        real_sep_lakh = 0.0
        ptw_subs_sep_lakh = 0.0
        tariff_subs_sep_lakh = 0.0
        powerloom_subs_sep_lakh = 0.0
        se_sep_mwh = 0.0
        bill_cons_sep = 0
        load_kw_sep = 0.0
    
    sep_data_by_feeder[key] = {
        'ie_sep': ie_sep_mwh,
        'se_sep': se_sep_mwh,
        'ass_sep': ass_sep_lakh,
        'real_sep': real_sep_lakh,
        'ptw_ass_sep': ptw_subs_sep_lakh,  # PTW subsidy from Oracle (used as PTW Assessment)
        'ptw_sub_sep': tariff_subs_sep_lakh,  # Tariff subsidy
        'billable_sep': bill_cons_sep,
        'load_kw_sep': load_kw_sep,
        'energy_matched': energy_match is not None,
        'oracle_matched': oracle_match is not None,
        'energy_conflicted': key in conflicted_keys,
    }

print(f"Energy matching: {matched_energy} matched, {unmatched_energy} unmatched, {zero_energy} zero-energy")
print(f"Oracle matching: {matched_oracle} matched, {unmatched_oracle} unmatched")

# How many feeders in energy file not in Aug master?
aug_keys = set(f['_key'] for f in aug_feeders)
new_in_energy = set(energy_primary.keys()) - aug_keys
new_in_oracle = set(oracle_data.keys()) - aug_keys
print(f"Energy feeders NOT in Aug master: {len(new_in_energy)} (new feeders, will be excluded from dashboard)")
print(f"Oracle feeders NOT in Aug master: {len(new_in_oracle)} (no Aug baseline, will be excluded)")


# ── Step 6: Build Final Sep Dataset ───────────────────────────────────────

print()
print("=" * 70)
print("STEP 6: Building September + Progressive (Apr-Sep) Dataset")
print("=" * 70)

# Dictionary maps (reuse from Aug workbook structure)
discoms_list = []
zones_list = []
circles_list = []
divisions_list = []
areas_list = []
natures_list = []
substations_list = []

discom_map = {}; zone_map = {}; circle_map = {}
div_map = {}; area_map = {}; nature_map = {}; ss_map = {}

def get_or_add(val, lst, mp):
    s = normalize(val) or 'UNKNOWN'
    if s not in mp:
        mp[s] = len(lst)
        lst.append(s)
    return mp[s]

output_rows = []
reconciliation = {
    'total_feeders': 0,
    'energy_matched': 0,
    'oracle_matched': 0,
    'both_matched': 0,
    'neither_matched': 0,
    'zero_sep_ie': 0,
    'zero_sep_se': 0,
}

for feeder_rec in aug_feeders:
    key = feeder_rec['_key']
    sep = sep_data_by_feeder.get(key, {})
    
    discom = feeder_rec['discom']
    zone = feeder_rec['zone']
    circle = feeder_rec['circle']
    division = feeder_rec['division']
    substation = feeder_rec['substation']
    feeder_name = feeder_rec['feeder']
    area = feeder_rec['area']
    nature = feeder_rec['nature']
    
    d_idx = get_or_add(discom, discoms_list, discom_map)
    z_idx = get_or_add(zone, zones_list, zone_map)
    c_idx = get_or_add(circle, circles_list, circle_map)
    v_idx = get_or_add(division, divisions_list, div_map)
    s_idx = get_or_add(substation, substations_list, ss_map)
    a_idx = get_or_add(area, areas_list, area_map)
    n_idx = get_or_add(nature, natures_list, nature_map)
    
    # Apr-Aug data (5 months, from Aug workbook)
    ie_apr_aug = feeder_rec['ie']     # [Apr, May, Jun, Jul, Aug]
    se_apr_aug = feeder_rec['se']
    ass_apr_aug = feeder_rec['ass']
    real_apr_aug = feeder_rec['real']
    ptw_ass_apr_aug = feeder_rec['ptw_ass']
    ptw_sub_apr_aug = feeder_rec['ptw_sub']
    billable_apr_aug = feeder_rec['billable']
    
    # Sep data (from energy + oracle sources)
    ie_sep = sep.get('ie_sep', 0.0)
    se_sep = sep.get('se_sep', 0.0)
    ass_sep = sep.get('ass_sep', 0.0)
    real_sep = sep.get('real_sep', 0.0)
    ptw_ass_sep = sep.get('ptw_ass_sep', 0.0)
    ptw_sub_sep = sep.get('ptw_sub_sep', 0.0)
    billable_sep = sep.get('billable_sep', 0)
    
    # 6-month arrays (Apr-Sep)
    ie = ie_apr_aug + [ie_sep]
    se = se_apr_aug + [se_sep]
    ass = ass_apr_aug + [ass_sep]
    real = real_apr_aug + [real_sep]
    ptw_ass = ptw_ass_apr_aug + [ptw_ass_sep]
    ptw_sub = ptw_sub_apr_aug + [ptw_sub_sep]
    billable = billable_apr_aug + [billable_sep]
    
    # Progressive totals (Apr-Sep, 6 months)
    tot_ie = sum(ie)
    tot_se = sum(se)
    tot_ass = sum(ass)
    tot_real = sum(real)
    tot_ptw_ass = sum(ptw_ass)
    
    # Consumer count: max billable across all 6 months
    cons = max(billable) if billable else 0
    if cons == 0:
        cons = billable_sep or (max(billable_apr_aug) if billable_apr_aug else 0)
    
    # Flags (same as existing methodology)
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
    
    # Compact row: same format as existing feeders.js
    # 0: discomIdx, 1: zoneIdx, 2: circleIdx, 3: divIdx, 4: ssIdx, 5: feederName
    # 6: areaIdx, 7: natureIdx, 8: ieArr (6 months), 9: seArr, 10: assArr, 11: realArr
    # 12: cons, 13: flags, 14: ptwAssArr, 15: ptwSubArr
    row = [
        d_idx, z_idx, c_idx, v_idx, s_idx, feeder_name,
        a_idx, n_idx, ie, se, ass, real,
        cons, flags, ptw_ass, ptw_sub
    ]
    output_rows.append(row)
    
    # Reconciliation stats
    reconciliation['total_feeders'] += 1
    e_matched = sep.get('energy_matched', False)
    o_matched = sep.get('oracle_matched', False)
    if e_matched:
        reconciliation['energy_matched'] += 1
    if o_matched:
        reconciliation['oracle_matched'] += 1
    if e_matched and o_matched:
        reconciliation['both_matched'] += 1
    if not e_matched and not o_matched:
        reconciliation['neither_matched'] += 1
    if ie_sep == 0:
        reconciliation['zero_sep_ie'] += 1
    if se_sep == 0:
        reconciliation['zero_sep_se'] += 1

print(f"Output rows: {len(output_rows)}")
print(f"Reconciliation: {reconciliation}")

# Verify progressive totals
prog_ie_mu = sum(row[8][i] for row in output_rows for i in range(6)) / 1000
prog_se_mu = sum(row[9][i] for row in output_rows for i in range(6)) / 1000
prog_ass_cr = sum(row[10][i] for row in output_rows for i in range(6)) / 100
prog_real_cr = sum(row[11][i] for row in output_rows for i in range(6)) / 100
sep_ie_mu = sum(row[8][5] for row in output_rows) / 1000
sep_se_mu = sum(row[9][5] for row in output_rows) / 1000
sep_ass_cr = sum(row[10][5] for row in output_rows) / 100
sep_real_cr = sum(row[11][5] for row in output_rows) / 100

print(f"\nSep 2026 Monthly Totals (all 26,033 feeders):")
print(f"  Input Energy: {sep_ie_mu:.2f} MU")
print(f"  Sold Energy:  {sep_se_mu:.2f} MU")
print(f"  Assessment:   Rs {sep_ass_cr:.2f} Cr")
print(f"  Realization:  Rs {sep_real_cr:.2f} Cr")
print(f"\nApr-Sep Progressive Totals (all 26,033 feeders):")
print(f"  Input Energy: {prog_ie_mu:.2f} MU")
print(f"  Sold Energy:  {prog_se_mu:.2f} MU")
print(f"  Assessment:   Rs {prog_ass_cr:.2f} Cr")
print(f"  Realization:  Rs {prog_real_cr:.2f} Cr")

# Aug-only totals (existing dashboard values for comparison)
aug_ie_mu = sum(row[8][4] for row in output_rows) / 1000
aug_se_mu = sum(row[9][4] for row in output_rows) / 1000
aug_prog5_ie_mu = sum(sum(row[8][:5]) for row in output_rows) / 1000
aug_prog5_se_mu = sum(sum(row[9][:5]) for row in output_rows) / 1000
aug_prog5_ass_cr = sum(sum(row[10][:5]) for row in output_rows) / 100
aug_prog5_real_cr = sum(sum(row[11][:5]) for row in output_rows) / 100

print(f"\nAug 2026 Monthly (for baseline comparison):")
print(f"  Input Energy: {aug_ie_mu:.2f} MU (was in Aug dashboard)")
print(f"  Sold Energy:  {aug_se_mu:.2f} MU")
print(f"\nApr-Aug Progressive (existing Aug dashboard baseline):")
print(f"  Input Energy: {aug_prog5_ie_mu:.2f} MU")
print(f"  Sold Energy:  {aug_prog5_se_mu:.2f} MU")
print(f"  Assessment:   Rs {aug_prog5_ass_cr:.2f} Cr")
print(f"  Realization:  Rs {aug_prog5_real_cr:.2f} Cr")


# ── Step 7: Write Output Files ─────────────────────────────────────────────

print()
print("=" * 70)
print("STEP 7: Writing Output Dataset Files")
print("=" * 70)

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

# Write to both frontend/data and data/ directories
for target_dir_name in ['frontend/data', 'data']:
    target_dir = os.path.join(REPO_DIR, target_dir_name)
    os.makedirs(target_dir, exist_ok=True)
    
    # 1. Write raw feeders_sep26_raw.js
    raw_js_path = os.path.join(target_dir, 'feeders_sep26_raw.js')
    with open(raw_js_path, 'w', encoding='utf-8') as f:
        f.write('window.__FEEDERS_RAW = ')
        json.dump(dataset, f, separators=(',', ':'))
        f.write(';\n')
    print(f"Wrote raw feeders JS: {raw_js_path} ({os.path.getsize(raw_js_path)/1024/1024:.2f} MB)")

    # 2. Write feeders.json (for slab export scripts)
    json_path = os.path.join(target_dir, 'feeders.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, separators=(',', ':'))
    print(f"Wrote feeders JSON: {json_path} ({os.path.getsize(json_path)/1024/1024:.2f} MB)")

    # 3. Write unencrypted feeders.js (will be encrypted by encryption script)
    js_path = os.path.join(target_dir, 'feeders.js')
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write('window.__FEEDERS_DATA = ')
        json.dump(dataset, f, separators=(',', ':'))
        f.write(';\n')
    print(f"Wrote unencrypted feeders JS: {js_path} ({os.path.getsize(js_path)/1024/1024:.2f} MB)")

# Also save reconciliation report to scratch
reconciliation_report = {
    'source_files': {
        'oracle': ORACLE_XLSX,
        'energy_primary': ENERGY_OCT14,
        'energy_crosscheck': ENERGY_OCT06,
        'aug_reference': AUG_WORKBOOK,
    },
    'oracle_stats': {
        'total_ca_records': oracle_total,
        'unique_feeder_keys': len(oracle_data),
        'feeders_with_multiple_ca': len(oracle_duplicates),
        'total_assessment_rs': total_oracle_ass,
        'total_assessment_cr': round(total_oracle_ass / 1e7, 2),
        'total_realization_rs': total_oracle_real,
        'total_realization_cr': round(total_oracle_real / 1e7, 2),
        'total_consumption_kwh': total_oracle_kwh,
        'total_consumption_mu': round(total_oracle_kwh / 1e6, 2),
    },
    'energy_stats': {
        'oct14_feeders': len(energy_oct14),
        'oct06_feeders': len(energy_oct06),
        'common_feeders': len(common_keys),
        'only_oct14': len(only_in_oct14),
        'only_oct06': len(only_in_oct06),
        'conflicts': len(conflicts),
        'authoritative_source': 'Oct14 (report date 14/10/2026)',
    },
    'matching_stats': {
        'aug_master_feeders': len(aug_feeders),
        'energy_matched': matched_energy,
        'energy_unmatched': unmatched_energy,
        'oracle_matched': matched_oracle,
        'oracle_unmatched': unmatched_oracle,
        'zero_sep_ie': zero_energy,
    },
    'progressive_totals': {
        'apr_aug_ie_mu': aug_prog5_ie_mu,
        'apr_aug_se_mu': aug_prog5_se_mu,
        'apr_aug_ass_cr': aug_prog5_ass_cr,
        'apr_aug_real_cr': aug_prog5_real_cr,
        'sep_ie_mu': sep_ie_mu,
        'sep_se_mu': sep_se_mu,
        'sep_ass_cr': sep_ass_cr,
        'sep_real_cr': sep_real_cr,
        'apr_sep_ie_mu': prog_ie_mu,
        'apr_sep_se_mu': prog_se_mu,
        'apr_sep_ass_cr': prog_ass_cr,
        'apr_sep_real_cr': prog_real_cr,
    },
    'output_feeders': len(output_rows),
    'reconciliation': reconciliation,
}

rec_path = os.path.join(SCRATCH_DIR, 'sep26_reconciliation_report.json')
with open(rec_path, 'w', encoding='utf-8') as f:
    json.dump(reconciliation_report, f, indent=2, ensure_ascii=False)
print(f"Reconciliation report saved: {rec_path}")

print()
print("=" * 70)
print("STEP 7 COMPLETE - Raw dataset written")
print("Next steps: Run encrypt_sep26.py to apply AES-256-GCM encryption")
print("=" * 70)
