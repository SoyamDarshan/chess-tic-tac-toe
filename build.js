'use strict';
// Builds dist/index.html: one self-contained page with the styles, engine and UI inlined.
const fs = require('node:fs');
const path = require('node:path');

const src = (name) => fs.readFileSync(path.join(__dirname, 'src', name), 'utf8');
const inline = (page, marker, text) => {
  if (!page.includes(marker)) throw new Error(`marker ${marker} missing from src/index.html`);
  return page.replace(marker, () => text.trimEnd());
};

let page = src('index.html');
page = inline(page, '/*STYLES*/', src('styles.css'));
page = inline(page, '/*ENGINE*/', src('engine.js'));
page = inline(page, '/*UI*/', src('ui.js'));

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), page);
console.log(`built dist/index.html (${page.length} bytes)`);
