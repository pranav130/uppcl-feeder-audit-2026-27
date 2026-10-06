import sys
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

with open(r"C:\Users\HP\.gemini\antigravity\brain\3a1f71b5-7420-451d-82f6-5187ac767485\reference_index_curl.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

style_tag = soup.find('style')
css_content = style_tag.string if style_tag else ""

# Add additional styles for PTW badge and Methodology modal
extra_css = """
/* ── Additional PTW & Methodology Tokens ── */
.status-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 12.5px;
}
.status-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.tag-badge {
  font-family: var(--mono);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--line-2);
  background: var(--surface-2);
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tag-badge.ptw-off {
  background: #fff3e0;
  border-color: #ffb74d;
  color: #e65100;
  font-weight: 600;
}
[data-theme="dark"] .tag-badge.ptw-off {
  background: #3e2723;
  border-color: #ff9800;
  color: #ffb74d;
}
.tag-badge.ptw-on {
  background: #e8f5e9;
  border-color: #81c784;
  color: #2e7d32;
  font-weight: 600;
}
[data-theme="dark"] .tag-badge.ptw-on {
  background: #1b5e20;
  border-color: #4caf50;
  color: #a5d6a7;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-overlay.active {
  display: flex;
}
.modal-content {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding-bottom: 12px;
  margin-bottom: 16px;
}
.modal-header h3 {
  font-size: 16px;
  font-weight: 700;
}
.modal-close {
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--ink-2);
}
.modal-body {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ink-2);
}
.modal-body h4 {
  font-size: 14px;
  color: var(--ink);
  margin: 14px 0 6px;
}
.modal-body ul {
  padding-left: 20px;
  margin-bottom: 10px;
}
.modal-body code {
  font-family: var(--mono);
  background: var(--surface-2);
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 12px;
}
"""

full_css = css_content + "\n" + extra_css
out_css = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\frontend\styles.css"
with open(out_css, "w", encoding="utf-8") as f:
    f.write(full_css)

print(f"Wrote {out_css} ({len(full_css)} bytes)")
