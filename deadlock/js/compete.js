// Chapter VIII: competition.
//  arena(el)   – a stadium that reshapes: TI1's trade-show stage → a modern TI
//                arena → Deadlock's online, community-run scene (three.js)
//  aegis(el)   – The International's prize pool, 2011–2026, to scale (SVG)
//  shuffle(el) – OG's roster, 2015–2019: the team that fell apart and won twice
import { THREE, stage, orbitRig, glowPoints, glowSprite, rng, C, clamp, lerp, reduceMotion } from './lib.js';

// ================================================================ ARENA
const MODES = {
  ti1: { label: 'TI1 · Cologne · 2011', cap: 'A stage at a trade show. Sixteen invited teams, a $1.6M pool, and $1M to the winner, a sum nobody in esports had seen.', seats: 5 },
  ti26: { label: 'The International · Shanghai · 2026', cap: 'An arena, a hanging screen, a crowd with their phones up. Team Spirit lift their third Aegis.', seats: 5 },
  dl: { label: 'Deadlock · 2026', cap: 'No official stage yet. Twelve players in twelve rooms, community tournaments in custom lobbies, a crowd made of stream chat.', seats: 6 },
};

export function arena(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 36, fog: [180, 520], bg: 0x07090c });
  const scene = s.scene;
  const rig = orbitRig(s, { radius: 190, theta: 0.4, phi: 1.12, minR: 90, maxR: 320, auto: 0.035, target: new THREE.Vector3(0, 14, 0) });
  const R = rng(2011);

  scene.add(new THREE.HemisphereLight(0x9fb0d0, 0x0a0b0e, 0.6));
  const key = new THREE.DirectionalLight(0xffe2b0, 1.2); key.position.set(30, 80, 40); scene.add(key);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);

  // stage
  const stageM = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.5, metalness: 0.3 });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(26, 28, 2.4, 48), stageM); platform.position.y = 1.2; scene.add(platform);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(27, 0.25, 6, 96), new THREE.MeshBasicMaterial({ color: C.brass })); rim.rotation.x = Math.PI / 2; rim.position.y = 2.45; scene.add(rim);

  // two glass booths with seats + glowing screens
  const booths = [];
  const capsule = new THREE.CapsuleGeometry(0.7, 1.4, 3, 8);
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    const col = side < 0 ? C.amber : C.sapphire;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(18, 7, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.07, depthWrite: false }));
    glass.position.y = 3.5; g.add(glass);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(18, 7, 6)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7 }));
    edges.position.y = 3.5; g.add(edges);
    const seats = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Group();
      const body = new THREE.Mesh(capsule, new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.7 })); body.position.y = 1.8; p.add(body);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      screen.position.set(0, 2.4, -1.4 * side * -1); p.add(screen);
      g.add(p); seats.push(p);
    }
    g.position.set(side * 13, 2.4, 0);
    g.rotation.y = side * 0.12;
    scene.add(g); booths.push({ g, seats, side });
  }
  const layoutSeats = (n) => booths.forEach((b) => b.seats.forEach((p, i) => {
    p.visible = i < n; p.position.set((i - (n - 1) / 2) * 2.9, 0, 0);
  }));

  // hanging screen with a live little minimap
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 144;
  const cx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const screenBox = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(20, 11.25), new THREE.MeshBasicMaterial({ map: tex }));
    face.position.set(Math.sin((k * Math.PI) / 2) * 10.02, 0, Math.cos((k * Math.PI) / 2) * 10.02);
    face.rotation.y = (k * Math.PI) / 2; screenBox.add(face);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(20, 11.6, 20), new THREE.MeshStandardMaterial({ color: 0x0b0c0f }));
  frame.scale.setScalar(0.995); screenBox.add(frame);
  screenBox.position.y = 40; scene.add(screenBox);
  let dots = Array.from({ length: 24 }, (_, i) => ({ lane: i % 3, s: R(), team: i % 2, sp: 0.02 + R() * 0.03 }));
  function drawScreen(t) {
    cx.fillStyle = '#0d1117'; cx.fillRect(0, 0, 256, 144);
    const cols = ['#e6c24a', '#6b97ff', '#6fbf73'];
    for (let l = 0; l < 3; l++) {
      cx.strokeStyle = cols[l]; cx.lineWidth = 3; cx.beginPath();
      for (let i = 0; i <= 20; i++) { const u = i / 20; const x = 20 + u * 216; const y = 72 + (l - 1) * 48 * Math.pow(Math.sin(Math.PI * u), 0.6); i ? cx.lineTo(x, y) : cx.moveTo(x, y); }
      cx.stroke();
    }
    for (const d of dots) {
      d.s = (d.s + d.sp * (d.team ? -1 : 1) * 0.03 + 1) % 1;
      const x = 20 + d.s * 216, y = 72 + (d.lane - 1) * 48 * Math.pow(Math.sin(Math.PI * d.s), 0.6);
      cx.fillStyle = d.team ? '#6b97ff' : '#f0a43a'; cx.beginPath(); cx.arc(x, y, 4, 0, 7); cx.fill();
    }
    cx.fillStyle = '#f0a43a'; cx.fillRect(4, 62, 12, 20); cx.fillStyle = '#6b97ff'; cx.fillRect(240, 62, 12, 20);
    cx.fillStyle = '#e8e2d4'; cx.font = '12px monospace'; cx.fillText(`${String(Math.floor(t / 60) % 60).padStart(2, '0')}:${String(Math.floor(t) % 60).padStart(2, '0')}`, 110, 18);
    tex.needsUpdate = true;
  }

  // spotlights
  const beams = [];
  for (let i = 0; i < 6; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 70, 24, 1, true), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8fb0ff : 0xffd29a, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.geometry.translate(0, -35, 0);
    const pivot = new THREE.Group(); pivot.position.set(Math.cos(i) * 60, 70, Math.sin(i) * 60); pivot.add(cone); scene.add(pivot);
    beams.push({ pivot, ph: i * 1.3 });
  }

  // twelve rooms (Deadlock mode)
  const rooms = new THREE.Group(); scene.add(rooms);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, team = i % 2, col = team ? C.sapphire : C.amber;
    const r = new THREE.Group();
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(8, 6, 8)), new THREE.LineBasicMaterial({ color: 0x3a3f48 }));
    box.position.y = 3; r.add(box);
    const p = new THREE.Mesh(capsule, new THREE.MeshStandardMaterial({ color: 0xd8d0c0 })); p.position.y = 1.8; r.add(p);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); scr.position.set(0, 2.6, -1.6); r.add(scr);
    const halo = glowSprite(col, 9, 0.7); halo.position.set(0, 2.6, -1.7); r.add(halo);
    r.position.set(Math.cos(a) * 64, 0, Math.sin(a) * 64);
    r.lookAt(0, 0, 0);
    rooms.add(r);
  }
  // threads of light linking the rooms into one match
  const linkGeo = new THREE.BufferGeometry();
  const lp = [];
  rooms.children.forEach((r) => { lp.push(r.position.x, 5, r.position.z, 0, 40, 0); });
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: C.soul, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending }));
  scene.add(links);

  // the crowd: one particle system, three layouts
  const N = 7000;
  const crowd = glowPoints(N, 2.4);
  scene.add(crowd);
  const pos = crowd.geometry.attributes.position.array, col = crowd.geometry.attributes.color.array;
  const tgt = { ti1: new Float32Array(N * 3), ti26: new Float32Array(N * 3), dl: new Float32Array(N * 3) };
  const bri = { ti1: new Float32Array(N), ti26: new Float32Array(N), dl: new Float32Array(N) };
  const hue = new Float32Array(N * 3), seed = new Float32Array(N);
  const warm = new THREE.Color(0xffd9a0), cool = new THREE.Color(0xa9c4ff), white = new THREE.Color(0xfff6e6), tc = new THREE.Color();
  for (let i = 0; i < N; i++) {
    seed[i] = R();
    tc.copy(R() < 0.5 ? warm : R() < 0.6 ? cool : white);
    hue.set([tc.r, tc.g, tc.b], i * 3);
    // modern arena: tiered bowl
    const tier = Math.floor(R() * 26), a = R() * Math.PI * 2;
    const rr = 40 + tier * 3.1 + R() * 1.2;
    tgt.ti26.set([Math.cos(a) * rr, 3 + tier * 2.2 + R() * 0.6, Math.sin(a) * rr], i * 3); bri.ti26[i] = 1;
    // 2011: a standing crowd on a hall floor in front of the stage
    if (i < 1400) { tgt.ti1.set([(R() - 0.5) * 110, 1.6 + R() * 0.5, 34 + R() * 60], i * 3); bri.ti1[i] = 1; }
    else { tgt.ti1.set([Math.cos(a) * rr, -20, Math.sin(a) * rr], i * 3); bri.ti1[i] = 0; }
    // Deadlock: a thin cloud of stream viewers high above
    if (i < 2200) { const b = R() * Math.PI * 2, d = Math.sqrt(R()) * 150; tgt.dl.set([Math.cos(b) * d, 70 + R() * 50, Math.sin(b) * d], i * 3); bri.dl[i] = 0.55; }
    else { tgt.dl.set([Math.cos(a) * rr, 3 + tier * 2.2, Math.sin(a) * rr], i * 3); bri.dl[i] = 0; }
  }
  pos.set(tgt.ti26);
  const cur = new Float32Array(N); cur.fill(1);

  // 2011 back wall (a trade-show hall)
  const wall = new THREE.Mesh(new THREE.BoxGeometry(150, 30, 2), new THREE.MeshStandardMaterial({ color: 0x15181d }));
  wall.position.set(0, 15, -24); scene.add(wall);

  let mode = 'ti26', mk = { ti1: 0, ti26: 1, dl: 0 };
  const label = el.querySelector('[data-mode-label]'), cap = el.querySelector('[data-mode-cap]');
  function setMode(m) {
    mode = m;
    el.querySelectorAll('[data-arena]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.arena === m)));
    label.textContent = MODES[m].label; cap.textContent = MODES[m].cap;
    layoutSeats(MODES[m].seats);
    if (m === 'ti1') { rig.tPhi = 1.2; rig.tR = 170; } else if (m === 'dl') { rig.tPhi = 0.95; rig.tR = 230; } else { rig.tPhi = 1.12; rig.tR = 190; }
  }
  el.querySelectorAll('[data-arena]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.arena)));
  setMode('ti26');

  let scrT = 0;
  s.frame.push((dt, t) => {
    for (const k of Object.keys(mk)) mk[k] += ((k === mode ? 1 : 0) - mk[k]) * (1 - Math.pow(0.05, dt));
    const e = 1 - Math.pow(0.12, dt);
    const T = tgt[mode], Bm = bri[mode];
    for (let i = 0; i < N; i++) {
      const j = i * 3;
      pos[j] += (T[j] - pos[j]) * e * (0.6 + seed[i] * 0.8);
      pos[j + 1] += (T[j + 1] - pos[j + 1]) * e * (0.6 + seed[i] * 0.8);
      pos[j + 2] += (T[j + 2] - pos[j + 2]) * e * (0.6 + seed[i] * 0.8);
      cur[i] += (Bm[i] - cur[i]) * e;
      const tw = reduceMotion ? 0.8 : 0.55 + 0.45 * Math.sin(t * (1 + seed[i] * 3) + seed[i] * 50);
      // a stadium wave runs around the bowl
      const ang = Math.atan2(pos[j + 2], pos[j]);
      const wave = mode === 'ti26' ? Math.max(0, Math.cos(ang - t * 0.9)) ** 12 * 1.4 : 0;
      const b = cur[i] * (tw + wave);
      col[j] = hue[j] * b; col[j + 1] = hue[j + 1] * b; col[j + 2] = hue[j + 2] * b;
    }
    crowd.geometry.attributes.position.needsUpdate = true; crowd.geometry.attributes.color.needsUpdate = true;
    // set pieces fade by mode
    const arenaK = mk.ti26, hallK = mk.ti1, dlK = mk.dl;
    screenBox.scale.setScalar(Math.max(0.001, arenaK + hallK * 0.55));
    screenBox.position.set(0, lerp(40, 22, hallK), lerp(0, -18, hallK));
    screenBox.rotation.y = arenaK > 0.5 ? t * 0.08 : 0;
    beams.forEach((b, i) => { b.pivot.visible = arenaK > 0.05; b.pivot.children[0].material.opacity = 0.07 * arenaK; b.pivot.rotation.z = Math.sin(t * 0.5 + b.ph) * 0.45; b.pivot.rotation.x = Math.cos(t * 0.4 + b.ph) * 0.35; });
    wall.scale.y = Math.max(0.001, hallK); wall.visible = hallK > 0.02;
    booths.forEach((b) => { b.g.scale.setScalar(Math.max(0.001, 1 - dlK)); });
    platform.scale.set(1, Math.max(0.05, 1 - dlK * 0.9), 1);
    rooms.scale.setScalar(Math.max(0.001, dlK)); rooms.visible = dlK > 0.02;
    links.material.opacity = 0.35 * dlK * (0.7 + 0.3 * Math.sin(t * 3)); links.visible = dlK > 0.02;
    scrT += dt; if (scrT > 0.08) { scrT = 0; drawScreen(t * 20); }
  });
}

// ================================================================ AEGIS
// Prize pools in $M (Liquipedia / Esports Earnings, rounded). 2020 cancelled.
const TI = [
  [2011, 1.6, "Natus Vincere", "Dendi becomes the face of Dota. A $1M first prize stuns everyone."],
  [2012, 1.6, "Invictus Gaming", "China's first Aegis."],
  [2013, 2.87, "Alliance", "Game five: one perfect spell, the “Million Dollar Dream Coil,” traps Na'Vi and swings the final."],
  [2014, 10.93, "Newbee", "Fans' spending turns the pool into the biggest prize esports has ever seen."],
  [2015, 18.43, "Evil Geniuses", "A 16-year-old named Sumail becomes a star."],
  [2016, 20.77, "Wings Gaming", "Underdogs with a bottomless bag of heroes. The team is gone within a year."],
  [2017, 24.79, "Team Liquid", "KuroKy wins after years of near misses."],
  [2018, 25.53, "OG", "Months earlier the team had fallen apart. They rebuilt from the open qualifiers and won."],
  [2019, 34.33, "OG", "The same five again: the first back-to-back champions."],
  [2020, null, "", "Cancelled. The pandemic."],
  [2021, 40.02, "Team Spirit", "Young underdogs climb out of the lower bracket. The richest prize in esports history."],
  [2022, 18.93, "Tundra Esports", "A dominant final. The last Battle Pass year, and the pool already halves."],
  [2023, 3.38, "Team Spirit", "No Battle Pass. The pool falls to about $3M."],
  [2024, 2.58, "Team Liquid", "A smaller stage in Copenhagen; Liquid lift it again."],
  [2025, 2.75, "Team Falcons", "3–2 over Xtreme Gaming. Ame loses a third TI final. (Reported pool: $2.6–2.9M.)"],
  [2026, null, "Team Spirit", "A third Aegis. Yatoro and Collapse become the first three-time champions. Winners took about $1.42M; the full pool is not confirmed here."],
];

export function aegis(el) {
  const host = el.querySelector('[data-aegis]');
  const card = el.querySelector('[data-aegis-card]');
  const W = 760, H = 330, L = 46, Rr = 96, T = 26, B = 52;
  const years = TI.length;
  const bw = (W - L - Rr) / years;
  const Y = (v) => T + (H - T - B) * (1 - v / 42);
  let g = '';
  // Battle Pass era: Compendium 2013 → last Battle Pass 2022
  const x0 = L + 2 * bw, x1 = L + 12 * bw;
  g += `<rect x="${x0}" y="${T - 6}" width="${x1 - x0}" height="${H - T - B + 6}" fill="var(--brass)" opacity="0.07"/>`;
  g += `<text x="${x0 + 6}" y="${T + 8}" class="ax" fill="var(--brass)">FANS FUND THE PRIZE · 2013–2022</text>`;
  for (const v of [0, 10, 20, 30, 40]) {
    g += `<line x1="${L}" x2="${W - Rr + 4}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--rule)" stroke-width="1"/>`;
    g += `<text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" class="ax">$${v}M</text>`;
  }
  TI.forEach(([yr, v, who], i) => {
    const x = L + i * bw + 2, w = bw - 4;
    if (v != null) {
      const h = Y(0) - Y(v), r = Math.min(4, h / 2);
      g += `<path class="bar" data-i="${i}" d="M${x} ${Y(0)} V${Y(v) + r} Q${x} ${Y(v)} ${x + r} ${Y(v)} H${x + w - r} Q${x + w} ${Y(v)} ${x + w} ${Y(v) + r} V${Y(0)} Z"/>`;
    } else {
      g += `<rect x="${x}" y="${Y(4)}" width="${w}" height="${Y(0) - Y(4)}" fill="none" stroke="var(--faint)" stroke-dasharray="3 3" data-i="${i}" class="ghost"/>`;
    }
    g += `<rect x="${x - 2}" y="${T}" width="${bw}" height="${H - T - B + 30}" fill="transparent" class="hit" data-i="${i}"/>`;
    if (i % 2 === 0 || i === years - 1) g += `<text x="${x + w / 2}" y="${H - B + 16}" text-anchor="middle" class="ax">${String(yr).slice(2)}</text>`;
  });
  // direct labels on the story points
  const lab = (i, txt) => { const [, v] = TI[i]; const x = L + i * bw + bw / 2; g += `<text x="${x}" y="${Y(v) - 8}" text-anchor="middle" class="lbl">${txt}</text>`; };
  lab(0, '$1.6M'); lab(10, '$40.0M'); lab(12, '$3.4M');
  // Deadlock: every tournament ever, same axis
  const dx = W - Rr + 30, dv = 0.0576;
  g += `<rect x="${dx}" y="${Y(dv) - 1}" width="${bw - 4}" height="${Math.max(1.5, Y(0) - Y(dv))}" fill="var(--soul)"/>`;
  g += `<text x="${dx + (bw - 4) / 2}" y="${Y(0) - 12}" text-anchor="middle" class="lbl" fill="var(--soul)">$0.06M</text>`;
  g += `<text x="${dx - 10}" y="${H - B + 16}" class="ax" fill="var(--soul)">DEADLOCK,</text><text x="${dx - 10}" y="${H - B + 29}" class="ax" fill="var(--soul)">ALL EVENTS</text>`;
  g += `<line x1="${L}" x2="${W - 6}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--dim)"/>`;
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="The International prize pool by year, 2011 to 2026, with Deadlock's lifetime prize money for comparison">${g}</svg>`;
  function show(i) {
    const [yr, v, who, line] = TI[i];
    host.querySelectorAll('.bar').forEach((b) => b.classList.toggle('on', +b.dataset.i === i));
    card.innerHTML = `<span class="fig">${yr}${v != null ? ` · $${v.toFixed(v < 10 ? 2 : 1)}M pool` : ''}</span><h4>${who || 'No tournament'}</h4><p>${line}</p>`;
  }
  host.addEventListener('pointerover', (e) => { const h = e.target.closest('[data-i]'); if (h) show(+h.dataset.i); });
  host.addEventListener('click', (e) => { const h = e.target.closest('[data-i]'); if (h) show(+h.dataset.i); });
  // keyboard: arrows step through years
  let k = 7; host.tabIndex = 0;
  host.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); k = clamp(k + (e.key === 'ArrowRight' ? 1 : -1), 0, years - 1); show(k); } });
  show(7);
}

// ================================================================ SHUFFLE (OG, 2015–2019)
const ZONES = [
  { id: 'secret', name: 'Team Secret', x: 4, y: 6 },
  { id: 'og', name: 'OG', x: 36, y: 6, big: true },
  { id: 'eg', name: 'Evil Geniuses', x: 72, y: 6 },
  { id: 'vgj', name: 'VGJ.Storm', x: 72, y: 56 },
  { id: 'coach', name: 'Coach’s chair', x: 4, y: 56 },
  { id: 'away', name: 'Away from the game', x: 4, y: 78 },
  { id: 'pubs', name: 'Unknown, in Finland', x: 72, y: 78 },
];
const PEOPLE = ['N0tail', 'Fly', 'Puppey', 's4', 'JerAx', 'Resolut1on', 'Ceb', 'Ana', 'Topson'];
// where everyone is at each step (people not listed are hidden)
const STEPS = [
  { when: '2015', text: 'Team Secret’s captain reshuffles his roster. Two friends, N0tail and Fly, are out.', at: { Puppey: 'secret', N0tail: 'secret', Fly: 'secret' }, out: ['N0tail', 'Fly'] },
  { when: '2015', text: 'So they start their own team. They call it OG.', at: { Puppey: 'secret', N0tail: 'og', Fly: 'og' } },
  { when: '2017–18', text: 'OG becomes one of the best teams in the world. Ceb, a former player, coaches.', at: { Puppey: 'secret', N0tail: 'og', Fly: 'og', s4: 'og', JerAx: 'og', Resolut1on: 'og', Ceb: 'coach', Ana: 'away', Topson: 'pubs' } },
  { when: 'March 2018', text: 'Resolut1on leaves for another team.', at: { Puppey: 'secret', N0tail: 'og', Fly: 'og', s4: 'og', JerAx: 'og', Resolut1on: 'vgj', Ceb: 'coach', Ana: 'away', Topson: 'pubs' } },
  { when: 'May 2018', text: 'Then Fly, N0tail’s oldest friend in the game, leaves for a rival, taking s4 with him. OG loses its invitation to The International.', at: { Puppey: 'secret', N0tail: 'og', Fly: 'eg', s4: 'eg', JerAx: 'og', Resolut1on: 'vgj', Ceb: 'coach', Ana: 'away', Topson: 'pubs' } },
  { when: 'June 2018', text: 'The coach puts his headset back on. Ana comes back to the game. An unknown Finnish kid called Topson joins. They start from the open qualifiers, the bottom rung.', at: { Puppey: 'secret', N0tail: 'og', Fly: 'eg', s4: 'eg', JerAx: 'og', Resolut1on: 'vgj', Ceb: 'og', Ana: 'og', Topson: 'og' } },
  { when: 'August 2018', text: 'OG win The International, 3–2 in the final. Fly and s4 finish third.', at: { Puppey: 'secret', N0tail: 'og', Fly: 'eg', s4: 'eg', JerAx: 'og', Resolut1on: 'vgj', Ceb: 'og', Ana: 'og', Topson: 'og' }, aegis: 1 },
  { when: 'August 2019', text: 'The same five win again: the first team ever to do it twice. N0tail makes Ceb lift the trophy first.', at: { N0tail: 'og', JerAx: 'og', Ceb: 'og', Ana: 'og', Topson: 'og' }, aegis: 2 },
];

export function shuffle(el) {
  const board = el.querySelector('[data-board]');
  const note = el.querySelector('[data-step]');
  board.innerHTML = ZONES.map((z) => `<div class="zone${z.big ? ' big' : ''}" data-z="${z.id}" style="left:${z.x}%;top:${z.y}%"><span>${z.name}</span><i class="aegis" aria-hidden="true"></i></div>`).join('') +
    PEOPLE.map((p) => `<div class="chip" data-p="${p}">${p}</div>`).join('');
  let step = 0;
  const zoneEl = (id) => board.querySelector(`[data-z="${id}"]`);
  function place() {
    const st = STEPS[step];
    const count = {};
    PEOPLE.forEach((p) => {
      const c = board.querySelector(`[data-p="${p}"]`);
      const z = st.at[p];
      if (!z) { c.style.opacity = '0'; return; }
      const ze = zoneEl(z);
      const n = (count[z] = (count[z] || 0) + 1) - 1;
      const bx = ze.offsetLeft + 10, by = ze.offsetTop + 30;
      const cols = ze.classList.contains('big') ? 3 : 2;
      c.style.opacity = '1';
      c.style.transform = `translate(${bx + (n % cols) * (ze.clientWidth - 16) / cols}px, ${by + Math.floor(n / cols) * 30}px)`;
      c.classList.toggle('gone', !!(st.out && st.out.includes(p)));
      c.classList.toggle('og', z === 'og');
    });
    zoneEl('og').dataset.aegis = st.aegis || 0;
    note.innerHTML = `<span class="fig">${st.when}</span> ${st.text}`;
    el.querySelector('[data-prev]').disabled = step === 0;
    el.querySelector('[data-next]').disabled = step === STEPS.length - 1;
    el.querySelector('[data-count]').textContent = `${step + 1} / ${STEPS.length}`;
  }
  el.querySelector('[data-prev]').addEventListener('click', () => { step = Math.max(0, step - 1); place(); });
  el.querySelector('[data-next]').addEventListener('click', () => { step = Math.min(STEPS.length - 1, step + 1); place(); });
  new ResizeObserver(place).observe(board);
  place();
}
