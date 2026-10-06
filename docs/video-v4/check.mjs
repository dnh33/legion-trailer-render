#!/usr/bin/env node
// Editing-rule checks on timeline.mjs (no rendering):  node docs/video-v4/check.mjs
//   - every line of text holds >= 0.3 s per word + 0.8 s at full opacity (minus 0.5 s grace for its fades)
//   - every cut sits on the beat grid
//   - every screen holds >= 3.75 s (1.5 bars); a card line is <= 6 words (<= 10 on the two v1 forge cards)
//   - every chapter has a header (kicker + title) and every callout names a point inside the image
import { T, CUTS, BEAT, LOG, CH } from './timeline.mjs';

const words = (s) => s.trim().split(/\s+/).length;
const need = (s) => 0.3 * words(s) + 0.8;            // the owner's rule, no grace (v1-kept lines are reported, not failed)
let bad = 0;
const check = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
const text = (s, a, b) => check(b - a >= need(s) - 1e-6, `${(b - a).toFixed(2)}s / ${need(s).toFixed(2)}s  ${s}`);
const v1 = (s, a, b) => console.log(`${b - a >= need(s) ? 'ok  ' : 'v1  '} ${(b - a).toFixed(2)}s / ${need(s).toFixed(2)}s  ${s}  (v1's timing, kept 1:1)`);

const C = T.cold, A = T.awaken, M = T.muster, V = T.victory, E = T.end;
v1('In the grim darkness of your backlog…', C.l1[1], C.l1[2]);
v1('…there is only work.', C.l2[1], C.l2[2]);
v1('An order of Claude agents. Yours to command.', A.sub[1], A.sub[2]);
v1('Sonnet for the line. Opus for the war council.', M.caption[1], M.caption[2]);
v1('Thirteen offices. One order.', M.caption2[1], M.caption2[2]);
for (const c of CH) {
  check(!!(c.kicker && c.title), `${c.id} has a header: "${c.kicker}" / "${c.title}"`);
  text(c.line, c.in + .2, c.cardOut);                                // read on the card (half-lit at c.in + .2)
  text(c.title, c.in + .25, c.out - .25);                             // the title stays as the header all chapter
  check(words(c.line) <= (c.forge ? 10 : 6), `${c.id} card line ${words(c.line)} words`);
  for (const s of c.screens) {
    check(s.out - s.in >= 3.75 - 1e-6, `${c.id} ${s.img} holds ${(s.out - s.in).toFixed(2)}s`);
    const end = s.beat ? s.in + s.beat.at * (BEAT * 4) : s.out;
    s.calls.forEach(([txt, fx, fy], k) => {
      const a = s.in + .55 + k * .9;
      text(`${c.id} callout: ${txt}`.replace(/^c\d+ callout: /, ''), a + .3, end - .3);
      check(fx > 0 && fx < 1 && fy > 0 && fy < 1, `${c.id} callout point inside the image`);
    });
  }
}
v1('Command the whole order from Claude Code or Cowork.', T.vox.title[1], T.vox.term[1]);
v1('The work is done.', V.text[1], V.text[2]);
v1('Local. Claude-native. Open source.', E.tag + .7, E.fadeOut[0]);
v1('github.com/dnh33/legion · 0.2.4 BETA', E.url + .7, E.fadeOut[0]);
// the fine print keeps v1's end-card timing (v1 did not hold it to the reading rule either)
for (const c of CUTS) { const beats = c.at / BEAT; check(Math.abs(beats - Math.round(beats)) < 1e-6, `cut ${c.id} at ${c.at}s (beat ${beats.toFixed(2)})`); }
const sealed = LOG[LOG.length - 1].a + LOG[LOG.length - 1].d;
check(Math.abs(sealed - T.vox.sealed) < 1e-6, `"sealed." lands at ${sealed.toFixed(3)}s`);
console.log(bad ? `\n${bad} problem(s)` : '\nall rules pass');
process.exit(bad ? 1 : 0);
