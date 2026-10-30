import openpyxl

path = r'G:\Other computers\Prabhakar Sir\G Drive\FEEDERWISE ENERGY AUDIT\new\FY2026-27\11KV total feeders prog audit 2026-27 upto sep-26 F_excluding absurd CA.xlsx'
wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
ws = wb['AUDIT DATA']

no_cons_samples = []
ie_zero_samples = []

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i < 2: continue
    feeder = row[6]
    key = row[7]
    ie = row[10]
    se = row[11]
    ass = row[12]
    real = row[13]
    ll_s = row[18]
    atc_s = row[19]
    billable_sep = row[45] # AT

    if ll_s == 'No Cosumers Tagged' and len(no_cons_samples) < 5:
        no_cons_samples.append((feeder, ie, se, billable_sep))
    if ll_s == 'I.E. is 0 or not filled' and len(ie_zero_samples) < 5:
        ie_zero_samples.append((feeder, ie, se, billable_sep))
    
    if len(no_cons_samples) >= 5 and len(ie_zero_samples) >= 5:
        break

print('No Consumers Tagged samples in Prabhakar Sir sheet (feeder, IE, SE, Billable Sep):')
for s in no_cons_samples:
    print(' ', s)

print('IE 0 samples in Prabhakar Sir sheet (feeder, IE, SE, Billable Sep):')
for s in ie_zero_samples:
    print(' ', s)
