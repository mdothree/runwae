#!/usr/bin/env node
/**
 * Render every email template (sample data) to <outDir>/<template>.html and
 * <template>.txt, plus index.html. Used for review screenshots.
 *   node tests/render-emails.js <outDir> [--local-assets <dir-with-img/>]
 * --local-assets rewrites https://runwae.com/img/ to file URLs so images that
 * are not deployed yet still show up in previews.
 */
const fs = require('fs');
const path = require('path');
const T = require(path.join(__dirname, '..', 'api', 'lib', '_email-templates.js'));

const out = process.argv[2];
if (!out) { console.error('usage: render-emails.js <outDir> [--local-assets <root>]'); process.exit(2); }
const la = process.argv.indexOf('--local-assets');
const localRoot = la > 0 ? path.resolve(process.argv[la + 1]) : null;
fs.mkdirSync(out, { recursive: true });

const rows = [];
for (const [name, t] of Object.entries(T)) {
  const m = t.render(t.sample);
  let html = m.html;
  if (localRoot) html = html.split('https://runwae.com/img/').join('file://' + localRoot + '/img/');
  fs.writeFileSync(path.join(out, name + '.html'), html);
  fs.writeFileSync(path.join(out, name + '.txt'), `Subject: ${m.subject}\n\n${m.text}`);
  rows.push(`<li><a href="${name}.html">${name}</a> <small>(${t.category})</small> &mdash; ${m.subject.replace(/</g, '&lt;')}</li>`);
}
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Runwae emails</title><ul>${rows.join('\n')}</ul>`);
console.log(`rendered ${rows.length} templates to ${out}`);
