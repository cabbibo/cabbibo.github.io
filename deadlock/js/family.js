// Family-tree chapter.
//  river(plate)   – a flowing "river delta" of games 1989→2026 (2D canvas, particle currents)
//  players(plate) – Deadlock's reported Steam peaks vs Team Fortress 2's all-time record
import { clamp, lerp, smooth, rng, reduceMotion } from './lib.js';

// ------------------------------------------------------------------ data
// Lateral position y ∈ [-1, 1]. Streams: strategy/MOBA above (warm), team shooters below (cool).
const T0 = 1988.4, T1 = 2027.2;
const Y = { rts: -0.84, moba: -0.4, shoot: 0.52, dl: 0.04 };
const COL = {
  rts: [200, 163, 90],     // brass
  moba: [240, 164, 58],    // amber
  shoot: [107, 151, 255],  // sapphire
  hybrid: [190, 170, 220],
  dl: [127, 240, 224],     // soul
};

// kind: mod (fan-made) | studio | event. dead: year it shut down. faded: drifts out (no shutdown date).
const NODES = [
  { id: 'herzog', lab: 'b', name: 'Herzog Zwei', year: 1989, y: -0.62, s: 'rts', kind: 'studio', maker: 'Technosoft (Sega Mega Drive)',
    text: 'You fly one powerful transforming robot while also ordering troops around. Often named as an ancestor of both strategy games and MOBAs.', key: 1 },
  { id: 'dune', lab: 'a', name: 'Dune II', year: 1992, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Westwood Studios',
    text: 'Set the template for real-time strategy: gather resources, build a base, command an army with the mouse, all from above.', key: 1 },
  { id: 'wc1', lab: 'b', name: 'Warcraft', year: 1994, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Blizzard',
    text: 'Blizzard\'s first strategy game, and the start of the series whose third game would host DotA.' },
  { id: 'wc2', lab: 'a', name: 'Warcraft II', year: 1995.9, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Blizzard',
    text: 'Released December 1995. Hugely popular for playing against friends over a network.' },
  { id: 'sc', lab: 'b', name: 'StarCraft', year: 1998.25, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Blizzard',
    text: 'Shipped with a map editor. Fans used it to build their own games inside StarCraft, which is where the MOBA was born.', key: 1 },
  { id: 'futurecop', lab: 'b', name: 'Future Cop: LAPD', year: 1998.6, y: -0.6, s: 'rts', kind: 'studio', maker: 'Electronic Arts',
    text: 'Its "Precinct Assault" mode had you fight in one vehicle while robot tanks drove toward the enemy base. By some definitions, the first MOBA-style match.', faded: 2001 },
  { id: 'aos', lab: 'b', name: 'Aeon of Strife', year: 2000, y: Y.moba, s: 'moba', kind: 'mod', fuzzy: [1998, 2002], maker: 'A StarCraft fan map, often credited to "Aeon64"',
    text: 'The core shape appears: each player controls one hero instead of an army, while computer soldiers march down three lanes guarded by towers. Its author and date are disputed (somewhere around 1998–2002).', key: 1, parents: ['sc'] },
  { id: 'wc3', lab: 'a', name: 'Warcraft III', year: 2002.5, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Blizzard',
    text: 'Its World Editor was far more powerful, and it already had "hero" units that level up and carry items. Everything DotA needed.', key: 1 },
  { id: 'dota', lab: 'a', name: 'DotA', year: 2003.2, y: Y.moba, s: 'moba', kind: 'mod', maker: 'Eul, a Warcraft III fan mapmaker',
    text: 'Defense of the Ancients rebuilt the Aeon of Strife idea in Warcraft III. Eul released the map\'s code openly, and dozens of variants bloomed.', key: 1, parents: ['aos', 'wc3'] },
  { id: 'allstars', lab: 'b', name: 'DotA Allstars', year: 2004.2, y: Y.moba, s: 'moba', kind: 'mod', maker: 'Meian & Ragn0r, then Steve "Guinsoo" Feak',
    text: 'Collected the best heroes into one map. Guinsoo added recipe items (cheap items combine into strong ones) and Roshan, a boss that takes a whole team to kill.', parents: ['dota'] },
  { id: 'icefrog', lab: 'ar', name: 'IceFrog takes over', year: 2005.4, y: Y.moba, s: 'moba', kind: 'mod', maker: 'IceFrog, an anonymous designer',
    text: 'One steady designer patching the map hundreds of times. DotA became a global phenomenon, especially in internet cafés across Asia and Europe.', key: 1, parents: ['allstars'],
    valve: 'Valve hired IceFrog in 2009 to make Dota 2. He is widely reported to work on Deadlock too.' },
  { id: 'demigod', lab: 'ar', name: 'Demigod', year: 2009.3, y: -0.98, s: 'moba', kind: 'studio', maker: 'Gas Powered Games',
    text: 'The first standalone, store-bought game in the genre.', faded: 2012.5 },
  { id: 'lol', lab: 'ar', name: 'League of Legends', year: 2009.8, y: -0.66, s: 'moba', kind: 'studio', maker: 'Riot Games',
    text: 'A friendlier, free-to-play take on DotA, with DotA veterans on the team. Riot coined the word "MOBA". By 2016 it had over 100 million monthly players.', key: 1, parents: ['allstars'] },
  { id: 'hon', lab: 'ar', name: 'Heroes of Newerth', year: 2010.4, y: -0.52, s: 'moba', kind: 'studio', maker: 'S2 Games',
    text: 'A close copy of DotA\'s rules and once League\'s biggest rival.', dead: 2022.5 },
  { id: 'dota2', lab: 'a', name: 'Dota 2', year: 2013.5, y: Y.moba, s: 'moba', kind: 'studio', maker: 'Valve',
    text: 'Valve\'s full remake of DotA. Every hero is free; money comes from cosmetics. Its championship, The International, paid out a record $40 million in 2021.', key: 1, parents: ['icefrog'],
    valve: 'A fan-made map became a Valve game because Valve hired the fan who was running it.' },
  { id: 'smite', lab: 'b', name: 'Smite', year: 2014.2, y: -0.18, s: 'moba', kind: 'studio', maker: 'Hi-Rez Studios',
    text: 'Moved the camera down behind your character\'s shoulder and made you aim your attacks. A key step toward Deadlock\'s point of view.', key: 1, parents: ['lol'] },
  { id: 'hots', lab: 'ar', name: 'Heroes of the Storm', year: 2015.4, y: -1.0, s: 'moba', kind: 'studio', maker: 'Blizzard',
    text: 'Blizzard\'s "hero brawler": shared team levels and no shop. Put into maintenance mode in 2022.', dead: 2022.5, deadLabel: 'maintenance' },
  { id: 'hok', lab: 'ar', name: 'Honor of Kings', year: 2015.9, y: -0.81, s: 'moba', kind: 'studio', maker: 'TiMi Studio Group (Tencent)',
    text: 'A phone MOBA, and the most played game of its kind on Earth: over 100 million people a day in 2020.', key: 1 },
  { id: 'paragon', lab: 'ar', name: 'Paragon', year: 2016.2, y: -0.06, s: 'moba', kind: 'studio', maker: 'Epic Games',
    text: 'A gorgeous third-person MOBA. Epic moved its staff to Fortnite and shut Paragon down in April 2018, then gave its art away for free.', dead: 2018.3, parents: ['smite'] },
  { id: 'mlbb', lab: 'ar', name: 'Mobile Legends', year: 2016.55, y: -0.9, s: 'moba', kind: 'studio', maker: 'Moonton',
    text: 'The phone MOBA that dominates Southeast Asia.' },
  { id: 'wildrift', lab: 'ar', name: 'Wild Rift', year: 2020.8, y: -0.585, s: 'moba', kind: 'studio', maker: 'Riot Games',
    text: 'League of Legends rebuilt for phones, with shorter matches.', parents: ['lol'] },
  { id: 'unite', lab: 'ar', name: 'Pokémon Unite', year: 2021.5, y: -0.73, s: 'moba', kind: 'studio', maker: 'TiMi / The Pokémon Company',
    text: 'A MOBA about scoring goals, and for many children their first one.', parents: ['hok'] },
  { id: 'predecessor', lab: 'ar', name: 'Predecessor', year: 2024.1, y: -0.06, s: 'moba', kind: 'studio', maker: 'Omeda Studios',
    text: 'Built by fans from Paragon\'s free art after Epic gave it away. A dead game revived.', parents: ['paragon'] },
  { id: 'smite2', lab: 'ar', name: 'Smite 2', year: 2025.05, y: -0.27, s: 'moba', kind: 'studio', maker: 'Hi-Rez Studios',
    text: 'The sequel, free to play from January 2025.', parents: ['smite'] },

  { id: 'tf', lab: 'b', name: 'Team Fortress', year: 1996.65, y: Y.shoot, s: 'shoot', kind: 'mod', maker: 'Robin Walker, John Cook & Ian Caughley (a Quake mod)',
    text: 'Teams of players each pick a class with a job: medic, sniper, engineer. The idea of "roles" starts here on the shooter side.', key: 1,
    valve: 'Valve hired its creators in 1998. Robin Walker is reported to be a key Deadlock developer.' },
  { id: 'tfc', lab: 'a', name: 'Team Fortress Classic', year: 1999.3, y: Y.shoot, s: 'shoot', kind: 'studio', maker: 'Valve',
    text: 'Valve\'s remake of the mod, made by the people who built it.', parents: ['tf'] },
  { id: 'tf2', lab: 'b', name: 'Team Fortress 2', year: 2007.8, y: Y.shoot, s: 'shoot', kind: 'studio', maker: 'Valve',
    text: 'Nine cartoon characters you can recognise from across a map by shape alone. The template for every "hero shooter" since.', key: 1, parents: ['tfc'] },
  { id: 'mnc', lab: 'a', name: 'Monday Night Combat', year: 2010.5, y: 0.3, s: 'hybrid', kind: 'studio', maker: 'Uber Entertainment',
    text: 'A third-person class shooter with lanes, marching robot soldiers, turrets and money for upgrades. The closest thing to Deadlock before Deadlock.', key: 1, parents: ['tf2', 'allstars'] },
  { id: 'smnc', lab: 'b', name: 'Super MNC', year: 2012.3, y: 0.3, s: 'hybrid', kind: 'studio', maker: 'Uber Entertainment',
    text: 'Made the MOBA parts explicit: heroes, items, lanes. Its servers shut in May 2018.', dead: 2018.4, parents: ['mnc'] },
  { id: 'battleborn', lab: 'l', name: 'Battleborn', year: 2016.35, y: 0.22, s: 'hybrid', kind: 'studio', maker: 'Gearbox',
    text: 'A first-person hero shooter with a lane-pushing mode. Released three weeks before Overwatch and overshadowed. Unplayable since January 2021.', dead: 2021.1, parents: ['tf2', 'lol'] },
  { id: 'overwatch', lab: 'br', name: 'Overwatch', year: 2016.4, y: 0.73, s: 'shoot', kind: 'studio', maker: 'Blizzard',
    text: 'Made "hero shooter" a household term: each character has a distinct look, weapon and set of powers.', key: 1, parents: ['tf2'] },
  { id: 'gigantic', lab: 'l', name: 'Gigantic', year: 2017.55, y: 0.14, s: 'hybrid', kind: 'studio', maker: 'Motiga',
    text: 'Third-person teams defending giant guardian beasts. Shut down July 2018, revived as Rampage Edition in 2024.', dead: 2018.6, revive: 2024.3, parents: ['tf2', 'lol'] },
  { id: 'rivals', lab: 'br', name: 'Marvel Rivals', year: 2024.95, y: 0.88, s: 'shoot', kind: 'studio', maker: 'NetEase',
    text: 'A third-person hero shooter that drew 644,269 players at once on Steam in January 2025. Proof of how big the audience for this style is.', parents: ['overwatch'] },

  { id: 'citadel', lab: 'br', name: 'Citadel', year: 2018.5, y: Y.dl, s: 'dl', kind: 'event', maker: 'Valve, in secret',
    text: 'Development reportedly begins around 2018. The codename "Citadel" turns up in Dota 2\'s files in 2019; "Neon Prime" is trademarked in 2022.', parents: ['dota2', 'tf2'] },
  { id: 'deadlock', lab: 'l', name: 'Deadlock', year: 2024.65, y: Y.dl, s: 'dl', kind: 'studio', maker: 'Valve',
    text: 'Revealed August 2024. Dota\'s lanes, shops and souls, played as a third-person shooter by teams of six. Still invite-only, still "unfinished", and it hit 303,347 players at once in October 2026.', key: 1,
    parents: ['citadel', 'dota2', 'tf2', 'smite', 'mnc'] },
];
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

// Deadlock's own milestones along its line
const DL_MARKS = [
  { t: 2025.15, label: '4 lanes → 3' },
  { t: 2026.8, label: '303k players', align: 'right', dx: 4, dy: 26 },
];

// ------------------------------------------------------------------ paths
// A path is keypoints [t, y] eased with smoothstep between them, plus style.
function P(pts, o) { return { pts, ...o }; }
function buildPaths() {
  const paths = [];
  // main streams
  paths.push(P([[1989, -0.62], [1992, Y.rts], [2002.5, Y.rts], [2004.6, Y.moba]], { c: 'rts', w: 1.0, main: 1 }));
  paths.push(P([[1998.6, -0.6], [2000, Y.moba], [T1, Y.moba]], { c: 'moba', w: 1.3, main: 1, from: 1998.3 }));
  paths.push(P([[1996.65, Y.shoot], [T1, Y.shoot]], { c: 'shoot', w: 1.3, main: 1 }));
  // Aeon of Strife leaves StarCraft
  paths.push(P([[1998.25, Y.rts], [2000, Y.moba]], { c: 'rts', w: 0.45 }));
  // branches: leave the parent line ~1.2 years before the node, then run to death / fade / edge
  for (const n of NODES) {
    if (n.y === Y.moba || n.y === Y.rts || n.y === Y.shoot || n.s === 'dl') continue;
    if (n.id === 'herzog' || n.id === 'futurecop') continue;
    const par = n.parents ? byId[n.parents[0]] : null;
    const py = par ? par.y : n.s === 'shoot' ? Y.shoot : n.s === 'hybrid' ? Y.shoot : Y.moba;
    const t0 = Math.max(par ? par.year : T0, n.year - 1.3);
    const end = n.dead ?? n.faded ?? T1;
    const c = n.s;
    paths.push(P([[t0, py], [n.year, n.y], [end, n.y]], { c, w: 0.55, node: n, fade: !!n.faded, dead: !!n.dead, alive: !n.dead && !n.faded }));
    if (n.revive) paths.push(P([[n.revive, n.y], [T1, n.y]], { c, w: 0.4, node: n, alive: 1 }));
    // second parent thread (hybrids braid both streams)
    if (n.parents && n.parents[1] && n.s === 'hybrid') {
      const p2 = byId[n.parents[1]];
      paths.push(P([[Math.max(p2.year, n.year - 1.6), p2.y], [n.year, n.y]], { c: p2.s, w: 0.3, thread: 1 }));
    }
  }
  // Paragon's free art → Predecessor (dotted inheritance)
  paths.push(P([[2018.3, -0.06], [2024.1, -0.06]], { c: 'moba', w: 0.3, dotted: 1 }));
  // Deadlock: threads from Dota 2 and TF2 into the secret years, then the bright line
  paths.push(P([[2013.5, Y.moba], [2018.5, Y.dl]], { c: 'moba', w: 0.55, thread: 1, toDl: 1 }));
  paths.push(P([[2007.8, Y.shoot], [2018.5, Y.dl]], { c: 'shoot', w: 0.55, thread: 1, toDl: 1 }));
  paths.push(P([[2018.5, Y.dl], [2024.65, Y.dl]], { c: 'dl', w: 0.5, dotted: 1 }));
  paths.push(P([[2024.65, Y.dl], [T1, Y.dl]], { c: 'dl', w: 1.6, main: 1, dl: 1 }));
  return paths;
}

function yAt(path, t) {
  const p = path.pts;
  if (t <= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], b = p[i + 1];
    if (t <= b[0]) return lerp(a[1], b[1], smooth((t - a[0]) / Math.max(1e-6, b[0] - a[0])));
  }
  return p[p.length - 1][1];
}

// ------------------------------------------------------------------ river
export function river(plate) {
  const view = plate.querySelector('.view');
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'A timeline from 1989 to 2026 showing strategy games and team shooters flowing into Deadlock. The same information is listed in the card below the figure.');
  const ctx = cv.getContext('2d');
  const card = plate.querySelector('[data-card]');
  const scrub = plate.querySelector('input[type=range]');
  const yearOut = plate.querySelector('[data-year]');
  const playBtn = plate.querySelector('[data-play]');
  const modsBtn = plate.querySelector('[data-mods]');
  const paths = buildPaths();
  const R = rng(1996);

  let W = 1, H = 1, dpr = 1, vertical = false;
  let cursor = T1, playing = false, hover = null, selected = byId.deadlock, showMods = false, visible = false;

  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = view.clientWidth; H = view.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    vertical = W < 620;
  }
  new ResizeObserver(resize).observe(view);
  resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(view);

  // map (t, y) → screen
  function pad() { return vertical ? { a: 40, b: 26, l: 30, r: 30 } : { a: 54, b: 36, l: 34, r: 34 }; }
  function S(t, y) {
    const p = pad();
    const u = (t - T0) / (T1 - T0);
    if (!vertical) return [p.a + u * (W - p.a - p.b), p.l + (y + 1) / 2 * (H - p.l - p.r)];
    return [p.l + (y + 1) / 2 * (W - p.l - p.r), p.a + u * (H - p.a - p.b)];
  }
  const ppy = () => (vertical ? H : W) / (T1 - T0); // pixels per year

  // particles riding the paths
  const parts = [];
  function seedParticles() {
    parts.length = 0;
    for (const path of paths) {
      const start = path.from ?? path.pts[0][0];
      const end = path.pts[path.pts.length - 1][0];
      const n = Math.round((end - start) * (path.main ? 7 : path.thread ? 2.2 : 2.6) * (path.dl ? 2 : 1));
      for (let i = 0; i < n; i++) parts.push({ path, t: start + R() * (end - start), off: (R() - 0.5), sp: 0.7 + R() * 0.8, start, end });
    }
  }
  seedParticles();

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const lineage = new Set();
  function setLineage(n) {
    lineage.clear();
    const walk = (x) => { if (!x || lineage.has(x.id)) return; lineage.add(x.id); (x.parents || []).forEach((p) => walk(byId[p])); };
    walk(n);
  }

  function pathEnd(path) { return path.pts[path.pts.length - 1][0]; }
  function strokePath(path, t0, t1, width, color) {
    ctx.beginPath();
    const step = 0.08;
    let first = true;
    for (let t = t0; t <= t1 + 1e-6; t += step) {
      const [x, y] = S(Math.min(t, t1), yAt(path, Math.min(t, t1)));
      first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false;
    }
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.stroke();
  }

  function draw(time) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0f1216'; ctx.fillRect(0, 0, W, H);
    const k = Math.min(1.25, Math.max(0.7, ppy() / 30));

    // decade grid
    ctx.font = '500 11px "DM Mono", monospace';
    ctx.textBaseline = 'middle';
    for (let yr = 1990; yr <= 2025; yr += 5) {
      const [x, y] = S(yr, -1);
      const [x2, y2] = S(yr, 1);
      ctx.strokeStyle = yr % 10 ? 'rgba(232,226,212,0.035)' : 'rgba(232,226,212,0.08)';
      ctx.lineWidth = 1; ctx.beginPath();
      if (!vertical) { ctx.moveTo(x, 16); ctx.lineTo(x, H - 10); } else { ctx.moveTo(14, y); ctx.lineTo(W - 10, y); }
      ctx.stroke();
      ctx.fillStyle = yr % 10 ? '#4c4a44' : '#6f6c64';
      if (!vertical) { ctx.textAlign = 'center'; ctx.fillText(String(yr), x, H - 14); }
      else { ctx.save(); ctx.translate(10, y); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(String(yr), 0, 0); ctx.restore(); }
    }
    // stream labels
    ctx.font = '700 12px "Big Shoulders Display", sans-serif';
    const lab = (txt, t, y, c, align = 'left') => {
      const [x, yy] = S(t, y);
      ctx.fillStyle = rgba(c, 0.85); ctx.textAlign = align;
      ctx.save();
      if (!vertical) ctx.fillText(txt, x, yy);
      else { ctx.translate(x, yy); ctx.rotate(Math.PI / 2); ctx.fillText(txt, 0, 0); }
      ctx.restore();
    };
    if (!vertical) {
      lab('STRATEGY GAMES · YOU COMMAND AN ARMY', 1989.1, -1.0, COL.rts);
      lab('TEAM SHOOTERS', 1989.1, Y.shoot - 0.035, COL.shoot);
      lab('YOU ARE ONE PERSON', 1989.1, Y.shoot + 0.035, COL.shoot);
      lab('MOBAS · YOU ARE ONE HERO IN A WAR', 2006.6, Y.moba + 0.075, COL.moba);
    }

    // cursor clip
    const tc = cursor;
    // bands + lines
    for (const path of paths) {
      const start = path.from ?? path.pts[0][0];
      const end = Math.min(pathEnd(path), tc);
      if (end <= start) continue;
      const c = COL[path.c] || COL.hybrid;
      const n = path.node;
      const lit = !hover && !showMods ? 1 : (n ? (lineage.has(n.id) || (showMods && (n.kind === 'mod' || n.valve))) : path.main || path.toDl) ? 1 : 0.28;
      if (path.main) {
        strokePath(path, start, end, 16 * path.w * k, rgba(c, 0.05 * lit));
        strokePath(path, start, end, 7 * path.w * k, rgba(c, 0.09 * lit));
      }
      ctx.setLineDash(path.dotted ? [2, 5] : []);
      const fadeA = path.fade ? 0.35 : path.alive ? 0.5 : 0.55;
      strokePath(path, start, end, (path.main ? 1.6 : 1.1) * k, rgba(c, (path.main ? 0.7 : fadeA) * lit));
      ctx.setLineDash([]);
      // alive branches fade to the right edge; faded ones get a soft end, dead ones a tick
      if (path.dead && pathEnd(path) <= tc) {
        const [x, y] = S(pathEnd(path), yAt(path, pathEnd(path)));
        ctx.strokeStyle = rgba(c, 0.8 * lit); ctx.lineWidth = 1.4;
        ctx.beginPath();
        if (!vertical) { ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); } else { ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); }
        ctx.stroke();
        if (path.node && path.node.deadLabel) {
          ctx.font = '10px "DM Mono", monospace'; ctx.fillStyle = rgba(c, 0.6 * lit); ctx.textAlign = 'left';
          if (!vertical) ctx.fillText(path.node.deadLabel, x + 5, y);
        }
      }
    }

    // particles (additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      if (p.t > tc) continue;
      const c = COL[p.path.c] || COL.hybrid;
      const [x, y] = S(p.t, yAt(p.path, p.t));
      const spread = (p.path.main ? 6 * p.path.w : 1.6) * k;
      const nx = vertical ? p.off * spread : 0, ny = vertical ? 0 : p.off * spread;
      const life = clamp((p.t - p.start) / 0.6) * clamp((p.end - p.t) / (p.path.alive ? 4 : 0.6));
      const n = p.path.node;
      const lit = !hover && !showMods ? 1 : (n ? (lineage.has(n.id) || (showMods && (n.kind === 'mod' || n.valve))) : p.path.main || p.path.toDl) ? 1 : 0.25;
      ctx.fillStyle = rgba(c, 0.55 * life * lit);
      const r = p.path.dl ? 1.8 : 1.3;
      ctx.fillRect(x + nx - r / 2, y + ny - r / 2, r, r);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Deadlock milestones
    if (tc > 2024.65) {
      ctx.font = '10px "DM Mono", monospace'; ctx.textAlign = 'center';
      for (const m of DL_MARKS) {
        if (m.t > tc) continue;
        const [x, y] = S(m.t, Y.dl);
        ctx.fillStyle = rgba(COL.dl, 0.9);
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(127,240,224,0.75)';
        if (!vertical) { ctx.textAlign = m.align || 'center'; ctx.fillText(m.label, x + (m.dx || 0), y + (m.dy || 14)); ctx.textAlign = 'center'; }
        else { ctx.textAlign = 'left'; ctx.fillText(m.label, x + 8, y); ctx.textAlign = 'center'; }
      }
    }

    // nodes
    const labelAll = !vertical && W > 760;
    for (const n of NODES) {
      if (n.year > tc + 0.01) continue;
      const [x, y] = S(n.year, n.y);
      const c = COL[n.s] || COL.hybrid;
      const isSel = selected === n, isHov = hover === n;
      const dim = (hover || showMods) && !(lineage.has(n.id) || (showMods && (n.kind === 'mod' || n.valve)));
      const a = dim ? 0.3 : 1;
      const r = (n.id === 'deadlock' ? 7 : n.key ? 5 : 4) * (isHov || isSel ? 1.25 : 1);
      // uncertainty bar (Aeon of Strife)
      if (n.fuzzy) {
        const [xa, ya] = S(n.fuzzy[0], n.y), [xb, yb] = S(n.fuzzy[1], n.y);
        ctx.strokeStyle = rgba(c, 0.45 * a); ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.lineCap = 'butt';
      }
      if (n.id === 'deadlock') {
        const pulse = reduceMotion ? 0 : 0.5 + 0.5 * Math.sin(time * 0.002);
        ctx.fillStyle = rgba(c, 0.12 + 0.1 * pulse); ctx.beginPath(); ctx.arc(x, y, 18 + 6 * pulse, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#0f1216'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fill();
      if (n.kind === 'mod') {
        ctx.strokeStyle = rgba(c, a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
      } else if (n.kind === 'event') {
        ctx.strokeStyle = rgba(c, a); ctx.lineWidth = 1.5; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = rgba(c, a); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      if (n.valve && !dim) { // small brass tick = Valve hired them
        ctx.fillStyle = '#c8a35a'; ctx.beginPath(); ctx.arc(x + r + 3, y - r - 1, 2, 0, 7); ctx.fill();
      }
      if (isSel) { ctx.strokeStyle = 'rgba(232,226,212,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.stroke(); }
      // labels
      if (labelAll || n.key || isHov || isSel) {
        ctx.font = `${n.key ? '600 ' : ''}12px "Spectral", Georgia, serif`;
        ctx.fillStyle = dim ? 'rgba(162,157,144,0.35)' : n.key ? '#e8e2d4' : '#a29d90';
        if (!vertical) {
          const L = n.lab || 'a', g = r + 9;
          const pos = { a: [0, -g, 'center'], b: [0, g + 2, 'center'], ar: [-2, -g + 1, 'left'], br: [r + 4, g, 'left'], l: [-g, 0, 'right'], r: [g, 0, 'left'] }[L];
          ctx.textAlign = pos[2];
          ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#0f1216';
          ctx.strokeText(n.name, x + pos[0], y + pos[1]);
          ctx.fillText(n.name, x + pos[0], y + pos[1]);
        } else {
          const tw = ctx.measureText(n.name).width;
          ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#0f1216';
          let tx = x + r + 7, ty = y;
          ctx.textAlign = 'left';
          if (tx + tw > W - 6) { tx = clamp(x - tw / 2, 6, W - tw - 6); ty = y + r + 11; }
          ctx.strokeText(n.name, tx, ty);
          ctx.fillText(n.name, tx, ty);
        }
      }
    }
    // cursor line while scrubbing
    if (tc < T1 - 0.05) {
      const [x, y] = S(tc, -1);
      ctx.strokeStyle = 'rgba(200,163,90,0.6)'; ctx.lineWidth = 1; ctx.beginPath();
      if (!vertical) { ctx.moveTo(x, 10); ctx.lineTo(x, H - 26); } else { ctx.moveTo(12, y); ctx.lineTo(W - 8, y); }
      ctx.stroke();
    }
  }

  // ---------------- card
  function showCard(n) {
    selected = n;
    const yr = n.fuzzy ? `c. ${n.fuzzy[0]}–${n.fuzzy[1]}` : String(Math.floor(n.year));
    const kind = n.kind === 'mod' ? 'Fan-made' : n.kind === 'event' ? 'Behind closed doors' : 'Studio game';
    const end = n.dead ? ` · ${n.deadLabel ? 'maintenance mode' : 'shut down'} ${Math.floor(n.dead)}` : '';
    const rev = n.revive ? ` · revived ${Math.floor(n.revive)}` : '';
    card.innerHTML = `<div class="fam-card-h"><span class="fig">${yr} · ${kind}${end}${rev}</span><h4>${n.name}</h4><span class="small">${n.maker}</span></div>
      <p>${n.text}</p>${n.valve ? `<p class="fam-valve"><span class="eyebrow">Hired by Valve</span> ${n.valve}</p>` : ''}`;
  }
  showCard(selected);

  // ---------------- input
  function nodeAt(mx, my) {
    let best = null, bd = 18;
    for (const n of NODES) {
      if (n.year > cursor + 0.01) continue;
      const [x, y] = S(n.year, n.y);
      const d = Math.hypot(mx - x, my - y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  const local = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointermove', (e) => {
    const n = nodeAt(...local(e));
    if (n !== hover) { hover = n; if (n) setLineage(n); else if (!showMods) lineage.clear(); }
    cv.style.cursor = n ? 'pointer' : 'default';
  });
  cv.addEventListener('pointerleave', () => { hover = null; lineage.clear(); });
  cv.addEventListener('click', (e) => {
    const n = nodeAt(...local(e));
    if (n) { showCard(n); setLineage(n); hover = n; }
  });
  // keyboard: step through nodes in time order
  cv.tabIndex = 0;
  const order = [...NODES].sort((a, b) => a.year - b.year);
  cv.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = order.indexOf(selected);
    const j = clamp(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1), 0, order.length - 1);
    showCard(order[j]); setLineage(order[j]); hover = order[j];
  });

  scrub.min = String(T0 + 0.6); scrub.max = String(T1); scrub.step = '0.05'; scrub.value = String(T1);
  const setCursor = (v) => { cursor = v; yearOut.textContent = v >= 2026.9 ? 'Today' : String(Math.floor(v)); scrub.value = String(v); };
  scrub.addEventListener('input', () => { playing = false; playBtn.setAttribute('aria-pressed', 'false'); setCursor(+scrub.value); });
  playBtn.addEventListener('click', () => {
    playing = !playing; playBtn.setAttribute('aria-pressed', String(playing));
    if (playing && cursor >= T1 - 0.1) setCursor(T0 + 0.6);
  });
  modsBtn.addEventListener('click', () => {
    showMods = !showMods; modsBtn.setAttribute('aria-pressed', String(showMods));
    lineage.clear();
  });
  setCursor(T1);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible) {
      if (playing) {
        const nc = cursor + dt * 1.9;
        if (nc >= T1) { setCursor(T1); playing = false; playBtn.setAttribute('aria-pressed', 'false'); } else setCursor(nc);
        // follow the newest node in the card
        const latest = order.filter((n) => n.year <= cursor).pop();
        if (latest && latest !== selected) showCard(latest);
      }
      if (!reduceMotion) for (const p of parts) {
        p.t += dt * p.sp * (p.path.main ? 0.9 : 0.6);
        if (p.t > p.end) p.t = p.start;
      }
      draw(now);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ players
// Single series (reported peaks, dated) against one reference line (TF2 record).
const PEAKS = [
  { d: 2024 + 7.5 / 12, v: 45000, label: 'Mid Aug 2024', note: 'Before Valve had even announced it' },
  { d: 2024 + 8.05 / 12, v: 171490, label: '2 Sep 2024', note: 'First big wave of invites' },
  { d: 2026 + 0.4 / 12, v: 125000, label: 'Jan 2026', note: '"Old Gods, New Blood" update (about 125k)' },
  { d: 2026 + 8.97 / 12, v: 228086, label: 'Late Sep 2026', note: '"City Never Sleeps" update' },
  { d: 2026 + 9.3 / 12, v: 262145, label: '9 Oct 2026', note: 'Passes Team Fortress 2\'s all-time record' },
  { d: 2026 + 9.52 / 12, v: 303347, label: '16 Oct 2026', note: 'All-time peak, after the hero Violet arrives' },
];
const TF2 = 253997;

export function players(plate) {
  const view = plate.querySelector('.view');
  const cv = document.createElement('canvas'); cv.className = 'c2d'; view.prepend(cv);
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Deadlock reported peak players: 45,000 in mid August 2024, 171,490 in September 2024, about 125,000 in January 2026, then 228,086, 262,145 and 303,347 in September and October 2026. Team Fortress 2 record: 253,997.');
  const ctx = cv.getContext('2d');
  const tip = plate.querySelector('[data-tip]');
  let W = 1, H = 1, dpr = 1, hover = -1;
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1); W = view.clientWidth; H = view.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); draw();
  }
  const x0 = 2024.45, x1 = 2027.0, vmax = 320000;
  const M = () => ({ l: W < 520 ? 44 : 58, r: 18, t: 22, b: 30 });
  const X = (d) => { const m = M(); return m.l + (d - x0) / (x1 - x0) * (W - m.l - m.r); };
  const Yv = (v) => { const m = M(); return H - m.b - v / vmax * (H - m.t - m.b); };
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#13171c'; ctx.fillRect(0, 0, W, H);
    const m = M();
    // gridlines
    ctx.font = '11px "DM Mono", monospace'; ctx.textBaseline = 'middle';
    for (let v = 0; v <= 300000; v += 100000) {
      const y = Yv(v);
      ctx.strokeStyle = v ? 'rgba(232,226,212,0.06)' : 'rgba(232,226,212,0.2)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(m.l, y); ctx.lineTo(W - m.r, y); ctx.stroke();
      ctx.fillStyle = '#6f6c64'; ctx.textAlign = 'right'; ctx.fillText(v ? `${v / 1000}k` : '0', m.l - 8, y);
    }
    ctx.textAlign = 'center';
    for (const yr of [2025, 2026, 2027]) {
      const x = X(yr); if (x > W - m.r + 1) continue;
      ctx.strokeStyle = 'rgba(232,226,212,0.06)'; ctx.beginPath(); ctx.moveTo(x, m.t); ctx.lineTo(x, H - m.b); ctx.stroke();
      ctx.fillStyle = '#6f6c64'; ctx.fillText(String(yr), x, H - m.b + 15);
    }
    // TF2 reference
    const ty = Yv(TF2);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(107,151,255,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(m.l, ty); ctx.lineTo(W - m.r, ty); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#a29d90'; ctx.textAlign = 'left'; ctx.font = '11px "DM Mono", monospace';
    ctx.fillText(W < 560 ? 'TF2 record · 253,997' : 'Team Fortress 2 all-time record · 253,997', m.l + 6, ty - 10);
    // stems + dots
    PEAKS.forEach((p, i) => {
      const x = X(p.d), y = Yv(p.v), y0 = Yv(0);
      ctx.strokeStyle = i === hover ? 'rgba(127,240,224,0.9)' : 'rgba(127,240,224,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y + 5); ctx.stroke();
      ctx.fillStyle = '#13171c'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#7ff0e0'; ctx.beginPath(); ctx.arc(x, y, i === hover ? 6 : 4.5, 0, 7); ctx.fill();
    });
    // direct labels on the two endpoints that tell the story
    ctx.font = '600 12px "Spectral", Georgia, serif'; ctx.fillStyle = '#e8e2d4';
    const a = PEAKS[1], b = PEAKS[5];
    ctx.textAlign = 'left'; ctx.fillText('171,490', X(a.d) + 10, Yv(a.v));
    ctx.textAlign = 'right'; ctx.fillText('303,347', X(b.d) - 10, Yv(b.v));
  }
  new ResizeObserver(resize).observe(view);
  function pick(e) {
    const r = cv.getBoundingClientRect(); const mx = e.clientX - r.left;
    let best = -1, bd = 26;
    PEAKS.forEach((p, i) => { const d = Math.abs(X(p.d) - mx); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function showTip(i) {
    hover = i; draw();
    if (i < 0) { tip.hidden = true; return; }
    const p = PEAKS[i];
    tip.hidden = false;
    tip.innerHTML = `<b>${p.v.toLocaleString('en-US')}</b> players at once<br><span>${p.label} · ${p.note}</span>`;
    const x = X(p.d), y = Yv(p.v);
    const w = tip.offsetWidth;
    tip.style.left = `${clamp(x - w / 2, 8, W - w - 8)}px`;
    tip.style.top = `${Math.max(6, y - tip.offsetHeight - 14)}px`;
  }
  cv.addEventListener('pointermove', (e) => showTip(pick(e)));
  cv.addEventListener('pointerdown', (e) => showTip(pick(e)));
  cv.addEventListener('pointerleave', () => showTip(-1));
  resize();
}
