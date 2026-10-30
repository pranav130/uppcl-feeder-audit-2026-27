import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws_audit = wb['AUDIT DATA']
ws_summ = wb['summry']

# Parse target summary
target_zones = {}
for i, row in enumerate(ws_summ.iter_rows(values_only=True)):
    if i < 2: continue
    disc = row[0]
    zone = row[1]
    if not zone and not disc: continue
    key = (disc or '').strip().upper() + '___' + (zone or '').strip().upper()
    target_zones[key] = {
        'total': row[2],
        'll': [row[c] for c in range(3, 11)],
        'atc': [row[c] for c in range(11, 19)],
        'ie0': row[19] or 0,
        'nocons': row[20] or 0
    }

# Now let's calculate from AUDIT DATA directly using the exact formula
SLABS = ['0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%', '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal']

def classify(loss_pct):
    if loss_pct < 0: return 'Abnormal'
    if loss_pct < 0.05: return '0% to 5%'
    if loss_pct < 0.10: return '5% to 10%'
    if loss_pct < 0.20: return '10% to 20%'
    if loss_pct < 0.30: return '20% to 30%'
    if loss_pct < 0.50: return '30% to 50%'
    if loss_pct < 0.70: return '50% to 70%'
    return 'Above 70%'

calc_zones = {}

for i, row in enumerate(ws_audit.iter_rows(values_only=True)):
    if i < 2: continue
    disc = str(row[0] or '').strip().upper()
    zone = str(row[2] or '').strip().upper()
    key = disc + '___' + zone
    
    if key not in calc_zones:
        calc_zones[key] = {
            'total': 0,
            'll': {s: 0 for s in SLABS},
            'atc': {s: 0 for s in SLABS},
            'ie0': 0, 'nocons': 0
        }
    
    cz = calc_zones[key]
    cz['total'] += 1
    
    # Col 18 and 19 in Sir sheet:
    ll_s = row[18]
    atc_s = row[19]
    
    if ll_s == 'I.E. is 0 or not filled': cz['ie0'] += 1
    elif ll_s == 'No Cosumers Tagged': cz['nocons'] += 1
    elif ll_s in cz['ll']: cz['ll'][ll_s] += 1
    
    if atc_s in cz['atc']: cz['atc'][atc_s] += 1

print("Total calculated zones:", len(calc_zones))

# Compare Bulandshahar and Total
for test_key in ['PASCHIMANCHAL___BULANDSHAHAR', 'UPPCL TOTAL___NONE']:
    print(f"\nChecking: {test_key}")
    tgt = target_zones.get(test_key)
    calc = calc_zones.get(test_key)
    print("  Target:", tgt)
    print("  Calculated:", calc)
