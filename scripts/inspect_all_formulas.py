import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=False)
ws = wb['AUDIT DATA']

headers = []
for i, row in enumerate(ws.iter_rows(values_only=False)):
    if i == 1:
        headers = [c.value for c in row]
    elif i == 2:
        for idx, (h, cell) in enumerate(zip(headers, row)):
            val = cell.value
            if str(val).startswith('='):
                print(f'Col {idx} ({h}):\n  Formula: {val}\n')
        break
