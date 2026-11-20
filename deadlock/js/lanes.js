// Chapter II: the lane map. A living, simplified simulation of the Cursed
// Apple's three lanes: trooper waves, defensive structures, heroes, and the
// "front" where waves meet. Numbers are scaled for readability, not exact.
import { THREE, stage, orbitRig, cityMaterial, setbackTower, rng, glowPoints, glowSprite, C, clamp, lerp, mergeGeometries, reduceMotion } from './lib.js';

export const TEAMS = [
  { id: 0, name: 'Hidden King', short: 'Amber', color: C.amber, css: 'amber', dir: +1 },
  { id: 1, name: 'Archmother', short: 'Sapphire', color: C.sapphire, css: 'sapphire', dir: -1 },
];
export const LANES = [
  { id: 0, name: 'York', color: 0xe6c24a, x: -1 },
  { id: 1, name: 'Broadway', color: 0x6b97ff, x: 0 },
  { id: 2, name: 'Greenwich', color: 0x6fbf73, x: 1 },
];

// Real values from the community wiki (Nov 2026), in meters / seconds / HP.
// A lane is treated as LANE_M meters long; heroes are simplified to one gun.
export const LANE_M = 360;
export const CFG = {
  trooperSpeed: 5.5,            // m/s
  ranged: { hp: 300, dps: 28, range: 25 },
  melee: { hp: 400, dps: 40, range: 4 },
  medic: { hp: 350, dps: 28, range: 30 },
  trooperBounty: 100,           // +2 per minute
  hero: { hp: 650, hpPerMin: 45, dps: 60, dpsPerMin: 6, range: 46, respawn: 10, respawnPerMin: 1.2 },
  guardian: { hp: 5500, dps: 116, range: 34 },
  walker: { hp: 6000, dps: 125, range: 36 },
  baseguard: { hp: 4000, dps: 116, range: 28 },
  shrine: { hp: 5000, dps: 60, range: 30 },
  patron: { hp: 12000, dps: 440, range: 40 },
  backdoorResist: 0.65,         // when no attacking troopers are near
};
export function waveInterval(t) { return t < 1200 ? 30 : t < 2100 ? 25 : 20; }
// Guardian resistance: 50% at 0:00 → 0% at 6:00 → −50% from 12:00. Walker: 65% → −65% by 18:00.
export function guardianResist(t) { return clamp(0.5 - (t / 360) * 0.5, -0.5, 0.5); }
export function walkerResist(t) { return clamp(0.65 - (t / 1080) * 1.3, -0.65, 0.65); }

const NAMES = { guardian: 'Guardian', walker: 'Walker', baseguard: 'Base Guardian', shrine: 'Shrine', patron: 'Patron' };
const ABOUT = {
  guardian: 'First tower in each lane. 5,500 HP, laser of 116 damage per second. It gets weaker over time: 50% damage resistance at the start, none at 6 minutes, and it takes extra damage after 12.',
  walker: 'A giant stone colossus, second in line. 6,000 HP; it can only be hurt once its lane Guardian is gone. Each Walker your team destroys unlocks an extra item slot for all six of you.',
  baseguard: 'A pair guards each lane where it enters the base. 4,000 HP each. Destroy a pair and the Shrines become vulnerable.',
  shrine: 'Two Shrines protect the Patron. 5,000 HP; when one falls, the other doubles to 10,000. Each kill turns the attackers’ troopers into Super Troopers.',
  patron: 'The god each team serves. Invulnerable until both Shrines fall, then 12,000 HP twice: when the first half breaks it re-forms as an orb in a pit that attackers must climb down into.',
};
const M = 1 / LANE_M;

export function lanes(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 32, fog: [500, 1700], bg: 0x0b0d10 });
  const scene = s.scene;
  const rig = orbitRig(s, { radius: 720, theta: 0.5, phi: 0.78, minR: 250, maxR: 1100, auto: 0.025 });
  const R = rng(311);

  // ------------------------------------------------------------ geometry
  const Z = 330, W = 170; // half-length (z) and side-lane half-width (x)
  const amberZ = Z, sappZ = -Z;
  function lanePath(x) {
    const pts = [];
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const z = lerp(amberZ - 40, sappZ + 40, t);
      const bow = Math.pow(Math.sin(Math.PI * t), 0.55);
      pts.push(new THREE.Vector3(x * W * bow, 0, z));
    }
    return new THREE.CatmullRomCurve3(pts);
  }
  const paths = LANES.map((l) => lanePath(l.x));
  const P = (lane, sv) => paths[lane].getPointAt(clamp(sv, 0, 1));

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1600), new THREE.MeshBasicMaterial({ color: 0x0f1216 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // lane roads (dark asphalt with lane-colored center line)
  for (const l of LANES) {
    const pts = paths[l.id].getSpacedPoints(160);
    const road = new THREE.Mesh(ribbonGeo(pts, 34, 0.1), new THREE.MeshBasicMaterial({ color: 0x1c2026 }));
    scene.add(road);
    const line = new THREE.Mesh(ribbonGeo(pts, 1.6, 0.3), new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: 0.55 }));
    scene.add(line);
  }

  // city blocks between and around lanes (kept clear of roads and bases)
  const cityGeos = [];
  const clearOf = (x, z, r) => {
    if (Math.abs(z) > Z - 70 && Math.abs(x) < 120) return false; // bases
    for (const p of paths) {
      for (let i = 0; i <= 40; i++) { const q = p.getPointAt(i / 40); if (Math.hypot(q.x - x, q.z - z) < r + 26) return false; }
    }
    return true;
  };
  for (let z = -Z - 60; z <= Z + 60; z += 28) {
    for (let x = -W - 120; x <= W + 120; x += 28) {
      const jx = x + (R() - 0.5) * 6, jz = z + (R() - 0.5) * 6;
      if (!clearOf(jx, jz, 12)) continue;
      const nearLane = Math.min(...paths.map((p) => { let m = 1e9; for (let i = 0; i <= 24; i++) { const q = p.getPointAt(i / 24); m = Math.min(m, Math.hypot(q.x - jx, q.z - jz)); } return m; }));
      const h = 4 + Math.pow(R(), 2.4) * (nearLane < 60 ? 22 : 55);
      const g = h > 40
        ? setbackTower({ w: 18, d: 18, h, tiers: 3, shrink: 0.72, spire: R() < 0.2 ? 12 : 0 })
        : new THREE.BoxGeometry(18 + R() * 4, h, 18 + R() * 4).translate(0, h / 2, 0);
      g.translate(jx, 0, jz);
      cityGeos.push(g.index ? g.toNonIndexed() : g);
    }
  }
  const city = new THREE.Mesh(mergeGeometries(cityGeos), cityMaterial(s, { base: 0x262a31, lit: 0.22, floorH: 3.2, winW: 2.6 }));
  scene.add(city);

  // ------------------------------------------------------------ lights + materials
  scene.add(new THREE.HemisphereLight(0xd9d2c0, 0x15181d, 1.2));
  const sun = new THREE.DirectionalLight(0xffe7c0, 1.6); sun.position.set(200, 400, 150); scene.add(sun);
  const structMat = (team) => new THREE.MeshStandardMaterial({ color: 0x3b3a3c, roughness: 0.6, metalness: 0.3, emissive: TEAMS[team].color, emissiveIntensity: 0.12 });

  // ------------------------------------------------------------ structures
  // s: position along lane (0 = Hidden King base, 1 = Archmother base)
  const SPOS = { patron: 0.0, shrine: 0.03, baseguard: 0.085, walker: 0.2, guardian: 0.36 };
  const structures = [];
  const pickables = [];
  function addStruct(o) {
    o.maxhp = o.hp; o.alive = true;
    o.bar = hpBar(TEAMS[o.team].color, o.kind === 'patron' ? 46 : 24);
    o.bar.position.copy(o.pos).add(new THREE.Vector3(0, o.h + 10, 0));
    scene.add(o.bar);
    o.mesh.traverse((m) => { m.userData.struct = o; });
    pickables.push(o.mesh);
    structures.push(o);
    return o;
  }
  function guardianMesh(team, scale = 1) {
    const g = new THREE.Group();
    const m = structMat(team);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(7, 9, 6, 8), m); base.position.y = 3; g.add(base);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5.5, 26, 6), m); body.position.y = 19; g.add(body);
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(6, 3, 5, 8), m); brazier.position.y = 34; g.add(brazier);
    const flame = glowSprite(TEAMS[team].color, 22, 0.95); flame.position.y = 39; g.add(flame);
    g.scale.setScalar(scale);
    return g;
  }
  function walkerMesh(team) {
    const g = new THREE.Group();
    const m = structMat(team);
    const f = team === 0 ? -1 : 1; // facing toward the enemy (−z for amber)
    const body = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 30), m); body.position.y = 30; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 12), m); cab.position.set(0, 41, -6 * f); g.add(cab);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8), new THREE.MeshBasicMaterial({ color: TEAMS[team].color })); eye.position.set(0, 41, 0.5 * f); g.add(eye);
    g.userData.legs = [];
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 30, 6), m);
      leg.position.set(lx * 12, 15, lz * 14); leg.rotation.z = lx * 0.18; leg.rotation.x = lz * -0.12; g.add(leg);
      g.userData.legs.push(leg);
    }
    return g;
  }
  for (const team of [0, 1]) {
    const sv = (x) => (team === 0 ? x : 1 - x);
    for (const l of LANES) {
      { // Guardian
        const pos = P(l.id, sv(SPOS.guardian)).clone();
        const mesh = guardianMesh(team); mesh.position.copy(pos); scene.add(mesh);
        addStruct({ kind: 'guardian', team, lane: l.id, s: sv(SPOS.guardian), pos, mesh, h: 40, ...CFG.guardian });
      }
      { // Walker
        const pos = P(l.id, sv(SPOS.walker)).clone();
        const mesh = walkerMesh(team); mesh.position.copy(pos); scene.add(mesh);
        addStruct({ kind: 'walker', team, lane: l.id, s: sv(SPOS.walker), pos, mesh, h: 46, ...CFG.walker });
      }
      for (const side of [-1, 1]) { // Base Guardian pair
        const c = P(l.id, sv(SPOS.baseguard));
        const pos = c.clone().add(new THREE.Vector3(side * 11, 0, 0));
        const mesh = guardianMesh(team, 0.8); mesh.position.copy(pos); scene.add(mesh);
        addStruct({ kind: 'baseguard', team, lane: l.id, s: sv(SPOS.baseguard), pos, mesh, h: 32, ...CFG.baseguard });
      }
    }
    const bz = team === 0 ? amberZ : sappZ, f = team === 0 ? 1 : -1;
    const plinth = new THREE.Mesh(setbackTower({ w: 130, d: 90, h: 10, tiers: 2, shrink: 0.82 }), cityMaterial(s, { base: 0x2a2d33, windows: false }));
    plinth.position.set(0, 0, bz + 24 * f); scene.add(plinth);
    for (const sx of [-1, 1]) { // Shrines
      const pos = new THREE.Vector3(sx * 34, 10, bz - 2 * f);
      const g = new THREE.Group();
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 22, 8), structMat(team)); sm.position.y = 11; g.add(sm);
      const fl = glowSprite(TEAMS[team].color, 26, 0.9); fl.position.y = 26; g.add(fl);
      g.position.copy(pos); scene.add(g);
      addStruct({ kind: 'shrine', team, lane: -1, s: sv(SPOS.shrine), pos, mesh: g, h: 30, ...CFG.shrine });
    }
    { // Patron
      const pos = new THREE.Vector3(0, 10, bz + 26 * f);
      const g = new THREE.Group();
      const ped = new THREE.Mesh(setbackTower({ w: 30, d: 30, h: 24, tiers: 3, shrink: 0.75 }), structMat(team)); g.add(ped);
      const core = glowSprite(TEAMS[team].color, 70, 1); core.position.y = 52; g.add(core);
      const halo = glowSprite(TEAMS[team].color, 220, 0.28); halo.position.y = 50; g.add(halo);
      const pit = new THREE.Mesh(new THREE.RingGeometry(10, 22, 32), new THREE.MeshBasicMaterial({ color: TEAMS[team].color, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
      pit.rotation.x = -Math.PI / 2; pit.position.y = 0.4; pit.visible = false; g.add(pit);
      g.position.copy(pos); scene.add(g);
      addStruct({ kind: 'patron', team, lane: -1, s: sv(SPOS.patron), pos, mesh: g, h: 70, ...CFG.patron, phase: 1, core, halo, ped, pit });
    }
  }

  // swap in the real structure models from the game files (sizes kept readable for the sim)
  import('./models.js').then(async (M) => {
    const REAL = { guardian: ['boss_tier_01_brazier_guardian', 'boss_tier_01_brazier_guardian', 42], walker: ['boss_tier_02_sun_walker', 'boss_tier_02_sun_walker', 56],
      baseguard: ['boss_tier_01_brazier_guardian', 'boss_tier_01_brazier_guardian', 32], shrine: ['shrine_amber', 'shrine_sapphire', 34], patron: ['patron_amber', 'patron_sapphire', 88] };
    const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
    const pm = new THREE.PMREMGenerator(s.renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 1.1;
    const blue = new THREE.Color(0x9fb4ff);
    for (const st of structures) {
      const [a, b, h] = REAL[st.kind];
      const real = await M.heroModel(st.team ? b : a, h);
      const glowCol = new THREE.Color(st.team ? 0x2a4a9a : 0x8a5410);
      real.traverse((o) => {
        if (!o.isMesh || o.material.blending === THREE.AdditiveBlending) return;
        o.material = o.material.clone();
        if (st.team === 1 && a === b) o.material.color.multiply(blue);
        o.material.emissive = glowCol; o.material.emissiveIntensity = 0.55;
        if (o.material.map && !o.material.emissiveMap) o.material.emissiveMap = o.material.map;
      });
      real.rotation.y = st.team === 0 ? Math.PI : 0;
      const keep = st.mesh.children.filter((c) => c.isSprite || c === st.pit || c === st.core || c === st.halo);
      st.mesh.clear(); st.mesh.add(real, ...keep);
      st.mesh.userData.legs = [];
      if (st.kind === 'patron') { st.ped = real; if (st.core) { st.core.position.y = h * 0.62; } }
      if (st.phase === 2) real.visible = false;
      st.mesh.traverse((o) => { o.userData.struct = st; });
      st.h = h;
      st.bar.position.copy(st.pos).add(new THREE.Vector3(0, h + 10, 0));
    }
  }).catch((e) => console.warn('real structures unavailable', e));

  // ------------------------------------------------------------ units
  const MAXT = 900;
  const trooperGeo = new THREE.CapsuleGeometry(3.2, 6, 3, 8); trooperGeo.translate(0, 6.4, 0);
  const trooperMesh = new THREE.InstancedMesh(trooperGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAXT);
  trooperMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  trooperMesh.frustumCulled = false;
  scene.add(trooperMesh);
  const tcol = [new THREE.Color(C.amber), new THREE.Color(C.sapphire)];
  const tcolSuper = [new THREE.Color(0xffe2a8), new THREE.Color(0xbcd0ff)];
  for (let i = 0; i < MAXT; i++) trooperMesh.setColorAt(i, tcol[0]);

  let troopers = [];
  const heroes = [];
  const heroGeo = new THREE.CylinderGeometry(3.4, 3.4, 14, 10); heroGeo.translate(0, 7, 0);
  function makeHero(team, lane) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(heroGeo, new THREE.MeshBasicMaterial({ color: 0xfff8ea })));
    const ring = new THREE.Mesh(new THREE.RingGeometry(6, 8, 24), new THREE.MeshBasicMaterial({ color: TEAMS[team].color, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.5; g.add(ring);
    const glow = glowSprite(TEAMS[team].color, 34, 0.7); glow.position.y = 10; g.add(glow);
    scene.add(g);
    const h = { team, lane, s: team === 0 ? 0.05 : 0.95, hp: 1, maxhp: 1, alive: true, respawn: 0, g, lat: (R() - 0.5) * 16, hero: true, aim: 0 };
    h.bar = hpBar(TEAMS[team].color, 14); scene.add(h.bar);
    heroes.push(h);
    return h;
  }

  // shots + soul orbs (additive point sprites)
  const FX = 800;
  const fx = glowPoints(FX, 9);
  const fxPos = fx.geometry.attributes.position.array, fxCol = fx.geometry.attributes.color.array;
  const fxLife = new Float32Array(FX), fxVel = new Float32Array(FX);
  let fxI = 0;
  scene.add(fx);
  const ctmp = new THREE.Color();
  function spark(p, color, life = 0.25, vy = 0) {
    const i = fxI++ % FX;
    fxPos[i * 3] = p.x; fxPos[i * 3 + 1] = p.y; fxPos[i * 3 + 2] = p.z;
    ctmp.set(color);
    fxCol[i * 3] = ctmp.r; fxCol[i * 3 + 1] = ctmp.g; fxCol[i * 3 + 2] = ctmp.b;
    fxLife[i] = life; fxVel[i] = vy;
  }
  function beam(a, b, color, n = 5) { for (let k = 0; k < n; k++) spark(a.clone().lerp(b, k / (n - 1)), color, 0.16); }

  // front markers: where the two waves meet in each lane
  const fronts = LANES.map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(16, 19, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.6; scene.add(m);
    return { m, s: 0.5 };
  });

  // labels
  const labels = [];
  function label(text, pos, cls) {
    const d = document.createElement('div'); d.className = `tag3d ${cls || ''}`; d.textContent = text; view.appendChild(d);
    labels.push({ d, pos }); return d;
  }
  for (const l of LANES) label(l.name, P(l.id, 0.5).clone().add(new THREE.Vector3(0, 6, 0)), 'brass');
  label('Hidden King', new THREE.Vector3(0, 90, amberZ + 26), 'amber');
  label('Archmother', new THREE.Vector3(0, 90, sappZ - 26), 'sapphire');

  // hover info for structures
  const info = document.createElement('div'); info.className = 'tag3d'; info.hidden = true;
  info.style.cssText = 'white-space:normal;max-width:16rem;text-transform:none;letter-spacing:0;font-family:var(--f-body);font-size:0.85rem;line-height:1.35;transform:translate(12px,12px)';
  view.appendChild(info);
  s.canvas.addEventListener('pointermove', (e) => {
    const hit = s.raycast(pickables)[0];
    const st = hit && hit.object.userData.struct;
    if (!st) { info.hidden = true; return; }
    const r = view.getBoundingClientRect();
    info.hidden = false;
    info.style.left = `${Math.min(e.clientX - r.left, r.width - 270)}px`; info.style.top = `${e.clientY - r.top}px`;
    info.innerHTML = `<b class="${TEAMS[st.team].css}" style="font-family:var(--f-display);text-transform:uppercase;letter-spacing:.05em">${TEAMS[st.team].name} ${NAMES[st.kind]}</b><br>` +
      `${st.alive ? `${Math.max(0, Math.round(st.hp)).toLocaleString()} / ${st.maxhp.toLocaleString()} HP${st.kind === 'patron' ? ` · phase ${st.phase}` : ''}` : 'Destroyed'} · ${vulnerable(st) ? (protectedNow(st) ? '<span class="soul">protected (no enemy troopers near)</span>' : 'can be damaged') : 'invulnerable for now'}<br>${ABOUT[st.kind]}`;
  });
  s.canvas.addEventListener('pointerleave', () => { info.hidden = true; });

  // ------------------------------------------------------------ simulation
  const state = { t: 0, nextWave: 2, speed: 6, over: null, waves: 0 };
  const heroCount = [[2, 2, 2], [2, 2, 2]]; // [team][lane]
  const souls = [0, 0], slots = [0, 0], superT = [false, false];
  const events = [];
  const dir = (team) => (team === 0 ? 1 : -1);
  const minutes = () => state.t / 60;

  function syncHeroes() {
    for (const team of [0, 1]) for (const l of LANES) {
      const have = heroes.filter((h) => h.team === team && h.lane === l.id);
      const want = heroCount[team][l.id];
      for (let i = have.length; i < want; i++) { const h = makeHero(team, l.id); h.hp = h.maxhp = heroHP(); }
      for (let i = want; i < have.length; i++) {
        const h = have[i]; scene.remove(h.g); scene.remove(h.bar);
        heroes.splice(heroes.indexOf(h), 1);
      }
    }
  }
  const heroHP = () => CFG.hero.hp + CFG.hero.hpPerMin * minutes();
  const heroDPS = () => CFG.hero.dps + CFG.hero.dpsPerMin * minutes();
  syncHeroes();

  function spawnWave() {
    state.waves++;
    const late = state.t >= 300;
    const kinds = late ? ['melee', 'ranged', 'ranged', 'medic'] : ['ranged', 'ranged', 'ranged', 'medic'];
    const lateHP = state.t >= 2100 ? 1.5 : 1;
    for (const team of [0, 1]) for (const l of LANES) {
      kinds.forEach((k, i) => {
        const st = CFG[k];
        const sup = superT[team] ? 1.4 : 1;
        troopers.push({ team, lane: l.id, kind: k, s: team === 0 ? 0.1 - i * 0.012 : 0.9 + i * 0.012,
          hp: st.hp * lateHP * sup, maxhp: st.hp * lateHP * sup, dps: st.dps * (superT[team] ? 1.6 : 1), range: st.range * M,
          lat: (i - 1.5) * 4.5, cd: R() * 0.5, sup: superT[team] });
      });
    }
  }
  // Structure rules ----------------------------------------------------
  const mine = (team) => structures.filter((o) => o.team === team && o.alive);
  function vulnerable(st) {
    if (!st.alive) return false;
    const own = mine(st.team);
    if (st.kind === 'walker') return !own.some((o) => o.kind === 'guardian' && o.lane === st.lane);
    if (st.kind === 'baseguard') return !own.some((o) => o.kind === 'walker' && o.lane === st.lane);
    if (st.kind === 'shrine') return LANES.some((l) => !own.some((o) => o.kind === 'baseguard' && o.lane === l.id));
    if (st.kind === 'patron') return !own.some((o) => o.kind === 'shrine');
    return true;
  }
  function protectedNow(st) {
    if (st.kind === 'guardian') return false;
    return !troopers.some((t) => t.team !== st.team && Math.abs(t.s - st.s) < 40 * M && (st.lane === -1 || t.lane === st.lane));
  }
  function resist(st) {
    let r = 0;
    if (st.kind === 'guardian') r = guardianResist(state.t);
    if (st.kind === 'walker') r = walkerResist(state.t);
    if (protectedNow(st)) r = 1 - (1 - r) * (1 - CFG.backdoorResist);
    return r;
  }
  function hitStructure(st, amt, team) {
    if (!vulnerable(st)) return;
    st.hp -= amt * (1 - resist(st));
    if (st.hp > 0) return;
    if (st.kind === 'patron' && st.phase === 1) {
      st.phase = 2; st.hp = st.maxhp;
      st.ped.visible = false; st.pit.visible = true; st.core.position.y = 14; st.core.scale.setScalar(44);
      boom(st, 40);
      events.push(`${TEAMS[st.team].name}'s Patron breaks. Phase two: attackers must enter the pit.`);
      return;
    }
    st.alive = false; st.mesh.visible = false; st.bar.visible = false;
    boom(st, 30);
    const bounty = { guardian: 1375, walker: 3675, baseguard: 1000, shrine: 2000, patron: 0 }[st.kind];
    souls[team] += bounty;
    let extra = '';
    if (st.kind === 'walker') {
      slots[team]++; extra = ` Their team unlocks item slot ${9 + slots[team]}.`;
      for (const o of mine(st.team)) if (o.kind === 'walker') { const f = o.hp / o.maxhp; o.maxhp += 3000; o.hp = f * o.maxhp; o.mesh.scale.multiplyScalar(1.12); }
    }
    if (st.kind === 'shrine') {
      superT[team] = true; extra = ' Their troopers become Super Troopers.';
      for (const o of mine(st.team)) if (o.kind === 'shrine') { const f = o.hp / o.maxhp; o.maxhp = 10000; o.hp = f * o.maxhp; }
    }
    if (st.kind === 'patron') { state.over = team; extra = ' The Ritual is complete.'; }
    events.push(`${TEAMS[team].name} destroyed a ${NAMES[st.kind]}${st.lane >= 0 ? ' in ' + LANES[st.lane].name : ''}.${extra}`);
  }
  function boom(st, n) {
    for (let k = 0; k < n; k++) spark(st.pos.clone().add(new THREE.Vector3((R() - 0.5) * 30, R() * 40, (R() - 0.5) * 30)), TEAMS[st.team].color, 1.2, 20);
  }
  function killTrooper(t, byHeroTeam) {
    if (byHeroTeam === undefined) return;
    // the bounty splits: a ground orb for the killer's team and a floating orb to shoot
    const b = CFG.trooperBounty + 2 * minutes();
    souls[byHeroTeam] += b;
    const p = unitPos(t); p.y += 8;
    spark(p, C.soul, 1.3, 26);
  }
  function killHero(h) {
    h.alive = false; h.respawn = CFG.hero.respawn + CFG.hero.respawnPerMin * minutes();
    h.g.visible = false; h.bar.visible = false;
    souls[1 - h.team] += 200 + 50 * minutes();
    const p = unitPos(h); for (let k = 0; k < 12; k++) spark(p.clone().add(new THREE.Vector3(0, k * 2, 0)), TEAMS[h.team].color, 0.8, 10);
  }

  // nearest enemy ahead (or slightly behind) within range, by preference
  function nearestEnemy(u, range, { troopersOnly = false, heroesOnly = false } = {}) {
    let best = null, bd = 1e9;
    const d = dir(u.team);
    if (!heroesOnly) for (const t of troopers) {
      if (t.team === u.team || t.lane !== u.lane || t.hp <= 0) continue;
      const ds = (t.s - u.s) * d; if (ds > -0.01 && ds < range && ds < bd) { bd = ds; best = t; }
    }
    if (!troopersOnly) for (const h of heroes) {
      if (h.team === u.team || h.lane !== u.lane || !h.alive) continue;
      const ds = (h.s - u.s) * d; if (ds > -0.01 && ds < range && ds < bd) { bd = ds; best = h; }
    }
    return best;
  }
  function structAhead(u, range) {
    const d = dir(u.team);
    let best = null, bd = 1e9;
    for (const st of structures) {
      if (st.team === u.team || !st.alive || (st.lane !== -1 && st.lane !== u.lane)) continue;
      const ds = (st.s - u.s) * d; if (ds > -0.02 && ds < range && ds < bd) { bd = ds; best = st; }
    }
    return best;
  }
  const tmpV = new THREE.Vector3();
  function unitPos(u) {
    const p = P(u.lane, u.s).clone();
    const tan = paths[u.lane].getTangentAt(clamp(u.s, 0, 1));
    p.x += -tan.z * u.lat; p.z += tan.x * u.lat;
    return p;
  }

  function step(dt) {
    if (state.over !== null) return;
    state.t += dt;
    state.nextWave -= dt;
    if (state.nextWave <= 0) { spawnWave(); state.nextWave += waveInterval(state.t); }

    // troopers: fight the nearest enemy unit, else the structure ahead, else walk
    for (const u of troopers) {
      if (u.hp <= 0) continue;
      u.cd -= dt;
      const foe = nearestEnemy(u, u.range);
      const st = foe ? null : structAhead(u, u.range + 6 * M);
      if (foe || st) {
        if (u.cd <= 0) {
          u.cd = 1;
          if (foe) { foe.hp -= foe.hero ? u.dps * 0.6 : u.dps * 1.2; if (foe.hp <= 0) foe.hero ? (foe.alive && killHero(foe)) : 0; }
          else hitStructure(st, u.dps, u.team);
          if (R() < 0.25) spark(unitPos(u).setY(5), TEAMS[u.team].color, 0.12);
        }
      } else u.s += dir(u.team) * CFG.trooperSpeed * M * dt;
    }
    // heroes: hold just behind their wave, farm troopers, trade shots with heroes
    for (const h of heroes) {
      if (!h.alive) {
        h.respawn -= dt;
        if (h.respawn <= 0) { h.alive = true; h.maxhp = h.hp = heroHP(); h.s = h.team === 0 ? 0.05 : 0.95; h.g.visible = true; h.bar.visible = true; }
        continue;
      }
      h.maxhp = Math.max(h.maxhp, heroHP());
      const d = dir(h.team);
      const own = troopers.filter((t) => t.team === h.team && t.lane === h.lane && t.hp > 0);
      let front = own.length ? Math.max(...own.map((t) => t.s * d)) * d : null;
      if (front === null) { // no wave: wait at our furthest standing structure in this lane
        const ss = structures.filter((o) => o.team === h.team && o.alive && o.lane === h.lane);
        front = ss.length ? ss.reduce((a, o) => (o.s * d > a * d ? o.s : a), h.team === 0 ? 0.05 : 0.95) : (h.team === 0 ? 0.05 : 0.95);
      }
      const want = front - d * 5 * M;
      const dps = heroDPS();
      const range = CFG.hero.range * M;
      const tower = structAhead(h, 40 * M);
      const towerTanked = tower && own.some((t) => Math.abs(t.s - tower.s) < 30 * M);
      const enemyHero = nearestEnemy(h, range, { heroesOnly: true });
      const enemyTrooper = nearestEnemy(h, range, { troopersOnly: true });
      h.aim += dt;
      if (enemyHero && (!enemyTrooper || (h.aim % 2) < 0.8)) {
        enemyHero.hp -= dps * dt * 0.7;
        if (enemyHero.hp <= 0 && enemyHero.alive) killHero(enemyHero);
      } else if (enemyTrooper) {
        enemyTrooper.hp -= dps * dt;
        if (enemyTrooper.hp <= 0) { enemyTrooper.dead = true; killTrooper(enemyTrooper, h.team); }
      } else if (tower && towerTanked && ((tower.s - h.s) * d) < range + 10 * M) {
        hitStructure(tower, dps * dt, h.team);
      }
      if (Math.abs(want - h.s) > 0.004) {
        const far = (h.s - want) * d < -0.15;
        const sp = (far ? 18 : 6) * M; // ride the zipline when far behind
        h.s += Math.sign(want - h.s) * Math.min(Math.abs(want - h.s), sp * dt);
      }
      // never stand under an enemy tower without troopers
      if (tower && !towerTanked && ((tower.s - h.s) * d) < tower.range * M) h.s -= d * 8 * M * dt;
    }
    // structures fire at the nearest enemy in range: troopers first
    for (const st of structures) {
      if (!st.alive) continue;
      st.cd = (st.cd || 0) - dt;
      if (st.cd > 0) continue;
      const rng = st.range * M;
      let tgt = null, bd = 1e9;
      for (const t of troopers) {
        if (t.team === st.team || t.hp <= 0 || (st.lane !== -1 && t.lane !== st.lane)) continue;
        const ds = Math.abs(t.s - st.s); if (ds < rng && ds < bd) { bd = ds; tgt = t; }
      }
      if (!tgt) for (const h of heroes) {
        if (h.team === st.team || !h.alive || (st.lane !== -1 && h.lane !== st.lane)) continue;
        const ds = Math.abs(h.s - st.s); if (ds < rng && ds < bd) { bd = ds; tgt = h; }
      }
      if (!tgt) continue;
      st.cd = 0.5;
      tgt.hp -= st.dps * 0.5 * (tgt.hero ? 1 : 1.3);
      if (tgt.hp <= 0 && tgt.hero && tgt.alive) killHero(tgt);
      const a = st.pos.clone(); a.y += st.h * 0.85; const b = unitPos(tgt); b.y = 6;
      beam(a, b, TEAMS[st.team].color);
    }
    // medics heal nearby friendly troopers a little
    for (const u of troopers) if (u.kind === 'medic' && u.hp > 0) for (const v of troopers) {
      if (v.team === u.team && v.lane === u.lane && v.hp > 0 && Math.abs(v.s - u.s) < 20 * M) v.hp = Math.min(v.maxhp, v.hp + 6 * dt);
    }
    troopers = troopers.filter((t) => t.hp > 0 && t.s > -0.03 && t.s < 1.03);

    // fronts: midpoint between the most advanced troopers of each side
    for (const l of LANES) {
      const a = troopers.filter((t) => t.lane === l.id && t.team === 0);
      const b = troopers.filter((t) => t.lane === l.id && t.team === 1);
      let target = fronts[l.id].s;
      if (a.length && b.length) target = (Math.max(...a.map((t) => t.s)) + Math.min(...b.map((t) => t.s))) / 2;
      else if (a.length) target = Math.max(...a.map((t) => t.s));
      else if (b.length) target = Math.min(...b.map((t) => t.s));
      fronts[l.id].s += (target - fronts[l.id].s) * Math.min(1, dt * 2);
    }
  }

  // ------------------------------------------------------------ draw
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  const hud = el.querySelector('[data-hud]');
  const log = el.querySelector('[data-log]');
  let acc = 0, lastEv = 0;
  s.frame.push((dt, t) => {
    acc += dt * state.speed;
    let n = 0;
    while (acc > 1 / 20 && n++ < 80) { step(1 / 20); acc -= 1 / 20; }
    let i = 0;
    for (const u of troopers) {
      if (i >= MAXT) break;
      const p = unitPos(u);
      p.y = Math.abs(Math.sin(state.t * 8 + u.lat)) * 0.8;
      sc.setScalar(u.sup ? 1.35 : u.kind === 'melee' ? 1.15 : 1);
      m4.compose(p, q, sc); trooperMesh.setMatrixAt(i, m4);
      trooperMesh.setColorAt(i, u.kind === 'medic' ? tcolSuper[u.team] : tcol[u.team]); i++;
    }
    sc.setScalar(1);
    trooperMesh.count = i;
    trooperMesh.instanceMatrix.needsUpdate = true;
    if (trooperMesh.instanceColor) trooperMesh.instanceColor.needsUpdate = true;
    for (const h of heroes) {
      if (!h.alive) continue;
      h.g.position.copy(unitPos(h));
      h.bar.position.copy(h.g.position).add(tmpV.set(0, 24, 0));
      setBar(h.bar, h.hp / h.maxhp);
      h.bar.quaternion.copy(s.camera.quaternion);
    }
    for (const st of structures) {
      if (!st.alive) continue;
      setBar(st.bar, st.hp / st.maxhp, vulnerable(st));
      st.bar.quaternion.copy(s.camera.quaternion);
      if (st.kind === 'walker') st.mesh.userData.legs.forEach((lg, k) => { lg.rotation.x = (k < 2 ? 1 : -1) * 0.12 + Math.sin(t * 1.5 + k) * 0.04; });
      if (st.kind === 'patron') st.core.material.opacity = 0.8 + 0.2 * Math.sin(t * 2 + st.team);
    }
    for (const l of LANES) {
      const f = fronts[l.id];
      f.m.position.copy(P(l.id, f.s)).setY(0.6);
      const lean = (f.s - 0.5) * 2;
      f.m.material.color.set(Math.abs(lean) < 0.06 ? 0xe8e2d4 : lean > 0 ? C.amber : C.sapphire);
    }
    for (let k = 0; k < FX; k++) {
      if (fxLife[k] <= 0) { fxPos[k * 3 + 1] = -999; continue; }
      fxLife[k] -= dt; fxPos[k * 3 + 1] += fxVel[k] * dt;
    }
    fx.geometry.attributes.position.needsUpdate = true; fx.geometry.attributes.color.needsUpdate = true;
    for (const lb of labels) {
      const v = lb.pos.clone().project(s.camera);
      lb.d.hidden = v.z > 1;
      lb.d.style.left = `${(v.x * 0.5 + 0.5) * s.width}px`; lb.d.style.top = `${(-v.y * 0.5 + 0.5) * s.height}px`;
    }
    const mm = Math.floor(state.t / 60), ss = Math.floor(state.t % 60);
    const standing = (team) => structures.filter((o) => o.team === team && o.alive && o.kind !== 'patron').length;
    const gr = Math.round(guardianResist(state.t) * 100);
    hud.innerHTML = `<div class="big">${mm}:${String(ss).padStart(2, '0')}</div>next wave ${Math.ceil(state.nextWave)}s · Guardian resist ${gr}%<br>` +
      `<span class="amber">Hidden King</span> ${standing(0)} structures · ${Math.round(souls[0]).toLocaleString()} souls<br>` +
      `<span class="sapphire">Archmother</span> ${standing(1)} structures · ${Math.round(souls[1]).toLocaleString()} souls` +
      (state.over !== null ? `<br><strong class="${TEAMS[state.over].css}">${TEAMS[state.over].name} wins.</strong>` : '');
    if (events.length !== lastEv) { lastEv = events.length; log.textContent = events[events.length - 1]; }
  });

  // ------------------------------------------------------------ controls
  const ctr = el.querySelector('[data-heroes]');
  ctr.innerHTML = LANES.map((l) => `
    <div class="grp"><span class="lbl" style="min-width:5.6em">${l.name}</span>
      ${[0, 1].map((team) => `<span class="grp" style="gap:2px"><button class="${TEAMS[team].css}-b" data-h="${team},${l.id},-1" aria-label="Remove a ${TEAMS[team].name} hero from ${l.name}">−</button><span class="lbl ${TEAMS[team].css}" style="min-width:1.4em;text-align:center" data-c="${team},${l.id}">2</span><button class="${TEAMS[team].css}-b" data-h="${team},${l.id},1" aria-label="Add a ${TEAMS[team].name} hero to ${l.name}">+</button></span>`).join('')}
    </div>`).join('');
  const refreshCounts = () => ctr.querySelectorAll('[data-c]').forEach((c) => { const [tm, l] = c.dataset.c.split(',').map(Number); c.textContent = heroCount[tm][l]; });
  ctr.addEventListener('click', (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    const [team, lane, d] = b.dataset.h.split(',').map(Number);
    heroCount[team][lane] = clamp(heroCount[team][lane] + d, 0, 6);
    refreshCounts(); syncHeroes();
  });
  const spd = el.querySelector('[data-speed]');
  spd.addEventListener('input', () => { state.speed = +spd.value; el.querySelector('[data-speedv]').textContent = `${spd.value}×`; });
  el.querySelector('[data-restart]').addEventListener('click', restart);
  el.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    const p = b.dataset.preset;
    if (p === 'even') { heroCount[0] = [2, 2, 2]; heroCount[1] = [2, 2, 2]; }
    if (p === 'gank') { heroCount[0] = [2, 2, 2]; heroCount[1] = [0, 3, 3]; }
    if (p === 'deathball') { heroCount[0] = [0, 6, 0]; heroCount[1] = [2, 2, 2]; }
    if (p === 'empty') { heroCount[0] = [0, 0, 0]; heroCount[1] = [0, 0, 0]; }
    refreshCounts(); syncHeroes(); restart();
  }));
  function restart() {
    troopers = [];
    for (const st of structures) {
      st.maxhp = CFG[st.kind].hp; st.hp = st.maxhp; st.alive = true; st.mesh.visible = true; st.bar.visible = true;
      if (st.kind === 'walker') st.mesh.scale.setScalar(1);
      if (st.kind === 'patron') { st.phase = 1; st.ped.visible = true; st.pit.visible = false; st.core.position.y = 52; st.core.scale.setScalar(70); }
    }
    for (const h of heroes) { h.alive = true; h.hp = h.maxhp = CFG.hero.hp; h.s = h.team === 0 ? 0.05 : 0.95; h.g.visible = true; h.bar.visible = true; }
    souls[0] = souls[1] = 0; slots[0] = slots[1] = 0; superT[0] = superT[1] = false;
    events.length = 0; lastEv = 0; log.textContent = 'Waves leave both bases every 30 seconds.';
    Object.assign(state, { t: 0, nextWave: 2, over: null, waves: 0 });
  }
  el.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.cam;
    if (v === 'top') { rig.tPhi = 0.26; rig.tR = 860; rig.auto = 0; }
    else if (v === 'street') { rig.tPhi = 1.02; rig.tR = 360; rig.auto = 0; }
    else { rig.tPhi = 0.78; rig.tR = 720; rig.auto = 0.025; }
  }));
  restart();
  window.__lanes = { state, heroes, structures, get troopers() { return troopers; } };
  return { s, state, heroCount };
}

// ---------------------------------------------------------------- helpers
function ribbonGeo(points, width, y) {
  const pos = [], idx = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)], p = points[i];
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
    const nx = (-dz / L) * width / 2, nz = (dx / L) * width / 2;
    pos.push(p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz);
    if (i < points.length - 1) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}
function hpBar(color, w) {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w + 1.2, 3.2), new THREE.MeshBasicMaterial({ color: 0x050607, depthTest: false, transparent: true, opacity: 0.8 }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(w, 2), new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true }));
  fg.position.z = 0.01; bg.renderOrder = 10; fg.renderOrder = 11;
  g.add(bg, fg); g.userData = { fg, w };
  return g;
}
function setBar(bar, f, vulnerable = true) {
  const { fg, w } = bar.userData;
  f = clamp(f, 0, 1);
  fg.scale.x = Math.max(0.001, f);
  fg.position.x = -(w * (1 - f)) / 2;
  fg.material.opacity = vulnerable ? 1 : 0.35;
}
