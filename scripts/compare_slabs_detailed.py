import json

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

N = d['d']
R = d['rows']

prabhakar_ll = {
    '0% to 5%': 621, '5% to 10%': 761, '10% to 20%': 2213, '20% to 30%': 2646,
    '30% to 50%': 4845, '50% to 70%': 3725, 'Above 70%': 4528, 'Abnormal': 4673,
    'IE 0': 390, 'No Cons': 1908
}
prabhakar_atc = {
    '0% to 5%': 353, '5% to 10%': 421, '10% to 20%': 1317, '20% to 30%': 1791,
    '30% to 50%': 3518, '50% to 70%': 3867, 'Above 70%': 10242, 'Abnormal': 2503,
    'IE 0': 390, 'No Cons': 1908
}

dash_ll = {}
dash_atc_coupled = {}
dash_atc_decoupled = {}

SLABS = ['0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%', '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal', 'IE 0', 'No Cons']
for s in SLABS:
    dash_ll[s] = 0
    dash_atc_coupled[s] = 0
    dash_atc_decoupled[s] = 0

def classify(loss_pct, ie, cons, check_flags, flags):
    if ie == 0: return 'IE 0'
    if cons == 0 or (flags & 8): return 'No Cons'
    if loss_pct is None: return 'Abnormal'
    if loss_pct < 0 or (check_flags and (flags & 1)) or loss_pct > 100: return 'Abnormal'
    if loss_pct < 5: return '0% to 5%'
    if loss_pct < 10: return '5% to 10%'
    if loss_pct < 20: return '10% to 20%'
    if loss_pct < 30: return '20% to 30%'
    if loss_pct < 50: return '30% to 50%'
    if loss_pct < 70: return '50% to 70%'
    return 'Above 70%'

for r in R:
    f_ie = sum(r[8])
    f_se = sum(r[9])
    f_ass = sum(r[10])
    f_real = sum(r[11])
    cons = r[12]
    flags = r[13]

    be = (f_se / f_ie * 100.0) if f_ie > 0 else None
    ce = (f_real / f_ass * 100.0) if f_ass > 0 else (100.0 if f_real > 0 else None)
    ll = (100.0 - be) if be is not None else None
    atc = (100.0 - (be * ce / 100.0)) if (be is not None and ce is not None) else None

    s_ll = classify(ll, f_ie, cons, True, flags)
    s_atc_c = classify(atc, f_ie, cons, True, flags)
    s_atc_d = classify(atc, f_ie, cons, False, flags)

    dash_ll[s_ll] += 1
    dash_atc_coupled[s_atc_c] += 1
    dash_atc_decoupled[s_atc_d] += 1

print("=== LINE LOSS SLABS (Statewide Total) ===")
print(f"{'Slab':<15} | {'Prabhakar Sheet (26,310)':<25} | {'Dashboard (26,237)':<20}")
for s in SLABS:
    print(f"{s:<15} | {prabhakar_ll[s]:<25} | {dash_ll[s]:<20}")

print("\n=== AT&C LOSS SLABS (Statewide Total) ===")
print(f"{'Slab':<15} | {'Prabhakar Sheet (26,310)':<25} | {'Dashboard Current':<20} | {'Dashboard Decoupled':<20}")
for s in SLABS:
    print(f"{s:<15} | {prabhakar_atc[s]:<25} | {dash_atc_coupled[s]:<20} | {dash_atc_decoupled[s]:<20}")
