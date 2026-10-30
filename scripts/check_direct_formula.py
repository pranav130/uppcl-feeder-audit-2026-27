import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

diffs = []
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    
    # In Sir's sheet:
    # Col 10: Input Energy
    # Col 11: Sold Energy
    # Col 12: Assessment
    # Col 13: Realization
    # Col 18: LL slab
    # Col 19: ATC slab
    
    f_name = row[6]
    ll_s_col = row[18]
    atc_s_col = row[19]
    
    # Calculate directly from Col 10, 11, 12, 13
    k_ie = float(row[10] or 0)
    l_se = float(row[11] or 0)
    m_ass = float(row[12] or 0)
    n_real = float(row[13] or 0)
    
    if k_ie == 0:
        s_ll = 'I.E. is 0 or not filled'
        s_atc = 'I.E. is 0 or not filled'
    elif row[45] is None or row[45] == 0:
        s_ll = 'No Cosumers Tagged'
        s_atc = 'No Cosumers Tagged'
    else:
        be = l_se / k_ie
        ce = (n_real / m_ass) if m_ass > 0 else 1.0
        ll = 1.0 - be
        atc = 1.0 - (be * ce)
        
        def slab(x):
            if x < 0: return 'Abnormal'
            if x < 0.05: return '0% to 5%'
            if x < 0.10: return '5% to 10%'
            if x < 0.20: return '10% to 20%'
            if x < 0.30: return '20% to 30%'
            if x < 0.50: return '30% to 50%'
            if x < 0.70: return '50% to 70%'
            return 'Above 70%'
        
        s_ll = slab(ll)
        s_atc = slab(atc)
    
    if s_ll != ll_s_col or s_atc != atc_s_col:
        diffs.append((f_name, ll_s_col, s_ll, atc_s_col, s_atc, k_ie, l_se, m_ass, n_real, row[45]))
        if len(diffs) <= 5:
            print(f"Mismatch in feeder {f_name}:")
            print(f"  LL Sheet: {ll_s_col} vs Calc: {s_ll}")
            print(f"  ATC Sheet: {atc_s_col} vs Calc: {s_atc}")
            print(f"  Values: IE={k_ie}, SE={l_se}, Ass={m_ass}, Real={n_real}, Billable={row[45]}")
            print(f"  Col 14={row[14]}, Col 15={row[15]}, Col 16={row[16]}, Col 17={row[17]}")

print(f"\nTotal differences between raw Col 10-13 formula and Col 18-19: {len(diffs)}")
