# Legion trailer render

This repo is a render farm for the trailers of [Legion](https://github.com/dnh33/legion). It holds only what a
trailer needs to render: the trailer folders, plus Legion's mascot engine and fonts.

Every trailer is code. Each one is a deterministic HTML timeline that is rendered frame by frame, with an
original score synthesised from its cue sheet.

## Render

- **Push a change to `render.json`**, or open **Actions → Render trailer → Run workflow**.
- **Frames:** split across several Apple-silicon runners (`render.mjs --shard=K/N`).
- **GIF and poster:** made on one more runner.
- **Assembly:** a Linux job encodes the film with its score, then makes the cutdowns.
- **Results:** published as a **Release** named `<trailer>-r<run>`, with the MP4s, GIF, poster and cue sheet.

## Layout

| Path | What |
|---|---|
| `docs/video-v4/` | Trailer v4 "the full order" (Legion 0.2.4). Brief, audit, timeline, composition, score, render, X cut. |
| `ui/src/mascot/`, `ui/src/fonts/` | Byte copies from Legion (the painted bust engine, data, personas; OFL fonts) |
| `render.json` | Which trailer the next push renders |
| `.github/workflows/render.yml` | The render pipeline |

The screenshots in `docs/*/shots/` are of Legion's real UI, captured against its test harness.

Apache-2.0 (see LICENSE and NOTICE). The fonts are under the SIL Open Font License 1.1.
