#!/usr/bin/env node
/**
 * Build script to inject environment variables into config.js
 * Run before deployment: node deployment/inject-config.js
 */

const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'js', 'config.template.js');
const outputPath = path.join(__dirname, '..', 'js', 'config.js');

// Read template
let template = fs.readFileSync(templatePath, 'utf8');

// Environment variables to inject
// Only PUBLIC browser values belong here (this file is served to every visitor).
// Values are trimmed (a trailing newline in the Vercel env var previously broke
// the generated JS with an unterminated string) and JSON-escaped.
const envVars = {
    MAPBOX_TOKEN: (process.env.MAPBOX_TOKEN || '').trim()
};
if (envVars.MAPBOX_TOKEN && !envVars.MAPBOX_TOKEN.startsWith('pk.')) {
    console.error('MAPBOX_TOKEN must be a public (pk.) token; refusing to publish a secret token');
    process.exit(1);
}

// Replace placeholders
for (const [key, value] of Object.entries(envVars)) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), () => JSON.stringify(value).slice(1, -1));
}

// Write output
fs.writeFileSync(outputPath, template);

console.log('Config injected successfully:', outputPath);
console.log('Variables set:', Object.keys(envVars).filter(k => envVars[k]).join(', ') || 'none');
