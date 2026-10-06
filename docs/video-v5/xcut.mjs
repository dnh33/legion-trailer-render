#!/usr/bin/env node
// The one-minute X cut, edited from the full film (no re-render):  node docs/video-v5/xcut.mjs [in.mp4] [out.mp4]
// Every segment starts and ends on the beat grid, and chapter segments start at c.in and end at a chapter or
// screen boundary, where the full film is already on the dark arch or on a hard cut, so every join is clean.
// Audio joins get a 60 ms crossfade so nothing clicks; the last beat before the hit dips, as in the full film.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { b as bt, BAR, BEAT, FPS } from './timeline.mjs';
// Half-bar lines fall between frames (37.5 frames): snap down, so a segment never carries the first frame of the next shot.
const b = (bar) => Math.floor(bt(bar) * FPS + 1e-6) / FPS;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] || path.join(HERE, 'legion-v5.mp4');
const out = process.argv[3] || path.join(HERE, 'legion-v5-x60.mp4');

// [from bar, to bar, why]
const SEG = [
  [0, 12, 'Act I (the war table, the field, the roll call) straight into Zealot leading the order'],
  [42, 45, 'The Builder: a computer of their own'],
  [46.5, 51, 'The Assayer: the full chain, then the testing-preview panel'],
  [66, 70, 'the hit, "The work is done." at dawn, the end card'],
];
const total = SEG.reduce((n, [a, z]) => n + (z - a), 0);
if (total > 24) throw new Error(`X cut is ${total} bars, over 60 s`);   // whole chapters only: 23.5 bars = 58.75 s

const XF = 0.06, FADE = 0, dur = total * BAR;   // the film's own end fade is inside the last segment
const v = [], a = [];
SEG.forEach(([s, e], i) => {
  const t0 = b(s) + (s === 66 ? 1 / FPS : 0), t1 = b(e), d = t1 - t0;
  v.push(`[${i}:v]setpts=PTS-STARTPTS[v${i}]`);   // one seeked input per segment (trim on one input buffered the whole film)
  let af = `[${i}:a]asetpts=PTS-STARTPTS`;
  if (i > 0) af += `,afade=t=in:st=0:d=${XF}`;
  if (i < SEG.length - 1) af += `,afade=t=out:st=${(d - XF).toFixed(4)}:d=${XF}`;
  if (SEG[i + 1] && SEG[i + 1][0] === 66) af += `,afade=t=out:st=${(d - BEAT).toFixed(4)}:d=${(BEAT * .4).toFixed(4)}`;   // one beat of near-silence before the hit, as in the film
  a.push(af + `[a${i}]`);
});
const n = SEG.length;
const fc = [...v, ...a,
  `${SEG.map((_, i) => `[v${i}]`).join('')}concat=n=${n}:v=1:a=0[vo]`,
  `${SEG.map((_, i) => `[a${i}]`).join('')}concat=n=${n}:v=0:a=1,loudnorm=I=-14:TP=-1.5:LRA=11[ao]`,
].join(';');
const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...SEG.flatMap(([s0, e0]) => { const t0 = b(s0) + (s0 === 66 ? 1 / FPS : 0); return ['-ss', t0.toFixed(4), '-t', (b(e0) - t0).toFixed(4), '-i', src]; }), '-filter_complex', fc, '-map', '[vo]', '-map', '[ao]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '5000k', '-bufsize', '10000k', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);
console.log(path.relative(process.cwd(), out), `${dur.toFixed(2)} s`);
