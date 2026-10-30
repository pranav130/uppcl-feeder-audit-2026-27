import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

diffs = []
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    zone = str(row[2] or '').strip().upper()
    if zone != 'BULANDSHAHAR': continue
    
    f_name = row[6]
    atc_s_col = row[19]
    billable_sep = row[45]
    
    # In test_reproduced_summary:
    # if cons == 0: return 'No Cons'
    # But what was atc_s_col?
    if (billable_sep is None or billable_sep == 0) and atc_s_col != 'No Cosumers Tagged' and atc_s_col != 'I.E. is 0 or not filled':
        diffs.append((f_name, billable_sep, atc_s_col, row[10], row[11]))

print(f"Found {len(diffs)} feeders where billable_sep is 0/None but atc_s_col is {diffs}")
