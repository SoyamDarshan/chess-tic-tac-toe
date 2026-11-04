const { chromium } = require('playwright');
const T = require('./timeline.js');
const FPS = 30, N = Math.round(T.total * FPS);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + process.cwd() + '/video.html'); await p.waitForFunction('window.READY === true');
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await p.evaluate(t => window.render(t), i / FPS);
    await p.screenshot({ path: 'frames/f_' + String(i).padStart(4, '0') + '.jpg', type: 'jpeg', quality: 94 });
  }
  console.log('frames', N, 'in', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'errors', errs); await b.close();
})();
