const https = require('https');
const crypto = require('crypto');

const DEK = Buffer.from('Dwl432/xkShAvWLffdS4LNkGATVbqp9me8BlHnKBDzQ=', 'base64');
const url = 'https://pranav130.github.io/uppcl-feeder-audit-2026-27/data/feeders.js?v=20261030_135500';

https.get(url, (res) => {
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    const idx = raw.indexOf('{');
    const lastIdx = raw.lastIndexOf('}');
    const jsonStr = raw.substring(idx, lastIdx + 1);
    const payload = JSON.parse(jsonStr);
    const iv = Buffer.from(payload.iv, 'base64');
    const ct = Buffer.from(payload.ct, 'base64');
    const authTag = ct.slice(-16);
    const ciphertext = ct.slice(0, -16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', DEK, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const data = JSON.parse(decrypted.toString('utf8'));
    console.log('LIVE GITHUB PAGES FEEDER COUNT:', data.rows.length);
  });
});
