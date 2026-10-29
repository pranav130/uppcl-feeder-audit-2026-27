const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_DIR = 'C:/Users/HP/.gemini/antigravity/scratch/UPPCL_11KV_PSR_Dashboard_2026_27';
const DEK = Buffer.from('Dwl432/xkShAvWLffdS4LNkGATVbqp9me8BlHnKBDzQ=', 'base64');

const slabDirs = [
  path.join(REPO_DIR, 'slab_data'),
  path.join(REPO_DIR, 'frontend', 'slab_data')
];

function encryptPayload(plainObj) {
  const jsonStr = JSON.stringify(plainObj);
  const plainBuf = Buffer.from(jsonStr, 'utf8');
  const iv = crypto.randomBytes(12); // 96-bit IV
  
  const cipher = crypto.createCipheriv('aes-256-gcm', DEK, iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // In WebCrypto SubtleCrypto: authTag is appended at the end of ciphertext
  const combinedCt = Buffer.concat([ciphertext, authTag]);
  
  return {
    iv: iv.toString('base64'),
    ct: combinedCt.toString('base64')
  };
}

let count = 0;
for (const dir of slabDirs) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const fpath = path.join(dir, file);
    const content = fs.readFileSync(fpath, 'utf8');
    
    // Check if it's CURRENT_SLAB_DATA
    const match = content.match(/window\.CURRENT_SLAB_DATA\s*=\s*(\{[\s\S]*?\});/);
    if (match) {
      const plainObj = JSON.parse(match[1]);
      const encObj = encryptPayload(plainObj);
      const outContent = `/* AES-256-GCM Encrypted Slab Dataset */\nwindow.__ENCRYPTED_SLAB = ${JSON.stringify(encObj)};\n`;
      fs.writeFileSync(fpath, outContent, 'utf8');
      count++;
    }
  }
}

console.log(`Encrypted ${count} slab datasets successfully across both root and frontend.`);
