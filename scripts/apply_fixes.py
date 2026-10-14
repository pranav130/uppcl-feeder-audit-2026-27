import re

# 1. Update dashboard_app.js and frontend/dashboard_app.js
def update_dashboard_app(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Loop 1: Progressive loop
    # Pattern:
    #     for (let m = validM0; m <= validM1; m++) {
    #       let mIE = r[8][m];
    #       let mSE = r[9][m];
    #       let mAss = r[10][m];
    #       let mReal = r[11][m];
    old_p1 = """    for (let m = validM0; m <= validM1; m++) {
      let mIE = r[8][m];
      let mSE = r[9][m];
      let mAss = r[10][m];
      let mReal = r[11][m];"""

    new_p1 = """    for (let m = validM0; m <= validM1; m++) {
      let mIE = r[8][m];
      let mSE = r[9][m];
      let mAss = r[10][m];
      let mReal = r[11][m];
      const baseMAss = mAss;"""

    assert old_p1 in content, f"Loop 1 header not found in {path}"
    content = content.replace(old_p1, new_p1, 1)

    # Loop 1 body:
    old_b1 = """      // 3. Government Connections: Assessment = Realization (deemed credit)
      // When unchecked: Govt connections evaluated strictly on actual cash collected
      if (!state.includeGovt) {
        mReal = Math.max(0, mReal - (mAss * 0.045));
      }

      // 4. Include State Subsidy: Paid amount + State Subsidies except Cross Subsidy
      if (state.includeSubsidy) {
        const ptwSub = (r[15] && r[15][m]) ? r[15][m] : 0;
        mReal += (ptwSub + (mAss * 0.238));
      }"""

    new_b1 = """      // 3. Government Connections: Assessment = Realization (deemed credit)
      // When unchecked: Govt connections evaluated strictly on actual cash collected
      if (!state.includeGovt) {
        mReal = Math.max(0, mReal - (baseMAss * 0.045));
      }

      // 4. Include State Subsidy: Government Subsidy added to BOTH Assessment & Realization
      if (state.includeSubsidy) {
        const ptwSub = (r[15] && r[15][m]) ? r[15][m] : 0;
        const subAmt = ptwSub + (baseMAss * 0.238);
        mAss += subAmt;
        mReal += subAmt;
      }"""

    assert old_b1 in content, f"Loop 1 body not found in {path}"
    content = content.replace(old_b1, new_b1, 1)

    # Loop 2: Monthly aggregation loop
    old_p2 = """    for (let m = 0; m < MON_LABELS.length; m++) {
      let mIE = r[8][m];
      let mSE = r[9][m];
      let mAss = r[10][m];
      let mReal = r[11][m];"""

    new_p2 = """    for (let m = 0; m < MON_LABELS.length; m++) {
      let mIE = r[8][m];
      let mSE = r[9][m];
      let mAss = r[10][m];
      let mReal = r[11][m];
      const baseMAss = mAss;"""

    assert old_p2 in content, f"Loop 2 header not found in {path}"
    content = content.replace(old_p2, new_p2, 1)

    old_b2 = """      if (!state.includeGovt) {
        mReal = Math.max(0, mReal - (mAss * 0.045));
      }
      if (state.includeSubsidy) {
        const ptwSub = (r[15] && r[15][m]) ? r[15][m] : 0;
        mReal += (ptwSub + (mAss * 0.238));
      }"""

    new_b2 = """      if (!state.includeGovt) {
        mReal = Math.max(0, mReal - (baseMAss * 0.045));
      }
      if (state.includeSubsidy) {
        const ptwSub = (r[15] && r[15][m]) ? r[15][m] : 0;
        const subAmt = ptwSub + (baseMAss * 0.238);
        mAss += subAmt;
        mReal += subAmt;
      }"""

    assert old_b2 in content, f"Loop 2 body not found in {path}"
    content = content.replace(old_b2, new_b2, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {path} successfully!")

# 2. Update index.html and frontend/index.html
def update_index_html(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Update cache busters:
    content = content.replace("styles.css?v=20261012_130000", "styles.css?v=20261014_143000")
    content = content.replace("data/feeders.js?v=20261012_140000", "data/feeders.js?v=20261014_143000")
    content = content.replace("dashboard_app.js?v=20261012_140000", "dashboard_app.js?v=20261014_143000")

    # Update Filter Guide description for Subsidy
    old_guide_sub = """<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>G. Include Subsidy</span>
<span class="tag-badge" style="font-size: 10px;">Revenue Credit Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Incorporates State Government Subsidies (Tariff Subsidy, Powerloom Subsidy, and PTW Subsidy, excluding Cross Subsidy) into total energy revenue realization.</p>
<p><strong>Selecting the Checkbox:</strong> Adds state subsidy entitlements (feeder PTW subsidy + 23.8% of assessed revenue) to Realization, boosting Collection Efficiency and reducing computed AT&amp;C Loss.</p>
<p><strong>Deselecting the Checkbox (Default):</strong> Calculates realization based purely on consumer tariff collections and selected deemed credits.</p>
</div>"""

    new_guide_sub = """<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>G. Include Subsidy</span>
<span class="tag-badge" style="font-size: 10px;">Policy &amp; Revenue Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Incorporates State Government Subsidies (Tariff Subsidy, Powerloom Subsidy, and PTW Subsidy, excluding Cross Subsidy) into total energy revenue billing and realization under 100% statutory government deemed backing.</p>
<p><strong>Selecting the Checkbox:</strong> Incorporates state subsidy entitlements (feeder PTW subsidy + 23.8% of assessed revenue) into <strong>both Amount Assessed and Amount Realised</strong>, reflecting statutory state government subsidy commitments and deemed recovery, boosting Collection Efficiency and reducing computed AT&amp;C Loss.</p>
<p><strong>Deselecting the Checkbox (Default):</strong> Calculates assessment and realization based purely on consumer tariff billing/collections and selected deemed credits without state subsidy grants.</p>
</div>"""

    assert old_guide_sub in content, f"Filter Guide subsidy block not found in {path}"
    content = content.replace(old_guide_sub, new_guide_sub, 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {path} successfully!")

# 3. Update feeder_drilldown.html and frontend/feeder_drilldown.html
def update_feeder_drilldown(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("data/feeders.js?v=20261012_140000", "data/feeders.js?v=20261014_143000")
    content = content.replace("slab_data/${lossType}_${slug}.js?v=20261012_140000", "slab_data/${lossType}_${slug}.js?v=20261014_143000")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Updated {path} successfully!")

if __name__ == "__main__":
    update_dashboard_app("dashboard_app.js")
    update_dashboard_app("frontend/dashboard_app.js")
    update_index_html("index.html")
    update_index_html("frontend/index.html")
    update_feeder_drilldown("feeder_drilldown.html")
    update_feeder_drilldown("frontend/feeder_drilldown.html")
