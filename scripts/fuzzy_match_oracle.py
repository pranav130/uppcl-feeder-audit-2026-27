import sys, openpyxl, re, json

sys.stdout.reconfigure(encoding='utf-8')

def normalize(s): return re.sub(r'\s+', ' ', str(s or '').strip().upper())
DISCOM_MAP = {'DAKSHINANCHAL': 'DVVNL', 'MADHYANCHAL': 'MVVNL', 'PASCHIMANCHAL': 'PVVNL', 'POORVANCHAL': 'PUVVNL', 'KESCO': 'KESCO'}
def norm_discom(d): return DISCOM_MAP.get(normalize(d), normalize(d))

# Load Oracle
oracle_path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\UPDATED_FEEDERWISE_CONSUMPITON_ASSMT_REAL_SEP26.xlsx'
wb_o = openpyxl.load_workbook(oracle_path, read_only=True, data_only=True)
ws_o = wb_o['SEP26']

oracle_feeders = set()
oracle_names_only = {}

for i, r in enumerate(ws_o.iter_rows(values_only=True)):
    if i == 0: continue
    disc = norm_discom(r[0])
    ss = normalize(r[4])
    fdr = normalize(r[5])
    k = (disc, ss, fdr)
    oracle_feeders.add(k)
    
    # Strip trailing code after underscore
    base_fdr = fdr.split('_')[0].strip()
    base_k = (disc, ss, base_fdr)
    oracle_names_only[base_k] = k
wb_o.close()

# Load 277 new feeders
wb_e = openpyxl.load_workbook(r'C:\Users\HP\Documents\New Sep Input energy data.xlsx', read_only=True, data_only=True)
ws_e = wb_e['Sheet1']

new_277 = []
for i, row in enumerate(ws_e.iter_rows(values_only=True)):
    if i == 0: continue
    if row[9] is True or str(row[9]).upper() == 'TRUE':
        disc = norm_discom(row[0])
        ss = normalize(row[4])
        fdr = normalize(row[8])
        new_277.append((disc, ss, fdr, row))
wb_e.close()

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    master = json.load(f)
N = master['d']
R = master['rows']
dash_keys = set((norm_discom(N['Discom'][r[0]]), normalize(N['SS'][r[4]]), normalize(r[5])) for r in R)

new_unmatched_in_dash = [x for x in new_277 if (x[0], x[1], x[2]) not in dash_keys]

matched_exact_o = 0
matched_base_o = 0
unmatched_o = []

for disc, ss, fdr, row in new_unmatched_in_dash:
    k = (disc, ss, fdr)
    base_fdr = fdr.split('_')[0].strip()
    base_k = (disc, ss, base_fdr)
    if k in oracle_feeders:
        matched_exact_o += 1
    elif base_k in oracle_names_only:
        matched_base_o += 1
    else:
        unmatched_o.append((k, row))

print(f'Total new feeders: {len(new_unmatched_in_dash)}')
print(f'Matched exact Oracle: {matched_exact_o}')
print(f'Matched base Oracle: {matched_base_o}')
print(f'Unmatched Oracle: {len(unmatched_o)}')

# Let's inspect what kind of feeders are unmatched
natures = {}
for k, row in unmatched_o:
    nat = row[17] or 'UNKNOWN'
    natures[nat] = natures.get(nat, 0) + 1
print('Unmatched natures:', natures)
