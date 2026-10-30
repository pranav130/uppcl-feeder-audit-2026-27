import json
import openpyxl

# Load sir summary
path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws_summ = wb['summry']

target_zones = {}
for i, row in enumerate(ws_summ.iter_rows(values_only=True)):
    if i < 2: continue
    disc = row[0]
    zone = row[1]
    if not zone: continue
    key = zone.strip().upper()
    target_zones[key] = {
        'total': row[2],
        'll': [row[c] for c in range(3, 11)],
        'atc': [row[c] for c in range(11, 19)],
        'ie0': row[19] or 0,
        'nocons': row[20] or 0
    }

# Load our generated feeders_from_sir_sheet.json
with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders_from_sir_sheet.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

N = d['d']
R = d['rows']

SLABS = ['0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%', '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal']

def classify_ll(loss_pct, ie, cons):
    if ie == 0: return 'IE 0'
    if cons == 0: return 'No Cons'
    if loss_pct is None: return 'Abnormal'
    if loss_pct < 0 or loss_pct > 100: return 'Abnormal'
    if loss_pct < 5: return '0% to 5%'
    if loss_pct < 10: return '5% to 10%'
    if loss_pct < 20: return '10% to 20%'
    if loss_pct < 30: return '20% to 30%'
    if loss_pct < 50: return '30% to 50%'
    if loss_pct < 70: return '50% to 70%'
    return 'Above 70%'

def classify_atc(loss_pct, ie, cons):
    if ie == 0: return 'IE 0'
    if cons == 0: return 'No Cons'
    if loss_pct is None: return 'Abnormal'
    if loss_pct < 0 or loss_pct > 100: return 'Abnormal'
    if loss_pct < 5: return '0% to 5%'
    if loss_pct < 10: return '5% to 10%'
    if loss_pct < 20: return '10% to 20%'
    if loss_pct < 30: return '20% to 30%'
    if loss_pct < 50: return '30% to 50%'
    if loss_pct < 70: return '50% to 70%'
    return 'Above 70%'

calc_zones = {}

for r in R:
    zone = N['Zone'][r[1]].upper()
    if zone not in calc_zones:
        calc_zones[zone] = {
            'total': 0,
            'll': {s: 0 for s in SLABS},
            'atc': {s: 0 for s in SLABS},
            'ie0': 0, 'nocons': 0
        }
    cz = calc_zones[zone]
    cz['total'] += 1
    
    f_ie = sum(r[8])
    f_se = sum(r[9])
    f_ass = sum(r[10])
    f_real = sum(r[11])
    cons = r[12]
    
    be = (f_se / f_ie * 100.0) if f_ie > 0 else None
    ce = (f_real / f_ass * 100.0) if f_ass > 0 else (100.0 if f_real > 0 else None)
    ll = (100.0 - be) if be is not None else None
    atc = (100.0 - (be * ce / 100.0)) if (be is not None and ce is not None) else None
    
    s_ll = classify_ll(ll, f_ie, cons)
    s_atc = classify_atc(atc, f_ie, cons)
    
    if s_ll == 'IE 0': cz['ie0'] += 1
    elif s_ll == 'No Cons': cz['nocons'] += 1
    elif s_ll in cz['ll']: cz['ll'][s_ll] += 1
    
    if s_atc in cz['atc']: cz['atc'][s_atc] += 1

mismatches = 0
for z, tgt in target_zones.items():
    c = calc_zones[z]
    if tgt['total'] != c['total'] or tgt['ie0'] != c['ie0'] or tgt['nocons'] != c['nocons']:
        print(f"Mismatch in zone {z} totals: tgt={tgt} vs calc={c}")
        mismatches += 1
        continue
    for idx, s in enumerate(SLABS):
        if tgt['ll'][idx] != c['ll'][s]:
            print(f"Mismatch in zone {z} LL {s}: tgt={tgt['ll'][idx]} vs calc={c['ll'][s]}")
            mismatches += 1
            break
        if tgt['atc'][idx] != c['atc'][s]:
            print(f"Mismatch in zone {z} ATC {s}: tgt={tgt['atc'][idx]} vs calc={c['atc'][s]}")
            mismatches += 1
            break

if mismatches == 0:
    print("MATCH VERIFIED: Our dataset logic reproduces Prabhakar Sir summary with ZERO mismatches across all 40 zones!")
else:
    print(f"Total mismatches: {mismatches}")
