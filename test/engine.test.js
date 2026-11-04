'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');

const WHITE = 0;
const BLACK = 1;
const byNumber = (a, b) => a - b;

/** An empty board where both sides have already finished their placement turns and have nothing at home. */
function emptyGame() {
  const g = E.newGame();
  g.taken = [E.PLACEMENT_TURNS, E.PLACEMENT_TURNS];
  g.home = [[], []];
  return g;
}

/** Put pieces on a copy of the game: place(g, { 5: ['R', WHITE], 9: ['N', BLACK] }). */
function place(g, pieces) {
  const out = { ...g, board: g.board.slice() };
  for (const [sq, [type, side]] of Object.entries(pieces)) out.board[+sq] = E.makePiece(type, side, sq >> 2);
  return out;
}

const spawn = (type, to) => ({ k: 'drop', t: type, to });
const move = (from, to) => ({ k: 'move', from, to });
const row = (i) => i >> 2;

/** Can `side` win with a single move from this position (it must be their turn)? */
function canWinNow(g) {
  return E.legalMoves(g).some(m => E.apply(g, m).winner === g.turn);
}

describe('spawning', () => {
  it('lets White spawn any piece on the bottom row only', () => {
    const moves = E.legalMoves(E.newGame());
    assert.equal(moves.length, 16); // 4 pieces x 4 squares
    assert.ok(moves.every(m => m.k === 'drop' && row(m.to) === 3));
  });

  it('lets Black spawn on the top row only', () => {
    const g = E.apply(E.newGame(), spawn('P', 12));
    const moves = E.legalMoves(g);
    assert.equal(moves.length, 16);
    assert.ok(moves.every(m => row(m.to) === 0));
  });

  it('forces three spawns per side, then allows moves or another spawn on the back row', () => {
    let g = E.newGame();
    for (const [type, to] of [['P', 12], ['P', 0], ['R', 13], ['R', 1], ['N', 14], ['N', 2]]) g = E.apply(g, spawn(type, to));
    assert.deepEqual(g.taken, [3, 3]);
    assert.equal(g.turn, WHITE);

    const moves = E.legalMoves(g);
    assert.ok(moves.some(m => m.k === 'move'));
    assert.ok(moves.some(m => m.k === 'drop' && m.t === 'B' && m.to === 15));
    assert.ok(!moves.some(m => m.k === 'drop' && row(m.to) !== 3));
    assert.ok(!moves.some(m => m.k === 'drop' && m.t === 'P')); // the pawn is already on the board
  });
});

describe('piece movement', () => {
  it('rook slides, is blocked by its own pieces and captures enemies', () => {
    const g = place(emptyGame(), { 5: ['R', WHITE], 6: ['P', WHITE], 9: ['N', BLACK] });
    assert.deepEqual(E.targets(g.board, 5).sort(byNumber), [1, 4, 9]);
  });

  it('bishop slides diagonally', () => {
    const g = place(emptyGame(), { 5: ['B', WHITE] });
    assert.deepEqual(E.targets(g.board, 5).sort(byNumber), [0, 2, 8, 10, 15]);
  });

  it('knight jumps', () => {
    const g = place(emptyGame(), { 0: ['N', WHITE] });
    assert.deepEqual(E.targets(g.board, 0).sort(byNumber), [6, 9]);
  });

  it('pawn steps forward, captures only diagonally and is blocked head-on', () => {
    const open = place(emptyGame(), { 9: ['P', WHITE] });
    assert.deepEqual(E.targets(open.board, 9), [5]);

    const g = place(emptyGame(), { 9: ['P', WHITE], 5: ['N', BLACK], 4: ['R', BLACK], 6: ['B', WHITE] });
    assert.deepEqual(E.targets(g.board, 9), [4]);
  });

  it('black pawn moves down the board', () => {
    const g = place(emptyGame(), { 1: ['P', BLACK] });
    assert.deepEqual(E.targets(g.board, 1), [5]);
  });

  it('pawn turns around when it reaches the far edge', () => {
    const g = place(emptyGame(), { 5: ['P', WHITE], 15: ['R', BLACK] });
    assert.equal(E.apply(g, move(5, 1)).board[1].d, 1);
  });

  it('a pawn spawned with nowhere to step starts turned around', () => {
    assert.equal(E.apply(emptyGame(), spawn('P', 2)).board[2].d, 1);
  });

  it('pieces can travel to the enemy side and capture there', () => {
    const g = place(emptyGame(), { 12: ['R', WHITE], 0: ['N', BLACK] });
    assert.deepEqual(E.targets(g.board, 12).sort(byNumber), [0, 4, 8, 13, 14, 15]);
    const after = E.apply(g, move(12, 0));
    assert.equal(after.board[0].s, WHITE);
  });

  it('a captured piece goes to its owner\'s home, in piece order', () => {
    let g = { ...emptyGame(), home: [[], ['N', 'B']] };
    g = place(g, { 0: ['R', WHITE], 3: ['P', BLACK] });
    const after = E.apply(g, move(0, 3));
    assert.deepEqual(after.home[BLACK], ['P', 'N', 'B']);
    assert.equal(after.last.captured, 'P');
  });
});

describe('winning', () => {
  /** Four pieces of `side` on `cells`; the last one is spawned to complete the line. */
  function completesLine(cells, side = WHITE) {
    let g = emptyGame();
    g.turn = side;
    g.home[side] = ['B'];
    g = place(g, Object.fromEntries(cells.slice(0, 3).map((sq, k) => [sq, [['P', 'R', 'N'][k], side]])));
    return E.apply(g, spawn('B', cells[3]));
  }

  it('does not count your own spawn row', () => {
    assert.equal(completesLine([12, 13, 14, 15]).winner, null);
    assert.equal(completesLine([0, 1, 2, 3], BLACK).winner, null);
  });

  it('counts middle rows, the enemy back row, columns and diagonals', () => {
    for (const cells of [[8, 9, 10, 11], [4, 5, 6, 7], [0, 1, 2, 3], [3, 7, 11, 15], [0, 5, 10, 15]]) {
      const after = completesLine(cells);
      assert.equal(after.winner, WHITE, `line ${cells}`);
      assert.equal(after.winBy, 'line');
      assert.deepEqual(after.line, cells);
    }
    assert.equal(completesLine([12, 13, 14, 15], BLACK).winner, BLACK);
  });

  it('is blocked by an enemy piece in the line', () => {
    const g = { ...place(emptyGame(), { 3: ['P', WHITE], 7: ['R', WHITE], 11: ['N', BLACK] }), home: [['B'], []] };
    assert.equal(E.apply(g, spawn('B', 15)).winner, null);
  });

  it('ends the game: no moves are legal afterwards', () => {
    assert.deepEqual(E.legalMoves(completesLine([8, 9, 10, 11])), []);
  });

  it('wins at once by capturing the last enemy piece on the board', () => {
    const g = { ...place(emptyGame(), { 12: ['R', WHITE], 0: ['B', BLACK] }), home: [[], ['P', 'R', 'N']] };
    const after = E.apply(g, move(12, 0));
    assert.equal(after.winner, WHITE);
    assert.equal(after.winBy, 'wipe');
    assert.equal(after.line, null);
  });

  it('does not wipe out while another enemy piece remains', () => {
    const g = place(emptyGame(), { 12: ['R', WHITE], 0: ['B', BLACK], 7: ['N', BLACK] });
    assert.equal(E.apply(g, move(12, 0)).winner, null);
  });

  it('does not treat an empty board at the start as a wipe-out', () => {
    assert.equal(E.apply(E.newGame(), spawn('P', 12)).winner, null);
  });
});

describe('computer opponent', () => {
  it('takes an immediate win (black rook 13 to 12 completes column 0)', () => {
    let g = emptyGame();
    g.turn = BLACK;
    g = place(g, {
      0: ['P', BLACK], 4: ['B', BLACK], 8: ['N', BLACK], 13: ['R', BLACK],
      3: ['P', WHITE], 7: ['R', WHITE], 2: ['B', WHITE], 1: ['N', WHITE]
    });
    assert.equal(E.apply(g, E.chooseMove(g, 3)).winner, BLACK);
  });

  it('blocks an immediate loss', () => {
    let g = emptyGame();
    g.turn = BLACK;
    g = place(g, {
      3: ['N', WHITE], 7: ['B', WHITE], 11: ['P', WHITE], 12: ['R', WHITE], // rook 12 to 15 would win column 3
      4: ['N', BLACK], 0: ['P', BLACK], 1: ['R', BLACK], 2: ['B', BLACK]
    });
    assert.ok(canWinNow({ ...g, turn: WHITE }), 'setup: White threatens to win');
    const after = E.apply(g, E.chooseMove(g, 2));
    assert.ok(!canWinNow(after), 'Black left White a winning move');
  });

  it('answers quickly at the strongest level', () => {
    let g = E.newGame();
    for (const [type, to] of [['P', 13], ['P', 1], ['R', 14], ['R', 2], ['N', 15], ['N', 3]]) g = E.apply(g, spawn(type, to));
    const start = Date.now();
    assert.ok(E.chooseMove(g, 5));
    assert.ok(Date.now() - start < 3000);
  });
});

describe('invariants', () => {
  it('random games keep four pieces per side, spawn only on the back row, and always finish', () => {
    for (let game = 0; game < 200; game++) {
      let g = E.newGame();
      let turns = 0;
      while (g.winner === null && !g.draw) {
        const moves = E.legalMoves(g);
        const m = moves[Math.floor(Math.random() * moves.length)];
        if (m.k === 'drop') assert.ok(E.isSpawnSquare(g.turn, m.to));
        g = E.apply(g, m);
        for (const side of [WHITE, BLACK]) {
          const onBoard = g.board.filter(p => p && p.s === side).length;
          assert.equal(onBoard + g.home[side].length, 4);
        }
        assert.ok(++turns <= E.MAX_PLIES);
      }
    }
  });
});
