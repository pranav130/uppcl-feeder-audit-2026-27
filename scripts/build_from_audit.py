# Build the offline dashboard dataset from the monthly audit workbook (new consumer-master logic)
import sys, json, pickle, numpy as np, re, datetime
from collections import Counter
from python_calamine import CalamineWorkbook
SRC = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads/11KV total feeders prog audit 2026-27 upto Oct-26 F.xlsx"
NM = 7   # months Apr..Oct present
wb = CalamineWorkbook.from_path(SRC)
A = wb.get_sheet_by_name('AUDIT DATA').to_python()
H = A[1]
def find(prefix):
    for i, h in enumerate(H):
        if str(h).replace('\n', ' ').strip().startswith(prefix): return i
    raise KeyError(prefix)
C = {k: find(p) for k, p in {
    'ie': 'I.E.', 'bil': 'Billable _Apr', 'load': 'Load', 'se': 'Total S.E. _Apr', 'ca': 'Total CA_ex_Subs', 'real': 'Total Realization_ inc_Govt',
    'pb': 'PTW _Billable', 'pse': 'PTW_S.E.', 'pca': 'PTW_CA_Ex_Subs', 'ps': 'PTW_SUBS', 'pt': 'PTW_ Tariff_Subs', 'pp': 'PTW_ Paid',
    'gb': 'Govt. _Billable', 'gse': 'Govt._S.E.', 'gca': 'Govt._CA_Ex_Subs', 'gp': 'Govt._ Paid', 'opl': 'Others_ Powerloom', 'ot': 'Others_ Tariff_Subs'}.items()}
rows = [r for r in A[2:] if str(r[0]).strip()]
def num(v):
    try: f = float(v); return 0.0 if f != f else f
    except: return 0.0
def arr(r, k, d=5): return [round(num(r[C[k] + m]), d) for m in range(NM)]
DISC = ['PASCHIMANCHAL', 'DAKSHINANCHAL', 'POORVANCHAL', 'MADHYANCHAL', 'KESCO']
AREA = ['URBAN', 'TEHSIL', 'RURAL']
NAT = ['OTHER', 'INDEPENDENT', 'MIXED ABOVE 50%', 'SPARE', 'SUBSTATION', 'MIXED ABOVE 25%', 'AGRICULTURE', 'INDUSTRIAL ABOVE 75%']
dims = {k: [] for k in ['Zone', 'Circle', 'Division', 'SS']}; idx = {k: {} for k in dims}
def gi(k, v):
    v = str(v or '').strip().upper() or 'UNKNOWN'
    if v not in idx[k]: idx[k][v] = len(dims[k]); dims[k].append(v)
    return idx[k][v]
def area(a):
    a = str(a or '').strip().upper()
    return 'URBAN' if a in ('URBAN', 'IPDS', 'DISTRICT HQ') else ('TEHSIL' if a == 'TEHSIL' else 'RURAL')
def nat(n):
    n = str(n or '').strip().upper(); return n if n in NAT else 'OTHER'
MON = {datetime.date(2026, m, 1): i for i, m in enumerate([4, 5, 6, 7, 8, 9, 10])}
out = []
for r in rows:
    ie = arr(r, 'ie'); se = arr(r, 'se'); ca = arr(r, 'ca'); real = arr(r, 'real')
    bil = [int(round(x)) for x in arr(r, 'bil', 0)]
    pt = arr(r, 'pt'); ot = arr(r, 'ot'); opl = arr(r, 'opl')
    tie, tse = sum(ie), sum(se); fl = 0
    if tie > 0:
        ll = (tie - tse) / tie * 100
        if ll < 0 or ll > 100: fl |= 1
        if tse > tie: fl |= 2
    else: fl |= 4
    if bil[NM - 1] == 0: fl |= 8
    added = r[8]; first = MON.get(added) if isinstance(added, datetime.date) else None
    rec = [DISC.index(str(r[0]).strip().upper()), gi('Zone', r[2]), gi('Circle', r[3]), gi('Division', r[4]), gi('SS', r[5]), str(r[6]).strip(),
           AREA.index(area(r[9])), NAT.index(nat(r[10])), ie, se, ca, real, bil[NM - 1], fl,
           arr(r, 'pca'), arr(r, 'ps'), bil, first if first else None, None,
           arr(r, 'pp'), arr(r, 'gca'), arr(r, 'gp'), pt, [round(a + b, 5) for a, b in zip(ot, opl)],
           [round(x) for x in arr(r, 'load', 0)], [int(round(x)) for x in arr(r, 'pb', 0)], [int(round(x)) for x in arr(r, 'gb', 0)],
           arr(r, 'pse'), arr(r, 'gse')]
    out.append(rec)
ds = {'d': {'Discom': DISC, 'Zone': dims['Zone'], 'Circle': dims['Circle'], 'Division': dims['Division'], 'Area': AREA, 'Nature': NAT, 'SS': dims['SS']}, 'rows': out}
# reference summaries from the workbook for the Data Audit reconciliation
ref = {}
for s in ['DISCOM-wise', 'Zone-wise Dist. loss', 'Zone-wise AT&C']:
    ref[s] = [[x if not isinstance(x, (datetime.date, datetime.datetime)) else str(x) for x in r] for r in wb.get_sheet_by_name(s).to_python()]
json.dump({'feeders': ds, 'ref': ref, 'source': SRC.split('/')[-1], 'cols': {k: H[v] for k, v in C.items()}}, open('/home/claude/build2/payload.json', 'w'), separators=(',', ':'))
print(len(out), Counter(DISC[r[0]] for r in out), 'added in Oct', sum(1 for r in out if r[17] == 6))
