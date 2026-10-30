import openpyxl
import json
import os

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

def clean_num(val):
    if val is None or val == '' or val == 'None': return 0.0
    try: return float(val)
    except: return 0.0

def clean_int(val):
    if val is None or val == '' or val == 'None': return 0
    try: return int(round(float(val)))
    except: return 0

def clean_str(val):
    if val is None: return ''
    return str(val).strip()

def normalize_area(a):
    u = clean_str(a).upper()
    if 'TEHSIL' in u: return 'TEHSIL'
    if 'RURAL' in u: return 'RURAL'
    return 'URBAN'

def normalize_nature(n):
    u = clean_str(n).upper()
    if 'AGR' in u: return 'AGR'
    if 'IND' in u: return 'IND'
    if 'COM' in u: return 'COM'
    if 'DOM' in u: return 'DOM'
    if 'MIX' in u: return 'MIXED'
    return 'OTHER'

discoms = []
zones = []
circles = []
divisions = []
substations = []
areas = ['URBAN', 'TEHSIL', 'RURAL']
natures = ['OTHER', 'AGR', 'IND', 'COM', 'DOM', 'MIXED']

d_map = {}
z_map = {}
c_map = {}
div_map = {}
ss_map = {}
a_map = {a: i for i, a in enumerate(areas)}
n_map = {n: i for i, n in enumerate(natures)}

def get_or_add(val, lst, mp):
    if val not in mp:
        mp[val] = len(lst)
        lst.append(val)
    return mp[val]

output_rows = []

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    disc = clean_str(row[0]).upper()
    zone = clean_str(row[2]).upper()
    circle = clean_str(row[3]).upper()
    division = clean_str(row[4]).upper()
    substation = clean_str(row[5]).upper()
    feeder = clean_str(row[6])
    area = normalize_area(row[8])
    nature = normalize_nature(row[9])
    
    d_idx = get_or_add(disc, discoms, d_map)
    z_idx = get_or_add(zone, zones, z_map)
    c_idx = get_or_add(circle, circles, c_map)
    div_idx = get_or_add(division, divisions, div_map)
    ss_idx = get_or_add(substation, substations, ss_map)
    a_idx = a_map[area]
    n_idx = n_map[nature]
    
    # Monthly IE (Cols 28-33: Apr-Sep)
    ie = [clean_num(row[c]) for c in range(28, 34)]
    
    # Monthly Billable Cons (Cols 40-45: Apr-Sep)
    billable = [clean_int(row[c]) for c in range(40, 46)]
    
    # Monthly SE (Cols 52-57: Apr-Sep)
    se = [clean_num(row[c]) for c in range(52, 58)]
    
    # Monthly Ass (Cols 64-69: Apr-Sep)
    ass = [clean_num(row[c]) for c in range(64, 70)]
    
    # Monthly Real (Cols 76-81: Apr-Sep)
    real = [clean_num(row[c]) for c in range(76, 82)]
    
    # Monthly PTW Ass (Cols 92-97)
    ptw_ass = [clean_num(row[c]) for c in range(92, 98)]
    
    # Monthly PTW Subs (Cols 104-109)
    ptw_sub = [clean_num(row[c]) for c in range(104, 110)]
    
    # Prabhakar Sir's formula checks billable_sep (Col 45 / index 5 of billable)
    cons = billable[5] # Billable Sep'26
    
    tot_ie = sum(ie)
    tot_se = sum(se)
    
    flags = 0
    if tot_ie > 0:
        ll_pct = ((tot_ie - tot_se) / tot_ie) * 100.0
        if ll_pct < 0 or ll_pct > 100:
            flags |= 1
        if tot_se > tot_ie:
            flags |= 2
    else:
        flags |= 4
        
    if cons == 0:
        flags |= 8
        
    row_compact = [
        d_idx, z_idx, c_idx, div_idx, ss_idx, feeder,
        a_idx, n_idx, ie, se, ass, real,
        cons, flags, ptw_ass, ptw_sub
    ]
    output_rows.append(row_compact)

print(f"Total rows extracted: {len(output_rows)}")
print(f"Discoms: {discoms}")
print(f"Zones: {len(zones)}")
print(f"Circles: {len(circles)}")
print(f"Divisions: {len(divisions)}")
print(f"Substations: {len(substations)}")

dataset = {
    'd': {
        'Discom': discoms,
        'Zone': zones,
        'Circle': circles,
        'Division': divisions,
        'SS': substations,
        'Area': areas,
        'Nature': natures
    },
    'rows': output_rows
}

REPO_DIR = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
paths = [
    os.path.join(REPO_DIR, 'data', 'feeders.json'),
    os.path.join(REPO_DIR, 'frontend', 'data', 'feeders.json')
]

for p in paths:
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, separators=(',', ':'))
    print(f"Wrote: {p} ({os.path.getsize(p) / 1024 / 1024:.2f} MB)")

print("Feeders dataset rebuild from Prabhakar Sir audit data COMPLETE.")
