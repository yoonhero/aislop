# Character Development Evaluation

## Policy

- Text is not generated inside concept images.
- Korean headline text such as "아오,짱크" should be added later with a local font layer.
- Skeleton guides are used only to lock pose and composition.
- If skeleton or construction marks leak into generated art, keep that file as a process check, then create a clean version.
- To avoid an AI-generated look, prefer imperfect line variation, paper texture, restrained detail, and clear silhouette over glossy rendering.

## Jank

### 00-jank-six-seven-skeleton-guide.png

- Purpose: pose guide for the central Jank character.
- Pass: body placement, left 6 gesture, right angular 7 guide, full-body proportion.
- Risk: the right 7 guide needs strong prompt wording because models tend to turn it into a peace sign.

### 04-jank-skeleton-guided-overpaint-v1.png

- Purpose: first image generated from the skeleton.
- Pass: character design, hoodie, glasses, teary expression, left 6 hand, overall poster-ready silhouette.
- Fail: blue/red skeleton marks and black body axis remained visible.
- Decision: saved as a process artifact, not a final character base.

### 05-jank-skeleton-guided-clean.png

- Purpose: cleaned Jank character base for later poster work.
- Pass: no text, no visible guide lines, gray hoodie, black glasses, sad-comedy expression, hand-drawn texture.
- Partial: right hand reads closer to a finger-gun/angular gesture than a perfect number 7.
- Decision: usable as the current Jank base, but the right hand should be checked again before final poster production.

## Gemini

### 00-gemini-shout-skeleton-guide.png

- Purpose: pose guide for the upper-right shouting mascot.
- Pass: both hands cupped around mouth, open-mouth shout direction, star hairpin placement, chibi proportions.
- Risk: the sound cone should not be rendered as a permanent graphic unless the poster composition needs it.

### 01-gemini-skeleton-guided-clean.png

- Purpose: cleaned Gemini mascot base for later poster work.
- Pass: no text, no visible skeleton guide, hands cupped around mouth, open shouting expression, blue/cyan Gemini-like mascot identity, star hairpins.
- Partial: rendering is slightly smoother than ideal; later poster pass should add more hand-drawn line variation and texture.
- Decision: usable as the current Gemini base.

## Poster Implications

- Build the poster from the clean character bases, not directly from the guide images.
- Keep the speech bubble empty during image generation.
- Add "아오,짱크" after generation with a local Korean font and inspect it manually.
- Before final output, check: text spelling, no stray pseudo-text, Jank right-hand readability, Gemini shout direction, and no visible construction marks.

## Reference Style Pass

### 06-jank-reference-style-v1.png

- Purpose: apply the new reference images to Jank's character direction.
- Pass: flatter cel shading, stronger wide stance, white coat over gray hoodie, simpler music-video-like character readability.
- Partial: right hand still reads closer to a V/peace sign than a strict angular 7.
- Decision: strong style reference, but not final pose reference.

### 02-gemini-reference-style-v1.png

- Purpose: apply the new reference images to the Gemini shouting mascot.
- Pass: hands cupped around mouth, open shout, blue/cyan mascot identity, star hairpins, flatter reference-like styling, no text.
- Partial: still slightly polished; poster pass should add rougher line texture and bolder graphic edges.
- Decision: current preferred Gemini character base.

## Text QA Loop

- Generate no text in character or poster base art.
- If an image contains pseudo-text, random numbers, or malformed Korean, reject it for final use.
- Add "아오,짱크" only after generation as an editable overlay.
- Inspect the final text for exact spelling: 아 오 comma 짱 크, with the comma between 오 and 짱.

## No-Labcoat Final Pass

### 00-jank-six-seven-skeleton-guide-v3-textless.png

- Purpose: textless pose guide used to avoid prompt leakage from guide labels.
- Pass: no readable guide text, left 6 guide, right 7/L guide, hoodie-only torso block.

### 07-jank-no-labcoat-pose-candidate-a.png

- Purpose: first no-labcoat Jank candidate.
- Fail: white coat remained, so it is rejected for final use.

### 08-jank-no-labcoat-pose-candidate-b.png

- Purpose: selected no-labcoat Jank candidate.
- Pass: gray hoodie only, black glasses, fluffy hair, teary comedy expression, left 6 pose.
- Partial: right hand reads as a meme-style 7/L gesture, not a perfect diagrammatic 7.

### 11-poster-base-no-text-candidate-c-no-coats.png

- Purpose: selected poster base before manual lettering.
- Pass: no visible lab coat or white coat on either character, blank speech bubble, Jank centered, Gemini upper-right shouting, no generated text.
- Partial: Jank right hand is acceptable as a 7/L meme pose but should be called out as the weakest remaining detail.

### jank-hoodie-back-poster-final.png

- Purpose: final hoodie-back poster with manual Korean text overlay.
- Pass: final text is exactly "아오,짱크"; comma is between 오 and 짱; no generated pseudo-text was used for the headline.
- Pass: poster is vertical, hoodie-back oriented, uses flat anime/poster energy, and keeps the no-labcoat rule.
- Decision: final output for this pass.

## SD Cute Pass

### 12-sd-poster-base-candidate-a.png

- Purpose: first smaller, cuter poster base.
- Pass: much simpler chibi proportion, no lab coat, blank bubble, flatter mint poster field.
- Partial: Jank's right hand reads as a V sign rather than a strict 7/L.

### 13-sd-poster-base-candidate-b-selected.png

- Purpose: selected SD/chibi poster base.
- Pass: smaller and cuter character proportions, less detail, no lab coat, no generated text, Gemini shouting in the upper-right, large blank bubble.
- Partial: right hand remains the weakest point; it reads more like a V sign than the intended 7.
- Decision: selected because it best satisfies the new request for a smaller, cuter, less detailed version.

### 14-sd-poster-hand-edit-rejected.png

- Purpose: attempted right-hand correction.
- Fail: edit increased rendering detail and did not reliably fix the right-hand gesture.
- Decision: rejected in favor of the simpler SD base.

### jank-hoodie-back-poster-sd-cute-final.png

- Purpose: final smaller/cuter poster pass with manual Korean text overlay.
- Pass: final text is exactly "아오,짱크"; text was added manually, not generated.
- Pass: characters are smaller, cuter, and less detailed than the previous final poster.
- Pass: no lab coat or white coat appears.
- Partial: right hand still reads closer to a V sign than a perfect 7, but the overall SD direction is the best match for this pass.

## Apparel Graphic Pass

### 15-apparel-poster-base-no-text.png

- Purpose: redesign the SD poster toward anime apparel/T-shirt graphic references.
- Pass: black/charcoal field, hot-pink accents, manga face panels, halftone texture, compact character print, blank speech bubble and top label box.
- Pass: no generated text in the base image.
- Pass: no lab coat or white coat appears.
- Partial: Jank's right hand still reads closer to a V sign than a strict 7.

### jank-hoodie-back-poster-apparel-final.png

- Purpose: final apparel-style poster with manual text overlays.
- Pass: final Korean text is exactly "아오,짱크" and was added manually.
- Pass: the layout now matches the requested merch reference direction: black/pink palette, manga panels, compact character treatment, bold shirt-print feel.
- Pass: no lab coat or white coat appears.
- Note: extra local text overlays "JANK" and "SIX SEVEN" were added for apparel-label styling.

## Uploaded Character Reference Pass

### jank-hoodie-back-poster-reference-character-textless-base.png

- Purpose: hoodie-back poster base rebuilt around the uploaded real-person character references.
- Pass: character identity is centered on black wavy hair, round glasses, gray hoodie, calm/deadpan expression, and a seated wide stance.
- Pass: no generated text, no fake Korean, no lab coat, no white coat, no black jacket, and no backpack straps.
- Pass: vertical composition keeps the character and speech bubble readable for backside hoodie customization.

### jank-hoodie-back-poster-reference-character-final.png

- Purpose: final hoodie-back poster from the uploaded-character pass with manual Korean headline.
- Pass: final text is exactly "아오,짱크"; comma is between 오 and 짱; no generated pseudo-text was used.
- Pass: the design now follows the uploaded poster reference more closely while keeping the gray-hoodie character coherent with the user's photos.

## Character-Locked Hoodie Poster Pass

### 19-uploaded-reference-character-base.png

- Purpose: character-only base before rebuilding the poster.
- Pass: locks the main appearance traits: blocky LEGO-like head, black horn-rim glasses, dense wavy hair, gray hoodie/sweats, soft body, and deadpan expression.
- Partial: still slightly standard-anime, but much closer than the earlier poster character.

### jank-hoodie-back-poster-character-locked-textless-base.png

- Purpose: poster base made after locking the character identity.
- Pass: character remains centered, full-bodied, gray-set, sleepy/deadpan, and coherent with the character base.
- Pass: dorm door/cloud world supports the uploaded-photo context without overpowering the character.
- Pass: blank speech bubble, no generated text, no lab coat, no jacket, no backpack.

### jank-hoodie-back-poster-character-locked-final.png

- Purpose: current hoodie-back poster final using the character-locked base.
- Pass: final text is exactly "아오,짱크" and was added manually.
- Pass: no extra English label or random typography; the print read is character plus Korean headline.

## Goodbye BOJ Back Graphic Pass

### jank-hoodie-back-goodbye-boj-textless-base.png

- Purpose: hoodie-back sticker/base graphic for "Goodbye, BOJ" after one year of BOJ problem solving.
- Pass: keeps Jank centered with gray hoodie/sweats, thick glasses, sleepy deadpan expression, and soft full body.
- Pass: integrates PS motifs visually: segment-tree node diagram, DP-grid laptop/table, green accepted checks, laptops, solved paper scraps, and cloud relief mood.
- Pass: top title plate and speech burst were left blank during generation to avoid fake text.

### jank-hoodie-back-goodbye-boj-final.png

- Purpose: final flat back graphic with manual typography.
- Pass: manual text reads "GOODBYE, BOJ", "수고했어, 1년", "SEG TREE", "DP", and "WA -> AC".
- Pass: no BOJ logo was used; the design references BOJ through text and competitive-programming motifs only.
- Pass: centered rectangular sticker/back-print composition follows hoodie safe-margin logic.

### jank-hoodie-back-goodbye-boj-mockup.png

- Purpose: quick hoodie-back preview to judge placement under the hood.
- Pass: graphic is centered below the hood on a dark hoodie and remains readable as a large back print.

## Goodbye BOJ Clean Icon Pass

### jank-hoodie-back-goodbye-boj-clean-textless-base.png

- Purpose: rebuild the BOJ hoodie graphic using the user's clean shirt reference as the main direction.
- Pass: reduces the design to one pale mint block, one Jank bust, one segment-tree icon, and one DP-grid icon.
- Pass: removes clouds, laptops, paper scraps, keyboards, speech bubbles, and narrative clutter.
- Pass: the character remains thick-glasses Jank in a gray hoodie with a sleepy/deadpan face.

### jank-hoodie-back-goodbye-boj-clean-final.png

- Purpose: clean flat design with manual title lettering.
- Pass: text is limited to "GOODBYE, BOJ" and small "1 YEAR PS"; PS motifs stay visual and minimal.
- Pass: composition follows the uploaded reference: title above, mint rectangle below, iconic character crop.

### jank-hoodie-back-goodbye-boj-clean-print-transparent.png

- Purpose: print-prep version with the paper-white background removed.
- Pass: leaves title, mint block, character, and small PS icons as the actual printable artwork.

### jank-hoodie-back-goodbye-boj-clean-mockup.png

- Purpose: light hoodie back preview for checking scale and hood clearance.
- Pass: artwork is cropped to its real transparent bounds and placed below the hood.

### jank-hoodie-back-goodbye-boj-clean-algorithm-final.png

- Purpose: image-model-rendered title revision with clearer PS symbols.
- Pass: title is rendered in-image as "Goodbye, BOJ".
- Pass: segment tree is more characteristic with root/children/leaves and green accepted marks.
- Pass: DP table is more characteristic with grid structure, highlighted cells, and a diagonal transition path.

### jank-hoodie-back-goodbye-boj-clean-algorithm-transparent.png

- Purpose: transparent PNG version of the algorithm-refined clean graphic.
- Pass: verified as RGBA PNG.

### jank-hoodie-back-goodbye-boj-clean-algorithm-mockup.png

- Purpose: hoodie preview for the algorithm-refined clean graphic.
- Pass: verified as PNG and placed below the hood.

### jank-hoodie-back-goodbye-boj-hoodie-design-fixed-icons.png

- Purpose: hoodie-ready clean design with corrected algorithm icons.
- Pass: final file is a PNG and starts from the clean hoodie layout.
- Pass: segment tree icon was redrawn deterministically as interval nodes `[1,8]`, `[1,4]`, `[5,8]`, and leaf ranges, so it reads as a real segment tree rather than a generic graph.
- Pass: DP icon was redrawn deterministically as a 5x5 table with base row/column shading, selected states, recurrence arrows from top/left, and a diagonal transition path.
- Pass: keeps the image-rendered "Goodbye, BOJ" title.

### jank-hoodie-back-goodbye-boj-hoodie-design-fixed-icons-transparent.png

- Purpose: transparent PNG for hoodie printing.
- Pass: verified as RGBA PNG.

### jank-hoodie-back-goodbye-boj-hoodie-design-fixed-icons-mockup.png

- Purpose: hoodie preview for the corrected-icon PNG.
- Pass: verified as PNG.

### jank-hoodie-back-goodbye-boj-fixed-icon-balance.png

- Purpose: final icon-balance correction after the deterministic icons felt collapsed and mismatched with the clean layout.
- Pass: segment tree is now a bold 7-node symbol with no labels or tiny detail.
- Pass: DP table is now a bold grid with an arrow and green accent, no labels or tiny detail.
- Pass: both icons have similar visual weight and align cleanly with the mint block corners.
- Pass: verified as RGB PNG.

### jank-hoodie-back-goodbye-boj-fixed-icon-balance-transparent.png

- Purpose: transparent print PNG for the balanced-icon revision.
- Pass: verified as RGBA PNG.

### jank-hoodie-back-goodbye-boj-fixed-icon-balance-mockup.png

- Purpose: hoodie preview for the balanced-icon revision.
- Pass: verified as RGB PNG.
