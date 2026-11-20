// Real Deadlock models, exported from the game files with Source 2 Viewer and
// compressed with gltf-transform (meshopt + WebP). © Valve; used for commentary.
import { THREE, stage, orbitRig, glowSprite, C, reduceMotion } from './lib.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
export function loadModel(name) {
  if (!cache.has(name)) cache.set(name, loader.loadAsync(`assets/models/${name}.glb`).then((g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) {
        // Source materials sometimes export as fully transparent or unlit; keep them solid and lit
        if (m.transparent && m.opacity >= 1 && !m.alphaMap) m.transparent = false;
        m.side = THREE.FrontSide;
        if (m.map) m.map.anisotropy = 4;
        if (/beam|glow|scribble|antler|light_|fx/i.test(m.name)) { // effect cards: glow, don't occlude
          m.transparent = true; m.blending = THREE.AdditiveBlending; m.depthWrite = false;
          m.opacity = /beam/i.test(m.name) ? 0.25 : 0.7; m.alphaTest = 0; o.castShadow = false;
        }
      }
    });
    return g.scene;
  }));
  return cache.get(name).then((s) => { const c = skClone(s); c.traverse((o) => { if (o.isSkinnedMesh) o.frustumCulled = false; }); return c; });
}

/** Size info in the model's own units (Source units ≈ inches). */
export function bounds(obj) {
  const b = new THREE.Box3().setFromObject(obj);
  return { box: b, size: b.getSize(new THREE.Vector3()), center: b.getCenter(new THREE.Vector3()) };
}
/** Sit the model on y=0, centered on x/z; optionally scale to a height. */
export function ground(obj, height) {
  const { box, center } = bounds(obj);
  const g = new THREE.Group();
  obj.position.set(-center.x, -box.min.y, -center.z);
  g.add(obj);
  if (height) g.scale.setScalar(height / Math.max(1e-3, box.max.y - box.min.y));
  return g;
}

export function lightRig(s, { env = true, warm = 0xffe2b8, cool = 0x8fa8e0 } = {}) {
  if (env) {
    const pmrem = new THREE.PMREMGenerator(s.renderer);
    s.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    s.scene.environmentIntensity = 0.35;
  }
  s.scene.add(new THREE.HemisphereLight(0xcfd6e6, 0x1a1612, 0.6));
  const key = new THREE.DirectionalLight(warm, 2.4); key.position.set(40, 70, 50);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004;
  const sc = key.shadow.camera; sc.left = sc.bottom = -90; sc.right = sc.top = 90; sc.near = 1; sc.far = 400;
  s.scene.add(key);
  const rim = new THREE.DirectionalLight(cool, 1.6); rim.position.set(-6, 4, -6); s.scene.add(rim);
  s.renderer.shadowMap.enabled = true; s.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return { key, rim };
}

// ------------------------------------------------------------ the structures
const LINEUP = [
  { m: 'amber_trooper_01', name: 'Trooper', team: 0, note: 'The soldiers that march down every lane, four at a time, every 30 seconds.' },
  { m: 'boss_tier_01_brazier_guardian', name: 'Guardian', team: 0, note: 'First tower in each lane. 5,500 HP; the brazier on its head can be shot.' },
  { m: 'boss_tier_02_sun_walker', name: 'Walker', team: 0, note: 'Second in line. It stomps, fires rockets, and grows when a sibling falls.' },
  { m: 'shrine_amber', name: 'Shrine', team: 0, note: 'Two guard each Patron. Breaking one turns the attackers’ soldiers into Super Troopers.' },
  { m: 'patron_amber', name: 'The Hidden King', team: 0, note: 'The antlered god of the downtown team, bound to a burning wicker figure.' },
  { m: 'midboss', name: 'Mid Boss', team: -1, note: 'Lives in a sewer under Broadway. Kill it for Rejuvenators: three minutes of instant revives.' },
  { m: 'patron_sapphire', name: 'The Archmother', team: 1, note: 'The uptown god, wearing a cracked mask that looks a lot like Liberty’s face.' },
  { m: 'shrine_sapphire', name: 'Shrine', team: 1, note: 'The Archmother’s shrines, in blue flame.' },
];

export function structures(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 30, fog: [260, 1100], bg: 0x0d1016, far: 4000, near: 0.1 });
  lightRig(s);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(900, 64), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.scene.add(floor);
  const rig = orbitRig(s, { radius: 150, theta: 0.25, phi: 1.25, minPhi: 0.5, maxPhi: 1.5, minR: 5, maxR: 400, auto: 0.03 });
  const info = el.querySelector('[data-info]');
  const status = el.querySelector('[data-status]');
  const items = [];
  let x = 0;
  status.textContent = 'Loading models from the game…';
  Promise.all(LINEUP.map((d) => loadModel(d.m))).then((objs) => {
    objs.forEach((o, i) => {
      const g = ground(o); // native game units: everything to true relative scale
      const { size } = bounds(g);
      const w = Math.max(size.x, size.z);
      x += i ? w / 2 + 7 : 0;
      g.position.x = x; x += w / 2;
      s.scene.add(g);
      const d = LINEUP[i];
      const tag = document.createElement('div'); tag.className = `tag3d ${d.team === 0 ? 'amber' : d.team === 1 ? 'sapphire' : 'brass'}`; tag.textContent = d.name; view.appendChild(tag);
      items.push({ g, d, tag, top: size.y });
    });
    const mid = x / 2;
    items.forEach((it) => { it.g.position.x -= mid; });
    rig.target.set(0, 14, 0);
    status.textContent = '';
    select(4);
  }).catch((e) => { status.textContent = `Couldn’t load the models (${e.message}).`; });

  function select(i) {
    const it = items[i]; if (!it) return;
    info.innerHTML = `<b class="${it.d.team === 0 ? 'amber' : it.d.team === 1 ? 'sapphire' : 'brass'}">${it.d.name}</b> ${it.d.note}`;
    rig.target.set(it.g.position.x, it.top * 0.45, 0);
    rig.tR = Math.max(9, it.top * 2.4);
  }
  s.canvas.addEventListener('click', () => {
    if (rig.moved > 6) return;
    const hit = s.raycast(items.map((i) => i.g))[0]; if (!hit) return;
    let o = hit.object; const idx = items.findIndex((it) => { let p = o; while (p) { if (p === it.g) return true; p = p.parent; } return false; });
    if (idx >= 0) select(idx);
  });
  el.querySelector('[data-all]')?.addEventListener('click', () => { rig.target.set(0, 14, 0); rig.tR = 150; info.textContent = 'Click any of them.'; });
  const v = new THREE.Vector3();
  s.frame.push(() => {
    for (const it of items) {
      v.set(it.g.position.x, it.top + 1.5, 0).project(s.camera);
      it.tag.hidden = v.z > 1;
      it.tag.style.left = `${(v.x * 0.5 + 0.5) * s.width}px`; it.tag.style.top = `${(-v.y * 0.5 + 0.5) * s.height}px`;
    }
  });
}

// ------------------------------------------------------------ landmarks
const LANDMARKS = [
  { m: ['building_oracle_01', 'building_oracle_tower_01'], name: 'The New York Oracle', real: 'Times Tower, 1904', wiki: 'https://en.wikipedia.org/wiki/One_Times_Square',
    note: 'The newspaper building on Broadway. Its real model is the New York Times’ tower on Times Square, with prophecy in place of news.' },
  { m: ['times_square_wedge_building'], name: 'The Times Square wedge', real: 'Times Square', wiki: 'https://en.wikipedia.org/wiki/Times_Square',
    note: 'A skyline building shaped by Broadway’s diagonal, the street older than the grid.' },
  { m: ['arch_stock_exchance_uptown_bull_01'], name: 'The bull', real: 'Charging Bull, 1989', wiki: 'https://en.wikipedia.org/wiki/Charging_Bull',
    note: 'Outside the game’s stock exchange. The real one arrived decades after this city’s era.' },
  { m: ['arch_fairfax_atlas_statue_01'], name: 'Atlas', real: 'Atlas, Rockefeller Center, 1937', wiki: 'https://en.wikipedia.org/wiki/Atlas_(statue)',
    note: 'In the Plaza District, Atlas holds up a glowing sphere instead of the heavens.' },
  { m: ['statue_of_liberty_01'], name: 'Liberty', real: 'Statue of Liberty, 1886', wiki: 'https://en.wikipedia.org/wiki/Statue_of_Liberty',
    note: 'A low-detail backdrop model, seen across the water behind the York docks.' },
];

export function landmarks(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 30, fog: [2000, 6000], bg: 0x0d1016, far: 8000, near: 0.1 });
  const lr = lightRig(s);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3000, 64), new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.scene.add(floor);
  const rig = orbitRig(s, { radius: 1500, theta: 0.6, phi: 1.2, minPhi: 0.4, maxPhi: 1.45, minR: 2, maxR: 2000, auto: reduceMotion ? 0 : 0.12 });
  const info = el.querySelector('[data-info]');
  const picker = el.querySelector('[data-pick]');
  const status = el.querySelector('[data-status]');
  picker.innerHTML = LANDMARKS.map((l, i) => `<button data-i="${i}" aria-pressed="${i === 0}">${l.name}</button>`).join('');
  let current = null, token = 0;
  async function show(i) {
    const L = LANDMARKS[i], my = ++token;
    picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
    info.innerHTML = `<b class="brass">${L.name}</b> ${L.note} <a href="${L.wiki}">${L.real} on Wikipedia ↗</a>`;
    status.textContent = 'Loading…';
    const parts = await Promise.all(L.m.map(loadModel));
    if (my !== token) return;
    const grp = new THREE.Group(); parts.forEach((p) => grp.add(p));
    const g = ground(grp);
    if (current) s.scene.remove(current);
    current = g; s.scene.add(g);
    const { size } = bounds(g);
    const r = Math.max(size.x, size.y, size.z);
    rig.target.set(0, size.y * 0.45, 0); rig.tR = r * 1.9; rig.radius = r * 1.9;
    s.camera.near = r / 400; s.camera.updateProjectionMatrix();
    const sc = lr.key.shadow.camera; sc.left = sc.bottom = -r; sc.right = sc.top = r; sc.far = r * 6; sc.updateProjectionMatrix();
    lr.key.position.set(r * 0.8, r * 1.4, r); s.fogUniforms.fogNear.value = r * 8; s.fogUniforms.fogFar.value = r * 30; if (s.scene.fog) { s.scene.fog.near = r * 8; s.scene.fog.far = r * 30; }
    status.textContent = '';
  }
  picker.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(+b.dataset.i); });
  show(0);
}

// ------------------------------------------------------------ one hero, for scenes
export async function heroModel(name, height) {
  return ground(await loadModel(name), height);
}
