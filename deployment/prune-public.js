#!/usr/bin/env node
/**
 * Post-build prune (RUNWAE-PUBLIC-CONFIG-FILES / RUNWAE-ERROR-LOG-PUBLIC).
 * outputDirectory is "." so every uploaded file is publicly served. Files the
 * build itself needs (vercel.json, deployment/inject-config.js) can't go in
 * .vercelignore, so remove them from the output AFTER inject-config.js runs.
 * vercel.json is parsed before the build starts, so deleting it here is safe.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const targets = [
  'vercel.json',
  'deployment',
  'firebase.json',
  'database.rules.json',
  'README.md',
  'STATUS.md',
  'marketerLedger.txt',
  'error_log',
  'database-debug.log',
  'ui-debug.log',
];
for (const t of targets) {
  const p = path.join(root, t);
  if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); console.log('pruned', t); }
}
