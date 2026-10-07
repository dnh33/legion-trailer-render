// Trailer v5, Act I: the war table and the battlefield (and the field at dawn for the finale).
// Seat CANVAS: pure 2D procedural canvas, matte-painting style. Everything heavy (sky, ground, cathedral, horde and knight
// silhouettes, fog, rain, the parchment map) is painted ONCE into offscreen canvases from seeded noise; a frame only composites them.
// Pure function of t, seeded, no Math.random. Original art: no faction names, no symbols from any franchise.
//   table    a candle on a war table: a parchment map in a brass tray, inked terrain, wooden tokens, a pewter cathedral miniature
//   dive     an ember drops from the candle onto the miniature; the parchment burns open around it and the camera falls through:
//            the miniature grows into the real ruin on the horizon (a match cut), the storm is under the map
//   field    night, rain, fog banks, distant fires; the backlog (a horde of hunched silhouettes, red eyes, ragged banners, six red
//            tags on poles) advances on two flanks of helmed knights; lightning hits the spire and lights the whole scene
//   command  the Relic wakes; green orders run from it to the four units, then from each unit to a tag; each tag flips red to green
//   dawn     after "The work is done.": the same field at dawn, the horde gone, the banners still standing
const W = 1920, H = 1080, HZ = 640, KY = 1800;                  // horizon; the ground at distance d is at y = HZ + KY / d
const SC = (d) => 6 / d;                                         // screen scale of a figure at distance d (1 = 150 px tall)

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t, a, b) => clamp((t - a) / (b - a));
const sm = (x) => x * x * (3 - 2 * x);
const eo = (x) => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, x) => a + (b - a) * x;
const rgba = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${clamp(a).toFixed(3)})`;
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ---------------------------------------------------------------- noise
function hash2(i, j, s) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, o = 5) { let v = 0, a = .5, f = 1, n = 0; for (let k = 0; k < o; k++) { v += a * vnoise(x * f, y * f, s + k * 17); n += a; f *= 2.03; a *= .5; } return v / n; }

// ---------------------------------------------------------------- offscreen helpers
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function tinted(src, col) { const cv = mk(src.width, src.height), g = cv.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, cv.width, cv.height); g.globalCompositeOperation = 'source-over'; return cv; }
function rimOf(mask, dx, dy, col) {              // the band of the shape that faces the light at (-dx, -dy)
  const cv = mk(mask.width, mask.height), g = cv.getContext('2d');
  g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(mask, dx, dy);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, cv.width, cv.height); return cv;
}
function edgeOf(mask, px, col) {                 // outline band: the shape minus the shape eroded by px
  const w = mask.width, h = mask.height, er = mk(w, h), e = er.getContext('2d');
  e.drawImage(mask, px, 0); e.globalCompositeOperation = 'destination-in'; e.drawImage(mask, -px, 0); e.drawImage(mask, 0, px); e.drawImage(mask, 0, -px);
  const cv = mk(w, h), g = cv.getContext('2d'); g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(er, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; return cv;
}
function glowSprite(rgb, n = 128, k = .25) {
  const c = mk(n, n), g = c.getContext('2d'), r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  r.addColorStop(0, `rgba(${rgb},1)`); r.addColorStop(k, `rgba(${rgb},.45)`); r.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = r; g.fillRect(0, 0, n, n); return c;
}
const tri = (g, a, b, c, d, e, f) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); };
function poly(g, pts, fill = true) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); if (fill) g.fill(); }
function parch(g, x0, x1, ys, yb, k = .9) {      // a pointed (gothic) arch opening
  const w = x1 - x0, h = w * k, xm = (x0 + x1) / 2;
  g.moveTo(x0, yb); g.lineTo(x0, ys); g.quadraticCurveTo(x0, ys - h * .62, xm, ys - h); g.quadraticCurveTo(x1, ys - h * .62, x1, ys); g.lineTo(x1, yb); g.closePath();
}

// ---------------------------------------------------------------- the sky (painted once, night and dawn)
function buildSky(dawn) {
  const SW = W + 560, SH = HZ + 90, r = 3, iw = Math.ceil(SW / r), ih = Math.ceil(SH / r);
  const c1 = mk(iw, ih), g1 = c1.getContext('2d'), im = g1.createImageData(iw, ih), D = im.data;
  const c2 = mk(iw, ih), g2 = c2.getContext('2d'), im2 = g2.createImageData(iw, ih), L = im2.data;
  const top = dawn ? [40, 36, 56] : [4, 7, 11], mid = dawn ? [150, 98, 80] : [14, 21, 28], bot = dawn ? [246, 186, 116] : [52, 50, 48];
  const cb = dawn ? [92, 64, 70] : [19, 25, 31], ch = dawn ? [255, 200, 146] : [70, 84, 96], cw = dawn ? [226, 136, 88] : [104, 62, 40];
  for (let j = 0; j < ih; j++) {
    const y = j * r, v = y / SH, k1 = sm(clamp(v / .6)), k2 = clamp((v - .6) / .4);
    const base = [0, 1, 2].map((q) => v < .6 ? lerp(top[q], mid[q], k1) : lerp(mid[q], bot[q], k2 * k2));
    for (let i = 0; i < iw; i++) {
      const x = i * r;
      const wx = (fbm(x / 640, y / 260, 21, 3) - .5) * 2.4;
      const n = fbm(x / 400 + wx, y / 118 + wx * .3, 5, 5), n2 = fbm(x / 400 + wx, (y - 20) / 118 + wx * .3, 5, 5);
      const dens = clamp((n + .12 * Math.sin(v * 3.3) - .43) * 3.4) * (1 - .75 * sm(clamp((v - .78) / .22)));
      const lit = clamp((n - n2) * 8 + .3), warm = Math.pow(v, 3.2);
      const o = (j * iw + i) * 4;
      for (let q = 0; q < 3; q++) {
        const cc = cb[q] + (ch[q] - cb[q]) * lit * .55 + (cw[q] - cb[q]) * warm * .85;
        D[o + q] = lerp(base[q], cc, dens * .92);
      }
      D[o + 3] = 255;
      const fl = dens * (.3 + 1.0 * lit) + (1 - dens) * .22 * (1 - v * .5);
      L[o] = 125 * fl; L[o + 1] = 145 * fl; L[o + 2] = 195 * fl; L[o + 3] = 255;
    }
  }
  g1.putImageData(im, 0, 0); g2.putImageData(im2, 0, 0);
  const up = (src) => { const c = mk(SW, SH), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, SW, SH); return c; };
  return { plate: up(c1), lit: dawn ? null : up(c2), SW, SH };
}

// ---------------------------------------------------------------- the ground plane (mud, puddles, haze)
function buildGround(dawn) {
  const GW = W + 400, GH = H - HZ + 10, r = 2, iw = GW / r, ih = Math.ceil(GH / r);
  const c = mk(iw, ih), g = c.getContext('2d'), im = g.createImageData(iw, ih), D = im.data;
  const s2 = mk(iw, ih), gs = s2.getContext('2d'), im2 = gs.createImageData(iw, ih), S = im2.data;
  const mud = dawn ? [30, 22, 19] : [44, 46, 47], mud2 = dawn ? [50, 36, 28] : [62, 63, 62], pud = dawn ? [214, 150, 92] : [96, 104, 110], haze = dawn ? [176, 126, 88] : [78, 74, 70];
  for (let j = 0; j < ih; j++) {
    const y = j * r + 1.5, d = KY / y, hz = dawn ? Math.pow(clamp(1 - y / 130), 1.6) : Math.pow(clamp(1 - y / 300), 1.2), dk = 1 - .72 * Math.pow(clamp((y - 200) / 240), 1.4);
    for (let i = 0; i < iw; i++) {
      const x = i * r - 200, X = (x - 960) * d / KY * 6;
      const n = fbm(X * .45, d * .5, 7, 4), n2 = fbm(X * 1.6, d * 1.9, 9, 3);
      const p = sm(clamp((n - .57) / .14)) * (1 - hz);
      const o = (j * iw + i) * 4;
      for (let q = 0; q < 3; q++) {
        let v = lerp(mud[q], mud2[q], n2) * (.75 + .5 * n) * dk;
        v = lerp(v, pud[q] * (.55 + .45 * (1 - y / GH)) * (dawn ? 1 : lerp(1, .38, clamp((y - 140) / 260))), p);   // night puddles darken toward camera
        D[o + q] = lerp(v, haze[q], hz);
      }
      D[o + 3] = 255;
      const sh = p * (.5 + .5 * (1 - y / GH)) + n2 * .08;
      S[o] = S[o + 1] = S[o + 2] = 255; S[o + 3] = 255 * clamp(sh);
    }
  }
  g.putImageData(im, 0, 0); gs.putImageData(im2, 0, 0);
  const up = (src) => { const cc = mk(GW, GH), gg = cc.getContext('2d'); gg.imageSmoothingQuality = 'high'; gg.drawImage(src, 0, 0, GW, GH); return cc; };
  return { plate: up(c), sheen: dawn ? null : up(s2) };
}

// ---------------------------------------------------------------- the far ridge: low hills, a broken watchtower, dead trees
function buildRidge() {
  const RW = W + 500, RH = 150, c = mk(RW, RH), g = c.getContext('2d'), R = rng(3301), base = RH - 12;
  const layer = (col, amp, sd, yo) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, RH);
    for (let x = 0; x <= RW; x += 6) g.lineTo(x, base - yo - amp * fbm(x / 260, 0, sd, 4) - 6 * fbm(x / 30, 0, sd + 3, 2));
    g.lineTo(RW, RH); g.closePath(); g.fill();
  };
  layer('rgb(36,40,43)', 70, 40, 18);
  layer('rgb(27,31,34)', 46, 41, 4);
  g.fillStyle = 'rgb(27,31,34)';
  // a broken watchtower on the left hill
  const tx = 470; poly(g, [tx - 16, base, tx - 13, base - 92, tx - 4, base - 100, tx + 2, base - 88, tx + 9, base - 104, tx + 14, base - 80, tx + 17, base]);
  g.clearRect(tx - 4, base - 70, 5, 12);
  // dead trees
  g.strokeStyle = 'rgb(27,31,34)'; g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = R() * RW, hgt = 14 + R() * 26, y0 = base - 4 - 30 * fbm(x / 260, 0, 41, 4);
    g.lineWidth = 2; g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (R() - .5) * 4, y0 - hgt); g.stroke();
    g.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const yy = y0 - hgt * (.4 + .2 * k); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (R() - .5) * 18, yy - 6 - R() * 8); g.stroke(); }
  }
  return c;
}

// ---------------------------------------------------------------- the cathedral (original gothic ruin: two towers, a spire, a rose
// window, a broken nave arcade and two flying buttresses), painted in local coordinates, ground at y = 640
const CW = 720, CHh = 650, CG = 640;
const CATH = { x: 1360, base: HZ + 8, s: .8, tip: [125, 18], rose: [235, 312] };
function cathMask() {
  const c = mk(CW, CHh), g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'butt'; g.lineJoin = 'miter';
  // left flyer and its pier
  g.fillRect(4, 410, 24, CG - 410); tri(g, 2, 412, 16, 352, 30, 412);
  g.lineWidth = 11; g.beginPath(); g.moveTo(22, 424); g.quadraticCurveTo(36, 352, 74, 340); g.stroke();
  // left tower, corner buttresses, belfry, spire, pinnacles
  g.fillRect(70, 230, 110, CG - 230);
  poly(g, [56, CG, 56, 470, 62, 456, 62, 330, 68, 314, 72, 314, 72, CG]); poly(g, [194, CG, 194, 470, 188, 456, 188, 330, 182, 314, 178, 314, 178, CG]);
  g.fillRect(80, 146, 90, 10); g.fillRect(84, 154, 82, 80);
  poly(g, [88, 152, 125, 18, 162, 152]);
  for (let k = 1; k <= 6; k++) {                                   // crockets on both edges of the spire
    const f = k / 7.5, lx = lerp(88, 125, f), rx = lerp(162, 125, f), y = lerp(152, 18, f);
    tri(g, lx + 1, y + 6, lx - 6, y - 2, lx + 3, y - 6); tri(g, rx - 1, y + 6, rx + 6, y - 2, rx - 3, y - 6);
  }
  tri(g, 78, 154, 85, 100, 92, 154); tri(g, 158, 154, 165, 100, 172, 154); tri(g, 120, 154, 125, 128, 130, 154);
  // the centre: west front with a gable and a finial
  g.fillRect(180, 250, 110, CG - 250); poly(g, [174, 254, 235, 162, 296, 254]); tri(g, 230, 172, 235, 132, 240, 172);
  // right tower, broken off
  poly(g, [290, CG, 290, 300, 300, 282, 311, 296, 322, 260, 334, 276, 349, 238, 360, 266, 372, 296, 386, 312, 400, 326, 400, CG]);
  poly(g, [398, CG, 398, 380, 404, 364, 414, 364, 414, CG]);
  // the nave: an arcade of pointed arches, a broken clerestory, rafters, two flying buttresses to tall pinnacled piers
  g.fillRect(400, 420, 320, CG - 420);
  g.beginPath(); g.moveTo(400, 424); g.lineTo(400, 300); g.lineTo(438, 304); g.lineTo(452, 290); g.lineTo(470, 310); g.lineTo(500, 316); g.lineTo(512, 300);
  g.lineTo(530, 336); g.lineTo(556, 346); g.lineTo(574, 372); g.lineTo(600, 380); g.lineTo(624, 404); g.lineTo(720, 410); g.lineTo(720, 424); g.closePath(); g.fill();
  for (const [x, h] of [[520, 268], [548, 312], [600, 352]]) poly(g, [x - 3, 400, x - 1, h, x + 3, h + 6, x + 4, 400]);
  for (const [px, top] of [[470, 340], [610, 372]]) {
    g.fillRect(px, top, 18, CG - top); tri(g, px - 3, top + 2, px + 9, top - 52, px + 21, top + 2);
    tri(g, px - 6, top + 26, px - 2, top - 2, px + 2, top + 26); tri(g, px + 16, top + 26, px + 20, top - 2, px + 24, top + 26);
    g.lineWidth = 10; g.beginPath(); g.moveTo(px + 2, top + 22); g.quadraticCurveTo(px - 18, top - 14, px - 52, top - 24); g.stroke();
  }
  // rubble along the foot
  const R = rng(611); g.beginPath(); g.moveTo(0, CHh);
  for (let x = 0; x <= CW; x += 12) g.lineTo(x, CG - 8 - R() * 22 - (x > 400 ? 26 * Math.sin((x - 400) / 320 * Math.PI) : 0));
  g.lineTo(CW, CHh); g.closePath(); g.fill();
  // ---- openings
  g.globalCompositeOperation = 'destination-out'; g.beginPath();
  parch(g, 96, 117, 186, 228, 1.0); parch(g, 133, 154, 186, 228, 1.0);           // belfry lancets
  parch(g, 112, 138, 320, 430, 1.1);                                               // tower lancet
  parch(g, 205, 265, 528, CG, .85);                                                // the portal
  for (let k = 0; k < 5; k++) parch(g, 191 + k * 18, 203 + k * 18, 398, 414, 1);    // gallery under the rose
  parch(g, 328, 360, 372, 470, 1.1); parch(g, 334, 354, 520, 566, 1.1);              // right tower lancets
  for (const [a, b2] of [[418, 466], [492, 556], [632, 704]]) parch(g, a, b2, 470, 604, .9);   // nave arcade
  parch(g, 412, 436, 336, 392, 1.1); parch(g, 444, 466, 340, 398, 1.1);              // clerestory remains
  g.fill();
  g.beginPath(); g.arc(235, 312, 46, 0, 6.2832); g.fill();
  g.globalCompositeOperation = 'source-over';
  // rose window tracery
  g.lineWidth = 6; g.beginPath(); g.arc(235, 312, 45, 0, 6.2832); g.stroke();
  g.lineWidth = 4.5; g.beginPath(); g.arc(235, 312, 15, 0, 6.2832); g.stroke();
  g.lineWidth = 3.4; g.beginPath();
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.2832; g.moveTo(235 + Math.cos(a) * 15, 312 + Math.sin(a) * 15); g.lineTo(235 + Math.cos(a) * 45, 312 + Math.sin(a) * 45); }
  g.stroke();
  g.lineWidth = 2.4; for (let k = 0; k < 12; k++) { const a = (k + .5) / 12 * 6.2832; g.beginPath(); g.arc(235 + Math.cos(a) * 32, 312 + Math.sin(a) * 32, 7, 0, 6.2832); g.stroke(); }
  // one broken sector: the glass and tracery fell out
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(235, 312); g.arc(235, 312, 44, .2, .9); g.closePath(); g.fill();
  return c;
}
function cathBody(mask, dawn) {
  const c = tinted(mask, dawn ? 'rgb(40,30,30)' : 'rgb(19,25,31)'), g = c.getContext('2d');
  g.globalCompositeOperation = 'source-atop';
  const R = rng(77);
  g.fillStyle = dawn ? 'rgba(255,200,150,.05)' : 'rgba(150,170,190,.045)';
  for (let y = 20; y < CG; y += 9) g.fillRect(0, y, CW, 1.2);                     // stone courses
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${dawn ? '255,210,170' : '160,180,200'},${(.02 + R() * .05).toFixed(3)})`; g.fillRect(R() * CW, R() * CG, 2 + R() * 7, 1 + R() * 3); }
  const v = g.createLinearGradient(0, 0, 0, CHh); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(.75, 'rgba(0,0,0,0)'); v.addColorStop(1, dawn ? 'rgba(150,110,80,.35)' : 'rgba(46,52,56,.6)');
  g.fillStyle = v; g.fillRect(0, 0, CW, CHh);                                       // ground haze climbs the base
  return c;
}
function cathWindows() {                          // fire inside the ruin, seen only through the openings
  const c = mk(CW, CHh), g = c.getContext('2d');
  const blob = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,170,80,${a})`); gr.addColorStop(.5, `rgba(230,100,40,${a * .6})`); gr.addColorStop(1, 'rgba(160,50,20,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
  g.save(); g.beginPath(); g.arc(235, 312, 46, 0, 6.2832); parch(g, 205, 265, 528, CG, .85); parch(g, 112, 138, 320, 430, 1.1); parch(g, 328, 360, 372, 470, 1.1);
  for (let k = 0; k < 5; k++) parch(g, 191 + k * 18, 203 + k * 18, 398, 414, 1);
  parch(g, 418, 466, 470, 604, .9); parch(g, 492, 556, 470, 604, .9); g.clip();
  blob(235, 320, 70, .9); blob(235, 600, 90, .95); blob(125, 380, 70, .6); blob(345, 430, 70, .6); blob(470, 580, 110, .8); blob(235, 405, 50, .7);
  g.restore(); return c;
}

// ---------------------------------------------------------------- the horde: four silhouette types x four gait poses
// base units: feet at (0,0), about 150 tall; sprite box x [-72, 72], y [-236, 6]
const HB = { x: 72, y: 236, w: 144, h: 242 };
const EYES = [[-5, -121], [-4, -139], [-4, -139], [-4, -131]];
function creature(g, type, pose) {
  const ph = pose * Math.PI / 2, st = Math.sin(ph), bob = Math.abs(Math.cos(ph)) * 3;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const leg = (pts, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
  if (type === 0) {                                                // grunt: hunched, horned, a cleaver
    leg([-14 + st * 7, 0, -18, -24, -10, -48], 10); leg([12 - st * 7, 0, 16, -24, 9, -48], 10);
    g.save(); g.translate(0, -bob);
    g.beginPath(); g.moveTo(-30, -44); g.bezierCurveTo(-52, -60, -52, -104, -30, -124); g.bezierCurveTo(-14, -138, 14, -140, 30, -126); g.bezierCurveTo(52, -106, 52, -62, 30, -44); g.closePath(); g.fill();
    tri(g, -36, -112, -50, -146, -24, -124); tri(g, -20, -128, -22, -160, -8, -134); tri(g, 8, -134, 18, -158, 22, -128); tri(g, 26, -122, 46, -142, 36, -108);
    g.beginPath(); g.moveTo(-7, -128); g.quadraticCurveTo(-22, -136, -24, -158); g.quadraticCurveTo(-14, -142, -1, -134); g.fill();
    g.beginPath(); g.moveTo(7, -128); g.quadraticCurveTo(22, -136, 24, -158); g.quadraticCurveTo(14, -142, 1, -134); g.fill();
    g.beginPath(); g.arc(0, -118, 13, 0, 6.2832); g.fill();
    leg([-36, -108, -52 - st * 4, -82, -46 - st * 8, -50], 11);
    tri(g, -52 - st * 8, -50, -56 - st * 8, -36, -44 - st * 8, -44);
    const hx = 46 + st * 5, hy = -66 - st * 6; leg([34, -108, 50, -90, hx, hy], 11);
    poly(g, [hx - 4, hy + 4, hx + 4, hy - 46, hx + 18, hy - 54, hx + 14, hy - 28, hx + 6, hy + 4]);
    g.restore();
  } else if (type === 1 || type === 2) {                           // lurker: tall, hooded, ragged cloak, a pike (and a ragged banner)
    leg([-8 + st * 6, 0, -6, -40], 7); leg([8 - st * 6, 0, 6, -40], 7);
    g.save(); g.translate(0, -bob);
    g.beginPath(); g.moveTo(-4, -168); g.lineTo(-14, -146); g.bezierCurveTo(-24, -136, -28, -124, -28, -110); g.lineTo(-34, -24);
    const hem = [-30, -6, -24, -16, -18, 0, -10, -12, -2, 2, 6, -9, 14, 2, 22, -14, 30, -3, 33, -26];
    for (let i = 0; i < hem.length; i += 2) g.lineTo(hem[i], hem[i + 1] - 18);
    g.lineTo(26, -108); g.bezierCurveTo(26, -126, 20, -138, 12, -148); g.closePath(); g.fill();
    tri(g, -26, -118, -40, -132, -20, -128);
    g.lineWidth = 3.5; g.beginPath(); g.moveTo(30, -4); g.lineTo(34, -206); g.stroke();
    tri(g, 30, -203, 34, -232, 38, -203); tri(g, 34, -196, 44, -206, 36, -188);
    leg([20, -118, 30, -104, 32, -96], 7);
    if (type === 2) {
      const w = st * 4; g.beginPath(); g.moveTo(34, -200); g.lineTo(-18 + w, -196 + w * .5);
      const jag = [-16 + w, -150, -8 + w, -160, 0 + w * .7, -142, 8 + w * .5, -158, 16 + w * .4, -144, 24, -156, 34, -150];
      for (let i = 0; i < jag.length; i += 2) g.lineTo(jag[i], jag[i + 1]); g.closePath(); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(4 + w * .6, -180, 4, 0, 6.2832); g.arc(18, -170, 3, 0, 6.2832); g.fill(); g.globalCompositeOperation = 'source-over';
    }
    g.restore();
  } else {                                                          // brute: wide, a tiny head, a spiked club raised
    leg([-18 + st * 5, 0, -21, -38], 15); leg([18 - st * 5, 0, 21, -38], 15);
    g.save(); g.translate(0, -bob);
    g.beginPath(); g.moveTo(-40, -34); g.bezierCurveTo(-64, -60, -62, -118, -36, -130); g.bezierCurveTo(-14, -140, 14, -140, 36, -130); g.bezierCurveTo(62, -118, 64, -60, 40, -34); g.closePath(); g.fill();
    g.beginPath(); g.arc(0, -131, 11, 0, 6.2832); g.fill();
    poly(g, [-58, -112, -70, -132, -52, -124, -54, -146, -40, -128, -36, -150, -28, -130, -24, -124]);
    leg([-44, -106, -58, -80, -54 - st * 6, -52], 13);
    const hy = -164 - st * 7; leg([34, -116, 48, -138, 46, hy], 13);
    poly(g, [40, hy + 6, 52, hy + 4, 34, hy - 52, 18, hy - 46]);
    tri(g, 22, hy - 30, 12, hy - 34, 22, hy - 38); tri(g, 38, hy - 40, 46, hy - 46, 36, hy - 48); tri(g, 26, hy - 50, 24, hy - 62, 32, hy - 52);
    g.restore();
  }
  return bob;
}
function hordeMask(type, pose, rs) {
  const c = mk(HB.w * rs, HB.h * rs), g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  g.scale(rs, rs); g.translate(HB.x, HB.y); creature(g, type, pose); return c;
}
// depth buckets: distance range, sprite resolution, fog amount
const BUCKETS = [[6, 10, 1], [10, 15, .66], [15, 22, .45], [22, 32, .31], [32, 48, .21]].map(([a, b, rs]) => ({ a, b, rs, fog: 1 - Math.exp(-((a + b) / 2) / 34) }));
const bucketOf = (d) => { for (let i = 0; i < BUCKETS.length; i++) if (d < BUCKETS[i].b) return i; return BUCKETS.length - 1; };
function buildHorde(dawn) {
  const near = [7, 9, 11], fog = dawn ? [200, 150, 104] : [56, 66, 72];
  const sprites = BUCKETS.map((B) => {
    const col = near.map((v, q) => Math.round(lerp(v, fog[q], B.fog)));
    return [0, 1, 2, 3].map((type) => [0, 1, 2, 3].map((pose) => {
      const m = hordeMask(type, pose, B.rs), c = tinted(m, `rgb(${col})`), g = c.getContext('2d');
      const rim = rimOf(m, 0, Math.max(1, 3 * B.rs), 'rgb(150,84,46)');   // warm top rim from the fires behind
      g.globalAlpha = .28 * (1 - B.fog); g.drawImage(rim, 0, 0);
      // red eyes, baked: a soft glow and two hot slits
      const bob = Math.abs(Math.cos(pose * Math.PI / 2)) * 3, [ex, ey] = EYES[type], X = (HB.x + ex) * B.rs, Y = (HB.y + ey - bob) * B.rs, e = 3 * B.rs, ea = 1 - B.fog * .6;
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = .7 * ea; g.drawImage(GLOW_RED, X - e * 3 + 4 * B.rs, Y - e * 2.2, e * 6, e * 4.4);
      g.globalAlpha = ea; g.fillStyle = 'rgb(255,92,70)'; g.fillRect(X, Y, Math.max(1, e * .9), Math.max(1, e * .55)); g.fillRect(X + 8 * B.rs, Y, Math.max(1, e * .9), Math.max(1, e * .55));
      return c;
    }));
  });
  const rims = [0, 1, 2, 3].map((type) => [0, 1, 2, 3].map((pose) => { const m = hordeMask(type, pose, 1); return rimOf(m, 1, 4, 'rgb(190,215,255)'); }));
  return { sprites, rims };
}
function buildStrip(dmin, dmax, n, seed, rs) {   // a band of the horde painted once, two gait variants; d in [dmin, dmax]
  const SW = W + 900, top = HZ + KY / dmax - HB.y * SC(dmin) - 10, bot = HZ + KY / dmin + 8, R = rng(seed);
  const fog = [56, 66, 72], near = [7, 9, 11], LV = 6, k0 = 1 - Math.exp(-dmin / 30), k1 = 1 - Math.exp(-dmax / 30);
  const masks = [0, 1, 2, 3].map((type) => [0, 1, 2, 3].map((pose) => hordeMask(type, pose, rs)));
  const tints = masks.map((ps) => ps.map((m) => Array.from({ length: LV }, (_, l) => tinted(m, `rgb(${near.map((v, q) => Math.round(lerp(v, fog[q], lerp(k0, k1, l / (LV - 1)))))})`))));
  const figs = [];
  for (let i = 0; i < n; i++) { const d = Math.sqrt(dmin * dmin + R() * (dmax * dmax - dmin * dmin)); figs.push({ d, x: R() * SW, type: Math.floor(R() * 4), ph: Math.floor(R() * 4), eye: R() < .7 }); }
  figs.sort((p, q) => q.d - p.d);
  const vars = [0, 1].map((vv) => {
    const c = mk(SW, bot - top), g = c.getContext('2d'), eyes = [];
    for (const f of figs) {
      const s = SC(f.d), y = HZ + KY / f.d - top, l = Math.round(clamp((f.d - dmin) / (dmax - dmin)) * (LV - 1)), pose = (f.ph + vv * 2) % 4;
      g.drawImage(tints[f.type][pose][l], f.x - HB.x * s, y - HB.y * s - (pose % 2 === 0 ? 3 * s : 0) * 0, HB.w * s, HB.h * s);
      if (f.eye) eyes.push([f.x + EYES[f.type][0] * s, y + (EYES[f.type][1] - (pose % 2 === 0 ? 3 : 0)) * s, s, f.d]);
    }
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, s, d] of eyes) { const e = Math.max(1, 2.6 * s), a = .85 * Math.exp(-(d - dmin) / 60); g.globalAlpha = a * .6; g.drawImage(GLOW_RED, x - e * 2.5 + 4 * s, y - e * 2, e * 5, e * 4); g.globalAlpha = a; g.fillStyle = 'rgb(255,80,60)'; g.fillRect(x, y, e * .9, e * .6); g.fillRect(x + 8 * s, y, e * .9, e * .6); }
    return c;
  });
  return { vars, top, SW, dref: (dmin + dmax) / 2, dmin, dmax };
}
const GLOW_RED = (() => { try { return glowSprite('255,50,40', 32, .2); } catch { return null; } })();

// ---------------------------------------------------------------- sigils: the muster banners' gold glyph family. trailer.html's glyph()
// has three: 'lead' (Zealot), 'code' (Builder) and 'eye' (Scout); Builder's and Scout's are ported 1:1 here, and the family is extended
// to every office in the same grammar: a 60-unit box, 5-unit gold strokes, round joins. All marks are original.
const SIGIL = {
  builder(g) { g.strokeRect(-11, -11, 22, 22); for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { g.save(); g.scale(sx, sy); g.beginPath(); g.moveTo(-11, -11); g.lineTo(-11, -21); g.arc(-21, -21, 10, 0, Math.PI / 2, true); g.closePath(); g.stroke(); g.restore(); } },
  scout(g) { g.beginPath(); g.arc(0, 0, 30, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(0, 0, 15, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(0, 0, 5, 0, 6.2832); g.fill(); },
  inquisitor(g) { g.beginPath(); g.arc(-7, -7, 17, 0, 6.2832); g.stroke(); g.save(); g.lineWidth *= 1.6; g.beginPath(); g.moveTo(6, 6); g.lineTo(25, 25); g.stroke(); g.restore(); g.beginPath(); g.arc(-7, -7, 9, 3.6, 4.9); g.stroke(); },
  scribe(g) { g.beginPath(); g.moveTo(24, -29); g.quadraticCurveTo(2, -26, -14, 12); g.lineTo(-21, 27); g.lineTo(-9, 17); g.quadraticCurveTo(20, -2, 24, -29); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(20, -24); g.lineTo(-17, 22); g.stroke(); },
  archivist(g) { g.beginPath(); g.arc(-14, -14, 10, 0, 6.2832); g.stroke(); g.beginPath(); g.moveTo(-7, -7); g.lineTo(24, 24); g.moveTo(12, 12); g.lineTo(5, 19); g.moveTo(19, 19); g.lineTo(12, 26); g.stroke(); },
  sentinel(g) { g.beginPath(); g.moveTo(-13, 28); g.lineTo(-13, -14); g.lineTo(-18, -14); g.lineTo(-18, -27); g.lineTo(-9, -27); g.lineTo(-9, -21); g.lineTo(-3, -21); g.lineTo(-3, -27); g.lineTo(3, -27); g.lineTo(3, -21); g.lineTo(9, -21); g.lineTo(9, -27); g.lineTo(18, -27); g.lineTo(18, -14); g.lineTo(13, -14); g.lineTo(13, 28); g.closePath(); g.stroke(); g.beginPath(); g.arc(0, -2, 4, 0, 6.2832); g.fill(); },
  forgemaster(g) { g.beginPath(); g.moveTo(-26, -2); g.lineTo(24, -2); g.quadraticCurveTo(18, 6, 8, 7); g.lineTo(12, 18); g.lineTo(18, 25); g.lineTo(-16, 25); g.lineTo(-10, 18); g.lineTo(-6, 7); g.quadraticCurveTo(-20, 6, -26, -2); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(-10, -12); g.lineTo(12, -30); g.stroke(); g.save(); g.translate(12, -30); g.rotate(-.69); g.strokeRect(-11, -5, 22, 10); g.restore(); },
  exorcist(g) { g.beginPath(); g.ellipse(0, 5, 10, 14, 0, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(0, -14, 5.5, 0, 6.2832); g.stroke(); g.beginPath(); for (const y of [-2, 6, 14]) { g.moveTo(-10, y); g.lineTo(-20, y - 6); g.moveTo(10, y); g.lineTo(20, y - 6); } g.stroke(); g.beginPath(); g.moveTo(-26, 26); g.lineTo(26, -26); g.stroke(); },
  preceptor(g) { g.beginPath(); g.arc(0, -22, 6, 0, 6.2832); g.stroke(); g.beginPath(); g.moveTo(-3, -17); g.lineTo(-18, 27); g.moveTo(3, -17); g.lineTo(18, 27); g.stroke(); g.beginPath(); g.arc(0, -22, 34, 1.05, 2.09); g.stroke(); },
  herald(g) { g.beginPath(); g.moveTo(-26, -5); g.quadraticCurveTo(-4, -6, 14, -19); g.lineTo(21, -27); g.lineTo(26, -2); g.lineTo(17, -5); g.quadraticCurveTo(-3, 8, -26, 6); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(-26, -9); g.lineTo(-26, 10); g.stroke(); },
  assayer(g) { g.beginPath(); g.moveTo(0, -27); g.lineTo(0, 24); g.moveTo(-12, 25); g.lineTo(12, 25); g.moveTo(-25, -17); g.lineTo(25, -17); g.moveTo(-21, -17); g.lineTo(-28, 4); g.moveTo(-21, -17); g.lineTo(-14, 4); g.moveTo(21, -17); g.lineTo(14, 4); g.moveTo(21, -17); g.lineTo(28, 4); g.stroke(); g.beginPath(); g.arc(-21, 4, 8, 0, Math.PI); g.stroke(); g.beginPath(); g.arc(21, 4, 8, 0, Math.PI); g.stroke(); },
  sculptor(g) { g.beginPath(); g.moveTo(-25, -8); g.lineTo(-12, -23); g.lineTo(12, -23); g.lineTo(25, -8); g.lineTo(0, 27); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(-25, -8); g.lineTo(25, -8); g.moveTo(-12, -23); g.lineTo(-6, -8); g.lineTo(0, 27); g.moveTo(12, -23); g.lineTo(6, -8); g.lineTo(0, 27); g.stroke(); },
};
function drawSigil(g, id, x, y, size, col, lw = 5) {
  const f = SIGIL[id]; if (!f) return;
  g.save(); g.translate(x, y); g.scale(size / 60, size / 60); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; f(g); g.restore();
}

// ---------------------------------------------------------------- the knights: twelve named figures in four units of three, seen from
// behind and a little to the side, facing into the field. Base units: feet at (0,0), helm crown near -290. Each knight is painted once,
// at its own screen scale (night, awake and lightning-rim sprites), so a frame is a 1:1 blit per knight.
// Light: cold sky from above, warm fire backlight from the horizon (rim), the Relic's green from above the centre once awake.
const KSPEC = [ // x, feet y, px per unit, helm, weapon, looks back. Left flank, then right flank (screen x; the right is drawn mirrored)
  [128, 1186, 2.0, 'great', 'spear', 0], [338, 1072, 1.3, 'sallet', 'banner', 0], [236, 1002, 1.0, 'bascinet', 'sword', 0],        // unit L1
  [520, 978, .9, 'barbute', 'spear', 0], [424, 958, .78, 'great', 'banner', 0], [602, 946, .68, 'sallet', 'sword', 0],             // unit L2
  [1792, 1186, 2.0, 'great', 'poleaxe', 1], [1582, 1072, 1.3, 'great', 'banner', 0], [1684, 1002, 1.0, 'barbute', 'spear', 0],  // unit R1
  [1400, 978, .9, 'sallet', 'spear', 0], [1496, 958, .78, 'bascinet', 'banner', 0], [1318, 946, .68, 'great', 'sword', 0],         // unit R2
];
const VISOR = { great: [31, -256], sallet: [30, -256], bascinet: [36, -251], barbute: [28, -250] };
const KTOP = { spear: -570, banner: -660, sword: -440, poleaxe: -530 };
export function knights(roster) {
  const rs = roster.slice(1);
  return KSPEC.map(([x, y, s, helm, weapon, look], i) => {
    const side = i < 6 ? 0 : 1, j = i % 6, idx = side === 0 ? j : 6 + (5 - j);
    const [id, name, , hue] = rs[idx];
    return { id, name, hue, flank: side === 0 ? -1 : 1, x, y, s, helm, weapon, look, unit: side === 0 ? (j < 3 ? 0 : 1) : (j < 3 ? 3 : 2), ph: (idx * 2.399) % 6.28 };
  });
}
function steelGrad(g, x0, x1, k = 1) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, `rgb(${24 * k | 0},${27 * k | 0},${32 * k | 0})`); gr.addColorStop(.28, `rgb(${70 * k | 0},${78 * k | 0},${88 * k | 0})`);
  gr.addColorStop(.42, `rgb(${104 * k | 0},${114 * k | 0},${126 * k | 0})`); gr.addColorStop(.62, `rgb(${40 * k | 0},${45 * k | 0},${52 * k | 0})`); gr.addColorStop(1, `rgb(${16 * k | 0},${18 * k | 0},${22 * k | 0})`);
  return gr;
}
function drawKnight(g, K, mask) {
  const F = (c) => (mask ? '#fff' : c), [hr, hg, hb] = hex(K.hue), pale = Math.max(hr, hg, hb) > 190 ? .62 : 1;
  const dye = (k, a = 1) => F(`rgba(${hr * k * pale | 0},${hg * k * pale | 0},${hb * k * pale | 0},${a})`);
  const gold = F('rgb(196,156,72)'), goldHi = F('rgb(240,206,128)'), dark = F('rgb(10,11,13)');
  g.lineCap = 'round'; g.lineJoin = 'round';
  const W2 = K.weapon;
  // ---- the weapon's shaft, behind the body
  if (W2 === 'spear' || W2 === 'poleaxe') {
    const x0 = 46, y0 = -40, x1 = W2 === 'spear' ? 22 : 30, y1 = W2 === 'spear' ? -500 : -470;
    g.strokeStyle = F('rgb(58,42,28)'); g.lineWidth = 6.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    if (!mask) { g.strokeStyle = 'rgba(160,130,96,.45)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0 - 2, y0); g.lineTo(x1 - 2, y1); g.stroke(); }
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    g.fillStyle = F('rgb(120,128,138)'); g.strokeStyle = F('rgb(120,128,138)');
    if (W2 === 'spear') {                                              // a leaf blade and a socket ring
      const tx = x1 + ux * 52, ty = y1 + uy * 52, mx = x1 + ux * 18, my = y1 + uy * 18;
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(mx + nx * 8, my + ny * 8); g.lineTo(tx, ty); g.lineTo(mx - nx * 8, my - ny * 8); g.closePath(); g.fill();
      if (!mask) { g.strokeStyle = 'rgba(220,230,240,.8)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x1 + ux * 4, y1 + uy * 4); g.lineTo(tx, ty); g.stroke(); }
      g.fillStyle = gold; g.fillRect(x1 - 4, y1 - 3, 8, 6);
    } else {                                                           // poleaxe: a crescent blade, a back hammer, a top spike
      const hx = x1 + ux * 6, hy = y1 + uy * 6;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - nx * 6 + ux * 2, hy - ny * 6 + uy * 2); g.quadraticCurveTo(hx - nx * 40 + ux * 26, hy - ny * 40 + uy * 26, hx - nx * 34 - ux * 26, hy - ny * 34 - uy * 26); g.quadraticCurveTo(hx - nx * 22, hy - ny * 22, hx - nx * 6 - ux * 16, hy - ny * 6 - uy * 16); g.closePath(); g.fill();
      g.fillRect(hx + nx * 4 - 5, hy + ny * 4 - 5, 14, 10);
      g.beginPath(); g.moveTo(x1 + nx * 3, y1 + ny * 3); g.lineTo(x1 + ux * 46, y1 + uy * 46); g.lineTo(x1 - nx * 3, y1 - ny * 3); g.closePath(); g.fill();
      if (!mask) { g.strokeStyle = 'rgba(220,230,240,.75)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(hx - nx * 34 - ux * 26, hy - ny * 34 - uy * 26); g.quadraticCurveTo(hx - nx * 40 + ux * 26, hy - ny * 40 + uy * 26, hx - nx * 6 + ux * 2, hy - ny * 6 + uy * 2); g.stroke(); }
    }
  }
  if (W2 === 'banner') {                                               // the pole and its crossbar; the cloth moves and is drawn per frame
    g.strokeStyle = F('rgb(58,42,28)'); g.lineWidth = 7; g.beginPath(); g.moveTo(50, -40); g.lineTo(56, -640); g.stroke();
    g.strokeStyle = gold; g.lineWidth = 5; g.beginPath(); g.moveTo(10, -620); g.lineTo(102, -620); g.stroke();
    g.fillStyle = gold; g.beginPath(); g.arc(10, -620, 5, 0, 6.2832); g.arc(102, -620, 5, 0, 6.2832); g.fill();
    g.beginPath(); g.moveTo(51, -638); g.lineTo(56, -660); g.lineTo(61, -638); g.closePath(); g.fill();
  }
  // ---- legs (greaves), mostly lost behind the ridge
  g.fillStyle = mask ? '#fff' : steelGrad(g, -34, -6, .55); g.fillRect(-32, -122, 22, 124);
  g.fillStyle = mask ? '#fff' : steelGrad(g, 4, 30, .55); g.fillRect(6, -118, 22, 120);
  // ---- scabbard on the left hip
  g.strokeStyle = F('rgb(22,16,12)'); g.lineWidth = 7; g.beginPath(); g.moveTo(-54, -104); g.lineTo(-78, -24); g.stroke();
  g.strokeStyle = gold; g.lineWidth = 3; g.beginPath(); g.moveTo(-76, -32); g.lineTo(-79, -20); g.stroke();
  // ---- the cloak, with folds, the agent's colour trim and its sigil embroidered in gold
  const cloak = () => { g.beginPath(); g.moveTo(-46, -208); g.bezierCurveTo(-66, -172, -74, -92, -80, -6);
    const hem = [-68, -14, -56, -2, -44, -12, -30, 1, -16, -9, -2, 2, 12, -8, 26, 1, 40, -9, 52, 0, 62, -6];
    for (let i = 0; i < hem.length; i += 2) g.lineTo(hem[i], hem[i + 1]);
    g.bezierCurveTo(58, -92, 54, -170, 42, -206); g.closePath(); };
  cloak();
  if (mask) { g.fillStyle = '#fff'; g.fill(); }
  else {
    const gr = g.createLinearGradient(-80, 0, 62, 0), tint = (v, k) => (v * (1 - k) + (k ? [hr, hg, hb][0] : 0) * 0) | 0; void tint;
    const base = (a) => `rgb(${(14 + hr * .07 * pale * a) | 0},${(15 + hg * .07 * pale * a) | 0},${(18 + hb * .07 * pale * a) | 0})`;
    gr.addColorStop(0, 'rgb(8,9,11)'); gr.addColorStop(.3, base(1.2)); gr.addColorStop(.55, base(1.6)); gr.addColorStop(.8, base(.9)); gr.addColorStop(1, 'rgb(7,8,10)');
    g.fillStyle = gr; g.fill();
    g.save(); cloak(); g.clip();
    const vg = g.createLinearGradient(0, -210, 0, 0); vg.addColorStop(0, 'rgba(90,100,112,.22)'); vg.addColorStop(.25, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = vg; g.fillRect(-90, -215, 160, 220);
    for (const [x, w] of [[-56, 5], [-34, 6], [-12, 5], [12, 6], [36, 5]]) {          // folds: a shadow and a lit edge
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = w; g.beginPath(); g.moveTo(x * .6, -190); g.quadraticCurveTo(x * 1.05, -100, x * 1.2, 0); g.stroke();
      g.strokeStyle = 'rgba(150,160,175,.07)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x * .6 + 5, -186); g.quadraticCurveTo(x * 1.05 + 6, -100, x * 1.2 + 7, 0); g.stroke();
    }
    drawSigil(g, K.id, -10, -158, 40, 'rgba(196,156,72,.6)', 5);
    g.restore();
    // trim along the hem and the leading edge
    g.strokeStyle = dye(.72); g.lineWidth = 7; g.beginPath();
    const hem = [-80, -6, -68, -14, -56, -2, -44, -12, -30, 1, -16, -9, -2, 2, 12, -8, 26, 1, 40, -9, 52, 0, 62, -6];
    g.moveTo(hem[0], hem[1]); for (let i = 2; i < hem.length; i += 2) g.lineTo(hem[i], hem[i + 1]); g.stroke();
    g.beginPath(); g.moveTo(62, -6); g.bezierCurveTo(58, -92, 54, -170, 42, -206); g.stroke();
    g.strokeStyle = 'rgba(206,166,80,.8)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(hem[0] + 2, hem[1] - 6); for (let i = 2; i < hem.length; i += 2) g.lineTo(hem[i], hem[i + 1] - 6); g.stroke();
  }
  // ---- the tabard, showing under the cloak on the field side
  g.fillStyle = dye(.55); g.beginPath(); g.moveTo(40, -194); g.lineTo(54, -192); g.lineTo(60, -72); g.lineTo(45, -70); g.closePath(); g.fill();
  if (!mask) { g.strokeStyle = 'rgba(206,166,80,.85)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(54, -192); g.lineTo(60, -72); g.stroke(); }
  // ---- sword hilt at the left hip
  g.strokeStyle = gold; g.lineWidth = 4; g.beginPath(); g.moveTo(-64, -114); g.lineTo(-46, -108); g.stroke();
  g.strokeStyle = F('rgb(30,22,16)'); g.lineWidth = 5; g.beginPath(); g.moveTo(-56, -111); g.lineTo(-62, -132); g.stroke();
  g.fillStyle = gold; g.beginPath(); g.arc(-63, -135, 4, 0, 6.2832); g.fill();
  // ---- shield on the left arm (not for the banner and the poleaxe, which take both hands)
  if (W2 === 'spear' || W2 === 'sword') {
    const sh = () => { g.beginPath(); g.moveTo(-100, -216); g.quadraticCurveTo(-76, -228, -50, -216); g.lineTo(-54, -126); g.quadraticCurveTo(-62, -80, -78, -44); g.quadraticCurveTo(-92, -86, -102, -130); g.closePath(); };
    sh();
    if (mask) { g.fillStyle = '#fff'; g.fill(); }
    else {
      const gr = g.createLinearGradient(-102, 0, -50, 0); gr.addColorStop(0, dye(.2)); gr.addColorStop(.5, dye(.46)); gr.addColorStop(1, dye(.24)); g.fillStyle = gr; g.fill();
      g.save(); sh(); g.clip(); g.fillStyle = 'rgba(206,166,80,.55)'; g.beginPath(); g.moveTo(-100, -150); g.lineTo(-50, -200); g.lineTo(-50, -186); g.lineTo(-100, -136); g.closePath(); g.fill(); g.restore();
      sh(); g.strokeStyle = 'rgb(186,148,70)'; g.lineWidth = 4; g.stroke();
      g.strokeStyle = 'rgba(250,224,150,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-98, -215); g.quadraticCurveTo(-76, -226, -52, -215); g.stroke();
    }
  }
  // ---- pauldrons: stacked lames with lit edges and a gold rim
  const lames = (cx, cy, rx, ry, rot, n) => {
    for (let k = n - 1; k >= 0; k--) {
      const y = cy + k * 8, r = rx - k * 2.5;
      g.beginPath(); g.ellipse(cx, y, r, ry, rot, 0, 6.2832);
      g.fillStyle = mask ? '#fff' : steelGrad(g, cx - r, cx + r, .85 - k * .08); g.fill();
      if (!mask) { g.strokeStyle = 'rgba(176,192,210,.75)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, y, r - 1, ry - 1, rot, 3.5, 5.9); g.stroke(); }
    }
    if (!mask) { g.strokeStyle = 'rgba(200,160,76,.85)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(cx, cy + (n - 1) * 8, rx - (n - 1) * 2.5, ry, rot, .2, 2.9); g.stroke(); }
  };
  lames(-40, -210, 29, 15, -.3, 3);
  // ---- the field-side arm and the weapon hand
  const arm = (pts) => { g.strokeStyle = mask ? '#fff' : 'rgb(36,40,46)'; g.lineWidth = 15; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke();
    if (!mask) { g.strokeStyle = 'rgba(150,166,184,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(pts[0] - 4, pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i] - 4, pts[i + 1]); g.stroke(); } };
  if (W2 === 'spear') arm([40, -198, 56, -172, 58, -152]);
  else if (W2 === 'poleaxe') { arm([40, -198, 58, -176, 62, -168]); arm([-30, -196, 10, -150, 44, -140]); }
  else if (W2 === 'banner') arm([40, -198, 54, -236, 54, -262]);
  else arm([40, -198, 60, -186, 64, -176]);
  lames(38, -206, 23, 13, .3, 2);
  // ---- gorget and the helm
  g.fillStyle = mask ? '#fff' : steelGrad(g, -18, 20, .7); g.fillRect(-17, -234, 34, 28);
  g.save();
  if (K.look) { g.translate(8, 0); g.scale(-1, 1); g.translate(-8, 0); g.translate(8, -246); g.rotate(-.12); g.translate(-8, 246); }
  const hfill = (x0, x1) => (mask ? '#fff' : steelGrad(g, x0, x1, 1.05));
  const slit = (x0, x1, y) => { if (!mask) { g.fillStyle = 'rgb(4,5,6)'; g.fillRect(x0, y - 2, x1 - x0, 4); } };
  if (K.helm === 'great') {
    g.beginPath(); g.moveTo(-21, -226); g.lineTo(-23, -268); g.quadraticCurveTo(-22, -289, 2, -292); g.quadraticCurveTo(25, -290, 27, -270); g.lineTo(33, -266); g.lineTo(34, -232); g.lineTo(26, -226); g.closePath();
    g.fillStyle = hfill(-24, 34); g.fill();
    if (!mask) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(-23, -252, 57, 3.5); g.fillStyle = 'rgba(206,166,80,.8)'; g.fillRect(-21, -230, 47, 2.5); g.fillRect(2, -290, 2.5, 60); }
    slit(24, 34, -257);
    g.fillStyle = mask ? '#fff' : 'rgb(30,34,40)'; g.beginPath(); g.moveTo(-10, -290); g.quadraticCurveTo(4, -303, 22, -292); g.lineTo(20, -288); g.quadraticCurveTo(4, -297, -8, -287); g.closePath(); g.fill();
  } else if (K.helm === 'sallet') {
    g.beginPath(); g.moveTo(28, -244); g.lineTo(32, -252); g.lineTo(28, -262); g.quadraticCurveTo(28, -292, 2, -294); g.quadraticCurveTo(-22, -292, -24, -248);
    g.quadraticCurveTo(-34, -232, -44, -222); g.lineTo(-38, -218); g.quadraticCurveTo(-14, -230, 8, -234); g.lineTo(22, -236); g.closePath();
    g.fillStyle = hfill(-44, 32); g.fill();
    if (!mask) { g.fillStyle = 'rgba(206,166,80,.85)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(-30 + k * 10, -240 + Math.abs(k - 2) * 1.2, 1.6, 0, 6.2832); g.fill(); } }
    slit(20, 32, -257);
  } else if (K.helm === 'bascinet') {
    // the aventail: a mail curtain to the shoulders
    g.beginPath(); g.moveTo(-24, -244); g.lineTo(26, -244); g.lineTo(40, -212); g.lineTo(-42, -212); g.closePath(); g.fillStyle = mask ? '#fff' : 'rgb(42,46,52)'; g.fill();
    if (!mask) { g.fillStyle = 'rgba(160,176,192,.28)'; for (let y = -240; y < -214; y += 4) for (let x = -38 + ((y / 4) % 2) * 2; x < 36; x += 4) if (y > -244 + Math.abs(x) * 0 && x > -24 - (y + 244) * .6 && x < 26 + (y + 244) * .5) g.fillRect(x, y, 1.6, 1.6); }
    g.beginPath(); g.moveTo(-22, -244); g.quadraticCurveTo(-24, -284, -6, -304); g.quadraticCurveTo(20, -286, 26, -262); g.lineTo(46, -248); g.lineTo(28, -238); g.lineTo(22, -244); g.closePath();
    g.fillStyle = hfill(-24, 46); g.fill();
    slit(26, 38, -253);
    if (!mask) { g.strokeStyle = 'rgba(206,166,80,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-22, -246); g.lineTo(22, -246); g.stroke(); }
  } else {
    g.beginPath(); g.moveTo(-21, -226); g.quadraticCurveTo(-27, -290, 2, -294); g.quadraticCurveTo(29, -290, 27, -248); g.lineTo(31, -232); g.lineTo(22, -226); g.closePath();
    g.fillStyle = hfill(-26, 31); g.fill();
    if (!mask) { g.fillStyle = 'rgb(4,5,6)'; g.beginPath(); g.moveTo(22, -264); g.lineTo(30, -264); g.lineTo(31, -232); g.lineTo(26, -232); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, -294, 3, 64); }
  }
  g.restore();
  // ---- weapon hands and blades in front of the body
  if (W2 === 'sword') {
    g.fillStyle = mask ? '#fff' : 'rgb(130,140,152)'; g.beginPath(); g.moveTo(60, -180); g.lineTo(68, -180); g.lineTo(84, -420); g.lineTo(78, -432); g.lineTo(72, -420); g.closePath(); g.fill();
    if (!mask) { g.strokeStyle = 'rgba(230,238,246,.85)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(66, -184); g.lineTo(79, -428); g.stroke(); }
    g.strokeStyle = gold; g.lineWidth = 5; g.beginPath(); g.moveTo(50, -180); g.lineTo(78, -182); g.stroke();
    g.strokeStyle = F('rgb(30,22,16)'); g.lineWidth = 6; g.beginPath(); g.moveTo(64, -178); g.lineTo(63, -160); g.stroke();
    g.fillStyle = gold; g.beginPath(); g.arc(63, -157, 4.5, 0, 6.2832); g.fill();
  }
  const hand = (x, y) => { g.fillStyle = mask ? '#fff' : 'rgb(40,44,50)'; g.beginPath(); g.arc(x, y, 8, 0, 6.2832); g.fill(); if (!mask) { g.strokeStyle = 'rgba(160,176,192,.6)'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, 7, 3.4, 5.4); g.stroke(); } };
  if (W2 === 'spear') hand(58, -150); else if (W2 === 'poleaxe') { hand(62, -166); hand(46, -140); } else if (W2 === 'banner') hand(54, -262); else hand(64, -176);
}
function knightBounds(K) {                        // the part of the figure that can be on screen, in base units
  const top = Math.max(KTOP[K.weapon] - 10, -(K.y + 60) / K.s), bot = Math.min(12, (H + 60 - K.y) / K.s);
  return { x0: -112, x1: 168, top, bot };
}
function knightSprites(K) {
  if (K.spr) return K.spr;
  const B = knightBounds(K), s = K.s, w = Math.ceil((B.x1 - B.x0) * s), h = Math.ceil((B.bot - B.top) * s);
  const paint = (mask) => { const c = mk(w, h), g = c.getContext('2d'); if (K.flank > 0) { g.translate(w, 0); g.scale(-1, 1); } g.scale(s, s); g.translate(-B.x0, -B.top); drawKnight(g, K, mask); return c; };
  const m = paint(true), body = paint(false);
  const px = Math.max(2, 2.2 * s), fl = K.flank > 0 ? -1 : 1;
  const warm = rimOf(m, 0, px, 'rgb(255,146,76)'), cold = rimOf(m, -fl * px * .6, px * 1.2, 'rgb(214,230,255)'), green = rimOf(m, fl * px, px, 'rgb(124,255,178)');
  const bake = (layers) => { const c = mk(w, h), g = c.getContext('2d'); g.drawImage(body, 0, 0); g.globalCompositeOperation = 'lighter'; for (const [im, a] of layers) { g.globalAlpha = a; g.drawImage(im, 0, 0); } return c; };
  const ox = (K.flank > 0 ? (B.x1) : -B.x0) * s, oy = -B.top * s;   // the feet, in sprite pixels
  K.spr = { night: bake([[warm, .55]]), awake: bake([[warm, .45], [green, .5]]), cold, m, body, w, h, ox, oy, B };
  return K.spr;
}
function knightDawn(K) {
  const S = knightSprites(K); if (S.dawn) return S.dawn;
  const px = Math.max(2, 2.2 * K.s), fl = K.flank > 0 ? -1 : 1;
  const c = mk(S.w, S.h), g = c.getContext('2d'); g.drawImage(S.body, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(70,40,20,.28)'; g.fillRect(0, 0, S.w, S.h);   // warm bounce from the wet ground
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = .95; g.drawImage(rimOf(S.m, -fl * px * .4, px * 1.3, 'rgb(255,198,130)'), 0, 0);
  g.globalAlpha = .35; g.drawImage(rimOf(S.m, fl * px, px * .6, 'rgb(124,255,178)'), 0, 0);
  return (S.dawn = c);
}
// a banner's cloth: the muster banner's design (gold double border, a notched foot, the sigil, a rule and a lozenge) in the agent's colour
function bannerTex(K) {
  if (K.tex) return K.tex;
  const tw = 200, th = 360, [r, g0, b] = hex(K.hue), pale = Math.max(r, g0, b) > 190 ? .55 : 1;
  const c = mk(tw, th), g = c.getContext('2d');
  const shape = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(tw, 0); g.lineTo(tw, th); g.lineTo(tw / 2, th * .84); g.lineTo(0, th); g.closePath(); };
  shape(); const gr = g.createLinearGradient(0, 0, tw, 0);
  const col = (k) => `rgb(${r * k * pale | 0},${g0 * k * pale | 0},${b * k * pale | 0})`;
  gr.addColorStop(0, col(.26)); gr.addColorStop(.22, col(.5)); gr.addColorStop(.5, col(.4)); gr.addColorStop(.78, col(.56)); gr.addColorStop(1, col(.24));
  g.fillStyle = gr; g.fill();
  g.save(); shape(); g.clip();
  for (let x = 0; x < tw; x += 33) { g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(x, 0, 9, th); g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x + 16, 0, 7, th); }
  const sh = g.createLinearGradient(0, 0, 0, th); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(.16, 'rgba(0,0,0,0)'); sh.addColorStop(.85, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = sh; g.fillRect(0, 0, tw, th);
  g.restore();
  const inset = (d) => { g.beginPath(); g.moveTo(d, d); g.lineTo(tw - d, d); g.lineTo(tw - d, th - d * 1.6); g.lineTo(tw / 2, th * .84 - d * 1.1); g.lineTo(d, th - d * 1.6); g.closePath(); };
  inset(12); g.strokeStyle = 'rgb(214,176,88)'; g.lineWidth = 4; g.stroke();
  inset(20); g.strokeStyle = 'rgba(202,166,74,.55)'; g.lineWidth = 1.4; g.stroke();
  drawSigil(g, K.id, tw / 2, th * .3, 84, 'rgb(226,188,96)', 5);
  g.strokeStyle = 'rgba(202,166,74,.75)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(tw * .25, th * .5); g.lineTo(tw * .75, th * .5); g.stroke();
  g.fillStyle = 'rgb(214,176,88)'; g.beginPath(); g.moveTo(tw / 2, th * .5 - 6); g.lineTo(tw / 2 + 6, th * .5); g.lineTo(tw / 2, th * .5 + 6); g.lineTo(tw / 2 - 6, th * .5); g.closePath(); g.fill();
  const dark = mk(tw, th), gd = dark.getContext('2d'); gd.drawImage(c, 0, 0); gd.globalCompositeOperation = 'source-atop'; gd.fillStyle = 'rgba(0,0,0,.55)'; gd.fillRect(0, 0, tw, th);
  const lite = mk(tw, th), gl = lite.getContext('2d'); gl.drawImage(c, 0, 0); gl.globalCompositeOperation = 'source-atop'; gl.fillStyle = 'rgba(255,236,200,.22)'; gl.fillRect(0, 0, tw, th);
  return (K.tex = { c, dark, lite, tw, th });
}
// cloth: 18 vertical strips; a travelling wave lifts each strip and turns it to or away from the light; the whole cloth sways in the wind
function drawBanner(c, K, t, P, flash, x, y) {
  const T = bannerTex(K), s = K.s, fl = K.flank > 0 ? -1 : 1;
  const barX = x + fl * 56 * s, barY = y - 620 * s;                   // the crossbar's centre, on screen
  const cw = 86 * s, ch = 156 * s, N = 12, sw = T.tw / N;
  const sway = -.1 + .07 * Math.sin(t * 1.3 + K.ph) + .03 * Math.sin(t * 3.1 + K.ph * 2);
  c.save(); setL(c, P_FG); c.translate(barX, barY + 3 * s); c.transform(1, 0, sway, 1, 0, 0);
  for (let i = 0; i < N; i++) {
    const u = (i + .5) / N, ph = t * 4.6 - u * 6.2 + K.ph, lift = Math.sin(ph) * 4 * s * (.3 + u * .7), lean = Math.cos(ph);
    const dx = -cw / 2 + i * cw / N, w = cw / N + .8;
    c.globalAlpha = 1; c.drawImage(T.c, i * sw, 0, sw, T.th, dx, lift, w, ch);
    const dk = clamp(-lean) * .85 * (1 - .5 * P.dawn), lt = clamp(lean) * .7 + flash * .9 + P.dawn * .35;
    if (dk > .02) { c.globalAlpha = dk; c.drawImage(T.dark, i * sw, 0, sw, T.th, dx, lift, w, ch); }
    if (lt > .02) { c.globalAlpha = Math.min(1, lt); c.drawImage(T.lite, i * sw, 0, sw, T.th, dx, lift, w, ch); }
  }
  c.restore();
}

// the foreground rise our line stands on: dark turf, stones and tufts, open in the middle where the field drops away to the horde
function buildRise() {
  const c = mk(W + 200, 330), g = c.getContext('2d'), R = rng(7071), top = (x) => {
    const X = x - 100, d = Math.min(Math.abs(X - 0), Math.abs(X - W)), k = clamp((Math.abs(X - 960) - 250) / 520);
    return 330 - (40 + 150 * sm(k)) - 14 * fbm(x / 60, 0, 31, 3) + 0 * d; };
  g.fillStyle = 'rgb(9,10,12)'; g.beginPath(); g.moveTo(0, 330); for (let x = 0; x <= W + 200; x += 4) g.lineTo(x, top(x)); g.lineTo(W + 200, 330); g.closePath(); g.fill();
  for (let i = 0; i < 420; i++) {                                     // grass tufts along the crest
    const x = R() * (W + 200), y = top(x) + 2; if (y > 300) continue;
    g.strokeStyle = `rgb(${10 + R() * 8 | 0},${12 + R() * 8 | 0},${12 + R() * 6 | 0})`; g.lineWidth = 1.4 + R();
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - .5) * 8, y - 8, x + (R() - .7) * 14, y - 10 - R() * 16); g.stroke(); }
  }
  const m = tinted(c, '#fff'), rim = rimOf(m, 0, 3, 'rgb(150,96,60)'); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5; g.drawImage(rim, 0, 0);
  return { c, m, cold: rimOf(m, 0, 3, 'rgb(200,220,255)') };
}
function drawRise(c, P, flash) {
  setL(c, P_FG); const R = A.rise; c.drawImage(R.c, -100, H - 330 + 40); c.fillStyle = 'rgb(9,10,12)'; c.fillRect(-400, H + 39, W + 800, 500);
  if (flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = flash * .7; c.drawImage(R.cold, -100, H - 290); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
}

// ---------------------------------------------------------------- atmosphere sprites
function buildFog(seed) {
  const w = 512, h = 128, c = mk(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), D = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = j / h, prof = Math.exp(-Math.pow((v - .55) / .24, 2));
    const n = fbm(i / 90 + (i / w) * 0, j / 34, seed, 5), wrapN = fbm((i - w) / 90, j / 34, seed, 5), u = i / w;
    const nn = lerp(n, wrapN, sm(clamp((u - .8) / .2)));           // tileable along x
    const a = clamp((nn - .35) * 2.2) * prof, o = (j * w + i) * 4;
    D[o] = D[o + 1] = D[o + 2] = 255; D[o + 3] = 255 * a;
  }
  g.putImageData(im, 0, 0); return c;
}
function buildRain(n, len, wdt, a, seed) {
  const s = 512, c = mk(s, s), g = c.getContext('2d'), R = rng(seed); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = R() * s, y = R() * s, l = len * (.6 + R() * .8), al = a * (.4 + R() * .6);
    g.strokeStyle = rgba(170, 190, 215, al); g.lineWidth = wdt * (.6 + R() * .7);
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.lineTo(x + ox - l * .22, y + oy + l); g.stroke(); }
  }
  return c;
}
function buildSmoke() {
  const n = 128, c = mk(n, n), g = c.getContext('2d'), im = g.createImageData(n, n), D = im.data;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const dx = (i - n / 2) / (n / 2), dy = (j - n / 2) / (n / 2), r = Math.sqrt(dx * dx + dy * dy);
    const a = clamp(1 - r) * clamp(fbm(i / 18, j / 18, 51, 4) * 1.6 - .25), o = (j * n + i) * 4;
    D[o] = 22; D[o + 1] = 25; D[o + 2] = 27; D[o + 3] = 255 * a;
  }
  g.putImageData(im, 0, 0); return c;
}

// ---------------------------------------------------------------- the war table: parchment map in a brass tray, wood, tokens
const MAPW = 2000, MAPH = 1840, MAPX = 2.43, ZF = 6.09, ZN = 1.61, FOC = 1400, HZT = 430;
const TBL = { zf: 8.6, zn: 1.0, xh: 7.5 };
function buildWood() {
  const w = 512, h = 1024, c = mk(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), D = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const board = Math.floor(i / 128), bx = i % 128;
    const n = fbm(i / 6 + board * 31, j / 140, 61 + board, 4), k = fbm(i / 40, j / 40, 70, 3);
    let v = .55 + .55 * n + .2 * Math.sin((i / 3.1 + n * 9)) * .3 - .25 * k;
    if (bx < 3) v *= .35;
    const o = (j * w + i) * 4; D[o] = 54 * v; D[o + 1] = 33 * v; D[o + 2] = 18 * v; D[o + 3] = 255;
  }
  g.putImageData(im, 0, 0); return c;
}
const MAP_CATH = [.66, .34];                     // where the cathedral miniature stands on the map (u, v)
const GREEN_T = [[.27, .66], [.33, .70], [.39, .665], [.21, .70], [.30, .74], [.36, .735], [.61, .665], [.67, .70], [.73, .66], [.64, .735], [.70, .74], [.79, .70]];
const RED_T = (() => { const R = rng(4242), a = []; for (let i = 0; i < 22; i++) a.push([.14 + R() * .76, .22 + R() * .24, R()]); return a; })();
function buildMap() {
  const c = mk(MAPW, MAPH), g = c.getContext('2d'), F = 48, R = rng(1717);
  // brass tray
  let gr = g.createLinearGradient(0, 0, MAPW, MAPH);
  gr.addColorStop(0, '#5c4216'); gr.addColorStop(.2, '#d9b65a'); gr.addColorStop(.42, '#7d5f22'); gr.addColorStop(.6, '#e8cf86'); gr.addColorStop(.8, '#86672a'); gr.addColorStop(1, '#c9a24c');
  g.fillStyle = gr; g.fillRect(0, 0, MAPW, MAPH);
  g.strokeStyle = 'rgba(40,26,8,.8)'; g.lineWidth = 4; g.strokeRect(F - 8, F - 8, MAPW - 2 * F + 16, MAPH - 2 * F + 16);
  g.strokeStyle = 'rgba(255,236,170,.5)'; g.lineWidth = 2; g.strokeRect(12, 12, MAPW - 24, MAPH - 24);
  for (let x = 90; x < MAPW; x += 160) for (const y of [24, MAPH - 24]) { g.fillStyle = '#3a2a0e'; g.beginPath(); g.arc(x, y, 7, 0, 6.28); g.fill(); g.fillStyle = '#f0dc9a'; g.beginPath(); g.arc(x - 2, y - 2, 3, 0, 6.28); g.fill(); }
  for (let y = 90; y < MAPH; y += 160) for (const x of [24, MAPW - 24]) { g.fillStyle = '#3a2a0e'; g.beginPath(); g.arc(x, y, 7, 0, 6.28); g.fill(); g.fillStyle = '#f0dc9a'; g.beginPath(); g.arc(x - 2, y - 2, 3, 0, 6.28); g.fill(); }
  // parchment with stains (low-res noise, upscaled)
  const pw = MAPW - 2 * F, ph = MAPH - 2 * F, lw = Math.ceil(pw / 8), lh = Math.ceil(ph / 8), lc = mk(lw, lh), lg = lc.getContext('2d'), im = lg.createImageData(lw, lh), D = im.data;
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
    const n = fbm(i / 22, j / 22, 81, 5), n2 = fbm(i / 5, j / 5, 82, 3), ex = Math.min(i, lw - i) / lw, ey = Math.min(j, lh - j) / lh, edge = clamp(1 - Math.min(ex, ey) * 9);
    const v = .92 - .22 * clamp((n - .45) * 2.5) - .06 * n2 - .4 * edge * edge, o = (j * lw + i) * 4;
    D[o] = 200 * v; D[o + 1] = 168 * v; D[o + 2] = 116 * v; D[o + 3] = 255;
  }
  lg.putImageData(im, 0, 0); g.imageSmoothingQuality = 'high'; g.drawImage(lc, F, F, pw, ph);
  // fold creases
  for (const [x0, y0, x1, y1] of [[MAPW / 2, F, MAPW / 2, MAPH - F], [F, MAPH * .52, MAPW - F, MAPH * .52]]) {
    g.strokeStyle = 'rgba(255,240,200,.22)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - 2, y0 - 2); g.lineTo(x1 - 2, y1 - 2); g.stroke();
    g.strokeStyle = 'rgba(70,46,20,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 2, y0 + 2); g.lineTo(x1 + 2, y1 + 2); g.stroke();
  }
  const ink = 'rgba(44,24,10,.95)', U = (u) => F + u * pw, V = (v) => F + v * ph;
  g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(F + 34, F + 34, pw - 68, ph - 68); g.lineWidth = 1.5; g.strokeRect(F + 46, F + 46, pw - 92, ph - 92);
  // contour lines around the high ground
  g.lineWidth = 3; g.strokeStyle = 'rgba(52,32,18,.62)';
  for (let k = 1; k <= 6; k++) { g.beginPath(); for (let a = 0; a <= 6.3; a += .1) { const r = k * 36 * (1 + .18 * Math.sin(a * 3 + k) + .1 * Math.sin(a * 5)); const x = U(.3) + Math.cos(a) * r * 1.6, y = V(.3) + Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  // hills: humps hatched on their shadow side
  const hill = (x, y, w) => { g.strokeStyle = ink; g.lineWidth = 4.2; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - w * 1.3, x + w, y); g.stroke(); g.lineWidth = 2.6; for (let k = 0; k < 4; k++) { const xx = x + w * (.15 + k * .2); g.beginPath(); g.moveTo(xx, y - w * .55 * (1 - k * .22)); g.lineTo(xx - 6, y); g.stroke(); } };
  for (let i = 0; i < 46; i++) { const u = R(), v = R(); if ((u < .45 && v < .4) || (u > .86 && v < .6)) hill(U(u), V(v), 30 + R() * 30); }
  // forest stipple
  const tree = (x, y, s) => { g.strokeStyle = 'rgba(44,26,12,.85)'; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y - s, s, 0, 6.28); g.stroke(); g.fillStyle = 'rgba(44,26,12,.3)'; g.fill(); g.fillRect(x - 1.2, y, 2.4, 6); };
  for (let i = 0; i < 170; i++) { const cx = [.08, .9, .55, .18][i % 4], cy = [.55, .78, .5, .9][i % 4]; tree(U(cx + (R() - .5) * .16), V(cy + (R() - .5) * .12), 8 + R() * 7); }
  // the river and its ripples
  const riv = (o) => { g.beginPath(); for (let v = 0; v <= 1.001; v += .01) { const u = .42 - .22 * v + .05 * Math.sin(v * 9) + .02 * Math.sin(v * 23); const x = U(u) + o, y = V(v); v ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  g.strokeStyle = ink; g.lineWidth = 4; riv(-12); riv(12);
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(52,32,18,.45)'; for (let v = .02; v < 1; v += .025) { const u = .42 - .22 * v + .05 * Math.sin(v * 9) + .02 * Math.sin(v * 23); g.beginPath(); g.moveTo(U(u) - 4, V(v)); g.lineTo(U(u) + 4, V(v) + 2); g.stroke(); }
  // the road from the cathedral to our line
  g.setLineDash([22, 14]); g.lineWidth = 4.5; g.strokeStyle = ink; g.beginPath(); g.moveTo(U(MAP_CATH[0]), V(MAP_CATH[1])); g.bezierCurveTo(U(.66), V(.4), U(.48), V(.55), U(.5), V(.95)); g.stroke(); g.setLineDash([]);
  // hatched fields and a village near our line, a bridge over the river
  g.strokeStyle = 'rgba(52,32,18,.55)'; g.lineWidth = 1.6;
  for (const [u, v, w, h, a] of [[.47, .52, .07, .05, .3], [.55, .58, .06, .05, -.4], [.6, .48, .05, .06, .1], [.44, .62, .05, .04, .6], [.78, .56, .06, .05, -.2]]) {
    g.save(); g.translate(U(u), V(v)); g.rotate(a); g.strokeRect(-w * pw / 2, -h * ph / 2, w * pw, h * ph);
    g.beginPath(); for (let x = -w * pw / 2; x < w * pw / 2; x += 9) { g.moveTo(x, -h * ph / 2); g.lineTo(x, h * ph / 2); } g.stroke(); g.restore();
  }
  for (const [u, v] of [[.52, .66], [.545, .675], [.5, .69], [.57, .7]]) { g.fillStyle = 'rgba(44,24,10,.8)'; const x = U(u), y = V(v); g.fillRect(x - 10, y - 8, 20, 12); tri(g, x - 13, y - 8, x, y - 20, x + 13, y - 8); }
  { const v = .58, u = .42 - .22 * v + .05 * Math.sin(v * 9) + .02 * Math.sin(v * 23), x = U(u), y = V(v); g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 30, y - 8); g.quadraticCurveTo(x, y - 22, x + 30, y - 8); g.moveTo(x - 30, y + 8); g.quadraticCurveTo(x, y - 6, x + 30, y + 8); g.stroke(); }
  // the backlog's ground in red wash, and red battle arrows bearing down on our line
  g.fillStyle = 'rgba(150,40,26,.12)'; g.beginPath(); g.ellipse(U(.52), V(.33), pw * .4, ph * .13, 0, 0, 6.28); g.fill();
  g.strokeStyle = 'rgba(146,34,24,.75)'; g.fillStyle = 'rgba(146,34,24,.75)';
  for (const [u0, v0, u1, v1] of [[.3, .28, .3, .58], [.55, .26, .5, .56], [.8, .3, .72, .58]]) {
    g.lineWidth = 9; g.beginPath(); g.moveTo(U(u0), V(v0)); g.quadraticCurveTo(U((u0 + u1) / 2 + .05), V((v0 + v1) / 2), U(u1), V(v1)); g.stroke();
    const ax = U(u1), ay = V(v1); tri(g, ax - 22, ay - 16, ax + 22, ay - 16, ax, ay + 22);
  }
  // our line, inked in green-black
  g.strokeStyle = 'rgba(30,70,46,.7)'; g.lineWidth = 5; g.beginPath(); g.moveTo(U(.18), V(.7)); g.lineTo(U(.42), V(.7)); g.moveTo(U(.58), V(.7)); g.lineTo(U(.82), V(.7)); g.stroke();
  // the cathedral's ground: a ring and a hatched plot
  g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.ellipse(U(MAP_CATH[0]), V(MAP_CATH[1]), 120, 90, 0, 0, 6.28); g.stroke();
  g.lineWidth = 1.4; g.beginPath(); g.ellipse(U(MAP_CATH[0]), V(MAP_CATH[1]), 134, 102, 0, 0, 6.28); g.stroke();
  // compass rose (an original eight-point star)
  const cx = U(.23), cy = V(.82);
  g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 92, 0, 6.28); g.stroke(); g.beginPath(); g.arc(cx, cy, 80, 0, 6.28); g.stroke();
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 - Math.PI / 2, L = k % 2 ? 70 : 118, w = k % 2 ? 12 : 18;
    const tx = cx + Math.cos(a) * L, ty = cy + Math.sin(a) * L, lx = cx + Math.cos(a - Math.PI / 2) * w, ly = cy + Math.sin(a - Math.PI / 2) * w, rx = cx + Math.cos(a + Math.PI / 2) * w, ry = cy + Math.sin(a + Math.PI / 2) * w;
    g.fillStyle = 'rgba(52,32,18,.85)'; tri(g, cx, cy, tx, ty, lx, ly); g.fillStyle = 'rgba(200,168,116,.9)'; tri(g, cx, cy, tx, ty, rx, ry); g.strokeStyle = ink; g.beginPath(); g.moveTo(rx, ry); g.lineTo(tx, ty); g.lineTo(lx, ly); g.stroke();
  }
  return c;
}
// project a point on the table plane (world X, depth Z) to the screen (before the table camera)
const tproj = (X, Z) => [960 + FOC * X / Z, HZT + FOC / Z];
const mapXZ = (u, v) => [(u - .5) * 2 * MAPX, ZF - v * (ZF - ZN)];
function plane(c, tex, zf, zn, xh, yTop, yBot, step) {
  const tw = tex.width, th = tex.height;
  for (let y = Math.max(yTop, HZT + FOC / zf); y < yBot; y += step) {
    const z0 = FOC / (y - HZT), z1 = FOC / (y + step - HZT);
    const v0 = (zf - z0) / (zf - zn), v1 = (zf - z1) / (zf - zn); if (v1 < 0 || v0 > 1) continue;
    const hw = FOC * xh / z0;
    c.drawImage(tex, 0, clamp(v0) * th, tw, Math.max(1, (clamp(v1) - clamp(v0)) * th), 960 - hw, y, hw * 2, step + .6);
  }
}
function pawn(c, X, Z, col, top, kind) {
  const [x, y] = tproj(X, Z), k = FOC / Z, sq = clamp(1 / Z * 1.05, .12, .6);
  // shadow, cast away from the candle (at X 0, Z 2.2, flame 0.42 high)
  const dx = X, dz = Z - 2.15, dl = Math.hypot(dx, dz) || 1, hgt = kind ? .1 : .085, len = hgt * dl / Math.max(.08, .42 - hgt) * .45;
  const [sx, sy] = tproj(X + dx / dl * len, Z + dz / dl * len);
  c.strokeStyle = 'rgba(12,6,2,.3)'; c.lineCap = 'round'; c.lineWidth = .085 * k * (1 + sq); c.beginPath(); c.moveTo(x, y); c.lineTo(sx, sy); c.stroke();
  const lit = dx < 0 ? 1 : -1;                                       // the candle is towards the centre
  const r = (kind ? .045 : .06) * k, hb = .02 * k, hh = hgt * k;
  const grd = c.createLinearGradient(x - r, 0, x + r, 0);
  const L = col.map((v) => Math.min(255, v * 1.7)), Dk = col.map((v) => v * .35);
  if (lit > 0) { grd.addColorStop(0, `rgb(${Dk})`); grd.addColorStop(1, `rgb(${L})`); } else { grd.addColorStop(0, `rgb(${L})`); grd.addColorStop(1, `rgb(${Dk})`); }
  c.fillStyle = grd;
  c.beginPath(); c.ellipse(x, y, r * 1.15, r * 1.15 * sq, 0, 0, Math.PI); c.lineTo(x - r * 1.15, y - hb); c.ellipse(x, y - hb, r * 1.15, r * 1.15 * sq, 0, Math.PI, 0, true); c.closePath(); c.fill();
  if (kind) {                                                         // pawn: tapered body, a head
    c.beginPath(); c.moveTo(x - r * .9, y - hb); c.lineTo(x - r * .35, y - hh * .78); c.lineTo(x + r * .35, y - hh * .78); c.lineTo(x + r * .9, y - hb); c.closePath(); c.fill();
    c.fillStyle = `rgb(${top})`; c.beginPath(); c.arc(x, y - hh * .9, r * .5, 0, 6.2832); c.fill();
    c.fillStyle = 'rgba(255,220,160,.5)'; c.beginPath(); c.arc(x - lit * -r * .18, y - hh * .95, r * .16, 0, 6.2832); c.fill();
  } else {                                                            // disc stack: a squat cylinder with a painted top and a brass rim
    c.beginPath(); c.moveTo(x - r, y - hb); c.lineTo(x - r, y - hh); c.ellipse(x, y - hh, r, r * sq, 0, Math.PI, 0); c.lineTo(x + r, y - hb); c.closePath(); c.fill();
    c.fillStyle = `rgb(${top})`; c.beginPath(); c.ellipse(x, y - hh, r, r * sq, 0, 0, 6.2832); c.fill();
    c.strokeStyle = 'rgba(214,176,92,.85)'; c.lineWidth = Math.max(1, r * .12); c.stroke();
    c.fillStyle = 'rgba(255,230,180,.35)'; c.beginPath(); c.ellipse(x - lit * -r * .3, y - hh - r * sq * .2, r * .35, r * sq * .3, 0, 0, 6.2832); c.fill();
  }
}

// ---------------------------------------------------------------- assets (built once)
let A = null;
function build() {
  const t0 = performance.now();
  const cm = cathMask();
  A = {
    sky: buildSky(false), skyD: buildSky(true), ground: buildGround(false), groundD: buildGround(true), ridge: buildRidge(), ridgeD: null,
    cath: cathBody(cm, false), cathD: cathBody(cm, true), cathWin: cathWindows(), cathWinD: tinted(cathWindows(), 'rgb(255,226,170)'), cathRim: rimOf(cm, -2, 4, 'rgb(215,230,255)'), cathRimD: edgeOf(cm, 3, 'rgb(255,190,120)'), rays: buildRays(),
    mini: (() => {
      const sc = .3, m = mk(CW * sc, CHh * sc), mg = m.getContext('2d'); mg.drawImage(cm, 0, 0, m.width, m.height);
      const c = tinted(m, 'rgb(62,54,46)'), g = c.getContext('2d'); g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, 0, m.width, 0); gr.addColorStop(0, 'rgba(255,200,140,.35)'); gr.addColorStop(.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(0, 0, m.width, m.height);
      g.globalCompositeOperation = 'source-over'; g.drawImage(rimOf(m, 3, 1, 'rgb(255,196,120)'), 0, 0); g.globalAlpha = .6; g.drawImage(rimOf(m, 0, 2, 'rgb(255,220,160)'), 0, 0);
      return c;
    })(),
    horde: buildHorde(false), rise: buildRise(),
    fog: [301, 302, 303].map((sd) => { const m = buildFog(sd); return { n: tinted(m, 'rgb(112,104,96)'), d: tinted(m, 'rgb(226,184,134)'), w: m }; }), rain: (() => { const a = buildRain(300, 26, 1.1, .4, 91), b2 = buildRain(70, 70, 2.2, .5, 92), g = a.getContext('2d'); g.drawImage(b2, 0, 0); return a; })(), smoke: buildSmoke(), smokeL: (() => { const m = buildSmoke(); return tinted(m, 'rgb(186,180,170)'); })(),
    gWarm: glowSprite('255,150,60'), gCold: glowSprite('170,200,255'), gRed: glowSprite('255,50,40', 32, .2), gShadow: glowSprite('3,4,5', 64, .55), gGreen: glowSprite('124,255,178', 64, .2), gYel: glowSprite('255,214,140', 64, .25),
    wood: buildWood(), map: buildMap(),
    tc: mk(W, H),
  };
  A.back = buildBack([buildStrip(46, 170, 3200, 8812, .14), buildStrip(28, 46, 2600, 8813, .22), buildStrip(17.5, 28, 1500, 8814, .34)]);
  A.ridgeD = tinted(A.ridge, 'rgb(46,32,32)');
  A.buildMs = performance.now() - t0;
  globalThis.__fieldBuildMs = A.buildMs;
}

// ---------------------------------------------------------------- seeded content
const R0 = rng(902114);
const HORDE = (() => {
  const a = [];
  for (let i = 0; i < 760; i++) {
    const d = Math.sqrt(7 * 7 + R0() * (17.5 * 17.5 - 49)), s = SC(d), sx = -300 + R0() * (W + 600);
    a.push({ d, X: (sx - 960) / s, type: Math.floor(R0() * 4), ph: R0() * 6.28, gait: .9 + R0() * .5, eye: R0() < .85, blink: R0() * 6.28, b: bucketOf(d), mir: R0() < .45 });
  }
  return a;
})();
const TAGS = [ // text, screen x at rest, distance, pole (base units above the carrier's feet)
  ['flaky test', 742, 10.5, 235], ['merge conflict', 650, 20, 410], ['#4127', 1070, 20, 410], ['broken build', 1186, 10.5, 235], ['tech debt', 1290, 20, 410],
].map(([text, sx, d, pole]) => ({ text, d, pole, X: (sx - 960) / SC(d) }));
for (const g of TAGS) HORDE.push({ d: g.d, X: g.X - 34, type: 1, ph: R0() * 6.28, gait: 1, eye: true, blink: R0() * 6.28, b: bucketOf(g.d), carrier: true });
HORDE.sort((p, q) => q.d - p.d);
const STRIKES = [[3, 2], [0, 1], [1, 0], [2, 3], [4, 3]];   // [tag, unit] in the order the orders land
const FOGS = [[90, 0, .8, 9], [50, 1, .7, -14], [32, 2, .5, 18], [21, 0, .32, -24], [12, 1, .14, 30], [6.3, 2, .34, 22]];   // the last: low mist over the front rank's feet   // distance, sprite, alpha, drift px/s
const FIRES = [[120, .8], [390, 1], [650, .7], [1290, .9], [1790, .8]].map(([x, s], i) => ({ x, s, ph: i * 1.7 }));

// ---------------------------------------------------------------- camera (parallax by layer depth)
const CAM = { z: 1, dx: 0, sx: 0, sy: 0 };
// during the dive the whole field is held in register with the cathedral miniature: point a (the real ruin's foot) maps to b
const DV = { k: 1, ax: 0, ay: 0, bx: 0, by: 0, mis: 1 };
function setL(c, p) {
  const z = 1 + (CAM.z - 1) * p, e = 960 * (1 - z) + (CAM.dx + CAM.sx) * p, f = HZ * (1 - z) + CAM.sy * p, k = DV.k;
  c.setTransform(z * k, 0, 0, z * k, DV.bx + (e - DV.ax) * k, DV.by + (f - DV.ay) * k);
}
function proj0(x, y, p) { const z = 1 + (CAM.z - 1) * p; return [960 + (x - 960) * z + (CAM.dx + CAM.sx) * p, HZ + (y - HZ) * z + CAM.sy * p]; }
function proj(x, y, p) { const [u, v] = proj0(x, y, p); return [DV.bx + (u - DV.ax) * DV.k, DV.by + (v - DV.ay) * DV.k]; }
const P_SKY = .12, P_FAR = .3, P_CATH = .35, P_MID = .62, P_FG = 1;
const cathPt = (lx, ly) => proj(CATH.x + lx * CATH.s, CATH.base - (CHh - ly) * CATH.s, P_CATH);
const cathPt0 = (lx, ly) => proj0(CATH.x + lx * CATH.s, CATH.base - (CHh - ly) * CATH.s, P_CATH);

// ---------------------------------------------------------------- lightning
function flashEnv(dt) { if (dt < 0 || dt > .34) return 0; if (dt < .07) return 1; if (dt < .1) return .4; if (dt < .15) return .8; return .8 * Math.exp(-(dt - .15) * 16); }
const BOLTS = new Map();
function boltGeom(seed, x0, y0, x1, y1) {
  const key = `${seed}:${x0 | 0}:${y1 | 0}`; if (BOLTS.has(key)) return BOLTS.get(key);
  const R = rng(seed);
  const disp = (pts, depth, amt) => { for (let k = 0; k < depth; k++) { const np = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay), off = (R() - .5) * len * amt; np.push([(ax + bx) / 2 - (by - ay) / len * off, (ay + by) / 2 + (bx - ax) / len * off], pts[i + 1]); } pts = np; } return pts; };
  const main = disp([[x0, y0], [x1, y1]], 7, .5), br = [];
  for (let b = 0; b < 6; b++) {
    const i = 8 + Math.floor(R() * main.length * .7), [sx, sy] = main[i], ang = Math.PI / 2 + (R() < .5 ? -1 : 1) * (.5 + R() * .7), L = 70 + R() * 230;
    br.push(disp([[sx, sy], [sx + Math.cos(ang) * L, sy + Math.sin(ang) * L]], 5, .55));
  }
  const g = { main, br }; BOLTS.set(key, g); return g;
}
function drawBolt(c, geo, a) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
  const path = (pts) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); };
  for (const [w, col, al] of [[22, '120,150,255', .16], [8, '180,205,255', .45], [2.6, '255,255,255', 1]]) {
    c.strokeStyle = `rgba(${col},${(al * a).toFixed(3)})`; c.lineWidth = w; path(geo.main);
    c.lineWidth = w * .45; for (const b of geo.br) path(b);
  }
  c.restore();
}

// ---------------------------------------------------------------- field pieces
function drawSky(c, t, P, flash, boltX) {
  const S = P.dawn ? A.skyD : A.sky;
  setL(c, P_SKY);
  const x0 = -440 + 7 * (t % 30);
  c.drawImage(S.plate, x0, -60);
  if (flash > 0 && S.lit) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = flash * .9; c.drawImage(S.lit, x0, -60);
    c.globalAlpha = flash * .7; c.drawImage(A.gCold, boltX - 700, -500, 1400, 1300);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
}
const SUN = [1585, 500];
function buildRays() {                            // soft god rays fanning from a point, painted once
  const n = 1400, c = mk(n, n), g = c.getContext('2d'), R = rng(919), cx = n / 2, cy = n / 2;
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI + R() * Math.PI * 2, w = .02 + R() * .05, L = n * (.32 + R() * .2), al = .05 + R() * .08;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, L); gr.addColorStop(0, `rgba(255,214,150,${al})`); gr.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, L, a - w, a + w); g.closePath(); g.fill();
  }
  return c;
}
function drawSun(c, t, P) {
  if (P.dawn <= 0) return;
  setL(c, P_CATH); const [sx, sy] = SUN, k = P.dawn;
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = .8 * k; c.drawImage(A.gWarm, sx - 1000, sy - 560, 2000, 1120);
  c.globalAlpha = 1 * k; c.drawImage(A.gYel, sx - 300, sy - 240, 600, 480); c.drawImage(A.gYel, sx - 120, sy - 120, 240, 240); c.drawImage(A.gYel, sx - 50, sy - 50, 100, 100);
  c.save(); c.translate(sx, sy); c.rotate(t * .01); c.globalAlpha = 1.4 * k > 1 ? 1 : 1.4 * k; c.drawImage(A.rays, -700, -700); c.drawImage(A.rays, -700, -700); c.restore();
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
function drawFar(c, t, P, flash) {
  setL(c, P_FAR);
  c.drawImage(P.dawn ? A.ridgeD : A.ridge, -250, HZ - 138);
  if (P.dawn < 1) {                                                 // fires on the horizon and their smoke
    c.globalCompositeOperation = 'lighter';
    for (const f of FIRES) {
      const fl = .78 + .22 * Math.sin(t * 9 + f.ph) * Math.sin(t * 3.7 + f.ph * 2), a = f.s * fl * (1 - P.dawn);
      c.globalAlpha = .55 * a; c.drawImage(A.gWarm, f.x - 260 * f.s, HZ - 150 * f.s, 520 * f.s, 280 * f.s);
      c.globalAlpha = .9 * a; c.drawImage(A.gYel, f.x - 22 * f.s, HZ - 18 * f.s, 44 * f.s, 30 * f.s);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    for (const f of FIRES) for (let k = 0; k < 5; k++) {
      const u = ((t * .045 + k / 5 + f.ph * .13) % 1), y = HZ - 10 - u * 460, x = f.x - u * u * 260 + Math.sin(u * 5 + k) * 20, r = (30 + u * 150) * f.s;
      c.globalAlpha = Math.sin(Math.PI * Math.min(1, u * 1.4)) * .5 * (1 - P.dawn * .8); c.drawImage(A.smoke, x - r, y - r, r * 2, r * 2);
    }
    c.globalAlpha = 1;
  }
}
function drawCathedral(c, t, P, flash) {
  setL(c, P_CATH);
  const x = CATH.x, y = CATH.base - CHh * CATH.s, w = CW * CATH.s, h = CHh * CATH.s;
  if (P.dawn < 1) { c.globalAlpha = (.75 + .25 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1)) * (1 - P.dawn); c.drawImage(A.cathWin, x, y, w, h); c.globalAlpha = 1; }
  if (P.dawn > 0) { c.globalAlpha = P.dawn; c.drawImage(A.cathWinD, x, y, w, h); c.globalAlpha = 1; }
  c.drawImage(P.dawn ? A.cathD : A.cath, x, y, w, h);
  if (P.dawn > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = .8 * P.dawn; c.drawImage(A.cathRimD, x, y, w, h); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  if (flash > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = flash; c.drawImage(A.cathRim, x, y, w, h); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
}
function drawGround(c, t, P, flash) {
  setL(c, P_MID);
  const G = P.dawn ? A.groundD : A.ground;
  c.drawImage(G.plate, -200, HZ - 4);
  c.globalCompositeOperation = 'lighter';
  if (P.dawn < 1) for (const f of FIRES) {                         // fire light in the puddles
    c.globalAlpha = .22 * f.s * (1 - P.dawn); c.drawImage(A.gWarm, f.x - 120, HZ, 240, 140);
  }
  if (P.dawn < 1) {
    const hb = c.createLinearGradient(0, HZ - 30, 0, HZ + 260); hb.addColorStop(0, rgba(150, 96, 60, 0)); hb.addColorStop(.12, rgba(150, 96, 60, .06 * (1 - P.dawn))); hb.addColorStop(.42, rgba(156, 104, 68, .4 * (1 - P.dawn))); hb.addColorStop(1, rgba(120, 90, 70, 0));
    c.globalAlpha = 1; c.fillStyle = hb; c.fillRect(-300, HZ - 30, W + 600, 290);
  }
  if (P.dawn > 0) {                                                 // the low sun's road across the wet field
    const [sx] = SUN, k = P.dawn;
    for (let i = 0; i < 9; i++) { const y = HZ + 6 + i * i * 5.5, w = 60 + i * 26, wob = Math.sin(t * 1.7 + i * 1.3) * 8; c.globalAlpha = (.55 - i * .05) * k; c.drawImage(A.gYel, sx - w + wob, y - 10 - i * 2, w * 2, 24 + i * 6); }
  }
  c.globalCompositeOperation = 'source-over';
  // a ragged mist lying on the horizon, so the far field never ends in a ruled line; at dawn it lifts and burns off
  { const F = A.fog[2], spr = P.dawn ? F.d : F.n, hh = 70, tw = 300, x0 = -((t * 6) % tw) - 300, burn = P.dawn ? 1 - .7 * ramp(t, P.dawnT || 0, (P.dawnT || 0) + 9) : 1;
    c.globalAlpha = (P.dawn ? .5 : .55) * burn; for (let x = x0; x < W + 300; x += tw) c.drawImage(spr, x, HZ - 44 - (P.dawn ? 18 * (1 - burn) : 0), tw + 1, hh); c.globalAlpha = 1;
    if (P.dawn) for (const [d, id, a, v] of [[16, 0, .32, 10], [9, 1, .22, -14]]) { const y = HZ + KY / d - 30 * (1 - burn), hh2 = 40 + 880 / d, tw2 = hh2 * 4, xx = -((t * v + d * 97) % tw2 + tw2) % tw2 - 300; c.globalAlpha = a * burn; for (let x = xx; x < W + 300; x += tw2) c.drawImage(A.fog[id].d, x, y - hh2 * .7, tw2 + 1, hh2); }
    c.globalAlpha = 1; }
  c.globalCompositeOperation = 'lighter';
  if (flash > 0 && G.sheen) { c.globalAlpha = flash * .22; c.drawImage(G.sheen, -200, HZ - 4); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
const BACK_D = 30, BACK_Y0 = 596, BACK_Y1 = 764;
function buildBack(strips) {                    // composite the far and mid ranks with the fog banks between them, once per gait pose
  return [0, 1].map((vv) => {
    const c = mk(W + 900, BACK_Y1 - BACK_Y0), g = c.getContext('2d'); g.translate(450, -BACK_Y0);
    const items = [...FOGS.filter((f) => f[0] > 17.5).map((f) => ({ d: f[0], f })), ...strips.map((S) => ({ d: S.dref, S }))].sort((p, q) => q.d - p.d);
    for (const it of items) {
      if (it.S) { g.drawImage(it.S.vars[vv], -450, it.S.top); continue; }
      const [d, id, a] = it.f, y = HZ + KY / d, hh = 40 + 880 / d, tw = hh * 4;
      g.globalAlpha = a; for (let x = -450 - (d * 97) % tw; x < W + 450; x += tw) g.drawImage(A.fog[id].n, x, y - hh * .7, tw + 1, hh); g.globalAlpha = 1;
    }
    return c;
  });
}
function drawStrips(c, t, P) {
  if (P.dawn >= 1) return;
  setL(c, P_MID);
  // the two gait plates crossfade continuously (a hard swap read as a flicker in motion)
  const k = BACK_D / Math.max(4, BACK_D - 1.8 * P.advance + 3 * P.push), m = .5 + .5 * Math.sin(t * 2 * Math.PI / .9), v0 = A.back[0], v1 = A.back[1];
  const X = 960 + (-450 - 960) * k, Y = HZ + (BACK_Y0 - HZ) * k, w = v0.width * k, h = v0.height * k;
  c.globalAlpha = 1 - P.dawn; c.drawImage(v0, X, Y, w, h);
  c.globalAlpha = (1 - P.dawn) * m; c.drawImage(v1, X, Y, w, h);
  c.globalAlpha = 1;
}
function hordeD(m, P) { return m.d - 1.8 * P.advance + 3 * P.push; }
function drawFog(c, t, f, P, flash) {
  const [d, id, a, v] = f, s = SC(d), y = HZ + KY / d, hh = 40 + 880 / d, tw = hh * 4;
  const F = A.fog[id], spr = P.dawn ? F.d : F.n, x0 = -((t * v + d * 97) % tw + tw) % tw - 260;
  c.globalAlpha = a * (1 - .3 * P.dawn);
  const col = P.dawn ? 1 : 0;
  for (let x = x0; x < W + 260; x += tw) c.drawImage(spr, x, y - hh * .7, tw + 1, hh);
  if (flash > .3 && d > 15) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = flash * a * .3; for (let x = x0; x < W + 260; x += tw) c.drawImage(F.w, x, y - hh * .7, tw + 1, hh); c.globalCompositeOperation = 'source-over'; }
  c.globalAlpha = 1; return col;
}
function drawHorde(c, t, P, flash, out) {
  setL(c, P_MID);
  const fade0 = 1 - P.dawn;
  let fi = 0;
  // fog sprites are white masks: tint them once per frame through a cheap colour fill on a small layer is too slow, so the fog
  // tint is baked by drawing them over the cold ground (they read as cold haze at night, warm haze at dawn via the dawn ground)
  const eyes = [];
  for (const m of HORDE) {
    const d = hordeD(m, P);
    while (fi < FOGS.length && FOGS[fi][0] > d) { if (FOGS[fi][0] <= 17.5) drawFog(c, t, FOGS[fi], P, flash); fi++; }
    if (fade0 <= 0 || d < 5.2) continue;
    const s = SC(d), y = HZ + KY / d, x = 960 + m.X * s + Math.sin(t * .7 + m.ph) * 6 * s;
    if (x < -120 || x > W + 120) continue;
    const beaten = clamp((7.2 - d) / 1.6) * P.push, a = fade0 * (1 - beaten);
    if (a <= .02) continue;
    const pose = Math.floor((t * m.gait * 2.6 + m.ph) % 4), B = BUCKETS[m.b], spr = A.horde.sprites[m.b][m.type][pose];
    const k = s / B.rs, bob = Math.abs(Math.sin(t * m.gait * 4.1 + m.ph)) * 2 * s;
    c.globalAlpha = a * .7; c.drawImage(A.gShadow, x - 54 * s, y - 9 * s - bob * 0, 108 * s, 18 * s);   // contact shadow
    c.globalAlpha = a;
    if (m.mir) { c.save(); c.translate(x, 0); c.scale(-1, 1); c.drawImage(spr, -HB.x * s, y - HB.y * s - bob, spr.width * k, spr.height * k); c.restore(); }
    else c.drawImage(spr, x - HB.x * s, y - HB.y * s - bob, spr.width * k, spr.height * k);
    if (flash > .05 && s > .85) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = flash * a * .35; const r = A.horde.rims[m.type][pose]; c.drawImage(r, x - HB.x * s, y - HB.y * s - bob, r.width * s, r.height * s); c.globalCompositeOperation = 'source-over'; }
    if (m.carrier) out.push({ m, x, y, s, d, a });
  }
  while (fi < FOGS.length) { if (FOGS[fi][0] <= 17.5) drawFog(c, t, FOGS[fi], P, flash); fi++; }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'lighter';
  for (const [x, y, s, a] of eyes) {
    const e = Math.max(1.2, 3 * s);
    c.globalAlpha = a * .7; c.drawImage(A.gRed, x - e * 3 + 4 * s, y - e * 2.2, e * 6, e * 4.4);
    c.globalAlpha = a; c.fillStyle = 'rgb(255,92,70)'; c.fillRect(x, y, e * .9, e * .55); c.fillRect(x + 8 * s, y, e * .9, e * .55);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
function knightDraw(c, k, t, P, flash, sel) {
  const S = knightSprites(k), fl = k.flank > 0 ? -1 : 1, step = P.step;
  const x = k.x + fl * 12 * step * Math.min(1, k.s), y = k.y - 8 * step, sway = Math.sin(t * 1.1 + k.ph) * .004;
  c.save(); setL(c, P_FG); c.translate(x, y); c.rotate(sway);
  if (P.dawn > 0) c.drawImage(knightDawn(k), -S.ox, -S.oy);
  else {
    if (P.wake < 1) c.drawImage(S.night, -S.ox, -S.oy);
    if (P.wake > 0) { c.globalAlpha = P.wake; c.drawImage(S.awake, -S.ox, -S.oy); c.globalAlpha = 1; }
  }
  c.globalCompositeOperation = 'lighter';
  if (flash > .04) { c.globalAlpha = flash; c.drawImage(S.cold, -S.ox, -S.oy); }
  // Legion commands them: the visor burns green and spills out of the side of the helm
  if (P.wake > 0) {
    let [vx, vy] = VISOR[k.helm]; if (k.look) vx = 16 - vx;
    const px = fl * vx * k.s, py = vy * k.s, pulse = .82 + .18 * Math.sin(t * 3.2 + k.ph), a = P.wake * pulse * (.8 + .2 * sel);
    c.globalAlpha = a * .45; c.drawImage(A.gGreen, px - 70 * k.s, py - 40 * k.s, 140 * k.s, 80 * k.s);
    c.globalAlpha = a * .9; c.drawImage(A.gGreen, px - 22 * k.s, py - 12 * k.s, 44 * k.s, 24 * k.s);
    c.globalAlpha = a; c.fillStyle = 'rgb(200,255,226)'; c.fillRect(px - 6 * k.s, py - 1.4 * k.s, 12 * k.s, 2.8 * k.s);
  }
  c.restore();
  if (k.weapon === 'banner') drawBanner(c, k, t, P, flash, x, y);
  const z = 1 + (CAM.z - 1) * P_FG, [hx, hy] = proj(x + fl * 4 * k.s, y - 300 * k.s, P_FG);
  return { hx, hy, top: hy, left: hx - 58 * k.s * z, right: hx + 58 * k.s * z };
}
// two passes: 0 = the poles (behind our line), 1 = the boards (above the weapons and the overlay's lines, so nothing crosses the text)
function drawTags(c, t, P, carriers, flips, pass = 1) {
  const out = [];
  if (P.tagK <= 0 || P.dawn >= 1) return out;
  setL(c, P_MID);
  c.textBaseline = 'middle'; c.textAlign = 'center';
  for (const cr of carriers) {
    const i = TAGS.findIndex((g) => g.d === cr.m.d && Math.abs(g.X - 34 - cr.m.X) < 1e-6), tg = TAGS[i]; if (!tg) continue;
    const s = cr.s, fs = Math.round(clamp(12 + 230 / cr.d, 26, 38));
    const px = cr.x + 34 * s, top = cr.y - tg.pole * s - 4 + Math.sin(t * 1.3 + i) * 3, poleLen = (tg.pole - 220) * s;
    const fl = flips[i] ?? 0, on = fl > 0;
    c.font = `700 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
    const txt = on ? `✓ ${tg.text}` : tg.text, tw = c.measureText(txt).width, bw = tw + fs * 1.1, bh = fs * 1.55;
    const bx = clamp(px, bw / 2 + 14, W - bw / 2 - 14), by = top - bh * .5 - 6;   // never cut by the frame edge
    const pop = on ? 1 + .18 * Math.max(0, 1 - (fl - 1) * 4) * (fl >= 1 ? 1 : 0) : 1;
    const [L, T] = proj(bx - bw / 2, by - bh / 2, P_MID), [Rr, B] = proj(bx + bw / 2, by + bh / 2, P_MID);
    out[i] = { x: (L + Rr) / 2, y: B, w: Rr - L, h: B - T, L, R: Rr, T, B };
    if (pass === 0) { c.globalAlpha = cr.a * P.tagK; c.fillStyle = 'rgb(10,10,12)'; c.fillRect(px - 1.5, by + bh * .5 - 2, 3, 14 + poleLen); continue; }
    c.save(); c.translate(bx, by); c.scale(pop, pop);
    c.globalAlpha = cr.a * P.tagK;
    c.fillStyle = on ? 'rgba(6,18,12,.97)' : 'rgba(22,6,6,.96)'; c.fillRect(-bw / 2, -bh / 2, bw, bh);
    const col = on ? [124, 255, 178] : [255, 78, 64];
    c.strokeStyle = rgba(...col, .95); c.lineWidth = 2.5; c.strokeRect(-bw / 2 + 1.25, -bh / 2 + 1.25, bw - 2.5, bh - 2.5);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = cr.a * P.tagK * .35; c.drawImage(on ? A.gGreen : A.gRed, -bw * .75, -bh * 1.4, bw * 1.5, bh * 2.8);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = cr.a * P.tagK;
    c.fillStyle = on ? 'rgb(170,255,205)' : 'rgb(255,104,88)'; c.fillText(txt, 0, 1);
    if (on && fl < 1.35) { const u = fl - 1; if (u >= 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - u / .35) * .9; c.strokeStyle = 'rgb(160,255,205)'; c.lineWidth = 3; c.strokeRect(-bw / 2 - u * 70, -bh / 2 - u * 40, bw + u * 140, bh + u * 80); } }
    c.restore();
  }
  c.globalAlpha = 1; c.textAlign = 'left';
  return out;
}
function drawOverlay(c, t, P, heads, tags, relic, flips) {
  const k = P.overlay; if (k <= .01) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter';
  const G = (a) => rgba(124, 255, 178, a * k);
  // a faint tactical grid on the ground, swept from the foreground to the horizon
  const sy = lerp(H, HZ, P.sweep);
  c.strokeStyle = G(.07); c.lineWidth = 1.2;
  c.save(); c.beginPath(); c.rect(0, sy, W, H - sy); c.clip();
  for (let i = -16; i <= 16; i++) { c.beginPath(); c.moveTo(960 + i * 30, HZ + 2); c.lineTo(960 + i * 330, H); c.stroke(); }
  for (let j = 1; j < 14; j++) { const y = HZ + KY / (6 + j * j * 1.6); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.restore();
  if (P.sweep < 1) { const g = c.createLinearGradient(0, sy - 26, 0, sy + 26); g.addColorStop(0, G(0)); g.addColorStop(.5, G(.3 * (1 - P.sweep))); g.addColorStop(1, G(0)); c.fillStyle = g; c.fillRect(0, sy - 26, W, 52); }
  // units: brackets, names, and the order from the Relic
  const ax = relic.cx, ay = relic.cy + relic.h * .2;
  const units = [0, 1, 2, 3].map((u) => {
    const hs = heads.filter((h) => h.unit === u), L = Math.max(14, Math.min(...hs.map((h) => h.left)) - 10), Rr = Math.min(W - 14, Math.max(...hs.map((h) => h.right)) + 10);
    const T = Math.min(...hs.map((h) => h.top)) - 12, B = Math.min(H - 70, T + 190);
    return { u, L, R: Rr, T, B, cx: (L + Rr) / 2, ix: hs[0].flank < 0 ? Rr : L, names: hs.map((h) => h.name.toUpperCase()), flank: hs[0].flank };
  });
  c.font = '700 17px "JetBrains Mono", ui-monospace, monospace'; c.textBaseline = 'alphabetic';
  if (P.out) P.out.units = units.map((U, j) => ({ u: U.u, L: U.L, R: U.R, T: U.T, B: U.B, flank: U.flank, names: U.names, a: ramp(t, P.t0 + .1 + j * .1, P.t0 + .35 + j * .1) * P.overlay }));
  units.forEach((U, j) => {
    const a = ramp(t, P.t0 + .1 + j * .1, P.t0 + .35 + j * .1); if (a <= 0) return;
    const cl = 22;
    c.strokeStyle = G(.9 * a); c.lineWidth = 2.5; c.beginPath();
    c.moveTo(U.L, U.T + cl); c.lineTo(U.L, U.T); c.lineTo(U.L + cl, U.T); c.moveTo(U.R - cl, U.T); c.lineTo(U.R, U.T); c.lineTo(U.R, U.T + cl);
    c.moveTo(U.L, U.B - cl); c.lineTo(U.L, U.B); c.lineTo(U.L + cl, U.B); c.moveTo(U.R - cl, U.B); c.lineTo(U.R, U.B); c.lineTo(U.R, U.B - cl); c.stroke();
    c.fillStyle = G(.95 * a); c.textAlign = U.flank < 0 ? 'left' : 'right';
    const lab = U.names.join(' · '), lw = c.measureText(lab).width;
    const tx = U.flank < 0 ? clamp(U.L + 4, 18, W - 18 - lw) : clamp(U.R - 4, 18 + lw, W - 18);
    if (!P.chips) c.fillText(lab, tx, U.B + (U.u === 1 || U.u === 2 ? 48 : 24));   // with P.chips the agents' own busts sit here (trailer.html)
    // the order: drawn on from the Relic, then marching dashes
    const b = eo(ramp(t, P.t0 + .15 + j * .1, P.t0 + .6 + j * .1)); if (b <= 0) return;
    // the order leaves the Relic straight down, then turns out to the unit's inner corner
    const qx = (v) => (1 - v) * (1 - v) * ax + 2 * (1 - v) * v * ax + v * v * U.ix, qy = (v) => (1 - v) * (1 - v) * ay + 2 * (1 - v) * v * U.T + v * v * U.T;
    const path = () => { c.beginPath(); for (let k = 0; k <= 28; k++) { const v = b * k / 28; k ? c.lineTo(qx(v), qy(v)) : c.moveTo(qx(v), qy(v)); } };
    c.lineWidth = 7; c.strokeStyle = G(.12); path(); c.stroke();
    c.lineWidth = 2; c.strokeStyle = G(.75); c.setLineDash([16, 10]); c.lineDashOffset = -t * 70; path(); c.stroke(); c.setLineDash([]);
    c.fillStyle = G(1); c.beginPath(); c.arc(qx(b), qy(b), 4, 0, 6.2832); c.fill();
  });
  // strikes: from a unit to its tag; the tag flips when the head arrives
  STRIKES.forEach(([ti, u], i) => {
    const tg = tags[ti], U = units[u]; if (!tg || !U) return;
    const s0 = P.strike0 + i * P.strikeStep, b = eo(ramp(t, s0, s0 + P.strikeDur)); if (b <= 0) return;
    // the strike lands ON the board's edge, square to it, from the side that faces the unit
    const fx = U.ix, fy = U.T - 6, cy0 = (tg.T + tg.B) / 2;
    let tx, ty, nx, ny;
    if (fx < tg.L) { tx = tg.L; ty = cy0; nx = -1; ny = 0; } else if (fx > tg.R) { tx = tg.R; ty = cy0; nx = 1; ny = 0; } else { tx = clamp(fx, tg.L + 12, tg.R - 12); ty = fy > tg.B ? tg.B : tg.T; nx = 0; ny = fy > tg.B ? 1 : -1; }
    const mx = tx + nx * 90, my = ty + ny * 90;
    const q = (u2) => [(1 - u2) * (1 - u2) * fx + 2 * (1 - u2) * u2 * mx + u2 * u2 * tx, (1 - u2) * (1 - u2) * fy + 2 * (1 - u2) * u2 * my + u2 * u2 * ty];
    const done = b >= 1, la = done ? .5 : .95;
    c.lineWidth = 8; c.strokeStyle = G(.1); c.beginPath(); for (let s = 0; s <= 24; s++) { const [x, y] = q(b * s / 24); s ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.lineWidth = 2.5; c.strokeStyle = G(la); c.beginPath(); for (let s = 0; s <= 24; s++) { const [x, y] = q(b * s / 24); s ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    if (!done) {
      const [hx, hy] = q(b), [px, py] = q(Math.max(0, b - .03)), an = Math.atan2(hy - py, hx - px);
      c.fillStyle = G(1); c.beginPath(); c.moveTo(hx + Math.cos(an) * 14, hy + Math.sin(an) * 14); c.lineTo(hx + Math.cos(an + 2.5) * 12, hy + Math.sin(an + 2.5) * 12); c.lineTo(hx + Math.cos(an - 2.5) * 12, hy + Math.sin(an - 2.5) * 12); c.closePath(); c.fill();
      c.globalAlpha = .8; c.drawImage(A.gGreen, hx - 22, hy - 22, 44, 44); c.globalAlpha = 1;
      // a reticle closes on the target
      const rr = lerp(80, tg.w * .5 + 14, b), rot = t * 1.5, tcx = (tg.L + tg.R) / 2;
      c.strokeStyle = G(.85); c.lineWidth = 2; c.beginPath();
      for (let q2 = 0; q2 < 4; q2++) { const a0 = rot + q2 * Math.PI / 2; c.moveTo(tcx + Math.cos(a0 - .3) * rr, cy0 + Math.sin(a0 - .3) * rr * .6); c.ellipse(tcx, cy0, rr, rr * .6, 0, a0 - .3, a0 + .3); }
      c.stroke();
    }
  });
  c.restore();
}

// ---------------------------------------------------------------- the war table and the dive
function burnPath(cx, cy, R, sq, t) {
  const pts = [];
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * 6.2832, ca = Math.cos(a), sa = Math.sin(a);
    const n = vnoise(ca * 2.2 + 9 + t * .3, sa * 2.2 + 9, 5) - .5, n2 = vnoise(ca * 7 + 3, sa * 7 + 3 + t * .5, 6) - .5;
    const r = R * (1 + .36 * n + .12 * n2);
    pts.push([cx + ca * r, cy + sa * r * sq]);
  }
  return pts;
}
function tracePath(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
const m0z = (tc) => tc.m0 * tc.zm / (tc.m0 * tc.zEnd);
// the hole in the map: lit at the miniature's foot, it spreads, then opens past the frame. R in screen px; sq its vertical squash
function holeR(t, P, zm) { if (t < P.ignite) return 0; const u = t - P.ignite; return (5 + 70 * sm(clamp(u / .55))) * zm + 2900 * Math.pow(clamp((t - (P.ignite + .55)) / .45), 2.2); }
const holeSq = (P) => lerp(.24, 1, sm(clamp(P.dive * 1.1)));
function tableCam(t, P) {
  // the table camera: a slow push, then the dive (zoom about the cathedral miniature, which slides onto the real one)
  const D = P.dive, [gx0, gy0] = tproj(...mapXZ(...MAP_CATH)), m0 = .2;
  const [tx, ty] = cathPt0(235, CG), zEnd = CATH.s * (1 + (CAM.z - 1) * P_CATH) / m0;
  const e = Math.pow(D, 2.1), zm = (1 + .035 * ramp(t, .5, 4.5)) * Math.exp(Math.log(zEnd) * e), slide = sm(clamp(D * 1.15));
  return { gx: lerp(gx0, tx, slide), gy: lerp(gy0, ty, slide), zm, m0, gx0, gy0, tx, ty, zEnd };
}
function drawTableScene(c, t, P) {
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  // the room: dark stone, the candle's glow
  c.fillStyle = '#07070a'; c.fillRect(0, 0, W, H);
  const fk = .88 + .08 * Math.sin(t * 9.1) + .04 * Math.sin(t * 15.7 + 1.3);
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = .26 * fk; c.drawImage(A.gWarm, 960 - 900, 650 - 700, 1800, 1400);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.restore();
  const { gx, gy, zm, gx0, gy0, m0 } = tableCam(t, P);
  c.save(); c.setTransform(zm, 0, 0, zm, gx - gx0 * zm, gy - gy0 * zm);
  plane(c, A.wood, TBL.zf, TBL.zn, TBL.xh, 0, H + 40, 3);
  const vis = (y) => (y - gy) / zm + gy0;                           // screen y back to table y (to skip strips off screen)
  { const [a1, b1] = tproj(-MAPX, ZF), [a2] = tproj(MAPX, ZF), [a3, b3] = tproj(MAPX, ZN), [a4] = tproj(-MAPX, ZN);
    c.save(); c.beginPath(); c.moveTo(a1, b1); c.lineTo(a2, b1); c.lineTo(a3, b3); c.lineTo(a4, b3); c.closePath(); c.clip();
    plane(c, A.map, ZF, ZN, MAPX * 1.01, Math.max(0, vis(-20)), Math.min(H + 40, vis(H + 20)), 2); c.restore(); }
  // tokens: red pawns (the backlog), green disc stacks (our line)
  const toks = [...RED_T.map(([u, v, r]) => [u, v, 0, r]), ...GREEN_T.map(([u, v]) => [u, v, 1, 0])].sort((p, q) => p[1] - q[1]);
  for (const [u, v, green, r] of toks) { const [X, Z] = mapXZ(u, v); if (green) pawn(c, X, Z, [70, 44, 24], [44, 118, 72], 0); else pawn(c, X, Z, [64, 36, 20], [142, 36, 28], 1 + (r > .5 ? 0 : 0)); }
  // the candle's shadow, long, away from the flame
  const sg = c.createLinearGradient(0, 1080, 0, 760); sg.addColorStop(0, `rgba(0,0,0,${(.55 * (1 - sm(ramp(t, P.ignite + .03, P.ignite + .47)))).toFixed(3)})`); sg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sg; c.beginPath(); c.moveTo(926, 1080); c.lineTo(994, 1080); c.lineTo(972, 760); c.lineTo(948, 760); c.closePath(); c.fill();
  // candle light falls off across the table; the far edge sinks into the dark
  c.save(); c.translate(960, 1050); c.scale(1, .42);
  const lg = c.createRadialGradient(0, 0, 60, 0, 0, 1500); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(.35, 'rgba(0,0,0,.2)'); lg.addColorStop(.7, 'rgba(0,0,0,.62)'); lg.addColorStop(1, 'rgba(0,0,0,.9)');
  c.fillStyle = lg; c.fillRect(-2600, -2600, 5200, 5200); c.restore();
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = .28 * fk; c.drawImage(A.gWarm, 960 - 700, 1000 - 300, 1400, 600); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const fade = c.createLinearGradient(0, HZT + FOC / TBL.zf - 30, 0, HZT + FOC / TBL.zf + 60); fade.addColorStop(0, 'rgba(7,7,10,1)'); fade.addColorStop(1, 'rgba(7,7,10,0)');
  c.fillStyle = fade; c.fillRect(-2000, HZT + FOC / TBL.zf - 400, W + 4000, 460);
  c.restore();
  return { gx, gy, zm, m0, gx0, gy0 };
}
function drawMini(c, t, P, cam, a) {
  if (a <= 0) return;
  c.save(); c.setTransform(cam.zm, 0, 0, cam.zm, cam.gx - cam.gx0 * cam.zm, cam.gy - cam.gy0 * cam.zm);
  const m0 = cam.m0, x = cam.gx0 - 235 * m0, y = cam.gy0 - CG * m0;
  c.fillStyle = `rgba(10,5,2,${(.5 * a).toFixed(3)})`; c.beginPath(); c.ellipse(cam.gx0 - 20, cam.gy0 + 2, 70, 10, 0, 0, 6.2832); c.fill();
  c.globalAlpha = a; c.drawImage(A.mini, x, y, CW * m0, CHh * m0);
  c.restore();
}
function table(c, t, P) {
  const k = P.table; if (k <= .002) return;
  // the table is painted offscreen whenever it must be faded or cut, then composited (it fades in with the candle's light)
  const burning = t >= P.ignite, off = burning || k < .999;
  const cv = off ? A.tc : null, tc = off ? cv.getContext('2d') : c;
  if (off) { tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalAlpha = 1; tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, W, H); }
  tc.save(); tc.globalAlpha = 1;
  const cam = drawTableScene(tc, t, P);
  tc.restore();
  let ring = null, R0b = 0;
  if (burning) {
    R0b = holeR(t, P, cam.zm); const sq = holeSq(P);
    ring = burnPath(cam.gx, cam.gy, R0b, sq, t);
    const cw = 6 + R0b * .09;
    tc.save(); tc.setTransform(1, 0, 0, 1, 0, 0);
    tc.globalCompositeOperation = 'destination-out'; tracePath(tc, ring); tc.fill();
    tc.globalCompositeOperation = 'source-atop'; tc.lineJoin = 'round';
    for (const [w, col] of [[cw * 2.4, 'rgba(70,36,12,.35)'], [cw * 1.4, 'rgba(34,16,6,.7)'], [cw * .6, 'rgba(8,4,2,.95)']]) { tc.lineWidth = w; tc.strokeStyle = col; tracePath(tc, ring); tc.stroke(); }
    tc.restore();
  }
  if (off) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = k; c.drawImage(cv, 0, 0); c.restore(); }
  globalThis.__tcam = { gx: cam.gx, gy: cam.gy, gx0: cam.gx0, gy0: cam.gy0, zm: cam.zm, R: R0b, sq: holeSq(P), reg: DV.mis, k: DV.k };
  if (P.out) P.out.tcam = globalThis.__tcam;
  // the handoff: the miniature stands on the map; where the hole has opened, the real ruin (in register beneath) replaces it
  // exactly, so the silhouette is wiped from miniature to ruin with no double image
  if (ring) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.beginPath(); c.rect(-10, -10, W + 20, H + 20); c.moveTo(ring[0][0], ring[0][1]); for (let i = ring.length - 1; i >= 0; i--) c.lineTo(ring[i][0], ring[i][1]); c.closePath(); c.clip('evenodd'); }
  drawMini(c, t, P, cam, k * (1 - sm(ramp(DV.mis, 1.01, 1.08))));   // what the hole has not yet wiped dissolves once register slips
  if (ring) c.restore();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  if (ring) {
    c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
    for (const [w, col] of [[18, 'rgba(255,96,24,.28)'], [6, 'rgba(255,150,50,.85)'], [2, 'rgba(255,232,160,.95)']]) { c.lineWidth = w; c.strokeStyle = col; tracePath(c, ring); c.stroke(); }
    const Rr = rng(5); const u0 = t - P.ignite;
    for (let i = 0; i < 70; i++) {
      const born = Rr() * 1.1, life = .35 + Rr() * .4, a = (u0 - born) / life, idx = Math.floor(Rr() * ring.length), vx = (Rr() - .5) * 160, vy = -60 - Rr() * 200;
      if (a <= 0 || a >= 1) continue;
      const [ex, ey] = ring[idx], x = ex + vx * a * life, y = ey + vy * a * life + 90 * a * a, s = 6 + Rr() * 8;
      c.globalAlpha = (1 - a) * .9; c.drawImage(A.gYel, x - s, y - s, s * 2, s * 2);
    }
  }
  // the ember: it leaves the flame, arcs over the map and lands at the miniature's foot
  const eu = P.ember;
  if (eu > 0 && eu < 1) {
    const x = lerp(960, cam.gx, eu), y = lerp(655, cam.gy, eu) - Math.sin(eu * Math.PI) * 120;
    c.globalCompositeOperation = 'lighter';
    for (let j = 10; j >= 0; j--) { const u2 = Math.max(0, eu - j * .02), xx = lerp(960, cam.gx, u2), yy = lerp(655, cam.gy, u2) - Math.sin(u2 * Math.PI) * 120; c.globalAlpha = (1 - j / 11) * .8; const s = 14 - j; c.drawImage(A.gYel, xx - s, yy - s, s * 2, s * 2); }
    c.globalAlpha = 1; c.drawImage(A.gWarm, x - 34, y - 34, 68, 68); c.drawImage(A.gYel, x - 10, y - 10, 20, 20);
  }
  if (t >= P.ignite && t < P.ignite + .25) { const a = 1 - (t - P.ignite) / .25; c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.drawImage(A.gYel, cam.gx - 60, cam.gy - 40, 120, 80); }
  c.restore();
}

// the snuffed candle's last breath: a thin wisp that leaves the wick where it was when the candle dropped, curls and thins out
let WICK = null;
function candleSmoke(c, t, P) {
  const t0 = P.candleFall; if (t0 === undefined || t < t0 || t > t0 + 1.4) return;
  if (!WICK) { const D = clamp((t0 - 4.5) / .97), C = tableCam(t0, { ...P, dive: D }); WICK = [C.gx + (960 - C.gx0) * C.zm, C.gy + (650 - C.gy0) * C.zm, C.zm]; }
  const [wx, wy, wz] = WICK, u = t - t0;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 16; i++) {
    const v = u - i * .045; if (v <= 0) continue;
    const rise = v * 260 * wz, x = wx + Math.sin(v * 5 + i * .7) * 18 * wz * v + v * v * 60, y = wy - rise, r = (6 + v * 46) * wz;
    c.globalAlpha = clamp(.55 * (1 - v / 1.2) * (1 - i / 18)); c.drawImage(A.smokeL, x - r, y - r, r * 2, r * 2);
  }
  c.restore();
}

// ---------------------------------------------------------------- the frame
// opt-in section profiler (globalThis.__fieldProf = true): each mark flushes the canvas so raster cost lands in its own section
let PS = null, PC = null; const PM = (n) => { if (!PS) return; PC.getImageData(0, 0, 1, 1); const now = performance.now(); PS.push([n, now - PS.t]); PS.t = now; };
let KN = null;
export function drawField(c, t, P, roster, relic) {
  const T0 = performance.now(); PS = globalThis.__fieldProf ? Object.assign([], { t: T0 }) : null; PC = c; globalThis.__fieldSec = PS;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  if (P.field <= .002 && P.table <= .002) return;
  if (!A) build();
  if (!KN) KN = knights(roster);
  CAM.z = P.zoom; CAM.dx = P.drift;
  // thunder shake after each strike
  let sh = 0; for (const [t0] of P.bolts) { const u = t - t0 - .05; if (u > 0 && u < .5) sh += (1 - u / .5) * 4; }
  CAM.sx = Math.sin(t * 73) * sh; CAM.sy = Math.cos(t * 61) * sh * .7;
  if (P.field > .002) {
    let flash = 0, boltX = 960;
    for (const [t0, x0, , k] of P.bolts) { const f = flashEnv(t - t0) * k; if (f > flash) { flash = f; boltX = x0; } }
    if (P.dawn > 0) flash = 0;
    DV.k = 1; DV.ax = DV.bx = 0; DV.ay = DV.by = 0; DV.mis = 1;
    if (P.table > .002 && t < P.ignite + 1.2) {                       // the field under the burning map, in register with the miniature
      const tc0 = tableCam(t, P), k = clamp(m0z(tc0), .05, 1), R = holeR(t, P, tc0.zm) * 1.26, sq = holeSq(P);   // burnPath's ragged edge reaches 1.24 R
      const pL = Math.max(0, tc0.gx - R), pR = Math.min(W, tc0.gx + R), pT = Math.max(0, tc0.gy - R * sq), pB = Math.min(H, tc0.gy + R * sq);
      // the field's painted extent at k = 1 (sky, ground, rise and horde plates), shrunk by a 1.15x overscan margin
      const mx = 30, my = 30, fL = -200 + mx, fR = W + 100 - mx, fT = -60 + my, fB = H + 30 - my, ax = tc0.tx, ay = tc0.ty, bx = tc0.gx, by = tc0.gy;
      const need = Math.max(k, pL < bx ? (bx - pL) / (ax - fL) : 0, pR > bx ? (pR - bx) / (fR - ax) : 0, pT < by ? (by - pT) / (ay - fT) : 0, pB > by ? (pB - by) / (fB - ay) : 0);
      // the cover scale settles to exactly 1 as the camera lands (b reaches a), so the field arrives at its own framing with no pop
      // eased in log space ahead of the hole's explosion (the plunge), never below what the hole needs
      const ease = eo(ramp(t, P.ignite + .57, P.ignite + .81)), kz = Math.exp(Math.log(k) * (1 - ease));
      const kk = lerp(Math.max(need, kz), 1, sm(ramp(P.dive, .86, 1)));
      DV.k = Math.min(Math.max(kk, k), 1.6); DV.ax = ax; DV.ay = ay; DV.bx = bx; DV.by = by; DV.mis = DV.k / k;
      const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, 'rgb(6,9,12)'); bg.addColorStop(.6, 'rgb(40,40,40)'); bg.addColorStop(1, 'rgb(9,10,12)'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    }
    drawSky(c, t, P, flash, boltX); PM('drawSky');
    // the bolts: the first finds the spire, the second the open field
    for (const [t0, x0, seed, k] of P.bolts) {
      const dt = t - t0; if (dt < 0 || dt > .22 || P.dawn > 0) continue;
      const a = (dt < .07 ? 1 : dt < .1 ? .25 : dt < .15 ? .9 : Math.max(0, 1 - (dt - .15) / .07)) * k;
      const [sx, sy] = cathPt(...CATH.tip), hit = Math.abs(x0 - sx) < 160;
      const ex = hit ? sx : x0, ey = hit ? sy : HZ + 6;
      drawBolt(c, boltGeom(seed, ex + (hit ? 140 : -120), -40, ex, ey), a);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.drawImage(A.gCold, ex - 90, ey - 60, 180, 120); c.restore();
    }
    drawSun(c, t, P);
    drawFar(c, t, P, flash); PM('drawFar');
    drawCathedral(c, t, P, flash); PM('drawCathedral');
    drawGround(c, t, P, flash); PM('drawGround');
    drawStrips(c, t, P); PM('drawStrips');
    const carriers = [];
    drawHorde(c, t, P, flash, carriers); PM('drawHorde');
    // tags flip as the strikes land
    const flips = [];
    STRIKES.forEach(([ti], i) => { const land = P.strike0 + i * P.strikeStep + P.strikeDur; flips[ti] = t >= land ? 1 + (t - land) : 0; });
    const tags = drawTags(c, t, P, carriers, flips, 0); PM('drawTags');
    // our line
    const sel = [0, 0, 0, 0];
    STRIKES.forEach(([, u], i) => { const s0 = P.strike0 + i * P.strikeStep; if (t > s0 && t < s0 + P.strikeDur + .3) sel[u] = 1; });
    drawRise(c, P, flash); PM('drawRise');
    const order = KN.map((k, i) => i).sort((a, b) => KN[a].y - KN[b].y);
    const heads = [];
    for (const i of order) { const k = KN[i]; heads[i] = { ...knightDraw(c, k, t, P, flash, sel[k.unit]), name: k.name, unit: k.unit, flank: k.flank }; } PM('knights');
    drawOverlay(c, t, P, heads, tags, relic, flips); PM('drawOverlay');
    drawTags(c, t, P, carriers, flips, 1);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // near rain, in front of everything
    if (P.dawn < 1) {
      c.save(); const oy = (t * 1500) % 512, ox = (-oy * .22) % 512;
      c.globalAlpha = Math.min(1, (1 - P.dawn) * (.5 + 1.4 * flash)); c.translate(ox, oy); c.fillStyle = A.rainPat || (A.rainPat = c.createPattern(A.rain, 'repeat')); c.fillRect(-ox - 10, -oy - 10, W + 20, H + 20); c.restore();
    }
    // lightning: a cold wash over everything for the flash frames
    if (flash > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(120, 140, 175, .10 * flash); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
    // a soft dark band under the subtitle so it never fights the field (only while it shows)
    if (P.band > 0) {
      c.save(); c.translate(960, 800); c.scale(1, .2);
      const bg = c.createRadialGradient(0, 0, 20, 0, 0, 640); bg.addColorStop(0, rgba(2, 3, 4, .66 * P.band)); bg.addColorStop(1, rgba(2, 3, 4, 0));
      c.fillStyle = bg; c.fillRect(-700, -700, 1400, 1400); c.restore();
    }
    // the Relic's green on the field once it is awake
    if (P.wake > 0 && P.dawn < 1) {
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = P.wake * .12 * (1 - P.dawn);
      c.drawImage(A.gGreen, relic.cx - 560, relic.cy - 200, 1120, 760);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    if (P.field < 1) { c.globalCompositeOperation = 'destination-in'; c.fillStyle = `rgba(0,0,0,${P.field.toFixed(3)})`; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
    if (P.dim > 0) { c.fillStyle = rgba(3, 4, 5, P.dim * P.field); c.fillRect(0, 0, W, H); }
  }
  table(c, t, P); PM('table');
  candleSmoke(c, t, P);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const ms = performance.now() - T0;
  const L = (globalThis.__fieldMs ||= []); L.push([t, ms]); if (L.length > 300) L.shift();   // drawField ms, for the timing harness
}
