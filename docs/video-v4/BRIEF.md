# Legion trailer v4: the full order (brief)

This is the full 0.2.4 showcase. It shares the first trailer's (`docs/video/`) look, type, 96 BPM grid, instruments and synthesis.
Act I (bars 0 to 8) and Act III (the last 8 bars) keep v1's timing and chords exactly. The owner's rule: the first trailer's
pace is kept, and only the features slow down. Between the two acts sit twelve feature chapters. In each one a patron leads
with its painted bust, then comes the real 0.2.4 UI. Zealot (the Relic) is the one figure who stays on screen throughout.
`docs/video/` and `docs/video-v3/` are not edited.

| File | Spec |
|---|---|
| `legion-v4.mp4` | 2:40 (64 bars), 1920×1080, 30 fps, H.264 yuv420p BT.709, faststart, AAC score at -14 LUFS. Release asset, not in git. |
| `legion-v4-x60.mp4` | 58.75 s X cut (Act I, Computers, BSV, Blender, the finale; whole chapters only), edited from the full film by `xcut.mjs` |
| `legion-v4.gif` | README GIF, 960×540 |
| `poster-v4.png` | the end card |

How to rebuild:

1. Install and build: `npm ci && npm run build:ts && npm run build:ui`. This is only needed to capture the shots again, with `capture/shoot-v4.mjs`.
2. Check the timing: `node docs/video-v4/check.mjs`.
3. Render the full film: `node docs/video-v4/render.mjs`.
4. Make the X cut: `node docs/video-v4/xcut.mjs`.

On GitHub (faster): Actions → **Trailer render** → Run workflow (`.github/workflows/trailer.yml`). It splits the
frames across parallel Apple-silicon runners (`render.mjs --shard=K/N`), makes the GIF and the poster on one more runner,
then one Linux job runs `check.mjs`, encodes the film with the score (`render.mjs --assemble`, no browser), cuts the X
version and uploads everything as the `legion-trailer-v4` artifact. Free for a public repo: GitHub runs 5 macOS jobs at a time.

`render.mjs --preview` makes a 960×540, 15 fps animatic with the score.

Editing grammar: dissolve into a card; the title moves into the header before the screen lands; hard cuts are one frame
(no blend) on the frame nearest the beat, and the score puts a hit on that frame; the camera can start pushed in
(`from`) so rig paths, test-wallet values and timestamps never show in a wide frame; embers stay outside the UI frame.

## Structure (bars of 2.5 s)

| Bars | Section | Notes |
|---|---|---|
| 0–2 | Cold open | v1, 1:1 ("In the grim darkness of your backlog…" / "…there is only work.") |
| 2–4 | Awakening | v1, 1:1 |
| 4–8 | Muster | v1's timing: the banners ("Sonnet for the line. Opus for the war council."), then the quick roll call of the 13 painted busts. The Relic walks into Zealot's slot. "Thirteen offices. One order." |
| 8–56 | Twelve chapters | Each chapter starts on a card: the patron's bust, a kicker, a title and one line. It then hard-cuts to real screens in the gold frame, and the title stays on as the header. Callouts sit in the right-hand column, with lines leading to the UI. The audio hits on the frame of the cut. |
| 56–60 | VOX-LOG | v1, 1:1 (`legion_projects` is new) |
| 60–61 | The hit | v1, 1:1 ("The work is done.") |
| 61–64 | End card | v1, 1:1. The repo line reads "github.com/dnh33/legion · 0.2.4 BETA" |

| # | Patron | Chapter | Screens |
|---|---|---|---|
| 1 | Inquisitor | Approvals | approval card |
| 2 | Scout | Chat | queue + drafts, palette beat |
| 3 | Preceptor | Models | model picker (Auto, OpenRouter) |
| 4 | Herald | Rooms | a room, hop counter |
| 5 | Archivist | Library | Lattice graph, Inbox |
| 6 | Sentinel | Projects | board, delete approval |
| 7 | Exorcist | House rules | house rules |
| 8 | Scribe | Long sessions | compaction settings, `/compact` beat |
| 9 | Builder | Computers | agent VM, browse from this PC |
| 10 | Assayer | BSV | drawn testnet chain (three full passes over a held chord, 2.5 bars), BSV status, Arm panel |
| 11 | Sculptor | Blender | wireframe card, approval card |
| 12 | Forgemaster | Upkeep | updates, Doctor |

## Fact table (callouts)

| Claim | Source |
|---|---|
| You hold the seal; risky calls await your word; allow or deny, press A or D | the approval card; approval modes (ask by default; a full-access bot is not asked, so no "every") |
| Queued, in order; per-thread drafts | CHANGELOG: message queue (0.2.0); "Each thread keeps its own draft" (0.2.4) |
| Auto: Sonnet or Opus; OpenRouter, any model | CHANGELOG: per-task model `auto`; OpenRouter provider |
| Every hop counted; handoffs by name | CHANGELOG Rooms: guards for hops, budget, cycles |
| One graph, shared; decisions keep their why; Bots propose, you decide; web finds stay untrusted | CHANGELOG Library, Library safety (taint), Inbox; the decision note's "Why" field in the captured UI |
| Not reviewed until you look; only you mark Done; deletes wait for you | CHANGELOG Project board |
| Shipped rules trusted; edited rules yours to approve; your edits need your seal | CHANGELOG 0.2.4: house rules layer |
| Compacted, not truncated; on by default; for provider models; `/compact` | CHANGELOG 0.2.4: "compacted instead of truncated" (it applies to provider models, so the callout says so) |
| Its own cloud VM; stops when idle; or browse from this PC | docs/VM-NOTES.md (`vm.idleStopMinutes`); browser panel |
| 163 notes, built in; mainnet off by default; armed for one spend | docs/BSV-MODE.md (pack v8, 163 nodes; mainnet built and switched off, only you turn it on); per-spend Arm |
| You choose where it runs; the whole script, every time | CHANGELOG: `blender.mode` auto/local/vm/live; the approval card shows the script |
| Signed updates; up to date, checked on launch; health checks; checks the essentials; tells you how to fix it | CHANGELOG: Ed25519-signed release manifest, launch check; `src/core/doctor.ts` (six checks, each failure returns a `fix` hint) |

## Shots (`shots/`, 2880×1800)

Captured from the real built UI (`dist-ui`, v0.2.4 tag) running against the real core with the harness fakes, by
`capture/shoot-v4.mjs`. Disclosed rig changes are the same ones as `ui/dev/shots-rig/serve.mjs`:
- The `(harness)` model label is removed.
- The VM live view answers 409, so the UI shows its own "Waiting for first frame" state.
- The update status (`c12-updates`), the browser engine (`c9-browser`) and the Doctor checks (`c12-doctor`) copy the owner's PC (computer-use zooms in `pc-reference/`), because the Linux rig cannot show
  Edge or a real update check. The owner's email and paths are anonymised.

No pixel was edited. Cameras keep away from dates.

## Rules kept

- No dates on screen.
- Never "safe", "secure", "verified" or "cannot be bypassed".
- BSV is shown on testnet with mainnet off.
- Nothing planned is shown.
- No 40k names or symbols.
- The painted busts are untouched.
