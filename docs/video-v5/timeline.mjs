// Legion trailer v4, "the full order": single source of truth for every time. trailer.html imports it to drive the picture,
// render.mjs imports it to write cues.json, and score.py reads cues.json, so picture and music share one clock.
//
// Grammar (plan: claude.ai doc "Legion trailer v4: the full order — plan"):
//   Act I    v1's opening: candle, arch, banners, then the roll call where the Relic (Zealot) walks into the lead slot.
//   Act II   twelve chapters. Each = a card (patron's painted bust + kicker + title + one line), then real screens in a gold frame.
//            On the cut to the first screen the card's kicker and title shrink into a header that stays for the whole chapter.
//            Callout labels live in the right column with leader lines into the frame; the Relic stays at its home under them.
//   Act III  v1's VOX-LOG, the hit, the end card.
// Editing rules: 96 BPM grid; changes on bar or half-bar lines; dissolve into a card, hard cut card->screen and screen->screen;
// text holds >= 0.3 s per word + 0.8 s; every screen >= 3.75 s (1.5 bars); black only at the first and last frame.
export const FPS = 30;
export const BPM = 96;
export const BEAT = 60 / BPM;                 // 0.625
export const BAR = BEAT * 4;                  // 2.5
export const b = (bar, beat = 0) => +(bar * BAR + beat * BEAT).toFixed(4);
export const TRANSITION = { hard: 0.06, dissolve: 0.5, match: 0.7 };

// The thirteen offices (src/core/roster.ts + the three defaults). Zealot's bust IS the Relic: its slot is filled by the Relic itself.
export const ROSTER = [
  ['zealot', 'Zealot', 'Lead', '#b3202f'], ['builder', 'Builder', 'Builds, in its VM', '#3fa58f'], ['scout', 'Scout', 'Research', '#7b8ea6'],
  ['inquisitor', 'Inquisitor', 'Review and audit', '#7a5cc4'], ['scribe', 'Scribe', 'Docs', '#5a6fc4'], ['archivist', 'Archivist', 'Memory', '#8a6a4a'],
  ['sentinel', 'Sentinel', 'Watch duty', '#9fb3c0'], ['forgemaster', 'Forgemaster', 'Infra and deploys', '#a8683f'], ['exorcist', 'Exorcist', 'Debugging', '#d8cfb8'],
  ['preceptor', 'Preceptor', 'The craft pass', '#c9bfa6'], ['herald', 'Herald', 'Comms drafts', '#a07aa0'], ['assayer', 'Assayer', 'BitcoinSV', '#6fa3d1'], ['sculptor', 'Sculptor', 'Blender', '#cfcac0'],
];

// ---- Act II chapters. bars: [card, screen1, screen2...]. cam: [z, cx, cy] (fractions of the screenshot; cx, cy are clamped to keep
// the frame full). call: [text, fx, fy] (a point on the real UI element the label names). beat: a one-beat hard cut inside a screen.
const SPEC = [
  // v5: Zealot leads (0.2.5 "Zealot leads the Order"). Its patron IS the Relic: no painted card bust, the Relic walks into the card.
  { id: 'c0', patron: 'zealot', relicPatron: true, state: 'hacking', kicker: 'Zealot · Command', title: 'One order, many hands', line: 'Ask once. Zealot hands it out.', bars: [1.5, 2.5],
    screens: [{ img: 'c0-delegate.png', cam: [1.8, .47, .47], calls: [['Splits it into tasks', .24, .444], ['Waits on the agent it asked', .40, .594]] }] },
  { id: 'c1', patron: 'inquisitor', state: 'awaiting', kicker: 'The Inquisitor · Approvals', title: 'You hold the seal', line: 'Risky calls await your word.', bars: [1, 2],
    screens: [{ img: 'c1-approval.png', cam: [1.9, .47, .52], calls: [['Allow or deny', .25, .629], ['Press A or D', .274, .629]] }] },
  { id: 'c2', patron: 'scout', state: 'thinking', kicker: 'The Scout · Chat', title: 'Talk to it mid-run', line: 'Steer it while it works.', bars: [1, 2.5],
    screens: [{ img: 'c2-steer.png', cam: [1.6, .47, .66], calls: [['Joins the running task', .53, .496], ['Live run status', .30, .545]], beat: { img: 'c2-palette.png', at: 1.5, cam: [1.6, .5, .34] } }] },
  { id: 'c3', patron: 'preceptor', state: 'idle', kicker: 'The Preceptor · Models', title: 'Any model, at your word', line: 'Claude first. OpenRouter beside it.', bars: [1, 2, 2],
    screens: [{ img: 'c3-models.png', cam: [1.55, .36, .62], calls: [['Auto: Sonnet or Opus', .245, .505], ['OpenRouter, any model', .30, .707]] },
              { img: 'c3-takeover.png', cam: [2.0, .45, .32], calls: [['Sonnet stops, Opus finishes', .32, .359], ['In the same conversation', .25, .423]] }] },
  { id: 'c4', patron: 'herald', state: 'idle', kicker: 'The Herald · Rooms', title: 'The order confers', line: 'Rooms of bots, and you.', bars: [1, 2],
    screens: [{ img: 'c4-room.png', cam: [1.5, .55, .45], calls: [['Every hop counted', .575, .153], ['Handoffs by name', .47, .39]] }] },
  { id: 'c5', patron: 'archivist', state: 'thinking', kicker: 'The Archivist · Library', title: 'A Library that remembers', line: 'Shared memory, in one graph.', bars: [1, 2, 2],
    screens: [{ img: 'c5-lattice.png', cam: [1.4, .64, .40], from: [1.45, .62, .36], calls: [['One graph, shared', .583, .437], ['Decisions keep their why', .79, .439]] },
              { img: 'c5-inbox.png', cam: [1.35, .6, .37], calls: [['Bots propose. You decide.', .289, .372], ['Web finds stay untrusted', .835, .181]] }] },
  { id: 'c6', patron: 'sentinel', state: 'awaiting', kicker: 'The Sentinel · Projects', title: 'A board they work like teammates', line: 'Only you mark Done.', bars: [1, 2, 1.5],
    screens: [{ img: 'c6-board.png', cam: [1.7, .58, .42], from: [1.45, .58, .38], calls: [['Not reviewed until you look', .38, .596], ['Only you mark Done', .69, .426]] },
              { img: 'c6-delete.png', cam: [1.55, .55, .57], from: [1.5, .55, .58], calls: [['Deletes wait for you', .361, .524]] }] },
  { id: 'c7', patron: 'exorcist', state: 'awaiting', kicker: 'The Exorcist · Doctrine', title: 'A doctrine they follow', line: 'Rules and skills, your switch.', bars: [1, 2],
    screens: [{ img: 'c7-doctrine.png', cam: [1.45, .55, .62], calls: [['Core tenets, always on', .36, .349], ['Six skills, off until you choose', .355, .629]] }] },
  { id: 'c8', patron: 'scribe', state: 'thinking', kicker: 'The Scribe · Long sessions', title: 'Long runs keep their decisions', line: 'Compacted, not truncated.', bars: [1, 2],
    screens: [{ img: 'c8-compact.png', cam: [1.9, .47, .33], calls: [['Says when, and how much', .514, .359]] }] },
  { id: 'c9', patron: 'builder', state: 'hacking', kicker: 'The Builder · Computers', title: 'A forge-machine for every agent', line: 'A cloud VM, on demand.', bars: [1, 2, 1.5],
    screens: [{ img: 'c9-computer.png', cam: [2.2, .77, .55], calls: [['Its own cloud VM', .88, .464], ['Stops when idle', .94, .72]] },
              { img: 'c9-browser.png', cam: [1.5, .55, .60], calls: [['Or browse from this PC', .40, .648]] }] },
  { id: 'c10', patron: 'assayer', state: 'awaiting', forge: 'chain', pulses: [0.3, 1.0, 1.7], kicker: 'The Assayer · BSV', title: 'Native BitcoinSV development', line: 'Keys stay in your wallet. Every spend needs your seal.', bars: [2.5, 2, 2],
    screens: [{ img: 'c10-status.png', cam: [2.3, .5, .22], from: [2.2, .5, .227], calls: [['A testing preview, testnet first', .33, .119], ['No keys inside Legion', .46, .231]] },
              { img: 'c10-arm.png', cam: [1.9, .5, .38], from: [1.75, .5, .36], calls: [['Mainnet off by default', .40, .378], ['Armed for one spend', .35, .525]] }] },
  { id: 'c11', patron: 'sculptor', state: 'idle', forge: 'mesh', kicker: 'The Sculptor · Blender', title: 'Blender, built in', line: 'Sculpt and render on your PC, or in a VM.', bars: [2, 2],
    screens: [{ img: 'c11-blender.png', cam: [1.8, .47, .58], calls: [['You choose where it runs', .40, .446], ['The whole script, every time', .45, .65]] }] },
  { id: 'c12', patron: 'forgemaster', state: 'idle', kicker: 'The Forgemaster · Upkeep', title: 'Kept current, kept sound', line: 'Signed updates. Health checks.', bars: [1, 2, 2],
    screens: [{ img: 'c12-updates.png', cam: [1.6, .45, .45], from: [1.35, .45, .50], calls: [['Up to date, checked on launch', .42, .287]] },
              { img: 'c12-doctor.png', cam: [1.55, .48, .50], calls: [['Checks the essentials', .32, .243], ['Tells you how to fix it', .389, .615]] }] },
];

// Lay the chapters on the grid from bar 8 (v1's field starts on bar 8); every boundary lands on a whole or half bar.
const ACT2 = 8;
export const CH = []; {
  let at = ACT2;
  for (const c of SPEC) {
    const start = at, card = c.bars[0];
    let t = start + card;
    const screens = c.screens.map((s, i) => { const s0 = t; t += c.bars[i + 1]; return { ...s, in: b(s0), out: b(t) }; });
    CH.push({ ...c, in: b(start), cardOut: b(start + card), out: b(t), screens });
    at = t;
  }
}
export const ACT2_END = CH[CH.length - 1].out / BAR;          // 56

// Every scene change and its transition.
export const CUTS = [
  { id: 'cold>awaken', at: b(2), kind: 'dissolve' },
  { id: 'awaken>muster', at: b(4), kind: 'match' },
  { id: 'banners>roster', at: b(6), kind: 'dissolve' },
  ...CH.flatMap((c, ci) => [
    { id: `${ci ? CH[ci - 1].id : 'roster'}>${c.id}`, at: c.in, kind: 'dissolve' },
    ...c.screens.map((s, si) => ({ id: `${c.id}:${si ? 'screen' + si : 'card'}>screen${si + 1}`, at: s.in, kind: 'hard' })),
    ...c.screens.filter((s) => s.beat).flatMap((s) => [{ id: `${c.id}:beat-in`, at: s.in + b(0, 4 * s.beat.at), kind: 'hard' }]),
  ]),
  { id: 'c12>vox', at: b(ACT2_END), kind: 'dissolve' },
  { id: 'vox>victory', at: b(ACT2_END + 4), kind: 'hard' },
  { id: 'victory>end', at: b(ACT2_END + 5), kind: 'match' },
];

const V = ACT2_END;                           // 56: command 56-60, victory 60-61, end 61-64 (v1's last 8 bars, 1:1)
export const LOG = [
  { a: b(V + 1), d: .5, segs: [['> ', 'p'], ['claude  ', ''], ['(Claude Code, or Cowork)', 'd']] },
  { a: b(V + 1, 2), d: .55, segs: [['● ', 'p'], ['legion_list_agents', ''], ['  → 13 agents', 'gr']] },
  { a: b(V + 2), d: .55, segs: [['● ', 'p'], ['legion_projects', ''], ['  → Harbor web app', 'gr']] },
  { a: b(V + 2, 2), d: 1.0, segs: [['● ', 'p'], ['legion_run ', ''], ['sentinel ', 'd'], ['"review the sign-in change"', 'g']] },
  { a: b(V + 3), d: .45, segs: [['  ← ', 'd'], ['"Wording is accurate. One fix."', 'g']] },
  { a: b(V + 3, 1), d: .4, segs: [['  ← ', 'd'], ['model ', 'd'], ['sonnet', 'gr'], ['  ·  $0.06  ·  task 4d44', 'd']] },
  { a: b(V + 3, 1) + .45, d: b(0, 1) - .45, segs: [['  ', 'd'], ['Ŧ', 'mk'], [' LEGION · sworn · ', 'd'], ['done', 's']] },   // 0.2.5: Legion's mark in Claude Code; "done" lands on the beat
];

export const RH = { cx: 1650, cy: 760, h: 430 };
export const CARD_BUST = { cx: 315, cy: 548, h: 470 };     // where a chapter card's painted bust stands (.pbust)            // the Relic's Act II home, under the callout column
const SLOT0 = { cx: 0, cy: 0 };                             // filled in by trailer.html's grid (kept here only as documentation)

export const T = {
  dur: b(V + 8),                                                  // 64 bars, 160 s
  cold: { candleIn: [0, .9], l1: [b(0, 1.5), b(0, 2.6), b(2), b(2, .8)], l2: [b(1), b(1, 1), b(2), b(2, .8)], candleOut: [b(1, 3.4), b(2, .8)], end: b(2) },
  awaken: { arch: [b(1, 3.2), b(2, 2.4)], wake: b(2, 2), sub: [b(2, 2.6), b(2, 3.4), b(3, 3.8), b(4, .5)], end: b(4) },
  muster: { banners: [b(4), b(4, 1), b(4, 2)], caption: [b(4, 2.2), b(4, 3), b(5, 3.8), b(6, .5)],
    // v1's roll call, 1:1 (owner: Act I and Act III keep the first trailer's pace; only the features slow down)
    roster: b(6), rosterStep: BEAT / 4, caption2: [b(6, 3), b(7), b(7, 3.6), b(8, .3)], gridOut: [b(7, 3), b(8, .2)], end: b(8) },
  field: { bolts: [[b(2, .35), 1460, 12, .85], [b(2, 2) - .03, 760, 13, 1]] },   // v5: lightning on the field (picture + thunder)
  vox: { term: [b(V), b(V + 4)], title: [b(V), b(V, 1)], chips: b(V, 3), sealed: b(V + 3, 2), end: b(V + 4) },
  victory: { at: b(V + 4), text: [b(V + 4, 1), b(V + 4, 1.8), b(V + 5, .6), b(V + 5, 1.2)], flash: [b(V + 4), b(V + 4) + .3], end: b(V + 5) },
  end: { wmDraw: [b(V + 5, 1.25), b(V + 5, 3.75)], wmFill: [b(V + 6), b(V + 6, 1.4)], tag: b(V + 6, 1.5), url: b(V + 6, 2.5), print: b(V + 6, 3.3), sigil: b(V + 7), fadeOut: [b(V + 7, 2.5), b(V + 8)] },   // v1's end card, 1:1
  // the Relic: t, cx, cy, h, opacity. Homes: centre (awakening), banner right, the lead slot (roll call), Act II home, centre-high (end)
  relic: [
    [0, 960, 400, 600, 0], [b(1, 3.6), 960, 400, 600, 0], [b(2, 2), 960, 400, 600, 1], [b(3, 3.6), 960, 400, 600, 1],
    [b(4, 1.6), 1555, 470, 560, 1], [b(6), 1555, 470, 560, 1],
    [b(6, 1.2), 'slot', 'slot', 'slot', 1], [b(7, 2), 'slot', 'slot', 'slot', 1],     // into Zealot's place in the grid, and out again
    [b(7, 3.6), CARD_BUST.cx, CARD_BUST.cy, CARD_BUST.h, 1], [CH[0].cardOut - .25, CARD_BUST.cx, CARD_BUST.cy, CARD_BUST.h, 1],   // v5: Zealot is its own chapter's patron
    [CH[0].cardOut + .55, RH.cx, RH.cy, RH.h, 1], [b(V + 4), RH.cx, RH.cy, RH.h, 1],
    [b(V + 4, 1.6), 960, 400, 640, 1], [b(V + 5), 960, 400, 640, 1], [b(V + 5, 3), 960, 250, 420, 1], [999, 960, 250, 420, 1],
  ],
  states: [[0, 'sleeping'], [b(2, 2), 'idle'], [b(4), 'thinking'], [b(6, 1.2), 'idle'],
    ...CH.flatMap((c) => [[c.in, 'idle'], [c.cardOut, c.state]]), [b(V), 'hacking'], [b(V + 4), 'victory'], [b(V + 6, 2), 'idle']],
};
void SLOT0;

// README GIF: ~16 s (cold open, the roll call, one chapter, the end card). Starts on a lit frame.
export const GIF_SEGMENTS = [[1.7, 4.9], [b(6, 2), b(8)], [CH[0].in + .3, CH[0].out - .3], [b(V + 6), b(V + 7, 2)]];

const r3 = (x) => +x.toFixed(3);
export function cues() {
  const sections = [
    ['cold-open', 0, T.cold.end], ['awakening', T.cold.end, T.awaken.end], ['muster', T.awaken.end, T.muster.end],
    ['field', T.muster.end, CH.find((c) => c.id === 'c10').in], ['forges', CH.find((c) => c.id === 'c10').in, T.vox.term[0]],
    ['vox', T.vox.term[0], T.victory.at], ['victory', T.victory.at, T.victory.end], ['end', T.victory.end, T.dur],
  ].map(([name, start, end]) => ({ name, start: r3(start), end: r3(end) }));
  const ev = [];
  const e = (t, name, extra = {}) => ev.push({ t: r3(t), name, ...extra });
  e(T.cold.l1[0], 'line1'); e(T.cold.l2[0], 'line2');
  e(T.awaken.wake, 'relic_wake'); e(T.awaken.sub[0], 'subtitle');
  T.muster.banners.forEach((t, i) => e(t, 'banner', { n: i + 1 }));
  e(T.muster.caption[0], 'caption');
  ROSTER.forEach((r, i) => e(T.muster.roster + i * T.muster.rosterStep, 'roster', { n: i + 1 }));
  e(T.muster.caption2[0], 'caption2');
  CH.forEach((c, ci) => {
    e(c.in, 'card', { n: ci + 1, id: c.id });
    if (c.forge === 'chain') { c.pulses.forEach((d, i) => e(c.in + d * BAR, 'chain_pulse', { n: i + 1 })); e(c.screens[0].in, 'bsv_approval'); }
    if (c.forge === 'mesh') e(c.in, 'blender_in');
    c.screens.forEach((s, si) => {
      e(s.in, 'push', { id: c.id, n: si + 1 });
      if (s.beat) e(s.in + s.beat.at * BAR, 'swap', { id: c.id });
      s.calls.forEach((k, ki) => e(s.in + 0.55 + ki * 0.9, 'callout', { id: c.id, n: ki + 1 }));
    });
  });
  T.field.bolts.forEach(([t0], i) => e(t0, 'bolt', { n: i + 1 }));
  e(T.vox.term[0], 'vox_in'); e(T.vox.chips, 'chips');
  LOG.forEach((L, i) => { e(L.a, 'vox_line', { n: i + 1 }); if (L.segs.some(([, c]) => c === 'gr')) e(L.a + L.d, 'vox_ok'); });
  e(T.vox.sealed, 'vox_sealed');
  e(T.victory.at, 'victory');
  e(T.end.wmDraw[0], 'wm_draw'); e(T.end.wmFill[0], 'wm_fill');
  e(T.end.tag, 'tag'); e(T.end.url, 'url'); e(T.end.sigil, 'sigil'); e(T.end.print, 'print');
  e(T.end.fadeOut[0], 'fade_out'); e(T.dur, 'end');
  ev.sort((a, b2) => a.t - b2.t);
  const typing = LOG.map((L) => ({ start: r3(L.a), end: r3(L.a + L.d), chars: L.segs.reduce((n, s) => n + s[0].length, 0) }));
  const cuts = CUTS.map((c) => ({ id: c.id, t: r3(c.at), kind: c.kind }));
  return { duration: r3(T.dur), fps: FPS, bpm: BPM, sections, events: ev, typing, cuts };
}
