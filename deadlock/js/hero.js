// Opening plate: the Cursed Apple at night, built on the game's real street
// plan (the in-game minimap: streets, buildings, and the skyline beyond).
import { THREE, stage, cityMaterial, setbackTower, rng, glowPoints, glowSprite, C, reduceMotion, mergeGeometries } from './lib.js';

export function hero(el) {
  const s = stage(el, { fov: 34, fog: [180, 1500], bg: 0x141a26, far: 4000 });
  const R = rng(1920);
  const scene = s.scene;

  // sky: indigo haze at the horizon fading to ink overhead
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x05070d) }, hor: { value: new THREE.Color(0x1a2335) }, warm: { value: new THREE.Color(0x2c2118) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 warm; varying vec3 vP; void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.45)); c += warm * exp(-pow(vP.y * 9.0, 2.0)) * 0.6; gl_FragColor = vec4(c, 1.0); }',
  })));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshBasicMaterial({ color: 0x0c111a }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.5; scene.add(ground);

  const SPAN = 1500; // world units across the minimap
  const mat = cityMaterial(s, { base: 0x22262f, lit: 0.2, floorH: 3.4, winW: 2.6, rim: 0x3a4a70 });
  const backMat = cityMaterial(s, { base: 0x1b1f28, lit: 0.12, floorH: 4, winW: 3, rim: 0x2a3550 });
  const streetMat = new THREE.MeshBasicMaterial({ color: 0x161b24 });
  const noise = (x, y) => 0.5 + 0.5 * Math.sin(x * 0.11 + y * 0.07) * Math.cos(y * 0.13 - x * 0.05);

  const bases = { amber: new THREE.Vector3(0, 0, 640), sapph: new THREE.Vector3(0, 0, -640) };
  fetch('assets/city_mask.bin').then((r) => r.arrayBuffer()).then((buf) => {
    const b = new Uint8Array(buf); const N = b[0], M = b[1]; const m = b.subarray(2);
    const cell = SPAN / N;
    const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= M ? 0 : m[y * N + x]);
    const P = (x, y) => [(x + 0.5 - N / 2) * cell, (y + 0.5 - M / 2) * cell];
    const city = [], back = [], street = [];
    for (let y = 0; y < M; y++) for (let x = 0; x < N; x++) {
      const v = at(x, y); const [wx, wz] = P(x, y);
      if (v === 1) { street.push(new THREE.PlaneGeometry(cell, cell).rotateX(-Math.PI / 2).translate(wx, 0.05, wz)); continue; }
      if (v === 2) {
        const h = 10 + Math.pow(noise(x, y), 1.6) * 55 + R() * 6;
        city.push(new THREE.BoxGeometry(cell * 1.02, h, cell * 1.02).translate(wx, h / 2, wz).toNonIndexed());
        continue;
      }
      // outside the playable city: a ring of skyline towers hugging its edge
      let near = 99;
      for (let r = 1; r <= 7 && near === 99; r++) for (let k = -r; k <= r; k++) {
        if (at(x + k, y - r) || at(x + k, y + r) || at(x - r, y + k) || at(x + r, y + k)) { near = r; break; }
      }
      if (near > 7 || (x + y) % 2 || R() < 0.25) continue;
      const tall = 30 + Math.pow(R(), 1.8) * (60 + 160 * (1 - near / 8));
      const g = tall > 90 ? setbackTower({ w: cell * 1.7, d: cell * 1.7, h: tall, tiers: 3 + Math.floor(R() * 2), shrink: 0.72, spire: R() < 0.3 ? tall * 0.2 : 0, crown: R() < 0.2 })
        : new THREE.BoxGeometry(cell * 1.8, tall, cell * 1.8).translate(0, tall / 2, 0);
      g.translate(wx, 0, wz); back.push(g.index ? g.toNonIndexed() : g);
    }
    scene.add(new THREE.Mesh(mergeGeometries(city), mat));
    scene.add(new THREE.Mesh(mergeGeometries(back), backMat));
    scene.add(new THREE.Mesh(mergeGeometries(street), streetMat));
    // the two bases sit at the minimap's bottom and top tips
    const [ax, az] = P(450 / 1024 * N, 930 / 1024 * M), [sx, sz] = P(575 / 1024 * N, 90 / 1024 * M);
    bases.amber.set(ax, 0, az); bases.sapph.set(sx, 0, sz);
    placeBeacons();
    s.renderOnce();
  });

  const beacons = [];
  function placeBeacons() {
    for (const [p, col] of [[bases.amber, C.amber], [bases.sapph, C.sapphire]]) {
      const g = new THREE.Group(); g.position.copy(p);
      const core = glowSprite(col, 110, 0.9); core.position.y = 70; g.add(core);
      const halo = glowSprite(col, 420, 0.25); halo.position.y = 60; g.add(halo);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 6, 900, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.position.y = 450; g.add(beam);
      scene.add(g); beacons.push({ core });
    }
  }

  // souls drifting up
  const N2 = 900;
  const souls = glowPoints(N2, 5);
  const pos = souls.geometry.attributes.position.array, col = souls.geometry.attributes.color.array;
  const sp = new Float32Array(N2), sc = new THREE.Color(C.soul);
  for (let i = 0; i < N2; i++) {
    pos[i * 3] = (R() - 0.5) * SPAN * 0.8; pos[i * 3 + 1] = R() * 300; pos[i * 3 + 2] = (R() - 0.5) * SPAN * 0.8;
    sp[i] = 4 + R() * 10; const k = 0.3 + R() * 0.7; col[i * 3] = sc.r * k; col[i * 3 + 1] = sc.g * k; col[i * 3 + 2] = sc.b * k;
  }
  scene.add(souls);
  const moon = glowSprite(0xdcd4c0, 260, 0.35); moon.position.set(-900, 700, -1400); scene.add(moon);

  // camera: a slow glide from the Hidden King's end toward the Archmother's
  const look = new THREE.Vector3();
  let px = 0, py = 0;
  el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; });
  s.frame.push((dt, t) => {
    const tt = reduceMotion ? 8 : t;
    const k = 0.5 - 0.5 * Math.cos(tt * 0.02);
    const z = 380 - 700 * k;
    s.camera.position.set(40 + px * 120, 230 - py * 60 + Math.sin(tt * 0.2) * 10, z + 230);
    look.set(-10 + px * 80, 0, z - 260);
    s.camera.lookAt(look);
    for (let i = 0; i < N2; i++) { pos[i * 3 + 1] += sp[i] * dt; if (pos[i * 3 + 1] > 320) pos[i * 3 + 1] = 0; }
    souls.geometry.attributes.position.needsUpdate = true;
    beacons.forEach((b, i) => { b.core.material.opacity = 0.75 + 0.2 * Math.sin(t * 1.3 + i * 2); });
  });
  return s;
}
