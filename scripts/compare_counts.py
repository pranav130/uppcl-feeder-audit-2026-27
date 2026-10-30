import sys
import openpyxl
import json
import re
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    master = json.load(f)
N = master['d']
R = master['rows']

def normalize(s): return re.sub(r'\s+', ' ', str(s or '').strip().upper())
DISCOM_MAP = {'DAKSHINANCHAL': 'DVVNL', 'MADHYANCHAL': 'MVVNL', 'PASCHIMANCHAL': 'PVVNL', 'POORVANCHAL': 'PUVVNL', 'KESCO': 'KESCO'}
def norm_discom(d): return DISCOM_MAP.get(normalize(d), normalize(d))

dash_counts = Counter(norm_discom(N['Discom'][r[0]]) for r in R)

wb_e = openpyxl.load_workbook(r'C:\Users\HP\Documents\New Sep Input energy data.xlsx', read_only=True, data_only=True)
ws_e = wb_e['Sheet1']
e26237_counts = Counter()
for i, row in enumerate(ws_e.iter_rows(values_only=True)):
    if i == 0: continue
    if row[9] is True or str(row[9]).upper() == 'TRUE':
        disc = norm_discom(row[0])
        e26237_counts[disc] += 1
wb_e.close()

print('Discom-wise Feeder Counts:')
print(f'{"Discom":<12} | {"Dashboard (Old)":<16} | {"Sep File (26,237)":<18} | {"Difference":<10}')
print('-' * 62)
for d in ['PVVNL', 'DVVNL', 'MVVNL', 'PUVVNL', 'KESCO']:
    old_c = dash_counts.get(d, 0)
    new_c = e26237_counts.get(d, 0)
    print(f'{d:<12} | {old_c:<16} | {new_c:<18} | {new_c - old_c:+10}')
print('-' * 62)
print(f'{"TOTAL":<12} | {sum(dash_counts.values()):<16} | {sum(e26237_counts.values()):<18} | {sum(e26237_counts.values()) - sum(dash_counts.values()):+10}')
