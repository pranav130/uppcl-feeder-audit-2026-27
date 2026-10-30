import json

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders_from_sir_sheet.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

N = d['d']
R = d['rows']

b_rows = [r for r in R if N['Zone'][r[1]].upper() == 'BULANDSHAHAR']
print(f"Total rows in feeders_from_sir_sheet for BULANDSHAHAR: {len(b_rows)}")
