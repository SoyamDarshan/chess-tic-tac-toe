// Shared by the video page and the sound generator.
(function (root) {
  const T = {
    total: 21.8,
    scenes: { hook: [0, 2.8], spawn: [2.8, 7.0], capture: [7.0, 11.0], threat: [11.0, 15.0], win: [15.0, 18.6], outro: [18.6, 21.8] },
    spawnStart: 3.4, spawnPer: 0.5,        // plies 1-6 land at 3.9, 4.4 ... 6.4
    capture: [8.4, 9.2],                   // ply 9: rook d1 takes the knight on d4
    black: [15.5, 16.0], finish: [16.4, 17.2], // plies 16 and 17
    poster: 18.0
  };
  T.events = [{ t: 0.7, k: 'hit' }, { t: 2.45, k: 'whoosh' }];
  for (let i = 1; i <= 6; i++) T.events.push({ t: +(T.spawnStart + T.spawnPer * i).toFixed(2), k: 'thud' });
  T.events.push({ t: 6.65, k: 'whoosh' }, { t: 8.4, k: 'slide' }, { t: 9.2, k: 'capture' }, { t: 10.65, k: 'whoosh' },
    { t: 11.55, k: 'alert' }, { t: 14.65, k: 'whoosh' }, { t: 16.0, k: 'thud' }, { t: 17.2, k: 'bell' },
    { t: 18.25, k: 'whoosh' }, { t: 18.9, k: 'chime' });
  if (typeof module !== 'undefined') module.exports = T; else root.TL = T;
})(typeof window !== 'undefined' ? window : globalThis);
