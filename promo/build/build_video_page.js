const fs = require('fs');
const path = require('path');
// Copy the four font files the page uses out of node_modules (run `npm install` first).
fs.mkdirSync('fonts', { recursive: true });
for (const [pkg, files] of [['unbounded', ['500', '700']], ['instrument-sans', ['500', '600']]]) {
  for (const w of files) {
    const name = `${pkg}-latin-${w}-normal.woff2`;
    if (!fs.existsSync(path.join('fonts', name))) fs.copyFileSync(path.join('node_modules', '@fontsource', pkg, 'files', name), path.join('fonts', name));
  }
}
fs.writeFileSync('events.json', JSON.stringify(require('./timeline.js')));
let h = fs.readFileSync('video.template.html', 'utf8');
h = h.replace('/*TIMELINE*/', () => fs.readFileSync('timeline.js', 'utf8'));
h = h.replace('/*DATA*/', () => fs.readFileSync('game.json', 'utf8'));
fs.writeFileSync('video.html', h);
console.log('video.html', h.length);
