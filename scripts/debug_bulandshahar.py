import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    zone = str(row[2] or '').strip().upper()
    if zone != 'BULANDSHAHAR': continue
    
    f_ie = row[10]
    f_se = row[11]
    f_ass = row[12]
    f_real = row[13]
    be_val = row[14]
    ce_val = row[15]
    ll_val = row[16]
    atc_val = row[17]
    ll_s_col = row[18]
    atc_s_col = row[19]
    
    # Let's calculate CE and ATC ourselves:
    if f_ie and f_ie > 0 and row[45] and row[45] > 0:
        be = f_se / f_ie
        ce = (f_real / f_ass) if (f_ass and f_ass > 0) else (1.0 if (f_real and f_real > 0) else 1.0)
        atc = 1.0 - (be * ce)
        
        # Determine calc slab
        if atc < 0: s = 'Abnormal'
        elif atc < 0.05: s = '0% to 5%'
        elif atc < 0.10: s = '5% to 10%'
        elif atc < 0.20: s = '10% to 20%'
        elif atc < 0.30: s = '20% to 30%'
        elif atc < 0.50: s = '30% to 50%'
        elif atc < 0.70: s = '50% to 70%'
        else: s = 'Above 70%'
        
        if s != atc_s_col:
            print(f"Feeder: {row[6]}")
            print(f"  Col Values: IE={f_ie}, SE={f_se}, Ass={f_ass}, Real={f_real}")
            print(f"  Sheet BE={be_val}, CE={ce_val}, ATC={atc_val}, ATC Slab={atc_s_col}")
            print(f"  Our Calc: BE={be}, CE={ce}, ATC={atc}, Calc Slab={s}")
            print("---")
