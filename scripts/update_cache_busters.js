const fs = require('fs');
const path = require('path');

const REPO_DIR = path.resolve(__dirname, '..');
const TIMESTAMP = '20261030_140500';

const files = [
  'index.html',
  'frontend/index.html',
  'feeder_drilldown.html',
  'frontend/feeder_drilldown.html'
];

for (const rel of files) {
  const p = path.join(REPO_DIR, rel);
  if (!fs.existsSync(p)) continue;
  let text = fs.readFileSync(p, 'utf8');

  // Replace data/feeders.js?v=...
  text = text.replace(/data\/feeders\.js\?v=[0-9_]+/g, `data/feeders.js?v=${TIMESTAMP}`);
  
  // Replace dashboard_app.js?v=...
  text = text.replace(/dashboard_app\.js\?v=[0-9_]+/g, `dashboard_app.js?v=${TIMESTAMP}`);

  // Replace slab_data/${lossType}_${slug}.js?v=...
  text = text.replace(/slab_data\/\$\{lossType\}_\$\{slug\}\.js\?v=[0-9_]+/g, `slab_data/\${lossType}_\${slug}.js?v=${TIMESTAMP}`);

  fs.writeFileSync(p, text, 'utf8');
  console.log(`Updated cache busters in ${rel}`);
}
