# Hoodie Poster Production Process

## Goal

Create a hoodie back graphic for "Goodbye, BOJ" around the Jank character.

The final direction is not a dense poster collage. It is a clean apparel graphic:

- sparse title
- pale mint block
- centered Jank bust
- one segment-tree icon
- one DP-table icon
- enough negative space for hoodie back printing

## Final Recommended Files

- `../final/jank-hoodie-back-goodbye-boj-fixed-icon-balance.png`
  - Main flat PNG.
  - Size: 2048 x 3072.
  - Current recommended design.

- `../final/jank-hoodie-back-goodbye-boj-fixed-icon-balance-transparent.png`
  - Transparent print PNG.
  - Use this for actual hoodie printing when the garment color should show through the paper-white background.

- `../final/jank-hoodie-back-goodbye-boj-fixed-icon-balance-mockup.png`
  - Hoodie placement preview.
  - Use this only for review, not production.

## Character Definition

The poster character is Jank / 짱크.

Core traits:

- Head shape: rounded block head, like a LEGO minifigure head rather than a sharp anime protagonist.
- Hair: dense black wavy mushroom-cap hair, with a heavy rounded top silhouette.
- Glasses: thick black horn-rim glasses. This is one of the most important identity marks.
- Face: sleepy half-lidded eyes, soft cheeks, small deadpan mouth.
- Body: soft, full, padded feeling. Avoid skinny/heroic anatomy.
- Clothing: heather-gray hoodie as the main identity. Gray sweats are acceptable in full-body versions.
- Mood: tired, awkward, deadpan, quietly funny.

Rejected character drift:

- too handsome
- too generic anime
- crying chibi expression as the main identity
- black jacket/backpack/lab coat/school-uniform styling

## Research And Design Principles

Hoodie-back graphics should read from distance and survive print scale.

Principles used:

- Use a large centered graphic under the hood, because the back panel is the largest uninterrupted hoodie surface.
- Keep important content inside a safe visual area so printer shift or crop does not damage the design.
- Let negative space do work. A hoodie graphic does not need to fill the whole garment.
- Prefer one dominant read over many tiny story objects.
- Avoid small details that collapse into visual noise when printed.
- Use limited color: black ink, gray hoodie tones, pale mint block, and small green accents.

Reference direction:

- The user-provided shirt reference became the main layout model:
  - small title above
  - pale green rectangle
  - centered anime bust
  - simple black ink
  - minimal accent marks

## Process Timeline

### 1. Early Poster Direction

Initial versions were poster-like and busy:

- clouds
- laptops
- papers
- keyboards
- accepted checks
- dense BOJ/PS storytelling

These versions communicated the story, but they were not good hoodie graphics. They looked like a busy illustrated poster rather than a clean back print.

Representative files:

- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-final.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-mockup.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-textless-base.png`

Decision:

- Keep as process artifacts only.
- Do not treat these as final.

### 2. Clean Iconic Revision

The user asked for a cleaner design like the uploaded shirt example.

The design was reduced to:

- `Goodbye, BOJ` title
- one mint block
- centered Jank bust
- one segment-tree symbol
- one DP-table symbol

Representative files:

- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-clean-final.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-clean-print-transparent.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-clean-mockup.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-clean-textless-base.png`

Decision:

- Good layout direction.
- Icons were too plain and needed stronger PS identity.

### 3. Image-Generated Title And Algorithm Icons

The title was rendered through image generation as requested.

Representative files:

- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-clean-algorithm-final.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-clean-algorithm-transparent.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-clean-algorithm-mockup.png`

What improved:

- The title was rendered as `Goodbye, BOJ`.
- Segment tree and DP became more visible.

Problem:

- The icons were still not structurally reliable.
- The DP table could read as a generic calendar.
- Some algorithm detail lacked correct representation.

Decision:

- Keep as process artifact.
- Not final.

### 4. Deterministic Icon Redraw Attempt

The segment tree and DP icons were redrawn manually with deterministic geometry.

Representative files:

- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-hoodie-design-fixed-icons.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-hoodie-design-fixed-icons-transparent.png`
- `../process/goodbye-boj/jank-hoodie-back-goodbye-boj-hoodie-design-fixed-icons-mockup.png`

What improved:

- Segment tree was structurally correct.
- DP table had base row/column, states, arrows, and a transition path.

Problem:

- The icons became too detailed for the clean apparel style.
- Tiny labels and dense strokes collapsed at hoodie scale.
- The icons did not harmonize with the rest of the simple composition.

Decision:

- Keep as process artifact.
- Not final.

### 5. Final Icon Balance Revision

The icons were simplified again, but with stronger silhouette:

- Segment tree: bold seven-node tree, no labels, no numbers.
- DP table: bold grid, diagonal arrow, green accent.
- Both icons have similar scale and visual weight.
- No tiny labels or cramped marks.

Final files:

- `../final/jank-hoodie-back-goodbye-boj-fixed-icon-balance.png`
- `../final/jank-hoodie-back-goodbye-boj-fixed-icon-balance-transparent.png`
- `../final/jank-hoodie-back-goodbye-boj-fixed-icon-balance-mockup.png`

Decision:

- Current recommended final.

## Text Policy

The final title is:

```text
Goodbye, BOJ
```

Earlier manual-text variants used:

- `GOODBYE, BOJ`
- `수고했어, 1년`
- `WA -> AC`
- `SEG TREE`
- `DP`

These were removed from the final clean direction because they made the design feel too explanatory or busy.

## Algorithm Motif Policy

Segment tree should read as:

- one root
- two children
- four leaves
- thick clean connection lines
- no labels at final hoodie scale

DP table should read as:

- grid
- a few emphasized cells
- diagonal or transition arrow
- no labels at final hoodie scale

Avoid:

- tiny interval labels
- code snippets
- random numbers
- fake pseudo-code
- icons so small that they collapse into texture

## Final Commit Scope Recommendation

For a clean commit focused on the hoodie poster, include:

- `index.html`
- `jank-poster/README.md`
- `jank-poster/index.html`
- `jank-poster/character-development/evaluation.md`
- `jank-poster/character-development/uploaded-character-analysis.md`
- `jank-poster/character-development/poster-process.md`
- `jank-poster/character-development/19-uploaded-reference-character-base.png`
- `jank-poster/final/jank-hoodie-back-goodbye-boj-fixed-icon-balance.png`
- `jank-poster/final/jank-hoodie-back-goodbye-boj-fixed-icon-balance-transparent.png`
- `jank-poster/final/jank-hoodie-back-goodbye-boj-fixed-icon-balance-mockup.png`

Optional process artifacts to include if the commit should preserve the full visual development trail:

- `jank-poster/process/goodbye-boj/`
- `jank-poster/process/earlier-posters/`
- `jank-poster/generated-output/imagegen/`

Do not include unrelated lecture-note changes in the hoodie-poster commit unless the commit intentionally covers those separate files.
