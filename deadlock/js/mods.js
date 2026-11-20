// Chapter IX: mods & movies.
//  editor(el)  – mod a tiny lane map, then share it as a gift (2D canvas)
//  tree(el)    – mods that became genres, companies and Valve hires (SVG)
//  filmset(el) – a Source Filmmaker-style set: pose lights, keyframe a camera, roll (three.js)
import { THREE, stage, glowSprite, rng, C, clamp, lerp, smooth, reduceMotion } from './lib.js';

const css = () => getComputedStyle(document.documentElement);
const tok = (n) => css().getPropertyValue(n).trim();

// =================================================================== EDITOR
const SWATCH = ['#f0a43a', '#ff6fa8', '#7ff0e0', '#b4ff5a', '#c49bff', '#e8e2d4'];
const SKINS = ['Plain', 'Top hat', 'Antlers', 'Halo', 'Cat ears', 'Crown'];

function bez(l, t) { // quadratic bezier from base A (bottom) to base B (top)
  const a = { x: 0.5, y: 0.9 }, b = { x: 0.5, y: 0.1 }, m = l.mid;
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * m.x + t * t * b.x, y: u * u * a.y + 2 * u * t * m.y + t * t * b.y };
}
function freshMod() {
  return {
    lanes: [{ mid: { x: 0.12, y: 0.5 }, col: '#e6c24a' }, { mid: { x: 0.5, y: 0.5 }, col: '#6b97ff' }, { mid: { x: 0.88, y: 0.5 }, col: '#6fbf73' }],
    towers: [], tcol: SWATCH[0], tsize: 1, skin: 0, troopers: [], hero: { lane: 1, t: 0.3, dir: 1 }, spawn: 0,
  };
}
function seedTowers(m) {
  m.towers = [];
  m.lanes.forEach((l, i) => { for (const [t, team] of [[0.3, 0], [0.7, 1]]) { const p = bez(l, t); m.towers.push({ x: p.x + 0.035, y: p.y, team }); } });
}
function snapshot(m) { return JSON.parse(JSON.stringify({ ...m, troopers: [] })); }

function drawMap(ctx, x0, y0, w, h, m, t, opts = {}) {
  const X = (u) => x0 + u * w, Y = (v) => y0 + v * h, s = Math.min(w, h);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = '#0f1216'; ctx.fillRect(x0, y0, w, h);
  // faint city blocks
  ctx.fillStyle = 'rgba(232,226,212,0.035)';
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) ctx.fillRect(X(i / 9 + 0.012), Y(j / 9 + 0.012), w / 9 - s * 0.02, h / 9 - s * 0.02);
  // lanes
  for (const l of m.lanes) {
    ctx.strokeStyle = l.col; ctx.lineWidth = Math.max(1.5, s * 0.022); ctx.globalAlpha = 0.85; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) { const p = bez(l, i / 30); i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y)); }
    ctx.stroke(); ctx.globalAlpha = 1;
    if (opts.handles) { // bend handle
      const p = bez(l, 0.5);
      ctx.strokeStyle = '#e8e2d4'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), s * 0.03, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // bases
  for (const [v, c] of [[0.9, '#f0a43a'], [0.1, '#6b97ff']]) {
    const g = ctx.createRadialGradient(X(0.5), Y(v), 0, X(0.5), Y(v), s * 0.12);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X(0.5), Y(v), s * 0.12, 0, 7); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(0.5), Y(v), s * 0.035, 0, 7); ctx.fill();
  }
  // towers
  for (const tw of m.towers) {
    const c = tw.team ? '#6b97ff' : '#f0a43a', r = s * 0.026;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(X(tw.x), Y(tw.y) - r * 1.3); ctx.lineTo(X(tw.x) + r, Y(tw.y) + r); ctx.lineTo(X(tw.x) - r, Y(tw.y) + r); ctx.closePath(); ctx.fill();
    if (opts.handles && tw.hot) { ctx.strokeStyle = '#e8e2d4'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(tw.x), Y(tw.y), r * 2, 0, 7); ctx.stroke(); }
  }
  // troopers
  const tr = s * 0.013 * m.tsize;
  for (const p of m.troopers) {
    const l = m.lanes[p.lane]; if (!l) continue;
    const q = bez(l, p.t);
    ctx.fillStyle = p.team ? '#6b97ff' : m.tcol;
    ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), tr, 0, 7); ctx.fill();
  }
  // hero with skin
  const hl = m.lanes[Math.min(m.hero.lane, m.lanes.length - 1)];
  if (hl) {
    const q = bez(hl, m.hero.t), hx = X(q.x), hy = Y(q.y), r = s * 0.028;
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 3); g.addColorStop(0, 'rgba(255,248,234,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, r * 3, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.arc(hx, hy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle = m.tcol; ctx.lineWidth = Math.max(1.2, r * 0.3);
    const k = m.skin;
    if (k === 1) { ctx.fillRect(hx - r * 0.7, hy - r * 2.3, r * 1.4, r * 1.3); ctx.fillRect(hx - r * 1.2, hy - r * 1.05, r * 2.4, r * 0.3); }
    if (k === 2) { ctx.beginPath(); ctx.moveTo(hx - r * 0.5, hy - r * 0.8); ctx.lineTo(hx - r * 1.4, hy - r * 2.2); ctx.moveTo(hx - r, hy - r * 1.6); ctx.lineTo(hx - r * 1.8, hy - r * 1.7); ctx.moveTo(hx + r * 0.5, hy - r * 0.8); ctx.lineTo(hx + r * 1.4, hy - r * 2.2); ctx.moveTo(hx + r, hy - r * 1.6); ctx.lineTo(hx + r * 1.8, hy - r * 1.7); ctx.stroke(); }
    if (k === 3) { ctx.beginPath(); ctx.ellipse(hx, hy - r * 1.6, r * 1.1, r * 0.35, 0, 0, 7); ctx.stroke(); }
    if (k === 4) { for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx + sx * r * 0.3, hy - r * 0.8); ctx.lineTo(hx + sx * r * 0.9, hy - r * 1.9); ctx.lineTo(hx + sx * r * 1.0, hy - r * 0.5); ctx.fill(); } }
    if (k === 5) { ctx.beginPath(); ctx.moveTo(hx - r, hy - r * 0.9); for (let i = 0; i <= 4; i++) { ctx.lineTo(hx - r + (i * r) / 2, hy - r * (i % 2 ? 1.3 : 2.1)); } ctx.lineTo(hx + r, hy - r * 0.9); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}

export function editor(el) {
  const view = el.querySelector('.view');
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  const ctx = cv.getContext('2d');
  const R = rng(77);
  let W = 1, H = 1, dpr = 1, visible = false;
  const mod = freshMod(); seedTowers(mod);
  let copies = []; // {x,y,w,h, mod, born}
  let packets = []; // {from,to,t}
  let gen = 0;
  const out = el.querySelector('[data-shared]');

  function layout() {
    const narrow = W < 620;
    const ms = narrow ? Math.min(W - 24, H * 0.56) : Math.min(H - 24, W * 0.46);
    const mx = narrow ? (W - ms) / 2 : 14, my = 12;
    return { narrow, ms, mx, my };
  }
  function screenSlots() {
    const { narrow, ms, mx, my } = layout();
    const slots = [];
    if (narrow) {
      const y0 = my + ms + 14, cols = 6, sw = (W - 24 - (cols - 1) * 6) / cols;
      const rows = Math.max(1, Math.floor((H - y0 - 8) / (sw + 6)));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push({ x: 12 + c * (sw + 6), y: y0 + r * (sw + 6), w: sw, h: sw });
    } else {
      const x0 = mx + ms + 22, cols = 5, sw = (W - x0 - 14 - (cols - 1) * 8) / cols;
      const rows = Math.max(1, Math.floor((H - 30) / (sw + 8)));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push({ x: x0 + c * (sw + 8), y: 24 + r * (sw + 8), w: sw, h: sw });
    }
    return slots;
  }

  function share() {
    const slots = screenSlots();
    const snap = snapshot(mod);
    const want = Math.min(slots.length, gen === 0 ? 3 : copies.length * 3);
    const { ms, mx, my } = layout();
    const sources = copies.length ? copies.slice() : [{ x: mx, y: my, w: ms, h: ms }];
    const fresh = [];
    for (let i = copies.length; i < want; i++) {
      const s = slots[i]; if (!s) break;
      const from = sources[Math.floor(R() * sources.length)];
      const c = { ...s, mod: snap, born: performance.now() + 500 + R() * 500 };
      fresh.push(c);
      packets.push({ fx: from.x + from.w / 2, fy: from.y + from.h / 2, tx: s.x + s.w / 2, ty: s.y + s.h / 2, t: -R() * 0.4 });
    }
    // everyone who already has it gets your newest version too
    copies.forEach((c) => { c.mod = snap; c.flash = 1; });
    copies = copies.concat(fresh);
    gen++;
    out.textContent = copies.length >= slots.length ? `Everyone here has your mod. In real life, that's how Counter-Strike and DotA spread.` : `${copies.length} players have your mod.`;
  }
  el.querySelector('[data-share]').addEventListener('click', share);
  el.querySelector('[data-addlane]').addEventListener('click', () => {
    if (mod.lanes.length >= 6) { mod.lanes = mod.lanes.slice(0, 3); seedTowers(mod); return; }
    const cols = ['#c49bff', '#ff6fa8', '#7ff0e0'];
    mod.lanes.push({ mid: { x: 0.15 + R() * 0.7, y: 0.3 + R() * 0.4 }, col: cols[(mod.lanes.length - 3) % 3] });
    const l = mod.lanes[mod.lanes.length - 1];
    for (const [t, team] of [[0.3, 0], [0.7, 1]]) { const p = bez(l, t); mod.towers.push({ x: p.x + 0.035, y: p.y, team }); }
  });
  el.querySelector('[data-skin]').addEventListener('click', (e) => { mod.skin = (mod.skin + 1) % SKINS.length; e.currentTarget.textContent = `Hero skin: ${SKINS[mod.skin]}`; });
  const sw = el.querySelector('[data-swatches]');
  sw.innerHTML = SWATCH.map((c, i) => `<button class="swatch" data-c="${c}" aria-label="Trooper color ${i + 1}" aria-pressed="${i === 0}" style="background:${c}"></button>`).join('');
  sw.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; mod.tcol = b.dataset.c; sw.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  const size = el.querySelector('#mod-size');
  size.addEventListener('input', () => { mod.tsize = +size.value; });
  el.querySelector('[data-resetmod]').addEventListener('click', () => {
    Object.assign(mod, freshMod()); seedTowers(mod); copies = []; packets = []; gen = 0; out.textContent = 'Only you have it so far.';
    el.querySelector('[data-skin]').textContent = 'Hero skin: Plain'; size.value = 1;
    sw.querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(i === 0)));
  });

  // dragging towers and lane bends
  let drag = null;
  const toMap = (e) => { const r = cv.getBoundingClientRect(); const { ms, mx, my } = layout(); return { u: (e.clientX - r.left - mx) / ms, v: (e.clientY - r.top - my) / ms }; };
  function pick(p) {
    const { ms } = layout(); const rad = 0.05 * Math.max(1, 300 / ms);
    let best = null, bd = rad;
    for (const tw of mod.towers) { const d = Math.hypot(tw.x - p.u, tw.y - p.v); if (d < bd) { bd = d; best = { kind: 'tower', o: tw }; } }
    if (!best) for (const l of mod.lanes) { const q = bez(l, 0.5); const d = Math.hypot(q.x - p.u, q.y - p.v); if (d < bd) { bd = d; best = { kind: 'lane', o: l }; } }
    return best;
  }
  cv.addEventListener('pointerdown', (e) => { drag = pick(toMap(e)); if (drag) { cv.setPointerCapture(e.pointerId); e.preventDefault(); } });
  cv.addEventListener('pointermove', (e) => {
    const p = toMap(e);
    mod.towers.forEach((tw) => { tw.hot = false; });
    if (!drag) { const h = pick(p); cv.style.cursor = h ? 'grab' : 'default'; if (h && h.kind === 'tower') h.o.hot = true; return; }
    const u = clamp(p.u, 0.03, 0.97), v = clamp(p.v, 0.03, 0.97);
    if (drag.kind === 'tower') { drag.o.x = u; drag.o.y = v; drag.o.hot = true; }
    else { drag.o.mid.x = clamp(2 * u - 0.5 * 0.5 - 0.5 * 0.5, -0.4, 1.4); drag.o.mid.y = clamp(2 * v - 0.5, -0.2, 1.2); }
  });
  cv.addEventListener('pointerup', () => { drag = null; });

  function step(dt) {
    mod.spawn -= dt;
    if (mod.spawn <= 0) {
      mod.spawn = 1.6;
      mod.lanes.forEach((l, i) => { for (let k = 0; k < 2; k++) { mod.troopers.push({ lane: i, team: 0, t: -k * 0.03 }); mod.troopers.push({ lane: i, team: 1, t: 1 + k * 0.03 }); } });
    }
    for (const p of mod.troopers) p.t += (p.team ? -1 : 1) * dt * 0.09;
    // waves meet and pop
    for (const a of mod.troopers) if (!a.dead && a.team === 0) for (const b of mod.troopers) if (!b.dead && b.team === 1 && b.lane === a.lane && b.t - a.t < 0.025) { a.dead = b.dead = true; break; }
    mod.troopers = mod.troopers.filter((p) => !p.dead && p.t > -0.1 && p.t < 1.1);
    const h = mod.hero; h.t += h.dir * dt * 0.12; if (h.t > 0.62 || h.t < 0.12) h.dir *= -1;
    for (const k of packets) k.t += dt * 1.4;
    packets = packets.filter((k) => k.t < 1.2);
    for (const c of copies) if (c.flash) c.flash = Math.max(0, c.flash - dt * 1.5);
  }
  function draw(now) {
    if (W < 10) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = tok('--ink-2'); ctx.fillRect(0, 0, W, H);
    const { ms, mx, my } = layout();
    drawMap(ctx, mx, my, ms, ms, mod, now, { handles: true });
    ctx.strokeStyle = tok('--brass'); ctx.lineWidth = 1; ctx.strokeRect(mx + 0.5, my + 0.5, ms - 1, ms - 1);
    ctx.font = '10px "DM Mono", monospace'; ctx.fillStyle = tok('--brass'); ctx.textAlign = 'left';
    ctx.fillText('YOUR COPY OF THE GAME', mx + 8, my + ms - 8);
    // other players' screens
    const slots = screenSlots();
    slots.forEach((s, i) => {
      const c = copies[i];
      if (c && now > c.born) {
        drawMap(ctx, s.x, s.y, s.w, s.h, { ...c.mod, troopers: mod.troopers, hero: mod.hero }, now);
        ctx.strokeStyle = c.flash ? `rgba(127,240,224,${0.4 + c.flash})` : 'rgba(127,240,224,0.5)'; ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
      } else {
        ctx.fillStyle = '#0d1014'; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.strokeStyle = tok('--rule'); ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
        // a little stranger at a desk
        ctx.fillStyle = 'rgba(232,226,212,0.12)'; ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + s.h * 0.48, s.w * 0.1, 0, 7); ctx.fill();
        ctx.fillRect(s.x + s.w * 0.36, s.y + s.h * 0.6, s.w * 0.28, s.h * 0.22);
      }
    });
    // gifts in flight
    for (const k of packets) {
      if (k.t < 0) continue;
      const e = smooth(clamp(k.t)), x = lerp(k.fx, k.tx, e), y = lerp(k.fy, k.ty, e) - Math.sin(e * Math.PI) * 40;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, 'rgba(127,240,224,0.95)'); g.addColorStop(1, 'rgba(127,240,224,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill();
    }
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible) { step(dt); draw(now); }
    requestAnimationFrame(loop);
  }
  new ResizeObserver(() => { dpr = Math.min(2, devicePixelRatio || 1); W = view.clientWidth; H = view.clientHeight; cv.width = W * dpr; cv.height = H * dpr; draw(performance.now()); }).observe(view);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(view);
  requestAnimationFrame(loop);
  window.__mods = Object.assign(window.__mods || {}, { editorStep: (secs) => { for (let i = 0; i < secs * 30; i++) step(1 / 30); draw(performance.now() + 5000); }, share, mod });
}

// =================================================================== TREE
// [label, year, kind] kind: base | mod | hire | company | genre | game
const ROWS = [
  { name: 'Smurfs', nodes: [['Castle Wolfenstein', 1981, 'base'], ['Castle Smurfenstein', 1983, 'mod', 'Two teenagers turned the guards into Smurfs. Often called the first mod.']] },
  { name: 'Team Fortress', nodes: [['Quake', 1996, 'base'], ['Team Fortress', 1996.4, 'mod', 'Three friends gave Quake players classes: medic, sniper, engineer.'], ['Hired by Valve', 1998, 'hire', 'Valve hired the creators. Their idea became Team Fortress 2.'], ['Team Fortress 2', 2007, 'game', 'Nine characters you know by shape alone. Deadlock’s heroes descend from them.']] },
  { name: 'Capture the flag', nodes: [['Quake', 1996, 'base'], ['Threewave CTF', 1996.6, 'mod', 'One modder’s rules. Now a standard mode in shooters.'], ['A standard mode', 1999, 'genre', 'Capture the flag became part of nearly every shooter.']] },
  { name: 'Counter-Strike', nodes: [['Half-Life', 1998.8, 'base'], ['Counter-Strike', 1999.5, 'mod', 'Two hobbyists made it free. It became the most-played online shooter on earth.'], ['Bought by Valve', 2000, 'hire', 'Valve bought it and hired them.'], ['Counter-Strike 2', 2023, 'game', 'Still one of Steam’s most-played games.']] },
  { name: 'Subnautica', nodes: [['Half-Life', 1998.8, 'base'], ['Natural Selection', 2002, 'mod', 'Aliens versus marines, one side building a base.'], ['Unknown Worlds', 2006, 'company', 'The mod became a studio, which later made Subnautica.']] },
  { name: 'The MOBA', nodes: [['StarCraft', 1998, 'base'], ['Aeon of Strife', 1999.5, 'mod', 'One hero each, three lanes, endless soldiers. Around 1998–2002; the author is disputed.'], ['DotA', 2003, 'mod', 'A Warcraft III map passed between three volunteer designers.'], ['Hired by Valve', 2009, 'hire', 'Valve hired DotA’s designer, IceFrog. Riot had hired his predecessor.'], ['Dota 2', 2013, 'game', 'Valve’s remake. A world-famous esport.'], ['Deadlock', 2024, 'game', 'The lanes and souls of DotA, played with a gun.']] },
  { name: 'Garry’s Mod', nodes: [['Half-Life 2', 2004.8, 'base'], ['Garry’s Mod', 2004.95, 'mod', 'A sandbox for posing and playing with Half-Life 2’s physics. 20 million sold.'], ['Facepunch', 2009, 'company', 'Garry’s studio, later the makers of Rust.']] },
  { name: 'Battle royale', nodes: [['ARMA 2', 2009, 'base'], ['DayZ', 2012, 'mod', 'A zombie survival mod. Its creator was hired by the studio that made ARMA.'], ['Battle Royale mod', 2013, 'mod', 'Brendan Greene’s last-player-standing rules.'], ['PUBG', 2017, 'game', 'The mod became a game played by millions.'], ['Fortnite BR', 2017.7, 'genre', 'Months later, a whole genre.']] },
  { name: 'Auto-battlers', nodes: [['Dota 2', 2013, 'base'], ['Dota Auto Chess', 2019, 'mod', 'A Dota 2 custom game. 7 million subscribers in its first month.'], ['A new genre', 2019.5, 'genre', 'Within months: Underlords, Teamfight Tactics, Auto Chess.']] },
];
const KIND = { base: ['solid', '--faint', 'The game it was built on'], mod: ['ring', '--paper', 'Fan-made mod'], hire: ['diamond', '--amber', 'Valve hired or bought it'], company: ['square', '--soul', 'Became a studio'], game: ['solid', '--brass', 'Became a game'], genre: ['star', '--sapphire', 'Became a genre'] };

export function tree(el) {
  const box = el.querySelector('[data-tree]');
  const card = el.querySelector('[data-treecard]');
  const Y0 = 1980, Y1 = 2026;
  const W = 900, rowH = 46, top = 34, H = top + ROWS.length * rowH + 30, left = 150, right = 30;
  const X = (y) => left + ((y - Y0) / (Y1 - Y0)) * (W - left - right);
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mods that became games, genres, studios and Valve hires, 1981 to 2024">`;
  for (let y = 1980; y <= 2025; y += 5) s += `<line x1="${X(y)}" y1="${top - 10}" x2="${X(y)}" y2="${H - 24}" stroke="var(--rule)"/><text x="${X(y)}" y="${H - 8}" fill="var(--faint)" font-family="var(--f-mono)" font-size="11" text-anchor="middle">${y}</text>`;
  const shape = (k, x, y, i) => {
    const [sh, c] = KIND[k], col = `var(${c})`;
    const a = `data-i="${i}" tabindex="0" class="tn"`;
    if (sh === 'ring') return `<circle ${a} cx="${x}" cy="${y}" r="7" fill="var(--ink-2)" stroke="${col}" stroke-width="2.5"/>`;
    if (sh === 'diamond') return `<rect ${a} x="${x - 6}" y="${y - 6}" width="12" height="12" transform="rotate(45 ${x} ${y})" fill="${col}"/>`;
    if (sh === 'square') return `<rect ${a} x="${x - 6}" y="${y - 6}" width="12" height="12" fill="${col}"/>`;
    if (sh === 'star') return `<path ${a} d="${[...Array(10)].map((_, j) => { const r = j % 2 ? 4 : 9, an = (j * Math.PI) / 5 - Math.PI / 2; return `${j ? 'L' : 'M'}${x + r * Math.cos(an)} ${y + r * Math.sin(an)}`; }).join('')}Z" fill="${col}"/>`;
    return `<circle ${a} cx="${x}" cy="${y}" r="${k === 'base' ? 5 : 7}" fill="${col}"/>`;
  };
  const flat = [];
  ROWS.forEach((row, r) => {
    const y = top + r * rowH + rowH / 2;
    s += `<text x="${left - 16}" y="${y + 4}" fill="var(--paper)" font-family="var(--f-display)" font-weight="700" font-size="15" letter-spacing="0.6" text-anchor="end">${row.name.toUpperCase()}</text>`;
    const xs = row.nodes.map((n) => X(n[1]));
    s += `<path d="M${xs[0]} ${y} ${xs.slice(1).map((x) => `L${x} ${y}`).join(' ')}" stroke="var(--brass-2)" stroke-width="2" fill="none"/>`;
    row.nodes.forEach((n, j) => {
      const i = flat.length; flat.push({ row: row.name, n });
      s += shape(n[2], xs[j], y, i);
      const lab = n[0];
      const up = j % 2 === 0;
      s += `<text x="${xs[j]}" y="${up ? y - 13 : y + 21}" fill="${n[2] === 'base' ? 'var(--faint)' : 'var(--dim)'}" font-family="var(--f-mono)" font-size="10" text-anchor="middle" pointer-events="none">${lab}</text>`;
    });
  });
  s += '</svg>';
  box.innerHTML = s;
  const legend = el.querySelector('[data-legend]');
  legend.innerHTML = Object.entries(KIND).map(([k, [, c, txt]]) => `<span><i style="background:var(${c});${k === 'mod' ? 'background:transparent;border:2px solid var(' + c + ')' : ''}${k === 'hire' ? ';transform:rotate(45deg);border-radius:0' : ''}${k === 'company' ? ';border-radius:0' : ''}"></i>${txt}</span>`).join('');
  const show = (i) => {
    const { row, n } = flat[i];
    box.querySelectorAll('.tn').forEach((e) => e.classList.toggle('on', +e.dataset.i === i));
    card.innerHTML = `<span class="fig">${Math.floor(n[1])} · ${KIND[n[2]][2]}</span><h4>${n[0]}</h4><p>${n[3] || `The game the ${row} line was built on.`}</p>`;
  };
  box.addEventListener('pointerover', (e) => { const t = e.target.closest('.tn'); if (t) show(+t.dataset.i); });
  box.addEventListener('focusin', (e) => { const t = e.target.closest('.tn'); if (t) show(+t.dataset.i); });
  box.addEventListener('click', (e) => { const t = e.target.closest('.tn'); if (t) show(+t.dataset.i); });
  show(flat.findIndex((f) => f.n[0] === 'Team Fortress'));
}

// =================================================================== FILM SET
export function filmset(el) {
  const view = el.querySelector('.view');
  const s = stage(view, { fov: 35, bg: 0x0a0b0e });
  s.renderer.shadowMap.enabled = true;
  s.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = s.scene;

  // cyclorama: floor curving up into a backdrop
  const cyc = new THREE.Group();
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; cyc.add(floor);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 8, 64, 1, true, Math.PI * 0.6, Math.PI * 0.8), new THREE.MeshStandardMaterial({ color: 0x26272c, roughness: 0.95, side: THREE.BackSide }));
  wall.position.y = 4; wall.receiveShadow = true; cyc.add(wall);
  scene.add(cyc);
  scene.add(new THREE.AmbientLight(0x404858, 0.25));

  // the actor: a TF2-ish caricature in primitives, mid-gesture
  const actor = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b49a, roughness: 0.6 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x7a2e24, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24201e, roughness: 0.8 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9a9284, roughness: 0.3, metalness: 0.8 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; actor.add(m); return m; };
  add(new THREE.CapsuleGeometry(0.17, 0.75, 4, 10), dark, -0.18, 0.55, 0, 0, 0, 0.06);
  add(new THREE.CapsuleGeometry(0.17, 0.75, 4, 10), dark, 0.2, 0.55, 0.05, 0, 0, -0.1);
  add(new THREE.CapsuleGeometry(0.52, 0.6, 6, 16), coat, 0, 1.55, 0);
  add(new THREE.SphereGeometry(0.3, 20, 14), skin, 0.02, 2.35, 0.04);
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), dark, 0.02, 2.55, 0.04, 0.1, 0, -0.08); // brim
  add(new THREE.CylinderGeometry(0.24, 0.27, 0.32, 20), dark, 0.03, 2.72, 0.05, 0.1, 0, -0.08);
  add(new THREE.CapsuleGeometry(0.12, 0.6, 4, 8), coat, 0.6, 1.95, 0.15, 0, 0, -2.3); // raised arm
  add(new THREE.SphereGeometry(0.13, 12, 10), skin, 0.98, 2.42, 0.2);
  add(new THREE.CapsuleGeometry(0.12, 0.55, 4, 8), coat, -0.58, 1.35, 0.15, 0.3, 0, 0.4);
  add(new THREE.BoxGeometry(1.1, 0.12, 0.12), metal, -0.75, 1.0, 0.35, 0, 0.4, 0.5); // a wrench, why not
  actor.rotation.y = 0.35;
  scene.add(actor);
  // a prop crate
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x6d5434, roughness: 0.8 }));
  crate.position.set(-1.8, 0.45, -0.6); crate.rotation.y = 0.5; crate.castShadow = crate.receiveShadow = true; scene.add(crate);

  // three-point lighting with draggable bulbs
  const mkLight = (name, color, intensity, angle, height, dist) => {
    const l = new THREE.SpotLight(color, intensity, 30, 0.6, 0.5, 1.2);
    l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0005;
    l.target.position.set(0, 1.5, 0); scene.add(l.target); scene.add(l);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color }));
    const halo = glowSprite(color, 1.6, 0.8); bulb.add(halo);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 6), new THREE.MeshBasicMaterial({ color: 0x55504a }));
    scene.add(bulb); scene.add(stand);
    const L = { name, l, bulb, stand, angle, height, dist, on: true, base: intensity };
    bulb.userData.light = L;
    place(L);
    return L;
  };
  function place(L) {
    const x = Math.sin(L.angle) * L.dist, z = Math.cos(L.angle) * L.dist;
    L.l.position.set(x, L.height, z); L.bulb.position.set(x, L.height, z);
    L.stand.scale.y = L.height; L.stand.position.set(x, L.height / 2, z);
  }
  const lights = [
    mkLight('Key', 0xffd9a8, 60, 0.9, 4.2, 5),
    mkLight('Fill', 0x9db8ff, 14, -1.1, 2.6, 5.5),
    mkLight('Rim', 0xfff4e0, 70, Math.PI - 0.5, 4.6, 5),
  ];

  // the film camera: a little gizmo on the set + keyframes
  const gizmo = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.6), new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.5 }));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.3 }));
  lens.rotation.x = Math.PI / 2; lens.position.z = -0.42; gizmo.add(body, lens);
  for (const zz of [0.1, -0.1]) { const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 18), new THREE.MeshStandardMaterial({ color: 0x2a2a2e })); reel.rotation.z = Math.PI / 2; reel.position.set(0, 0.32, zz * 2); gizmo.add(reel); }
  scene.add(gizmo);
  const path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: C.soul, dashSize: 0.15, gapSize: 0.1 }));
  scene.add(path);

  const keys = [ // camera positions orbiting the actor; [theta, phi, radius]
    [0.2, 1.25, 7.5], [0.9, 1.35, 4.2], [1.6, 1.15, 3.0],
  ];
  const target = new THREE.Vector3(0, 1.6, 0);
  const fromSph = (k, v = new THREE.Vector3()) => v.set(Math.sin(k[0]) * Math.sin(k[1]) * k[2], target.y + Math.cos(k[1]) * k[2], Math.cos(k[0]) * Math.sin(k[1]) * k[2]);
  function rebuildPath() {
    const pts = keys.map((k) => fromSph(k));
    const curve = new THREE.CatmullRomCurve3(pts.length > 1 ? pts : [pts[0], pts[0].clone().add(new THREE.Vector3(0.01, 0, 0))]);
    path.geometry.setFromPoints(curve.getPoints(80)); path.computeLineDistances();
    strip();
    return curve;
  }
  // set view orbit (drag)
  let theta = 0.6, phi = 1.12, rad = 13, tTheta = theta, tPhi = phi;
  let dragLight = null, dragging = false, px = 0, py = 0;
  s.canvas.addEventListener('pointerdown', (e) => {
    if (rolling) return;
    const hit = s.raycast(lights.map((L) => L.bulb))[0];
    dragLight = hit ? hit.object.userData.light || hit.object.parent.userData.light : null;
    dragging = true; px = e.clientX; py = e.clientY;
    s.canvas.setPointerCapture(e.pointerId);
  });
  s.canvas.addEventListener('pointermove', (e) => {
    if (!dragging) { const hit = s.raycast(lights.map((L) => L.bulb))[0]; s.canvas.style.cursor = hit ? 'grab' : 'move'; return; }
    const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    if (dragLight) { dragLight.angle -= dx * 0.012; dragLight.height = clamp(dragLight.height - dy * 0.02, 0.8, 7); place(dragLight); }
    else { tTheta -= dx * 0.006; tPhi = clamp(tPhi - dy * 0.004, 0.5, 1.45); }
  });
  s.canvas.addEventListener('pointerup', () => { dragging = false; dragLight = null; });

  // UI
  const lb = el.querySelectorAll('[data-light]');
  lb.forEach((b) => b.addEventListener('click', () => {
    const L = lights[+b.dataset.light]; L.on = !L.on; L.l.intensity = L.on ? L.base : 0; L.bulb.visible = L.on;
    b.setAttribute('aria-pressed', String(L.on));
  }));
  const stripEl = el.querySelector('[data-strip]');
  const head = el.querySelector('[data-head]');
  function strip() {
    stripEl.querySelectorAll('.kf').forEach((n) => n.remove());
    keys.forEach((k, i) => {
      const d = document.createElement('span'); d.className = 'kf';
      d.style.left = `${keys.length === 1 ? 0 : (100 * i) / (keys.length - 1)}%`;
      d.title = `Keyframe ${i + 1}`; stripEl.appendChild(d);
    });
  }
  el.querySelector('[data-key]').addEventListener('click', () => {
    if (keys.length >= 6) keys.shift();
    keys.push([theta, phi, Math.min(rad, 9)]);
    curve = rebuildPath();
  });
  el.querySelector('[data-clearkeys]').addEventListener('click', () => { keys.length = 0; keys.push([theta, phi, Math.min(rad, 9)]); curve = rebuildPath(); });
  const bars = el.querySelectorAll('.letterbox');
  const rollB = el.querySelector('[data-roll]');
  let rolling = false, rollT = 0, curve = rebuildPath();
  const DUR = 6;
  rollB.addEventListener('click', () => {
    if (keys.length < 2) return;
    rolling = !rolling; rollT = 0;
    rollB.textContent = rolling ? 'Cut!' : 'Roll';
    rollB.setAttribute('aria-pressed', String(rolling));
    el.classList.toggle('rolling', rolling);
  });
  const camLook = new THREE.Vector3();
  s.frame.push((dt, t) => {
    // the actor breathes; the wrench sways
    actor.position.y = Math.sin(t * 1.6) * 0.02;
    if (rolling) {
      rollT += reduceMotion ? DUR : dt;
      const u = smooth(clamp(rollT / DUR));
      const p = curve.getPointAt(u);
      s.camera.position.copy(p);
      camLook.copy(target).add(new THREE.Vector3(0, -0.1 + 0.2 * u, 0));
      s.camera.lookAt(camLook);
      s.camera.fov = lerp(35, 28, u); s.camera.updateProjectionMatrix();
      gizmo.visible = false; path.visible = false; lights.forEach((L) => { L.bulb.visible = false; L.stand.visible = false; });
      head.style.left = `${100 * u}%`;
      if (rollT >= DUR + 0.8) { rolling = false; rollB.textContent = 'Roll'; rollB.setAttribute('aria-pressed', 'false'); el.classList.remove('rolling'); }
    } else {
      gizmo.visible = true; path.visible = true; lights.forEach((L) => { L.bulb.visible = L.on; L.stand.visible = true; });
      if (!dragging && !reduceMotion) tTheta += dt * 0.04;
      const k = 1 - Math.pow(0.002, dt);
      theta += (tTheta - theta) * k; phi += (tPhi - phi) * k;
      s.camera.position.set(Math.sin(theta) * Math.sin(phi) * rad, 1.6 + Math.cos(phi) * rad, Math.cos(theta) * Math.sin(phi) * rad);
      s.camera.lookAt(0, 1.2, 0);
      s.camera.fov = 35; s.camera.updateProjectionMatrix();
      // park the film camera at the first keyframe, aimed at the actor
      const p0 = fromSph(keys[keys.length - 1]);
      gizmo.position.copy(p0); gizmo.lookAt(target); gizmo.rotateY(Math.PI);
      head.style.left = '0%';
    }
  });
  s.onResize = (w, h) => { rad = w / h < 1 ? 17 : 13; };
  s.resize();
  window.__mods = Object.assign(window.__mods || {}, { roll: () => rollB.click(), keys });
}
