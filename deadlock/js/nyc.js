// Cursed Apple ↔ New York explorables.
//  gridToLanes(el) – the 1811 grid grows into a city, then folds into the three-lane board
//  setback(el)     – the 1916 zoning envelope, carved in Hugh Ferriss's four stages
//  skyline(el)     – the height race, 1895–1970, with the Els coming down
//  elZipline(el)   – an elevated railway turns into a Deadlock zip-line
import {
  THREE, stage, orbitRig, cityMaterial, setbackTower, glowSprite, glowPoints, ribbon,
  rng, C, lerp, clamp, smooth, reduceMotion, mergeGeometries,
} from './lib.js';

const ni = (g) => (g.index ? g.toNonIndexed() : g);
const ease = (x) => smooth(clamp(x));
const LANE = { york: 0xf2cf4a, broadway: 0x5fa8ff, greenwich: 0x6fd07a, park: 0xb48cff };

// Floating labels that follow world points. Returns add(text, cls, posFn) -> handle.
function tagger(s, view) {
  const list = [];
  const v = new THREE.Vector3();
  s.frame.push(() => {
    for (const t of list) {
      if (t.alpha <= 0.02) { t.el.hidden = true; continue; }
      const r = t.pos(v); if (r && r !== v) v.copy(r);
      v.project(s.camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05;
      t.el.hidden = off;
      if (off) continue;
      t.el.style.left = `${(v.x * 0.5 + 0.5) * s.width}px`;
      t.el.style.top = `${(-v.y * 0.5 + 0.5) * s.height}px`;
      t.el.style.opacity = t.alpha;
      if (s.width < 520) t.el.style.fontSize = '0.52rem';
    }
  });
  return (text, cls, pos) => {
    const el = document.createElement('div');
    el.className = `tag3d ${cls || ''}`; el.textContent = text; el.hidden = true;
    view.appendChild(el);
    const t = { el, alpha: 1, pos: typeof pos === 'function' ? pos : (o) => o.copy(pos) };
    list.push(t);
    return t;
  };
}

function pressGroup(el, attr, fn) {
  const btns = [...el.querySelectorAll(`[${attr}]`)];
  btns.forEach((b) => b.addEventListener('click', () => {
    btns.forEach((x) => x.setAttribute('aria-pressed', x === b));
    fn(b.getAttribute(attr), b);
  }));
  return btns;
}

// ============================================================ 1. GRID → LANES
export function gridToLanes(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 30, fog: [1400, 3200], bg: 0x0b0d10, far: 6000 });
  const scene = s.scene;
  const board = new THREE.Group(); scene.add(board);
  const tag = tagger(s, view);
  const R = rng(1811);

  const LEN = 1000, HALF = LEN / 2, HOUSTON = 330;
  const islandW = (z) => 70 + 230 * ease((HALF - z) / 360) - 60 * ease((-z - 120) / 380);

  // water + island
  const water = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshBasicMaterial({ color: 0x0a0d11 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -1; scene.add(water);
  const shape = new THREE.Shape();
  const edge = [];
  for (let i = 0; i <= 80; i++) { const z = -HALF - 20 + (i / 80) * (LEN + 40); edge.push([islandW(z) / 2 + 14, z]); }
  shape.moveTo(edge[0][0], edge[0][1]);
  edge.forEach((p) => shape.lineTo(p[0], p[1]));
  for (let i = edge.length - 1; i >= 0; i--) shape.lineTo(-edge[i][0], edge[i][1]);
  const landMat = new THREE.MeshBasicMaterial({ color: 0x3b3428, side: THREE.DoubleSide });
  const land = new THREE.Mesh(new THREE.ShapeGeometry(shape), landMat);
  land.rotation.x = Math.PI / 2; board.add(land);

  // Central Park
  const PARK = { x0: -62, x1: 46, z0: -460, z1: -170 };
  const parkMat = new THREE.MeshBasicMaterial({ color: 0x24311f });
  const park = new THREE.Mesh(new THREE.PlaneGeometry(PARK.x1 - PARK.x0, PARK.z1 - PARK.z0), parkMat);
  park.rotation.x = -Math.PI / 2; park.position.set((PARK.x0 + PARK.x1) / 2, 0.3, (PARK.z0 + PARK.z1) / 2); board.add(park);

  // Broadway as drawn on the plan: straight up the tip, then a diagonal across the grid
  const bwPlan = (z) => {
    if (z > HOUSTON) return lerp(0, 15, (HALF - z) / (HALF - HOUSTON));
    if (z > -170) return 15 - 100 * (HOUSTON - z) / (HOUSTON + 170);
    return -85;
  };
  const nearBroadway = (x, z, pad) => Math.abs(x - bwPlan(z)) < pad;

  // blocks
  const blocks = [];
  const AV = 34, ST = 11;
  for (let z = -HALF + 14; z < HOUSTON; z += ST) {
    const w = islandW(z);
    for (let x = -w / 2; x < w / 2 - AV * 0.4; x += AV) {
      const cx = x + AV / 2, cz = z + ST / 2, sx = AV - 7, sz = ST - 3.4;
      if (Math.abs(cx) + sx / 2 > islandW(cz) / 2 - 3) continue;
      if (cx > PARK.x0 - 2 && cx < PARK.x1 + 2 && cz > PARK.z0 && cz < PARK.z1) continue;
      if (nearBroadway(cx, cz, 10)) continue;
      blocks.push({ x: cx, z: cz, sx, sz, rot: 0 });
    }
  }
  // the crooked old town below Houston Street
  for (let i = 0; i < 260; i++) {
    const z = HOUSTON + 8 + R() * (HALF - HOUSTON - 14);
    const w = islandW(z);
    const x = (R() - 0.5) * (w - 22);
    if (nearBroadway(x, z, 9)) continue;
    if (blocks.some((b) => b.z > HOUSTON && Math.hypot(b.x - x, b.z - z) < 15)) continue;
    blocks.push({ x, z, sx: 9 + R() * 13, sz: 8 + R() * 12, rot: (R() - 0.5) * 0.9 });
  }
  const cluster = (z) => Math.max(Math.exp(-(((z - 420) / 70) ** 2)), 0.9 * Math.exp(-(((z - 10) / 130) ** 2)));
  blocks.forEach((b) => {
    const r = R();
    b.hCity = 6 + R() * 10 + cluster(b.z) * r * r * 240;
    b.hPlan = 1.6;
  });

  const bmat = cityMaterial(s, { base: 0x6b5f48, lit: 0, floorH: 3.2, winW: 2.6 });
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(box, bmat, blocks.length);
  board.add(inst);

  // lanes (rebuilt as the morph changes)
  const laneMeshes = {};
  const laneGeom = (key, m2) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const z = HALF - 34 - (i / 120) * (LEN - 68);
      const w = islandW(z);
      let x;
      if (key === 'broadway') x = lerp(bwPlan(z), 0, ease(m2 * 1.4));
      else if (key === 'york') x = 0.31 * w;
      else if (key === 'greenwich') x = -0.31 * w;
      else x = 0.155 * w;
      pts.push(new THREE.Vector3(x, 0, z));
    }
    return ribbon(pts, key === 'broadway' ? lerp(10, 12, m2) : 12, 0.6);
  };
  for (const key of ['york', 'broadway', 'greenwich', 'park']) {
    const mat = new THREE.MeshBasicMaterial({ color: LANE[key], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(laneGeom(key, 0), mat);
    board.add(m); laneMeshes[key] = m;
  }
  const laneX = (key, z) => {
    const w = islandW(z);
    return key === 'broadway' ? 0 : key === 'york' ? 0.31 * w : -0.31 * w;
  };

  // bases
  const mkBase = (z, col, kind) => {
    const g = new THREE.Group(); g.position.set(0, 0, z);
    const bm = cityMaterial(s, { base: 0x2b2e36, lit: 0.15, windows: kind === 'factory' });
    if (kind === 'factory') {
      const body = new THREE.BoxGeometry(70, 16, 34).translate(0, 8, 0);
      const stacks = [-20, 0, 20].map((x) => new THREE.CylinderGeometry(2.6, 3.4, 44, 10).translate(x, 22, -8));
      g.add(new THREE.Mesh(mergeGeometries([ni(body), ...stacks.map(ni)]), bm));
    } else {
      const parts = [new THREE.BoxGeometry(76, 14, 36).translate(0, 7, 0), new THREE.BoxGeometry(80, 3, 40).translate(0, 1.5, 0)];
      for (let i = 0; i < 9; i++) parts.push(new THREE.CylinderGeometry(1.4, 1.4, 14, 8).translate(-32 + i * 8, 7, 20));
      const ped = new THREE.CylinderGeometry(0, 40, 9, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.48).translate(0, 18.5, 0);
      parts.push(ped);
      g.add(new THREE.Mesh(mergeGeometries(parts.map(ni)), bm));
    }
    const core = glowSprite(col, 70, 0.9); core.position.y = 40; g.add(core);
    const halo = glowSprite(col, 260, 0.3); halo.position.y = 30; g.add(halo);
    board.add(g);
    return g;
  };
  const baseKing = mkBase(HALF - 22, C.amber, 'factory');
  const baseMother = mkBase(-HALF + 30, C.sapphire, 'museum');

  // troopers marching up each lane
  const NT = 150;
  const troops = glowPoints(NT, 26);
  const tp = troops.geometry.attributes.position.array, tc = troops.geometry.attributes.color.array;
  const tdat = [];
  const lanesK = ['york', 'broadway', 'greenwich'];
  for (let i = 0; i < NT; i++) tdat.push({ lane: lanesK[i % 3], team: (i >> 1) % 2, ph: R(), sp: 0.035 + R() * 0.01, off: (R() - 0.5) * 6 });
  board.add(troops);

  // compass (world-fixed, shows true north vs the grid's "north")
  const compass = new THREE.Group(); compass.position.set(300, 1, 360); scene.add(compass);
  const cmat = new THREE.MeshBasicMaterial({ color: C.paper, transparent: true });
  const gmat = new THREE.MeshBasicMaterial({ color: C.brass, transparent: true });
  const arrow = (mat) => { const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 70).translate(0, 0, -35), mat); const tip = new THREE.Mesh(new THREE.ConeGeometry(5, 14, 3).rotateX(-Math.PI / 2).translate(0, 0, -74), mat); g.add(sh, tip); return g; };
  const trueN = arrow(cmat); compass.add(trueN);
  const gridN = arrow(gmat); gridN.rotation.y = -THREE.MathUtils.degToRad(29); compass.add(gridN);

  // labels
  const local = (x, y, z) => (o) => board.localToWorld(o.set(x, y, z));
  const L = {
    houston: tag('Houston St · the 1811 grid begins', 'brass', local(-islandW(HOUSTON) / 2 - 10, 4, HOUSTON)),
    oldtown: tag('Old town: streets older than the plan', '', local(0, 30, 430)),
    bway: tag('Broadway · older than the grid', 'sapphire', local(bwPlan(120), 6, 120)),
    union: tag('Union Sq', '', local(bwPlan(290), 3, 290)),
    flat: tag('Madison Sq · Flatiron', '', local(bwPlan(200), 3, 200)),
    times: tag('Times Sq', '', local(bwPlan(30), 3, 30)),
    park: tag('Central Park', '', local(-8, 3, -320)),
    trueN: tag('True north', '', (o) => compass.localToWorld(o.set(0, 2, -118))),
    gridN: tag('The grid, 29° off', 'brass', (o) => gridN.localToWorld(o.set(0, 2, -70))),
    york: tag('York', '', (o) => board.localToWorld(o.set(laneX('york', -220), 6, -220))),
    broadway: tag('Broadway', '', (o) => board.localToWorld(o.set(0, 6, -40))),
    greenwich: tag('Greenwich', '', (o) => board.localToWorld(o.set(laneX('greenwich', 120), 6, 120))),
    parkLane: tag('Park lane · removed Feb 2025', '', (o) => board.localToWorld(o.set(0.155 * islandW(-250), 6, -250))),
    king: tag('The Hidden King · downtown', 'amber', (o) => baseKing.localToWorld(o.set(0, 62, 0))),
    mother: tag('The Archmother · uptown', 'sapphire', (o) => baseMother.localToWorld(o.set(0, 62, 0))),
  };
  for (const k of ['york', 'broadway', 'greenwich', 'parkLane']) L[k].el.style.borderColor = L[k].el.style.color = `#${LANE[k === 'parkLane' ? 'park' : k].toString(16).padStart(6, '0')}`;

  // ---- state
  let m = 0, target = 0, ghost = false, lastBuilt = -1;
  const slider = el.querySelector('[data-era]');
  const eraLabel = el.querySelector('[data-era-label]');
  const NAMES = ['The 1811 plan', 'Manhattan, c. 1930', 'The Cursed Apple'];
  const btns = pressGroup(el, 'data-stage', (v) => { target = +v; });
  slider.addEventListener('input', () => { target = m = +slider.value; syncButtons(); });
  el.querySelector('[data-ghost]').addEventListener('click', (e) => {
    ghost = !ghost; e.currentTarget.setAttribute('aria-pressed', ghost);
  });
  function syncButtons() { btns.forEach((b) => b.setAttribute('aria-pressed', Math.abs(+b.dataset.stage - target) < 0.01)); }

  const tmp = new THREE.Object3D();
  const cPlan = new THREE.Color(0x6b5f48), cCity = new THREE.Color(0x2a2e36);
  const lPlan = new THREE.Color(0x3b3428), lCity = new THREE.Color(0x16191e), lBoard = new THREE.Color(0x121519);
  const pPlan = new THREE.Color(0x3f4a33), pCity = new THREE.Color(0x1d2a1c);
  function build() {
    const m1 = clamp(m), m2 = clamp(m - 1);
    const e1 = ease(m1), e2 = ease(m2);
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      let h = lerp(b.hPlan, b.hCity, e1);
      if (m2 > 0) {
        const inLane = ['york', 'broadway', 'greenwich'].some((k) => Math.abs(b.x - laneX(k, b.z)) < 13);
        const inBase = Math.abs(b.z) > HALF - 60;
        h = lerp(h, inLane || inBase ? 0.4 : h * 0.75, e2);
      }
      tmp.position.set(b.x, 0, b.z);
      tmp.rotation.set(0, b.rot * (1 - e2 * 0), 0);
      tmp.scale.set(b.sx, Math.max(0.05, h), b.sz);
      tmp.updateMatrix(); inst.setMatrixAt(i, tmp.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    bmat.uniforms.base.value.copy(cPlan).lerp(cCity, e1);
    bmat.uniforms.lit.value = 0.32 * e1;
    landMat.color.copy(lPlan).lerp(lCity, e1).lerp(lBoard, e2);
    parkMat.color.copy(pPlan).lerp(pCity, e1);
    laneMeshes.broadway.geometry.dispose(); laneMeshes.broadway.geometry = laneGeom('broadway', m2);
    board.rotation.y = -THREE.MathUtils.degToRad(29) * (1 - e2);
    const st = Math.round(m);
    slider.value = m.toFixed(2);
    eraLabel.textContent = NAMES[Math.min(2, Math.round(m))];
  }

  s.frame.push((dt, t) => {
    const prev = m;
    m += (target - m) * (1 - Math.pow(0.02, dt));
    if (Math.abs(target - m) < 0.002) m = target;
    if (m !== prev || lastBuilt < 0) { build(); lastBuilt = m; }
    const m1 = clamp(m), m2 = clamp(m - 1), e2 = ease(m2);
    // lanes
    laneMeshes.broadway.material.opacity = lerp(0.55, 0.85, e2);
    laneMeshes.york.material.opacity = 0.85 * e2;
    laneMeshes.greenwich.material.opacity = 0.85 * e2;
    laneMeshes.park.material.opacity = ghost ? (0.25 + 0.2 * Math.sin(t * 3)) * Math.max(0.35, e2) : 0;
    baseKing.scale.setScalar(Math.max(0.001, e2)); baseMother.scale.setScalar(Math.max(0.001, e2));
    // troopers
    for (let i = 0; i < NT; i++) {
      const d = tdat[i];
      const u = (d.ph + t * d.sp) % 1;
      const zFrom = d.team ? -HALF + 60 : HALF - 60;
      const meet = 0;
      const z = lerp(zFrom, meet, u);
      tp[i * 3] = laneX(d.lane, z) + d.off; tp[i * 3 + 1] = 3; tp[i * 3 + 2] = z;
      const a = e2 * Math.min(1, (1 - u) * 6) * (reduceMotion ? 0.7 : 1);
      const c = new THREE.Color(d.team ? C.sapphire : C.amber);
      tc[i * 3] = c.r * a; tc[i * 3 + 1] = c.g * a; tc[i * 3 + 2] = c.b * a;
    }
    troops.geometry.attributes.position.needsUpdate = true; troops.geometry.attributes.color.needsUpdate = true;
    // compass
    const ca = 1 - e2;
    cmat.opacity = gmat.opacity = ca; compass.visible = ca > 0.02;
    // labels
    const early = 1 - ease((m - 0.6) / 0.5);
    L.houston.alpha = L.oldtown.alpha = (1 - e2) * (1 - ease((m - 1.1) / 0.3));
    L.bway.alpha = L.union.alpha = L.flat.alpha = L.times.alpha = 1 - e2;
    L.park.alpha = 1 - e2;
    L.trueN.alpha = L.gridN.alpha = ca;
    L.york.alpha = L.broadway.alpha = L.greenwich.alpha = L.king.alpha = L.mother.alpha = e2;
    L.parkLane.alpha = ghost ? Math.max(0.4, e2) : 0;
    void early;
  });

  const rig = orbitRig(s, { target: new THREE.Vector3(0, 0, 40), radius: 1050, theta: -0.42, phi: 1.02, minR: 400, maxR: 2600, auto: 0.015 });
  s.onResize = (w, h) => { rig.tR = 1050 * Math.pow(Math.max(1, 1.45 / (w / h)), 0.6); };
  s.resize();
  build();
}

// ============================================================ 2. 1916 SETBACKS
export function setback(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 30, fog: [1700, 4200], bg: 0x0f1114, far: 8000 });
  const scene = s.scene;
  const tag = tagger(s, view);

  const LOT_X = 400, LOT_Z = 200, S_AVE = 100, S_ST = 60, SLAB = 10, MAXH = 1100;
  const NS = Math.ceil(MAXH / SLAB);
  const PIECES = NS * 3;

  // streets, sidewalks, neighbours, a person for scale
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshBasicMaterial({ color: 0x15171b }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(LOT_X, LOT_Z), new THREE.MeshBasicMaterial({ color: 0x1e2126 }));
  lot.rotation.x = -Math.PI / 2; lot.position.y = 0.3; scene.add(lot);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x3a3a34 });
  for (const z of [LOT_Z / 2 + S_ST / 2, -LOT_Z / 2 - S_ST / 2]) {
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(2400, 1.4), lineMat); ln.rotation.x = -Math.PI / 2; ln.position.set(0, 0.4, z); scene.add(ln);
  }
  for (const x of [LOT_X / 2 + S_AVE / 2, -LOT_X / 2 - S_AVE / 2]) {
    const ln = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2400), lineMat); ln.rotation.x = -Math.PI / 2; ln.position.set(x, 0.4, 0); scene.add(ln);
  }
  const nb = cityMaterial(s, { base: 0x2a2c31, lit: 0.22, floorH: 12, winW: 9 });
  const nbg = [];
  const R = rng(1916);
  for (const [bx, bz] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
    const cx = bx * (LOT_X + S_AVE), cz = bz * (LOT_Z + S_ST);
    for (let i = 0; i < 6; i++) {
      const w = 50 + R() * 40, d = 60 + R() * 60, h = 40 + R() * (i % 3 ? 90 : 260);
      nbg.push(ni(new THREE.BoxGeometry(w, h, d).translate(cx + (R() - 0.5) * (LOT_X - w), h / 2, cz + (R() - 0.5) * (LOT_Z - d))));
    }
  }
  scene.add(new THREE.Mesh(mergeGeometries(nbg), nb));
  const person = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 3.4, 4, 8).translate(0, 2.9, 0), new THREE.MeshBasicMaterial({ color: C.paper }));
  person.position.set(LOT_X / 2 - 10, 0, LOT_Z / 2 + 8); scene.add(person);

  // the building, as stacked slabs × three pieces each
  const bmat = cityMaterial(s, { base: 0x8a8a8f, lit: 0, floorH: 12, winW: 8, sun: [0.3, 0.35, 0.9], rim: 0x6677aa });
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bmat, PIECES);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(inst);

  let k = 2, stg = 0, occult = false, planes = true;
  const inset = (y, S) => Math.max(0, (y - k * S) / (2 * k));
  const envRect = (y) => {
    const dx = inset(y, S_AVE), dz = inset(y, S_ST);
    return { x0: -LOT_X / 2 + dx, x1: LOT_X / 2 - dx, z0: -LOT_Z / 2 + dz, z1: LOT_Z / 2 - dz };
  };
  const envTop = () => k * S_ST + 2 * k * (LOT_Z / 2); // where the narrow side runs out
  const tierB = () => { const w = k * S_ST, top = envTop(); return [0, w, w + (top - w) * 0.28, w + (top - w) * 0.5, w + (top - w) * 0.7, top]; };
  const TOWER = { x0: -80, x1: 80, z0: -62.5, z1: 62.5 }; // 160 × 125 = 25% of the lot

  function layout(stage) {
    // returns PIECES boxes [cx,cy,cz,sx,sy,sz]
    const out = [];
    const top = envTop();
    const tb = tierB();
    const towerTop = tb[2] + 600;
    for (let i = 0; i < NS; i++) {
      const y0 = i * SLAB, y1 = y0 + SLAB, yc = y0 + SLAB / 2;
      let r = null, slots = false;
      if (stage === 0 || stage === 1) {
        if (y1 <= top) r = envRect(y1);
        slots = stage === 1 && y0 >= k * S_ST + 20;
      } else {
        const tierTopFor = (y) => { for (let j = 1; j < tb.length; j++) if (y <= tb[j] + 1e-6) return tb[j]; return null; };
        if (stage === 2) { const tt = tierTopFor(y1); if (tt !== null) r = envRect(tt); }
        else {
          const yT = tb[2];
          if (y1 <= yT) { const tt = tierTopFor(y1); r = envRect(tt); }
          else if (y1 <= towerTop) {
            r = { ...TOWER };
            const left = towerTop - y1;
            const sh = left < 30 ? 0.55 : left < 70 ? 0.72 : left < 120 ? 0.86 : 1;
            r = { x0: TOWER.x0 * sh, x1: TOWER.x1 * sh, z0: TOWER.z0 * sh, z1: TOWER.z1 * sh };
          }
        }
      }
      if (!r || r.x1 - r.x0 < 1 || r.z1 - r.z0 < 1) {
        const yy = Math.min(yc, top);
        for (let p = 0; p < 3; p++) out.push([0, yy, 0, 0, 0, 0]);
        continue;
      }
      const W = r.x1 - r.x0, a = r.x0 + W / 3, b = r.x0 + 2 * W / 3;
      const cuts = slots ? [[r.x0, a - 11], [a + 11, b - 11], [b + 11, r.x1]] : [[r.x0, a], [a, b], [b, r.x1]];
      for (const [x0, x1] of cuts) {
        const w = Math.max(0, x1 - x0);
        out.push([(x0 + x1) / 2, yc, (r.z0 + r.z1) / 2, w, w > 0 ? SLAB : 0, w > 0 ? r.z1 - r.z0 : 0]);
      }
    }
    return out;
  }

  let from = layout(0), to = from, tAnim = 1;
  const tmp = new THREE.Object3D();
  function apply(p) {
    const e = ease(p);
    for (let i = 0; i < PIECES; i++) {
      const A = from[i], B = to[i];
      tmp.position.set(lerp(A[0], B[0], e), lerp(A[1], B[1], e), lerp(A[2], B[2], e));
      tmp.scale.set(Math.max(1e-3, lerp(A[3], B[3], e)), Math.max(1e-3, lerp(A[4], B[4], e)), Math.max(1e-3, lerp(A[5], B[5], e)));
      tmp.updateMatrix(); inst.setMatrixAt(i, tmp.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  }
  function go(newStage) {
    const cur = to.map((B, i) => { const A = from[i], e = ease(tAnim); return A.map((v, j) => lerp(v, B[j], e)); });
    from = cur; stg = newStage; to = layout(stg); tAnim = 0;
    rebuildPlanes(); rebuildRings();
  }

  // the slanted "sky exposure" planes, drawn from the middle of each street
  const planeMat = new THREE.MeshBasicMaterial({ color: C.brass, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const edgeMat = new THREE.LineBasicMaterial({ color: C.brass, transparent: true, opacity: 0.55 });
  const planeGroup = new THREE.Group(); scene.add(planeGroup);
  function rebuildPlanes() {
    planeGroup.children.forEach((c) => c.geometry.dispose());
    planeGroup.clear();
    const top = envTop();
    const sx = LOT_X / 2 + S_AVE / 2, sz = LOT_Z / 2 + S_ST / 2;
    const zAt = (y) => sz - y / (2 * k), xAt = (y) => sx - y / (2 * k);
    // front and back trapezoids, end triangles(ish)
    const quads = [];
    for (const sg of [1, -1]) {
      quads.push([[-xAt(0), 0, sg * zAt(0)], [xAt(0), 0, sg * zAt(0)], [xAt(top), top, sg * zAt(top)], [-xAt(top), top, sg * zAt(top)]]);
      quads.push([[sg * xAt(0), 0, -zAt(0)], [sg * xAt(0), 0, zAt(0)], [sg * xAt(top), top, zAt(top)], [sg * xAt(top), top, -zAt(top)]]);
    }
    const pos = [], lines = [];
    for (const q of quads) {
      pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
      lines.push(...q[0], ...q[3], ...q[1], ...q[2], ...q[3], ...q[2]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    planeGroup.add(new THREE.Mesh(g, planeMat), new THREE.LineSegments(lg, edgeMat));
    // street-wall height marker
    const wh = k * S_ST;
    const mk = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-LOT_X / 2, wh, LOT_Z / 2 + 0.5, LOT_X / 2, wh, LOT_Z / 2 + 0.5], 3));
    planeGroup.add(new THREE.LineSegments(mk, new THREE.LineBasicMaterial({ color: C.soul })));
  }

  // occult rings on every terrace + a sigil over the summit
  const ringGroup = new THREE.Group(); scene.add(ringGroup);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const sigil = new THREE.Group(); scene.add(sigil);
  for (let i = 0; i < 3; i++) {
    const r = 70 + i * 34;
    sigil.add(new THREE.Mesh(new THREE.RingGeometry(r, r + 2.2 - i * 0.4, 96), ringMat));
  }
  const star = [];
  for (let i = 0; i < 7; i++) {
    const a0 = (i / 7) * Math.PI * 2, a1 = ((i + 3) / 7) * Math.PI * 2;
    star.push(Math.cos(a0) * 104, 0, Math.sin(a0) * 104, Math.cos(a1) * 104, 0, Math.sin(a1) * 104);
  }
  const starMat = new THREE.LineBasicMaterial({ color: 0xc9a8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  const starLines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(star, 3)), starMat);
  starLines.rotation.x = Math.PI / 2; sigil.add(starLines);
  sigil.children.forEach((c) => { if (c.isMesh) c.rotation.x = -Math.PI / 2; });
  const sigilGlow = glowSprite(0xb48cff, 420, 0); sigil.add(sigilGlow);
  function rebuildRings() {
    ringGroup.children.forEach((c) => c.geometry.dispose());
    ringGroup.clear();
    const tb = tierB();
    const tops = stg >= 2 ? tb.slice(1, stg === 3 ? 3 : 5) : [];
    for (const y of tops) {
      const r = envRect(y);
      const shape = new THREE.Shape();
      shape.moveTo(r.x0 - 6, r.z0 - 6); shape.lineTo(r.x1 + 6, r.z0 - 6); shape.lineTo(r.x1 + 6, r.z1 + 6); shape.lineTo(r.x0 - 6, r.z1 + 6); shape.lineTo(r.x0 - 6, r.z0 - 6);
      const hole = new THREE.Path();
      hole.moveTo(r.x0 - 2, r.z0 - 2); hole.lineTo(r.x0 - 2, r.z1 + 2); hole.lineTo(r.x1 + 2, r.z1 + 2); hole.lineTo(r.x1 + 2, r.z0 - 2); hole.lineTo(r.x0 - 2, r.z0 - 2);
      shape.holes.push(hole);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), ringMat);
      m.rotation.x = Math.PI / 2; m.position.y = y + 1.5;
      ringGroup.add(m);
    }
  }

  // Ferriss-style searchlights
  const beams = [];
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xcfd6e6, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(70, 2600, 24, 1, true).translate(0, -1300, 0), beamMat);
    const g = new THREE.Group(); g.position.set((i - 1.5) * 380, 0, -260 - (i % 2) * 220); g.add(b);
    b.rotation.x = Math.PI; // apex at the lamp
    scene.add(g); beams.push(g);
  }

  // labels
  const L = {
    wall: tag('Street wall', 'brass', () => new THREE.Vector3(-LOT_X / 2, k * S_ST, LOT_Z / 2)),
    plane: tag('Slanted limit, from the middle of the street', 'brass', () => new THREE.Vector3(0, k * S_ST * 0.5, LOT_Z / 2 + S_ST / 4)),
    tower: tag('Tower on 25% of the lot: no height limit', '', () => new THREE.Vector3(TOWER.x1, tierB()[2] + 420, 0)),
    person: tag('A person, for scale', '', () => person.position.clone().add(new THREE.Vector3(0, 9, 0))),
  };
  L.wall.el.style.cursor = 'default';

  // UI
  const readout = el.querySelector('[data-readout]');
  const stageNames = ['1 · The legal envelope', '2 · Carved for light', '3 · Stepped', '4 · Finished, with a tower'];
  pressGroup(el, 'data-ferriss', (v) => go(+v));
  pressGroup(el, 'data-k', (v) => { k = +v; go(stg); });
  el.querySelector('[data-planes]').addEventListener('click', (e) => { planes = !planes; e.currentTarget.setAttribute('aria-pressed', planes); });
  el.querySelector('[data-occult]').addEventListener('click', (e) => { occult = !occult; e.currentTarget.setAttribute('aria-pressed', occult); });

  const baseCol = new THREE.Color(0x8a8a8f), finCol = new THREE.Color(0x4a4c53);
  const winWarm = new THREE.Color(0xffc77a), winOcc = new THREE.Color(0xb48cff);
  let occ = 0;
  s.frame.push((dt, t) => {
    if (tAnim < 1) { tAnim = Math.min(1, tAnim + dt / 1.4); apply(tAnim); }
    const fin = stg === 3 ? ease(tAnim) : 0;
    occ += ((occult ? 1 : 0) - occ) * Math.min(1, dt * 3);
    bmat.uniforms.base.value.copy(baseCol).lerp(finCol, fin);
    bmat.uniforms.lit.value = 0.34 * fin + 0.08 * occ;
    bmat.uniforms.win.value.copy(winWarm).lerp(winOcc, occ);
    planeGroup.visible = planes;
    planeMat.opacity = 0.09 + 0.03 * Math.sin(t * 1.5);
    ringMat.opacity = 0.8 * occ; starMat.opacity = 0.9 * occ; sigilGlow.material.opacity = 0.35 * occ;
    const summit = stg === 3 ? tierB()[2] + 600 : stg === 2 ? tierB()[4] : envTop();
    sigil.position.y += (summit + 70 - sigil.position.y) * Math.min(1, dt * 2);
    sigil.rotation.y = t * 0.25;
    sigil.visible = occ > 0.01;
    if (!reduceMotion) beams.forEach((g, i) => { g.rotation.z = 0.35 * Math.sin(t * 0.21 + i * 1.7); g.rotation.x = -0.25 + 0.2 * Math.cos(t * 0.17 + i); });
    L.wall.alpha = planes ? 1 : 0;
    L.plane.alpha = planes && stg < 2 ? 1 : 0;
    L.tower.alpha = stg === 3 ? ease(tAnim) : 0;
    L.person.alpha = s.camera.position.distanceTo(person.position) < 1300 ? 0.9 : 0;
  });
  function updateReadout() {
    readout.innerHTML = `${k}× district · street wall ${Math.round(k * S_ST)} ft on the side street, ${Math.round(k * S_AVE)} ft on the avenue`;
  }
  el.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', updateReadout));
  updateReadout();

  const rig = orbitRig(s, { target: new THREE.Vector3(0, 440, 0), radius: 2800, theta: 0.62, phi: 1.22, minPhi: 0.4, maxPhi: 1.5, minR: 700, maxR: 3600, auto: 0.03 });
  s.onResize = (w, h) => {
    rig.tR = 2800 * Math.pow(Math.max(1, 1.3 / (w / h)), 0.8);
    s.fogUniforms.fogNear.value = s.scene.fog.near = rig.tR - 900;
    s.fogUniforms.fogFar.value = s.scene.fog.far = rig.tR + 2600;
  };
  s.resize();
  rebuildPlanes(); rebuildRings(); apply(1);
  void stageNames;
}

// ============================================================ 3. HEIGHT RACE
const TOWERS = [
  { id: 'parkrow', name: 'Park Row Building', year: 1899, by: 'R. H. Robertson', ft: 391, h: 39.1,
    note: 'The tallest office building in the world from 1899 to 1908, on Newspaper Row. Twin copper-domed cupolas on top.',
    dl: 'Part of the game\'s skyline, per the Steam guide.' },
  { id: 'flatiron', name: 'Flatiron Building', year: 1902, by: 'Daniel Burnham', h: 28.5,
    note: 'A triangle, because Broadway cuts across Fifth Avenue here. Its prow is about 6.5 feet wide. People called it "Burnham\'s Folly".',
    dl: 'A distant background tower, not a place you can walk into.' },
  { id: 'singer', name: 'Singer Building', year: 1908, by: 'Ernest Flagg', ft: 612, h: 61.2, gone: 1968,
    note: 'A slim tower with a bulb-shaped mansard crown on a broad base. World\'s tallest 1908–09. Torn down in 1968.',
    dl: 'Part of the game\'s skyline, per the Steam guide.' },
  { id: 'woolworth', name: 'Woolworth Building', year: 1913, by: 'Cass Gilbert', ft: 792, h: 79.2,
    note: 'The "Cathedral of Commerce": Gothic terra-cotta, setbacks and a copper pyramid. World\'s tallest from 1913 to 1930.',
    dl: 'Part of the game\'s skyline, per the Steam guide.' },
  { id: 'wall120', name: '120 Wall Street', year: 1930, by: 'Buchman & Kahn', h: 39.9,
    note: 'The textbook "wedding cake": a stack of setbacks shaped by the 1916 zoning rules, with no spire at all.',
    dl: 'Part of the game\'s skyline, per the Steam guide.' },
  { id: 'wall40', name: '40 Wall Street', year: 1930, by: 'H. Craig Severance with Yasuo Matsui', ft: 927, h: 92.7,
    note: 'Built to be the world\'s tallest. It lost to the Chrysler Building\'s spire, which was assembled in secret inside the crown.',
    dl: 'The Steam guide says a recent update turned it into an "arcane" version.' },
  { id: 'chrysler', name: 'Chrysler Building', year: 1930, by: 'William Van Alen', ft: 1046, h: 104.6,
    note: 'A stainless-steel crown of stepped sunburst arches, with eagle and hood-ornament gargoyles. The spire went up in secret in October 1929.',
    dl: 'Its crown is reproduced almost one-to-one on the game\'s skyline.' },
  { id: 'empire', name: 'Empire State Building', year: 1931, by: 'Shreve, Lamb & Harmon', ft: 1250, h: 125,
    note: 'Opened May 1, 1931: setbacks under the 1916 law and an airship mooring mast on top. 1,250 feet to the roof.',
    dl: 'Part of the game\'s skyline, per the Steam guide.' },
  { id: 'pine70', name: '70 Pine Street', year: 1932, by: 'Clinton & Russell, Holton & George', h: 95.2,
    note: 'Built for the Cities Service company: an Art Deco tower capped with a glass lantern.',
    dl: 'The latest building in the Steam guide\'s list.' },
];
const ELS = [
  { name: 'Ninth Avenue El', gone: 1940, z: 26 },
  { name: 'Sixth Avenue El', gone: 1939, z: 40 },
  { name: 'Third Avenue El', gone: 1955.5, z: 54 },
  { name: 'Second Avenue El', gone: 1942, z: 68 },
];
const EVENTS = [
  [1895, 'Gaslight and cable cars. The tallest thing downtown is still a church steeple.'],
  [1899, 'Park Row Building: the tallest office building in the world.'],
  [1904, 'The first subway line opens under Manhattan (October 27).'],
  [1908, 'Singer Building takes the height record.'],
  [1913, 'Woolworth Building: "the Cathedral of Commerce".'],
  [1916, 'The Zoning Resolution: from now on, tall buildings must step back.'],
  [1920, 'Prohibition begins. Speakeasies everywhere.'],
  [1929.75, 'October 1929: Chrysler\'s spire is hoisted out of the crown in secret.'],
  [1931, 'Empire State Building opens.'],
  [1933.9, 'Prohibition ends (December 1933).'],
  [1939, 'The Sixth Avenue El comes down.'],
  [1942, 'The Second Avenue El is gone too.'],
  [1955.5, 'The Third Avenue El, the last over Manhattan\'s avenues, closes in the mid-1950s.'],
  [1968, 'The Singer Building is demolished.'],
];

function towerGeo(id) {
  const P = [];
  const box = (w, h, d, y = 0, x = 0, z = 0) => P.push(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z));
  const pyr = (r, h, y) => P.push(new THREE.ConeGeometry(r, h, 4).rotateY(Math.PI / 4).translate(0, y + h / 2, 0));
  const cyl = (r0, r1, h, y, seg = 12, x = 0) => P.push(new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y + h / 2, 0));
  switch (id) {
    case 'parkrow': box(15, 34, 10); for (const x of [-5, 5]) { cyl(2.2, 2.2, 2.6, 34, 12, x); P.push(new THREE.SphereGeometry(2.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 36.6, 0)); } break;
    case 'flatiron': {
      const sh = new THREE.Shape(); sh.moveTo(-8, -6); sh.lineTo(8, -6); sh.lineTo(1.2, 8.6); sh.quadraticCurveTo(0, 9.6, -1.2, 8.6); sh.lineTo(-8, -6);
      P.push(new THREE.ExtrudeGeometry(sh, { depth: 28.5, bevelEnabled: false }).rotateX(-Math.PI / 2));
      break;
    }
    case 'singer': {
      box(15, 19, 12); box(6.6, 31, 6.6, 19);
      P.push(new THREE.LatheGeometry([[3.6, 0], [4.3, 2.5], [4.0, 5], [2.6, 7.2], [1.4, 8]].map(([x, y]) => new THREE.Vector2(x, y)), 4).rotateY(Math.PI / 4).translate(0, 50, 0));
      cyl(0.9, 1.1, 1.8, 58, 8); P.push(new THREE.ConeGeometry(0.5, 1.4, 6).translate(0, 60.5, 0));
      break;
    }
    case 'woolworth': box(16, 30, 11); box(8.6, 30, 8.6, 30); box(7.2, 8, 7.2, 60); box(5.8, 4, 5.8, 68); pyr(4.6, 5.4, 72); cyl(0.4, 0.9, 1.8, 77.4, 6); break;
    case 'wall120': P.push(setbackTower({ w: 17, d: 13, h: 39.9, tiers: 6, shrink: 0.83 })); break;
    case 'wall40': box(13, 50, 13); box(9.5, 20, 9.5, 50); box(8, 14, 8, 70); pyr(6.2, 6.5, 84); cyl(0.2, 0.7, 2.2, 90.5, 6); break;
    case 'chrysler': {
      box(15, 18, 13); box(11, 30, 11, 18); box(9, 22, 9, 48);
      for (let i = 0; i < 6; i++) P.push(new THREE.CylinderGeometry(4.6 - i * 0.68, 4.9 - i * 0.68, 2.6, 4).rotateY(Math.PI / 4).translate(0, 70 + i * 2.6 + 1.3, 0));
      break;
    }
    case 'empire': box(18, 8.5, 15); box(13.5, 51.5, 11, 8.5); box(11, 25, 9, 60); box(9, 12, 7.5, 85); box(7, 12, 6, 97); box(5, 8, 4.5, 109); cyl(1.6, 2.2, 6, 117, 10); P.push(new THREE.ConeGeometry(1.3, 2.4, 8).translate(0, 124.2, 0)); break;
    case 'pine70': box(13, 30, 12); box(10, 34, 9.5, 30); box(7.5, 15, 7.5, 64); box(5.5, 8, 5.5, 79); box(4, 3, 4, 87); break;
  }
  return mergeGeometries(P.map(ni));
}

export function skyline(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 26, fog: [700, 1800], bg: 0x0c0e12, far: 4000 });
  const scene = s.scene;
  const tag = tagger(s, view);
  const R = rng(1930);
  const GAP = 32;
  const X0 = -((TOWERS.length - 1) * GAP) / 2;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshBasicMaterial({ color: 0x111317 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; scene.add(ground);

  // background city (low, dark) so the race reads against a horizon
  const bg = [];
  for (let i = 0; i < 160; i++) {
    const w = 8 + R() * 14, h = 3 + R() * R() * 14, x = (R() - 0.5) * 620, z = -70 - R() * 300;
    bg.push(ni(new THREE.BoxGeometry(w, h, 8 + R() * 10).translate(x, h / 2, z)));
  }
  scene.add(new THREE.Mesh(mergeGeometries(bg), cityMaterial(s, { base: 0x1b1e24, lit: 0.18, floorH: 1.3, winW: 1.1 })));

  // height lines every 250 ft
  const hl = [];
  for (const ft of [250, 500, 750, 1000, 1250]) hl.push(X0 - 26, ft / 10, -8, -X0 + 26, ft / 10, -8);
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(hl, 3)),
    new THREE.LineBasicMaterial({ color: C.brass, transparent: true, opacity: 0.22 })));
  for (const ft of [250, 500, 750, 1000, 1250]) tag(`${ft.toLocaleString()} ft`, 'brass', new THREE.Vector3(X0 - 26, ft / 10 + 2.5, -8)).el.style.fontSize = '0.6rem';

  const mat = cityMaterial(s, { base: 0x2d3038, lit: 0.34, floorH: 1.2, winW: 0.95 });
  const steel = cityMaterial(s, { base: 0x9aa0aa, lit: 0.6, floorH: 0.9, winW: 0.9, win: 0xfff0c0 });
  const towers = TOWERS.map((d, i) => {
    const g = new THREE.Group(); g.position.x = X0 + i * GAP;
    const mesh = new THREE.Mesh(towerGeo(d.id), mat); mesh.userData.i = i; g.add(mesh);
    if (d.id === 'chrysler') {
      const crown = mesh; void crown;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.55, 19, 8).translate(0, 9.5, 0), steel);
      spire.userData.i = i; spire.position.y = 70; g.add(spire); d.spire = spire;
    }
    if (d.id === 'pine70') {
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 3.6, 8).translate(0, 91.8, 0), new THREE.MeshBasicMaterial({ color: 0xffe6a8 }));
      g.add(lantern); lantern.userData.i = i;
      g.add(new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 6).translate(0, 94.4, 0), mat));
    }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(18, d.h, 16).translate(0, d.h / 2, 0), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.i = i; g.add(hit); d.hit = hit;
    scene.add(g);
    d.g = g;
    d.label = tag(`${d.name.replace(' Building', '')} · ${d.year}`, '', () => new THREE.Vector3(g.position.x, g.position.y + d.h + 6, 0));
    d.label.el.style.fontSize = '0.6rem';
    return d;
  });

  // the Els: steel trestles in the foreground with little trains
  const elMat = new THREE.MeshStandardMaterial({ color: 0x6a5a46, roughness: 0.8 });
  scene.add(new THREE.HemisphereLight(0x8899bb, 0x221a12, 1.2));
  const els = ELS.map((e, j) => {
    const g = new THREE.Group(); g.position.z = e.z;
    const parts = [new THREE.BoxGeometry(560, 1.6, 3.6).translate(0, 8.4, 0)];
    for (let x = -280; x <= 280; x += 14) parts.push(new THREE.BoxGeometry(0.7, 8.4, 0.7).translate(x, 4.2, -1.5), new THREE.BoxGeometry(0.7, 8.4, 0.7).translate(x, 4.2, 1.5), new THREE.BoxGeometry(0.5, 0.5, 3.6).translate(x, 7.4, 0));
    g.add(new THREE.Mesh(mergeGeometries(parts.map(ni)), elMat));
    const train = new THREE.Group();
    for (let c = 0; c < 3; c++) {
      const car = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.4, 2.4).translate(c * 6.8, 10.4, 0), cityMaterial(s, { base: 0x3a2a22, lit: 0.9, floorH: 1.1, winW: 0.9, win: 0xffd28a }));
      train.add(car);
    }
    g.add(train);
    scene.add(g);
    const t = tag(e.name, '', () => new THREE.Vector3(X0 - 40 - j * 4, 10, e.z));
    t.el.style.fontSize = '0.58rem';
    return { ...e, g, train, label: t, dir: j % 2 ? 1 : -1, ph: R() };
  });

  const crownMark = glowSprite(C.brass, 26, 0.9); scene.add(crownMark);
  const crownTag = tag('Tallest in the world', 'brass', () => crownMark.position.clone().add(new THREE.Vector3(0, 14, 0)));

  // UI
  const yearEl = el.querySelector('[data-year]');
  const eventEl = el.querySelector('[data-event]');
  const card = el.querySelector('[data-card]');
  const slider = el.querySelector('[data-yr]');
  let year = 1895, playing = false, sel = null;
  slider.addEventListener('input', () => { year = +slider.value; playing = false; playBtn.setAttribute('aria-pressed', false); });
  const playBtn = el.querySelector('[data-play]');
  playBtn.addEventListener('click', () => { if (year >= 1969.9) year = 1895; playing = !playing; playBtn.setAttribute('aria-pressed', playing); });
  function showCard(d) {
    sel = d;
    if (!d) { card.hidden = true; return; }
    card.hidden = false;
    card.innerHTML = `<button class="close" aria-label="Close" data-close>×</button>
      <span class="eyebrow">${d.year}${d.gone ? ` – ${d.gone}` : ''}${d.ft ? ` · ${d.ft.toLocaleString()} ft` : ''}</span>
      <h4>${d.name}</h4><p class="by">${d.by}</p><p>${d.note}</p><p class="dl"><b>In Deadlock</b> ${d.dl}</p>`;
    card.querySelector('[data-close]').onclick = () => showCard(null);
  }
  s.canvas.addEventListener('click', () => {
    const hit = s.raycast(towers.map((d) => d.g))[0];
    showCard(hit ? towers[hit.object.userData.i] : null);
  });
  s.canvas.style.cursor = 'pointer';

  s.frame.push((dt, t) => {
    if (playing) { year = Math.min(1970, year + dt * 3.2); slider.value = year; if (year >= 1970) { playing = false; playBtn.setAttribute('aria-pressed', false); } }
    yearEl.textContent = Math.floor(year);
    let ev = EVENTS[0][1];
    for (const [y, txt] of EVENTS) if (year >= y) ev = txt;
    eventEl.textContent = ev;
    let best = null, bestH = 0;
    for (const d of towers) {
      const start = d.year - 2.2;
      let g = ease((year - start) / 2.2);
      if (d.id === 'chrysler') g = ease((year - 1928.2) / 1.5);
      if (d.gone && year >= d.gone) g = 1 - ease((year - d.gone) / 0.6);
      const H = d.h;
      d.g.position.y = -(1 - g) * (H + 2);
      let top = g * H;
      if (d.spire) {
        const sp = ease((year - 1929.72) / 0.12);
        d.spire.position.y = lerp(70, 85.6, sp);
        if (g < 0.999) d.spire.position.y = 70;
        top = g > 0.999 ? 85.6 + 19 * sp : g * 86;
      }
      d.label.alpha = g > 0.95 ? (sel && sel !== d ? 0.35 : 0.95) : 0;
      if (top > bestH && g > 0.95) { bestH = top; best = d; }
    }
    if (best) crownMark.position.set(best.g.position.x, bestH + 7, 0);
    crownMark.visible = !!best; crownTag.alpha = best ? 0.9 : 0;
    crownMark.material.opacity = 0.6 + 0.3 * Math.sin(t * 3);
    for (const e of els) {
      const a = 1 - ease((year - e.gone) / 0.8);
      e.g.visible = a > 0.01;
      e.g.position.y = -(1 - a) * 8;
      e.label.alpha = a * 0.8;
      const u = ((e.ph + t * 0.035 * e.dir) % 1 + 1) % 1;
      e.train.position.x = -280 + u * 560;
    }
  });

  const rig = orbitRig(s, { target: new THREE.Vector3(0, 60, 10), radius: 420, theta: 0.12, phi: 1.36, minPhi: 0.9, maxPhi: 1.5, minR: 200, maxR: 900 });
  s.onResize = (w, h) => {
    const tanV = Math.tan(THREE.MathUtils.degToRad(s.camera.fov / 2));
    const a = w / h, narrow = a < 1.1;
    const dW = (narrow ? 120 : 185) / (tanV * a), dH = 98 / tanV;
    rig.tR = rig.radius = Math.max(dW, dH);
    rig.tTheta = rig.theta = narrow ? 0.75 : 0.12;
  };
  s.resize();
}

// ============================================================ 4. EL → ZIP-LINE
export function elZipline(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 46, fog: [120, 720], bg: 0x0b0d10, far: 2000 });
  const scene = s.scene;
  const tag = tagger(s, view);
  const R = rng(1868);
  const LEN = 900;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 3000), new THREE.MeshBasicMaterial({ color: 0x14171b }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // the avenue's two walls of buildings
  const geos = [];
  for (const side of [-1, 1]) {
    for (let z = -LEN / 2; z < LEN / 2;) {
      const d = 14 + R() * 18, h = 18 + R() * R() * 90, w = 20 + R() * 16;
      geos.push(ni(new THREE.BoxGeometry(w, h, d - 1.5).translate(side * (22 + w / 2), h / 2, z + d / 2)));
      // water tank on some roofs
      if (R() < 0.25) {
        geos.push(ni(new THREE.CylinderGeometry(2.2, 2.2, 4, 10).translate(side * (24 + R() * 8), h + 5, z + d / 2)));
        geos.push(ni(new THREE.ConeGeometry(2.6, 2, 10).translate(side * (24 + R() * 0), h + 8, z + d / 2)));
      }
      z += d;
    }
  }
  scene.add(new THREE.Mesh(mergeGeometries(geos), cityMaterial(s, { base: 0x272a31, lit: 0.2, floorH: 4.6, winW: 3.2 })));
  // street lamps
  const lamps = glowPoints(40, 5, 0xffd9a0);
  const lp = lamps.geometry.attributes.position.array;
  for (let i = 0; i < 40; i++) { lp[i * 3] = (i % 2 ? 1 : -1) * 19; lp[i * 3 + 1] = 7; lp[i * 3 + 2] = -LEN / 2 + (i >> 1) * (LEN / 20); }
  scene.add(lamps);

  // the El
  const elMat = new THREE.MeshStandardMaterial({ color: 0x7a6650, roughness: 0.7, metalness: 0.3, emissive: 0x22170c });
  scene.add(new THREE.HemisphereLight(0xb0c0e0, 0x2a1e14, 1.1));
  const dir = new THREE.DirectionalLight(0xffd7a0, 2.2); dir.position.set(30, -10, 60); scene.add(dir);
  const deckParts = [new THREE.BoxGeometry(14, 1.4, LEN).translate(0, 13, 0)];
  for (let z = -LEN / 2; z <= LEN / 2; z += 6) deckParts.push(new THREE.BoxGeometry(15, 0.4, 0.8).translate(0, 14, z));
  const deck = new THREE.Mesh(mergeGeometries(deckParts.map(ni)), elMat); scene.add(deck);
  const posts = new THREE.Group(); scene.add(posts);
  const postGeo = new THREE.BoxGeometry(0.9, 13, 0.9).translate(0, 6.5, 0);
  const beamGeo = new THREE.BoxGeometry(15, 0.9, 0.9).translate(0, 12.4, 0);
  const POSTS = [];
  for (let z = -LEN / 2; z <= LEN / 2; z += 24) {
    const g = new THREE.Group(); g.position.z = z;
    const a = new THREE.Mesh(postGeo, elMat); a.position.x = -6.5;
    const b = new THREE.Mesh(postGeo, elMat); b.position.x = 6.5;
    const c = new THREE.Mesh(beamGeo, elMat);
    g.add(a, b, c); posts.add(g); POSTS.push({ g, a, b, c });
  }
  const train = new THREE.Group();
  const carMat = cityMaterial(s, { base: 0x4a2c22, lit: 0.85, floorH: 1.3, winW: 1.2, win: 0xffd28a });
  for (let c = 0; c < 4; c++) train.add(new THREE.Mesh(new THREE.BoxGeometry(4.2, 4, 15).translate(0, 16.4, c * 16), carMat));
  scene.add(train);

  // the zip-line: one glowing cable sagging between thin poles
  const zipPts = [];
  for (let z = -LEN / 2; z <= LEN / 2; z += 2) {
    const u = ((z + LEN / 2) % 24) / 24;
    zipPts.push(new THREE.Vector3(0, 13 - 1.6 * Math.sin(u * Math.PI), z));
  }
  const zipCurve = new THREE.CatmullRomCurve3(zipPts);
  const zipMat = new THREE.MeshBasicMaterial({ color: C.soul, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(zipCurve, 900, 0.22, 6), zipMat));
  const zipGlow = new THREE.Mesh(new THREE.TubeGeometry(zipCurve, 900, 0.9, 6), new THREE.MeshBasicMaterial({ color: C.soul, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(zipGlow);
  const hero = new THREE.Group();
  const heroBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.4, 4, 10).translate(0, -2.8, 0), new THREE.MeshStandardMaterial({ color: 0x2a2a30, emissive: C.amber, emissiveIntensity: 0.25 }));
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.4, 0.25).translate(0, -0.7, 0), new THREE.MeshBasicMaterial({ color: C.brass }));
  const heroGlow = glowSprite(C.amber, 10, 0.7); heroGlow.position.y = -2.6;
  hero.add(heroBody, hook, heroGlow); scene.add(hero);
  const sparks = glowPoints(80, 1.4, 0xfff0c0);
  const sp = sparks.geometry.attributes.position.array, sc = sparks.geometry.attributes.color.array;
  const sv = new Float32Array(80 * 3), life = new Float32Array(80);
  scene.add(sparks);

  const tagEl = tag('Elevated railway · New York, 1868–1955', 'brass', () => new THREE.Vector3(-7, 22, -40));
  const tagZip = tag('Zip-line · rides you up your lane', '', () => new THREE.Vector3(0, 18, -40));
  tagZip.el.style.borderColor = tagZip.el.style.color = 'var(--soul)';

  let mode = 0, target = 0;
  pressGroup(el, 'data-zip', (v) => { target = +v; });
  const cap = el.querySelector('[data-zipcap]');
  const camTarget = new THREE.Vector3();
  let px = 0;
  view.addEventListener('pointermove', (e) => { const r = view.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; });

  s.frame.push((dt, t) => {
    mode += (target - mode) * (1 - Math.pow(0.03, dt));
    const e = ease(mode);
    // El dissolves into poles
    deck.visible = e < 0.98;
    for (const p of POSTS) {
      p.a.position.x = lerp(-6.5, -0.15, e); p.b.position.x = lerp(6.5, 0.15, e);
      p.a.scale.set(lerp(1, 0.35, e), 1, lerp(1, 0.35, e)); p.b.scale.copy(p.a.scale);
      p.c.scale.set(lerp(1, 0.05, e), 1, 1);
    }
    deck.scale.set(Math.max(0.001, 1 - e), 1, 1);
    zipMat.opacity = e; zipGlow.material.opacity = 0.18 * e;
    // train rumbles along; the hero rides much faster
    const tz = ((t * 22) % (LEN + 80)) - LEN / 2 - 60;
    train.position.z = -tz; train.visible = e < 0.95;
    train.scale.setScalar(Math.max(0.001, 1 - e));
    const hz = LEN / 2 - (((t * 60) % LEN));
    const hp = zipCurve.getPoint(clamp((hz + LEN / 2) / LEN));
    hero.position.copy(hp); hero.visible = e > 0.05; hero.scale.setScalar(Math.max(0.001, e));
    hero.rotation.x = -0.25;
    for (let i = 0; i < 80; i++) {
      life[i] -= dt;
      if (life[i] <= 0 && e > 0.5 && Math.random() < 0.35) {
        life[i] = 0.4 + Math.random() * 0.4;
        sp[i * 3] = hp.x; sp[i * 3 + 1] = hp.y; sp[i * 3 + 2] = hp.z;
        sv[i * 3] = (Math.random() - 0.5) * 8; sv[i * 3 + 1] = Math.random() * 4; sv[i * 3 + 2] = 10 + Math.random() * 14;
      }
      sv[i * 3 + 1] -= 30 * dt;
      sp[i * 3] += sv[i * 3] * dt; sp[i * 3 + 1] += sv[i * 3 + 1] * dt; sp[i * 3 + 2] += sv[i * 3 + 2] * dt;
      const a = Math.max(0, life[i]) * 2 * e;
      sc[i * 3] = a; sc[i * 3 + 1] = a * 0.9; sc[i * 3 + 2] = a * 0.6;
    }
    sparks.geometry.attributes.position.needsUpdate = true; sparks.geometry.attributes.color.needsUpdate = true;
    tagEl.alpha = 1 - e; tagZip.alpha = e;
    // camera: standing in the avenue, looking up the line
    const cx = 14 + px * 5;
    s.camera.position.set(cx, 6 + Math.sin(t * 0.3) * 0.6, 60);
    camTarget.set(px * -6, 15, -120);
    s.camera.lookAt(camTarget);
    if (cap) cap.textContent = mode > 0.5
      ? 'In Deadlock, a glowing line runs above each lane. Hop on and you ride toward the front line far faster than walking.'
      : 'From 1868 until the mid-1950s, trains ran on steel trestles above Manhattan\'s avenues.';
  });
}
