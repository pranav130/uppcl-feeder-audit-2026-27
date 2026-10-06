import os
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
frontend_dir = os.path.join(base_dir, "frontend")

# Copy frontend root files to base_dir root
for item in os.listdir(frontend_dir):
    src = os.path.join(frontend_dir, item)
    dst = os.path.join(base_dir, item)
    if os.path.isfile(src):
        shutil.copy2(src, dst)
        print(f"Copied file: {item} -> root")
    elif os.path.isdir(src):
        if not os.path.exists(dst):
            shutil.copytree(src, dst)
            print(f"Copied directory: {item} -> root")
        else:
            for sub in os.listdir(src):
                s_sub = os.path.join(src, sub)
                d_sub = os.path.join(dst, sub)
                if not os.path.exists(d_sub):
                    if os.path.isfile(s_sub):
                        shutil.copy2(s_sub, d_sub)
                    elif os.path.isdir(s_sub):
                        shutil.copytree(s_sub, d_sub)
            print(f"Merged directory: {item} -> root")

print("Root setup completed.")
