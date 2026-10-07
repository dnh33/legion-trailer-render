#!/usr/bin/env python3
"""Review pack for a rendered trailer, published next to the film so nobody has to re-render stills to review it.

    python3 tools/review.py docs/<trailer>        (needs ffmpeg, numpy, scipy, Pillow)

Writes into docs/<trailer>/review/:
  sheet-NN.png    contact sheets, one frame every half bar (1.25 s), timestamp in the corner, 4x3 per sheet
  cuts.png        every hard cut: the frame before, on and after the cut, side by side
  audio.txt       loudness (EBU R128), true peak, LRA, the low band (30-120 Hz) on every screen cut vs a plain kick,
                  and every cue event's offset from the 16th-note grid
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

D = sys.argv[1]
OUT = os.path.join(D, 'review')
os.makedirs(OUT, exist_ok=True)
mp4 = next(os.path.join(D, f) for f in sorted(os.listdir(D)) if f.endswith('.mp4') and '-x' not in f)
cues = json.load(open(os.path.join(D, 'cues.json')))
BPM = float(cues.get('bpm', 96)); BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = float(cues['duration'])


def frame(t, w=480):
    # frame n has pts n/FPS; an input seek returns the first frame at or after the seek point, so seek half a frame early
    n = round(t * 30)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{max(0, n / 30 - 1 / 60):.4f}', '-i', mp4, '-frames:v', '1', '-vf', f'scale={w}:-2',
                        '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True, check=True)
    from io import BytesIO
    return Image.open(BytesIO(r.stdout)).convert('RGB')


def label(im, txt):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 8 + 7 * len(txt), 16], fill=(0, 0, 0)); d.text((4, 2), txt, fill=(255, 220, 90))
    return im


# contact sheets
ts = list(np.arange(0.4, DUR - 0.2, BAR / 2))
per = 12
for s in range(0, len(ts), per):
    ims = [label(frame(t), f'{t:6.2f}s  bar {t / BAR:5.2f}') for t in ts[s:s + per]]
    w, h = ims[0].size
    sheet = Image.new('RGB', (w * 4, h * 3))
    for i, im in enumerate(ims):
        sheet.paste(im, ((i % 4) * w, (i // 4) * h))
    sheet.save(os.path.join(OUT, f'sheet-{s // per + 1:02d}.png'))

# hard cuts: before / on / after
FPS = 30
hard = [c for c in cues.get('cuts', []) if c['kind'] == 'hard']
rows = []
for c in hard:
    trip = [label(frame(c['t'] + k / FPS, 320), f"{c['id'][:22]} {k:+d}f") for k in (-1, 0, 1)]
    w, h = trip[0].size
    row = Image.new('RGB', (w * 3, h)); [row.paste(im, (i * w, 0)) for i, im in enumerate(trip)]
    rows.append(row)
if rows:
    w, h = rows[0].size
    for s in range(0, len(rows), 8):
        part = rows[s:s + 8]
        sheet = Image.new('RGB', (w, h * len(part)))
        for i, r in enumerate(part):
            sheet.paste(r, (0, i * h))
        sheet.save(os.path.join(OUT, f'cuts-{s // 8 + 1:02d}.png'))

# audio
lines = []
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', mp4, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
lines += [l.strip() for l in r.stderr.splitlines() if l.strip().startswith(('I:', 'LRA:', 'Peak:'))][-3:]
wav = os.path.join(OUT, '_a.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vn', '-ac', '1', '-ar', '48000', wav], check=True)
sr, x = wavfile.read(wav); x = x.astype(float) / 32768; os.remove(wav)
lo = sosfilt(butter(4, [30, 120], 'band', fs=sr, output='sos'), x)
pk = lambda t, w=.12: 20 * np.log10(np.max(np.abs(lo[int(t * sr):int((t + w) * sr)])) + 1e-9)
push = [e['t'] for e in cues['events'] if e['name'] == 'push']
if push:
    plain = [t for t in np.arange(push[0], push[-1], 2 * BEAT) if min(abs(t - p) for p in push) > .5]
    lines.append(f'low band 30-120 Hz peak: screen cuts median {np.median([pk(t) for t in push]):.1f} dBFS, '
                 f'plain kicks median {np.median([pk(t) for t in plain]):.1f} dBFS')
    lines += [f'  cut {t:7.2f}s  {pk(t):6.1f} dBFS' for t in push]
lines.append('cue offsets from the 16th grid (ms), events off by more than 5 ms:')
q = BEAT / 4
for e in cues['events']:
    off = (e['t'] / q - round(e['t'] / q)) * q * 1000
    if abs(off) > 5:
        lines.append(f"  {e['name']:<14} {e['t']:8.3f}s  {off:+6.1f} ms")
open(os.path.join(OUT, 'audio.txt'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines[:4]))
print('review pack:', OUT, sorted(os.listdir(OUT)))
