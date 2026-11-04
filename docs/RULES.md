# Rules

A 4x4 board. Each side has four pieces: a pawn, a rook, a knight and a bishop. White starts at the bottom of the board, Black at the top.

## Goal

Win in either of two ways:

1. **Line.** Put all four of your pieces in one row, column or diagonal.
2. **Wipe-out.** Capture the last enemy piece on the board. Pieces waiting in their home do not save them.

## Spawning

All pieces start in the side's **home**. A piece enters the board by being **spawned** onto an empty square of your own back row: the bottom row for White, the top row for Black.

- Each side's first three turns must be spawns.
- After that, a turn is either a chess move or a spawn from home.
- The fourth piece starts at home too, so it enters by a spawn on a later turn.

## Moving and capturing

Once a piece is on the board it moves by chess rules, anywhere on the board, including onto the enemy side. Moving onto an enemy piece captures it.

- **Rook:** slides along rows and columns.
- **Bishop:** slides along diagonals.
- **Knight:** jumps in an L shape.
- **Pawn:** steps one square forward and captures one square diagonally forward. No double step. White moves up, Black moves down. At the far edge a pawn turns around instead of promoting. A pawn spawned with nowhere to step starts turned around.
- Sliding pieces are blocked by any piece in the way.
- There is no king, no check, no castling and no en passant.

A captured piece goes back to its owner's home and costs them a turn to spawn again.

## Lines that do not count

Your own back row never wins. Without this rule the first player could spawn four in a row in four turns, before the opponent could move. Every other line counts, including the enemy's back row.

## Draws

- The side to move has no legal move, or
- 120 turns have been played in total.

## Computer levels

Beginner, Easy, Medium, Hard and Expert differ in how many turns ahead the computer looks and how often it plays a random move. See `LEVELS` in `src/engine.js` and run `npm run balance` to see how a casual player fares against each.
