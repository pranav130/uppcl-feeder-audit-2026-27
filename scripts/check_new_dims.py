import sys, openpyxl, json, re

sys.stdout.reconfigure(encoding='utf-8')

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    master = json.load(f)
N = master['d']

wb_e = openpyxl.load_workbook(r'C:\Users\HP\Documents\New Sep Input energy data.xlsx', read_only=True, data_only=True)
ws_e = wb_e['Sheet1']

excel_zones = set()
excel_circles = set()
excel_divisions = set()
excel_areas = set()
excel_natures = set()
excel_ss = set()

for i, row in enumerate(ws_e.iter_rows(values_only=True)):
    if i == 0: continue
    if row[9] is True or str(row[9]).upper() == 'TRUE':
        if row[1]: excel_zones.add(str(row[1]).strip().upper())
        if row[2]: excel_circles.add(str(row[2]).strip().upper())
        if row[3]: excel_divisions.add(str(row[3]).strip().upper())
        if len(row) > 11 and row[11]: excel_areas.add(str(row[11]).strip().upper())
        if len(row) > 17 and row[17]: excel_natures.add(str(row[17]).strip().upper())
        if row[4]: excel_ss.add(str(row[4]).strip().upper())
wb_e.close()

master_zones = set(z.upper() for z in N['Zone'])
master_circles = set(c.upper() for c in N['Circle'])
master_divisions = set(d.upper() for d in N['Division'])
master_areas = set(a.upper() for a in N['Area'])
master_natures = set(n.upper() for n in N['Nature'])
master_ss = set(s.upper() for s in N['SS'])

print('New Zones in 26,237:', excel_zones - master_zones)
print('New Circles in 26,237:', excel_circles - master_circles)
print('New Divisions in 26,237:', excel_divisions - master_divisions)
print('New Areas in 26,237:', excel_areas - master_areas)
print('New Natures in 26,237:', excel_natures - master_natures)
print('New Substations count in 26,237:', len(excel_ss - master_ss))
