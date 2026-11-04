'use strict';
// Plays computer-vs-computer games to check balance and to tune the levels in src/engine.js.
//   node tools/balance.js          quick run
//   node tools/balance.js 100      more games per matchup
const E = require('../src/engine.js');

const GAMES = Number(process.argv[2]) || 40;
// A stand-in for a casual human: looks two turns ahead but plays a random move 40% of the time.
const CASUAL = { depth: 2, randomness: 0.4 };
const player = (name) => (name === 'casual' ? CASUAL : E.LEVELS[name]);

function playGame(whiteName, blackName) {
  let g = E.newGame();
  let captures = 0;
  while (g.winner === null && !g.draw) {
    const p = player(g.turn === 0 ? whiteName : blackName);
    g = E.apply(g, E.chooseMove(g, p.depth, p.randomness));
    if (g.last.captured) captures++;
  }
  return { g, captures };
}

/** Plays `games` games, swapping colours each time, and tallies results by player. */
function match(a, b, games) {
  const tally = { [a]: 0, [b]: 0, draw: 0, turns: 0, captures: 0 };
  for (let k = 0; k < games; k++) {
    const aIsWhite = k % 2 === 0;
    const { g, captures } = playGame(aIsWhite ? a : b, aIsWhite ? b : a);
    tally.turns += g.plies;
    tally.captures += captures;
    if (g.winner === null) tally.draw++;
    else tally[(g.winner === 0) === aIsWhite ? a : b]++;
  }
  tally.avgTurns = +(tally.turns / games).toFixed(1);
  delete tally.turns;
  return tally;
}

console.log('Casual player vs each level (win/loss/draw from the casual player\'s side)');
for (const level of Object.keys(E.LEVELS)) {
  const r = match('casual', level, GAMES);
  console.log(`  vs ${level.padEnd(8)} won ${String(r.casual).padStart(2)}  lost ${String(r[level]).padStart(2)}  drew ${String(r.draw).padStart(2)}`);
}

console.log('\nHard vs Hard (colour balance, length)');
const mirror = { white: 0, black: 0, draw: 0, turns: 0, captures: 0 };
for (let k = 0; k < GAMES; k++) {
  const { g, captures } = playGame('hard', 'hard');
  if (g.winner === null) mirror.draw++; else mirror[g.winner === 0 ? 'white' : 'black']++;
  mirror.turns += g.plies;
  mirror.captures += captures;
}
console.log(`  white ${mirror.white}  black ${mirror.black}  draws ${mirror.draw}  avg turns ${(mirror.turns / GAMES).toFixed(1)}  captures/game ${(mirror.captures / GAMES).toFixed(1)}`);
