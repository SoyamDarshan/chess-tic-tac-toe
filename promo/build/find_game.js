// Searches for a short, real game that shows: spawns, a rook/bishop capture, a threat, then a line win for White.
const E = require('../../src/engine.js');
const fs = require('fs');
function rnd(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }
function playSeeded(seed){
  const r = rnd(seed); const history=[]; let g=E.newGame(); const states=[g];
  const orig=Math.random; Math.random=r;
  while(g.winner===null && !g.draw && g.plies<40){
    const p = g.turn===0 ? {d:3,r:0.15} : {d:1,r:0.5};
    const m=E.chooseMove(g,p.d,p.r); history.push(m); g=E.apply(g,m); states.push(g);
  }
  Math.random=orig; return {history,states,g};
}
const found=[];
for(let seed=1; seed<4000 && found.length<12; seed++){
  const {history,states,g}=playSeeded(seed);
  if(g.winner!==0 || g.winBy!=='line') continue;
  const L=g.plies; if(L<17||L>27) continue;
  // white captures with R or B between ply 7 and L-6
  const caps=[]; states.forEach((s,i)=>{ if(i>=7 && i<=L-6 && s.last && s.last.s===0 && s.last.captured){ const mv=history[i-1]; const pc=states[i].board[mv.to]; if(pc.t==='R'||pc.t==='B') caps.push(i); } });
  if(!caps.length) continue;
  // threat state after ply L-2 must have a winning move for white, black reply (L-1) must not be a capture of white (keep it calm)
  const t=states[L-2]; if(t.turn!==1) continue;
  found.push({seed,L,cap:caps[0],winLine:g.line,lastBlack:history[L-2]});
}
console.log(found.map(f=>JSON.stringify(f)).join('\n'));
fs.writeFileSync('candidates.json',JSON.stringify(found));
