import sys
import shutil
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

ref_path = r"C:\Users\HP\.gemini\antigravity\brain\3a1f71b5-7420-451d-82f6-5187ac767485\reference_index_curl.html"
with open(ref_path, "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

if soup.title:
    soup.title.string = "UPPCL 11KV Feeder Progressive Energy Audit Dashboard (FY 2026-27)"

for s in soup.find_all('style'):
    s.decompose()

link_css = soup.new_tag('link', rel='stylesheet', href='styles.css')
soup.head.append(link_css)

h1 = soup.find('h1')
if h1:
    h1.clear()
    h1.append("⚡ UPPCL 11KV Feeder PSR Dashboard · Progressive Energy Audit (FY 2026-27)")

sub = soup.find('div', class_='sub')
if sub:
    sub.string = "Uttar Pradesh Power Corporation Limited — Energy Audit Cell (April 2026 – August 2026)"

status_bar_html = """
<div class="status-bar" id="statusBar">
  <div class="status-tags">
    <span id="ptwStatusBadge" class="tag-badge ptw-off">PTW Status: EXCLUDED</span>
    <span class="tag-badge">Data Period: April 2026 – August 2026</span>
    <span class="tag-badge">Financial Year: FY 2026-27</span>
  </div>
  <div>
    <button class="btn" id="btnMethodology" type="button" style="padding: 3px 10px; font-size: 12px;">📖 Methodology & Data Notes</button>
  </div>
</div>
"""
status_soup = BeautifulSoup(status_bar_html, 'html.parser')
header = soup.find('header')
if header:
    header.insert_after(status_soup)

leave_out = soup.find('div', class_='leave-out-bar')
if leave_out:
    ptw_checkbox_html = """
    <label class="checkbox-group" title="Include PTW Connections (Supply Type starts with 5)">
      <input type="checkbox" id="chkIncludePtw">
      <span>Include PTW Connections (Supply Type starts with "5")</span>
    </label>
    """
    ptw_cb_soup = BeautifulSoup(ptw_checkbox_html, 'html.parser')
    leave_out.append(ptw_cb_soup)

modal_html = """
<div class="modal-overlay" id="methodologyModal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>UPPCL Energy Audit Methodology & Data Notes (FY 2026-27)</h3>
      <button class="modal-close" id="modalCloseBtn">&times;</button>
    </div>
    <div class="modal-body">
      <h4>1. Authoritative Data Source</h4>
      <p>Source Workbook: <code>11KV total feeders prog audit 2026-27 upto Aug-26 F_excluding absurd CA.xlsx</code> (Sheet: <code>AUDIT DATA</code>). Covering 26,033 feeders across all 5 DISCOMs (PVVNL, DVVNL, MVVNL, PUVVNL, KESCO) for FY 2026-27.</p>

      <h4>2. Progressive Calculation Scope</h4>
      <p>The reporting period is <strong>April 2026 to August 2026</strong> (5 months progressive). All progressive values are calculated from the sum of monthly numerators and denominators (never from averaging monthly percentages):</p>
      <ul>
        <li><code>Progressive Input Energy (MU) = Sum(Apr..Aug IE) / 1000</code></li>
        <li><code>Progressive Sold Energy (MU) = Sum(Apr..Aug SE) / 1000</code></li>
        <li><code>Billing Efficiency (BE %) = (Progressive Sold Energy / Progressive Input Energy) &times; 100</code></li>
        <li><code>Collection Efficiency (CE %) = (Progressive Realization / Progressive Assessment) &times; 100</code></li>
        <li><code>Line Loss (%) = 100 - BE (%)</code></li>
        <li><code>AT&amp;C Loss (%) = 100 - (BE &times; CE / 100)</code></li>
        <li><code>Average Billing Rate (ABR ₹/kWh) = (Progressive Assessment &times; 100) / Progressive Sold Energy</code></li>
        <li><code>Throughput Rate (₹/kWh) = (Progressive Realization &times; 100) / Progressive Input Energy</code></li>
      </ul>

      <h4>3. PTW Rule & Assessment Invariance</h4>
      <p>A connection is treated as PTW when its <strong>Supply Type starts with "5"</strong> (LMV-5 Agriculture / Private Tube Well).</p>
      <ul>
        <li><strong>Assessment Amount is CONSTANT</strong>: The total assessed revenue (₹ 30,462.55 Cr), total feeders (26,033), input energy (68,168.95 MU), and sold energy (42,485.45 MU) remain completely unchanged whether PTW connections are included or excluded.</li>
        <li><strong>Realization & Throughput Rate</strong>: Under the rule <strong>PTW Assessment = PTW Realization</strong>, only revenue realization and throughput rate change:
          <ul>
            <li><strong>PTW Excluded (Default)</strong>: Realization reflects cash collection without crediting PTW subsidy assessment (₹ 24,293.94 Cr; Throughput Rate: ₹ 3.56/kWh; CE: 79.75%; AT&C Loss: 50.30%).</li>
            <li><strong>PTW Included</strong>: PTW Assessment (₹ 857.63 Cr) is credited as deemed revenue realization (Realization: ₹ 25,151.58 Cr; Throughput Rate: ₹ 3.69/kWh; CE: 82.57%; AT&C Loss: 48.54%), exactly matching the official Excel Col 21 formula.</li>
          </ul>
        </li>
      </ul>

      <h4>4. Loss Slabs & Abnormal Classifications</h4>
      <ul>
        <li><strong>10 Standard Slabs</strong>: <code>0% to 5%</code>, <code>5% to 10%</code>, <code>10% to 20%</code>, <code>20% to 30%</code>, <code>30% to 50%</code>, <code>50% to 70%</code>, <code>Above 70%</code>, <code>Abnormal</code>, <code>IE 0</code>, <code>No Cons</code>.</li>
        <li><strong>Abnormal Data</strong>: Records with loss &lt; 0% or &gt; 100% are flagged as Abnormal and preserved transparently.</li>
      </ul>
    </div>
  </div>
</div>
"""
modal_soup = BeautifulSoup(modal_html, 'html.parser')
soup.body.append(modal_soup)

for sc in soup.find_all('script'):
    sc.decompose()

soup.body.append(soup.new_tag('script', src="https://cdn.jsdelivr.net/npm/chart.js"))
soup.body.append(soup.new_tag('script', src="data/feeders.js"))
soup.body.append(soup.new_tag('script', src="data/xlsx.full.min.js"))
soup.body.append(soup.new_tag('script', src="dashboard_app.js"))

out_html1 = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\index.html"
out_html2 = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\index.html"

with open(out_html1, "w", encoding="utf-8") as f:
    f.write(str(soup))
shutil.copy2(out_html1, out_html2)

print(f"Wrote {out_html1} and {out_html2}")
