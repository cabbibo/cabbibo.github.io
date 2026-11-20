// Chapter III: souls.
//  orbs(el)   – shoot soul orbs to confirm yours and deny theirs (three.js)
//  ledger(el) – net worth → Boon level, ability unlocks, and lane sharing (2D)
import { THREE, stage, cityMaterial, setbackTower, rng, glowSprite, glowPoints, C, lerp, clamp, mergeGeometries, reduceMotion } from './lib.js';

const MINE = 0x9cffb0;   // your team's orb (game shows green)
const THEIRS = 0xff9a4a; // enemy orb (game shows orange)

export function orbs(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 52, fog: [120, 520], bg: 0x0b0d10 });
  const scene = s.scene;
  const R = rng(9);
  scene.add(new THREE.HemisphereLight(0xe6dcc6, 0x14171c, 1.25));
  const key = new THREE.DirectionalLight(0xffe2b0, 1.4); key.position.set(40, 90, 30); scene.add(key);

  // street
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 600), new THREE.MeshBasicMaterial({ color: 0x1c2026 }));
  road.rotation.x = -Math.PI / 2; road.position.z = -150; scene.add(road);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(600, 700), new THREE.MeshBasicMaterial({ color: 0x121519 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, -0.05, -150); scene.add(walk);
  const geos = [];
  for (const side of [-1, 1]) for (let z = 30; z > -420; z -= 24 + R() * 8) {
    const h = 16 + Math.pow(R(), 1.7) * 80, w = 20 + R() * 10;
    const g = h > 55 ? setbackTower({ w, d: 20, h, tiers: 3, shrink: 0.74 }) : new THREE.BoxGeometry(w, h, 20).translate(0, h / 2, 0);
    g.translate(side * (30 + 3 + w / 2), 0, z); geos.push(g.index ? g.toNonIndexed() : g);
  }
  scene.add(new THREE.Mesh(mergeGeometries(geos), cityMaterial(s, { base: 0x2a2e36, lit: 0.26, floorH: 3.6, winW: 3 })));

  s.camera.position.set(6, 11, 16);
  s.camera.lookAt(0, 5, -60);

  // your hero (seen from behind)
  const me = new THREE.Group();
  const meMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.6 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.6, 4, 10), meMat); torso.position.y = 4.2; me.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), meMat); head.position.y = 7; me.add(head);
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 3.6), new THREE.MeshStandardMaterial({ color: 0x8b8378, metalness: 0.8, roughness: 0.3 })); gun.position.set(1.6, 5, -2); me.add(gun);
  me.position.set(0, 0, 0); scene.add(me);

  // enemy hero far down the street
  const foe = new THREE.Group();
  const foeMat = new THREE.MeshStandardMaterial({ color: 0xbcd0ff, roughness: 0.6, emissive: C.sapphire, emissiveIntensity: 0.25 });
  const ft = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.6, 4, 10), foeMat); ft.position.y = 4.2; foe.add(ft);
  const fh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), foeMat); fh.position.y = 7; foe.add(fh);
  foe.position.set(-8, 0, -72); scene.add(foe);

  // troopers: amber (ours) near, sapphire (theirs) further
  const tGeo = new THREE.CapsuleGeometry(1.1, 2.2, 3, 8); tGeo.translate(0, 2.2, 0);
  const troopers = [];
  function spawn(team, i) {
    const m = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ color: team === 0 ? C.amber : C.sapphire, roughness: 0.7 }));
    const x = (i - 1.5) * 5 + (R() - 0.5) * 2;
    const z = team === 0 ? -22 - R() * 5 : -46 - R() * 6;
    m.position.set(x, 0, team === 0 ? 0 : -140);
    scene.add(m);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.4), new THREE.MeshBasicMaterial({ color: team === 0 ? C.amber : C.sapphire, depthTest: false }));
    bar.renderOrder = 5; scene.add(bar);
    const tr = { team, m, bar, hp: 1, home: new THREE.Vector3(x, 0, z), cd: R() };
    m.userData.trooper = tr;
    troopers.push(tr);
  }
  for (let i = 0; i < 4; i++) { spawn(0, i); spawn(1, i); }

  // orbs
  const orbs = [];
  const orbGeo = new THREE.SphereGeometry(0.9, 16, 12);
  const hitGeo = new THREE.SphereGeometry(2.6, 8, 6);
  function popOrb(tr) {
    const owner = 1 - tr.team; // the team that killed this trooper owns the orb
    const color = owner === 0 ? MINE : THEIRS;
    const g = new THREE.Group();
    const core = new THREE.Mesh(orbGeo, new THREE.MeshBasicMaterial({ color }));
    const halo = glowSprite(color, 9, 0.9);
    const hit = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
    g.add(core, halo, hit);
    g.position.copy(tr.m.position).setY(4);
    scene.add(g);
    const o = { g, owner, age: 0, life: 1.1, vel: new THREE.Vector3((R() - 0.5) * 6, 9 + R() * 3, (R() - 0.5) * 4), value: 50, foeT: 0.35 + R() * 0.5, done: false };
    hit.userData.orb = o;
    orbs.push(o);
    // the ground half of the bounty goes to the killing team automatically
    stats[owner === 0 ? 'mine' : 'theirs'] += 50;
  }

  // tracer + sparks
  const fx = glowPoints(300, 3); scene.add(fx);
  const fxPos = fx.geometry.attributes.position.array, fxCol = fx.geometry.attributes.color.array; const fxLife = new Float32Array(300); let fxI = 0;
  const tc = new THREE.Color();
  function tracer(a, b, color = 0xfff1d0, n = 12) {
    tc.set(color);
    for (let k = 0; k < n; k++) { const i = fxI++ % 300; const p = a.clone().lerp(b, k / (n - 1)); fxPos.set([p.x, p.y, p.z], i * 3); fxCol.set([tc.r, tc.g, tc.b], i * 3); fxLife[i] = 0.1; }
  }
  function burst(p, color) {
    tc.set(color);
    for (let k = 0; k < 16; k++) { const i = fxI++ % 300; fxPos.set([p.x + (R() - 0.5) * 3, p.y + (R() - 0.5) * 3, p.z + (R() - 0.5) * 3], i * 3); fxCol.set([tc.r, tc.g, tc.b], i * 3); fxLife[i] = 0.35; }
  }

  const stats = { mine: 0, theirs: 0, confirmed: 0, denied: 0, lost: 0, popped: 0 };
  const flash = el.querySelector('[data-flash]');
  const hud = el.querySelector('[data-score]');
  let flashT = 0;
  function say(text, cls) { flash.innerHTML = `<span class="${cls}">${text}</span>`; flashT = 1.2; }

  // clicking shoots: orbs first, then enemy troopers
  const muzzle = () => me.localToWorld(gun.position.clone().add(new THREE.Vector3(0, 0, -1.8)));
  let slow = 1;
  s.canvas.addEventListener('pointerdown', (e) => {
    const r = s.canvas.getBoundingClientRect();
    s.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const hitO = s.raycast(orbs.filter((o) => !o.done).map((o) => o.g.children[2]))[0];
    if (hitO) {
      const o = hitO.object.userData.orb; o.done = true;
      tracer(muzzle(), o.g.position);
      burst(o.g.position, o.owner === 0 ? MINE : THEIRS);
      scene.remove(o.g);
      if (o.owner === 0) { stats.mine += o.value; stats.confirmed++; say('Confirmed +50', 'soul'); }
      else { stats.mine += o.value; stats.theirs -= 0; stats.denied++; say('Denied! You stole 50', 'amber'); }
      return;
    }
    const hitT = s.raycast(troopers.filter((t) => t.team === 1 && t.hp > 0).map((t) => t.m))[0];
    if (hitT) { const tr = hitT.object.userData.trooper; tr.hp -= 0.22; tracer(muzzle(), hitT.point); if (tr.hp <= 0) kill(tr); }
    else { const p = s.groundPoint(0) || new THREE.Vector3(0, 0, -80); tracer(muzzle(), p.setY(Math.max(p.y, 1))); }
  });
  function kill(tr) {
    tr.hp = 0; popOrb(tr);
    tr.m.visible = false; tr.bar.visible = false;
    setTimeout(() => { // respawn as the next wave
      tr.hp = 1; tr.m.visible = true; tr.bar.visible = true;
      tr.m.position.set(tr.home.x, 0, tr.team === 0 ? 0 : -140);
    }, (2.5 + R() * 2) * 1000 / slow);
  }

  el.querySelector('[data-slow]').addEventListener('click', (e) => {
    slow = slow === 1 ? 0.45 : 1; e.currentTarget.setAttribute('aria-pressed', String(slow < 1));
  });
  const foeSel = el.querySelector('[data-foe]');
  let foeSkill = 0.55;
  foeSel.addEventListener('input', () => { foeSkill = +foeSel.value; });
  el.querySelector('[data-reset]').addEventListener('click', () => { Object.keys(stats).forEach((k) => { stats[k] = 0; }); say('Scores reset', 'small'); });

  const tmp = new THREE.Vector3();
  s.frame.push((rdt, t) => {
    const dt = rdt * slow;
    // troopers march to their spot, then trade fire with the closest enemy
    for (const tr of troopers) {
      if (tr.hp <= 0) continue;
      tr.m.position.lerp(tr.home, 1 - Math.pow(0.4, dt));
      tr.m.position.y = Math.abs(Math.sin(t * 5 + tr.home.x)) * 0.3;
      tr.cd -= dt;
      if (tr.cd <= 0 && tr.m.position.distanceTo(tr.home) < 3) {
        tr.cd = 0.7 + R() * 0.6;
        const foes = troopers.filter((o) => o.team !== tr.team && o.hp > 0 && o.m.position.distanceTo(o.home) < 3);
        if (foes.length) {
          const f = foes[Math.floor(R() * foes.length)];
          f.hp -= 0.09 + R() * 0.05;
          tracer(tr.m.position.clone().setY(3), f.m.position.clone().setY(3), tr.team === 0 ? C.amber : C.sapphire, 6);
          if (f.hp <= 0) kill(f);
        }
      }
      tr.bar.position.copy(tr.m.position).setY(6.2);
      tr.bar.scale.x = Math.max(0.01, tr.hp);
      tr.bar.quaternion.copy(s.camera.quaternion);
    }
    // the enemy hero also chips your troopers so you get orbs to deny
    foe.position.x = -8 + Math.sin(t * 0.7) * 6;
    if (R() < dt * 0.9) {
      const mine = troopers.filter((o) => o.team === 0 && o.hp > 0);
      if (mine.length) { const f = mine[Math.floor(R() * mine.length)]; f.hp -= 0.25; tracer(foe.position.clone().setY(5), f.m.position.clone().setY(3), C.sapphire, 10); if (f.hp <= 0) kill(f); }
    }
    // orbs rise and slow; the enemy hero tries to shoot them too
    for (const o of orbs) {
      if (o.done) continue;
      o.age += dt;
      o.vel.multiplyScalar(Math.pow(0.12, dt));
      o.g.position.addScaledVector(o.vel, dt);
      o.g.children[1].material.opacity = 0.6 + 0.4 * Math.sin(t * 20);
      const foeReact = lerp(1.25, 0.32, foeSkill);
      if (o.age > foeReact * (0.8 + o.foeT * 0.5) && R() < foeSkill * 1.4 * dt * 8) {
        o.done = true; scene.remove(o.g);
        tracer(foe.position.clone().setY(5), o.g.position, C.sapphire);
        burst(o.g.position, o.owner === 0 ? MINE : THEIRS);
        if (o.owner === 0) { stats.theirs += o.value; stats.lost++; say('Denied by the enemy', 'sapphire'); }
        else { stats.theirs += o.value; }
        continue;
      }
      if (o.age > o.life) { // nobody shot it: it pops and goes to its owner
        o.done = true; scene.remove(o.g); stats.popped++;
        if (o.owner === 0) stats.mine += o.value; else stats.theirs += o.value;
      }
    }
    for (let i = orbs.length - 1; i >= 0; i--) if (orbs[i].done) orbs.splice(i, 1);
    for (let i = 0; i < 300; i++) if ((fxLife[i] -= rdt) <= 0) fxPos[i * 3 + 1] = -99;
    fx.geometry.attributes.position.needsUpdate = true; fx.geometry.attributes.color.needsUpdate = true;
    flashT -= rdt; flash.style.opacity = String(clamp(flashT));
    hud.innerHTML = `You <b class="soul">${stats.mine.toLocaleString()}</b> · Enemy <b class="sapphire">${stats.theirs.toLocaleString()}</b><br>` +
      `confirmed ${stats.confirmed} · denied ${stats.denied} · lost to enemy ${stats.lost}`;
  });
}

// ------------------------------------------------------------------ ledger
// Boon thresholds (souls earned → power level). First 11 from the wiki; the
// rest interpolated toward Boon 35 at 49,200 for display.
const BOONS = (() => {
  const known = [0, 600, 800, 1100, 1500, 2000, 2600, 3200, 3800, 4500, 5200, 5900];
  const out = known.slice();
  const n = 35 - (known.length - 1);
  const a = 5900, b = 49200;
  for (let i = 1; i <= n; i++) out.push(Math.round((a + (b - a) * Math.pow(i / n, 1.35)) / 100) * 100);
  return out; // index = boon level
})();
const UNLOCKS = [[600, 'first ability'], [1100, 'second ability'], [2000, 'third ability'], [3800, 'ultimate']];
const SHARE = [1, 0.54, 0.36, 0.25, 0.2, 0.16];

export function ledger(el) {
  const nw = el.querySelector('#nw');
  const sh = el.querySelector('#share');
  const out = el.querySelector('[data-ledger]');
  const bar = el.querySelector('[data-boonbar]');
  const shareOut = el.querySelector('[data-shareout]');
  // draw the boon ladder once
  bar.innerHTML = BOONS.slice(1).map((v, i) => `<i style="left:${(100 * v) / 49200}%" title="Boon ${i + 1}: ${v.toLocaleString()} souls"></i>`).join('') +
    UNLOCKS.map(([v, n]) => `<b style="left:${(100 * v) / 49200}%"><span>${n}</span></b>`).join('') + '<em></em>';
  const marker = bar.querySelector('em');
  function upd() {
    const v = +nw.value;
    let boon = 0; while (boon < 35 && BOONS[boon + 1] <= v) boon++;
    const abilities = UNLOCKS.filter(([u]) => v >= u).length;
    const t1 = Math.floor(v / 800), t3 = Math.floor(v / 3200), t4 = Math.floor(v / 6400);
    marker.style.left = `${(100 * v) / 49200}%`;
    out.innerHTML = `<div><span class="lbl">Souls earned</span><b>${v.toLocaleString()}</b></div>` +
      `<div><span class="lbl">Power level</span><b>Boon ${boon}</b></div>` +
      `<div><span class="lbl">Abilities</span><b>${abilities} of 4</b></div>` +
      `<div><span class="lbl">Could buy</span><b>${t1}×800 <span class="small">or</span> ${t3}×3,200 <span class="small">or</span> ${t4}×6,400</b></div>`;
    const n = +sh.value;
    const each = SHARE[n - 1];
    shareOut.innerHTML = `${Array.from({ length: n }, () => '<span class="pip"></span>').join('')}<span>${n === 1 ? 'Alone, you keep all 100.' : `${n} heroes nearby each get <b>${Math.round(each * 100)}</b>. Total paid out: <b>${Math.round(each * n * 100)}</b>.`}</span>`;
  }
  nw.addEventListener('input', upd); sh.addEventListener('input', upd); upd();
}
