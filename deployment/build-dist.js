#!/usr/bin/env node
/**
 * RUNWAE-OUTPUTDIR-ROOT: build the static site into dist/ from an ALLOWLIST of
 * web assets, so vercel.json can use outputDirectory "dist" instead of "." (which
 * published the whole repo root: logs, config, rules, docs, build scripts).
 * Replaces the old post-build deny-list (deployment/prune-public.js).
 *
 * Run after deployment/inject-config.js (which writes js/config.js).
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
  'ads.txt', 'apple-touch-icon.png', 'favicon.ico', 'manifest.json', 'og-image.png',
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
fs.mkdirSync(dist);
let n = 0;
for (const f of fs.readdirSync(root)) {
  if (f.endsWith('.html') || ROOT_FILES.includes(f)) { fs.copyFileSync(path.join(root, f), path.join(dist, f)); n++; }
}
for (const d of DIRS) {
  if (fs.existsSync(path.join(root, d))) { copyDir(path.join(root, d), path.join(dist, d)); n++; }
}

// Guard: the build must fail rather than publish anything sensitive.
const MUST_NOT_EXIST = [
  'vercel.json', 'deployment', 'api', 'docs', 'package.json', 'firebase.json',
  'database.rules.json', 'README.md', 'STATUS.md', 'marketerLedger.txt', 'error_log',
  'database-debug.log', 'ui-debug.log', 'email.php', '.vercel', '.vscode', 'og/build.sh',
];
const leaked = MUST_NOT_EXIST.filter((p) => fs.existsSync(path.join(dist, p)));
if (leaked.length) { console.error('build-dist: refusing, sensitive paths in dist:', leaked); process.exit(1); }
if (!fs.existsSync(path.join(dist, 'welcome.html')) || !fs.existsSync(path.join(dist, 'js', 'config.js'))) {
  console.error('build-dist: welcome.html or js/config.js missing from dist (run inject-config.js first)');
  process.exit(1);
}
console.log(`build-dist: ${n} entries copied to dist/`);
