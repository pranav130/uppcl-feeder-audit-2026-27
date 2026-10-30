import sys, os, gzip, glob, re

sys.stdout.reconfigure(encoding='utf-8')

MASTER_DIR = r"D:\MASTER DATA\FY 26-27\SEP_2026"
print("Scanning sample file in Master dir to check columns...")

# Check first file in DVVNL or MVVNL
sample_files = glob.glob(os.path.join(MASTER_DIR, "MVVNL", "*.csv.gz"))
if sample_files:
    print("Reading header of:", sample_files[0])
    with gzip.open(sample_files[0], 'rt', encoding='utf-8', errors='ignore') as f:
        header = f.readline().strip()
        print("Header:", header)
        for i in range(3):
            print(f"Row {i}:", f.readline().strip()[:150])
