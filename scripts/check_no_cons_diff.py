import openpyxl
import json

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

our_feeders = {r[5]: r for r in d['rows']}

diff_samples = []
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    f_name = row[6]
    ll_s = row[18]
    billable_sep = row[45] # AT
    sold_prog = row[11]

    if ll_s == 'No Cosumers Tagged':
        if f_name in our_feeders:
            our_r = our_feeders[f_name]
            our_cons = our_r[12]
            our_se = sum(our_r[9])
            if our_cons > 0 or our_se > 0:
                diff_samples.append((f_name, row[10], sold_prog, billable_sep, our_cons, our_se))
                if len(diff_samples) >= 10:
                    break

print(f'Total diff samples where Sir sheet is No Cons but Dashboard has Cons or SE: {len(diff_samples)}')
for s in diff_samples[:5]:
    print(' ', s)
