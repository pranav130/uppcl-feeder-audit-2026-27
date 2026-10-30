import openpyxl
import json
from collections import Counter

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

sir_feeders = {}
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    feeder_name = row[6]
    key = row[7]
    discom = row[0]
    zone = row[2]
    ie = row[10]
    se = row[11]
    ass = row[12]
    real = row[13]
    be = row[14]
    ce = row[15]
    ll = row[16]
    atc = row[17]
    ll_s = row[18]
    atc_s = row[19]
    billable_sep = row[45]

    sir_feeders[feeder_name] = {
        'discom': discom, 'zone': zone, 'key': key,
        'ie': ie, 'se': se, 'ass': ass, 'real': real,
        'be': be, 'ce': ce, 'll': ll, 'atc': atc,
        'll_s': ll_s, 'atc_s': atc_s, 'billable_sep': billable_sep
    }

print(f'Total feeders in Sir AUDIT DATA: {len(sir_feeders)}')

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

N = d['d']
R = d['rows']

matched = 0
unmatched = 0
ll_match = 0
atc_match = 0

for r in R:
    fname = r[5]
    if fname in sir_feeders:
        matched += 1
    else:
        unmatched += 1

print(f'Feeders matched by name: {matched} / {len(R)} (Unmatched: {unmatched})')
