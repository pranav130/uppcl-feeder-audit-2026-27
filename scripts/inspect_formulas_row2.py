import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=False)
ws = wb['AUDIT DATA']

def col_letter(idx):
    if idx < 26:
        return chr(65 + idx)
    else:
        return chr(65 + idx // 26 - 1) + chr(65 + idx % 26)

for i, row in enumerate(ws.iter_rows(values_only=False)):
    if i == 1:
        headers = [c.value for c in row[:35]]
    elif i == 2:
        formulas = [c.value for c in row[:35]]
        for idx in range(len(headers)):
            print(f"Col {idx:2d} ({col_letter(idx):<2}): {repr(headers[idx]):<35} => {repr(formulas[idx])}")
        break
