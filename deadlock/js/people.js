// Prologue: people first.
//  shelly(el) – a junkyard at night; pick a hero to hear what they say to Bebop about Shelly
//  gambit(el) – the urn gambit as a soul-lead curve (shape illustrative)
//  votes(el)  – zoom from 110 million votes down to Nurse Harrow's 22,194 and one person's 1,000
import { THREE, stage, setbackTower, cityMaterial, rng, glowSprite, glowPoints, C, clamp, lerp, mergeGeometries, reduceMotion } from './lib.js';

// Verified lines (deadlock.wiki voice-line transcripts) and clearly marked paraphrases.
const TALK = [
  { who: 'Bebop', lines: [['Bebop', 'I’ll do whatever it takes to save Miss Shelly.', 1]] },
  { who: 'Yamato', lines: [['Yamato', 'Your master’s sick?', 1], ['Bebop', 'My mother. Not my master.', 1]] },
  { who: 'Wraith', lines: [['Wraith', 'asks how long he’ll keep lying to her. He says he doesn’t.', 0], ['Wraith', 'No. You just lie to yourself.', 1]] },
  { who: 'Pocket', lines: [['Pocket', 'Must be nice having a mother worth saving.', 1]] },
  { who: 'Krill', lines: [['Krill', 'Sorry we couldn’t do more for her.', 1]] },
  { who: 'Ivy', lines: [['Ivy', 'invites Bebop and Shelly over for dinner.', 0]] },
  { who: 'The Doorman', lines: [['The Doorman', 'offers Shelly a spa day at his hotel.', 0]] },
  { who: 'Paige', lines: [['Bebop', 'asks Paige to come and read to her.', 0]] },
  { who: 'Mina', lines: [['Mina', 'sneers that Shelly is poor.', 0], ['Bebop', 'tells her never to talk about his mother.', 0]] },
  { who: 'After the match', lines: [['Bebop', 'I’m comin’ home, Ms. Shelly.', 1]] },
];

export function shelly(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 36, fog: [30, 220], bg: 0x0d1018 });
  const scene = s.scene, R = rng(1951);

  // sky dome
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { a: { value: new THREE.Color(0x05070c) }, b: { value: new THREE.Color(0x1b2132) } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; varying float h; void main(){ gl_FragColor = vec4(mix(b, a, pow(clamp(h,0.,1.), .5)), 1.); }',
  })));
  const stars = glowPoints(260, 1.2); const sp = stars.geometry.attributes.position.array;
  for (let i = 0; i < 260; i++) { const th = R() * Math.PI * 2, ph = 0.15 + R() * 1.1; sp.set([Math.cos(th) * Math.cos(ph) * 300, Math.sin(ph) * 300, Math.sin(th) * Math.cos(ph) * 300], i * 3); }
  scene.add(stars);

  scene.add(new THREE.HemisphereLight(0x8a9ac0, 0x1a1410, 0.55));
  const lamp = new THREE.PointLight(0xffb060, 40, 40, 1.6); lamp.position.set(-4, 4.2, -1.5); scene.add(lamp);
  const moon = new THREE.DirectionalLight(0x9fb4ff, 0.5); moon.position.set(30, 40, 20); scene.add(moon);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: 0x17140f, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // distant skyline
  const sky = [];
  for (let i = 0; i < 60; i++) {
    const a = -0.9 + (i / 60) * 1.8 + (R() - 0.5) * 0.02, d = 170 + R() * 50, h = 10 + Math.pow(R(), 2) * 70;
    const g = h > 35 ? setbackTower({ w: 8, d: 8, h, tiers: 3, shrink: 0.7, spire: R() < 0.3 ? 8 : 0 }) : new THREE.BoxGeometry(9, h, 9).translate(0, h / 2, 0);
    g.translate(Math.sin(a) * d, 0, -Math.cos(a) * d); sky.push(g.index ? g.toNonIndexed() : g);
  }
  scene.add(new THREE.Mesh(mergeGeometries(sky), cityMaterial(s, { base: 0x10131b, lit: 0.07, floorH: 2.6, winW: 2 })));

  // scrap piles
  const rust = [0x5a3a24, 0x4a4540, 0x6b4a2a, 0x39434a, 0x7a5a32];
  const mats = rust.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0.4 }));
  const shapes = [new THREE.BoxGeometry(1, 1, 1), new THREE.CylinderGeometry(0.5, 0.5, 1, 10), new THREE.TorusGeometry(0.6, 0.22, 6, 14), new THREE.SphereGeometry(0.55, 8, 6)];
  for (const [cx, cz, n, r] of [[8, -6, 70, 4], [-10, -10, 60, 4.5], [12, 6, 40, 3], [-14, 4, 45, 3.5], [2, -16, 50, 4]]) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(shapes[Math.floor(R() * 4)], mats[Math.floor(R() * mats.length)]);
      const rr = Math.sqrt(R()) * r, th = R() * 7;
      m.position.set(cx + Math.cos(th) * rr, Math.max(0.3, (1 - rr / r) * r * 0.8 * R() + 0.3), cz + Math.sin(th) * rr);
      m.rotation.set(R() * 3, R() * 3, R() * 3); m.scale.setScalar(0.6 + R() * 1.4);
      scene.add(m);
    }
  }
  // Shelly's shack with a warm window
  const shack = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 1 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 4.5), wall); body.position.y = 2; shack.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2, 4), new THREE.MeshStandardMaterial({ color: 0x2a2420 })); roof.rotation.y = Math.PI / 4; roof.position.y = 5; roof.scale.z = 0.8; shack.add(roof);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xffc070 })); win.position.set(1.2, 2.3, 2.26); shack.add(win);
  const winGlow = glowSprite(0xffb050, 7, 0.55); winGlow.position.set(1.2, 2.3, 2.6); shack.add(winGlow);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshStandardMaterial({ color: 0x1c1712 })); door.position.set(-1.4, 1.1, 2.26); shack.add(door);
  shack.position.set(-5, 0, -3); shack.rotation.y = 0.45; scene.add(shack);
  const bulb = glowSprite(0xffd090, 2.4, 1); bulb.position.copy(lamp.position); scene.add(bulb);

  // Bebop: round body, one big eye, a hook arm, a fist arm, a wheel
  const bebop = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8742c, roughness: 0.45, metalness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6, metalness: 0.6 });
  const torso = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 18), metal); torso.position.y = 2.3; torso.scale.set(1, 1.08, 0.95); bebop.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14, 0, Math.PI * 2, 0, Math.PI / 1.7), metal); head.position.y = 3.55; bebop.add(head);
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshBasicMaterial({ color: 0xbff6ff })); eye.position.set(0, 3.6, 0.66); bebop.add(eye);
  const eyeGlow = glowSprite(0x9ff0ff, 1.8, 0.8); eyeGlow.position.set(0, 3.6, 0.8); bebop.add(eyeGlow);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.4, 4, 8), dark); armL.position.set(-1.45, 2.1, 0.2); armL.rotation.z = 0.35; bebop.add(armL);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 8, 18, Math.PI * 1.3), metal); hook.position.set(-1.8, 1.05, 0.3); hook.rotation.z = 1.2; bebop.add(hook);
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 1.3, 4, 8), dark); armR.position.set(1.5, 2.0, 0.2); armR.rotation.z = -0.3; bebop.add(armR);
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), metal); fist.position.set(1.85, 1.05, 0.3); bebop.add(fist);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.22, 10, 20), dark); wheel.position.y = 0.6; wheel.rotation.y = Math.PI / 2; bebop.add(wheel);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 1, 10), dark); neck.position.y = 1.0; bebop.add(neck);
  bebop.position.set(3.2, 0, 1); bebop.rotation.y = 0.42; scene.add(bebop);
  const fill = new THREE.DirectionalLight(0x8fa8e0, 1.4); fill.position.set(16, 8, 14); scene.add(fill);
  const rim = new THREE.PointLight(0xffb060, 14, 14, 1.5); rim.position.set(0.5, 3, -0.5); scene.add(rim);

  // music notes drifting up from the window
  const noteTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.font = '48px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', 32, 34); return new THREE.CanvasTexture(c); })();
  const notes = [];
  for (let i = 0; i < 14; i++) {
    const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, color: 0xffd28a, transparent: true, depthWrite: false }));
    n.scale.setScalar(0.7); scene.add(n); notes.push({ n, t: R() * 6, x: R() });
  }
  const winWorld = new THREE.Vector3(); win.getWorldPosition(winWorld);

  // camera drifts; pointer parallax
  let px = 0, py = 0;
  view.addEventListener('pointermove', (e) => { const r = view.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5; });
  const look = new THREE.Vector3(-0.5, 2.8, -0.5);
  s.frame.push((dt, t) => {
    const a = (reduceMotion ? 0 : Math.sin(t * 0.07) * 0.18) + px * 0.25;
    s.camera.position.set(Math.sin(0.5 + a) * 19, 4.6 - py * 2, Math.cos(0.5 + a) * 19);
    s.camera.lookAt(look);
    lamp.intensity = 38 + Math.sin(t * 7) * 1.5 + (Math.random() < 0.01 ? -15 : 0);
    eyeGlow.material.opacity = 0.65 + 0.25 * Math.sin(t * 1.4);
    bebop.position.y = Math.sin(t * 1.2) * 0.05;
    for (const o of notes) {
      o.t += dt * 0.4; if (o.t > 6) { o.t = 0; o.x = R(); }
      const k = o.t / 6;
      o.n.position.set(winWorld.x + Math.sin(o.t * 2 + o.x * 6) * 0.8 + k * 3, winWorld.y + k * 7, winWorld.z + 0.5 + k * 1.5);
      o.n.material.opacity = Math.sin(Math.PI * k) * 0.9;
    }
  });

  // conversation picker + subtitles
  const sub = el.querySelector('[data-sub]');
  const picker = el.querySelector('[data-who]');
  picker.innerHTML = TALK.map((c, i) => `<button data-i="${i}" aria-pressed="${i === 0}">${c.who}</button>`).join('');
  let cur = 0, auto = !reduceMotion, timer;
  function show(i) {
    cur = i;
    picker.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
    sub.innerHTML = TALK[i].lines.map(([who, text, verbatim]) =>
      `<p><b class="${who === 'Bebop' ? 'amber' : 'soul'}">${who}</b> ${verbatim ? `“${text}”` : `<i>${text}</i>`}</p>`).join('');
    sub.classList.remove('in'); void sub.offsetWidth; sub.classList.add('in');
  }
  picker.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; auto = false; clearInterval(timer); show(+b.dataset.i); });
  show(0);
  if (auto) timer = setInterval(() => { if (auto && s.visible) show((cur + 1) % TALK.length); }, 5200);
}

// ------------------------------------------------------------------ gambit
export function gambit(el) {
  const box = el.querySelector('[data-chart]');
  const W = 640, H = 260, x0 = 40, x1 = 620, y0 = 30, y1 = 220;
  const X = (m) => x0 + (m / 30) * (x1 - x0);
  const mid = (y0 + y1) / 2;
  // soul lead for Melee Creeps; shape only
  const f = (m) => (m < 15 ? -Math.pow(m / 15, 1.4) * 0.8 : m < 17 ? lerp(-0.8, 0.15, (m - 15) / 2) : Math.min(0.95, 0.15 + (m - 17) * 0.09));
  const Y = (v) => mid - v * (y1 - y0) / 2;
  let d = '', area = `M${X(0)} ${mid}`;
  for (let i = 0; i <= 120; i++) { const m = (i / 120) * 24; d += `${i ? 'L' : 'M'}${X(m).toFixed(1)} ${Y(f(m)).toFixed(1)}`; area += `L${X(m).toFixed(1)} ${Y(f(m)).toFixed(1)}`; }
  area += `L${X(24)} ${mid}Z`;
  const ann = (m, txt, up) => { const x = X(m), y = Y(f(m)); const ty = up ? y - 26 : y + 34; return `<line x1="${x}" y1="${y}" x2="${x}" y2="${up ? ty + 6 : ty - 12}" stroke="var(--faint)"/><circle cx="${x}" cy="${y}" r="4" fill="var(--paper)"/><text x="${x}" y="${ty}" fill="var(--paper)" font-family="var(--f-mono)" font-size="11" text-anchor="middle">${txt}</text>`; };
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Melee Creeps fell far behind on purpose for fifteen minutes, then took the lead and their opponents forfeited">
    <defs><clipPath id="gAbove"><rect x="0" y="0" width="${W}" height="${mid}"/></clipPath><clipPath id="gBelow"><rect x="0" y="${mid}" width="${W}" height="${H}"/></clipPath></defs>
    <line x1="${x0}" y1="${mid}" x2="${x1}" y2="${mid}" stroke="var(--rule)"/>
    <text x="${x0 - 6}" y="${y0 + 6}" fill="var(--dim)" font-family="var(--f-mono)" font-size="10" text-anchor="end">AHEAD</text>
    <text x="${x0 - 6}" y="${y1}" fill="var(--dim)" font-family="var(--f-mono)" font-size="10" text-anchor="end">BEHIND</text>
    <path d="${area}" fill="var(--blood)" opacity="0.25" clip-path="url(#gBelow)"/>
    <path d="${area}" fill="var(--soul)" opacity="0.25" clip-path="url(#gAbove)"/>
    <path d="${d}" fill="none" stroke="var(--paper)" stroke-width="2"/>
    ${ann(1, 'buy golden eggs', true)}${ann(9, 'lose on purpose', false)}${ann(15, 'crack eggs, take the urn', false)}${ann(22, 'opponents forfeit', true)}
    ${[0, 5, 10, 15, 20].map((m) => `<text x="${X(m)}" y="${H - 6}" fill="var(--faint)" font-family="var(--f-mono)" font-size="10" text-anchor="middle">${m}:00</text>`).join('')}
  </svg>`;
}

// ------------------------------------------------------------------ votes
export function votes(el) {
  const view = el.querySelector('.view');
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  const ctx = cv.getContext('2d');
  const slider = el.querySelector('#zoom-r');
  const lab = el.querySelector('[data-zoomlab]');
  let W = 1, H = 1, dpr = 1;
  const TOTAL = 110e6, HARROW = 22194, ONE = 1000;
  // areas proportional to votes
  const sH = Math.sqrt(HARROW / TOTAL), sO = Math.sqrt(ONE / TOTAL);
  const target = { x: 0.73, y: 0.41 }; // where Harrow's square sits inside the big one (unit coords)
  function draw() {
    const z = Math.pow(10, +slider.value * 2.9); // 1× → ~800×
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0e1115'; ctx.fillRect(0, 0, W, H);
    const S = Math.min(W, H) * 0.86;
    const cx = W / 2, cy = H / 2;
    // world → screen: zoom about the Harrow square's center
    const k = Math.min(1, Math.log10(z) / 1.5);
    const fx = lerp(0.5, target.x + sH / 2, k), fy = lerp(0.5, target.y + sH / 2, k);
    const T = (u, v) => [cx + (u - fx) * S * z, cy + (v - fy) * S * z];
    // the 110 million
    const [ax, ay] = T(0, 0);
    ctx.fillStyle = '#232833'; ctx.fillRect(ax, ay, S * z, S * z);
    // faint grid that hints at scale
    const step = z < 3 ? 0.1 : z < 30 ? 0.01 : 0.001;
    ctx.strokeStyle = 'rgba(232,226,212,0.05)'; ctx.lineWidth = 1;
    for (let g = 0; g <= 1.0001; g += step) {
      const [gx] = T(g, 0), [, gy] = T(0, g);
      if (gx > -2 && gx < W + 2) { ctx.beginPath(); ctx.moveTo(gx, Math.max(0, ay)); ctx.lineTo(gx, Math.min(H, ay + S * z)); ctx.stroke(); }
      if (gy > -2 && gy < H + 2) { ctx.beginPath(); ctx.moveTo(Math.max(0, ax), gy); ctx.lineTo(Math.min(W, ax + S * z), gy); ctx.stroke(); }
    }
    // Harrow's 22,194
    const [hx, hy] = T(target.x, target.y), hs = sH * S * z;
    ctx.fillStyle = '#7ff0e0'; ctx.fillRect(hx, hy, Math.max(1.5, hs), Math.max(1.5, hs));
    if (hs < 14) { ctx.strokeStyle = '#7ff0e0'; ctx.beginPath(); ctx.arc(hx + hs / 2, hy + hs / 2, 16, 0, 7); ctx.stroke(); }
    // the one person, 1,000 votes
    const [ox, oy] = T(target.x + sH * 0.55, target.y + sH * 0.3), os = sO * S * z;
    ctx.fillStyle = '#f0a43a'; ctx.fillRect(ox, oy, Math.max(0.8, os), Math.max(0.8, os));
    if (os > 6) { ctx.fillStyle = '#0e1115'; ctx.font = `${Math.min(14, os / 6)}px "DM Mono", monospace`; ctx.textAlign = 'center'; if (os > 60) ctx.fillText('ONE PERSON', ox + os / 2, oy + os / 2 + 4); }
    // labels
    ctx.font = '12px "DM Mono", monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#a29d90';
    if (z < 4) ctx.fillText('110,000,000 VOTES', Math.max(12, ax + 8), Math.max(18, ay + 18));
    lab.textContent = z < 2 ? 'Find the teal square.' : z < 40 ? '22,194 people voted only for Nurse Harrow.' : 'One of them voted exactly 1,000 times.';
  }
  new ResizeObserver(() => { dpr = Math.min(2, devicePixelRatio || 1); W = view.clientWidth; H = view.clientHeight; cv.width = W * dpr; cv.height = H * dpr; draw(); }).observe(view);
  slider.addEventListener('input', draw);
}
