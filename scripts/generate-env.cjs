const fs = require('fs');
const path = require('path');

function parseDotEnv(src) {
  const obj = {};
  src.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.substring(0, eq).trim();
    let val = trimmed.substring(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    obj[key] = val;
  });
  return obj;
}

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.join(projectRoot, '.env');
let parsed = {};
if (fs.existsSync(envPath)) {
  try {
    parsed = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
  } catch (e) {
    console.warn('Could not read .env file:', e.message);
  }
}

const env = {
  API_URL: process.env.VITE_API_URL || parsed.VITE_API_URL || process.env.API_URL || parsed.API_URL || '',
  FRAMEWORK_VERSION: process.env.FRAMEWORK_VERSION || parsed.FRAMEWORK_VERSION || '',
  TITLE_PAGE: process.env.TITLE_PAGE || parsed.TITLE_PAGE || '',
  PROJECT_NAME: process.env.PROJECT_NAME || parsed.PROJECT_NAME || '',
};

const out = `window.__ENV__ = ${JSON.stringify(env, null, 2)};`;
const outPath = path.join(projectRoot, 'public', 'env.js');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, { encoding: 'utf8' });
console.log('public/env.js generated');
