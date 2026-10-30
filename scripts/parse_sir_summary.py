import openpyxl
import json

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['summry']

# Parse Prabhakar Sir summary rows
sir_zones = {}
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    disc = row[0]
    zone = row[1]
    if not zone and not disc: continue
    
    # row format:
    # 0: Discom, 1: Zone, 2: Total Feeders, 
    # 3-10: LL Slabs (0-5, 5-10, 10-20, 20-30, 30-50, 50-70, >70, Abnormal)
    # 11-18: ATC Slabs (0-5, 5-10, 10-20, 20-30, 30-50, 50-70, >70, Abnormal)
    # 19: IE 0, 20: No Cons
    
    key = (disc or '').strip() + '___' + (zone or '').strip()
    sir_zones[key] = {
        'disc': disc, 'zone': zone, 'total': row[2],
        'll': [row[c] for c in range(3, 11)],
        'atc': [row[c] for c in range(11, 19)],
        'ie0': row[19], 'nocons': row[20]
    }

print(f'Total summary rows parsed from Sir sheet: {len(sir_zones)}')

# Check totals
uppcl_total = None
for k, v in sir_zones.items():
    if 'UPPCL' in k or (v['disc'] and 'UPPCL' in v['disc']) or (v['zone'] and 'UPPCL' in v['zone']):
        uppcl_total = v
        break

if uppcl_total:
    print('Sir UPPCL Total:', uppcl_total)
