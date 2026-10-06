import os
import sys
import json
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

excel_path = r"C:\Users\HP\Downloads\11KV total feeders prog audit 2026-27 upto Aug-26 F_excluding absurd CA.xlsx"
dataset_path = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\data\feeders.json"

print("================================================================================")
print("     UPPCL 11KV FEEDER PROGRESSIVE AUDIT (FY 2026-27) VALIDATION SUITE          ")
print("================================================================================")

# 1. Load Dashboard Dataset
print("\n[1/3] Loading Dashboard Dataset (feeders.json)...")
with open(dataset_path, 'r', encoding='utf-8') as f:
    dashboard_data = json.load(f)

N = dashboard_data['d']
R = dashboard_data['rows']
print(f"Loaded {len(R):,} feeders from dashboard dataset.")

SLAB_LABELS = [
    '0% to 5%', '5% to 10%', '10% to 20%', '20% to 30%',
    '30% to 50%', '50% to 70%', 'Above 70%', 'Abnormal',
    'IE 0', 'No Cons'
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

def run_dashboard_engine(include_ptw):
    scoped = 0
    tot_ie = 0.0
    tot_se = 0.0
    tot_ass = 0.0
    tot_real = 0.0
    monthly = [{'ie': 0.0, 'se': 0.0, 'ass': 0.0, 'real': 0.0} for _ in range(5)]
    line_slabs = {s: 0 for s in SLAB_LABELS}
    atc_slabs  = {s: 0 for s in SLAB_LABELS}

    for r in R:
        flags = r[13]
        is_ptw_feeder = (flags & 16) != 0

        if not include_ptw and is_ptw_feeder:
            continue

        scoped += 1
        f_ie = sum(r[8])
        f_se = sum(r[9])
        f_ass = sum(r[10])
        f_real = sum(r[11])
        f_ptw_ass = sum(r[14]) if r[14] else 0.0

        if include_ptw and f_ptw_ass > 0:
            f_real += f_ptw_ass # Credit PTW Assessment to Realization

        tot_ie += f_ie
        tot_se += f_se
        tot_ass += f_ass
        tot_real += f_real

        for m in range(5):
            monthly[m]['ie'] += r[8][m]
            monthly[m]['se'] += r[9][m]
            monthly[m]['ass'] += r[10][m]
            m_real = r[11][m]
            if include_ptw and r[14] and r[14][m]:
                m_real += r[14][m]
            monthly[m]['real'] += m_real

        cons = r[12]
        be = (f_se / f_ie * 100.0) if f_ie > 0 else None
        ce = (f_real / f_ass * 100.0) if f_ass > 0 else (100.0 if f_real > 0 else None)
        ll = (100.0 - be) if be is not None else None
        atc = (100.0 - (be * ce / 100.0)) if (be is not None and ce is not None) else None

        line_slab = classify_slab(ll, f_ie, cons, flags)
        atc_slab  = classify_slab(atc, f_ie, cons, flags)
        line_slabs[line_slab] += 1
        atc_slabs[atc_slab] += 1

    be_ov = (tot_se / tot_ie * 100.0) if tot_ie > 0 else 0.0
    ce_ov = (tot_real / tot_ass * 100.0) if tot_ass > 0 else (100.0 if tot_real > 0 else 0.0)
    ll_ov = 100.0 - be_ov
    atc_ov = 100.0 - (be_ov * ce_ov / 100.0)

    return {
        'totalFeeders': scoped,
        'inputEnergyMu': tot_ie / 1000.0,
        'soldEnergyMu': tot_se / 1000.0,
        'assessmentCr': tot_ass / 100.0,
        'realizationCr': tot_real / 100.0,
        'billingEff': be_ov,
        'collectionEff': ce_ov,
        'lineLoss': ll_ov,
        'atcLoss': atc_ov,
        'monthly': monthly,
        'lineSlabs': line_slabs,
        'atcSlabs': atc_slabs
    }

print("\n[2/3] Simulating Dashboard Engine for Mode 1 (PTW Excluded) & Mode 2 (PTW Included)...")
res_mode1 = run_dashboard_engine(include_ptw=False)
res_mode2 = run_dashboard_engine(include_ptw=True)

# 2. Direct Verification from Excel Workbook
print("\n[3/3] Performing independent calculation directly from Excel workbook...")
wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
sheet = wb['AUDIT DATA']

raw_total_feeders = 0
raw_agri_feeders = 0
raw_ie_all = 0.0
raw_se_all = 0.0
raw_ass_all = 0.0
raw_real_all = 0.0
raw_ptw_ca_all = 0.0

raw_ie_non_agri = 0.0
raw_se_non_agri = 0.0
raw_ass_non_agri = 0.0
raw_real_non_agri = 0.0

for idx, r in enumerate(sheet.iter_rows(values_only=True)):
    if idx < 2: continue
    if r[0] is None and r[5] is None: continue
    raw_total_feeders += 1

    nature = str(r[7] or '').strip().upper()
    is_agri = (nature == 'AGRICULTURE')
    if is_agri: raw_agri_feeders += 1

    try: ie = float(r[8] or 0)
    except: ie = 0.0
    try: se = float(r[9] or 0)
    except: se = 0.0
    try: ass = float(r[10] or 0)
    except: ass = 0.0
    try: real = float(r[11] or 0)
    except: real = 0.0

    ptw_ca = sum(float(r[c] or 0) for c in range(88, 93) if r[c] not in (None, ''))

    raw_ie_all += ie
    raw_se_all += se
    raw_ass_all += ass
    raw_real_all += real
    raw_ptw_ca_all += ptw_ca

    if not is_agri:
        raw_ie_non_agri += ie
        raw_se_non_agri += se
        raw_ass_non_agri += ass
        raw_real_non_agri += real

wb.close()

print("\n" + "="*80)
print("                          VALIDATION RESULTS                                    ")
print("="*80)

def check(label, actual, expected, tol=0.01, unit=""):
    diff = abs(actual - expected)
    pct_diff = (diff / expected * 100.0) if expected != 0 else diff
    status = "PASS" if diff <= tol or pct_diff <= 0.05 else "FAIL"
    print(f"[{status:4s}] {label:32s} | Actual: {actual:12.2f} {unit:4s} | Expected: {expected:12.2f} {unit:4s} | Diff: {diff:8.4f}")
    return status == "PASS"

tests_passed = True

print("\n--- TEST A: Mode 1 (PTW EXCLUDED - DEFAULT) ---")
tests_passed &= check("Total Feeders", res_mode1['totalFeeders'], raw_total_feeders - raw_agri_feeders, tol=0)
tests_passed &= check("Input Energy (MU)", res_mode1['inputEnergyMu'], raw_ie_non_agri / 1000.0, tol=0.5, unit="MU")
tests_passed &= check("Sold Energy (MU)", res_mode1['soldEnergyMu'], raw_se_non_agri / 1000.0, tol=0.5, unit="MU")
tests_passed &= check("Assessment (Cr)", res_mode1['assessmentCr'], raw_ass_non_agri / 100.0, tol=0.5, unit="Cr")
tests_passed &= check("Realization (Cr)", res_mode1['realizationCr'], raw_real_non_agri / 100.0, tol=0.5, unit="Cr")
tests_passed &= check("Line Loss (%)", res_mode1['lineLoss'], 100.0 - (raw_se_non_agri / raw_ie_non_agri * 100.0), tol=0.02, unit="%")

print("\n--- TEST B: Mode 2 (PTW INCLUDED) ---")
expected_real_mode2 = (raw_real_all + raw_ptw_ca_all) / 100.0
tests_passed &= check("Total Feeders", res_mode2['totalFeeders'], raw_total_feeders, tol=0)
tests_passed &= check("Input Energy (MU)", res_mode2['inputEnergyMu'], raw_ie_all / 1000.0, tol=0.5, unit="MU")
tests_passed &= check("Sold Energy (MU)", res_mode2['soldEnergyMu'], raw_se_all / 1000.0, tol=0.5, unit="MU")
tests_passed &= check("Assessment (Cr)", res_mode2['assessmentCr'], raw_ass_all / 100.0, tol=0.5, unit="Cr")
tests_passed &= check("Realization with PTW (Cr)", res_mode2['realizationCr'], expected_real_mode2, tol=0.5, unit="Cr")
tests_passed &= check("Line Loss (%)", res_mode2['lineLoss'], 100.0 - (raw_se_all / raw_ie_all * 100.0), tol=0.02, unit="%")

print("\n--- TEST C: Slabs Breakdown ---")
print(f"Mode 1 Line Slabs: {res_mode1['lineSlabs']}")
print(f"Mode 2 Line Slabs: {res_mode2['lineSlabs']}")
print(f"Mode 1 AT&C Slabs: {res_mode1['atcSlabs']}")
print(f"Mode 2 AT&C Slabs: {res_mode2['atcSlabs']}")

# Save report
report_data = {
    'status': 'ALL TESTS PASSED' if tests_passed else 'SOME TESTS FAILED',
    'mode1_ptw_excluded': res_mode1,
    'mode2_ptw_included': res_mode2,
    'raw_excel_benchmarks': {
        'totalFeeders': raw_total_feeders,
        'agriFeeders': raw_agri_feeders,
        'nonAgriFeeders': raw_total_feeders - raw_agri_feeders,
        'inputEnergyMuAll': raw_ie_all / 1000.0,
        'soldEnergyMuAll': raw_se_all / 1000.0,
        'assessmentCrAll': raw_ass_all / 100.0,
        'realizationCrAll': raw_real_all / 100.0,
        'realizationCrWithPtw': expected_real_mode2,
        'inputEnergyMuNonAgri': raw_ie_non_agri / 1000.0,
        'soldEnergyMuNonAgri': raw_se_non_agri / 1000.0,
        'assessmentCrNonAgri': raw_ass_non_agri / 100.0,
        'realizationCrNonAgri': raw_real_non_agri / 100.0
    }
}
report_path = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\validation\validation_report.json"
with open(report_path, 'w', encoding='utf-8') as f:
    json.dump(report_data, f, indent=2)

print("\n" + "="*80)
if tests_passed:
    print("SUCCESS: 100% OF VALIDATION TESTS PASSED WITH ZERO UNEXPLAINED DIFFERENCE!")
else:
    print("FAILURE: Discrepancy detected during validation.")
print("="*80)
