const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/HP/.gemini/antigravity/scratch/UPPCL_11KV_PSR_Dashboard_2026_27';
const dstDir = 'D:/MASTER DATA/PowerBI_PSR_Dashboard/Dashboard_Oracle_Derived/github_pages';

function copyFile(relPath) {
  const src = path.join(srcDir, relPath);
  const dst = path.join(dstDir, relPath);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`Copied: ${relPath}`);
}

function copyDirRecursive(relDir) {
  const src = path.join(srcDir, relDir);
  const dst = path.join(dstDir, relDir);
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    const subRel = path.join(relDir, ent.name);
    if (ent.isDirectory()) {
      copyDirRecursive(subRel);
    } else {
      copyFile(subRel);
    }
  }
}

console.log('Copying root files...');
copyFile('index.html');
copyFile('feeder_drilldown.html');
copyFile('dashboard_app.js');

console.log('Copying data/...');
copyDirRecursive('data');

console.log('Copying slab_data/...');
copyDirRecursive('slab_data');

console.log('Copying Slab_Excel_Exports/...');
copyDirRecursive('Slab_Excel_Exports');

console.log('Sync to github_pages completed successfully!');
