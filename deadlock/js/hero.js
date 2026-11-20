// Opening plate: a procedural night city on a long island, two glowing
// bases at either end, souls drifting up between the towers.
import { THREE, stage, cityMaterial, setbackTower, rng, glowPoints, glowSprite, C, reduceMotion, mergeGeometries } from './lib.js';

export function hero(el) {
  const s = stage(el, { fov: 34, fog: [160, 1350], bg: 0x141a26, far: 4000 });
  const R = rng(1920);
  const scene = s.scene;

  // sky: indigo haze at the horizon fading to ink overhead, a warm glow over midtown
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x05070d) }, hor: { value: new THREE.Color(0x1a2335) }, warm: { value: new THREE.Color(0x2c2118) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 warm; varying vec3 vP; void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.45)); c += warm * exp(-pow(vP.y * 9.0, 2.0)) * 0.6; gl_FragColor = vec4(c, 1.0); }',
  }));
  scene.add(sky);
  // ground + streets
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshBasicMaterial({ color: 0x0d1014 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // the island: long north–south, Manhattan-ish taper
  const LEN = 1400, WID = 300, BLOCK = 46, STREET = 12;
  const islandW = (z) => WID * (0.62 + 0.38 * Math.cos((z / LEN) * Math.PI * 0.9)) ;
  const mat = cityMaterial(s, { base: 0x22262f, lit: 0.2, floorH: 3.4, winW: 2.6, rim: 0x3a4a70 });
  const geos = [];
  const tmp = new THREE.Matrix4();
  for (let z = -LEN / 2; z < LEN / 2; z += BLOCK + STREET) {
    const w = islandW(z);
    for (let x = -w / 2; x < w / 2; x += BLOCK + STREET) {
      // avenues kept clear for the three lanes
      const lanes = [-0.32 * w, 0, 0.32 * w];
      if (lanes.some((lx) => Math.abs(x + BLOCK / 2 - lx) < 18)) continue;
      const mid = 1 - Math.abs(z) / (LEN / 2);
      const n = 1 + Math.floor(R() * 3);
      for (let k = 0; k < n; k++) {
        const bw = BLOCK / n - 2;
        const hgt = 10 + Math.pow(R(), 2.4) * (40 + 220 * mid * mid) ;
        const tall = hgt > 90;
        const g = tall
          ? setbackTower({ w: bw, d: BLOCK - 4, h: hgt, tiers: 3 + Math.floor(R() * 3), shrink: 0.7 + R() * 0.12, spire: R() < 0.3 ? hgt * 0.25 : 0, crown: R() < 0.25 })
          : new THREE.BoxGeometry(bw, hgt, BLOCK - 4 - R() * 10).translate(0, hgt / 2, 0);
        tmp.makeTranslation(x + k * (bw + 2) + bw / 2, 0, z + BLOCK / 2);
        g.applyMatrix4(tmp);
        geos.push(g.index ? g.toNonIndexed() : g);
      }
    }
  }
  const city = new THREE.Mesh(mergeGeometries(geos), mat);
  scene.add(city);

  // water around island
  const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0x0c111a }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.5; scene.add(water);
  const shoreGeo = new THREE.ShapeGeometry((() => {
    const sh = new THREE.Shape();
    const pts = [];
    for (let i = 0; i <= 60; i++) { const z = -LEN / 2 - 30 + (i / 60) * (LEN + 60); pts.push([islandW(z) / 2 + 22, z]); }
    sh.moveTo(pts[0][0], pts[0][1]);
    pts.forEach((p) => sh.lineTo(p[0], p[1]));
    for (let i = pts.length - 1; i >= 0; i--) sh.lineTo(-pts[i][0], pts[i][1]);
    return sh;
  })());
  const shore = new THREE.Mesh(shoreGeo, new THREE.MeshBasicMaterial({ color: 0x111419, side: THREE.DoubleSide }));
  shore.rotation.x = Math.PI / 2; shore.position.y = 0.05; scene.add(shore);
  ground.visible = false;

  // the three lanes, faintly lit
  const laneMat = new THREE.MeshBasicMaterial({ color: C.brass, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const f of [-0.32, 0, 0.32]) {
    const pts = [];
    for (let i = 0; i <= 80; i++) { const z = -LEN / 2 + (i / 80) * LEN; pts.push(new THREE.Vector3(f * islandW(z), 0.3, z)); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 1.1, 4, false);
    scene.add(new THREE.Mesh(g, laneMat));
  }

  // bases: amber south, sapphire north
  const beacons = [];
  for (const [z, col] of [[LEN / 2 - 10, C.amber], [-LEN / 2 + 10, C.sapphire]]) {
    const g = new THREE.Group(); g.position.set(0, 0, z);
    const plinth = new THREE.Mesh(setbackTower({ w: 60, d: 60, h: 40, tiers: 3, shrink: 0.7 }), cityMaterial(s, { base: 0x22252b, windows: false }));
    g.add(plinth);
    const core = glowSprite(col, 120, 0.9); core.position.y = 70; g.add(core);
    const halo = glowSprite(col, 420, 0.25); halo.position.y = 60; g.add(halo);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(3, 6, 900, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 450; g.add(beam);
    scene.add(g); beacons.push({ core, halo });
  }

  // souls drifting up
  const N = 900;
  const souls = glowPoints(N, 5);
  const pos = souls.geometry.attributes.position.array;
  const col = souls.geometry.attributes.color.array;
  const sp = new Float32Array(N);
  const sc = new THREE.Color(C.soul);
  for (let i = 0; i < N; i++) {
    const z = (R() - 0.5) * LEN; const w = islandW(z);
    pos[i * 3] = (R() - 0.5) * w; pos[i * 3 + 1] = R() * 300; pos[i * 3 + 2] = z;
    sp[i] = 4 + R() * 10;
    const b = 0.3 + R() * 0.7; col[i * 3] = sc.r * b; col[i * 3 + 1] = sc.g * b; col[i * 3 + 2] = sc.b * b;
  }
  scene.add(souls);

  // moon-ish disc
  const moon = glowSprite(0xdcd4c0, 260, 0.35); moon.position.set(-900, 700, -1400); scene.add(moon);

  // camera: a slow glide up the central avenue with pointer parallax
  const look = new THREE.Vector3();
  let px = 0, py = 0;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5;
  });
  s.frame.push((dt, t) => {
    const tt = reduceMotion ? 8 : t;
    const z = 420 - 760 * (0.5 - 0.5 * Math.cos(tt * 0.018));
    const cx = 60 + px * 120, cy = 120 - py * 60 + Math.sin(tt * 0.2) * 10;
    s.camera.position.set(cx, cy, z + 260);
    look.set(-20 + px * 80, 40, z - 200);
    s.camera.lookAt(look);
    for (let i = 0; i < N; i++) {
      pos[i * 3 + 1] += sp[i] * dt;
      if (pos[i * 3 + 1] > 320) pos[i * 3 + 1] = 0;
    }
    souls.geometry.attributes.position.needsUpdate = true;
    beacons.forEach((b, i) => { b.core.material.opacity = 0.75 + 0.2 * Math.sin(t * 1.3 + i * 2); });
  });
  return s;
}
