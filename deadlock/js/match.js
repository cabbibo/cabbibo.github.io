// Chapter VI: a match, minute by minute. A scrubbable timeline (0–45 min)
// with a minimap. Unlock times are the game's; which towers fall when is
// one illustrative match.
import { clamp, lerp, reduceMotion } from './lib.js';

const EV = [
  { t: 0, k: 'start', title: 'Heroes leave the base', text: 'All twelve heroes ride the ziplines out, two to each lane. Waves of three ranged troopers and a medic leave both bases every 30 seconds.', where: 'lanes' },
  { t: 2, k: 'haunt', title: 'Small monster camps wake', text: 'The first Haunts appear in the alleys between lanes, worth 45 souls each. Their souls are "haunted": you can lose them if you die before they settle.', where: 'jungle' },
  { t: 2.5, k: 'well', title: 'Soul Wells switch on', text: 'Inside each base, a well starts trickling small orbs, a little income for whoever spends time at home.', where: 'base' },
  { t: 3, k: 'buff', title: 'Buff containers appear', text: 'Breakable boxes around the city; half of them drop a tiny permanent stat boost. They stack all match.', where: 'jungle' },
  { t: 5, k: 'power', title: 'Powerups on the bridges · melee troopers join', text: 'Glowing stones on bridges give a temporary boost to gun, casting, movement or survival. Waves now include a melee trooper. Medium camps open.', where: 'bridges' },
  { t: 6, k: 'guard0', title: 'Guardians lose their armor', text: 'The first towers started the match blocking half of all damage. By minute six that protection is gone. The zipline speed boost also becomes available.', where: 'guardians' },
  { t: 8, k: 'sac', title: 'Sinner’s Sacrifices & big camps', text: 'Slot-machine-like shrines you smash with melee; hit them at the right moment for a jackpot of permanent buffs. The largest monster camps open.', where: 'jungle' },
  { t: 10, k: 'urn', title: 'The Soul Urn', text: 'An urn appears on a bridge. Pick it up and carry it all the way to a drop-off on the enemy’s side for a large payout, while the other team hunts you. It returns every five minutes.', where: 'urn' },
  { t: 11, k: 'rift', title: 'Unstable Rift', text: 'A capture circle opens on a side-lane bridge. Hold it for twelve seconds (six if your team is behind) to win souls and a squad of huge Rift Troopers.', where: 'rift' },
  { t: 12, k: 'guard1', title: 'Guardians become fragile', text: 'From minute twelve, the first towers take 50% extra damage. Lanes that held start to break.', where: 'guardians' },
  { t: 18, k: 'walk', title: 'Walkers weaken', text: 'The giant Walkers lose all of their own armor and start taking extra damage. Every Walker that falls gives the attacking team an extra item slot.', where: 'walkers' },
  { t: 20, k: 'wave25', title: 'Waves every 25 seconds', text: 'Troopers arrive faster, and the Patrons slowly gain health so the endgame can’t be rushed.', where: 'lanes' },
  { t: 28, k: 'boss', title: 'The Mid Boss', text: 'Under Broadway, in a sewer pit, lives the Mid Boss. Teams usually kill it for the first time around minute 27 to 29. It drops three Rejuvenator crystals: for three minutes, teammates who die revive on the spot.', where: 'boss' },
  { t: 31, k: 'push', title: 'The push', text: 'With Rejuvenators in hand, a team walks into the enemy base: Base Guardians, then both Shrines, then the Patron itself.', where: 'base' },
  { t: 35, k: 'wave20', title: 'Waves every 20 seconds', text: 'Troopers arrive faster still, with 50% more health. Respawn timers are long; one lost fight can end it. An average match is over around now.', where: 'lanes' },
  { t: 38, k: 'end', title: 'The Ritual', text: 'The Patron’s second form, an orb in a pit, is destroyed. The winning team’s god crosses over. Everyone goes back to the lobby.', where: 'patron' },
];
// One illustrative match: when each structure falls (minutes). team 0 = Hidden King loses it.
const FALLS = [
  { t: 11.5, team: 1, lane: 0, kind: 'g' }, { t: 13, team: 0, lane: 2, kind: 'g' }, { t: 14.5, team: 1, lane: 1, kind: 'g' },
  { t: 16, team: 0, lane: 1, kind: 'g' }, { t: 19, team: 1, lane: 0, kind: 'w' }, { t: 21.5, team: 1, lane: 2, kind: 'g' },
  { t: 23, team: 0, lane: 2, kind: 'w' }, { t: 25, team: 1, lane: 1, kind: 'w' }, { t: 31.5, team: 1, lane: 0, kind: 'b' },
  { t: 33, team: 1, lane: 1, kind: 'b' }, { t: 34.5, team: 1, lane: -1, kind: 's' }, { t: 35.5, team: 1, lane: -1, kind: 's' },
  { t: 37, team: 1, lane: -1, kind: 'p1' }, { t: 38, team: 1, lane: -1, kind: 'p2' },
];
const PHASES = [[0, 10, 'Laning'], [10, 25, 'Mid game'], [25, 45, 'Late game']];
const END = 45;

function tension(m) { // an illustrative intensity curve, peaking at objectives
  let v = 0.1 + 0.009 * m;
  const bumps = [[2.5, 0.1, 1], [10.2, 0.25, 0.8], [11.5, 0.2, 0.8], [14, 0.25, 1.2], [19, 0.3, 1.2], [23, 0.28, 1.2], [28.5, 0.45, 1.3], [33, 0.4, 1.4], [37.5, 0.55, 1.2]];
  for (const [c, h, w] of bumps) v += 0.72 * h * Math.exp(-((m - c) ** 2) / (2 * w * w));
  return clamp(v + 0.03 * Math.sin(m * 2.3), 0, 1);
}

export function timeline(el) {
  const view = el.querySelector('.view');
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  const ctx = cv.getContext('2d');
  const scrub = el.querySelector('#mt-r');
  const card = el.querySelector('[data-card]');
  const playB = el.querySelector('[data-play]');
  let W = 1, H = 1, dpr = 1, m = 0, playing = false, last = 0, visible = false;
  const css = getComputedStyle(document.documentElement);
  const col = (n) => css.getPropertyValue(n).trim();
  const COL = { ink: col('--ink'), ink2: col('--ink-2'), ink3: col('--ink-3'), rule: col('--rule'), paper: col('--paper'), dim: col('--dim'), faint: col('--faint'), brass: col('--brass'), amber: col('--amber'), sapph: col('--sapphire'), soul: col('--soul'), blood: col('--blood') };
  const LANECOL = ['#e6c24a', '#6b97ff', '#6fbf73'];

  new ResizeObserver(() => { dpr = Math.min(2, devicePixelRatio || 1); W = view.clientWidth; H = view.clientHeight; cv.width = W * dpr; cv.height = H * dpr; draw(); }).observe(view);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(view);

  function set(v) { m = clamp(v, 0, END); scrub.value = m; draw(); }
  scrub.addEventListener('input', () => { playing = false; playB.setAttribute('aria-pressed', 'false'); set(+scrub.value); });
  playB.addEventListener('click', () => {
    playing = !playing; if (m >= END - 0.01) m = 0;
    playB.setAttribute('aria-pressed', String(playing)); playB.textContent = playing ? 'Pause' : 'Play the match';
    last = performance.now();
  });
  el.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => { playing = false; set(+b.dataset.jump); }));
  // click/drag on the chart to scrub
  let dragging = false;
  const chartX = (e) => { const r = cv.getBoundingClientRect(); const g = geom(); return clamp((e.clientX - r.left - g.cx) / g.cw, 0, 1) * END; };
  cv.addEventListener('pointerdown', (e) => { const g = geom(); const r = cv.getBoundingClientRect(); if (e.clientY - r.top > g.cy - 20) { dragging = true; playing = false; set(chartX(e)); } });
  addEventListener('pointermove', (e) => { if (dragging) set(chartX(e)); });
  addEventListener('pointerup', () => { dragging = false; });

  function loop(now) {
    if (playing && visible) {
      const dt = (now - last) / 1000;
      set(m + dt * 1.6);
      if (m >= END) { playing = false; playB.textContent = 'Play the match'; playB.setAttribute('aria-pressed', 'false'); }
    }
    last = now;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  window.__match = { set, get m() { return m; } };

  function geom() {
    const narrow = W < 640;
    const pad = 14;
    // map: left square on wide screens, top band on narrow ones
    const mapS = narrow ? Math.min(W - pad * 2, H * 0.5) : Math.min(H - 150, W * 0.36);
    const mx = narrow ? (W - mapS) / 2 : pad + 6, my = pad;
    const cx = narrow ? 44 : mx + mapS + 46;
    const cw = W - cx - 18;
    const cy = narrow ? my + mapS + 40 : 34;
    const ch = H - cy - 34;
    return { narrow, mapS, mx, my, cx, cw, cy, ch };
  }

  function draw() {
    if (W < 10) return;
    const g = geom();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.ink2; ctx.fillRect(0, 0, W, H);
    drawMap(g); drawChart(g);
    // card
    const cur = [...EV].reverse().find((e) => e.t <= m + 0.001) || EV[0];
    const mm = Math.floor(m), ss = Math.floor((m % 1) * 60);
    card.innerHTML = `<span class="fig">${mm}:${String(ss).padStart(2, '0')} · ${PHASES.find((p) => m >= p[0] && m < p[1] + 0.01)[2]}</span><h4>${cur.title}</h4><p>${cur.text}</p>`;
  }

  function drawMap({ mapS, mx, my }) {
    const S = mapS;
    const X = (u) => mx + u * S, Y = (v) => my + v * S;
    ctx.save();
    ctx.fillStyle = '#0f1216'; ctx.fillRect(mx, my, S, S);
    ctx.strokeStyle = COL.rule; ctx.strokeRect(mx + 0.5, my + 0.5, S - 1, S - 1);
    // districts
    const districts = [[0.27, 0.27, 'Theater'], [0.73, 0.27, 'Plaza'], [0.27, 0.73, 'Chinatown'], [0.73, 0.73, 'Haunted Lot']];
    ctx.font = `${Math.max(9, S * 0.028)}px "DM Mono", monospace`; ctx.textAlign = 'center';
    for (const [u, v, n] of districts) { ctx.fillStyle = 'rgba(200,163,90,0.06)'; ctx.beginPath(); ctx.ellipse(X(u), Y(v), S * 0.13, S * 0.1, 0, 0, 7); ctx.fill(); ctx.fillStyle = COL.faint; ctx.fillText(n.toUpperCase(), X(u), Y(v) + 3); }
    // lanes (Hidden King at the bottom, York on its left)
    const lanePt = (lane, s) => { // s: 0 bottom base → 1 top base
      const bow = Math.pow(Math.sin(Math.PI * s), 0.6);
      const x = 0.5 + (lane - 1) * 0.38 * bow;
      return [X(x), Y(0.94 - s * 0.88)];
    };
    for (let l = 0; l < 3; l++) {
      ctx.strokeStyle = LANECOL[l]; ctx.globalAlpha = 0.85; ctx.lineWidth = Math.max(2, S * 0.012);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const [x, y] = lanePt(l, i / 40); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.lineWidth = 1;
    // bases
    for (const [team, v] of [[0, 0.95], [1, 0.05]]) {
      ctx.fillStyle = team ? COL.sapph : COL.amber; ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(X(0.5), Y(v), S * 0.09, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    // structures
    const fallen = (team, lane, kind) => FALLS.some((f) => f.t <= m && f.team === team && f.lane === lane && f.kind === kind);
    const pos = { g: 0.36, w: 0.2, b: 0.085 };
    for (const team of [0, 1]) for (let l = 0; l < 3; l++) for (const kind of ['g', 'w', 'b']) {
      const sv = team === 0 ? pos[kind] : 1 - pos[kind];
      const [x, y] = lanePt(l, sv);
      const dead = fallen(team, l, kind);
      ctx.fillStyle = dead ? 'transparent' : team ? COL.sapph : COL.amber;
      ctx.strokeStyle = team ? COL.sapph : COL.amber;
      const r = kind === 'w' ? S * 0.022 : S * 0.016;
      ctx.beginPath();
      if (kind === 'w') ctx.rect(x - r, y - r, r * 2, r * 2); else ctx.arc(x, y, r, 0, 7);
      dead ? (ctx.globalAlpha = 0.35, ctx.stroke(), ctx.globalAlpha = 1) : ctx.fill();
    }
    for (const team of [0, 1]) {
      const by = team === 0 ? 0.95 : 0.05;
      for (const sx of [-1, 1]) {
        const dead = FALLS.filter((f) => f.t <= m && f.team === team && f.kind === 's').length >= (sx < 0 ? 1 : 2);
        ctx.fillStyle = team ? COL.sapph : COL.amber; ctx.globalAlpha = dead ? 0.2 : 1;
        ctx.beginPath(); ctx.moveTo(X(0.5 + sx * 0.06), Y(by) - S * 0.02); ctx.lineTo(X(0.5 + sx * 0.06) + S * 0.014, Y(by) + S * 0.01); ctx.lineTo(X(0.5 + sx * 0.06) - S * 0.014, Y(by) + S * 0.01); ctx.fill();
      }
      const pdead = FALLS.some((f) => f.t <= m && f.team === team && f.kind === 'p2');
      const phase2 = FALLS.some((f) => f.t <= m && f.team === team && f.kind === 'p1');
      ctx.globalAlpha = pdead ? 0.15 : 1;
      ctx.fillStyle = team ? COL.sapph : COL.amber;
      ctx.beginPath(); ctx.arc(X(0.5), Y(by), S * (phase2 ? 0.018 : 0.028), 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // timed objectives
    const glow = (x, y, r, c, a = 1) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1; };
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 300);
    if (m >= 2) for (const [u, v] of [[0.3, 0.4], [0.7, 0.4], [0.3, 0.6], [0.7, 0.6], [0.18, 0.5], [0.82, 0.5], [0.4, 0.22], [0.6, 0.78]]) { ctx.fillStyle = 'rgba(127,240,224,0.7)'; ctx.beginPath(); ctx.arc(X(u), Y(v), S * 0.009, 0, 7); ctx.fill(); }
    if (m >= 5) for (const [u, v] of [[0.31, 0.5], [0.69, 0.5]]) { ctx.fillStyle = COL.paper; ctx.fillRect(X(u) - 3, Y(v) - 3, 6, 6); }
    if (m >= 8) for (const [u, v] of [[0.38, 0.33], [0.62, 0.67], [0.22, 0.27], [0.78, 0.73]]) { ctx.strokeStyle = COL.brass; ctx.strokeRect(X(u) - 4, Y(v) - 4, 8, 8); }
    if (m >= 10) { // urn: carried across, alternates bridges
      const which = Math.floor((m - 10) / 5) % 2;
      const ph = ((m - 10) % 5) / 5;
      const u = which ? 0.31 : 0.69;
      const v = lerp(0.5, which ? 0.12 : 0.88, clamp(ph * 1.6));
      glow(X(u), Y(v), S * 0.05, 'rgba(232,226,212,0.9)');
      ctx.fillStyle = COL.paper; ctx.beginPath(); ctx.arc(X(u), Y(v), S * 0.012, 0, 7); ctx.fill();
    }
    if (m >= 11) { const on = ((m - 11) % 7) < 2.2; if (on) { const u = Math.floor((m - 11) / 7) % 2 ? 0.2 : 0.8; ctx.strokeStyle = COL.blood; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(u), Y(0.5), S * 0.035 * pulse + 2, 0, 7); ctx.stroke(); ctx.lineWidth = 1; } }
    // mid boss
    const bossDead = m >= 28 && m < 35;
    glow(X(0.5), Y(0.5), S * 0.07, bossDead ? 'rgba(127,240,224,0.5)' : 'rgba(170,110,255,0.75)', m >= 26 && !bossDead ? pulse : 0.6);
    ctx.fillStyle = bossDead ? COL.soul : '#b98cff';
    ctx.beginPath(); ctx.arc(X(0.5), Y(0.5), S * 0.016, 0, 7); ctx.fill();
    // highlight current event location
    const cur = [...EV].reverse().find((e) => e.t <= m + 0.001) || EV[0];
    ctx.strokeStyle = COL.paper; ctx.setLineDash([3, 4]);
    const hl = { boss: [0.5, 0.5, 0.09], urn: [0.69, 0.6, 0.12], rift: [0.8, 0.5, 0.08], base: [0.5, 0.06, 0.12], patron: [0.5, 0.05, 0.08], bridges: [0.5, 0.5, 0.26], walkers: [0.5, 0.5, 0.34], guardians: [0.5, 0.5, 0.2], jungle: [0.5, 0.5, 0.36] }[cur.where];
    if (hl) { ctx.beginPath(); ctx.arc(X(hl[0]), Y(hl[1]), S * hl[2], 0, 7); ctx.stroke(); }
    ctx.setLineDash([]);
    // labels
    ctx.textAlign = 'left'; ctx.font = `${Math.max(9, S * 0.03)}px "DM Mono", monospace`;
    ctx.fillStyle = COL.sapph; ctx.fillText('ARCHMOTHER', mx + 6, my + 14);
    ctx.fillStyle = COL.amber; ctx.fillText('HIDDEN KING', mx + 6, my + S - 7);
    ctx.textAlign = 'center'; ctx.fillStyle = COL.dim;
    const [yx] = lanePt(0, 0.5), [gx] = lanePt(2, 0.5), [bx] = lanePt(1, 0.5);
    ctx.save(); ctx.translate(yx - S * 0.03, Y(0.5)); ctx.rotate(-Math.PI / 2); ctx.fillText('YORK', 0, 0); ctx.restore();
    ctx.save(); ctx.translate(gx + S * 0.035, Y(0.5)); ctx.rotate(-Math.PI / 2); ctx.fillText('GREENWICH', 0, 0); ctx.restore();
    ctx.save(); ctx.translate(bx - S * 0.03, Y(0.3)); ctx.rotate(-Math.PI / 2); ctx.fillText('BROADWAY', 0, 0); ctx.restore();
    ctx.restore();
  }

  function drawChart({ cx, cw, cy, ch, narrow }) {
    const X = (t) => cx + (t / END) * cw;
    // rows: phases band, tension, guardian/walker resistance, wave interval, events
    const rows = { phase: [cy, 18], tension: [cy + 26, ch * 0.34], resist: [cy + 34 + ch * 0.34, ch * 0.22], wave: [cy + 46 + ch * 0.56, ch * 0.12], ev: [cy + 56 + ch * 0.68, ch * 0.32 - 56] };
    ctx.font = '10px "DM Mono", monospace'; ctx.textAlign = 'left';
    // phase band
    PHASES.forEach(([a, b, n], i) => {
      ctx.fillStyle = ['rgba(240,164,58,0.14)', 'rgba(200,163,90,0.10)', 'rgba(107,151,255,0.14)'][i];
      ctx.fillRect(X(a), rows.phase[0], X(b) - X(a) - 2, rows.phase[1]);
      ctx.fillStyle = COL.paper; ctx.fillText(n.toUpperCase(), X(a) + 6, rows.phase[0] + 13);
    });
    // axis ticks
    ctx.fillStyle = COL.faint; ctx.strokeStyle = COL.rule;
    for (let t = 0; t <= END; t += 5) {
      ctx.beginPath(); ctx.moveTo(X(t) + 0.5, rows.tension[0]); ctx.lineTo(X(t) + 0.5, cy + ch); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(`${t}`, X(t), cy + ch + 14);
    }
    ctx.textAlign = 'right'; ctx.fillText('min', cx + cw, cy + ch + 26);
    ctx.textAlign = 'left';
    const lab = (txt, y) => { ctx.fillStyle = COL.dim; ctx.save(); ctx.translate(cx - 8, y); ctx.textAlign = 'right'; ctx.fillText(txt, 0, 0); ctx.restore(); };
    // tension
    const [ty, th] = rows.tension;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const t = (i / 300) * END; const y = ty + th * (1 - tension(t)); i ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
    ctx.lineTo(X(END), ty + th); ctx.lineTo(X(0), ty + th); ctx.closePath();
    const grd = ctx.createLinearGradient(0, ty, 0, ty + th); grd.addColorStop(0, 'rgba(224,88,75,0.45)'); grd.addColorStop(1, 'rgba(224,88,75,0.02)');
    ctx.fillStyle = grd; ctx.fill();
    ctx.strokeStyle = COL.blood; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const t = (i / 300) * END; const y = ty + th * (1 - tension(t)); i ? ctx.lineTo(X(t), y) : ctx.moveTo(X(t), y); }
    ctx.stroke(); ctx.lineWidth = 1;
    if (!narrow) { lab('how tense', ty + 10); lab('(sketch)', ty + 22); }
    // resistance lines
    const [ry, rh] = rows.resist;
    const RY = (r) => ry + rh * (0.5 - r / 1.4);
    ctx.strokeStyle = COL.rule; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(cx, RY(0)); ctx.lineTo(cx + cw, RY(0)); ctx.stroke(); ctx.setLineDash([]);
    const line = (f, c) => { ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i <= 90; i++) { const t = (i / 90) * END; i ? ctx.lineTo(X(t), RY(f(t))) : ctx.moveTo(X(t), RY(f(t))); } ctx.stroke(); ctx.lineWidth = 1; };
    line((t) => clamp(0.5 - (t / 6) * 0.5, -0.5, 0.5), COL.brass);
    line((t) => clamp(0.65 - (t / 18) * 1.3, -0.65, 0.65), COL.paper);
    ctx.fillStyle = COL.brass; ctx.fillText('Guardian armor', X(0.6), RY(0.5) - 4);
    ctx.fillStyle = COL.paper; ctx.fillText('Walker armor', X(8), RY(0.65 - (8 / 18) * 1.3) - 6);
    if (!narrow) { lab('+armor', RY(0.5) + 3); lab('0', RY(0) + 3); lab('−armor', RY(-0.55) + 3); }
    // wave interval steps
    const [wy, wh] = rows.wave;
    ctx.fillStyle = COL.dim;
    [[0, 20, '30 s'], [20, 35, '25 s'], [35, 45, '20 s']].forEach(([a, b, n], i) => {
      ctx.fillStyle = `rgba(232,226,212,${0.08 + i * 0.07})`; ctx.fillRect(X(a), wy, X(b) - X(a) - 2, wh);
      ctx.fillStyle = COL.paper; ctx.fillText(`wave every ${n}`, X(a) + 5, wy + wh / 2 + 4);
    });
    // events
    const [ey, eh] = rows.ev;
    EV.forEach((e, i) => {
      const x = X(e.t);
      const active = e.t <= m;
      ctx.strokeStyle = active ? COL.brass : COL.rule;
      ctx.beginPath(); ctx.moveTo(x + 0.5, ey); ctx.lineTo(x + 0.5, ey + eh * (0.25 + 0.75 * ((i % 3) / 2))); ctx.stroke();
      ctx.fillStyle = active ? COL.brass : COL.faint;
      ctx.beginPath(); ctx.arc(x, ey + eh * (0.25 + 0.75 * ((i % 3) / 2)), 3, 0, 7); ctx.fill();
    });
    // playhead
    const px = X(m);
    ctx.strokeStyle = COL.soul; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, cy - 6); ctx.lineTo(px, cy + ch + 4); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = COL.soul; ctx.beginPath(); ctx.moveTo(px - 6, cy - 12); ctx.lineTo(px + 6, cy - 12); ctx.lineTo(px, cy - 4); ctx.fill();
  }
  set(0);
}
