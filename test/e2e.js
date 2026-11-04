'use strict';
// Browser smoke test. Optional: needs Playwright (`npm i -D playwright && npx playwright install chromium`).
//   node test/e2e.js
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.log('playwright is not installed, skipping the browser test');
  process.exit(0);
}

const PAGE = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
const targets = (page) => page.$$eval('.sq.target', els => els.map(el => +el.dataset.i));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(PAGE);
  await page.waitForSelector('.sq');
  assert.equal(await page.inputValue('#level'), 'easy');
  assert.ok(await page.isDisabled('#undo'), 'undo starts disabled');

  // White may only spawn on the bottom row.
  await page.click('#tray0 .chip >> nth=0');
  assert.deepEqual(await targets(page), [12, 13, 14, 15]);

  // Follow the hint, then the computer replies, then undo takes back both turns.
  await page.click('#hint');
  await page.click('.sq.hint');
  await page.waitForFunction(() => window.__ctt.g.plies === 2, null, { timeout: 8000 });
  await page.click('#undo');
  assert.equal(await page.evaluate(() => window.__ctt.g.plies), 0);

  // Two-player mode: black spawns on the top row, and a placed rook can reach the enemy side.
  await page.click('#mode-2p');
  const spawn = async (side, chip, square) => {
    await page.click(`#tray${side} .chip >> nth=${chip}`);
    await page.click(`.sq >> nth=${square}`);
  };
  await spawn(0, 1, 13);
  await page.click('#tray1 .chip >> nth=0');
  assert.deepEqual(await targets(page), [0, 1, 2, 3]);
  await page.click('.sq >> nth=1');
  await spawn(0, 0, 12);
  await spawn(1, 0, 2);
  await spawn(0, 0, 14);
  await spawn(1, 0, 0);
  await page.click('.sq >> nth=13');
  assert.ok((await targets(page)).some(i => i < 8), 'rook can reach the enemy half');

  // Play random human moves against the strongest computer until the game ends.
  await page.click('#mode-ai');
  await page.selectOption('#level', 'expert');
  for (let turn = 0; turn < 120; turn++) {
    await page.waitForFunction(() => {
      const g = window.__ctt.g;
      return g.turn === 0 || g.winner !== null || g.draw;
    }, null, { timeout: 10000 });
    if (await page.evaluate(() => window.__ctt.g.winner !== null || window.__ctt.g.draw)) break;
    const m = await page.evaluate(() => {
      const moves = window.CTT.legalMoves(window.__ctt.g);
      return moves[Math.floor(Math.random() * moves.length)];
    });
    if (m.k === 'drop') {
      const chip = await page.evaluate(t => window.__ctt.g.home[0].indexOf(t), m.t);
      await page.click(`#tray0 .chip >> nth=${chip}`);
    } else {
      await page.click(`.sq >> nth=${m.from}`);
    }
    await page.click(`.sq >> nth=${m.to}`);
  }
  const over = await page.evaluate(() => window.__ctt.g.winner !== null || window.__ctt.g.draw);
  assert.ok(over, 'the game finished');
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'no horizontal scroll');

  await browser.close();
  console.log('e2e ok');
})().catch(err => { console.error(err); process.exit(1); });
