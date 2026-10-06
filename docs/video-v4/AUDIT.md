# Trailer v4 audit (Kodawari pass, 2026-10-05)

The film went through these stages before it was signed off:
1. An animatic for the owner.
2. Owner notes.
3. A full render.
4. Two passes by an independent reviewer, told to trust nothing and to default to "not fixed". It pulled a frame every
   0.5 s, every frame around each cut, and full-size crops. It measured sound against picture on every cut, and checked
   every line against CHANGELOG, docs and source.
5. Fixes and a re-render after each pass.

## Owner notes on the animatic

| Note | Fix |
|---|---|
| Sound not matched when a feature card switches to its screenshot | Cause: the swell peaked 0.6 s after the cut. Each screen now gets a hit on the cut frame, with the swell building into it. Beat swaps get a lighter hit. Measured on all 20 hard cuts: picture and hit within about ±40 ms (one frame). |
| The audio and pace must follow the first trailer; features may stay slower | Bars 0–8 and the last 8 bars use v1's timing and chords 1:1. The roll call and the end card went back to v1 (they had been stretched). Only the twelve chapters are slower. |
| The BSV scene does not show the full block sequence before cutting | The chain card was 1.5 bars, so only about 1.5 of its 3 passes played. It is now 2.5 bars, the passes start earlier, and all three finish before the title moves. The score holds A under it. |

## Fixed after the independent review

| # | Finding | Fix |
|---|---|---|
| 1 | Wallet "Checked" timestamp (c10), Activity log dates (c10 Arm) and "Updated Oct 5" (c5) were on screen in the wide first frame | Cameras never open wide (default start is 0.8 of the target zoom, plus explicit `from` on five screens) |
| 2 | Rig temp paths readable in the wide first frame (c6, c9, c12) | Same |
| 3 | "(harness)" model label readable on c6 delete and c11 | Same |
| 4 | Claims beyond the docs: "Every risky call waits", "Mainnet stays off", "Checks every part", "never cut off", plus one unsourced callout | Reworded to what the source supports (see BRIEF fact table) |
| 5 | Lines held shorter than the reading rule (`check.mjs` had a 0.5 s grace) | Grace removed; cards and screens lengthened or lines shortened. v1-kept Act I/III lines are reported, not failed. |
| 6, X | X cut joined mid-card; one stray VOX-LOG frame under the hit; weak breath before the hit | Whole chapters only; the last segment starts one frame after the hit; one beat fades to silence |
| 7 | The shrinking title passed over the UI after the cut | The title is in the header before the screen lands |
| 8 | Callout labels 18 px from the frame edge | Moved in (right 96 px, 30 px type) |
| 9 | Anchor dots covered the word they named | Hollow ring |
| 10 | The beat before the hit kept the reverb tail (only about -12 dB) | The reverb is gated too: now -51 to -54 dBFS |
| 11 | Act I not exactly v1 (glass notes on the roll call, caption2 times, a swell inside bar 7) | Back to v1 |
| 12 | Embers drawn over the screenshots | Erased inside the gold frame |
| 13–15 | c9 text cut at the frame edge; c6 delete cut at the edge; c2 mostly empty; palette beat short and dark | Re-framed; c2 zoomed; the palette beat is 2.5 s and zoomed on the palette |
| 16 | Hard cuts blended over 0.06 s (a half-mixed frame) | One frame, on the frame nearest the beat |
| 17 | The last chain pass ran into the title move | Passes at 0.3 / 1.0 / 1.7 bars |
| 20 | The Relic was smaller than the busts in the roll call | Sized to match |
| 22 | The Blender shimmer ran under the Upkeep chapter | It ends with the Sculptor |

## Left as they are

- Loudness is about -13.7 LUFS integrated. v1 is -13.1; the spec is -14. Single-pass loudnorm.
- The letter-spaced kickers are hard to read at phone size. They are secondary, because the title under them is large.
- "In the grim darkness of your backlog…" is the 40k parody line, kept from v1 as Act I requires. The owner's call.
- Half-bar cuts fall between two frames (37.5 frames). The picture cuts on the nearer frame, 17 ms from the hit.

## For the owner

- The film is 2:40. Readable callouts for every 0.2.4 feature did not fit in 2:30.
- The X cut is 58.75 s of whole chapters (Act I, Computers, BSV, Blender, the finale), not exactly 60.0 s.
- Several features shown here are still marked in CHANGELOG as tested against fakes only: OpenRouter, the board,
  Blender on the PC and BSV spending. The trailer shows them as shipped UI, and makes no "verified" or "tested" claim.
- Before posting, open `github.com/dnh33/legion` while logged out.
