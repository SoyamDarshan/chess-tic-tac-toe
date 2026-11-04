// Captures settled and mid-transition stills for a contact sheet.
const { chromium } = require('playwright');
const T = require('./timeline.js');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + process.cwd() + '/video.html'); await p.waitForFunction('window.READY === true');
  const times = (process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [1.6, 3.0, 5.0, 6.5, 7.9, 8.8, 10.0, 12.5, 15.8, 17.0, 18.0, 20.5]);
  for (const [i, t] of times.entries()) { await p.evaluate(t => window.render(t), t); await p.screenshot({ path: 'still_' + String(i).padStart(2, '0') + '.png' }); }
  console.log('stills', times.length, 'errors', errs); await b.close();
})();
