import re
import os

# 1. Update index.html and frontend/index.html
def update_html(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    old_section = """<!-- ── BY DISCOM SUMMARY TABLE (NEW) ── -->
<section class="panel">
<div class="ph">
<div>
<h2>🏢 By Discom Summary</h2>
<p class="hint">Comparative progressive performance across all 5 distribution companies</p>
</div>
</div>
<div class="tw">
<table id="tblByDiscom">
<thead>
<tr>
<th class="tx" data-dcol="discom">Name <span class="sort-ico">↕</span></th>
<th data-dcol="feeders">Feeders <span class="sort-ico">↕</span></th>
<th data-dcol="inputMu">Input MU <span class="sort-ico">↕</span></th>
<th data-dcol="billedMu">Billed MU <span class="sort-ico">↕</span></th>
<th data-dcol="billingEff">Billing Eff. <span class="sort-ico">↕</span></th>
<th data-dcol="collectionEff">Collection Eff. <span class="sort-ico">↕</span></th>
<th data-dcol="atcLoss">AT&amp;C Loss <span class="sort-ico">↕</span></th>
<th data-dcol="abr">ABR ₹/kWh <span class="sort-ico">↕</span></th>
<th data-dcol="thruRate">Thru Rate ₹/kWh <span class="sort-ico">↕</span></th>
<th data-dcol="realisedCr">Realised ₹Cr <span class="sort-ico">↕</span></th>
<th data-dcol="atcLossValueCr">AT&amp;C Loss Value ₹Cr <span class="sort-ico">↕</span></th>
</tr>
</thead>
<tbody id="byDiscomBody">
<tr><td colspan="11" style="text-align:center;padding:16px;color:var(--ink-3)">Loading Discom summary...</td></tr>
</tbody>
</table>
</div>
</section>"""

    new_section = """<!-- ── PERFORMANCE LEAGUE TABLE ── -->
<section class="panel" id="panelLeagueTable">
<div class="ph" style="flex-wrap: wrap; gap: 12px;">
<div>
<h2 style="display: flex; align-items: center; gap: 8px;">
  <span>Performance league table</span>
</h2>
<p class="hint">Click a row to drill down one level · click headers to sort</p>
<div id="leagueBreadcrumb" style="margin-top: 6px; font-size: 12px; color: var(--ink-2); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;"></div>
</div>
<div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
<div class="seg" id="leagueLevelSeg" role="group" aria-label="Hierarchy Level">
<button class="seg-btn" type="button" data-level="discom" aria-pressed="true">DISCOM</button>
<button class="seg-btn" type="button" data-level="zone" aria-pressed="false">Zone</button>
<button class="seg-btn" type="button" data-level="circle" aria-pressed="false">Circle</button>
<button class="seg-btn" type="button" data-level="division" aria-pressed="false">Division</button>
<button class="seg-btn" type="button" data-level="substation" aria-pressed="false">Substation</button>
</div>
<button class="btn" id="btnExportLeagueCsv" style="padding: 4px 12px; font-size: 12px; border: 1px solid var(--line-2); background: var(--surface-2); border-radius: 6px; cursor: pointer; font-weight: 500;" type="button">⬇ Export CSV</button>
</div>
</div>
<div class="tw" style="max-height: 520px; overflow-y: auto;">
<table id="tblLeague">
<thead>
<tr>
<th class="tx" data-lcol="name" style="position: sticky; top: 0; z-index: 2;">Name <span class="sort-ico">↕</span></th>
<th class="tx" data-lcol="parent" style="position: sticky; top: 0; z-index: 2;">Parent <span class="sort-ico">↕</span></th>
<th data-lcol="feeders" style="position: sticky; top: 0; z-index: 2;">Feeders <span class="sort-ico">↕</span></th>
<th data-lcol="inputMu" style="position: sticky; top: 0; z-index: 2;">Input MU <span class="sort-ico">↕</span></th>
<th data-lcol="billedMu" style="position: sticky; top: 0; z-index: 2;">Sold MU <span class="sort-ico">↕</span></th>
<th data-lcol="lineLoss" style="position: sticky; top: 0; z-index: 2;">Line loss <span class="sort-ico">↕</span></th>
<th data-lcol="collectionEff" style="position: sticky; top: 0; z-index: 2;">Coll. eff. <span class="sort-ico">↕</span></th>
<th data-lcol="atcLoss" style="position: sticky; top: 0; z-index: 2;">AT&amp;C <span class="sort-ico">↕</span></th>
<th data-lcol="atcLossValueCr" class="sorted" style="position: sticky; top: 0; z-index: 2;">Loss Value ₹Cr <span class="sort-ico">▼</span></th>
<th data-lcol="abr" style="position: sticky; top: 0; z-index: 2;">ABR ₹ <span class="sort-ico">↕</span></th>
<th data-lcol="thruRate" style="position: sticky; top: 0; z-index: 2;">Thru ₹ <span class="sort-ico">↕</span></th>
<th data-lcol="realisedCr" style="position: sticky; top: 0; z-index: 2;">Realised ₹Cr <span class="sort-ico">↕</span></th>
<th data-lcol="fdrAbove70" style="position: sticky; top: 0; z-index: 2;">Fdrs &gt;70% <span class="sort-ico">↕</span></th>
</tr>
</thead>
<tbody id="leagueTableBody">
<tr><td colspan="13" style="text-align:center;padding:16px;color:var(--ink-3)">Loading Performance League Table...</td></tr>
</tbody>
<tfoot id="leagueTableFoot" style="position: sticky; bottom: 0; z-index: 2;"></tfoot>
</table>
</div>
</section>"""

    assert old_section in c, f"Old By Discom section not found in {path}"
    c = c.replace(old_section, new_section, 1)

    # Bump cache busters
    c = c.replace("styles.css?v=20261014_152000", "styles.css?v=20261014_154500")
    c = c.replace("data/feeders.js?v=20261014_152000", "data/feeders.js?v=20261014_154500")
    c = c.replace("dashboard_app.js?v=20261014_152000", "dashboard_app.js?v=20261014_154500")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

# 2. Update styles.css and frontend/styles.css
def update_styles(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    new_css = """
/* Performance League Table Styling */
.league-crumb {
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.league-crumb:hover {
  color: var(--ink);
}
#tblLeague th, #tblLeague td {
  padding: 6px 8px;
  font-size: 12px;
}
#tblLeague th {
  font-size: 11px;
}
#tblLeague tfoot tr.grand td {
  font-weight: 700;
  border-top: 2px solid var(--accent);
  background: var(--surface-2);
}
"""
    if "/* Performance League Table Styling */" not in c:
        c += new_css

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

if __name__ == '__main__':
    update_html('index.html')
    update_html('frontend/index.html')
    update_styles('styles.css')
    update_styles('frontend/styles.css')
