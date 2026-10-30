import json

with open(r'C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27\data\feeders.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

for r in d['rows']:
    if '14101730090F10' in r[5]:
        print('Found feeder in our dataset:')
        print('  Name:', r[5])
        print('  IE:', r[8])
        print('  SE:', r[9])
        print('  Ass:', r[10])
        print('  Real:', r[11])
        print('  Cons (r[12]):', r[12])
        print('  Flags (r[13]):', r[13])
        break
