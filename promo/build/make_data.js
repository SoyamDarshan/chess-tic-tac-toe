// Replays the chosen real game (seed 46) with the engine and writes the per-turn states the page draws.
const E = require('../../src/engine.js');
const fs = require('fs');
function rnd(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
const o = Math.random; Math.random = rnd(46);
let g = E.newGame(); const hist = [];
while (g.winner === null && !g.draw && g.plies < 40) { const p = g.turn === 0 ? { d: 3, r: 0.15 } : { d: 1, r: 0.5 }; const m = E.chooseMove(g, p.d, p.r); hist.push(m); g = E.apply(g, m); }
Math.random = o;
if (hist.length !== 17 || g.winner !== 0 || JSON.stringify(g.line) !== '[3,6,9,12]') throw new Error('game changed');
let s = E.newGame(); const states = [];
const snap = (g) => ({ board: g.board.map(p => p ? (p.s ? 'b' : 'w') + p.t : null), dirs: Object.fromEntries(g.board.map((p, i) => p && p.t === 'P' ? [(p.s ? 'b' : 'w') + 'P', p.d] : null).filter(Boolean)), home: g.home.map(h => h.map(t => t)) });
states.push(snap(s));
for (const m of hist) { s = E.apply(s, m); states.push(snap(s)); }
// Check the claims the video makes.
const at8 = (() => { let x = E.newGame(); for (let i = 0; i < 8; i++) x = E.apply(x, hist[i]); return x; })();
const rookTargets = E.targets(at8.board, 15).sort((a, b) => a - b);
const at15 = (() => { let x = E.newGame(); for (let i = 0; i < 15; i++) x = E.apply(x, hist[i]); return x; })();
const threat = E.legalMoves({ ...at15, turn: 0 }).filter(m => E.apply({ ...at15, turn: 0 }, m).winner === 0).map(m => m.to);
console.log('ply 9:', JSON.stringify(hist[8]), 'captured', states[9].home[1], '| rook targets at ply 8:', rookTargets, '| white wins by moving to', threat, '| ply 16:', JSON.stringify(hist[15]), '| ply 17:', JSON.stringify(hist[16]));
fs.writeFileSync('game.json', JSON.stringify({ states, rookTargets, threat }));
