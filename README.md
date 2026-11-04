# Chess Tic Tac Toe

A 4x4 board game. Both sides have a pawn, rook, knight and bishop. Spawn pieces on your back row, then move and capture like chess to line up four in a row, or wipe out every enemy piece on the board.

Play it by opening `dist/index.html` in a browser. It is a single self-contained page: against the computer (five levels) or two players on one screen, with Undo, Hint and a warning when your opponent is about to win.

Full rules are in [docs/RULES.md](docs/RULES.md).

## Develop

Needs Node 18 or newer. There are no runtime dependencies.

| Command | What it does |
| --- | --- |
| `npm run build` | Inlines `src/` into `dist/index.html` |
| `npm test` | Rule and computer-opponent tests |
| `npm run e2e` | Builds, then plays the page in a headless browser (needs Playwright) |
| `npm run balance` | Computer-vs-computer games to check balance and tune levels |

## Layout

```
src/engine.js      rules, move generation and the computer opponent (no DOM)
src/ui.js          board, trays, status, undo, hint
src/styles.css     styles
src/index.html     page shell with markers for the three files above
build.js           builds dist/index.html
test/              engine tests and a browser smoke test
tools/balance.js   balance and difficulty simulation
dist/index.html    the built game
```

After changing anything in `src/`, run `npm run build` so `dist/index.html` stays current.
