// Chapter V: movement.
//  playground(el) – a side-view street slice with stamina, dash, double jump,
//                   dash-jump, wall jump, slide and sprint (2D canvas)
//  zipline(el)    – how far your lane's zipline reaches, and how fast it is
// Move costs follow the community wiki (Nov 2026). Distances and speeds that
// the wiki doesn't give (run speed, gravity, lane length) are tuned for feel.
import { clamp, lerp, rng, reduceMotion } from './lib.js';

// ---------------------------------------------------------------- shared
function canvasIn(view) {
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  const ctx = cv.getContext('2d');
  const box = { cv, ctx, W: 1, H: 1, dpr: 1 };
  const fit = () => {
    box.dpr = Math.min(2, devicePixelRatio || 1); box.W = Math.max(1, view.clientWidth); box.H = Math.max(1, view.clientHeight);
    cv.width = box.W * box.dpr; cv.height = box.H * box.dpr;
    if (box.onResize) box.onResize();
  };
  new ResizeObserver(fit).observe(view); fit();
  return box;
}
function loop(view, step, draw) {
  let visible = false, last = performance.now(), acc = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) draw(); }, { rootMargin: '80px' }).observe(view);
  const DT = 1 / 120;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (visible) { acc += dt; while (acc >= DT) { step(DT); acc -= DT; } draw(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { advance(secs) { for (let i = 0; i < secs / DT; i++) step(DT); draw(); } };
}
const COL = {
  ink: '#0b0d10', ink2: '#13171c', paper: '#e8e2d4', dim: '#a29d90', faint: '#6f6c64',
  brass: '#c8a35a', brass2: '#8a7444', amber: '#f0a43a', sapphire: '#6b97ff', soul: '#7ff0e0', blood: '#e0584b',
};

// ================================================================ PLAYGROUND
// World in meters. y up, feet at (x, y).
const SOLIDS = [
  { x0: 8, x1: 17, y0: 0, y1: 7, kind: 'brownstone' },     // brownstone A
  { x0: 25.5, x1: 32, y0: 0, y1: 7, kind: 'brick' },       // building B
  { x0: 32.4, x1: 33.5, y0: 0, y1: 1.3, kind: 'dumpster' },// alley dumpster
  { x0: 34, x1: 46, y0: 0, y1: 11.5, kind: 'tower' },      // tower C
];
const ONEWAY = [ // fire escape landings (pass through from below)
  { x0: 5.2, x1: 8, y: 3.0 }, { x0: 5.2, x1: 8, y: 5.2 },
  { x0: 22.6, x1: 25.5, y: 2.6 }, { x0: 22.6, x1: 25.5, y: 5.0 },
];
const RAMP = { x0: 1, x1: 3.5, h: 1.2 };
const WORLD_W = 46;
const GOAL = { x0: 34.2, y: 11.5 };
const P = {
  G: 25, RUN: 6, SPRINT: 7.6, ACC: 60, DECEL: 45, OVER: 14, AIR: 32,
  JUMP: 8.5, AIRJUMP: 7.5, DASH_G: 30, DASH_A: 24, DASH_T: 1 / 3,
  DJ_VX: 15, DJ_VY: 9, WJ_VY: 9.5, WJ_KICK: 5.5, WJ_CLIMB: 2.2, FATIGUE: 0.8,
  SLIDE_MIN: 8.9, REGEN: 1 / 4.5, W: 0.7, H: 1.8, HS: 0.9,
};
const STOOP = { x0: 3.5, x1: 5.2, y: 1.2 }; // stoop landing (terrain: low steps auto-mantle)
function terrain(x) {
  if (x >= RAMP.x0 && x < RAMP.x1) return ((x - RAMP.x0) / (RAMP.x1 - RAMP.x0)) * RAMP.h;
  if (x >= STOOP.x0 && x < STOOP.x1) return STOOP.y;
  return 0;
}

export function playground(el) {
  const view = el.querySelector('.view');
  const box = canvasIn(view);
  const { ctx } = box;
  const hudEl = el.querySelector('[data-mhud]');
  const goalEl = el.querySelector('[data-mgoal]');

  const p = {};
  const input = { left: false, right: false, slide: false, jump: false, dash: false };
  const pops = [];
  const trail = [];
  let flash = { t: 0, color: COL.paper, n: 0 };
  let clock = 0, runT = null, best = null, won = false, demo = null, lastLabel = '';
  function reset() {
    Object.assign(p, { x: 1.2 - 0.6, y: 0, vx: 0, vy: 0, face: 1, ground: true, stamina: 3, airJump: false, airDash: false,
      dashT: 0, dashGround: false, slide: false, wallJumps: 0, sprintT: 0, sprinting: false, fallFrom: 0, wall: 0 });
    pops.length = 0; trail.length = 0; runT = null; won = false;
    goalEl.innerHTML = 'Goal: the water tower on the tallest roof';
  }
  reset();

  function pop(text, color = COL.paper) {
    const stack = pops.filter((q) => q.t > 1.0).length; // keep fresh labels from overlapping
    pops.push({ text, color, x: p.x, y: p.y + P.H + 0.6 + stack * 0.7, t: 1.4 }); lastLabel = text;
  }
  function spend(n, label) {
    if (p.stamina + 1e-6 < n) { pop('Out of stamina', COL.blood); flash = { t: 0.6, color: COL.blood, n: 0 }; return false; }
    p.stamina -= n; flash = { t: 0.5, color: COL.soul, n };
    pop(label, COL.soul);
    return true;
  }
  const height = () => (p.slide ? P.HS : P.H);
  function overlapY(r, y = p.y, h = height()) { return y < r.y1 - 1e-4 && y + h > r.y0 + 1e-4; }
  function overlapX(r, x = p.x) { return x + P.W / 2 > r.x0 + 1e-4 && x - P.W / 2 < r.x1 - 1e-4; }
  function wallSide() { // which side touches a wall face (for wall jumps)
    for (const r of SOLIDS) {
      if (!overlapY(r)) continue;
      if (Math.abs(p.x + P.W / 2 - r.x0) < 0.14 && r.y1 - p.y > 0.6) return 1;
      if (Math.abs(p.x - P.W / 2 - r.x1) < 0.14 && r.y1 - p.y > 0.6) return -1;
    }
    return 0;
  }

  function jumpPressed() {
    if (p.ground) {
      if (p.dashT > 0 && p.dashGround) { // dash-jump: jump inside the dash window
        if (!spend(1, 'Dash-jump −2 total')) { p.vy = P.JUMP; p.ground = false; return; }
        p.vx = p.face * P.DJ_VX; p.vy = P.DJ_VY; p.dashT = 0;
      } else { p.vy = P.JUMP; pop('Jump · free', COL.paper); }
      p.ground = false; p.slide = false; p.fallFrom = p.y;
      return;
    }
    const w = wallSide();
    if (w) {
      const cost = p.wallJumps === 0 ? 0 : 0.5;
      if (cost && !spend(cost, 'Wall jump −½')) return;
      if (!cost) pop('Wall jump · first is free', COL.soul);
      const f = Math.pow(P.FATIGUE, p.wallJumps);
      const towardWall = (w === 1 && input.right) || (w === -1 && input.left);
      p.vy = P.WJ_VY * f; p.vx = -w * (towardWall ? P.WJ_CLIMB : P.WJ_KICK);
      p.wallJumps++;
      return;
    }
    if (!p.airJump) {
      if (!spend(1, 'Double jump −1')) return;
      p.airJump = true; p.vy = P.AIRJUMP;
    }
  }
  function dashPressed() {
    if (p.dashT > 0) return;
    if (!p.ground && p.airDash) { pop('One air dash per jump', COL.dim); return; }
    if (!spend(1, p.ground ? 'Dash −1' : 'Air dash −1')) return;
    const dir = input.right ? 1 : input.left ? -1 : p.face;
    p.face = dir;
    p.dashGround = p.ground; p.dashT = P.DASH_T;
    if (!p.ground) p.airDash = true;
  }

  function step(dt) {
    clock += dt;
    // autopilot drives the same inputs a player would
    if (demo) demo.tick(dt);
    if (input.jump) { input.jump = false; jumpPressed(); }
    if (input.dash) { input.dash = false; dashPressed(); }
    if ((input.left || input.right) && runT === null && !won) runT = 0;
    if (runT !== null && !won) runT += dt;

    const want = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (want) p.face = want;
    // stamina regenerates one bar every ~4.5 s
    p.stamina = Math.min(3, p.stamina + P.REGEN * dt);

    // sprint kicks in after 5 s of running (no combat here)
    if (p.ground && want && !p.slide) p.sprintT += dt; else if (!want) p.sprintT = 0;
    const wasSprint = p.sprinting; p.sprinting = p.sprintT > 5;
    if (p.sprinting && !wasSprint) pop('Sprinting', COL.brass);

    // slide: crouch while fast (dash exit) or on the stoop ramp
    const onRamp = p.ground && p.x > RAMP.x0 && p.x < RAMP.x1;
    if (input.slide && p.ground && !p.slide && (Math.abs(p.vx) > P.SLIDE_MIN || p.dashT > 0 || (onRamp && p.vx < -1))) {
      p.slide = true; pop('Slide · free', COL.brass);
    }
    if (p.slide && (!input.slide || Math.abs(p.vx) < 3.5 || !p.ground)) {
      // stand up only if there is headroom
      const blocked = SOLIDS.some((r) => overlapX(r) && p.y + P.H > r.y0 && p.y < r.y0);
      if (!blocked) p.slide = false;
    }

    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.face * (p.dashGround ? P.DASH_G : P.DASH_A);
      if (!p.dashGround) p.vy = 0;
      trail.push({ x: p.x, y: p.y, t: 0.25, slide: p.slide });
      if (p.dashT <= 0) p.vx = p.face * 10.5; // exit speed: a window to slide or leap
    } else if (p.ground) {
      if (p.slide) {
        p.vx -= Math.sign(p.vx) * 4 * dt;
        if (onRamp) p.vx -= 9 * dt; // downhill (ramp falls to the left)
      } else {
        const top = p.sprinting ? P.SPRINT : P.RUN;
        if (want) {
          if (Math.sign(p.vx) === want && Math.abs(p.vx) > top) p.vx -= want * P.OVER * dt;
          else p.vx = clamp(p.vx + want * P.ACC * dt, -top, top);
        } else {
          const s = Math.sign(p.vx); p.vx -= s * P.DECEL * dt; if (Math.sign(p.vx) !== s) p.vx = 0;
        }
      }
    } else {
      // air control: steer toward input, keep momentum above run speed
      if (want) {
        if (Math.sign(p.vx) !== want || Math.abs(p.vx) < P.RUN) p.vx = clamp(p.vx + want * P.AIR * dt, -Math.max(P.RUN, Math.abs(p.vx)), Math.max(P.RUN, Math.abs(p.vx)));
      }
      p.vx *= Math.pow(0.82, dt);
    }
    if (!(p.dashT > 0 && !p.dashGround)) p.vy -= P.G * dt;
    if (p.slide && p.ground && Math.random() < 0.6) trail.push({ x: p.x, y: p.y, t: 0.18, slide: true, dust: true });

    // ---- move X
    let nx = clamp(p.x + p.vx * dt, P.W / 2, WORLD_W - P.W / 2);
    for (const r of SOLIDS) {
      if (!overlapY(r)) continue;
      if (p.vx > 0 && p.x + P.W / 2 <= r.x0 + 1e-3 && nx + P.W / 2 > r.x0) { nx = r.x0 - P.W / 2; if (p.dashT <= 0) p.vx = 0; }
      if (p.vx < 0 && p.x - P.W / 2 >= r.x1 - 1e-3 && nx - P.W / 2 < r.x1) { nx = r.x1 + P.W / 2; if (p.dashT <= 0) p.vx = 0; }
    }
    p.x = nx;
    // ---- move Y
    const wasGround = p.ground;
    let ny = p.y + p.vy * dt;
    p.ground = false;
    if (p.vy <= 0) {
      let land = -Infinity;
      for (const r of SOLIDS) if (overlapX(r) && p.y >= r.y1 - 0.02 && ny <= r.y1) land = Math.max(land, r.y1);
      for (const o of ONEWAY) if (p.x > o.x0 && p.x < o.x1 && p.y >= o.y - 0.02 && ny <= o.y) land = Math.max(land, o.y);
      const t = terrain(p.x);
      if (ny <= t || (wasGround && Math.abs(ny - t) < 0.25 && land === -Infinity)) land = Math.max(land, t);
      if (land > -Infinity) {
        if (!wasGround) {
          const drop = p.fallFrom - land;
          if (drop > 4.5) pop(`Fell ${drop.toFixed(0)} m · no fall damage`, COL.dim);
        }
        ny = land; p.vy = 0; p.ground = true; p.airJump = false; p.airDash = false; p.wallJumps = 0;
      }
    } else {
      for (const r of SOLIDS) if (overlapX(r) && p.y + height() <= r.y0 + 1e-3 && ny + height() > r.y0) { ny = r.y0 - height(); p.vy = 0; }
    }
    if (!p.ground && wasGround) p.fallFrom = p.y;
    if (!p.ground) p.fallFrom = Math.max(p.fallFrom, ny);
    p.y = ny;
    p.wall = p.ground ? 0 : wallSide();

    // goal
    if (!won && p.ground && p.x > GOAL.x0 && p.y >= GOAL.y - 0.01) {
      won = true;
      const t = runT || 0;
      if (!demo) best = best === null ? t : Math.min(best, t);
      goalEl.innerHTML = `<span class="soul">Rooftop reached</span> in ${t.toFixed(1)} s${best !== null ? ` · best ${best.toFixed(1)} s` : ''}`;
      pop('Rooftop!', COL.soul);
    }
    for (const q of pops) { q.t -= dt; q.y += dt * 0.8; }
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t <= 0) pops.splice(i, 1);
    for (const q of trail) q.t -= dt;
    while (trail.length && trail[0].t <= 0) trail.shift();
    flash.t -= dt;
  }

  // ------------------------------------------------------------ demo route
  // A step-by-step autopilot that presses the same buttons you would.
  const demoBtn = el.querySelector('[data-demo]');
  function startDemo() {
    reset();
    const hold = (l, r) => { input.left = l; input.right = r; };
    let i = 0, wait = 0, note = '';
    // walk to x and come to a stop
    const goTo = (x) => () => {
      const d = x - p.x;
      if (Math.abs(d) < 0.15) { hold(false, false); return Math.abs(p.vx) < 0.2; }
      hold(d < 0, d > 0); return false;
    };
    const landedAbove = (y) => () => p.ground && p.y > y;
    const doubleAtApex = () => { if (p.vy < 0.8 && !p.airJump) input.jump = true; return p.airJump; };
    const S = [
      { say: 'Walk up the stoop', do: goTo(4.4) },
      { say: 'Jump, then jump again in the air', do: () => { input.jump = true; hold(false, true); return true; } },
      { do: doubleAtApex },
      { do: () => { hold(false, p.x < 6.2); return p.ground && p.y > 2.9; } },
      { say: 'Step back from the wall', do: goTo(6.3) },
      { say: 'Wait for stamina to refill', do: () => p.stamina > 1.05 },
      { say: 'Straight up to the next landing', do: () => { input.jump = true; return true; } },
      { do: doubleAtApex },
      { do: landedAbove(5.1) },
      { say: 'Wait for stamina', do: () => p.stamina > 1.05 },
      { say: 'Jump toward the wall, then a free wall jump', do: () => { hold(false, true); input.jump = true; return true; } },
      { do: () => { hold(false, true); if (p.wall === 1 && p.vy < 2.5 && p.wallJumps === 0) input.jump = true; return p.wallJumps > 0 || (p.ground && p.y > 6.9); } },
      { do: () => { hold(false, true); if (!p.ground && p.vy < 0 && p.y < 7.2 && !p.airJump) input.jump = true; return p.ground && p.y > 6.9; } },
      { say: 'Back up for a run-up and let stamina refill', do: goTo(10) },
      { do: () => p.stamina > 2.05 },
      { say: 'Run, dash, and jump during the dash: a dash-jump', do: () => { hold(false, true); return p.x > 15.0; } },
      { do: () => { input.dash = true; return true; } },
      { do: () => { if (p.dashT > 0 && p.dashT < P.DASH_T - 0.05) { input.jump = true; return true; } return false; } },
      { do: () => { hold(false, true); return p.ground && p.y > 6.9 && p.x > 25.6; } },
      { say: 'Catch your breath', do: goTo(29.5) },
      { do: () => p.stamina > 2.0 },
      { say: 'Jump at the tower and climb it with wall jumps', do: () => { hold(false, true); return p.x > 31.3; } },
      { do: () => { input.jump = true; return true; } },
      { do: () => { hold(false, true); if (p.wall === 1 && p.vy < 2) { input.jump = true; return true; } return p.ground && p.y > 11; } },
      { do: () => { hold(false, true); if (p.vy < 0.5 && !p.airJump) { input.jump = true; return true; } return p.ground && p.y > 11; } },
      { do: () => { hold(false, true); if (p.wall === 1 && p.vy < 1) { input.jump = true; return true; } return p.ground && p.y > 11; } },
      { do: () => { hold(false, true); return p.ground && p.y > 11; } },
      { say: 'Made it', do: goTo(38) },
    ];
    demo = {
      tick(dt) {
        wait += dt;
        if (wait > 14) { demo.finish(false); return; } // a step stalled
        const s = S[i];
        if (!s) { demo.finish(true); return; }
        if (s.say && s.say !== note) { note = s.say; hudNote = note; }
        if (s.do()) { i++; wait = 0; }
      },
      finish(ok) {
        input.left = input.right = false; demo = null; hudNote = ok ? (won ? 'Your turn. Press Reset and try it.' : '') : 'The demo slipped. Press Reset and try it yourself.';
        demoBtn.setAttribute('aria-pressed', 'false'); demoBtn.textContent = 'Watch a route';
      },
    };
    demoBtn.setAttribute('aria-pressed', 'true'); demoBtn.textContent = 'Stop demo';
  }
  let hudNote = '';
  demoBtn.addEventListener('click', () => { if (demo) demo.finish(true); else startDemo(); });
  el.querySelector('[data-mreset]').addEventListener('click', () => { if (demo) demo.finish(true); reset(); hudNote = ''; view.focus(); });

  // ------------------------------------------------------------ input
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash',
    KeyC: 'slide', ControlLeft: 'slide', ControlRight: 'slide', ArrowDown: 'slide', KeyS: 'slide',
  };
  el.addEventListener('keydown', (e) => {
    const k = KEYS[e.code]; if (!k) return;
    if (e.target.closest('button') && (e.code === 'Space' || e.code === 'Enter')) return;
    e.preventDefault();
    if (demo) return;
    if (k === 'jump' || k === 'dash') { if (!e.repeat) input[k] = true; } else input[k] = true;
  });
  el.addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k && k !== 'jump' && k !== 'dash') input[k] = false; });
  view.addEventListener('blur', () => { input.left = input.right = input.slide = false; });
  view.addEventListener('pointerdown', () => view.focus());
  el.querySelectorAll('[data-hold]').forEach((b) => {
    const k = b.dataset.hold;
    const on = (e) => { e.preventDefault(); if (!demo) input[k] = true; b.setAttribute('aria-pressed', 'true'); };
    const off = () => { input[k] = false; b.setAttribute('aria-pressed', 'false'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  el.querySelectorAll('[data-tap]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (!demo) input[b.dataset.tap] = true; });
    b.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!demo) input[b.dataset.tap] = true; } });
  });

  // ------------------------------------------------------------ drawing
  const R = rng(1911);
  const skyline = []; // distant setback silhouettes for parallax
  for (let x = -6; x < 70;) { const w = 2 + R() * 5, h = 6 + Math.pow(R(), 1.6) * 20; skyline.push({ x, w, h, tiers: 1 + Math.floor(R() * 3), spire: R() < 0.25 }); x += w + R() * 1.2; }
  const winHash = (a, b) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
  let cam = { x: 0, ppm: 24, ox: 0, ground: 0 };
  function camera() {
    const { W, H } = box;
    const ppm = Math.min(Math.max(W / WORLD_W, 16), H / 16);
    const visW = W / ppm;
    const target = clamp(p.x - visW * 0.42, 0, Math.max(0, WORLD_W - visW));
    cam.x = visW >= WORLD_W ? -(visW - WORLD_W) / 2 : lerp(cam.x, target, 0.12);
    cam.ppm = ppm;
    // keep the player in view vertically on short screens
    const visH = H / ppm;
    const top = p.y + P.H + 2.5;
    cam.ground = 1.0 - Math.max(0, top - (visH - 1.0));
  }
  const sx = (x) => (x - cam.x) * cam.ppm;
  const sy = (y) => box.H - (y + cam.ground) * cam.ppm;

  function windows(r, color, lit, cols, rows, pad = 0.6) {
    const w = (r.x1 - r.x0 - pad * 2) / cols, h = (r.y1 - r.y0 - 1.6) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const on = winHash(r.x0 + i, j) < lit;
      ctx.fillStyle = on ? '#f6c879' : color;
      ctx.globalAlpha = on ? 0.85 : 1;
      ctx.fillRect(sx(r.x0 + pad + i * w + w * 0.25), sy(r.y0 + 1 + j * h + h * 0.8), w * 0.5 * cam.ppm, h * 0.55 * cam.ppm);
    }
    ctx.globalAlpha = 1;
  }
  function draw() {
    const { W, H, dpr } = box;
    camera();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07090c'); g.addColorStop(0.7, '#151a23'); g.addColorStop(1, '#1d222b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // moon
    const mg = ctx.createRadialGradient(W * 0.8, H * 0.18, 0, W * 0.8, H * 0.18, 70);
    mg.addColorStop(0, 'rgba(232,226,212,0.55)'); mg.addColorStop(0.2, 'rgba(232,226,212,0.18)'); mg.addColorStop(1, 'rgba(232,226,212,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);
    // parallax skyline
    const par = 0.35;
    ctx.fillStyle = '#121720';
    for (const b of skyline) {
      const bx = (b.x - cam.x * par) * cam.ppm * 0.9;
      let y = 0, w = b.w, x = bx;
      for (let t = 0; t < b.tiers; t++) {
        const th = b.h / b.tiers;
        ctx.fillRect(x, sy(y + th) - 0, w * cam.ppm * 0.9, th * cam.ppm);
        y += th; x += w * cam.ppm * 0.09; w *= 0.8;
      }
      if (b.spire) { ctx.beginPath(); ctx.moveTo(x, sy(y)); ctx.lineTo(x + w * cam.ppm * 0.45, sy(y + 3)); ctx.lineTo(x + w * cam.ppm * 0.9, sy(y)); ctx.fill(); }
    }
    // street
    ctx.fillStyle = '#0f1216'; ctx.fillRect(0, sy(0), W, H - sy(0));
    ctx.fillStyle = COL.brass2; ctx.fillRect(0, sy(0), W, 1);
    // ramp + stoop
    ctx.fillStyle = '#3a2620';
    ctx.beginPath(); ctx.moveTo(sx(RAMP.x0), sy(0)); ctx.lineTo(sx(RAMP.x1), sy(RAMP.h)); ctx.lineTo(sx(RAMP.x1), sy(0)); ctx.fill();
    ctx.strokeStyle = '#6b4a3a'; ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) { const x = lerp(RAMP.x0, RAMP.x1, k / 6); ctx.beginPath(); ctx.moveTo(sx(x), sy(terrain(x))); ctx.lineTo(sx(x), sy(0)); ctx.stroke(); }
    // stoop landing
    ctx.fillStyle = '#3a2620'; ctx.fillRect(sx(STOOP.x0), sy(STOOP.y), (STOOP.x1 - STOOP.x0) * cam.ppm, STOOP.y * cam.ppm);
    ctx.fillStyle = '#6b4a3a'; ctx.fillRect(sx(STOOP.x0), sy(STOOP.y), (STOOP.x1 - STOOP.x0) * cam.ppm, 2);
    // buildings
    for (const r of SOLIDS) {
      const x = sx(r.x0), y = sy(r.y1), w = (r.x1 - r.x0) * cam.ppm, h = (r.y1 - r.y0) * cam.ppm;
      if (r.kind === 'stoop') { ctx.fillStyle = '#3a2620'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#6b4a3a'; ctx.fillRect(x, y, w, 2); continue; }
      if (r.kind === 'dumpster') { ctx.fillStyle = '#26402f'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#35553f'; ctx.fillRect(x - 2, y, w + 4, 3); continue; }
      ctx.fillStyle = r.kind === 'brownstone' ? '#3f2a22' : r.kind === 'brick' ? '#3a2422' : '#262a31';
      ctx.fillRect(x, y, w, h);
      if (r.kind === 'brownstone') windows(r, '#20150f', 0.35, 3, 2);
      if (r.kind === 'brick') windows(r, '#1d1212', 0.3, 2, 2);
      if (r.kind === 'tower') {
        windows(r, '#15181d', 0.28, 5, 4);
        ctx.fillStyle = '#2f343c'; ctx.fillRect(x - 3, y, w + 6, 5);
      }
      // cornice
      ctx.fillStyle = r.kind === 'tower' ? '#3a404a' : '#5a3d30';
      ctx.fillRect(x - 4, y - 3, w + 8, 4);
      ctx.fillStyle = COL.brass2; ctx.globalAlpha = 0.5; ctx.fillRect(x - 4, y - 3, w + 8, 1); ctx.globalAlpha = 1;
    }
    // star anchor plates on the brownstone
    ctx.fillStyle = '#1b120d';
    for (const ax of [9.2, 15.8]) { const cx = sx(ax), cy = sy(4.1); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6); ctx.lineWidth = 2; ctx.strokeStyle = '#1b120d'; ctx.stroke(); } }
    // fire escapes
    ctx.strokeStyle = '#4b4f57'; ctx.lineWidth = 2;
    for (const o of ONEWAY) {
      ctx.beginPath(); ctx.moveTo(sx(o.x0), sy(o.y)); ctx.lineTo(sx(o.x1), sy(o.y)); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx(o.x0), sy(o.y + 0.9)); ctx.lineTo(sx(o.x1), sy(o.y + 0.9)); ctx.stroke();
      for (let x = o.x0; x <= o.x1 + 0.01; x += 0.45) { ctx.beginPath(); ctx.moveTo(sx(x), sy(o.y)); ctx.lineTo(sx(x), sy(o.y + 0.9)); ctx.stroke(); }
      ctx.lineWidth = 2;
    }
    ctx.lineWidth = 1;
    for (const [a, b] of [[ONEWAY[0], ONEWAY[1]], [ONEWAY[2], ONEWAY[3]]]) { // ladders
      ctx.beginPath(); ctx.moveTo(sx(a.x0 + 0.4), sy(a.y)); ctx.lineTo(sx(b.x1 - 0.5), sy(b.y)); ctx.stroke();
    }
    // bishop's crook lamppost in the gap street
    { const lx = sx(20.5); ctx.strokeStyle = '#3b3f46'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, sy(0)); ctx.lineTo(lx, sy(4.6)); ctx.quadraticCurveTo(lx, sy(5.4), lx + 0.9 * cam.ppm, sy(5.2)); ctx.stroke();
      const lg = ctx.createRadialGradient(lx + 0.9 * cam.ppm, sy(4.9), 0, lx + 0.9 * cam.ppm, sy(4.9), 3 * cam.ppm);
      lg.addColorStop(0, 'rgba(246,200,121,0.5)'); lg.addColorStop(1, 'rgba(246,200,121,0)'); ctx.fillStyle = lg; ctx.fillRect(lx - 3 * cam.ppm, sy(8), 7 * cam.ppm, 8 * cam.ppm); }
    // water tower (the goal)
    { const bx = sx(39), by = sy(GOAL.y), w = 3 * cam.ppm;
      ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 2;
      for (const k of [0.15, 0.85]) { ctx.beginPath(); ctx.moveTo(bx + w * k, by); ctx.lineTo(bx + w * k, by - 1.6 * cam.ppm); ctx.stroke(); }
      ctx.fillStyle = '#5a4632'; ctx.fillRect(bx, by - 4.1 * cam.ppm, w, 2.5 * cam.ppm);
      ctx.strokeStyle = '#3a2c20'; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(bx, by - (1.6 + k * 0.62) * cam.ppm); ctx.lineTo(bx + w, by - (1.6 + k * 0.62) * cam.ppm); ctx.stroke(); }
      ctx.fillStyle = '#3d3024'; ctx.beginPath(); ctx.moveTo(bx - 4, by - 4.1 * cam.ppm); ctx.lineTo(bx + w / 2, by - 5.3 * cam.ppm); ctx.lineTo(bx + w + 4, by - 4.1 * cam.ppm); ctx.fill();
      const pulse = 0.5 + 0.5 * Math.sin(clock * 3);
      const gg = ctx.createRadialGradient(bx + w / 2, by - 3 * cam.ppm, 0, bx + w / 2, by - 3 * cam.ppm, 3.5 * cam.ppm);
      gg.addColorStop(0, `rgba(127,240,224,${won ? 0.45 : 0.12 + pulse * 0.12})`); gg.addColorStop(1, 'rgba(127,240,224,0)');
      ctx.fillStyle = gg; ctx.fillRect(bx - 3 * cam.ppm, by - 7 * cam.ppm, w + 6 * cam.ppm, 8 * cam.ppm);
    }
    // trail + hero
    for (const q of trail) {
      ctx.globalAlpha = clamp(q.t / 0.25) * (q.dust ? 0.5 : 0.35);
      ctx.fillStyle = q.dust ? COL.dim : COL.sapphire;
      if (q.dust) ctx.fillRect(sx(q.x) - 2, sy(q.y) - 2, 4, 2);
      else heroShape(sx(q.x), sy(q.y), q.slide, true);
    }
    ctx.globalAlpha = 1;
    heroShape(sx(p.x), sy(p.y), p.slide, false);
    // pips over head
    pips(sx(p.x) - 17, sy(p.y + height()) - 16, 10, 5);
    // pops
    ctx.font = '500 11px "DM Mono", monospace'; ctx.textAlign = 'center';
    for (const q of pops) { ctx.globalAlpha = clamp(q.t); ctx.fillStyle = q.color; ctx.fillText(q.text.toUpperCase(), sx(q.x), sy(q.y)); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    // HUD
    hudEl.innerHTML = `<span class="lbl" style="color:var(--dim)">Stamina</span> <span data-big></span>${p.sprinting ? ' · <span class="amber">sprinting</span>' : ''}<br>` +
      `<span style="color:var(--brass)">${hudNote || '&nbsp;'}</span>`;
    const big = hudEl.querySelector('[data-big]');
    big.innerHTML = [0, 1, 2].map((i) => {
      const f = clamp(p.stamina - i);
      const fl = flash.t > 0 ? (flash.color === COL.blood ? 'var(--blood)' : (i >= Math.floor(p.stamina) && i < Math.ceil(p.stamina + flash.n) ? '#fff' : '')) : '';
      return `<i style="display:inline-block;width:26px;height:8px;margin-right:3px;vertical-align:middle;border:1px solid ${fl || 'var(--soul)'};background:linear-gradient(90deg,var(--soul) ${f * 100}%,transparent ${f * 100}%)"></i>`;
    }).join('');
  }
  function pips(x, y, w, h) {
    for (let i = 0; i < 3; i++) {
      const f = clamp(p.stamina - i);
      ctx.strokeStyle = flash.t > 0 && flash.color === COL.blood ? COL.blood : 'rgba(127,240,224,0.8)';
      ctx.strokeRect(x + i * (w + 2) + 0.5, y + 0.5, w, h);
      ctx.fillStyle = flash.t > 0 && i >= Math.floor(p.stamina) && i < Math.ceil(p.stamina + flash.n) && flash.color !== COL.blood ? '#ffffff' : COL.soul;
      ctx.fillRect(x + i * (w + 2) + 0.5, y + 0.5, w * f, h);
    }
  }
  function heroShape(x, y, sliding, ghost) {
    const u = cam.ppm;
    ctx.save(); ctx.translate(x, y);
    if (p.face < 0) ctx.scale(-1, 1);
    if (sliding) ctx.rotate(-1.2);
    if (!ghost) ctx.fillStyle = COL.paper;
    // legs
    ctx.fillRect(-0.22 * u, -0.85 * u, 0.16 * u, 0.85 * u); ctx.fillRect(0.06 * u, -0.85 * u, 0.16 * u, 0.85 * u);
    // coat
    if (!ghost) ctx.fillStyle = '#5a4632';
    ctx.beginPath(); ctx.moveTo(-0.34 * u, -0.6 * u); ctx.lineTo(0.34 * u, -0.6 * u); ctx.lineTo(0.24 * u, -1.45 * u); ctx.lineTo(-0.24 * u, -1.45 * u); ctx.fill();
    // head + fedora
    if (!ghost) ctx.fillStyle = COL.paper;
    ctx.beginPath(); ctx.arc(0, -1.6 * u, 0.17 * u, 0, 7); ctx.fill();
    if (!ghost) ctx.fillStyle = '#1f1a16';
    ctx.fillRect(-0.3 * u, -1.75 * u, 0.6 * u, 0.06 * u); ctx.fillRect(-0.16 * u, -1.92 * u, 0.32 * u, 0.18 * u);
    // gun arm
    if (!ghost) ctx.fillStyle = '#8b8378';
    ctx.fillRect(0.1 * u, -1.25 * u, 0.5 * u, 0.09 * u);
    ctx.restore();
  }

  const lp = loop(view, step, draw);
  window.__move = { p, input, step, reset, startDemo, advance: lp.advance, get demo() { return demo; } };
}

// ================================================================ ZIPLINE
// Lane length and running speed are assumptions (marked in the caption).
const LANE_M = 360, RUN_MS = 7;
const ZLANES = [
  { name: 'York', color: '#e6c24a', speed: 21 },
  { name: 'Broadway', color: '#6b97ff', speed: 18 },
  { name: 'Greenwich', color: '#6fbf73', speed: 21 },
];
export function zipline(el) {
  const view = el.querySelector('.view');
  const box = canvasIn(view);
  const { ctx } = box;
  const push = el.querySelector('#zpush');
  const out = el.querySelector('[data-zout]');
  const expressBtn = el.querySelector('[data-express]');
  const boostBtn = el.querySelector('[data-boost]');
  let lane = 0, boost = false, express = false;
  const ride = { on: false, t: 0, rider: 0, runner: 0, done: false };
  const SPEEDUP = 4; // animation plays faster than real time

  const front = () => +push.value;           // fraction of the lane your troopers hold
  const expressReady = () => front() >= 0.9;
  const speed = () => ZLANES[lane].speed * (boost || express ? 1.8 : 1);
  const dist = () => front() * LANE_M;

  function update() {
    if (!expressReady() && express) { express = false; }
    expressBtn.disabled = !expressReady();
    expressBtn.setAttribute('aria-pressed', String(express));
    boostBtn.setAttribute('aria-pressed', String(boost));
    el.querySelectorAll('[data-zlane]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.zlane === lane)));
    const d = dist(), v = speed();
    out.innerHTML = `Your troopers hold <b>${Math.round(d)} m</b> of this lane. Riding: <b class="soul">${(d / v).toFixed(1)} s</b> at ${v.toFixed(1)} m/s${express ? ' (Express Line)' : boost ? ' (boosted)' : ''}. Running: <b>${(d / RUN_MS).toFixed(0)} s</b>.`;
    draw();
  }
  push.addEventListener('input', () => { ride.on = false; update(); });
  el.querySelectorAll('[data-zlane]').forEach((b) => b.addEventListener('click', () => { lane = +b.dataset.zlane; update(); }));
  boostBtn.addEventListener('click', () => { boost = !boost; update(); });
  expressBtn.addEventListener('click', () => { express = !express; update(); });
  el.querySelector('[data-ride]').addEventListener('click', () => {
    Object.assign(ride, { on: true, t: 0, rider: 0, runner: 0, done: false });
    if (reduceMotion) { ride.rider = dist(); ride.runner = Math.min(dist(), RUN_MS * dist() / speed()); ride.t = dist() / speed(); ride.done = true; }
  });

  function step(dt) {
    if (!ride.on || ride.done) return;
    ride.t += dt * SPEEDUP;
    ride.rider = Math.min(dist(), ride.t * speed());
    ride.runner = Math.min(dist(), ride.t * RUN_MS);
    if (ride.rider >= dist()) { ride.done = true; }
  }
  let clock = 0;
  function draw() {
    const { W, H, dpr } = box;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.ink2; ctx.fillRect(0, 0, W, H);
    const L = ZLANES[lane];
    const x0 = 46, x1 = W - 46, mx = (f) => lerp(x0, x1, f);
    const railY = H * 0.36, roadY = H * 0.66;
    // road
    ctx.fillStyle = '#1c2026'; ctx.fillRect(x0, roadY - 10, x1 - x0, 20);
    ctx.fillStyle = L.color; ctx.globalAlpha = 0.5; ctx.fillRect(x0, roadY - 0.5, x1 - x0, 1); ctx.globalAlpha = 1;
    // bases
    ctx.font = '500 11px "DM Mono", monospace';
    ctx.fillStyle = COL.amber; ctx.fillRect(x0 - 30, roadY - 26, 22, 36);
    ctx.fillStyle = COL.sapphire; ctx.fillRect(x1 + 8, roadY - 26, 22, 36);
    ctx.fillStyle = COL.dim; ctx.textAlign = 'left'; ctx.fillText('YOUR BASE', x0 - 30, roadY + 30);
    ctx.textAlign = 'right'; ctx.fillText('ENEMY BASE', x1 + 30, roadY + 30); ctx.textAlign = 'left';
    // towers (as in Chapter II)
    const towers = [[0.085, 'BG'], [0.2, 'W'], [0.36, 'G']];
    for (const [f, n] of towers) {
      for (const [ff, col, mine] of [[f, COL.amber, true], [1 - f, COL.sapphire, false]]) {
        const dead = !mine && front() > ff - 0.02;
        ctx.globalAlpha = dead ? 0.25 : 1;
        ctx.fillStyle = col; ctx.fillRect(mx(ff) - 4, roadY - 24, 8, 14);
        ctx.fillStyle = COL.dim; ctx.textAlign = 'center'; ctx.fillText(n, mx(ff), roadY - 30); ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }
    }
    // troopers clumped at the front
    const fx = mx(front());
    for (let i = 0; i < 4; i++) { ctx.fillStyle = COL.amber; ctx.beginPath(); ctx.arc(fx - 6 - i * 7, roadY + 3 - (i % 2) * 6, 3.2, 0, 7); ctx.fill(); }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = COL.sapphire; ctx.beginPath(); ctx.arc(fx + 8 + i * 7, roadY + 3 - (i % 2) * 6, 3.2, 0, 7); ctx.fill(); }
    ctx.strokeStyle = COL.paper; ctx.globalAlpha = 0.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(fx, railY - 18); ctx.lineTo(fx, roadY + 14); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = COL.paper; ctx.textAlign = 'center'; ctx.fillText('FRONT', fx, railY - 24); ctx.textAlign = 'left';
    // pylons + rail
    ctx.strokeStyle = '#3b3f46'; ctx.lineWidth = 2;
    for (let f = 0; f <= 1.0001; f += 0.125) { ctx.beginPath(); ctx.moveTo(mx(f), railY); ctx.lineTo(mx(f), roadY - 10); ctx.stroke(); }
    ctx.lineWidth = 1; ctx.strokeStyle = '#2c3138'; ctx.beginPath(); ctx.moveTo(x0, railY); ctx.lineTo(x1, railY); ctx.stroke();
    const grad = ctx.createLinearGradient(x0, 0, fx, 0);
    grad.addColorStop(0, L.color); grad.addColorStop(1, L.color);
    ctx.save(); ctx.shadowColor = L.color; ctx.shadowBlur = express || boost ? 16 : 9;
    ctx.strokeStyle = grad; ctx.lineWidth = express ? 5 : 3; ctx.beginPath(); ctx.moveTo(x0, railY); ctx.lineTo(fx, railY); ctx.stroke(); ctx.restore();
    // sparks running along the live rail
    clock += 1 / 60;
    for (let k = 0; k < 8; k++) {
      const f = ((clock * speed() / LANE_M * 0.6 + k / 8) % 1) * front();
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7; ctx.fillRect(mx(f) - 1, railY - 1, 2, 2); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = COL.dim; ctx.fillText(`${L.name.toUpperCase()} ZIPLINE · ${L.speed} M/S`, x0, railY - 24 > 14 ? 16 : 12);
    // rider and runner
    if (ride.on) {
      const rx = mx(ride.rider / LANE_M), ux = mx(ride.runner / LANE_M);
      ctx.fillStyle = COL.paper; ctx.beginPath(); ctx.arc(rx, railY + 9, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = COL.paper; ctx.beginPath(); ctx.moveTo(rx, railY); ctx.lineTo(rx, railY + 5); ctx.stroke();
      ctx.fillStyle = COL.brass; ctx.beginPath(); ctx.arc(ux, roadY, 5, 0, 7); ctx.fill();
      ctx.font = '500 11px "DM Mono", monospace';
      ctx.fillStyle = COL.soul; ctx.fillText(`ZIP ${(ride.rider / speed()).toFixed(1)} s`, rx + 9, railY + 13);
      ctx.fillStyle = COL.brass; ctx.fillText(`RUN ${(ride.runner / RUN_MS).toFixed(1)} s`, ux - 4, roadY + 24);
    }
  }
  const lp = loop(view, step, draw);
  window.__zip = { advance: lp.advance, ride };
  update();
}
