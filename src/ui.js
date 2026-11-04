(function () {
  var G = window.CTT;
  var GLYPH = { P: '♟︎', R: '♜︎', N: '♞︎', B: '♝︎' };
  var NAME = { P: 'pawn', R: 'rook', N: 'knight', B: 'bishop' };
  var SIDE = ['White', 'Black'];
  var LEVELS = G.LEVELS;

  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $('board'), statusEl = $('status');
  var trayEl = [$('tray0'), $('tray1')];
  var hist = [], hint = null, hintText = '';
  var g, mode = 'ai', level = 'easy', sel = null, thinking = false, token = 0, sqEls = [];

  function coord(i) { return 'abcd'[i & 3] + (4 - (i >> 2)); }

  for (var i = 0; i < 16; i++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sq' + ((((i >> 2) + (i & 3)) % 2) ? ' dk' : '');
    b.dataset.i = i;
    b.addEventListener('click', onSquare);
    boardEl.appendChild(b);
    sqEls.push(b);
  }

  function pieceEl(t, s, d) {
    var f = document.createDocumentFragment();
    var p = document.createElement('span');
    p.className = 'piece ' + (s === 0 ? 'w' : 'b');
    p.textContent = GLYPH[t];
    f.appendChild(p);
    if (t === 'P') {
      var a = document.createElement('i');
      a.className = 'dir ' + (d < 0 ? 'up' : 'down');
      f.appendChild(a);
    }
    return f;
  }

  function aiSide() { return mode === 'ai' ? 1 : -1; }
  function humanTurn() { return g.winner === null && !g.draw && !thinking && g.turn !== aiSide(); }

  function threats() {
    var out = { sq: {}, list: [], wipe: [] };
    if (g.winner !== null || g.draw || thinking || !humanTurn()) return out;
    var gt = Object.assign({}, g, { turn: 1 - g.turn });
    G.legalMoves(gt).forEach(function (m) {
      var r = G.apply(gt, m);
      if (r.winner === null) return;
      out.sq[m.to] = true;
      var arr = r.winBy === 'wipe' ? out.wipe : out.list;
      if (arr.indexOf(m.to) < 0) arr.push(m.to);
    });
    return out;
  }

  function currentMoves() {
    if (!sel || !humanTurn()) return [];
    return G.legalMoves(g).filter(function (m) {
      return sel.kind === 'home' ? (m.k === 'drop' && m.t === sel.t) : (m.k === 'move' && m.from === sel.i);
    });
  }

  function render() {
    var moves = currentMoves();
    var th = threats();
    var tmap = {};
    moves.forEach(function (m) { tmap[m.to] = m; });
    var over = g.winner !== null || g.draw;
    for (var i = 0; i < 16; i++) {
      var el = sqEls[i], p = g.board[i];
      var cls = 'sq' + ((((i >> 2) + (i & 3)) % 2) ? ' dk' : '');
      if ((i >> 2) === 3) cls += ' start-w';
      if ((i >> 2) === 0) cls += ' start-b';
      if (g.line && g.line.indexOf(i) >= 0) cls += ' win';
      if (!over && g.last && (g.last.to === i || g.last.from === i)) cls += ' last';
      if (sel && sel.kind === 'board' && sel.i === i && !over) cls += ' sel';
      if (tmap[i]) cls += ' target' + (p ? ' cap' : '');
      if (th.sq[i]) cls += ' threat';
      if (hint && !over && (hint.to === i || hint.from === i)) cls += ' hint';
      if (p && p.s === g.turn && humanTurn() && !G.inPlacement(g)) cls += ' own';
      el.className = cls;
      el.textContent = '';
      var c = document.createElement('span');
      c.className = 'coord'; c.textContent = coord(i);
      el.appendChild(c);
      if (p) el.appendChild(pieceEl(p.t, p.s, p.d));
      el.setAttribute('aria-label', coord(i) + (p ? ', ' + SIDE[p.s] + ' ' + NAME[p.t] : ', empty') + (tmap[i] ? ', move here' : ''));
    }
    for (var s = 0; s < 2; s++) renderTray(s, over);
    renderStatus(over, th);
    $('undo').disabled = !hist.length;
    $('hint').disabled = !humanTurn();
  }

  function renderTray(s, over) {
    var el = trayEl[s];
    var active = !over && g.turn === s;
    el.className = 'tray' + (active ? ' active' : '');
    el.textContent = '';
    var label = document.createElement('div');
    label.className = 'who';
    var dot = document.createElement('span');
    dot.className = 'dot' + (s ? ' b' : '');
    label.appendChild(dot);
    label.appendChild(document.createTextNode(s === 1 && mode === 'ai' ? 'Computer' : SIDE[s]));
    el.appendChild(label);
    var wrap = document.createElement('div');
    wrap.className = 'pieces';
    var canPick = active && humanTurn();
    if (!g.home[s].length) {
      var n = document.createElement('span');
      n.className = 'none'; n.textContent = 'Home is empty';
      wrap.appendChild(n);
    }
    g.home[s].forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (canPick ? ' can' : '');
      b.disabled = !canPick;
      var on = sel && sel.kind === 'home' && sel.t === t && active;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', SIDE[s] + ' ' + NAME[t] + ' in home' + (canPick ? ', place on board' : ''));
      b.appendChild(pieceEl(t, s, s === 0 ? -1 : 1));
      b.addEventListener('click', function () {
        hint = null;
        sel = on ? null : { kind: 'home', t: t };
        render();
      });
      wrap.appendChild(b);
    });
    el.appendChild(wrap);
  }

  function renderStatus(over, th) {
    var head, sub = '';
    statusEl.className = over ? 'over' : '';
    if (g.winner !== null) {
      head = (mode === 'ai' ? (g.winner === 0 ? 'You win' : 'Computer wins') : SIDE[g.winner] + ' wins') + (g.winBy === 'wipe' ? ': every enemy piece captured' : ': four in a row');
      sub = 'Press New game to play again.';
    } else if (g.draw) {
      head = 'Draw';
      sub = g.plies >= G.MAX_PLIES ? 'Turn limit reached.' : SIDE[g.turn] + ' has no legal move.';
    } else if (thinking) {
      head = 'Computer is thinking…';
    } else {
      var s = g.turn;
      var lead = mode === 'ai' ? (s === 0 ? 'Your turn' : 'Computer') : SIDE[s] + ' to play';
      if (G.inPlacement(g)) {
        head = lead + ': place a piece (' + (g.taken[s] + 1) + ' of ' + G.PLACEMENT_TURNS + ')';
        sub = 'Pick a piece from home, then an empty square on your start row (the ' + (s === 0 ? 'bottom' : 'top') + ' row).';
      } else {
        head = lead + ': move a piece' + (g.home[s].length ? ' or spawn one' : '');
        sub = g.home[s].length ? 'Tap a piece to move it, or one in home to spawn it on your start row.' : 'Tap one of your pieces on the board.';
      }
      if (g.last && g.last.captured) sub = SIDE[g.last.s] + ' captured a ' + NAME[g.last.captured] + '. ' + sub;
    }
    statusEl.innerHTML = '';
    var b = document.createElement('b'); b.textContent = head;
    statusEl.appendChild(b);
    if (hint && hintText && !over) sub = hintText;
    if (sub) { var sp = document.createElement('span'); sp.textContent = sub; statusEl.appendChild(sp); }
    if (th && th.list.length) {
      var tt = document.createElement('span');
      tt.className = 'threat';
      tt.textContent = 'Threat: ' + SIDE[1 - g.turn] + ' can complete a line on ' + th.list.map(coord).join(', ') + '. Block it or capture a piece in the line.';
      statusEl.appendChild(tt);
    }
    if (th && th.wipe.length) {
      var tw = document.createElement('span');
      tw.className = 'threat';
      tw.textContent = 'Threat: ' + SIDE[1 - g.turn] + ' can capture your last piece on the board (' + th.wipe.map(coord).join(', ') + '). Spawn another piece or move it to safety.';
      statusEl.appendChild(tw);
    }
  }

  function onSquare(e) {
    var i = +e.currentTarget.dataset.i;
    if (!humanTurn()) return;
    var m = currentMoves().filter(function (x) { return x.to === i; })[0];
    if (m) { play(m); return; }
    hint = null;
    var p = g.board[i];
    if (p && p.s === g.turn && !G.inPlacement(g)) {
      sel = (sel && sel.kind === 'board' && sel.i === i) ? null : { kind: 'board', i: i };
    } else sel = null;
    render();
  }

  function play(m) {
    hist.push(g);
    hint = null;
    g = G.apply(g, m);
    sel = null;
    render();
    maybeAI();
  }

  function maybeAI() {
    if (g.winner !== null || g.draw || g.turn !== aiSide()) return;
    thinking = true;
    var my = ++token;
    render();
    setTimeout(function () {
      if (my !== token) return;
      var L = LEVELS[level];
      var m = G.chooseMove(g, L.depth, L.randomness);
      thinking = false;
      if (m) { hist.push(g); g = G.apply(g, m); }
      render();
    }, 450);
  }

  function reset() {
    hist = []; hint = null; hintText = '';
    token++;
    thinking = false;
    sel = null;
    g = G.newGame();
    render();
  }

  function setMode(m) {
    mode = m;
    $('mode-ai').setAttribute('aria-pressed', m === 'ai');
    $('mode-2p').setAttribute('aria-pressed', m === '2p');
    $('level').hidden = m !== 'ai';
    reset();
  }

  $('mode-ai').addEventListener('click', function () { setMode('ai'); });
  $('mode-2p').addEventListener('click', function () { setMode('2p'); });
  $('level').addEventListener('change', function (e) { level = e.target.value; });
  $('new').addEventListener('click', reset);
  $('undo').addEventListener('click', function () {
    if (!hist.length) return;
    token++; thinking = false; hint = null; sel = null;
    g = hist.pop();
    while (mode === 'ai' && g.turn !== 0 && hist.length) g = hist.pop();
    render();
  });
  $('hint').addEventListener('click', function () {
    if (!humanTurn()) return;
    var m = G.chooseMove(g, 3, 0);
    if (!m) return;
    hint = m;
    if (m.k === 'drop') { sel = { kind: 'home', t: m.t }; hintText = 'Hint: spawn the ' + NAME[m.t] + ' on ' + coord(m.to) + '.'; }
    else { sel = { kind: 'board', i: m.from }; hintText = 'Hint: move the ' + NAME[g.board[m.from].t] + ' from ' + coord(m.from) + ' to ' + coord(m.to) + '.'; }
    render();
  });

  // Test hook used by test/e2e.js.
  window.__ctt = { get g() { return g; }, setG: function (x) { g = x; sel = null; hint = null; render(); } };
  reset();
})();
