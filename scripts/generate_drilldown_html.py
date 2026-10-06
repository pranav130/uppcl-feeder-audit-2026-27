import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

ref_path = r"C:\Users\HP\.gemini\antigravity\brain\3a1f71b5-7420-451d-82f6-5187ac767485\reference_feeder_drilldown.html"
with open(ref_path, "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

if soup.title:
    soup.title.string = "Feeder Audit Data Drilldown · UPPCL FY 2026-27"

# Update back button to have href="index.html" if it doesn't already
back_btn = soup.find('button', class_='btn-back')
if back_btn:
    back_btn['onclick'] = "window.location.href='index.html'"

out_path = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\feeder_drilldown.html"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(str(soup))

print(f"Wrote {out_path} ({len(str(soup))} bytes)")
