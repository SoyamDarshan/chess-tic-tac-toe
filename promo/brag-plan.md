# Launch video plan: Chess Tic Tac Toe

**What it is:** a 4x4 board game. Both sides have a pawn, rook, knight and bishop. Spawn on your back row, then move and capture like chess. Win with four in a row or by capturing every enemy piece on the board.
**Who it is for:** anyone who likes quick board games; people who like chess but want a faster game.
**Angle:** "Tic tac toe, with chess pieces." Show the real game, no abstract filler.
**Tone:** default (plain, direct). **Format:** landscape 1920x1080, 30 fps, 21.8 s.

## What is shown is real
One real game (17 turns) replayed with the project's own engine, so every move is legal. It was picked from simulated computer-vs-computer games because it has a full-column rook capture, a threat and a diagonal win. The status card text is copied from the game's own interface.

## Visual identity (from src/styles.css)
Background #12161b, panel #1b222a, line #2b3541, ink #e9eef3, muted #93a0ae, light square #c6d1db, dark square #6e8296, accent #f2b84b, win #4fd1a1, threat #ff6b6b. Fonts: Unbounded (headings), Instrument Sans (body).

## Storyboard
| Time | Scene | On screen |
| --- | --- | --- |
| 0.0-2.8 | Hook | "Tic tac toe, with chess pieces." |
| 2.8-7.0 | Spawn | Six spawns on the back rows. "Spawn on your back row." |
| 7.0-11.0 | Capture | Rook d1 selected, slides the full column and takes the knight, which goes home. "Move like chess. Capture anywhere." |
| 11.0-15.0 | Threat | b2 outlined red, status card shows the threat. "It warns you before you lose." |
| 15.0-18.6 | Win | Black spawns a rook; White bishop c1 to b2 completes the diagonal. "Four in a row wins." |
| 18.6-21.8 | Outro | Title, "Five computer levels · Undo · Hints", "Plays in your browser" |

## Sound plan
Am F C G at 100 bpm: soft pad, plucked bass, light arp from 2.8 s. Kick and hat from 6.9 s to 18.6 s. Effects on screen events: whoosh before each cut, wooden thud per spawn, slide and impact on the capture, three-note warning on the threat, bell arpeggio on the win, chime on the title. Light stereo echo, fades, loudness normalised to about -16 LUFS.

## Files
`brag.mp4`, `brag.jpg` (poster, also frame 0), `share-copy.txt`, this plan. The scripts that regenerate the video are in `build/`; see README.md.
