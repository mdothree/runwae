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
const envVars = {
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || ''
};

// Replace placeholders
for (const [key, value] of Object.entries(envVars)) {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value);
}

// Write output
fs.writeFileSync(outputPath, template);

console.log('Config injected successfully:', outputPath);
console.log('Variables set:', Object.keys(envVars).filter(k => envVars[k]).join(', ') || 'none');
