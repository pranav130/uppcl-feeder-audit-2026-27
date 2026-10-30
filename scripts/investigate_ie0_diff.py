import openpyxl, re, json

SIR_FILE = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
REPO_DIR = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"

def norm(s):
    return re.sub(r'[^A-Z0-9]', '', str(s or '').strip().upper())

# Load feeders.json
with open(f'{REPO_DIR}/data/feeders.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

N = d['d']
our_ie0_feeders = {}
for r in d['rows']:
    f_ie = sum(r[8])
    if f_ie == 0:
        fdr = r[5]
        div = N['Division'][r[3]]
        ss = N['SS'][r[4]]
        our_ie0_feeders[norm(div) + norm(ss) + norm(fdr)] = (fdr, div, ss, r)

print(f"Our IE=0 count: {len(our_ie0_feeders)}")

wb_s = openpyxl.load_workbook(SIR_FILE, read_only=True, data_only=True)
ws_s = wb_s['AUDIT DATA']

sir_data = {}
for i, r in enumerate(ws_s.iter_rows(values_only=True)):
    if i < 2: continue
    if r[0] is None and r[6] is None: continue
    div = norm(r[4]); ss = norm(r[5]); fdr = norm(r[6])
    sir_data[div + ss + fdr] = r
    sir_data[ss + fdr] = r
    if fdr not in sir_data:
        sir_data[fdr] = r
wb_s.close()

diff_feeders = []
for k, (fdr, div, ss, r) in our_ie0_feeders.items():
    sr = sir_data.get(k) or sir_data.get(norm(ss) + norm(fdr)) or sir_data.get(norm(fdr))
    if sr:
        sir_ie_upto = sr[10]
        sir_slab = str(sr[18]).strip()
        monthly_ie_sir = sr[28:34]
        if sir_slab != 'I.E. is 0 or not filled':
            diff_feeders.append((fdr, div, ss, sir_ie_upto, sir_slab, monthly_ie_sir, r[8]))

print(f"Feeders where our fIE==0 but Sir slab != 'I.E. is 0 or not filled': {len(diff_feeders)}")
for df in diff_feeders[:10]:
    print(f"Feeder: {df[0]}")
    print(f"  Sir IE Upto (col 10): {df[3]} | Sir Slab: {df[4]}")
    print(f"  Sir Monthly IE (Apr-Sep, cols 28-33): {df[5]}")
    print(f"  Our Monthly IE in feeders.json: {df[6]}")
