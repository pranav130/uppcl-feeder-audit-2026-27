import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

# Let's count Col 18 (LL Slab) and Col 19 (ATC Slab) from Sir's sheet:
from collections import Counter
ll_counts = Counter()
atc_counts = Counter()

discom_ll = {}
discom_atc = {}

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    disc = row[0]
    ll_s = row[18]
    atc_s = row[19]
    ll_counts[ll_s] += 1
    atc_counts[atc_s] += 1
    
    if disc not in discom_ll:
        discom_ll[disc] = Counter()
        discom_atc[disc] = Counter()
    discom_ll[disc][ll_s] += 1
    discom_atc[disc][atc_s] += 1

print("=== EXACT COUNTS IN SIR'S AUDIT DATA SHEET ===")
print("Line Loss Slabs:")
for k, v in ll_counts.items():
    print(f"  {k}: {v}")

print("\nAT&C Loss Slabs:")
for k, v in atc_counts.items():
    print(f"  {k}: {v}")

print("\nBy Discom:")
for disc in discom_ll:
    print(f"\n[{disc}] (Total: {sum(discom_ll[disc].values())})")
    print(f"  LL: {dict(discom_ll[disc])}")
    print(f"  ATC: {dict(discom_atc[disc])}")
