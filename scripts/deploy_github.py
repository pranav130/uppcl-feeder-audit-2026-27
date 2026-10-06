import subprocess
import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# Retrieve token via git credential fill
p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
stdout, stderr = p.communicate(input='protocol=https\nhost=github.com\n\n')

username, token = None, None
for line in stdout.splitlines():
    if line.startswith('username='): username = line.split('=', 1)[1]
    elif line.startswith('password='): token = line.split('=', 1)[1]

if not username or not token:
    print("Failed to retrieve GitHub credentials from git credential helper.")
    sys.exit(1)

repo_name = "uppcl-feeder-audit-2026-27"
print(f"Creating new GitHub repository: {username}/{repo_name} ...")

create_payload = json.dumps({
    "name": repo_name,
    "description": "UPPCL 11KV Feeder Progressive Energy Audit Dashboard (FY 2026-27, Apr-Aug 2026) with PTW Dynamic Analytics",
    "private": False,
    "has_issues": True,
    "has_projects": True,
    "has_wiki": False
}).encode('utf-8')

req = urllib.request.Request(
    'https://api.github.com/user/repos',
    data=create_payload,
    headers={
        'Authorization': f'token {token}',
        'User-Agent': 'UPPCL-Deployer',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
    }
)

try:
    with urllib.request.urlopen(req) as resp:
        res = json.load(resp)
        print("Repository created successfully:", res.get('html_url'))
except urllib.error.HTTPError as e:
    err_body = e.read().decode('utf-8')
    if e.code == 422 and "name already exists" in err_body:
        print(f"Repository {repo_name} already exists. Continuing with push.")
    else:
        print(f"HTTP Error creating repo: {e.code} - {err_body}")
        sys.exit(1)

# Initialize and push git repo
base_dir = r"C:\Users\HP\.gemini\antigravity\scratch\UPPCL_11KV_PSR_Dashboard_2026_27"
os.chdir(base_dir)

def run_git(cmd):
    res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if res.stdout: print(res.stdout.strip())
    if res.stderr: print(res.stderr.strip())
    return res.returncode

print("\nInitializing local git repository...")
run_git("git init -b main")
run_git(f"git config user.name \"{username}\"")
run_git(f"git config user.email \"{username}@users.noreply.github.com\"")
run_git("git add -A")
run_git('git commit -m "Initial release: UPPCL 11KV Feeder Progressive Energy Audit Dashboard (FY 2026-27)"')

remote_url = f"https://{username}:{token}@github.com/{username}/{repo_name}.git"
run_git(f"git remote remove origin")
run_git(f"git remote add origin https://github.com/{username}/{repo_name}.git")
print("\nPushing to GitHub main branch...")
run_git(f"git push -u \"{remote_url}\" main --force")

# Enable GitHub Pages
print("\nEnabling GitHub Pages on main branch...")
pages_payload = json.dumps({
    "source": {
        "branch": "main",
        "path": "/"
    }
}).encode('utf-8')

pages_req = urllib.request.Request(
    f'https://api.github.com/repos/{username}/{repo_name}/pages',
    data=pages_payload,
    headers={
        'Authorization': f'token {token}',
        'User-Agent': 'UPPCL-Deployer',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
    }
)

try:
    with urllib.request.urlopen(pages_req) as resp:
        pages_res = json.load(resp)
        print("GitHub Pages configured:", pages_res.get('html_url'))
except urllib.error.HTTPError as e:
    err_body = e.read().decode('utf-8')
    if e.code == 409 and "already has a Pages site" in err_body:
        print("GitHub Pages already enabled.")
    else:
        print(f"Pages configuration response ({e.code}): {err_body}")

live_url = f"https://{username}.github.io/{repo_name}/"
print("\n" + "="*80)
print(f"DEPLOYMENT COMPLETE!")
print(f"New GitHub Repository: https://github.com/{username}/{repo_name}")
print(f"New Live Website URL:  {live_url}")
print("="*80)
