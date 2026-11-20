// Chapter: Playing together.
//  rooms(el)  – three.js diorama, one room per era of playing together online
//  crowd(el)  – how many people share one game (log scale, SVG)
//  spread(el) – invite-only growth as a spreading social graph (2D canvas)
//  talk(el)   – how we talked: typed → voice apps → headset → Discord (SVG strip)
import { THREE, stage, glowSprite, glowPoints, rng, C, lerp, clamp, smooth, reduceMotion } from './lib.js';

// ================================================================== ROOMS
const ERAS = [
  { year: '1978', title: 'A world made of text', cap: 'MUD1, University of Essex. A few dozen students share one imaginary world, typing to each other through the night.', col: 0x7dffa0 },
  { year: '1994', title: 'Bring your own computer', cap: 'DreamHack begins in a Swedish school: about 40 people, their computers, and a lot of cables.', col: 0xffc77a },
  { year: '1999', title: 'Every night, down the street', cap: 'South Korea goes from about 100 PC bangs in 1997 to more than 13,000. StarCraft becomes something you play with friends after school.', col: 0x7fb4ff },
  { year: '2002', title: 'Voices across the dark', cap: 'Xbox Live ships with a headset. Teammates stop typing and start talking, from bedrooms hundreds of miles apart.', col: 0xb9a0ff },
  { year: '2020', title: 'A concert in a game', cap: '12.3 million people watch Travis Scott inside Fortnite at once, in crowds of about fifty, during a year when nobody could gather.', col: 0xff7ad9 },
  { year: '2026', title: 'Six friends, one match', cap: 'Deadlock: six people in six cities, one voice channel, one street. In October, 303,347 people played at once.', col: C.amber },
];

export function rooms(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 34, bg: 0x07090c });
  const scene = s.scene;
  const R = rng(1978);
  scene.add(new THREE.HemisphereLight(0x9aa6c0, 0x14120f, 1.1));

  const GAP = 240;
  const groups = ERAS.map((e, i) => { const g = new THREE.Group(); g.position.x = i * GAP; scene.add(g); return g; });
  const flick = []; // emissive things to animate
  const mat = (c, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough });
  const DARK = mat(0x2a2d33), DESK = mat(0x3a332b), WALL = mat(0x15181d);
  const screenMat = (c, k = 1) => { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }); flick.push(m); m.userData.base = new THREE.Color(c).multiplyScalar(k); return m; };
  const box = (g, w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  const sitter = (g, x, z, rot = 0, c = 0x0d0f12) => {
    const p = new THREE.Group(); const m = mat(c);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.6, 3, 8), m); torso.position.y = 7.4; p.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 8), m); head.position.set(0, 10.4, -0.4); p.add(head);
    const chair = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 4), DARK); chair.position.y = 4.6; p.add(chair);
    p.position.set(x, 0, z); p.rotation.y = rot; g.add(p); return p;
  };
  const floor = (g, w, d, c = 0x101317) => { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(c)); f.rotation.x = -Math.PI / 2; g.add(f); };
  const light = (g, c, x, y, z, i = 40, dist = 70) => { const l = new THREE.PointLight(c, i, dist, 1.6); l.position.set(x, y, z); g.add(l); return l; };

  // ---- 1978: terminal room
  {
    const g = groups[0]; floor(g, 90, 70);
    box(g, 90, 40, 2, WALL, 0, 20, -30);
    for (let i = 0; i < 4; i++) {
      const x = -27 + i * 18;
      box(g, 14, 1, 8, DESK, x, 6, -14);
      box(g, 8, 7, 7, mat(0xb8b09a), x, 10, -15); // terminal body
      box(g, 6, 4.6, 0.3, screenMat(0x7dffa0, 0.9), x, 10.6, -11.4);
      box(g, 7, 0.6, 3, mat(0xa49c86), x, 6.8, -10);
      sitter(g, x, -5, Math.PI);
      light(g, 0x7dffa0, x, 11, -9, 18, 30);
    }
    // a glowing line of text crawling upward on the wall: the shared world
    const t = glowPoints(160, 2.6, 0x7dffa0); const tp = t.geometry.attributes.position.array;
    for (let i = 0; i < 160; i++) { tp[i * 3] = -40 + (i % 40) * 2; tp[i * 3 + 1] = 18 + Math.floor(i / 40) * 3; tp[i * 3 + 2] = -28.6; }
    g.add(t); g.userData.text = t;
  }
  // ---- 1994: LAN party
  {
    const g = groups[1]; floor(g, 100, 80, 0x15130f);
    for (const row of [-14, 6]) {
      box(g, 80, 1, 9, DESK, 0, 6, row);
      for (let i = 0; i < 6; i++) {
        const x = -32 + i * 13, back = row < 0;
        box(g, 8, 7, 7, mat(0xcfc6b0), x, 10, row - 1);
        box(g, 6.2, 4.6, 0.3, screenMat([0xffb070, 0x9fd0ff, 0xd0ff9f][i % 3], 0.9), x, 10.6, row + 2.6);
        sitter(g, x, row + 9, Math.PI, [0x1b1d22, 0x23201c, 0x1a1f26][i % 3]);
        if (R() < 0.5) box(g, 6, 0.6, 6, mat(0xb08a52), x + 5, 6.8, row + 3); // pizza box
      }
    }
    // cables on the floor
    const cm = new THREE.LineBasicMaterial({ color: 0x3a3f48 });
    for (let k = 0; k < 18; k++) {
      const pts = []; let x = -40 + R() * 80, z = -20 + R() * 40;
      for (let j = 0; j < 8; j++) { pts.push(new THREE.Vector3(x, 0.2, z)); x += (R() - 0.5) * 14; z += (R() - 0.5) * 10; }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cm));
    }
    light(g, 0xffc77a, 0, 30, 0, 60, 120);
  }
  // ---- 1999: PC bang rows
  {
    const g = groups[2]; floor(g, 110, 100, 0x0e1116);
    for (let r = 0; r < 5; r++) for (let i = 0; i < 8; i++) {
      const x = -42 + i * 12, z = -30 + r * 14;
      box(g, 11, 1, 6, DARK, x, 6, z);
      box(g, 0.5, 9, 6, DARK, x + 5.6, 8, z); // booth divider
      box(g, 7, 4.4, 0.3, screenMat(0x7fb4ff, 0.75 + R() * 0.4), x, 10, z - 1.6);
      if (R() < 0.8) sitter(g, x, z + 5, Math.PI, 0x0b0d10);
    }
    const sign = glowSprite(0xff5577, 30, 0.8); sign.position.set(0, 34, -40); g.add(sign);
    light(g, 0x7fb4ff, 0, 22, 0, 50, 120);
  }
  // ---- 2002: one bedroom, voices to faraway rooms
  {
    const g = groups[3];
    const room = new THREE.Group(); g.add(room);
    floor(room, 40, 34, 0x14111a);
    box(room, 40, 26, 1, WALL, 0, 13, -17);
    box(room, 18, 1, 8, DESK, 0, 6, -10); box(room, 12, 0.8, 6, mat(0x2b2f36), 0, 14, -12);
    box(room, 9, 5.4, 0.3, screenMat(0xb9a0ff, 0.9), 0, 12, -11.2);
    const me = sitter(room, 0, -1, Math.PI, 0x1d1a24);
    const hs = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.3, 6, 16, Math.PI), mat(0x888888)); hs.position.set(0, 11, -0.6); me.add(hs);
    light(room, 0xb9a0ff, 0, 14, -6, 30, 50);
    // distant friends: tiny lit windows far off, linked by arcs
    const far = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3, r = 60 + R() * 30;
      const p = new THREE.Vector3(Math.cos(a) * r, 2, Math.sin(a) * r * 0.55 - 10);
      box(g, 4, 3, 4, screenMat(0xb9a0ff, 0.6), p.x, 1.5, p.z);
      far.push(p);
    }
    const arcMat = new THREE.LineBasicMaterial({ color: 0xb9a0ff, transparent: true, opacity: 0.5 });
    const pulses = glowPoints(far.length * 3, 3, 0xd8c8ff); g.add(pulses);
    const curves = far.map((p) => {
      const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 11, -1), new THREE.Vector3(p.x / 2, 34, p.z / 2), p);
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(40)), arcMat));
      return c;
    });
    g.userData.voice = { curves, pulses };
  }
  // ---- 2020: concert as a particle sea
  {
    const g = groups[4];
    const N = 14000; const sea = glowPoints(N, 1.3); const sp = sea.geometry.attributes.position.array, sc = sea.geometry.attributes.color.array;
    const pal = [new THREE.Color(0xff7ad9), new THREE.Color(0x7fb4ff), new THREE.Color(0xffe08a), new THREE.Color(0x7ff0e0)];
    for (let i = 0; i < N; i++) {
      const a = R() * Math.PI, r = 14 + Math.sqrt(R()) * 70;
      sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = 0.6; sp[i * 3 + 2] = Math.sin(a) * r * 0.8 - 20;
      const c = pal[Math.floor(R() * 4)]; const b = 0.25 + R() * 0.6; sc[i * 3] = c.r * b; sc[i * 3 + 1] = c.g * b; sc[i * 3 + 2] = c.b * b;
    }
    g.add(sea); g.userData.sea = { sea, base: sp.slice() };
    const giant = glowSprite(0xff7ad9, 70, 0.7); giant.position.set(0, 36, -34); g.add(giant);
    const beam = glowSprite(0xffffff, 30, 0.9); beam.position.set(0, 18, -30); g.add(beam);
    g.userData.giant = giant;
  }
  // ---- 2026: six rooms in six cities, linked into one match
  {
    const g = groups[5];
    const center = new THREE.Vector3(0, 6, -6);
    const core = glowSprite(C.amber, 26, 0.95); core.position.copy(center); g.add(core);
    const halo = glowSprite(C.amber, 80, 0.25); halo.position.copy(center); g.add(halo);
    const cities = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.5;
      const p = new THREE.Vector3(Math.cos(a) * 48, 0, Math.sin(a) * 30 - 6);
      // a tiny city block with one lit window: someone's room
      for (let b = 0; b < 5; b++) box(g, 4 + R() * 3, 4 + R() * 14, 4 + R() * 3, DARK, p.x + (R() - 0.5) * 14, 0, p.z + (R() - 0.5) * 10).geometry.translate(0, 0.5, 0);
      const win = glowSprite(C.amber, 9, 1); win.position.set(p.x, 5, p.z); g.add(win);
      cities.push(p.clone().setY(5));
    }
    const lm = new THREE.LineBasicMaterial({ color: C.amber, transparent: true, opacity: 0.45 });
    const curves = cities.map((p) => {
      const c = new THREE.QuadraticBezierCurve3(p, p.clone().lerp(center, 0.5).setY(22), center);
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(40)), lm));
      return c;
    });
    const pulses = glowPoints(18, 2.6, 0xffe2a8); g.add(pulses);
    g.userData.voice = { curves, pulses };
  }

  // ---- camera + stepping
  let idx = 0, cur = 0;
  const label = el.querySelector('[data-era]');
  const buttons = [...el.querySelectorAll('[data-room]')];
  function go(i) {
    idx = clamp(i, 0, ERAS.length - 1);
    const e = ERAS[idx];
    label.innerHTML = `<span class="fig">${e.year}</span><h4>${e.title}</h4><p>${e.cap}</p>`;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.room === idx)));
  }
  buttons.forEach((b) => b.addEventListener('click', () => go(+b.dataset.room)));
  el.querySelector('[data-prev]').addEventListener('click', () => go(idx - 1));
  el.querySelector('[data-next]').addEventListener('click', () => go(idx + 1));
  view.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); } });
  let px = 0;
  view.addEventListener('pointermove', (e) => { const r = view.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; });
  // swipe on touch
  let sx = null;
  view.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  view.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) go(idx + (e.clientX < sx ? 1 : -1)); sx = null; });

  const look = new THREE.Vector3(), tmp = new THREE.Vector3();
  s.frame.push((dt, t) => {
    cur += (idx - cur) * (1 - Math.pow(0.03, dt));
    const narrow = s.width / s.height < 1;
    const x = cur * GAP;
    const orbit = reduceMotion ? 0 : Math.sin(t * 0.15) * 0.18 + px * 0.4;
    const dist = narrow ? 150 : 105;
    s.camera.position.set(x + Math.sin(orbit) * dist, narrow ? 70 : 52, Math.cos(orbit) * dist);
    look.set(x, 6, -6); s.camera.lookAt(look);
    // screens flicker softly
    flick.forEach((m, i) => { const f = 0.85 + 0.15 * Math.sin(t * (3 + (i % 7)) + i); m.color.copy(m.userData.base).multiplyScalar(f); });
    // text crawl in 1978
    const tg = groups[0].userData.text; if (tg) { const p = tg.geometry.attributes.position.array; for (let i = 0; i < 160; i++) { p[i * 3 + 1] += dt * 1.4; if (p[i * 3 + 1] > 36) p[i * 3 + 1] = 18; } tg.geometry.attributes.position.needsUpdate = true; }
    // voice pulses travel along arcs
    for (const gi of [3, 5]) {
      const v = groups[gi].userData.voice; const pp = v.pulses.geometry.attributes.position.array;
      for (let k = 0; k < v.pulses.geometry.attributes.position.count; k++) {
        const c = v.curves[k % v.curves.length]; const f = ((t * 0.35 + k * 0.37) % 1);
        c.getPoint(gi === 5 ? f : 1 - f, tmp); pp[k * 3] = tmp.x; pp[k * 3 + 1] = tmp.y; pp[k * 3 + 2] = tmp.z;
      }
      v.pulses.geometry.attributes.position.needsUpdate = true;
    }
    // the crowd sways
    const sea = groups[4].userData.sea; if (sea && Math.abs(cur - 4) < 1.2) {
      const p = sea.sea.geometry.attributes.position.array, b = sea.base;
      for (let i = 0; i < p.length; i += 3) p[i + 1] = 0.6 + Math.max(0, Math.sin(t * 4 + b[i] * 0.15 + b[i + 2] * 0.1)) * 1.6;
      sea.sea.geometry.attributes.position.needsUpdate = true;
      groups[4].userData.giant.material.opacity = 0.5 + 0.3 * Math.sin(t * 2);
    }
  });
  go(0);
  window.__rooms = { go };
}

// ================================================================== CROWD
const CROWD = [
  { y: 1974, n: 2, name: 'Maze War', kind: 'match', note: 'two terminals joined by a cable' },
  { y: 1974, n: 32, name: 'Spasim', kind: 'match', note: 'four teams of eight on PLATO', dx: 10 },
  { y: 1993, n: 4, name: 'Doom', kind: 'match', note: 'deathmatch over an office network' },
  { y: 1996, n: 16, name: 'Quake', kind: 'match', note: 'strangers over the internet' },
  { y: 1997, n: 2500, name: 'Ultima Online', kind: 'world', note: 'about 2,500 per server copy (approximate)' },
  { y: 2002, n: 64, name: 'Battlefield 1942', kind: 'match', note: '64 players on one battlefield' },
  { y: 2015, n: 1158, name: 'PlanetSide 2', kind: 'match', note: 'record single shooter battle' },
  { y: 2017, n: 100, name: 'PUBG / Fortnite', kind: 'match', note: '100 dropped onto one island', lab: 'up' },
  { y: 2020, n: 6557, name: 'EVE Online', kind: 'match', note: 'one space battle, 6,557 at once', lab: 'up' },
  { y: 2020, n: 12.3e6, name: 'Fortnite concert', kind: 'event', note: '12.3M at once, split into groups of ~50' },
  { y: 2024.6, n: 12, name: 'Deadlock · 12', kind: 'match', note: 'six against six', hero: true, lab: 'up' },
  { y: 2011, n: 10, name: 'League of Legends', kind: 'match', note: 'five against five', dx: -6 },
];

export function crowd(el) {
  const host = el.querySelector('.view');
  const tip = el.querySelector('[data-tip]');
  const W = 640, H = 340, L = 56, Rr = 20, T = 18, Bm = 40;
  const X = (y) => L + ((y - 1970) / (2028 - 1970)) * (W - L - Rr);
  const Y = (n) => T + (1 - Math.log10(n) / 8) * (H - T - Bm);
  let b = '';
  for (let e = 0; e <= 8; e++) {
    const y = Y(10 ** e);
    b += `<line x1="${L}" x2="${W - Rr}" y1="${y}" y2="${y}" stroke="var(--rule)" stroke-width="${e % 2 ? 0.5 : 1}"/>`;
    if (e % 2 === 0 || e === 1) b += `<text x="${L - 8}" y="${y + 4}" text-anchor="end" fill="var(--faint)" font-family="var(--f-mono)" font-size="10">${['1', '10', '100', '1k', '10k', '100k', '1M', '10M', '100M'][e]}</text>`;
  }
  for (let yr = 1970; yr <= 2025; yr += 10) b += `<text x="${X(yr)}" y="${H - Bm + 18}" text-anchor="middle" fill="var(--faint)" font-family="var(--f-mono)" font-size="10">${yr}</text>`;
  // team-size band
  b += `<rect x="${L}" y="${Y(13)}" width="${W - L - Rr}" height="${Y(9) - Y(13)}" fill="var(--amber)" opacity="0.08"/>`;
  b += `<text x="${L + 6}" y="${Y(9) + 13}" text-anchor="start" fill="var(--amber)" font-family="var(--f-mono)" font-size="10" letter-spacing="0.8">TEAM SIZE</text>`;
  CROWD.forEach((d, i) => {
    const x = X(d.y) + (d.dx || 0), y = Y(d.n);
    const c = d.hero ? 'var(--amber)' : 'var(--brass)';
    const mark = d.kind === 'match' ? `<circle cx="${x}" cy="${y}" r="${d.hero ? 7 : 5}" fill="${c}" stroke="var(--ink-2)" stroke-width="2"/>`
      : d.kind === 'world' ? `<circle cx="${x}" cy="${y}" r="5.5" fill="var(--ink-2)" stroke="${c}" stroke-width="2"/>`
      : `<circle cx="${x}" cy="${y}" r="6" fill="var(--ink-2)" stroke="${c}" stroke-width="2" stroke-dasharray="2 2"/>`;
    const right = x < W - 140, up = d.lab === 'up';
    b += `<g class="cm" data-i="${i}" tabindex="0">${mark}<circle cx="${x}" cy="${y}" r="14" fill="transparent"/>` +
      `<text x="${up ? x : x + (right ? 10 : -10)}" y="${up ? y - 13 : y + 4}" text-anchor="${up ? 'middle' : right ? 'start' : 'end'}" fill="${d.hero ? 'var(--amber)' : 'var(--paper)'}" font-family="var(--f-mono)" font-size="${d.hero ? 12 : 10}" font-weight="${d.hero ? 500 : 400}">${d.name}</text></g>`;
  });
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Number of people who can share one game, 1974 to 2026, on a logarithmic scale" style="width:100%;height:auto;display:block">${b}</svg>`;
  const show = (g) => {
    const d = CROWD[+g.dataset.i];
    tip.innerHTML = `<b>${d.name}, ${Math.floor(d.y)}</b> · ${d.n >= 1e6 ? (d.n / 1e6).toFixed(1) + ' million' : d.n.toLocaleString()} ${d.kind === 'world' ? 'per server' : d.kind === 'event' ? 'at one event' : 'in one match'}: ${d.note}`;
  };
  host.querySelectorAll('.cm').forEach((g) => { g.addEventListener('pointerenter', () => show(g)); g.addEventListener('focus', () => show(g)); g.addEventListener('click', () => show(g)); });
  // table view for screen readers / anyone
  const tbl = el.querySelector('[data-table]');
  if (tbl) tbl.innerHTML = `<table><thead><tr><th>Year</th><th>Game</th><th>Together</th><th>Kind</th></tr></thead><tbody>${[...CROWD].sort((a, b) => a.y - b.y).map((d) => `<tr><td class="num">${Math.floor(d.y)}</td><td>${d.name}</td><td class="num">${d.n.toLocaleString()}</td><td>${d.kind}</td></tr>`).join('')}</tbody></table>`;
}

// ================================================================== SPREAD
export function spread(el) {
  const view = el.querySelector('.view');
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  const ctx = cv.getContext('2d');
  const out = el.querySelector('[data-spread]');
  const R = rng(2024);
  const N = 900, PER = 340; // each dot stands for ~340 players, so 900 dots ≈ the Oct 2026 peak
  let W = 1, H = 1, dpr = 1;
  // people clustered in friend groups (cities / schools / Discords)
  const nodes = [];
  const clusters = Array.from({ length: 34 }, () => ({ x: R(), y: R(), r: 0.03 + R() * 0.06 }));
  for (let i = 0; i < N; i++) {
    const c = clusters[Math.floor(R() * clusters.length)];
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * c.r;
    nodes.push({ x: clamp(c.x + Math.cos(a) * d, 0.02, 0.98), y: clamp(c.y + Math.sin(a) * d, 0.04, 0.96), on: 0, t: 0, links: [], streamer: R() < 0.012 });
  }
  // friendships: nearest neighbours, plus a few long-distance ties; streamers reach far
  for (let i = 0; i < N; i++) {
    const n = nodes[i];
    const near = nodes.map((m, j) => [j, (m.x - n.x) ** 2 + (m.y - n.y) ** 2]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 4);
    near.forEach(([j]) => { n.links.push(j); nodes[j].links.push(i); });
    if (R() < 0.08) { const j = Math.floor(R() * N); n.links.push(j); nodes[j].links.push(i); }
    if (n.streamer) for (let k = 0; k < 40; k++) n.links.push(Math.floor(R() * N));
  }
  const edges = [];
  nodes.forEach((n, i) => n.links.forEach((j) => { if (i < j) edges.push([i, j]); }));
  let clock = 0, queue = [], count = 0;
  const MILES = [[171490, 'Sept 2024 peak: 171,490'], [303347, 'Oct 2026 peak: 303,347']];
  function seed(i) { if (nodes[i].on) return; nodes[i].on = 1; nodes[i].t = clock; count++; queue.push({ i, at: clock + 0.6 + R() * 0.8 }); }
  function reset() { nodes.forEach((n) => { n.on = 0; }); queue = []; count = 0; clock = 0; }
  function step(dt) {
    clock += dt;
    const due = queue.filter((q) => q.at <= clock); queue = queue.filter((q) => q.at > clock);
    for (const { i } of due) {
      const n = nodes[i];
      // each new player invites a few friends; not all of them say yes
      for (const j of n.links) if (!nodes[j].on && R() < (n.streamer ? 0.35 : 0.45)) { nodes[j].on = 1; nodes[j].t = clock; nodes[j].from = i; count++; queue.push({ i: j, at: clock + 0.5 + R() * 1.4 }); }
    }
  }
  new ResizeObserver(() => { dpr = Math.min(2, devicePixelRatio || 1); W = view.clientWidth; H = view.clientHeight; cv.width = W * dpr; cv.height = H * dpr; draw(); }).observe(view);
  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / W, y = (e.clientY - r.top) / H;
    let best = 0, bd = 1e9; nodes.forEach((n, i) => { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = i; } });
    seed(best);
  });
  el.querySelector('[data-reset]').addEventListener('click', () => { reset(); draw(); });
  el.querySelector('[data-seed]').addEventListener('click', () => { reset(); seed(Math.floor(R() * N)); });
  function draw() {
    if (W < 10) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0d10'; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (const [i, j] of edges) {
      const a = nodes[i], b = nodes[j];
      const lit = a.on && b.on && (a.from === j || b.from === i);
      const long = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 > 0.02;
      if (!lit && long) continue;
      ctx.strokeStyle = lit ? 'rgba(240,164,58,0.55)' : 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H); ctx.stroke();
    }
    for (const n of nodes) {
      const age = clock - n.t;
      if (n.on) {
        const fresh = Math.max(0, 1 - age / 1.2);
        ctx.fillStyle = `rgba(240,164,58,${0.75 + fresh * 0.25})`;
        ctx.beginPath(); ctx.arc(n.x * W, n.y * H, (n.streamer ? 4.5 : 2.4) + fresh * 3, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = n.streamer ? 'rgba(232,226,212,0.55)' : 'rgba(232,226,212,0.22)';
        ctx.beginPath(); ctx.arc(n.x * W, n.y * H, n.streamer ? 3.6 : 1.8, 0, 7); ctx.fill();
      }
    }
    const people = count * PER;
    const hit = MILES.filter(([v]) => people >= v).pop();
    out.innerHTML = count
      ? `<b class="amber">${count.toLocaleString()}</b> dots playing · each dot is about ${PER} people · ≈ <b>${people.toLocaleString()}</b>${hit ? ` <span class="soul">· passed the ${hit[1]}</span>` : ''}`
      : 'Click anyone to give them the first invite.';
  }
  let last = performance.now(), visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(view);
  function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (visible) { step(dt); draw(); } requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  window.__spread = { step: (s) => { for (let k = 0; k < s * 30; k++) step(1 / 30); draw(); }, seed, reset, get count() { return count; } };
}

// ================================================================== TALK
export function talk(el) {
  const host = el.querySelector('[data-talk]');
  const t = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || 'var(--dim)'}" font-family="var(--f-mono)" font-size="${o.size || 10}" text-anchor="middle" letter-spacing="0.8">${s}</text>`;
  const head = (x, y, c = 'var(--paper)') => `<circle cx="${x}" cy="${y}" r="9" fill="${c}"/><rect x="${x - 11}" y="${y + 11}" width="22" height="20" rx="8" fill="${c}"/>`;
  const waves = (x, y, c) => [10, 17, 24].map((r) => `<path d="M${x} ${y - r} A ${r} ${r} 0 0 1 ${x} ${y + r}" fill="none" stroke="${c}" stroke-width="1.6" opacity="${1 - r / 30}"/>`).join('');
  const cells = [
    ['1978', 'TYPED', `<rect x="18" y="26" width="84" height="56" fill="none" stroke="#7dffa0"/>${[0, 1, 2, 3].map((i) => `<rect x="26" y="${36 + i * 11}" width="${30 + ((i * 23) % 40)}" height="4" fill="#7dffa0" opacity="0.8"/>`).join('')}`],
    ['1999', 'VOICE APPS', `${head(40, 44)}${waves(54, 52, 'var(--brass)')}${head(96, 44, 'var(--dim)')}`],
    ['2002', 'HEADSETS', `${head(60, 44)}<path d="M47 42 A 13 13 0 0 1 73 42" fill="none" stroke="var(--sapphire)" stroke-width="3"/><circle cx="47" cy="46" r="4" fill="var(--sapphire)"/><path d="M47 50 Q 50 62 62 62" stroke="var(--sapphire)" stroke-width="2" fill="none"/>`],
    ['2015', 'DISCORD', `${[0, 1, 2, 3, 4].map((i) => `<rect x="22" y="${26 + i * 12}" width="10" height="8" rx="2" fill="#8c9eff"/><rect x="38" y="${28 + i * 12}" width="${40 + ((i * 17) % 30)}" height="4" fill="var(--dim)"/>`).join('')}`],
    ['2026', 'SIX IN A CHANNEL', `${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${30 + (i % 3) * 30}" cy="${38 + Math.floor(i / 3) * 30}" r="10" fill="none" stroke="var(--amber)" stroke-width="${i === 1 ? 3 : 1.5}"/>`).join('')}`],
  ];
  host.innerHTML = `<svg viewBox="0 0 600 130" role="img" aria-label="How players talked: typed chat in 1978, voice apps in 1999, console headsets in 2002, Discord in 2015, six friends in a voice channel in 2026" style="width:100%;height:auto;display:block">` +
    cells.map(([y, n, art], i) => `<g transform="translate(${i * 120} 0)">${art}${t(60, 108, n, { c: 'var(--paper)' })}${t(60, 122, y)}</g>`).join('') + '</svg>';
}
