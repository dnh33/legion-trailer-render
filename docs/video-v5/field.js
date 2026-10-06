// Trailer v5, Act I: the war table and the battlefield (and the field at dawn for the finale).
// Pure function of t, seeded, drawn on one canvas. Original art: no faction names, no symbols from any franchise.
// The story in four beats, all on v1's clock (the music and the cuts are v1's, only the picture is new):
//   table    the candle stands on a war table; ink on the map: our line in green, the backlog in red ticks
//   field    the camera dives into the map and the map becomes the field: night, storm, a ruined cathedral on the horizon,
//            the backlog (a horde of red eyes and red tags) rolling toward a thin line of twelve knights
//   command  the Relic wakes in the sky; a green tactical overlay snaps onto the field, every knight is bracketed and named,
//            orders run from the Relic to each of them, the line steps forward and the first red tags turn green
//   dawn     after "The work is done.": the same field at dawn, the horde gone, the banners still standing
const W = 1920, H = 1080, HZ = 642;                          // horizon line

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const eo = (x) => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, x) => a + (b - a) * x;
const rgba = (r, g, b, a) => `rgba(${r},${g},${b},${clamp(a).toFixed(3)})`;

// ---------------------------------------------------------------- seeded content (built once)
const R = rng(902114);
const CLOUDS = Array.from({ length: 34 }, () => ({ x: R() * 2400 - 240, y: 40 + R() * 520, r: 180 + R() * 360, a: .05 + R() * .09, v: 4 + R() * 9, k: R() }));
const FIRES = [[0.11, .9], [0.27, .6], [0.58, 1], [0.69, .7], [0.83, .85], [0.95, .55]].map(([x, s]) => ({ x: x * W, s, ph: R() * 6.28 }));
const SMOKE = Array.from({ length: 70 }, () => ({ f: Math.floor(R() * 6), off: R(), w: 40 + R() * 90, drift: 30 + R() * 90 }));
// the backlog: depth z in [0 near .. 1 far], x across the right two thirds
const HORDE = Array.from({ length: 460 }, () => ({ x: 760 + R() * 1360, z: Math.pow(R(), .8), ph: R() * 6.28, s: .75 + R() * .5, eye: R() < .82 }));
HORDE.sort((a, b) => b.z - a.z);
const TAGS = ['#4127 flaky test', 'fix later', 'regression', '#3988', 'merge conflict', 'p0: login loop', 'tech debt', 'deadline', '#4410 timeout',
  'red CI', 'stale branch', 'left for later', 'out of memory', '#4002 null', 'docs missing', 'broken build', 'race condition', 'scope creep', '#4361', 'hotfix?', 'cache miss', 'flaky e2e']
  .map((text, i) => ({ text, x: 820 + R() * 1060, z: .15 + R() * .8, ph: R() * 6.28, flip: i % 3 === 0 ? 7.6 + R() * 2 : Infinity }));
TAGS.sort((a, b) => b.z - a.z);
// our line: twelve knights (the Relic is the thirteenth, in the sky); names and colours from the roster
export function knights(roster) {
  // our line in the foreground, seen from behind: two flanks with the centre kept clear for the subtitle (v1's layout),
  // heads below the subtitle band; names and colours from the roster (the Relic is the thirteenth, in the sky)
  const R2 = rng(5150);
  return roster.slice(1).map(([id, name, , hue], i) => {
    const left = i < 6, j = left ? i : i - 6;
    const x = left ? 50 + j * 76 + R2() * 10 : 1490 + j * 76 + R2() * 10;
    return { id, name, hue, flank: left ? -1 : 1, x, y: 1205 + (j % 2) * 24 + R2() * 10, h: 380 + (j % 2) * 30 + R2() * 24, ph: R2() * 6.28, banner: j % 2 === 0, lvl: j % 3 };
  });
}
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ---------------------------------------------------------------- pieces
function sky(c, t, dawn, flash) {
  const g = c.createLinearGradient(0, 0, 0, HZ + 40);
  const n = [[3, 6, 7], [10, 19, 20], [30, 44, 38]], d = [[22, 18, 22], [92, 62, 48], [214, 160, 92]];
  const mix = (i) => n[i].map((v, k) => Math.round(lerp(v, d[i][k], dawn) + flash * 70));
  g.addColorStop(0, `rgb(${mix(0)})`); g.addColorStop(.62, `rgb(${mix(1)})`); g.addColorStop(1, `rgb(${mix(2)})`);
  c.fillStyle = g; c.fillRect(0, 0, W, HZ + 40);
  if (dawn > 0) {                                                       // the sun behind the ruins
    const s = c.createRadialGradient(1240, HZ - 10, 10, 1240, HZ - 10, 620);
    s.addColorStop(0, rgba(255, 214, 140, .55 * dawn)); s.addColorStop(.3, rgba(255, 170, 90, .22 * dawn)); s.addColorStop(1, rgba(255, 150, 80, 0));
    c.fillStyle = s; c.fillRect(0, 0, W, HZ + 40);
  }
  for (const k of CLOUDS) {                                              // storm clouds, lit from below by the fires
    const x = ((k.x + t * k.v) % 2600) - 300, a = k.a * (1 - .6 * dawn);
    const r = c.createRadialGradient(x, k.y, 0, x, k.y, k.r);
    const lit = k.y > 380 ? .35 : 0;
    r.addColorStop(0, rgba(28 + lit * 90 + flash * 120, 34 + lit * 30 + flash * 120, 36 + flash * 130, a * (1 + flash * 2)));
    r.addColorStop(1, rgba(10, 14, 16, 0));
    c.fillStyle = r; c.fillRect(x - k.r, k.y - k.r, k.r * 2, k.r * 2);
  }
}

function bolt(c, t, t0, x0, seed, k) {
  const u = (t - t0) / .32; if (u < 0 || u > 1) return 0;
  const a = (u < .15 ? 1 : 1 - (u - .15) / .85) * k, R3 = rng(seed);
  c.save(); c.strokeStyle = rgba(214, 236, 255, a); c.lineWidth = 3; c.shadowColor = rgba(170, 210, 255, a); c.shadowBlur = 24;
  c.beginPath(); let x = x0, y = 60; c.moveTo(x, y);
  while (y < HZ - 20) { x += (R3() - .5) * 70; y += 30 + R3() * 50; c.lineTo(x, Math.min(y, HZ - 20)); }
  c.stroke(); c.restore();
  return a;
}

function ruins(c, dawn, rim) {
  // a ruined cathedral on the horizon: two spires (one broken), the nave, and a broken arch that echoes the film's arch
  c.save(); c.fillStyle = `rgb(${Math.round(lerp(6, 34, dawn))},${Math.round(lerp(9, 26, dawn))},${Math.round(lerp(10, 28, dawn))})`;
  c.beginPath();
  c.moveTo(1010, HZ); c.lineTo(1010, 560); c.lineTo(1040, 548); c.lineTo(1062, 470); c.lineTo(1070, 330); c.lineTo(1078, 470); c.lineTo(1100, 548); c.lineTo(1128, 560);
  c.lineTo(1128, 520); c.quadraticCurveTo(1200, 440, 1272, 520); c.lineTo(1272, 560);              // the nave roofline with a broken arch
  c.lineTo(1300, 548); c.lineTo(1316, 488); c.lineTo(1322, 430); c.lineTo(1338, 452); c.lineTo(1342, 404); c.lineTo(1356, 470); c.lineTo(1372, 548); c.lineTo(1398, 560);
  c.lineTo(1398, 600); c.lineTo(1460, 610); c.lineTo(1470, 590); c.lineTo(1490, 612); c.lineTo(1560, HZ); c.closePath(); c.fill();
  // the arch window, glowing
  c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(1200, 520, 4, 1200, 520, 70);
  g.addColorStop(0, rgba(150, 230, 190, .22 * rim)); g.addColorStop(1, rgba(150, 230, 190, 0));
  c.fillStyle = g; c.beginPath(); c.arc(1200, 520, 70, 0, 6.29); c.fill();
  c.restore();
}

function fires(c, t, dawn) {
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const f of FIRES) {
    const fl = .75 + .25 * Math.sin(t * 9 + f.ph) * Math.sin(t * 3.7 + f.ph * 2), a = f.s * fl * (1 - dawn);
    const g = c.createRadialGradient(f.x, HZ - 6, 0, f.x, HZ - 6, 240 * f.s);
    g.addColorStop(0, rgba(255, 150, 60, .5 * a)); g.addColorStop(.35, rgba(220, 80, 30, .2 * a)); g.addColorStop(1, rgba(120, 30, 10, 0));
    c.fillStyle = g; c.fillRect(f.x - 260, HZ - 260, 520, 360);
  }
  c.restore();
  // smoke columns from each fire
  for (const s of SMOKE) {
    const f = FIRES[s.f], u = (t * .05 + s.off) % 1, y = HZ - u * 520, x = f.x + Math.sin(u * 4 + s.off * 9) * 30 + u * s.drift;
    const a = Math.sin(Math.PI * u) * .1 * (1 - .7 * dawn), r = s.w * (.5 + u);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(30, 34, 34, a)); g.addColorStop(1, rgba(30, 34, 34, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function mist(c, t, dawn, wake) {
  // a lit haze between the horizon and the foreground, so the backlog and our line read as silhouettes against it
  const g = c.createLinearGradient(0, HZ - 30, 0, H);
  const warm = 1 - dawn;
  g.addColorStop(0, rgba(lerp(70, 220, dawn), lerp(60, 170, dawn), lerp(52, 120, dawn), .0));
  g.addColorStop(.12, rgba(lerp(96, 230, dawn), lerp(78, 176, dawn), lerp(62, 120, dawn), .42));
  g.addColorStop(.45, rgba(lerp(48, 150, dawn) + 20 * wake * warm, lerp(56, 120, dawn) + 40 * wake * warm, lerp(52, 92, dawn) + 30 * wake * warm, .30));
  g.addColorStop(.8, rgba(20, 24, 24, .05));
  g.addColorStop(1, rgba(0, 0, 0, 0));
  c.fillStyle = g; c.fillRect(0, HZ - 30, W, H - HZ + 30);
  // slow drifting banks of haze
  for (let i = 0; i < 9; i++) {
    const x = ((i * 260 + t * (12 + i * 3)) % 2400) - 240, y = HZ + 60 + (i % 3) * 70, r = 260 + (i % 4) * 60;
    const h = c.createRadialGradient(x, y, 0, x, y, r);
    h.addColorStop(0, rgba(lerp(90, 230, dawn), lerp(84, 180, dawn), lerp(76, 130, dawn), .10)); h.addColorStop(1, rgba(0, 0, 0, 0));
    c.fillStyle = h; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function ground(c, dawn, flash) {
  const g = c.createLinearGradient(0, HZ, 0, H);
  g.addColorStop(0, `rgb(${Math.round(lerp(22, 70, dawn) + flash * 40)},${Math.round(lerp(28, 52, dawn) + flash * 40)},${Math.round(lerp(26, 40, dawn) + flash * 44)})`);
  g.addColorStop(.25, `rgb(${Math.round(lerp(10, 34, dawn))},${Math.round(lerp(14, 26, dawn))},${Math.round(lerp(14, 22, dawn))})`);
  g.addColorStop(1, '#030405');
  c.fillStyle = g; c.fillRect(0, HZ, W, H - HZ);
  // ruts and puddles, in perspective
  c.save(); c.strokeStyle = rgba(120, 140, 130, .05 + .05 * dawn); c.lineWidth = 2;
  for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(960 + i * 30, HZ + 4); c.lineTo(960 + i * 300, H); c.stroke(); }
  c.restore();
}

const depthY = (z) => lerp(H - 170, HZ + 8, z);                  // z 0 near .. 1 at the horizon
const depthS = (z) => lerp(1, .12, z);

function horde(c, t, P) {
  // the line of contact moves left until the Relic wakes, then the order pushes it back
  const adv = P.advance, push = P.push;
  for (const m of HORDE) {
    const s = depthS(m.z) * m.s, y = depthY(m.z);
    const x = m.x - adv * 120 * (1 - m.z * .6) + push * 220 * (1 - m.z * .5) + Math.sin(t * 1.3 + m.ph) * 4 * s;
    const bob = Math.abs(Math.sin(t * 3.1 + m.ph)) * 5 * s;
    const fade = (1 - P.dawn) * clamp(1 - push * (1 - m.z) * .35);
    if (fade <= .01) continue;
    c.fillStyle = rgba(4, 6, 7, .92 * fade);
    c.beginPath(); c.ellipse(x, y - 34 * s - bob, 16 * s, 30 * s, 0, 0, 6.29); c.fill();          // a hunched body
    c.beginPath(); c.arc(x + 6 * s, y - 66 * s - bob, 9 * s, 0, 6.29); c.fill();                  // a head
    if (m.eye && s > .14) {
      const glow = .55 + .45 * Math.sin(t * 5 + m.ph * 3);
      c.fillStyle = rgba(255, 60, 52, .85 * glow * fade);
      c.fillRect(x + 3 * s, y - 68 * s - bob, 2.6 * s, 2 * s); c.fillRect(x + 9 * s, y - 68 * s - bob, 2.6 * s, 2 * s);
    }
  }
}

function tags(c, t, P) {
  c.save(); c.textBaseline = 'middle';
  for (const g of TAGS) {
    const s = depthS(g.z), y = depthY(g.z) - 120 * s - 30 + Math.sin(t * .9 + g.ph) * 6;
    const x = g.x - P.advance * 120 * (1 - g.z * .6) + P.push * 220 * (1 - g.z * .5);
    const fl = ramp(t, g.flip, g.flip + .35), a = (.62 - .3 * g.z) * (1 - P.dawn) * P.tagK;
    if (a <= .01) continue;
    const size = Math.round(lerp(12, 26, s));
    c.font = `600 ${size}px "JetBrains Mono", ui-monospace, monospace`;
    const txt = fl > .5 ? `✓ ${g.text}` : g.text, w = c.measureText(txt).width;
    if (x + w + 24 > W) continue;                                       // never cut by the frame edge
    const col = fl > .5 ? [124, 255, 178] : [255, 84, 72];
    c.fillStyle = rgba(10, 4, 4, a * .55); c.fillRect(x - 8, y - size * .75, w + 16, size * 1.5);
    c.strokeStyle = rgba(...col, a * .7); c.lineWidth = 1; c.strokeRect(x - 8 + .5, y - size * .75 + .5, w + 15, size * 1.5 - 1);
    c.fillStyle = rgba(...col, a); c.fillText(txt, x, y);
  }
  c.restore();
}

function knight(c, k, t, P, rimG) {
  const x = k.x + P.step * 40, y = k.y, h = k.h, sway = Math.sin(t * 1.1 + k.ph) * 2;
  const s = h / 280;
  c.save(); c.translate(x, y); c.scale(s, s);
  const body = `rgb(${Math.round(lerp(5, 40, P.dawn))},${Math.round(lerp(7, 34, P.dawn))},${Math.round(lerp(8, 34, P.dawn))})`;
  // pole and banner (every third knight), cloth in the agent's colour
  if (k.banner) {
    c.strokeStyle = body; c.lineWidth = 5; c.beginPath(); c.moveTo(34, -40); c.lineTo(34, -330); c.stroke();
    const [r, g, b] = hex(k.hue), wave = Math.sin(t * 2 + k.ph) * 6;
    c.fillStyle = rgba(r * .55, g * .55, b * .55, .95);
    c.beginPath(); c.moveTo(36, -326); c.lineTo(108 + wave, -318); c.lineTo(104 + wave * .6, -230); c.lineTo(72, -246); c.lineTo(36, -232); c.closePath(); c.fill();
  } else {                                                    // a spear
    c.strokeStyle = body; c.lineWidth = 4; c.beginPath(); c.moveTo(30, -10); c.lineTo(40 + sway, -300); c.stroke();
    c.fillStyle = body; c.beginPath(); c.moveTo(40 + sway, -322); c.lineTo(46 + sway, -298); c.lineTo(34 + sway, -298); c.closePath(); c.fill();
  }
  // body: cloak, pauldrons, great helm, plume
  c.fillStyle = body;
  c.beginPath(); c.moveTo(-52, 0); c.lineTo(-44, -140); c.quadraticCurveTo(0, -176, 44, -140); c.lineTo(54, 0); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(-38, -146, 26, 16, -.3, 0, 6.29); c.fill(); c.beginPath(); c.ellipse(38, -146, 26, 16, .3, 0, 6.29); c.fill();
  c.beginPath(); c.moveTo(-20, -158); c.lineTo(-22, -206); c.quadraticCurveTo(0, -232, 22, -206); c.lineTo(20, -158); c.closePath(); c.fill();
  c.strokeStyle = body; c.lineWidth = 7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -226); c.quadraticCurveTo(-26 + sway, -262, -46 + sway, -244); c.stroke();
  // the visor slit catches the Relic's green once it is awake
  c.fillStyle = rgba(124, 255, 178, .85 * P.wake); c.fillRect(-13, -196, 26, 3);
  // rim light: fires from the right, the Relic from above
  c.globalCompositeOperation = 'lighter';
  c.strokeStyle = rgba(255, 140, 70, .22 * (1 - P.dawn)); c.lineWidth = 2;
  c.beginPath(); c.moveTo(44, -140); c.lineTo(54, 0); c.stroke();
  c.strokeStyle = rgba(124, 255, 178, .35 * rimG); c.beginPath(); c.moveTo(-20, -206); c.quadraticCurveTo(0, -232, 22, -206); c.stroke();
  c.strokeStyle = rgba(255, 210, 150, .3 * P.dawn); c.beginPath(); c.moveTo(-44, -140); c.quadraticCurveTo(0, -176, 44, -140); c.stroke();
  c.restore();
  return { hx: x, hy: y - h * (210 / 280), top: y - h * (236 / 280), left: x - 56 * s, right: x + 56 * s, bottom: Math.min(y - h * (120 / 280), H - 12) };
}

function overlay(c, t, P, heads, relic) {
  const k = P.overlay; if (k <= .01) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  // the grid snaps onto the ground plane, swept from the foreground to the horizon
  const sweep = P.sweep;
  c.strokeStyle = rgba(124, 255, 178, .16 * k); c.lineWidth = 1.2;
  for (let i = -14; i <= 14; i++) { c.beginPath(); c.moveTo(960 + i * 26, HZ + 2); c.lineTo(960 + i * 300, H); c.stroke(); }
  for (let j = 1; j < 18; j++) {
    const z = 1 - j / 18, y = depthY(z * .98); if ((H - y) / (H - HZ) > sweep) continue;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  const sy = lerp(H, HZ, sweep);
  const g = c.createLinearGradient(0, sy - 30, 0, sy + 30);
  g.addColorStop(0, rgba(124, 255, 178, 0)); g.addColorStop(.5, rgba(124, 255, 178, .28 * k * (1 - sweep))); g.addColorStop(1, rgba(124, 255, 178, 0));
  c.fillStyle = g; c.fillRect(0, sy - 30, W, 60);
  // brackets and names on every knight, orders from the Relic to each
  c.font = '600 13px "JetBrains Mono", ui-monospace, monospace'; c.textBaseline = 'alphabetic';
  heads.forEach((hd, i) => {
    const a = ramp(t, P.t0 + .15 + i * .07, P.t0 + .45 + i * .07) * k; if (a <= 0) return;
    const L = hd.left - 6, Rr = hd.right + 6, T = hd.top - 8, B = hd.bottom, cl = 14;
    c.strokeStyle = rgba(124, 255, 178, .8 * a); c.lineWidth = 2;
    c.beginPath();
    c.moveTo(L, T + cl); c.lineTo(L, T); c.lineTo(L + cl, T); c.moveTo(Rr - cl, T); c.lineTo(Rr, T); c.lineTo(Rr, T + cl);
    c.moveTo(L, B - cl); c.lineTo(L, B); c.lineTo(L + cl, B); c.moveTo(Rr - cl, B); c.lineTo(Rr, B); c.lineTo(Rr, B - cl);
    c.stroke();
    // name tag: on alternating rows above the helms so the twelve names never collide
    const ty = T + 24 + (hd.lvl ?? 0) * 16;                               // inside the bracket, below the subtitle band
    c.fillStyle = rgba(124, 255, 178, .95 * a); c.textAlign = hd.flank < 0 ? 'right' : 'left'; c.fillText(hd.name.toUpperCase(), hd.flank < 0 ? Rr : L, ty); c.textAlign = 'left';   // names point away from the centre (the subtitle)
    // the order: a beam from the Relic to the helm, drawn on, then a travelling pulse
    const b = eo(ramp(t, P.t0 + .3 + i * .09, P.t0 + .9 + i * .09)); if (b <= 0) return;
    const ex = lerp(relic.cx, hd.hx, b), ey = lerp(relic.cy + relic.h * .18, hd.hy, b);
    c.strokeStyle = rgba(124, 255, 178, .35 * k); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(relic.cx, relic.cy + relic.h * .18); c.lineTo(ex, ey); c.stroke();
    const pu = ((t - P.t0 - i * .09) * .9) % 1;
    if (b >= 1) { const px = lerp(relic.cx, hd.hx, pu), py = lerp(relic.cy + relic.h * .18, hd.hy, pu); c.fillStyle = rgba(190, 255, 220, .8 * k); c.beginPath(); c.arc(px, py, 3, 0, 6.29); c.fill(); }
  });
  // a reticle on the front of the backlog
  const fx = 980 + P.push * 220, fy = depthY(.18) - 30, rr = 46 + Math.sin(t * 4) * 4, ra = ramp(t, P.t0 + 1.2, P.t0 + 1.6) * k;
  c.strokeStyle = rgba(124, 255, 178, .7 * ra); c.lineWidth = 2;
  c.beginPath(); c.arc(fx, fy, rr, 0, 6.29); c.stroke();
  c.beginPath(); c.moveTo(fx - rr - 16, fy); c.lineTo(fx - rr + 10, fy); c.moveTo(fx + rr - 10, fy); c.lineTo(fx + rr + 16, fy);
  c.moveTo(fx, fy - rr - 16); c.lineTo(fx, fy - rr + 10); c.moveTo(fx, fy + rr - 10); c.lineTo(fx, fy + rr + 16); c.stroke();
  c.restore();
}

function table(c, t, P) {
  // the war table under the candle: a parchment map in perspective, lit by the flame; the push dives into it
  const k = P.table; if (k <= .01) return;
  c.save();
  const z = 1 + P.dive * 1.8, ox = 960, oy = 930;
  c.translate(ox, oy); c.scale(z, z); c.translate(-ox, -oy);
  c.globalAlpha = k;
  c.fillStyle = '#0d0907'; c.fillRect(-200, 700, W + 400, 600);                       // the table
  c.strokeStyle = 'rgba(60,40,24,.35)'; c.lineWidth = 1.5;                            // wood grain
  for (let i = 0; i < 26; i++) { const y = 712 + i * 15; c.beginPath(); for (let x = -200; x <= W + 200; x += 40) { const yy = y + Math.sin(x * .004 + i * 1.7) * 3 + Math.sin(x * .013 + i) * 1.5; if (x > -200) c.lineTo(x, yy); else c.moveTo(x, yy); } c.stroke(); }
  c.beginPath(); c.moveTo(330, 760); c.lineTo(1590, 760); c.lineTo(1880, 1120); c.lineTo(40, 1120); c.closePath();
  const pg = c.createLinearGradient(0, 760, 0, 1120); pg.addColorStop(0, '#2a2016'); pg.addColorStop(1, '#4a3a24');
  c.fillStyle = pg; c.fill();                                                         // the map, parchment
  c.strokeStyle = 'rgba(120,96,60,.6)'; c.lineWidth = 3; c.stroke();                  // its worn edge
  c.save(); c.clip();
  // ink: the horizon of the map, the cathedral glyph, contour lines, our line (green), the backlog (red ticks)
  c.strokeStyle = 'rgba(14,10,6,.75)'; c.lineWidth = 2;
  for (let i = 0; i < 9; i++) { c.beginPath(); for (let x = 0; x <= W; x += 24) { const y = 800 + i * 34 + Math.sin(x * .006 + i) * 10 + Math.sin(x * .017 + i * 2) * 4; if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
  c.fillStyle = 'rgba(14,10,6,.85)'; c.beginPath(); c.moveTo(1130, 820); c.lineTo(1140, 790); c.lineTo(1150, 820); c.lineTo(1190, 820); c.lineTo(1196, 800); c.lineTo(1202, 820); c.lineTo(1210, 830); c.lineTo(1120, 830); c.closePath(); c.fill();
  for (let i = 0; i < 12; i++) { const x = 420 + i * 46, y = 1000 + (i % 2) * 22; c.fillStyle = 'rgba(40,120,80,.85)'; c.fillRect(x - 6, y - 6, 12, 12); }
  const R4 = rng(77);
  for (let i = 0; i < 60; i++) { const x = 1060 + R4() * 620, y = 880 + R4() * 200; c.strokeStyle = 'rgba(150,30,24,.8)'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - 5, y - 5); c.lineTo(x + 5, y + 5); c.moveTo(x + 5, y - 5); c.lineTo(x - 5, y + 5); c.stroke(); }
  c.restore();
  // candle light on the table and map
  const fl = .9 + .1 * Math.sin(t * 11) * Math.sin(t * 7.3);
  const g = c.createRadialGradient(960, 990, 10, 960, 990, 900);
  g.addColorStop(0, rgba(255, 190, 110, .30 * fl)); g.addColorStop(.4, rgba(200, 120, 60, .1 * fl)); g.addColorStop(1, rgba(0, 0, 0, 0));
  c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 600, W, 600);
  c.globalCompositeOperation = 'source-over';
  const v = c.createLinearGradient(0, 700, 0, 820); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = v; c.fillRect(-200, 690, W + 400, 140);                                // the far edge falls into the dark
  c.restore();
}

// ---------------------------------------------------------------- the frame
let KN = null;
export function drawField(c, t, P, roster, relic) {
  c.clearRect(0, 0, W, H);
  if (P.field <= .002 && P.table <= .002) return;
  if (!KN) KN = knights(roster);
  if (P.field > .002) {
    c.save();
    c.globalAlpha = P.field;
    const zc = P.zoom, dx = P.drift;
    c.translate(960, HZ); c.scale(zc, zc); c.translate(-960 + dx, -HZ);
    let flash = 0;
    sky(c, t, P.dawn, 0);
    for (const [t0, x0, seed, k] of P.bolts) flash = Math.max(flash, bolt(c, t, t0, x0, seed, k));
    if (flash > 0) { c.fillStyle = rgba(170, 200, 230, .16 * flash); c.fillRect(-400, -200, W + 800, HZ + 240); }
    fires(c, t, P.dawn);
    ruins(c, P.dawn, P.wake);
    ground(c, P.dawn, flash * .4);
    mist(c, t, P.dawn, P.wake);
    horde(c, t, P);
    tags(c, t, P);
    const heads = KN.map((k) => ({ ...knight(c, k, t, P, P.wake), name: k.name, lvl: k.lvl, flank: k.flank }));
    overlay(c, t, P, heads, relic);
    // a soft dark band under the subtitle so it never fights the field (only while it shows)
    if (P.band > 0) {
      const bg = c.createRadialGradient(960, 800, 20, 960, 800, 620);
      bg.addColorStop(0, rgba(2, 3, 4, .62 * P.band)); bg.addColorStop(1, rgba(2, 3, 4, 0));
      c.save(); c.translate(960, 800); c.scale(1, .22); c.translate(-960, -800); c.fillStyle = bg; c.fillRect(300, 0, 1320, 1600); c.restore();
    }
    // the Relic's green on the field once it is awake
    if (P.wake > 0) {
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(relic.cx, relic.cy, 40, relic.cx, relic.cy, 900);
      g.addColorStop(0, rgba(124, 255, 178, .10 * P.wake)); g.addColorStop(1, rgba(124, 255, 178, 0));
      c.fillStyle = g; c.fillRect(-400, -200, W + 800, H + 400);
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
    if (P.dim > 0) { c.fillStyle = rgba(3, 4, 5, P.dim * P.field); c.fillRect(0, 0, W, H); }
  }
  table(c, t, P);
}
