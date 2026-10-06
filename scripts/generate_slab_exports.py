import os
import sys
import json
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

data_file = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\data\feeders.json"
slab_data_dir = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\slab_data"
excel_exports_dir = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\Slab_Excel_Exports"

os.makedirs(slab_data_dir, exist_ok=True)
os.makedirs(excel_exports_dir, exist_ok=True)

with open(data_file, 'r', encoding='utf-8') as f:
    dataset = json.load(f)

N = dataset['d']
R = dataset['rows']

SLABS = [
    ('0% to 5%', '0_to_5_pct'),
    ('5% to 10%', '5_to_10_pct'),
    ('10% to 20%', '10_to_20_pct'),
    ('20% to 30%', '20_to_30_pct'),
    ('30% to 50%', '30_to_50_pct'),
    ('50% to 70%', '50_to_70_pct'),
    ('Above 70%', 'Above_70_pct'),
    ('Abnormal', 'Abnormal'),
    ('IE 0', 'IE_0'),
    ('No Cons', 'No_Cons')
]

def classify_slab(loss_pct, ie, cons, flags):
    if ie == 0: return 'IE 0'
    if cons == 0 or (flags & 8): return 'No Cons'
    if loss_pct is None: return 'Abnormal'
    if loss_pct < 0 or (flags & 1) or loss_pct > 100: return 'Abnormal'
    if loss_pct < 5: return '0% to 5%'
    if loss_pct < 10: return '5% to 10%'
    if loss_pct < 20: return '10% to 20%'
    if loss_pct < 30: return '20% to 30%'
    if loss_pct < 50: return '30% to 50%'
    if loss_pct < 70: return '50% to 70%'
    return 'Above 70%'

# Map records to drilldown row format:
# 0: Discom, 1: Zone, 2: Circle, 3: Division, 4: Substation, 5: Feeder, 6: Area, 7: Nature,
# 8: InputEnergyMu, 9: SoldEnergyMu, 10: AssessmentCr, 11: RealizationCr,
# 12: BillingEff%, 13: CollectionEff%, 14: LineLoss%, 15: ATCLoss%,
# 16: LineSlab, 17: ATCSlab, 18: ABR, 19: Consumers, 20: ThruRate, 21: ATCLossValueCr, 22: LossPerUnit, 23: IsPTW
drilldown_rows = []

for r in R:
    discom = N['Discom'][r[0]]
    zone = N['Zone'][r[1]]
    circle = N['Circle'][r[2]]
    division = N['Division'][r[3]]
    ss = N['SS'][r[4]]
    feeder = r[5]
    area = N['Area'][r[6]]
    nature = N['Nature'][r[7]]

    f_ie = sum(r[8])
    f_se = sum(r[9])
    f_ass = sum(r[10])
    f_real = sum(r[11])
    cons = r[12]
    flags = r[13]
    ptw_ass = sum(r[14])
    is_ptw = 1 if (flags & 16) else 0

    be = (f_se / f_ie * 100.0) if f_ie > 0 else None
    ce = (f_real / f_ass * 100.0) if f_ass > 0 else (100.0 if f_real > 0 else None)
    ll = (100.0 - be) if be is not None else None
    atc = (100.0 - (be * ce / 100.0)) if (be is not None and ce is not None) else None

    line_slab = classify_slab(ll, f_ie, cons, flags)
    atc_slab  = classify_slab(atc, f_ie, cons, flags)

    abr = (f_ass * 100.0 / f_se) if f_se > 0 else 0.0
    thru = (f_real * 100.0 / f_ie) if f_ie > 0 else 0.0

    rate = abr if (abr >= 3.0 and abr <= 15.0) else 7.0
    atc_loss_cr = (f_ie * 1000.0 * rate * (atc or 0.0) / 100.0) / 1e7 if f_ie > 0 else 0.0
    loss_per_unit = (atc_loss_cr * 1e7) / (f_ie * 1000.0) if f_ie > 0 else 0.0

    row_data = [
        discom, zone, circle, division, ss, feeder, area, nature,
        round(f_ie / 1000.0, 3), # MU
        round(f_se / 1000.0, 3), # MU
        round(f_ass / 100.0, 3), # Cr
        round(f_real / 100.0, 3), # Cr
        f"{be:.2f}%" if be is not None else "0.00%",
        f"{ce:.2f}%" if ce is not None else "0.00%",
        f"{ll:.2f}%" if ll is not None else "0.00%",
        f"{atc:.2f}%" if atc is not None else "0.00%",
        line_slab, atc_slab,
        round(abr, 2), cons, round(thru, 2),
        round(atc_loss_cr, 3), round(loss_per_unit, 2),
        is_ptw
    ]
    drilldown_rows.append((row_data, line_slab, atc_slab, f_ie / 1000.0, f_se / 1000.0, f_ass / 100.0, f_real / 100.0))

print("Generating slab files for Line Loss and AT&C Loss...")
for loss_type, loss_idx, prefix in [('line_loss', 16, 'Line_Loss'), ('atc_loss', 17, 'ATC_Loss')]:
    for slab_name, slug in SLABS:
        matching = [d for d in drilldown_rows if d[0][loss_idx] == slab_name]
        m_rows = [m[0] for m in matching]

        tot_ie = sum(m[3] for m in matching)
        tot_se = sum(m[4] for m in matching)
        tot_ass = sum(m[5] for m in matching)
        tot_real = sum(m[6] for m in matching)

        be = (tot_se / tot_ie * 100.0) if tot_ie > 0 else 0.0
        ce = (tot_real / tot_ass * 100.0) if tot_ass > 0 else (100.0 if tot_real > 0 else 0.0)
        ll = (100.0 - be) if tot_ie > 0 else 0.0
        atc = 100.0 - (be * ce / 100.0)

        slab_json = {
            "tot_ie": round(tot_ie, 2),
            "tot_se": round(tot_se, 2),
            "tot_ass": round(tot_ass, 2),
            "tot_real": round(tot_real, 2),
            "feeder_count": len(m_rows),
            "be_overall": round(be, 2),
            "ll_overall": round(ll, 2),
            "atc_overall": round(atc, 2),
            "rows": m_rows
        }

        # Write JS for drilldown explorer
        js_out = os.path.join(slab_data_dir, f"{loss_type}_{slug}.js")
        with open(js_out, "w", encoding="utf-8") as f:
            f.write("window.CURRENT_SLAB_DATA = ")
            json.dump(slab_json, f, separators=(',', ':'))
            f.write(";\n")

        # Write Excel file
        excel_out = os.path.join(excel_exports_dir, f"{prefix}_{slug}.xlsx")
        wb_slab = openpyxl.Workbook()
        ws = wb_slab.active
        ws.title = f"{prefix}_{slug}"[:31]

        headers = [
            "#", "Discom", "Zone", "Circle", "Division", "Substation", "Feeder",
            "Project Area", "Feeder Nature", "Input Energy (MU)", "Sold Energy (MU)",
            "Assessment (Cr)", "Realization (Cr)", "Billing Eff (%)", "Collection Eff (%)",
            "Line Loss (%)", "AT&C Loss (%)", "Line Slab", "AT&C Slab", "ABR (₹/kWh)",
            "Consumers", "Throughput Rate (₹/kWh)", "AT&C Loss Value (Cr)", "Loss Per Unit (₹)", "Is PTW"
        ]
        ws.append(headers)
        for i, row in enumerate(m_rows):
            ws.append([i+1] + row)
        wb_slab.save(excel_out)

print("All slab datasets and Excel exports generated successfully.")
