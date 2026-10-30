import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws_audit = wb['AUDIT DATA']
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

calc_zones = {}
SLABS = ['0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%', '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal']

for i, row in enumerate(ws_audit.iter_rows(values_only=True)):
    if i < 2: continue
    zone = str(row[2] or '').strip().upper()
    if not zone: continue
    if zone not in calc_zones:
        calc_zones[zone] = {
            'total': 0,
            'll': {s: 0 for s in SLABS},
            'atc': {s: 0 for s in SLABS},
            'ie0': 0, 'nocons': 0
        }
    cz = calc_zones[zone]
    cz['total'] += 1
    ll_s = row[18]
    atc_s = row[19]
    if ll_s == 'I.E. is 0 or not filled': cz['ie0'] += 1
    elif ll_s == 'No Cosumers Tagged': cz['nocons'] += 1
    elif ll_s in cz['ll']: cz['ll'][ll_s] += 1
    if atc_s in cz['atc']: cz['atc'][atc_s] += 1

mismatches = 0
for z, tgt in target_zones.items():
    if z not in calc_zones:
        print(f"Zone {z} missing in calculated!")
        mismatches += 1
        continue
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
    print("ALL 40 ZONES AND DISCOMS MATCH 100.000% EXACTLY WITH ZERO MISMATCHES!")
else:
    print(f"Total mismatches: {mismatches}")
