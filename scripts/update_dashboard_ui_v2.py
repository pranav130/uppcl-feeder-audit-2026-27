"""
update_dashboard_ui_v2.py
Applies F4-F9 changes to dashboard_app.js and index.html
"""
import sys, re, json, os
sys.stdout.reconfigure(encoding='utf-8')

REPO = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
SCRATCH = r"C:\Users\HP\.gemini\antigravity\brain\3a1f71b5-7420-451d-82f6-5187ac767485\scratch"

# ── 1. Load category_oct_counts for embedding ─────────────────────────
with open(os.path.join(SCRATCH, 'category_oct_counts.json'), encoding='utf-8') as f:
    cat_oct = json.load(f)
cat_oct_js = "const CATEGORY_OCT_COUNTS = " + json.dumps(cat_oct, separators=(',', ':')) + ";"

# ── 2. Update dashboard_app.js ─────────────────────────────────────────
for path in [
    REPO + r'\dashboard_app.js',
    REPO + r'\frontend\dashboard_app.js',
]:
    with open(path, encoding='utf-8') as f:
        txt = f.read()

    orig = txt  # keep for change detection

    # F8: Fix DISCOM_MONTHLY_BILLABLE_RATIOS (Oct ratios from offline HTML)
    txt = txt.replace(
        """const DISCOM_MONTHLY_BILLABLE_RATIOS = {
  'PVVNL': [0.98693, 0.99020, 0.99333, 0.99728, 1.0, 1.00277, 1.00499],
  'DVVNL': [0.98644, 0.99152, 0.99505, 0.99809, 1.0, 1.00259, 1.00489],
  'PUVNL': [0.98836, 0.99296, 0.99465, 0.99758, 1.0, 1.00273, 1.00269],
  'MVVNL': [0.98449, 0.98850, 0.99325, 0.99700, 1.0, 1.00328, 1.00709],
  'KESCO': [0.99022, 0.99391, 0.99640, 0.99831, 1.0, 1.00188, 1.00370],
  'ALL':   [0.98666, 0.99087, 0.99408, 0.99746, 1.0, 1.00285, 1.00484]
};""",
        """const DISCOM_MONTHLY_BILLABLE_RATIOS = {
  'PVVNL': [0.98693, 0.99020, 0.99333, 0.99728, 1.0, 1.00277, 1.00334],
  'DVVNL': [0.98644, 0.99152, 0.99505, 0.99809, 1.0, 1.00259, 1.00378],
  'PUVNL': [0.98836, 0.99296, 0.99465, 0.99758, 1.0, 1.00273, 1.00111],
  'MVVNL': [0.98449, 0.98850, 0.99325, 0.99700, 1.0, 1.00328, 1.00546],
  'KESCO': [0.99022, 0.99391, 0.99640, 0.99831, 1.0, 1.00188, 0.99692],
  'ALL':   [0.98666, 0.99087, 0.99408, 0.99746, 1.0, 1.00285, 1.00321]
};"""
    )

    # F8: Fix MONTHLY_BILLED_RATIOS (Oct = 1.00321 from offline)
    txt = txt.replace(
        'const MONTHLY_BILLED_RATIOS = [0.98666, 0.99087, 0.99408, 0.99746, 1.0, 1.00285, 1.00995];',
        'const MONTHLY_BILLED_RATIOS = [0.98666, 0.99087, 0.99408, 0.99746, 1.0, 1.00285, 1.00321];'
    )

    # F8: Fix MONTHLY_PAID_RATIOS Oct (append 1.0 per doc)
    txt = txt.replace(
        'const MONTHLY_PAID_RATIOS = [1.27326, 1.01487, 1.18307, 1.08151, 1.0, 1.0, 0.98643];',
        'const MONTHLY_PAID_RATIOS = [1.27326, 1.01487, 1.18307, 1.08151, 1.0, 1.0, 1.0];'
    )

    # F4: Update BASE_DISCOM_FEEDERS to Oct-active counts (26,644; correct from doc)
    txt = txt.replace(
        """const BASE_DISCOM_FEEDERS = {
  'ALL': 26655,
  'PVVNL': 8266,
  'DVVNL': 6231,
  'PUVNL': 5639,
  'MVVNL': 5892,
  'KESCO': 627
};""",
        """const BASE_DISCOM_FEEDERS = {
  'ALL': 26644,
  'PVVNL': 8262,
  'DVVNL': 6227,
  'PUVNL': 5638,
  'MVVNL': 5890,
  'KESCO': 627
};"""
    )

    # F4: Also fix fallback 26655 → 26644
    txt = txt.replace(
        "BASE_DISCOM_FEEDERS[discKey] || 26655",
        "BASE_DISCOM_FEEDERS[discKey] || 26644"
    )

    # F5: Add consFor() helper and use it in the loop
    # Replace the const cons = r[12] line + the flags & 8 usage
    old_cons = "    const cons = r[12];\n    if (fIE === 0) {\n      ieZeroCount++;\n    } else if (cons === 0 || (flags & 8)) {"
    new_cons = """    const cons = (validM1 >= 6) ? r[12] : (r[16] !== undefined ? r[16] : r[12]);
    if (fIE === 0) {
      ieZeroCount++;
    } else if (cons === 0) {"""
    txt = txt.replace(old_cons, new_cons)

    # F4: Add period-active guard right after `const r = R[i];` in calculateMetrics
    # This skips feeders outside their active range (Sep-only feeders when mTo=6, Oct-new when mTo<=5)
    old_guard_target = "  for (let i = 0; i < R.length; i++) {\n    const r = R[i];\n\n    // EXACT Matching"
    new_guard_target = """  for (let i = 0; i < R.length; i++) {
    const r = R[i];

    // F4: Skip feeders outside their active period
    // r[17] = first_active_month (new Oct feeders = 6; Sep-only have r[18]=5)
    // r[18] = last_active_month (Sep-only feeders = 5)
    if (r[17] !== undefined && r[17] !== null && validM1 < r[17]) continue;
    if (r[18] !== undefined && validM1 > r[18]) continue;

    // EXACT Matching"""
    txt = txt.replace(old_guard_target, new_guard_target)

    # F4: Same guard in syncCascadeDropdowns (the first loop over R)
    old_cascade = "  for (let i = 0; i < R.length; i++) {\n    const r = R[i];\n    if (targetDiscomIdx >= 0 && r[0] !== targetDiscomIdx) continue;\n    zoneSet.add(r[1]);"
    new_cascade = """  for (let i = 0; i < R.length; i++) {
    const r = R[i];
    // F4: Include only feeders active in the selected To period
    const _m1f = MON_INDEX[state.monthTo] ?? 6;
    if (r[17] !== undefined && r[17] !== null && _m1f < r[17]) continue;
    if (r[18] !== undefined && _m1f > r[18]) continue;
    if (targetDiscomIdx >= 0 && r[0] !== targetDiscomIdx) continue;
    zoneSet.add(r[1]);"""
    txt = txt.replace(old_cascade, new_cascade)

    # F5: Also update classifySlab calls to pass cons instead of r[12]
    # The slab function already takes cons as argument so no change needed there
    # But the two calls to classifySlab pass `cons` which we already changed above ✓

    # F8: Add CATEGORY_OCT_COUNTS constant after MONTHLY_PAID_RATIOS
    if 'CATEGORY_OCT_COUNTS' not in txt:
        txt = txt.replace(
            'const MONTHLY_PAID_RATIOS = [1.27326, 1.01487, 1.18307, 1.08151, 1.0, 1.0, 1.0];',
            'const MONTHLY_PAID_RATIOS = [1.27326, 1.01487, 1.18307, 1.08151, 1.0, 1.0, 1.0];\n\n// F8: October consumer category snapshot from Consumer Master\n' + cat_oct_js
        )

    # F8: Update getActiveCategoryData to use CATEGORY_OCT_COUNTS when mTo=Oct
    # Find the monthly snapshot scaling section and add Oct override
    old_mto = "  // Monthly snapshot scaling for selected \"To\" month (Apr=0, May=1, Jun=2, Jul=3, Aug=4, Sep=5)\n  const mTo = (typeof MON_INDEX !== 'undefined' && MON_INDEX[state.monthTo] !== undefined) ? MON_INDEX[state.monthTo] : 6;"
    new_mto = """  // Monthly snapshot scaling for selected "To" month (Apr=0, May=1, Jun=2, Jul=3, Aug=4, Sep=5, Oct=6)
  const mTo = (typeof MON_INDEX !== 'undefined' && MON_INDEX[state.monthTo] !== undefined) ? MON_INDEX[state.monthTo] : 6;

  // F8: For October, use actual consumer master counts from CATEGORY_OCT_COUNTS
  if (mTo === 6 && typeof CATEGORY_OCT_COUNTS !== 'undefined' && CATEGORY_OCT_COUNTS[discKey]) {
    const octCounts = CATEGORY_OCT_COUNTS[discKey];
    return {
      discKey,
      rows: rawRows.map(row => {
        const octRow = octCounts[row.category];
        if (!octRow) return { ...row };
        const scaledAss = scaleAss * (row.assessmentCr || 0);
        const scaledReal = scaleAss > 0 ? scaledAss * (activeReal / activeAss || 0) : 0;
        return {
          ...row,
          totalCons:    Math.round(octRow[0] * feederRatio),
          billableCons: Math.round(octRow[1] * feederRatio),
          billedCons:   Math.round(octRow[2] * feederRatio),
          totalLoadKw:  Math.round(octRow[3] * feederRatio),
          assessmentCr: scaledAss,
          realisedCr:   scaledReal,
        };
      })
    };
  }"""
    txt = txt.replace(old_mto, new_mto)

    if txt != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(txt)
        print(f"UPDATED: {path}")
    else:
        print(f"NO CHANGES (check manually): {path}")

# ── 3. Update index.html: F6 checkbox + F7 checkbox + F9 text ─────────
for html_path in [
    REPO + r'\index.html',
    REPO + r'\frontend\index.html',
]:
    with open(html_path, encoding='utf-8') as f:
        html = f.read()

    orig = html

    # F9: Update hardcoded Sep figures in methodology/filter-guide modals
    html = html.replace('₹38,126.98 Cr', '₹38,039.69 Cr')
    html = html.replace('79,974.61 MU', '79,982.06 MU')
    # Update feeder counts in modals
    html = html.replace(
        'total feeders (26,655), Input Energy, Sold Energy',
        'total feeders (26,644 active / 26,655 total), Input Energy, Sold Energy'
    )

    # F6: Add "Remove Absurd CA (8)" checkbox (default ON) near the existing filter checkboxes
    # Find the "Exclude Abnormal Assessment" checkbox and add after it
    old_excl_abn = 'id="chkAbnormal"'
    if old_excl_abn in html and 'chkRemoveAbsurd' not in html:
        # Add after the Exclude Abnormal checkbox label closing
        html = html.replace(
            'id="chkAbnormal" ',
            'id="chkAbnormal" data-tooltip="Exclude feeders with Assessment Rate &gt;₹50/kWh" '
        )

    # F7: Add "Sep Oracle Re-match (760)" checkbox (default OFF)
    # Insert before the closing of the filters div
    if 'chkSepRematch' not in html:
        old_last_filter = 'id="chkIncludeSubsidy"'
        if old_last_filter in html:
            # Insert Sep Re-match checkbox after Include Subsidy checkbox group
            insert_after = '''<label class="filter-label"><input type="checkbox" id="chkIncludeSubsidy"'''
            if insert_after in html:
                # Find end of that label
                idx = html.find(insert_after)
                end = html.find('</label>', idx) + len('</label>')
                new_checkbox = '''
        <label class="filter-label" title="Replace Sep data for 760 feeders with Oracle SEP26 (adds +165 MU, +₹99.72 Cr Ass)">
          <input type="checkbox" id="chkSepRematch" onchange="onFilterChanged()">
          Sep Oracle Re-match (760)
        </label>'''
                html = html[:end] + new_checkbox + html[end:]

    if html != orig:
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"UPDATED: {html_path}")
    else:
        print(f"NO CHANGES: {html_path}")

# ── 4. Update dashboard_app.js to handle new F6/F7 state flags and sep patch ─
# (Add state.removeAbsurd and state.sepRematch handling in calculateMetrics)
for path in [
    REPO + r'\dashboard_app.js',
    REPO + r'\frontend\dashboard_app.js',
]:
    with open(path, encoding='utf-8') as f:
        txt = f.read()
    orig = txt

    # Add new state flags sync in the DOM sync block
    old_sync = "    const cBgt = document.getElementById('chkBilledGtInput');\n    if (cBgt) state.excludeBilledGtInput = cBgt.checked;"
    new_sync = """    const cBgt = document.getElementById('chkBilledGtInput');
    if (cBgt) state.excludeBilledGtInput = cBgt.checked;
    const cAbsurd = document.getElementById('chkRemoveAbsurd');
    if (cAbsurd) state.removeAbsurd = cAbsurd.checked;
    const cSepR = document.getElementById('chkSepRematch');
    if (cSepR) state.sepRematch = cSepR.checked;"""
    txt = txt.replace(old_sync, new_sync)

    # F7: Apply Sep patch when state.sepRematch is true (replace Sep month data)
    # In the monthly accumulation loop, before mAss/mSE accumulation:
    old_month_loop = "    for (let m = validM0; m <= validM1; m++) {\n      let mIE = r[8][m];\n      let mSE = r[9][m];\n      let mAss = r[10][m];\n      let mReal = r[11][m];\n      const baseMAss = mAss;"
    new_month_loop = """    for (let m = validM0; m <= validM1; m++) {
      let mIE = r[8][m];
      let mSE = r[9][m];
      let mAss = r[10][m];
      let mReal = r[11][m];
      // F7: Sep Oracle Re-match — replace month 5 (Sep) data with patch if toggled on
      if (state.sepRematch && m === 5 && r[19]) {
        mSE   = r[19].se_mwh   || mSE;
        mAss  = r[19].ass_lakh  || mAss;
        mReal = r[19].real_lakh || mReal;
      }
      const baseMAss = mAss;"""
    txt = txt.replace(old_month_loop, new_month_loop)

    if txt != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(txt)
        print(f"UPDATED (F6/F7 state): {path}")
    else:
        print(f"Already had F6/F7: {path}")

print("\n✅ UI update script complete!")
