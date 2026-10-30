import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    zone = str(row[2] or '').strip().upper()
    if zone != 'BULANDSHAHAR': continue
    
    # Compare Col 10, 11, 12, 13 vs sum of monthly columns
    sum_ie = sum(float(row[c] or 0) for c in range(28, 34))
    sum_se = sum(float(row[c] or 0) for c in range(52, 58))
    sum_ass = sum(float(row[c] or 0) for c in range(64, 70))
    sum_real = sum(float(row[c] or 0) for c in range(76, 82))
    
    k_ie = float(row[10] or 0)
    l_se = float(row[11] or 0)
    m_ass = float(row[12] or 0)
    n_real = float(row[13] or 0)
    
    # Calculate ATC using sheet progressive values (K, L, M, N)
    if k_ie > 0 and row[45] and row[45] > 0:
        be1 = l_se / k_ie
        ce1 = (n_real / m_ass) if m_ass > 0 else (1.0 if n_real > 0 else 1.0)
        atc1 = 1.0 - (be1 * ce1)
        
        # Calculate ATC using monthly sums rounded
        be2 = sum_se / sum_ie if sum_ie > 0 else 0
        ce2 = (sum_real / sum_ass) if sum_ass > 0 else (1.0 if sum_real > 0 else 1.0)
        atc2 = 1.0 - (be2 * ce2)
        
        def slab(x):
            if x < 0: return 'Abnormal'
            if x < 0.05: return '0% to 5%'
            if x < 0.10: return '5% to 10%'
            if x < 0.20: return '10% to 20%'
            if x < 0.30: return '20% to 30%'
            if x < 0.50: return '30% to 50%'
            if x < 0.70: return '50% to 70%'
            return 'Above 70%'
        
        s1 = slab(atc1)
        s2 = slab(atc2)
        s_sheet = row[19]
        
        if s_sheet != s2:
            print(f"Feeder: {row[6]}")
            print(f"  Col 19 (Sheet): {s_sheet} | s1 (Prog): {s1} | s2 (Monthly sum): {s2}")
            print(f"  atc_sheet={row[17]}, atc1={atc1}, atc2={atc2}")
            print(f"  K={k_ie}, sum_ie={sum_ie} | L={l_se}, sum_se={sum_se}")
            print(f"  M={m_ass}, sum_ass={sum_ass} | N={n_real}, sum_real={sum_real}")
            print("---")
