import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=False)
ws = wb['AUDIT DATA']

for i, row in enumerate(ws.iter_rows(values_only=False)):
    if i == 1:
        headers = [c.value for c in row]
    elif i == 2:
        for idx in [28, 33, 40, 45, 52, 57, 64, 69, 76, 81, 92, 97]:
            h = headers[idx] if idx < len(headers) else f'Col {idx}'
            v = row[idx].value if idx < len(row) else None
            print(f"Col {idx:3d} ({h}): {repr(v)[:80]}")
        break
