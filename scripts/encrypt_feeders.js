const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_DIR = path.resolve(__dirname, '..');
const DEK = Buffer.from('Dwl432/xkShAvWLffdS4LNkGATVbqp9me8BlHnKBDzQ=', 'base64');

console.log('Encrypting feeders.json to feeders.js with AES-256-GCM...');

const jsonPath = path.join(REPO_DIR, 'data', 'feeders.json');
const rawBytes = fs.readFileSync(jsonPath);

// Generate 96-bit (12 bytes) random IV
const iv = crypto.randomBytes(12);

const cipher = crypto.createCipheriv('aes-256-gcm', DEK, iv);
const ciphertext = Buffer.concat([cipher.update(rawBytes), cipher.final()]);
const authTag = cipher.getAuthTag();

// In WebCrypto SubtleCrypto AES-GCM, the authTag (16 bytes) is appended at the end of ciphertext
const combinedCt = Buffer.concat([ciphertext, authTag]);

const encPayload = {
  iv: iv.toString('base64'),
  ct: combinedCt.toString('base64')
};

const jsContent = `/* AES-256-GCM Encrypted UPPCL Feeder Dataset (Requires PBKDF2-SHA256 Authenticated Session Key) */\nwindow.__ENCRYPTED_FEEDERS = ${JSON.stringify(encPayload)};\n`;

const targets = [
  path.join(REPO_DIR, 'data', 'feeders.js'),
  path.join(REPO_DIR, 'frontend', 'data', 'feeders.js')
];

for (const t of targets) {
  fs.writeFileSync(t, jsContent, 'utf8');
  console.log(`Wrote encrypted file: ${t} (${(fs.statSync(t).size / 1024 / 1024).toFixed(2)} MB)`);
}

// Verify decryption
const testIv = Buffer.from(encPayload.iv, 'base64');
const testCt = Buffer.from(encPayload.ct, 'base64');
const testAuthTag = testCt.slice(-16);
const testCiphertext = testCt.slice(0, -16);

const decipher = crypto.createDecipheriv('aes-256-gcm', DEK, testIv);
decipher.setAuthTag(testAuthTag);
const decrypted = Buffer.concat([decipher.update(testCiphertext), decipher.final()]);
const parsed = JSON.parse(decrypted.toString('utf8'));

console.log('Verification successful!');
console.log('Decrypted row count:', parsed.rows ? parsed.rows.length : 0);
console.assert(parsed.rows.length === 26237, 'Expected 26237 rows');
console.log('Feeder dataset encryption COMPLETE.');
