#!/usr/bin/env node
/**
 * RUNWAE-OUTPUTDIR-ROOT: build the static site into dist/ from an ALLOWLIST of
 * web assets, so vercel.json can use outputDirectory "dist" instead of "." (which
 * published the whole repo root: logs, config, rules, docs, build scripts).
 * Replaces the old post-build deny-list (deployment/prune-public.js).
 *
 * Run after deployment/inject-config.js (which writes js/runtime-config.js; the old js/config.js
 * name is never published: RUNWAE-PUBLIC-CONFIG-FILES).
 * api/ is NOT copied: Vercel builds api/*.js as serverless functions from the
 * project root regardless of outputDirectory.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// Web asset directories (copied recursively, minus EXCLUDE_EXT files).
const DIRS = [
  'blog', 'Bootstrap', 'css', 'fonts', 'guides', 'icons', 'images', 'img', 'js',
  'lottie', 'og', 'runwaejs', 'svg-icons', 'unobfrunwaejs', 'vendor',
];
// Root-level static files (plus every root *.html).
const ROOT_FILES = [
  'apple-touch-icon.png', 'favicon.ico', 'manifest.json', 'og-image.png',
  'robots.txt', 'serviceworker.js', 'site.webmanifest', 'sitemap.xml',
];
// Never published, even inside an allowlisted directory.
const EXCLUDE_EXT = new Set(['.md', '.sh', '.py', '.php', '.log', '.map']);
const EXCLUDE_NAME = new Set(['.DS_Store', 'config.template.js']);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE_NAME.has(ent.name) || ent.name.startsWith('.')) continue;
    const s = path.join(src, ent.name), d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else if (ent.isFile() && !EXCLUDE_EXT.has(path.extname(ent.name).toLowerCase())) fs.copyFileSync(s, d);
  }
}

fs.rmSync(dist, { recursive: true, force: true });
// A stale js/config.js from an older local build must never ship.
fs.rmSync(path.join(root, 'js', 'config.js'), { force: true });
fs.mkdirSync(dist);
let n = 0;
for (const f of fs.readdirSync(root)) {
  if (f.endsWith('.html') || ROOT_FILES.includes(f)) { fs.copyFileSync(path.join(root, f), path.join(dist, f)); n++; }
}
for (const d of DIRS) {
  if (fs.existsSync(path.join(root, d))) { copyDir(path.join(root, d), path.join(dist, d)); n++; }
}
// Billing copy (subscription + 0% fee model, Principal 2026-10-14): see deployment/billing-copy.js.
// One switch (RUNWAE_BILLING_ENABLED), one price source (api/lib/billing-config.js).
const { applyBillingCopy, billingOn } = require('./billing-copy');
let billingPages = 0;
for (const f of fs.readdirSync(dist)) {
  if (!f.endsWith('.html')) continue;
  const fp = path.join(dist, f);
  if (f === 'plans.html' && !billingOn(process.env)) { fs.rmSync(fp); continue; }
  const before = fs.readFileSync(fp, 'utf8');
  const after = applyBillingCopy(before, process.env);
  if (after !== before) { fs.writeFileSync(fp, after); billingPages++; }
}
console.log(`build-dist: billing ${billingOn(process.env) ? 'ON' : 'OFF'}, copy applied to ${billingPages} page(s)`);

// SURF-006: RFC 9116 security.txt (copyDir skips dot-dirs, so copy it explicitly).
const secTxt = path.join(root, '.well-known', 'security.txt');
if (fs.existsSync(secTxt)) {
  fs.mkdirSync(path.join(dist, '.well-known'), { recursive: true });
  fs.copyFileSync(secTxt, path.join(dist, '.well-known', 'security.txt')); n++;
}

// Guard: the build must fail rather than publish anything sensitive.
const MUST_NOT_EXIST = [
  'vercel.json', 'deployment', 'api', 'docs', 'package.json', 'firebase.json',
  'database.rules.json', 'README.md', 'STATUS.md', 'marketerLedger.txt', 'error_log',
  'database-debug.log', 'ui-debug.log', 'email.php', '.vercel', '.vscode', 'og/build.sh',
  'js/config.js',
];
const leaked = MUST_NOT_EXIST.filter((p) => fs.existsSync(path.join(dist, p)));
if (leaked.length) { console.error('build-dist: refusing, sensitive paths in dist:', leaked); process.exit(1); }
if (!fs.existsSync(path.join(dist, '.well-known', 'security.txt'))) {
  console.error('build-dist: .well-known/security.txt missing from dist');
  process.exit(1);
}
if (!fs.existsSync(path.join(dist, 'welcome.html')) || !fs.existsSync(path.join(dist, 'js', 'runtime-config.js'))) {
  console.error('build-dist: welcome.html or js/runtime-config.js missing from dist (run inject-config.js first)');
  process.exit(1);
}
console.log(`build-dist: ${n} entries copied to dist/`);
