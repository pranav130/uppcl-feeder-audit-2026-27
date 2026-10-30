import urllib.request, re

url = 'https://pranav130.github.io/uppcl-feeder-audit-2026-27/index.html'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        m = re.findall(r'feeders\.js\?v=([^"]+)', html)
        print('HTTP Status:', resp.status)
        print('Cache buster v:', m)
except Exception as e:
    print('Fetch error:', e)
