import openpyxl
import json

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['summry']

sir_discoms = {}
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    disc = row[0]
    zone = row[1]
    if disc and 'Total' in str(disc):
        dname = str(disc).replace('Total', '').strip().upper()
        sir_discoms[dname] = {
            'total': row[2],
            'll': [row[c] for c in range(3, 11)],
            'atc': [row[c] for c in range(11, 19)],
            'ie0': row[19] or 0,
            'nocons': row[20] or 0
        }

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

N = d['d']
R = d['rows']

SLAB_NAMES = ['0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%', '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal']

def classify_ll(loss_pct, ie, cons, flags):
    if ie == 0: return 'IE 0'
    if cons == 0 or (flags & 8): return 'No Cons'
    if loss_pct is None: return 'Abnormal'
    if loss_pct < 0 or (flags & 1) or loss_pct > 100: return 'Abnormal'
    if loss_pct < 5: return '0% to 5%'
    if loss_pct < 10: return '5% to 10%'
    if loss_pct < 20: return '10% to 20%'
    if loss_pct < 30: return '20% to 30%'
    if loss_pct < 50: return '30% to 50%'
    if loss_pct < 70: return '50% to 70%'
    return 'Above 70%'

# Decoupled AT&C classification (Prabhakar formula logic)
def classify_atc_decoupled(loss_pct, ie, cons, flags):
    if ie == 0: return 'IE 0'
    if cons == 0 or (flags & 8): return 'No Cons'
    if loss_pct is None: return 'Abnormal'
    if loss_pct < 0 or loss_pct > 100: return 'Abnormal'
    if loss_pct < 5: return '0% to 5%'
    if loss_pct < 10: return '5% to 10%'
    if loss_pct < 20: return '10% to 20%'
    if loss_pct < 30: return '20% to 30%'
    if loss_pct < 50: return '30% to 50%'
    if loss_pct < 70: return '50% to 70%'
    return 'Above 70%'

# Coupled AT&C classification (Current dashboard logic)
def classify_atc_coupled(loss_pct, ie, cons, flags):
    if ie == 0: return 'IE 0'
    if cons == 0 or (flags & 8): return 'No Cons'
    if loss_pct is None: return 'Abnormal'
    if loss_pct < 0 or (flags & 1) or loss_pct > 100: return 'Abnormal'
    if loss_pct < 5: return '0% to 5%'
    if loss_pct < 10: return '5% to 10%'
    if loss_pct < 20: return '10% to 20%'
    if loss_pct < 30: return '20% to 30%'
    if loss_pct < 50: return '30% to 50%'
    if loss_pct < 70: return '50% to 70%'
    return 'Above 70%'

dash_discoms = {}
for disc in N['Discom']:
    dash_discoms[disc] = {
        'total': 0,
        'll': {s: 0 for s in SLAB_NAMES},
        'atc_c': {s: 0 for s in SLAB_NAMES},
        'atc_d': {s: 0 for s in SLAB_NAMES},
        'ie0': 0, 'nocons': 0
    }

for r in R:
    disc = N['Discom'][r[0]]
    f_ie = sum(r[8])
    f_se = sum(r[9])
    f_ass = sum(r[10])
    f_real = sum(r[11])
    cons = r[12]
    flags = r[13]

    be = (f_se / f_ie * 100.0) if f_ie > 0 else None
    ce = (f_real / f_ass * 100.0) if f_ass > 0 else (100.0 if f_real > 0 else None)
    ll = (100.0 - be) if be is not None else None
    atc = (100.0 - (be * ce / 100.0)) if (be is not None and ce is not None) else None

    s_ll = classify_ll(ll, f_ie, cons, flags)
    s_atc_c = classify_atc_coupled(atc, f_ie, cons, flags)
    s_atc_d = classify_atc_decoupled(atc, f_ie, cons, flags)

    d_entry = dash_discoms[disc]
    d_entry['total'] += 1
    if s_ll in d_entry['ll']: d_entry['ll'][s_ll] += 1
    elif s_ll == 'IE 0': d_entry['ie0'] += 1
    elif s_ll == 'No Cons': d_entry['nocons'] += 1

    if s_atc_c in d_entry['atc_c']: d_entry['atc_c'][s_atc_c] += 1
    if s_atc_d in d_entry['atc_d']: d_entry['atc_d'][s_atc_d] += 1

print('=== DISCOM TOTALS COMPARISON ===')
for disc in ['PASCHIMANCHAL', 'DAKSHINANCHAL', 'MADHYANCHAL', 'POORVANCHAL', 'KESCO']:
    s_data = sir_discoms.get(disc, {})
    d_data = dash_discoms.get(disc, {})
    print(f"\n[{disc}]")
    print(f"  Total Feeders: Sir Sheet = {s_data.get('total')} | Dashboard = {d_data.get('total')} (Diff: {d_data.get('total') - s_data.get('total')})")
    print(f"  IE 0:          Sir Sheet = {s_data.get('ie0')} | Dashboard = {d_data.get('ie0')}")
    print(f"  No Cons:       Sir Sheet = {s_data.get('nocons')} | Dashboard = {d_data.get('nocons')}")
    print("  Line Loss Slabs (Sir vs Dash):")
    for idx, s in enumerate(SLAB_NAMES):
        print(f"    {s:<12}: Sir = {s_data.get('ll', [0]*8)[idx]:<5} | Dash = {d_data.get('ll', {}).get(s, 0):<5}")
    print("  AT&C Loss Slabs (Sir vs Dash Current [Coupled] vs Dash Fixed [Decoupled]):")
    for idx, s in enumerate(SLAB_NAMES):
        print(f"    {s:<12}: Sir = {s_data.get('atc', [0]*8)[idx]:<5} | Dash Current = {d_data.get('atc_c', {}).get(s, 0):<5} | Dash Fixed = {d_data.get('atc_d', {}).get(s, 0):<5}")
