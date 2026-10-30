import openpyxl
import json

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

sir_data = {}
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    f_name = row[6]
    key = row[7]
    sir_data[f_name] = {
        'll_slab': row[18],
        'atc_slab': row[19],
        'billable_sep': row[45],
        'ie_prog': row[10],
        'se_prog': row[11],
        'ass_prog': row[12],
        'real_prog': row[13]
    }

print(f"Total feeders in Prabhakar Sir AUDIT DATA: {len(sir_data)}")

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

N = d['d']
R = d['rows']

print(f"Total feeders in our dataset: {len(R)}")

# Compare how many feeders have billable_sep == None/0 in Sir data
sir_no_cons = sum(1 for v in sir_data.values() if v['ll_slab'] == 'No Cosumers Tagged')
sir_ie_0 = sum(1 for v in sir_data.values() if v['ll_slab'] == 'I.E. is 0 or not filled')

print(f"Sir sheet 'No Cosumers Tagged': {sir_no_cons}")
print(f"Sir sheet 'I.E. is 0 or not filled': {sir_ie_0}")
