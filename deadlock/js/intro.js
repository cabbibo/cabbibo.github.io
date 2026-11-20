// Chapter I: one street seen two ways — the MOBA's commander view and the
// shooter's over-the-shoulder view. A slider blends the camera between them.
import { THREE, stage, cityMaterial, setbackTower, rng, glowSprite, glowPoints, C, lerp, clamp, smooth, mergeGeometries, reduceMotion } from './lib.js';

export function cameras(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 40, fog: [160, 700], bg: 0x0b0d10 });
  const scene = s.scene;
  const R = rng(55);

  scene.add(new THREE.HemisphereLight(0xe6dcc6, 0x14171c, 1.3));
  const key = new THREE.DirectionalLight(0xffe2b0, 1.5); key.position.set(60, 120, 40); scene.add(key);

  // street running along -z
  const road = new THREE.Mesh(new THREE.PlaneGeometry(46, 700), new THREE.MeshBasicMaterial({ color: 0x1c2026 }));
  road.rotation.x = -Math.PI / 2; road.position.z = -200; scene.add(road);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(800, 900), new THREE.MeshBasicMaterial({ color: 0x121519 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, -0.05, -200); scene.add(walk);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 700), new THREE.MeshBasicMaterial({ color: C.brass, transparent: true, opacity: 0.5 }));
  line.rotation.x = -Math.PI / 2; line.position.set(0, 0.05, -200); scene.add(line);

  const geos = [];
  for (const side of [-1, 1]) {
    for (let z = 60; z > -560; z -= 26 + R() * 10) {
      const h = 14 + Math.pow(R(), 1.8) * 90;
      const w = 22 + R() * 10;
      const g = h > 60 ? setbackTower({ w, d: 22, h, tiers: 3, shrink: 0.74, spire: R() < 0.3 ? 14 : 0 })
        : new THREE.BoxGeometry(w, h, 22).translate(0, h / 2, 0);
      g.translate(side * (23 + 4 + w / 2), 0, z);
      geos.push(g.index ? g.toNonIndexed() : g);
      // fire escapes as thin slabs
      if (h < 60 && R() < 0.6) for (let y = 8; y < h - 4; y += 7) geos.push(new THREE.BoxGeometry(1.2, 0.5, 8).translate(side * 26.6, y, z + 3).toNonIndexed());
    }
  }
  scene.add(new THREE.Mesh(mergeGeometries(geos), cityMaterial(s, { base: 0x2a2e36, lit: 0.26, floorH: 3.6, winW: 3 })));

  // figures
  const body = (color, h = 1) => {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.3 * h, 2.2 * h, 4, 10), m); torso.position.y = 3.8 * h; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.95 * h, 14, 10), m); head.position.y = 6.3 * h; g.add(head);
    for (const sx of [-0.55, 0.55]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.45 * h, 1.6 * h, 3, 8), m); leg.position.set(sx * h, 1.3 * h, 0); g.add(leg); }
    return g;
  };
  const hero = body(0xe8e2d4, 1.15);
  const coat = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.4, 14, 1, true), new THREE.MeshStandardMaterial({ color: 0x4a3a2a, side: THREE.DoubleSide })); coat.position.y = 3.2; hero.add(coat);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 3.2), new THREE.MeshStandardMaterial({ color: 0x8b8378, metalness: 0.8, roughness: 0.3 })); gun.position.set(1.4, 4.8, -1.8); hero.add(gun);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.9, 32), new THREE.MeshBasicMaterial({ color: C.amber, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; hero.add(ring);
  scene.add(hero);

  const troopers = [];
  for (let i = 0; i < 4; i++) {
    const t = body(C.sapphire, 0.7); t.position.set((i - 1.5) * 5, 0, -70 - (i % 2) * 6); scene.add(t);
    troopers.push({ g: t, hp: 1, base: t.position.clone() });
  }
  const allies = [];
  for (let i = 0; i < 4; i++) {
    const t = body(C.amber, 0.7); t.position.set((i - 1.5) * 5, 0, -40 - (i % 2) * 6); scene.add(t); allies.push(t);
  }
  const enemy = body(0xbcd0ff, 1.15); enemy.position.set(10, 0, -96); scene.add(enemy);
  const eRing = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.9, 32), new THREE.MeshBasicMaterial({ color: C.sapphire, side: THREE.DoubleSide })); eRing.rotation.x = -Math.PI / 2; eRing.position.y = 0.2; enemy.add(eRing);

  // click marker for the strategy view
  const marker = new THREE.Mesh(new THREE.RingGeometry(2, 2.6, 32), new THREE.MeshBasicMaterial({ color: 0x9cffb0, transparent: true, side: THREE.DoubleSide }));
  marker.rotation.x = -Math.PI / 2; marker.position.y = 0.3; scene.add(marker);
  // tracers
  const fx = glowPoints(200, 3); scene.add(fx);
  const fxPos = fx.geometry.attributes.position.array; const fxLife = new Float32Array(200); let fxI = 0;
  const shot = (a, b) => { for (let k = 0; k < 10; k++) { const i = fxI++ % 200; const p = a.clone().lerp(b, k / 9); fxPos.set([p.x, p.y, p.z], i * 3); fxLife[i] = 0.12; } };

  // crosshair overlay
  const cross = document.createElement('div');
  cross.style.cssText = 'position:absolute;left:50%;top:46%;width:22px;height:22px;transform:translate(-50%,-50%);pointer-events:none;border:2px solid var(--paper);border-radius:50%;opacity:0';
  cross.innerHTML = '<div style="position:absolute;left:50%;top:50%;width:3px;height:3px;background:var(--paper);transform:translate(-50%,-50%);border-radius:50%"></div>';
  view.appendChild(cross);
  const cursor = document.createElement('div');
  cursor.style.cssText = 'position:absolute;pointer-events:none;width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:16px solid var(--paper);transform:rotate(-28deg);opacity:0;filter:drop-shadow(0 1px 2px #000)';
  view.appendChild(cursor);

  // slider + buttons
  const slider = el.querySelector('#cam-r');
  const cap = el.querySelector('[data-camcap]');
  let k = 0, target = 0;
  const caps = [
    'From above, you point at the ground and your hero walks there. This is how Dota 2 and League of Legends are played.',
    'In between: the same soldiers, the same street.',
    'From behind the shoulder, you aim with your own hand. If your crosshair is off, you miss. This is Deadlock.',
  ];
  function set(v, fromSlider) {
    target = v; if (!fromSlider) slider.value = v;
    el.querySelectorAll('[data-cam]').forEach((b) => b.setAttribute('aria-pressed', String(Math.round(v) === +b.dataset.cam && (v === 0 || v === 1))));
    cap.textContent = caps[v < 0.2 ? 0 : v > 0.8 ? 2 : 1];
  }
  slider.addEventListener('input', () => set(+slider.value, true));
  el.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => set(+b.dataset.cam)));

  const topPos = new THREE.Vector3(0, 150, -24), topLook = new THREE.Vector3(0, 0, -50);
  const shPos = new THREE.Vector3(7, 10.5, 17), shLook = new THREE.Vector3(2, 6, -80);
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let walkT = 0, from = new THREE.Vector3(), to = new THREE.Vector3(), cool = 0;
  hero.position.set(0, 0, -6);
  s.frame.push((dt, t) => {
    k += (target - k) * (1 - Math.pow(0.02, dt));
    const e = smooth(clamp(k));
    // hero offset feeds both poses so the camera follows
    const hp = hero.position;
    camPos.copy(topPos).lerp(shPos.clone().add(new THREE.Vector3(hp.x, 0, hp.z + 6)), e);
    camLook.copy(topLook).lerp(shLook.clone().add(new THREE.Vector3(hp.x, 0, hp.z + 6)), e);
    s.camera.position.copy(camPos); s.camera.lookAt(camLook);
    s.camera.fov = lerp(30, 58, e); s.camera.updateProjectionMatrix();
    cross.style.opacity = String(clamp((e - 0.6) * 2.5));

    // strategy mode: hero walks to clicked spots; shooter mode: hero holds and fires
    walkT += dt;
    if (e < 0.5) {
      if (walkT > 2.2) {
        walkT = 0; from.copy(hp); to.set((R() - 0.5) * 30, 0, -6 - R() * 26);
        marker.position.set(to.x, 0.3, to.z); marker.material.opacity = 1;
        const v = to.clone().project(s.camera);
        cursor.style.left = `${(v.x * 0.5 + 0.5) * s.width}px`; cursor.style.top = `${(-v.y * 0.5 + 0.5) * s.height}px`;
        cursor.style.opacity = String(1 - e * 2);
      }
      const f = smooth(clamp(walkT / 1.6));
      hp.lerpVectors(from, to, f);
      marker.material.opacity = Math.max(0, 1 - walkT / 1.6);
      marker.scale.setScalar(1 + walkT * 0.6);
    } else {
      cursor.style.opacity = '0'; marker.material.opacity = 0;
      hp.x += (0 - hp.x) * dt * 2; hp.z += (-6 - hp.z) * dt * 2;
    }
    // everyone bobs; front troopers trade fire; hero shoots in shooter mode
    troopers.forEach((tr, i) => { tr.g.position.y = Math.abs(Math.sin(t * 4 + i)) * 0.4; });
    allies.forEach((a, i) => { a.position.y = Math.abs(Math.sin(t * 4 + i + 2)) * 0.4; });
    cool -= dt;
    if (cool < 0 && !reduceMotion) {
      cool = 0.45;
      const a = allies[Math.floor(R() * 4)].position.clone().setY(3);
      const b = troopers[Math.floor(R() * 4)].g.position.clone().setY(3);
      shot(R() < 0.5 ? a : b, R() < 0.5 ? b : a);
      if (e > 0.6) { const muzzle = hero.localToWorld(gun.position.clone().add(new THREE.Vector3(0, 0, -1.6))); shot(muzzle, troopers[1].g.position.clone().setY(3.5)); }
    }
    for (let i = 0; i < 200; i++) { if ((fxLife[i] -= dt) <= 0) fxPos[i * 3 + 1] = -99; }
    fx.geometry.attributes.position.needsUpdate = true;
    hero.rotation.y = e > 0.5 ? 0 : Math.atan2(-(to.x - from.x), -(to.z - from.z)) * 0.6;
  });
  set(0);
}
