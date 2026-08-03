# VIM//QUEST

A tiny, resettable browser dungeon for building Vim muscle memory.

Open [`index.html`](./index.html) in a browser and click the editor. The game accepts a deliberately small Vim grammar: motions, text objects, operators, insert mode, macros, substitution, registers, undo, and dot-repeat.

The intended loop is physical: read the target, keep your hand on the keyboard, make the buffer match, then replay the same spell until it feels boring.

## Run

```sh
open index.html
```

Or serve the repository with any static file server and open `/vim-quest/`.

## Design contract

- Every room has a visible target buffer.
- Hints are optional and reduce the room bonus.
- `RESET` clears the room so a command can be retried immediately.
- The game teaches composition instead of isolated key flashcards.

The emulator is intentionally small; the point is to practice the transferable grammar, then use the same moves in real Vim.
