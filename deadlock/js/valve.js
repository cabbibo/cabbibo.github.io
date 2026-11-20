// Valve chapter explorables:
//  silhouettes(el) – readability lineup (three.js)
//  director(el)    – AI Director pacing simulation (2D canvas)
//  teach(el)       – a three-room puzzle with no words (2D canvas)
import { THREE, stage, C, lerp, clamp, rng, reduceMotion } from './lib.js';

// ======================================================= SILHOUETTES
// Part = [type, px,py,pz, sx,sy,sz, rz]. c capsule (unit h=2,d=1), s sphere(d=1), b box, k cone(h=1,d=1)
const P = (t, px, py, pz, sx, sy, sz, rz = 0) => [t, px, py, pz, sx, sy, sz, rz];
const GENERIC = {
  legL: P('c', 0, 0.45, 0.12, 0.2, 0.45, 0.2), legR: P('c', 0, 0.45, -0.12, 0.2, 0.45, 0.2),
  torso: P('c', 0, 1.15, 0, 0.42, 0.38, 0.36), head: P('s', 0, 1.68, 0, 0.26, 0.28, 0.26),
  arm: P('c', 0.15, 1.15, 0.24, 0.14, 0.32, 0.14, -0.6), gun: P('b', 0.42, 1.12, 0.25, 0.7, 0.08, 0.08),
};
const ACCESSORIES = ['coat', 'staff', 'lantern', 'brim', 'crown', 'pack', 'antenna', 'shield', 'crest'];
const ARCH = [
  { id: 'bruiser', name: 'The Bruiser', q: 'who can soak up the most damage?', lean: 0, parts: {
    legL: P('c', 0, 0.35, 0.22, 0.34, 0.35, 0.34), legR: P('c', 0, 0.35, -0.22, 0.34, 0.35, 0.34),
    torso: P('c', 0, 1.05, 0, 1.0, 0.55, 0.85), head: P('s', 0.12, 1.62, 0, 0.2, 0.2, 0.2),
    arm: P('c', 0.3, 1.0, 0.5, 0.32, 0.45, 0.32, -0.9), gun: P('b', 0.78, 0.92, 0.5, 1.0, 0.24, 0.24) } },
  { id: 'runner', name: 'The Runner', q: 'who will reach you first?', lean: -0.22, parts: {
    legL: P('c', 0.12, 0.55, 0.09, 0.13, 0.55, 0.13, 0.35), legR: P('c', -0.12, 0.55, -0.09, 0.13, 0.55, 0.13, -0.35),
    torso: P('c', 0.06, 1.33, 0, 0.28, 0.32, 0.26), head: P('s', 0.16, 1.82, 0, 0.21, 0.23, 0.21),
    arm: P('c', 0.26, 1.33, 0.18, 0.1, 0.3, 0.1, -1.25), gun: P('b', 0.5, 1.4, 0.2, 0.26, 0.08, 0.06),
    crest: P('b', -0.18, 1.62, 0, 0.5, 0.05, 0.08, -0.25) } },
  { id: 'healer', name: 'The Healer', q: 'who keeps their friends alive?', lean: 0, parts: {
    legL: P('c', 0, 0.5, 0.1, 0.16, 0.5, 0.16), legR: P('c', 0, 0.5, -0.1, 0.16, 0.5, 0.16),
    torso: P('c', 0, 1.33, 0, 0.36, 0.45, 0.32), head: P('s', 0, 2.0, 0, 0.24, 0.26, 0.24),
    arm: P('c', 0.22, 1.35, 0.25, 0.1, 0.34, 0.1, -0.35), gun: P('b', 0, 0, 0, 0, 0, 0),
    coat: P('k', 0, 0.75, 0, 0.95, 1.15, 0.75), staff: P('b', 0.44, 1.15, 0.28, 0.05, 2.3, 0.05),
    lantern: P('s', 0.44, 2.35, 0.28, 0.26, 0.26, 0.26) } },
  { id: 'sniper', name: 'The Sharpshooter', q: 'who is dangerous from very far away?', lean: 0, parts: {
    legL: P('c', 0, 0.52, 0.1, 0.15, 0.52, 0.15), legR: P('c', 0, 0.52, -0.1, 0.15, 0.52, 0.15),
    torso: P('c', 0, 1.33, 0, 0.3, 0.42, 0.28), head: P('s', 0, 1.92, 0, 0.22, 0.24, 0.22),
    arm: P('c', 0.3, 1.42, 0.2, 0.1, 0.32, 0.1, -1.45), gun: P('b', 0.82, 1.45, 0.2, 1.9, 0.06, 0.06),
    brim: P('b', 0, 2.03, 0, 0.6, 0.04, 0.6), crown: P('b', 0, 2.14, 0, 0.27, 0.2, 0.27) } },
  { id: 'tinker', name: 'The Tinkerer', q: 'who builds machines and traps?', lean: 0, parts: {
    legL: P('c', 0, 0.28, 0.16, 0.24, 0.28, 0.24), legR: P('c', 0, 0.28, -0.16, 0.24, 0.28, 0.24),
    torso: P('c', 0, 0.82, 0, 0.6, 0.36, 0.52), head: P('s', 0.04, 1.28, 0, 0.32, 0.3, 0.32),
    arm: P('c', 0.22, 0.84, 0.34, 0.16, 0.26, 0.16, -0.7), gun: P('b', 0.5, 0.82, 0.34, 0.55, 0.14, 0.14),
    pack: P('b', -0.42, 1.0, 0, 0.42, 0.66, 0.52), antenna: P('b', -0.52, 1.7, 0.1, 0.03, 0.9, 0.03) } },
  { id: 'guard', name: 'The Guard', q: 'who protects the people behind them?', lean: 0, parts: {
    legL: P('c', 0, 0.42, 0.13, 0.22, 0.42, 0.22), legR: P('c', 0, 0.42, -0.13, 0.22, 0.42, 0.22),
    torso: P('c', 0, 1.12, 0, 0.52, 0.42, 0.46), head: P('s', 0, 1.68, 0, 0.26, 0.26, 0.26),
    arm: P('c', 0.25, 1.1, 0.3, 0.16, 0.3, 0.16, -1.0), gun: P('b', 0, 0, 0, 0, 0, 0),
    shield: P('b', 0.52, 1.05, 0.05, 0.1, 1.45, 1.0), crest: P('b', 0, 1.88, 0, 0.42, 0.1, 0.06) } },
];

export function silhouettes(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 28, bg: 0xd8c9a8 });
  const scene = s.scene;
  s.camera.position.set(0, 2.2, 15.5);
  s.camera.lookAt(0, 1.15, 0);

  scene.add(new THREE.HemisphereLight(0xfff1d8, 0x2a2420, 1.4));
  const key = new THREE.DirectionalLight(0xffe2b0, 2.2); key.position.set(4, 6, 6); scene.add(key);
  const back = new THREE.DirectionalLight(0x88aaff, 1.2); back.position.set(-4, 3, -6); scene.add(back);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), new THREE.MeshBasicMaterial({ color: 0xbfae8c }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  const geos = {
    c: new THREE.CapsuleGeometry(0.5, 1, 6, 16), s: new THREE.SphereGeometry(0.5, 20, 14),
    b: new THREE.BoxGeometry(1, 1, 1), k: new THREE.ConeGeometry(0.5, 1, 20),
  };
  const black = new THREE.MeshBasicMaterial({ color: 0x0b0d10 });
  const figs = [];
  const R = rng(7);
  ARCH.forEach((a, i) => {
    const g = new THREE.Group();
    const team = i % 2 ? C.sapphire : C.amber;
    const body = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.8 });
    const teamM = new THREE.MeshStandardMaterial({ color: team, roughness: 0.6, emissive: team, emissiveIntensity: 0.15 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x8b8378, roughness: 0.35, metalness: 0.8 });
    const glow = new THREE.MeshBasicMaterial({ color: 0xffe08a });
    const parts = {};
    const all = { ...GENERIC };
    for (const k of ACCESSORIES) all[k] = P('b', 0, 0, 0, 0, 0, 0);
    for (const [name, gspec] of Object.entries(all)) {
      const sspec = a.parts[name] || (ACCESSORIES.includes(name) ? P('b', 0, 0, 0, 0, 0, 0) : gspec);
      const type = (a.parts[name] || gspec)[0];
      const shaded = name === 'torso' || name === 'crest' || name === 'coat' ? teamM
        : name === 'gun' || name === 'shield' || name === 'staff' || name === 'antenna' ? metal
        : name === 'lantern' ? glow : body;
      const m = new THREE.Mesh(geos[type], shaded);
      m.userData = { g: gspec, s: sspec, shaded, fig: i };
      g.add(m); parts[name] = m;
    }
    scene.add(g);
    figs.push({ a, g, parts, slot: i });
  });

  let ex = 0.15, mode = 'silhouette';
  function layout() {
    const n = figs.length, gap = 2.2;
    figs.forEach((f) => {
      f.g.position.x = (f.slot - (n - 1) / 2) * gap;
      f.g.rotation.z = lerp(0, f.a.lean, ex);
      for (const m of Object.values(f.parts)) {
        const { g, s: sp } = m.userData;
        m.position.set(lerp(g[1], sp[1], ex), lerp(g[2], sp[2], ex), lerp(g[3], sp[3], ex));
        m.scale.set(Math.max(1e-4, lerp(g[4], sp[4], ex)), Math.max(1e-4, lerp(g[5], sp[5], ex)), Math.max(1e-4, lerp(g[6], sp[6], ex)));
        m.rotation.z = lerp(g[7], sp[7], ex);
        m.material = mode === 'silhouette' ? black : m.userData.shaded;
      }
    });
    s.renderer.setClearColor(mode === 'silhouette' ? 0xd8c9a8 : 0x1a1d22);
    ground.material.color.set(mode === 'silhouette' ? 0xbfae8c : 0x24272c);
    ground.visible = true;
  }
  // figures face right (side profile): rotate parts group so +x is forward in screen
  figs.forEach((f) => { f.g.rotation.y = 0; });

  // ------- quiz
  const prompt = el.querySelector('[data-q]');
  const score = el.querySelector('[data-score]');
  const slider = el.querySelector('input[type=range]');
  const exVal = el.querySelector('[data-ex]');
  let target = null, t0 = 0, answered = false;
  const log = [];
  function shuffle() {
    const order = figs.map((_, i) => i).sort(() => R() - 0.5);
    figs.forEach((f, i) => { f.slot = order[i]; });
  }
  function ask() {
    shuffle(); layout();
    target = figs[Math.floor(R() * figs.length)];
    prompt.innerHTML = `Quick: <strong>${target.a.q}</strong> Click them.`;
    t0 = performance.now(); answered = false;
    tags.forEach((t) => { t.hidden = true; });
  }
  const tags = figs.map((f) => {
    const t = document.createElement('div'); t.className = 'tag3d brass'; t.textContent = f.a.name; t.hidden = true; view.appendChild(t); return t;
  });
  s.canvas.addEventListener('click', () => {
    if (answered || !target) return;
    const hit = s.raycast(figs.map((f) => f.g))[0];
    if (!hit) return;
    const fi = hit.object.userData.fig;
    const ok = fi === figs.indexOf(target);
    const ms = performance.now() - t0;
    answered = true;
    log.push({ ok, ms, ex });
    tags.forEach((t) => { t.hidden = false; });
    prompt.innerHTML = ok
      ? `<span class="soul">Right</span>, in ${(ms / 1000).toFixed(1)}s. That was <strong>${target.a.name}</strong>. <button data-next>Next</button>`
      : `Not quite. You picked <strong>${figs[fi].a.name}</strong>. <button data-next>Next</button>`;
    prompt.querySelector('[data-next]').onclick = ask;
    const low = log.filter((l) => l.ex < 0.4), high = log.filter((l) => l.ex >= 0.6);
    const pct = (a) => a.length ? `${Math.round(100 * a.filter((l) => l.ok).length / a.length)}% of ${a.length}` : '–';
    score.textContent = `Same shapes: ${pct(low)} · Distinct shapes: ${pct(high)}`;
  });
  s.frame.push(() => {
    tags.forEach((t, i) => {
      if (t.hidden) return;
      const v = new THREE.Vector3(figs[i].g.position.x, 2.65, 0).project(s.camera);
      t.style.left = `${(v.x * 0.5 + 0.5) * s.width}px`; t.style.top = `${(-v.y * 0.5 + 0.5) * s.height}px`;
    });
  });
  slider.addEventListener('input', () => { ex = +slider.value; exVal.textContent = ex < 0.25 ? 'Look-alikes' : ex < 0.7 ? 'Somewhat different' : 'Exaggerated'; layout(); });
  el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    el.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    layout();
  }));
  el.querySelector('[data-ask]').addEventListener('click', ask);
  slider.value = ex; layout(); ask();
  s.onResize = (w, h) => {
    // fit all six figures across (or the full height on tall screens)
    const tanV = Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2));
    const dW = 6.9 / (tanV * (w / h)), dH = 1.75 / tanV;
    s.camera.position.set(0, 1.5, Math.max(dW, dH));
    s.camera.lookAt(0, 1.25, 0);
  };
  s.resize();
}

// ======================================================= AI DIRECTOR
export function director(el) {
  const view = el.querySelector('.view');
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  const ctx = cv.getContext('2d');
  let W = 1, H = 1, dpr = 1;
  new ResizeObserver(() => {
    dpr = Math.min(2, devicePixelRatio || 1); W = view.clientWidth; H = view.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
  }).observe(view);

  const R = rng(4);
  let mode = 'director';
  const sim = { t: 0, stress: 0, enemies: [], hist: [], state: 'build', stateT: 0, spawnAcc: 0, dead: 0, bored: 0, peaks: 0 };
  const SURV = 4;
  function reset() {
    Object.assign(sim, { t: 0, stress: 0.1, enemies: [], hist: [], state: 'build', stateT: 0, spawnAcc: 0, bored: 0, overwhelmed: 0 });
  }
  reset();
  el.querySelectorAll('[data-dir]').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.dir; reset();
    el.querySelectorAll('[data-dir]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  el.querySelector('[data-horde]').addEventListener('click', () => spawn(14));

  function spawn(n) {
    for (let i = 0; i < n; i++) sim.enemies.push({ x: 1.05 + R() * 0.3, y: 0.15 + R() * 0.7, hp: 1, sp: 0.2 + R() * 0.14 });
  }
  const STATE_COL = { build: 'rgba(240,164,58,0.10)', peak: 'rgba(224,88,75,0.16)', relax: 'rgba(127,240,224,0.08)' };
  function step(dt) {
    sim.t += dt; sim.stateT += dt;
    // threat = enemies close to the group (left side)
    let near = 0;
    for (const e of sim.enemies) {
      e.x -= e.sp * dt;
      if (e.x < 0.42) { near++; e.hp -= dt * 0.9; }
    }
    sim.enemies = sim.enemies.filter((e) => e.hp > 0);
    const target = clamp(near / 9);
    sim.stress += (target - sim.stress) * (target > sim.stress ? 1.6 : 0.35) * dt;

    if (mode === 'random') {
      sim.spawnAcc += dt;
      if (R() < dt * 0.9) spawn(1 + Math.floor(R() * 3));
      sim.state = 'none';
    } else {
      // build → peak → relax, steered by measured stress
      if (sim.state === 'build') {
        if (R() < dt * 2.2) spawn(1 + Math.floor(R() * 2));
        if (sim.stress > 0.78) { sim.state = 'peak'; sim.stateT = 0; }
      } else if (sim.state === 'peak') {
        if (R() < dt * 1.2) spawn(1);
        if (sim.stateT > 3) { sim.state = 'relax'; sim.stateT = 0; sim.peaks++; }
      } else if (sim.state === 'relax') {
        if (sim.stateT > 6 && sim.stress < 0.15) { sim.state = 'build'; sim.stateT = 0; }
      }
    }
    if (sim.stress < 0.12) sim.bored += dt;
    if (sim.stress > 0.92) sim.overwhelmed += dt;
    sim.hist.push({ s: sim.stress, st: sim.state });
    if (sim.hist.length > 900) sim.hist.shift();
  }
  const readout = el.querySelector('[data-readout]');
  let acc = 0, last = performance.now(), visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(view);
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible) {
      acc += dt;
      while (acc > 1 / 30) { step(1 / 30); acc -= 1 / 30; }
      draw();
      const tot = Math.max(1, sim.t);
      readout.innerHTML = `Bored <b>${Math.round(100 * sim.bored / tot)}%</b> of the time · Overwhelmed <b>${Math.round(100 * sim.overwhelmed / tot)}%</b>`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#13171c'; ctx.fillRect(0, 0, W, H);
    const narrow = W < 560;
    // top: the street, seen from above
    const sh = narrow ? H * 0.42 : H * 0.45;
    ctx.fillStyle = '#0e1115'; ctx.fillRect(0, 0, W, sh);
    ctx.strokeStyle = '#2c3138'; ctx.beginPath(); ctx.moveTo(0, sh); ctx.lineTo(W, sh); ctx.stroke();
    // survivors
    for (let i = 0; i < SURV; i++) {
      const x = W * 0.3 + (i % 2) * 14, y = sh * (0.38 + Math.floor(i / 2) * 0.24) + Math.sin(sim.t * 3 + i) * 2;
      ctx.fillStyle = '#e8e2d4'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
    }
    // enemies
    ctx.fillStyle = '#e0584b';
    for (const e of sim.enemies) { ctx.globalAlpha = clamp(e.hp + 0.2); ctx.beginPath(); ctx.arc(e.x * W, e.y * sh, 4, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // state label
    ctx.font = '500 12px "DM Mono", monospace'; ctx.fillStyle = '#c8a35a';
    const label = mode === 'random' ? 'RANDOM SPAWNER' : `DIRECTOR · ${sim.state.toUpperCase()}`;
    ctx.fillText(label, 12, 20);
    // bottom: stress graph
    const gy = sh + 28, gh = H - gy - 26, gx = 44, gw = W - gx - 14;
    const n = sim.hist.length, span = 900;
    for (let i = 0; i < n; i++) {
      const st = sim.hist[i].st; if (!STATE_COL[st]) continue;
      ctx.fillStyle = STATE_COL[st];
      ctx.fillRect(gx + (i + span - n) / span * gw, gy, gw / span + 0.6, gh);
    }
    ctx.strokeStyle = '#2c3138'; ctx.lineWidth = 1;
    for (const f of [0, 0.5, 1]) { ctx.beginPath(); ctx.moveTo(gx, gy + gh * (1 - f)); ctx.lineTo(gx + gw, gy + gh * (1 - f)); ctx.stroke(); }
    ctx.fillStyle = '#a29d90'; ctx.font = '11px "DM Mono", monospace';
    ctx.fillText('calm', 4, gy + gh); ctx.fillText('panic', 4, gy + 9);
    ctx.fillText('player stress over the last 30 seconds', gx, gy - 10);
    ctx.strokeStyle = '#7ff0e0'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = gx + (i + span - n) / span * gw, y = gy + gh * (1 - sim.hist[i].s);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
}

// ======================================================= TEACH WITHOUT WORDS
// Tiles: # wall, . floor, B button (latching), H button (held), X box, D door (opens w/ button of same index), E exit, S start
const ROOMS = [
  [
    '###########',
    '#.........#',
    '#.S...B...D',
    '#.........#',
    '###########',
  ],
  [
    '###########',
    '#.........#',
    '#.S.X..H..D',
    '#.........#',
    '###########',
  ],
  [
    '#############',
    '#.....#.....#',
    '#.S...D..X..#',
    '#..X..#.....#',
    '#..H..#..H..D',
    '#.....#.....#',
    '#############',
  ],
];

export function teach(el) {
  const view = el.querySelector('.view');
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  cv.tabIndex = 0; cv.setAttribute('aria-label', 'Puzzle room. Use arrow keys or the on-screen arrows to move.');
  const ctx = cv.getContext('2d');
  let W = 1, H = 1, dpr = 1;
  new ResizeObserver(() => {
    dpr = Math.min(2, devicePixelRatio || 1); W = view.clientWidth; H = view.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; draw();
  }).observe(view);

  let room = 0, grid, player, boxes, latched, heat, steps, tStart, lastMove, done = false, anim = { x: 0, y: 0 };
  const status = el.querySelector('[data-status]');
  function load(i) {
    room = i; done = false;
    grid = ROOMS[i].map((r) => r.split(''));
    boxes = []; latched = false; heat = grid.map((r) => r.map(() => 0)); steps = 0;
    grid.forEach((r, y) => r.forEach((c, x) => {
      if (c === 'S') { player = { x, y }; r[x] = '.'; }
      if (c === 'X') { boxes.push({ x, y }); r[x] = '.'; }
    }));
    anim = { x: player.x, y: player.y };
    tStart = lastMove = performance.now();
    status.textContent = `Room ${i + 1} of ${ROOMS.length}`;
    draw();
  }
  const at = (x, y) => (grid[y] || [])[x] || '#';
  const boxAt = (x, y) => boxes.find((b) => b.x === x && b.y === y);
  const pressed = (x, y) => (player.x === x && player.y === y) || !!boxAt(x, y);
  function doorsOpen() {
    // every door opens when every button in its region is pressed (latching buttons stay pressed)
    let allHeld = true;
    grid.forEach((r, y) => r.forEach((c, x) => {
      if (c === 'B' && pressed(x, y)) latched = true;
      if (c === 'H' && !pressed(x, y)) allHeld = false;
    }));
    const hasB = grid.some((r) => r.includes('B'));
    const hasH = grid.some((r) => r.includes('H'));
    if (room === 2) {
      // left button opens the middle door, right button opens the exit
      const leftH = pressed(3, 4), rightH = pressed(9, 4);
      return { mid: leftH, exit: rightH };
    }
    const open = (hasB ? latched : true) && (hasH ? allHeld : true);
    return { mid: open, exit: open };
  }
  function isDoorOpen(x, y) {
    const o = doorsOpen();
    if (room === 2 && x === 6) return o.mid;
    return o.exit;
  }
  function solid(x, y) {
    const c = at(x, y);
    if (c === '#') return true;
    if (c === 'D') return !isDoorOpen(x, y);
    return false;
  }
  function move(dx, dy) {
    if (done) return;
    const nx = player.x + dx, ny = player.y + dy;
    if (solid(nx, ny)) return;
    const b = boxAt(nx, ny);
    if (b) {
      const bx = nx + dx, by = ny + dy;
      if (solid(bx, by) || boxAt(bx, by) || at(bx, by) === 'D') return;
      b.x = bx; b.y = by;
    }
    const now = performance.now();
    heat[player.y][player.x] += (now - lastMove) / 1000;
    lastMove = now;
    player.x = nx; player.y = ny; steps++;
    if (at(nx, ny) === 'D' && nx === grid[0].length - 1) {
      done = true;
      const secs = ((now - tStart) / 1000).toFixed(0);
      status.innerHTML = room < ROOMS.length - 1
        ? `Solved in ${steps} steps, ${secs}s. <button data-nextroom>Next room</button>`
        : `All three solved. Nobody told you a single rule. <button data-again>Play again</button>`;
      const nb = status.querySelector('[data-nextroom]'); if (nb) nb.onclick = () => { load(room + 1); cv.focus(); };
      const ab = status.querySelector('[data-again]'); if (ab) ab.onclick = () => { load(0); cv.focus(); };
      showHeat = true;
    }
    draw();
  }
  let showHeat = false;
  cv.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[e.key];
    if (d) { e.preventDefault(); showHeat = false; move(...d); }
  });
  el.querySelectorAll('[data-pad]').forEach((b) => b.addEventListener('click', () => {
    showHeat = false; const [dx, dy] = b.dataset.pad.split(',').map(Number); move(dx, dy);
  }));
  el.querySelector('[data-reset]').addEventListener('click', () => { load(room); cv.focus(); });
  // tap/click on canvas: step toward the tapped side
  cv.addEventListener('pointerdown', (e) => {
    cv.focus();
    const r = cv.getBoundingClientRect();
    const { ox, oy, ts } = geom();
    const tx = (e.clientX - r.left - ox) / ts - 0.5, ty = (e.clientY - r.top - oy) / ts - 0.5;
    const dx = tx - player.x, dy = ty - player.y;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    showHeat = false;
    Math.abs(dx) > Math.abs(dy) ? move(Math.sign(dx), 0) : move(0, Math.sign(dy));
  });

  function geom() {
    const cols = grid[0].length, rows = grid.length;
    const ts = Math.floor(Math.min((W - 24) / cols, (H - 24) / rows));
    return { ts, ox: (W - cols * ts) / 2, oy: (H - rows * ts) / 2 };
  }
  function draw() {
    if (!grid) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0e1115'; ctx.fillRect(0, 0, W, H);
    const { ts, ox, oy } = geom();
    if (ts < 4) return;
    const maxHeat = Math.max(0.5, ...heat.flat());
    grid.forEach((r, y) => r.forEach((c, x) => {
      const px = ox + x * ts, py = oy + y * ts;
      if (c === '#') { ctx.fillStyle = '#2b2e35'; ctx.fillRect(px, py, ts, ts); ctx.fillStyle = '#353943'; ctx.fillRect(px, py, ts, ts * 0.18); return; }
      ctx.fillStyle = (x + y) % 2 ? '#1a1e24' : '#1d2128'; ctx.fillRect(px, py, ts, ts);
      if (showHeat && heat[y][x] > 0) {
        ctx.fillStyle = `rgba(224,88,75,${0.15 + 0.7 * heat[y][x] / maxHeat})`; ctx.fillRect(px, py, ts, ts);
      }
      if (c === 'B' || c === 'H') {
        const on = c === 'B' ? latched : pressed(x, y);
        ctx.fillStyle = on ? '#7ff0e0' : '#c8a35a';
        ctx.beginPath(); ctx.ellipse(px + ts / 2, py + ts / 2, ts * 0.32, ts * 0.32, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#0e1115'; ctx.beginPath(); ctx.ellipse(px + ts / 2, py + ts / 2, ts * 0.18, ts * 0.18, 0, 0, 7); ctx.fill();
        if (c === 'H') { ctx.strokeStyle = on ? '#7ff0e0' : '#c8a35a'; ctx.lineWidth = 2; ctx.strokeRect(px + ts * 0.1, py + ts * 0.1, ts * 0.8, ts * 0.8); }
      }
      if (c === 'D') {
        const open = isDoorOpen(x, y);
        ctx.fillStyle = open ? 'rgba(127,240,224,0.25)' : '#c8a35a';
        if (open) ctx.fillRect(px, py, ts, ts);
        else { ctx.fillRect(px + ts * 0.3, py, ts * 0.4, ts); ctx.fillStyle = '#8a7444'; for (let k = 0; k < 3; k++) ctx.fillRect(px + ts * 0.3, py + ts * (0.2 + k * 0.3), ts * 0.4, 2); }
      }
    }));
    for (const b of boxes) {
      const px = ox + b.x * ts, py = oy + b.y * ts;
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(px + ts * 0.12, py + ts * 0.12, ts * 0.76, ts * 0.76);
      ctx.strokeStyle = '#c8a35a'; ctx.lineWidth = 2; ctx.strokeRect(px + ts * 0.12, py + ts * 0.12, ts * 0.76, ts * 0.76);
      ctx.beginPath(); ctx.moveTo(px + ts * 0.12, py + ts * 0.12); ctx.lineTo(px + ts * 0.88, py + ts * 0.88); ctx.stroke();
    }
    const px = ox + player.x * ts + ts / 2, py = oy + player.y * ts + ts / 2;
    ctx.fillStyle = '#e8e2d4'; ctx.beginPath(); ctx.arc(px, py, ts * 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#0e1115'; ctx.beginPath(); ctx.arc(px + ts * 0.1, py - ts * 0.05, ts * 0.06, 0, 7); ctx.fill();
    if (showHeat) {
      ctx.font = '12px "DM Mono", monospace'; ctx.fillStyle = '#e0584b';
      ctx.fillText('RED = WHERE YOU PAUSED TO THINK', 12, H - 12);
    }
  }
  load(0);
}
