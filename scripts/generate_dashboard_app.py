import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

ref_app_path = r"C:\Users\HP\.gemini\antigravity\brain\3a1f71b5-7420-451d-82f6-5187ac767485\reference_dashboard_app.js"
with open(ref_app_path, "r", encoding="utf-8") as f:
    js_code = f.read()

# 1. Update state to include includePtw: false
js_code = js_code.replace(
    "excludeZeroInput: false,",
    "excludeZeroInput: false,\n  includePtw: false,"
)

# 2. Update calculateMetrics loop to handle PTW inclusion/exclusion and Assessment = Realization rule
target_old_calc = """    totalScoped++;

    const flags = r[13];
    if (state.excludeAbnormal && (flags & 1)) continue;
    if (state.excludeBilledGtInput && (flags & 2)) continue;
    if (state.excludeZeroInput && (flags & 4)) continue;

    let fIE = 0, fSE = 0, fAss = 0, fReal = 0;
    for (let m = validM0; m <= validM1; m++) {
      fIE += r[8][m]; fSE += r[9][m]; fAss += r[10][m]; fReal += r[11][m];
    }"""

replacement_calc = """    // ── PTW Filter & Rule Handling ──
    const flags = r[13];
    const isPtwFeeder = (flags & 16) !== 0;

    // Mode 1: Default (PTW Excluded) -> Skip dedicated PTW feeders
    if (!state.includePtw && isPtwFeeder) {
      continue;
    }

    totalScoped++;

    if (state.excludeAbnormal && (flags & 1)) continue;
    if (state.excludeBilledGtInput && (flags & 2)) continue;
    if (state.excludeZeroInput && (flags & 4)) continue;

    let fIE = 0, fSE = 0, fAss = 0, fReal = 0;
    let fPtwAss = 0;

    for (let m = validM0; m <= validM1; m++) {
      fIE += r[8][m];
      fSE += r[9][m];
      fAss += r[10][m];
      let mReal = r[11][m];
      if (state.includePtw && r[14] && r[14][m]) {
        // PTW Assessment = PTW Realization rule (Excel Col 21 formula)
        mReal += r[14][m];
        fPtwAss += r[14][m];
      }
      fReal += mReal;
    }"""

if target_old_calc in js_code:
    js_code = js_code.replace(target_old_calc, replacement_calc, 1)
    print("1. Replaced calculateMetrics loop logic!")
else:
    print("ERROR: calculateMetrics snippet not found!")

# 3. Add helper function updatePtwBadge
badge_helper = """
function updatePtwBadge(isIncluded) {
  const ptwBadge = document.getElementById('ptwStatusBadge');
  if (!ptwBadge) return;
  if (isIncluded) {
    ptwBadge.textContent = 'PTW Status: INCLUDED';
    ptwBadge.className = 'tag-badge ptw-on';
  } else {
    ptwBadge.textContent = 'PTW Status: EXCLUDED';
    ptwBadge.className = 'tag-badge ptw-off';
  }
}
"""
js_code = badge_helper + "\n" + js_code

# Also update monthly accumulator in calculateMetrics:
old_monthly_loop = """    for (let m = 0; m < 5; m++) {
      monthly[m].ie += r[8][m];
      monthly[m].se += r[9][m];
      monthly[m].ass += r[10][m];
      monthly[m].real += r[11][m];
    }"""

new_monthly_loop = """    for (let m = 0; m < 5; m++) {
      monthly[m].ie += r[8][m];
      monthly[m].se += r[9][m];
      monthly[m].ass += r[10][m];
      let mReal = r[11][m];
      if (state.includePtw && r[14] && r[14][m]) {
        mReal += r[14][m];
      }
      monthly[m].real += mReal;
    }"""

if old_monthly_loop in js_code:
    js_code = js_code.replace(old_monthly_loop, new_monthly_loop, 1)
    print("1b. Replaced monthly accumulator in calculateMetrics!")
else:
    print("ERROR: old_monthly_loop not found!")

# 4. Wire chkIncludePtw event listener
target_chk_listener = """document.getElementById('chkZeroInput').addEventListener('change', function() {
  state.excludeZeroInput = this.checked;
  onFilterChanged();
});"""

replacement_chk_listener = """document.getElementById('chkZeroInput').addEventListener('change', function() {
  state.excludeZeroInput = this.checked;
  onFilterChanged();
});

const chkIncludePtw = document.getElementById('chkIncludePtw');
if (chkIncludePtw) {
  chkIncludePtw.addEventListener('change', function() {
    state.includePtw = this.checked;
    updatePtwBadge(this.checked);
    onFilterChanged();
  });
}

// Methodology Modal Wiring
const btnMethodology = document.getElementById('btnMethodology');
const modalMethodology = document.getElementById('methodologyModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
if (btnMethodology && modalMethodology) {
  btnMethodology.addEventListener('click', () => modalMethodology.classList.add('active'));
}
if (modalCloseBtn && modalMethodology) {
  modalCloseBtn.addEventListener('click', () => modalMethodology.classList.remove('active'));
}
if (modalMethodology) {
  modalMethodology.addEventListener('click', (e) => {
    if (e.target === modalMethodology) modalMethodology.classList.remove('active');
  });
}"""

if target_chk_listener in js_code:
    js_code = js_code.replace(target_chk_listener, replacement_chk_listener, 1)
    print("2. Wired chkIncludePtw and modal event listeners!")
else:
    print("ERROR: target_chk_listener not found!")

# 5. Add chip for PTW if included
target_chip = "if (state.excludeZeroInput) chips.push({ label: 'Excl: Zero Input', clear: () => { state.excludeZeroInput = false; document.getElementById('chkZeroInput').checked = false; } });"
replacement_chip = """if (state.excludeZeroInput) chips.push({ label: 'Excl: Zero Input', clear: () => { state.excludeZeroInput = false; document.getElementById('chkZeroInput').checked = false; } });
  if (state.includePtw) chips.push({ label: 'PTW: Included', clear: () => { state.includePtw = false; const c = document.getElementById('chkIncludePtw'); if (c) c.checked = false; updatePtwBadge(false); } });"""

if target_chip in js_code:
    js_code = js_code.replace(target_chip, replacement_chip, 1)
    print("3. Added PTW active filter chip!")
else:
    print("ERROR: target_chip not found!")

# 6. Update Reset button
target_reset = "document.getElementById('chkZeroInput').checked = false;"
replacement_reset = """document.getElementById('chkZeroInput').checked = false;
  state.includePtw = false;
  const cbPtw = document.getElementById('chkIncludePtw');
  if (cbPtw) cbPtw.checked = false;
  updatePtwBadge(false);"""

if target_reset in js_code:
    js_code = js_code.replace(target_reset, replacement_reset, 1)
    print("4. Updated Reset button logic!")
else:
    print("ERROR: target_reset not found!")

out_js_path = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\dashboard_app.js"
with open(out_js_path, "w", encoding="utf-8") as f:
    f.write(js_code)

print(f"Wrote {out_js_path} ({len(js_code)} bytes)")
