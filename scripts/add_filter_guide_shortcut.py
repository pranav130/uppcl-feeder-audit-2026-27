import re

def update_html(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Add the shortcut button next to Methodology button
    old_btn = '<div>\n<button class="btn" id="btnMethodology" style="padding: 3px 10px; font-size: 12px;" type="button">📖 Methodology &amp; Data Notes</button>\n</div>'
    new_btn = '<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">\n<button class="btn" id="btnFilterGuide" style="padding: 3px 10px; font-size: 12px;" type="button">📘 Filter Guide — Definitions and Impact</button>\n<button class="btn" id="btnMethodology" style="padding: 3px 10px; font-size: 12px;" type="button">📖 Methodology &amp; Data Notes</button>\n</div>'
    
    assert old_btn in c, f"Old methodology button div not found in {path}"
    c = c.replace(old_btn, new_btn, 1)

    # 2. Add filterGuideModal just before methodologyModal
    modal_html = """<div class="modal-overlay" id="filterGuideModal">
<div class="modal-content">
<div class="modal-header">
<h3>📘 Filter Guide — Definitions and Impact</h3>
<button class="modal-close" id="filterGuideCloseBtn">×</button>
</div>
<div class="modal-body">
<p style="margin-bottom: 16px; font-weight: 500;">Comprehensive operational guide to the 7 interactive filter checkboxes and their exact impact on feeder populations, calculation scopes, and revenue accounting:</p>
<div style="display: grid; gap: 16px;">

<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>A. Exclude Abnormal Assessment</span>
<span class="tag-badge" style="font-size: 10px;">Feeder Exclusion Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Evaluates feeder billing data where Average Billing Rate (ABR) exceeds <code>₹50/kWh</code> OR where progressive Assessment exceeds <code>₹100 Lakhs (₹1 Crore)</code> with zero sold energy.</p>
<p><strong>Selecting the Checkbox:</strong> Excludes these statistical outlier feeders entirely from the active calculation population (affecting Input Energy, Sold Energy, Assessment, Realization, and Feeder Counts across all cards and tables).</p>
<p><strong>Deselecting the Checkbox (Default):</strong> Keeps all feeders included transparently in calculations regardless of abnormal assessment anomalies.</p>
</div>

<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>B. Exclude Billed &gt; Input</span>
<span class="tag-badge" style="font-size: 10px;">Feeder Exclusion Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Identifies feeders where progressive Billed Energy (Sold Energy) exceeds Input Energy, producing a negative line loss condition (Flag bit 2).</p>
<p><strong>Selecting the Checkbox:</strong> Excludes feeders with Billed &gt; Input from the active dashboard calculations and summaries.</p>
<p><strong>Deselecting the Checkbox (Default):</strong> Retains these feeders in the dataset, ensuring the entire network is accounted for without hiding negative loss anomalies.</p>
</div>

<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>C. Exclude A Month with Zero Input</span>
<span class="tag-badge" style="font-size: 10px;">Feeder Exclusion Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Targets feeders that recorded zero input energy (<code>Input Energy = 0 MWh</code>) in one or more months of the reporting period April–September 2026 (Flag bit 4), typically indicating metering failure or unmetered supply.</p>
<p><strong>Selecting the Checkbox:</strong> Excludes feeders that experienced zero input in any month from the active population.</p>
<p><strong>Deselecting the Checkbox (Default):</strong> Includes all feeders in progressive totals as recorded.</p>
</div>

<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>D. Include PTW Connections</span>
<span class="tag-badge" style="font-size: 10px;">Policy &amp; Revenue Credit Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Governs Private Tube Well (agricultural LMV-5) tariff connections under the state policy principle <em>PTW Assessment = PTW Realization</em>. Assessment amount (₹38,126.98 Cr), total feeders (26,033), Input Energy (79,974.61 MU), Sold Energy (50,155.59 MU), and Line Loss remain strictly <strong>INVARIANT</strong>.</p>
<p><strong>Selecting the Checkbox:</strong> Credits PTW assessment amount directly into revenue realization, increasing Collection Efficiency and reducing computed AT&amp;C Loss.</p>
<p><strong>Deselecting the Checkbox (Default):</strong> Evaluates realization strictly on direct cash collected without agricultural subsidy credit.</p>
</div>

<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>E. Include Govt Connections</span>
<span class="tag-badge" style="font-size: 10px;">Policy &amp; Revenue Credit Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Governs government consumer categories (Public Water Works LMV-3, Institutions/Govt Offices LMV-4A, and Street Lights LMV-7) where assessment has deemed revenue backing.</p>
<p><strong>Selecting the Checkbox (Default):</strong> Treats government connections under deemed revenue credit (Assessment = Realization), recognizing statutory book transfers.</p>
<p><strong>Deselecting the Checkbox:</strong> Removes the deemed credit adjustment and reduces revenue realization by 4.5% of assessment across feeders, reflecting strictly physical cash collected (~40% Collection Efficiency for government accounts).</p>
</div>

<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>F. Exclude CDF Bills</span>
<span class="tag-badge" style="font-size: 10px;">Energy &amp; Assessment Adjustment Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Adjusts for Defective / Change-of-Defective (CDF) consumer bills and extreme consumption/assessment outliers (&gt;1,500 units/kW or &gt;₹10,000/kW).</p>
<p><strong>Selecting the Checkbox:</strong> Excludes CDF provisional energy and billing anomalies from Sold Energy (reduced by 2.1% to factor out provisional unread units) and Assessment (reduced by 1.5% to eliminate provisional demand spikes). <strong>Amount Realised remains completely UNCHANGED</strong> across all KPI cards, summary tables, drilldowns, and reports, reflecting exact actual revenue collections.</p>
<p><strong>Deselecting the Checkbox (Default):</strong> Retains unadjusted billed consumption and provisional assessment as originally recorded.</p>
</div>

<div style="border-left: 3px solid var(--accent); padding-left: 14px;">
<h4 style="color: var(--ink); font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
<span>G. Include Subsidy</span>
<span class="tag-badge" style="font-size: 10px;">Policy &amp; Revenue Filter</span>
</h4>
<p><strong>Implemented Rule:</strong> Incorporates State Government Subsidies (Tariff Subsidy, Powerloom Subsidy, and PTW Subsidy, excluding Cross Subsidy) into total energy revenue billing and realization under 100% statutory government deemed backing.</p>
<p><strong>Selecting the Checkbox:</strong> Incorporates state subsidy entitlements (feeder PTW subsidy + 23.8% of assessed revenue) into <strong>both Amount Assessed and Amount Realised</strong>, reflecting statutory state government subsidy commitments and deemed recovery, boosting Collection Efficiency and reducing computed AT&amp;C Loss.</p>
<p><strong>Deselecting the Checkbox (Default):</strong> Calculates assessment and realization based purely on consumer tariff billing/collections and selected deemed credits without state subsidy grants.</p>
</div>

</div>
</div>
</div>
</div>\n\n"""

    assert '<div class="modal-overlay" id="methodologyModal">' in c, f"methodologyModal not found in {path}"
    c = c.replace('<div class="modal-overlay" id="methodologyModal">', modal_html + '<div class="modal-overlay" id="methodologyModal">', 1)

    # 3. Bump cache buster
    c = c.replace('styles.css?v=20261014_150000', 'styles.css?v=20261014_152000')
    c = c.replace('data/feeders.js?v=20261014_150000', 'data/feeders.js?v=20261014_152000')
    c = c.replace('dashboard_app.js?v=20261014_150000', 'dashboard_app.js?v=20261014_152000')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

def update_js(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_wiring = """// Methodology Modal Wiring
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

    new_wiring = """// Methodology Modal Wiring
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
}

// Filter Guide Modal Wiring
const btnFilterGuide = document.getElementById('btnFilterGuide');
const modalFilterGuide = document.getElementById('filterGuideModal');
const filterGuideCloseBtn = document.getElementById('filterGuideCloseBtn');
if (btnFilterGuide && modalFilterGuide) {
  btnFilterGuide.addEventListener('click', () => modalFilterGuide.classList.add('active'));
}
if (filterGuideCloseBtn && modalFilterGuide) {
  filterGuideCloseBtn.addEventListener('click', () => modalFilterGuide.classList.remove('active'));
}
if (modalFilterGuide) {
  modalFilterGuide.addEventListener('click', (e) => {
    if (e.target === modalFilterGuide) modalFilterGuide.classList.remove('active');
  });
}"""

    assert old_wiring in c, f"Modal wiring not found in {path}"
    c = c.replace(old_wiring, new_wiring, 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

def update_drilldown(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('data/feeders.js?v=20261014_150000', 'data/feeders.js?v=20261014_152000')
    c = c.replace('slab_data/${lossType}_${slug}.js?v=20261014_150000', 'slab_data/${lossType}_${slug}.js?v=20261014_152000')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

if __name__ == '__main__':
    update_html('index.html')
    update_html('frontend/index.html')
    update_js('dashboard_app.js')
    update_js('frontend/dashboard_app.js')
    update_drilldown('feeder_drilldown.html')
    update_drilldown('frontend/feeder_drilldown.html')
