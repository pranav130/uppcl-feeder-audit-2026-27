import re

def update_js(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Update chips condition & clear
    old_chip = "if (state.monthFrom !== 'Apr' || state.monthTo !== 'Aug') {\n    chips.push({ label: `Months: ${state.monthFrom}–${state.monthTo} 2026`, clear: () => { state.monthFrom = 'Apr'; state.monthTo = 'Aug'; document.getElementById('fMonthFrom').value = 'Apr'; document.getElementById('fMonthTo').value = 'Aug'; } });\n  }"
    new_chip = "if (state.monthFrom !== 'Apr' || state.monthTo !== 'Sep') {\n    chips.push({ label: `Months: ${state.monthFrom}–${state.monthTo} 2026`, clear: () => { state.monthFrom = 'Apr'; state.monthTo = 'Sep'; document.getElementById('fMonthFrom').value = 'Apr'; document.getElementById('fMonthTo').value = 'Sep'; } });\n  }"
    assert old_chip in c, f"Chip block not found in {path}"
    c = c.replace(old_chip, new_chip, 1)

    # 2. Update resetFilters
    old_reset = "  state.monthFrom = 'Apr';\n  state.monthTo = 'Aug';"
    new_reset = "  state.monthFrom = 'Apr';\n  state.monthTo = 'Sep';"
    assert old_reset in c, f"Reset block not found in {path}"
    c = c.replace(old_reset, new_reset, 1)

    old_dom = "  document.getElementById('fMonthFrom').value = 'Apr';\n  document.getElementById('fMonthTo').value = 'Aug';"
    new_dom = "  document.getElementById('fMonthFrom').value = 'Apr';\n  document.getElementById('fMonthTo').value = 'Sep';"
    assert old_dom in c, f"DOM reset not found in {path}"
    c = c.replace(old_dom, new_dom, 1)

    # 3. Dynamic month in Excel headers
    old_hdr = "    'LINE LOSS SLAB (Progressive Upto Aug-26)', '', '', '', '', '', '', '',\n    'AT&C LOSS SLAB (Progressive Upto Aug-26)', '', '', '', '', '', '', '',"
    new_hdr = "    `LINE LOSS SLAB (Progressive Upto ${state.monthTo}-26)`, '', '', '', '', '', '', '',\n    `AT&C LOSS SLAB (Progressive Upto ${state.monthTo}-26)`, '', '', '', '', '', '', '',"
    assert old_hdr in c, f"Excel header not found in {path}"
    c = c.replace(old_hdr, new_hdr, 1)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

def update_html(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Update summary table headers in index.html to Upto Sep-26
    c = c.replace('LINE LOSS SLAB (Progressive Upto Aug-26)', 'LINE LOSS SLAB (Progressive Upto Sep-26)')
    c = c.replace('AT&amp;C LOSS SLAB (Progressive Upto Aug-26)', 'AT&amp;C LOSS SLAB (Progressive Upto Sep-26)')

    # Bump cache busters to 20261014_150000
    c = c.replace('styles.css?v=20261014_143000', 'styles.css?v=20261014_150000')
    c = c.replace('data/feeders.js?v=20261014_143000', 'data/feeders.js?v=20261014_150000')
    c = c.replace('dashboard_app.js?v=20261014_143000', 'dashboard_app.js?v=20261014_150000')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

def update_drilldown(path):
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('data/feeders.js?v=20261014_143000', 'data/feeders.js?v=20261014_150000')
    c = c.replace('slab_data/${lossType}_${slug}.js?v=20261014_143000', 'slab_data/${lossType}_${slug}.js?v=20261014_150000')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print(f"Updated {path} successfully!")

if __name__ == '__main__':
    update_js('dashboard_app.js')
    update_js('frontend/dashboard_app.js')
    update_html('index.html')
    update_html('frontend/index.html')
    update_drilldown('feeder_drilldown.html')
    update_drilldown('frontend/feeder_drilldown.html')
