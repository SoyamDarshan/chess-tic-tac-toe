/**
 * Chess Tic Tac Toe: rules engine and computer opponent.
 *
 * Pure functions over an immutable game state, so the UI, the tests and the
 * search all share one implementation. See docs/RULES.md for the rules.
 *
 * Data model
 *   Squares are indexed 0..15, row-major from the top (row = i >> 2, col = i & 3).
 *   Side 0 is White (starts at the bottom, pawns move up). Side 1 is Black.
 *   Piece: { t: 'P'|'R'|'N'|'B', s: side, d: pawn direction (-1 up, +1 down, 0 otherwise) }
 *   Move:  { k: 'drop', t, to }            spawn a piece from home
 *          { k: 'move', from, to }         chess move or capture
 *   State: { board, home, turn, taken, plies, winner, winBy, line, draw, last }
 */
(function (root) {
  'use strict';

  const TYPES = ['P', 'R', 'N', 'B'];
  const PLACEMENT_TURNS = 3; // each side's first turns must be spawns
  const MAX_PLIES = 120; // draw after this many turns in total

  const KNIGHT_STEPS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  // The 10 lines of the board: 4 rows, 4 columns, 2 diagonals.
  const LINES = (function () {
    const lines = [];
    for (let r = 0; r < 4; r++) lines.push([0, 1, 2, 3].map(c => r * 4 + c));
    for (let c = 0; c < 4; c++) lines.push([0, 1, 2, 3].map(r => r * 4 + c));
    lines.push([0, 5, 10, 15], [3, 6, 9, 12]);
    return lines;
  })();

  /** Pieces can only be spawned on the side's own back row: White row 3 (bottom), Black row 0 (top). */
  function isSpawnSquare(side, i) {
    return (i >> 2) === (side === 0 ? 3 : 0);
  }

  // A side's own spawn row never wins. Otherwise the first player could spawn four in a row on turn 4.
  const WIN_LINES = [0, 1].map(side => LINES.filter(line => !line.every(i => isSpawnSquare(side, i))));

  /** Create a piece. A pawn that would have nowhere to step starts turned around. */
  function makePiece(type, side, row, dir) {
    if (type !== 'P') return { t: type, s: side, d: 0 };
    let d = dir || (side === 0 ? -1 : 1);
    if (row + d < 0 || row + d > 3) d = -d;
    return { t: type, s: side, d };
  }

  function newGame() {
    return {
      board: new Array(16).fill(null),
      home: [TYPES.slice(), TYPES.slice()],
      turn: 0,
      taken: [0, 0], // turns each side has played
      plies: 0,
      winner: null,
      winBy: null, // 'line' | 'wipe'
      line: null,
      draw: false,
      last: null
    };
  }

  function inBounds(r, c) {
    return r >= 0 && r < 4 && c >= 0 && c < 4;
  }

  /** Squares the piece on square `i` can move to or capture on. */
  function targets(board, i) {
    const p = board[i];
    const row = i >> 2;
    const col = i & 3;
    const out = [];
    const canLand = (r, c) => {
      const q = board[r * 4 + c];
      return !q || q.s !== p.s;
    };

    if (p.t === 'P') {
      const r = row + p.d;
      if (inBounds(r, col) && !board[r * 4 + col]) out.push(r * 4 + col);
      for (const dc of [-1, 1]) {
        const q = inBounds(r, col + dc) && board[r * 4 + col + dc];
        if (q && q.s !== p.s) out.push(r * 4 + col + dc);
      }
    } else if (p.t === 'N') {
      for (const [dr, dc] of KNIGHT_STEPS) {
        if (inBounds(row + dr, col + dc) && canLand(row + dr, col + dc)) out.push((row + dr) * 4 + col + dc);
      }
    } else {
      for (const [dr, dc] of p.t === 'R' ? ROOK_DIRS : BISHOP_DIRS) {
        let r = row + dr;
        let c = col + dc;
        while (inBounds(r, c)) {
          if (canLand(r, c)) out.push(r * 4 + c);
          if (board[r * 4 + c]) break; // blocked (a capture ends the slide too)
          r += dr;
          c += dc;
        }
      }
    }
    return out;
  }

  /** True while the side to move must still spawn its first pieces. */
  function inPlacement(g) {
    return g.taken[g.turn] < PLACEMENT_TURNS;
  }

  function legalMoves(g) {
    if (g.winner !== null || g.draw) return [];
    const side = g.turn;
    const moves = [];
    for (const t of g.home[side]) {
      for (let i = 0; i < 16; i++) {
        if (!g.board[i] && isSpawnSquare(side, i)) moves.push({ k: 'drop', t, to: i });
      }
    }
    if (!inPlacement(g)) {
      for (let i = 0; i < 16; i++) {
        const p = g.board[i];
        if (p && p.s === side) for (const to of targets(g.board, i)) moves.push({ k: 'move', from: i, to });
      }
    }
    return moves;
  }

  /** Play a move and return the new state. Does not validate the move: use legalMoves. */
  function apply(g, m) {
    const side = g.turn;
    const board = g.board.slice();
    const home = [g.home[0].slice(), g.home[1].slice()];
    let captured = null;

    if (m.k === 'drop') {
      home[side].splice(home[side].indexOf(m.t), 1);
      board[m.to] = makePiece(m.t, side, m.to >> 2);
    } else {
      const piece = board[m.from];
      const victim = board[m.to];
      if (victim) {
        captured = victim.t;
        home[victim.s].push(victim.t);
        home[victim.s].sort((a, b) => TYPES.indexOf(a) - TYPES.indexOf(b));
      }
      board[m.from] = null;
      board[m.to] = piece.t === 'P' ? makePiece('P', side, m.to >> 2, piece.d) : piece;
    }

    const taken = [g.taken[0], g.taken[1]];
    taken[side]++;
    const next = {
      board, home, taken,
      turn: side,
      plies: g.plies + 1,
      winner: null, winBy: null, line: null, draw: false,
      last: { k: m.k, from: m.from === undefined ? null : m.from, to: m.to, s: side, captured }
    };

    const line = WIN_LINES[side].find(l => l.every(i => board[i] && board[i].s === side));
    if (line) {
      next.winner = side;
      next.winBy = 'line';
      next.line = line;
      return next;
    }
    // Wipe-out: capturing the last enemy piece on the board wins at once.
    if (captured && !board.some(p => p && p.s !== side)) {
      next.winner = side;
      next.winBy = 'wipe';
      return next;
    }

    next.turn = 1 - side;
    if (next.plies >= MAX_PLIES || legalMoves(next).length === 0) next.draw = true;
    return next;
  }

  // ---- Computer opponent: negamax with alpha-beta pruning ----

  const WIN_SCORE = 10000;
  const LINE_WEIGHT = [0, 1, 5, 25, 0]; // by how many of your pieces already sit in an open line
  const HOME_PENALTY = 0.7; // pieces waiting in home are worth less than pieces on the board

  /** Static score from the point of view of the side to move. */
  function evaluate(g) {
    const me = g.turn;
    const openLineScore = (side) => {
      let score = 0;
      for (const line of WIN_LINES[side]) {
        let mine = 0;
        let theirs = 0;
        for (const i of line) {
          const p = g.board[i];
          if (p) { if (p.s === side) mine++; else theirs++; }
        }
        if (theirs === 0) score += LINE_WEIGHT[mine];
      }
      return score;
    };
    return openLineScore(me) - openLineScore(1 - me)
      - HOME_PENALTY * g.home[me].length + HOME_PENALTY * g.home[1 - me].length;
  }

  function negamax(g, depth, alpha, beta) {
    if (g.winner !== null) return -(WIN_SCORE + depth); // the side to move has just lost; sooner is worse
    if (g.draw) return 0;
    if (depth === 0) return evaluate(g);
    let best = -Infinity;
    for (const m of legalMoves(g)) {
      const v = -negamax(apply(g, m), depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  /**
   * Pick a move for the side to move.
   * @param depth how many turns ahead to look
   * @param randomness chance (0..1) of playing a random legal move instead, used for the easy levels
   */
  function chooseMove(g, depth, randomness) {
    const moves = legalMoves(g);
    if (!moves.length) return null;
    if (randomness && Math.random() < randomness) return moves[Math.floor(Math.random() * moves.length)];

    let best = -Infinity;
    let pool = [];
    for (const m of moves) {
      const next = apply(g, m);
      const v = next.winner !== null ? WIN_SCORE + depth : -negamax(next, depth - 1, -Infinity, -(best - 0.001));
      if (v > best + 1e-9) { best = v; pool = [m]; }
      else if (Math.abs(v - best) <= 1e-9) pool.push(m);
    }
    return pool[Math.floor(Math.random() * pool.length)]; // break ties randomly so games vary
  }

  /** Computer levels: search depth plus how often it plays a random move. Tuned with tools/balance.js. */
  const LEVELS = {
    beginner: { depth: 1, randomness: 0.7 },
    easy: { depth: 1, randomness: 0.35 },
    medium: { depth: 2, randomness: 0.15 },
    hard: { depth: 3, randomness: 0 },
    expert: { depth: 5, randomness: 0 }
  };

  const api = {
    TYPES, PLACEMENT_TURNS, MAX_PLIES, LEVELS,
    newGame, legalMoves, apply, targets, inPlacement, chooseMove, makePiece, isSpawnSquare
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CTT = api;
})(typeof window !== 'undefined' ? window : globalThis);
