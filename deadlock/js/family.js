// Family-tree chapter.
//  river(plate)   – a flowing "river delta" of games 1989→2026 (2D canvas, particle currents)
//  players(plate) – Deadlock's reported Steam peaks vs Team Fortress 2's all-time record
import { clamp, lerp, smooth, rng, reduceMotion } from './lib.js';

// ------------------------------------------------------------------ data
// Lateral position y ∈ [-1, 1]. Strategy/MOBA above (warm), team shooters and
// first-person shooters below (cool / coral). Time before 1988.5 is compressed.
const T0 = 1971.8, TB = 1988.5, T1 = 2027.2;
const Y = { rts: -0.84, moba: -0.4, dl: 0.0, shoot: 0.3, fps: 0.71 };
const COL = {
  rts: [200, 163, 90],     // brass
  moba: [240, 164, 58],    // amber
  shoot: [107, 151, 255],  // sapphire
  fps: [236, 116, 100],    // coral: first-person shooters
  hybrid: [190, 170, 220],
  dl: [127, 240, 224],     // soul
};

// kind: mod (fan-made) | studio | event. dead: year it shut down. faded: drifts out (no shutdown date).
const NODES = [
  // ---- strategy → MOBA
  { id: 'herzog', lab: 'b', name: 'Herzog Zwei', year: 1989, y: -0.62, s: 'rts', kind: 'studio', maker: 'Technosoft (Sega Mega Drive)',
    text: 'One robot you fly yourself, plus troops you order around: an early sketch of both strategy games and MOBAs.', key: 1 },
  { id: 'dune', lab: 'a', name: 'Dune II', year: 1992, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Westwood Studios',
    text: 'The strategy-game template: gather, build, command an army from above.', key: 1 },
  { id: 'wc1', lab: 'b', name: 'Warcraft', year: 1994, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Blizzard',
    text: 'Blizzard\'s first strategy game.' },
  { id: 'wc2', lab: 'a', name: 'Warcraft II', year: 1995.9, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Blizzard',
    text: 'A huge hit for playing against friends over a network.' },
  { id: 'sc', lab: 'b', name: 'StarCraft', year: 1998.25, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Blizzard',
    text: 'It shipped with a map editor, and fans used it to invent new games inside it.', key: 1 },
  { id: 'futurecop', lab: 'b', name: 'Future Cop: LAPD', year: 1998.6, y: -0.6, s: 'rts', kind: 'studio', maker: 'Electronic Arts',
    text: 'A mode where robot tanks drove at the enemy base while you fought beside them.', faded: 2001 },
  { id: 'aos', lab: 'b', name: 'Aeon of Strife', year: 2000, y: Y.moba, s: 'moba', kind: 'mod', fuzzy: [1998, 2002], maker: 'A StarCraft fan map, often credited to "Aeon64" (disputed)',
    text: 'One hero instead of an army, soldiers marching down three lanes: the seed of the whole genre.', key: 1, parents: ['sc'] },
  { id: 'wc3', lab: 'a', name: 'Warcraft III', year: 2002.5, y: Y.rts, s: 'rts', kind: 'studio', maker: 'Blizzard',
    text: 'A better editor, and heroes that level up and carry items.', key: 1 },
  { id: 'dota', lab: 'a', name: 'DotA', year: 2003.2, y: Y.moba, s: 'moba', kind: 'mod', maker: 'Eul, a Warcraft III fan mapmaker',
    text: 'Defense of the Ancients: a fan map, shared openly, copied and improved by everyone.', key: 1, parents: ['aos', 'wc3'] },
  { id: 'allstars', lab: 'b', name: 'DotA Allstars', year: 2004.2, y: Y.moba, s: 'moba', kind: 'mod', maker: 'Meian & Ragn0r, then Steve "Guinsoo" Feak',
    text: 'The best heroes in one map, plus items you combine and a boss it takes a team to kill.', parents: ['dota'] },
  { id: 'icefrog', lab: 'ar', name: 'IceFrog takes over', year: 2005.4, y: Y.moba, s: 'moba', kind: 'mod', maker: 'IceFrog, an anonymous designer',
    text: 'One patient, anonymous designer tuned it for years until internet cafés worldwide were full of it.', key: 1, parents: ['allstars'],
    valve: 'Hired by Valve in 2009 to make Dota 2.' },
  { id: 'demigod', lab: 'ar', name: 'Demigod', year: 2009.3, y: -0.98, s: 'moba', kind: 'studio', maker: 'Gas Powered Games',
    text: 'The first store-bought game in the genre.', faded: 2012.5 },
  { id: 'lol', lab: 'ar', name: 'League of Legends', year: 2009.8, y: -0.66, s: 'moba', kind: 'studio', maker: 'Riot Games',
    text: 'A free, friendlier DotA that grew past 100 million monthly players.', key: 1, parents: ['allstars'] },
  { id: 'hon', lab: 'ar', name: 'Heroes of Newerth', year: 2010.4, y: -0.52, s: 'moba', kind: 'studio', maker: 'S2 Games',
    text: 'A close copy of DotA, once League\'s biggest rival.', dead: 2022.5 },
  { id: 'dota2', lab: 'a', name: 'Dota 2', year: 2013.5, y: Y.moba, s: 'moba', kind: 'studio', maker: 'Valve',
    text: 'Valve\'s remake of the fan map; its championship once paid out $40 million.', key: 1, parents: ['icefrog'],
    valve: 'A fan map became a Valve game because Valve hired the fan.' },
  { id: 'smite', lab: 'b', name: 'Smite', year: 2014.2, y: -0.2, s: 'moba', kind: 'studio', maker: 'Hi-Rez Studios',
    text: 'A MOBA seen from behind your hero\'s shoulder, where you aim.', key: 1, parents: ['lol'] },
  { id: 'hots', lab: 'ar', name: 'Heroes of the Storm', year: 2015.4, y: -1.0, s: 'moba', kind: 'studio', maker: 'Blizzard',
    text: 'Blizzard\'s shop-free take, now in maintenance mode.', dead: 2022.5, deadLabel: 'maintenance' },
  { id: 'hok', lab: 'ar', name: 'Honor of Kings', year: 2015.9, y: -0.81, s: 'moba', kind: 'studio', maker: 'TiMi Studio Group (Tencent)',
    text: 'A phone MOBA played by 100 million people a day.', key: 1 },
  { id: 'paragon', lab: 'ar', name: 'Paragon', year: 2016.2, y: -0.1, s: 'moba', kind: 'studio', maker: 'Epic Games',
    text: 'A gorgeous third-person MOBA, shut down when Epic bet on Fortnite.', dead: 2018.3, parents: ['smite'] },
  { id: 'mlbb', lab: 'ar', name: 'Mobile Legends', year: 2016.55, y: -0.9, s: 'moba', kind: 'studio', maker: 'Moonton',
    text: 'The phone MOBA of Southeast Asia.' },
  { id: 'wildrift', lab: 'ar', name: 'Wild Rift', year: 2020.8, y: -0.585, s: 'moba', kind: 'studio', maker: 'Riot Games',
    text: 'League rebuilt for phones.', parents: ['lol'] },
  { id: 'unite', lab: 'ar', name: 'Pokémon Unite', year: 2021.5, y: -0.73, s: 'moba', kind: 'studio', maker: 'TiMi / The Pokémon Company',
    text: 'For many children, their first MOBA.', parents: ['hok'] },
  { id: 'predecessor', lab: 'ar', name: 'Predecessor', year: 2024.1, y: -0.1, s: 'moba', kind: 'studio', maker: 'Omeda Studios',
    text: 'Fans rebuilt Paragon from the art Epic gave away.', parents: ['paragon'] },
  { id: 'smite2', lab: 'ar', name: 'Smite 2', year: 2025.05, y: -0.28, s: 'moba', kind: 'studio', maker: 'Hi-Rez Studios',
    text: 'The sequel, free from January 2025.', parents: ['smite'] },

  // ---- first-person shooters
  { id: 'mazewar', lab: 'a', name: 'Maze War', year: 1973.3, y: Y.fps, s: 'fps', kind: 'studio', maker: 'Steve Colley, Greg Thompson & Howard Palmer (NASA Ames)',
    text: 'For the first time you could see another person in a 3D maze, drawn as a floating eyeball, and shoot them.', key: 1 },
  { id: 'spasim', lab: 'b', name: 'Spasim', year: 1974.2, y: 1.0, s: 'fps', kind: 'studio', maker: 'Jim Bowery (PLATO network)',
    text: 'Up to 32 people flying wireframe spaceships on one campus network.', faded: 1980 },
  { id: 'wolf3d', lab: 'a', name: 'Wolfenstein 3D', year: 1992.35, y: Y.fps, s: 'fps', kind: 'studio', maker: 'id Software',
    text: 'Fast 3D corridors on an ordinary PC, passed around for free as shareware.', key: 1 },
  { id: 'doom', lab: 'b', name: 'Doom', year: 1993.95, y: Y.fps, s: 'fps', kind: 'studio', maker: 'id Software',
    text: 'Four friends on one office network, and fans could build their own levels.', key: 1 },
  { id: 'quake', lab: 'a', name: 'Quake', year: 1996.5, y: Y.fps, s: 'fps', kind: 'studio', maker: 'id Software',
    text: 'Real 3D, played over the internet, with rules fans could rewrite.', key: 1 },
  { id: 'goldeneye', lab: 'b', name: 'GoldenEye 007', year: 1997.65, y: 1.0, s: 'fps', kind: 'studio', maker: 'Rare (Nintendo 64)',
    text: 'Four people on one couch, one TV split in four.', parents: ['doom'], faded: 2002 },
  { id: 'halflife', lab: 'a', name: 'Half-Life', year: 1998.9, y: 0.56, s: 'fps', kind: 'studio', maker: 'Valve',
    text: 'Valve\'s first game, built on Quake\'s engine, and a playground for modders.', key: 1, parents: ['quake'] },
  { id: 'cs', lab: 'br', name: 'Counter-Strike', year: 1999.6, y: 0.56, s: 'fps', kind: 'mod', maker: 'Minh "Gooseman" Le & Jess Cliffe (a Half-Life mod)',
    text: 'One life per round, so your team has to plan together.', key: 1, parents: ['halflife'],
    valve: 'Valve bought it and hired its two creators in 2000.' },
  { id: 'ut', lab: 'br', name: 'Quake III & Unreal T.', year: 1999.9, y: 0.93, s: 'fps', kind: 'studio', maker: 'id Software / Epic Games',
    text: 'Shooters built only for playing against people, with bots to fill the gaps.', parents: ['quake'], faded: 2012 },
  { id: 'bf', lab: 'br', name: 'Battlefield 1942', year: 2002.7, y: 0.79, s: 'fps', kind: 'studio', maker: 'DICE',
    text: '64 players at once, on foot, in tanks and in planes.', parents: ['quake'] },
  { id: 'halo2', lab: 'b', name: 'Halo 2', year: 2004.85, y: 1.0, s: 'fps', kind: 'studio', maker: 'Bungie (Xbox)',
    text: 'Press one button and the game finds fair opponents and keeps your friends together.', key: 1, parents: ['goldeneye'], dead: 2010.3 },
  { id: 'gears', lab: 'a', name: 'Gears of War', year: 2006.85, y: 0.63, s: 'fps', kind: 'studio', maker: 'Epic Games (Xbox 360)',
    text: 'The camera moves behind your character\'s shoulder: Deadlock\'s point of view starts here.', key: 1, parents: ['ut'] },
  { id: 'cod4', lab: 'br', name: 'Call of Duty 4', year: 2007.85, y: 0.86, s: 'fps', kind: 'studio', maker: 'Infinity Ward',
    text: 'Every match earns you something permanent, so you keep coming back.', parents: ['ut'] },
  { id: 'dayz', lab: 'b', name: 'DayZ', year: 2012.4, y: 1.0, s: 'fps', kind: 'mod', maker: 'Dean Hall (an ARMA 2 mod)',
    text: 'A fan mod: strangers surviving in one open world, helping or betraying each other.' },
  { id: 'csgo', lab: 'b', name: 'CS:GO', year: 2012.65, y: 0.56, s: 'fps', kind: 'studio', maker: 'Valve & Hidden Path',
    text: 'Counter-Strike rebuilt, with an esports scene and a market for weapon skins.', parents: ['cs'], dead: 2023.7, deadLabel: '→ CS2' },
  { id: 'pubg', lab: 'b', name: 'PUBG', year: 2017.25, y: 1.0, s: 'fps', kind: 'studio', maker: 'PUBG Corp (Brendan Greene)',
    text: '100 people drop onto an island; the last one standing wins.', key: 1, parents: ['dayz'] },
  { id: 'fortnite', lab: 'a', name: 'Fortnite', year: 2017.75, y: 0.93, s: 'fps', kind: 'studio', maker: 'Epic Games',
    text: 'Free, cartoonish, and for many young people the place they hang out with friends.', key: 1, parents: ['pubg', 'gears'] },
  { id: 'apex', lab: 'br', name: 'Apex Legends', year: 2019.1, y: 0.86, s: 'fps', kind: 'studio', maker: 'Respawn Entertainment',
    text: 'Heroes with powers in a battle royale, and a "ping" to talk without speaking.', parents: ['cod4', 'pubg'] },
  { id: 'valorant', lab: 'a', name: 'Valorant', year: 2020.45, y: 0.56, s: 'fps', kind: 'studio', maker: 'Riot Games',
    text: 'Counter-Strike\'s tense rounds, plus superpowers.', parents: ['csgo', 'overwatch'] },
  { id: 'cs2', lab: 'b', name: 'Counter-Strike 2', year: 2023.73, y: 0.56, s: 'fps', kind: 'studio', maker: 'Valve',
    text: 'Counter-Strike on Source 2, the same engine Deadlock runs on.', parents: ['csgo'] },

  // ---- team shooters (classes → heroes)
  { id: 'tf', lab: 'b', name: 'Team Fortress', year: 1996.9, y: Y.shoot, s: 'shoot', kind: 'mod', maker: 'Robin Walker, John Cook & Ian Caughley (a Quake mod)',
    text: 'Pick a job, medic, sniper or builder, and win as a team.', key: 1, parents: ['quake'],
    valve: 'Valve hired its creators in 1998.' },
  { id: 'tfc', lab: 'a', name: 'Team Fortress Classic', year: 1999.3, y: Y.shoot, s: 'shoot', kind: 'studio', maker: 'Valve',
    text: 'Valve\'s remake, by the people who made the mod.', parents: ['tf'] },
  { id: 'tf2', lab: 'b', name: 'Team Fortress 2', year: 2007.8, y: Y.shoot, s: 'shoot', kind: 'studio', maker: 'Valve',
    text: 'Nine characters you can recognise by shape alone: the first hero shooter.', key: 1, parents: ['tfc'] },
  { id: 'mnc', lab: 'l', name: 'Monday Night Combat', year: 2010.5, y: 0.2, s: 'hybrid', kind: 'studio', maker: 'Uber Entertainment',
    text: 'A shooter with lanes, marching robots and upgrades: Deadlock before Deadlock.', key: 1, parents: ['tf2', 'allstars'] },
  { id: 'smnc', lab: 'b', name: 'Super MNC', year: 2012.3, y: 0.2, s: 'hybrid', kind: 'studio', maker: 'Uber Entertainment',
    text: 'Made the MOBA parts explicit; switched off in 2018.', dead: 2018.4, parents: ['mnc'] },
  { id: 'battleborn', lab: 'l', name: 'Battleborn', year: 2016.35, y: 0.14, s: 'hybrid', kind: 'studio', maker: 'Gearbox',
    text: 'A hero shooter with lanes, buried by Overwatch three weeks later.', dead: 2021.1, parents: ['tf2', 'lol'] },
  { id: 'overwatch', lab: 'br', name: 'Overwatch', year: 2016.4, y: 0.4, s: 'shoot', kind: 'studio', maker: 'Blizzard',
    text: 'Made "hero shooter" a household phrase.', key: 1, parents: ['tf2'] },
  { id: 'gigantic', lab: 'l', name: 'Gigantic', year: 2017.55, y: 0.08, s: 'hybrid', kind: 'studio', maker: 'Motiga',
    text: 'Teams defending giant beasts; shut in 2018, revived in 2024.', dead: 2018.6, revive: 2024.3, parents: ['tf2', 'lol'] },
  { id: 'rivals', lab: 'br', name: 'Marvel Rivals', year: 2024.95, y: 0.46, s: 'shoot', kind: 'studio', maker: 'NetEase',
    text: 'A third-person hero shooter with 644,269 players at once on Steam.', parents: ['overwatch'] },

  // ---- Deadlock
  { id: 'citadel', lab: 'br', name: 'Citadel', year: 2018.5, y: Y.dl, s: 'dl', kind: 'event', maker: 'Valve, in secret',
    text: 'Work reportedly begins in secret around 2018.', parents: ['dota2', 'tf2', 'gears'] },
  { id: 'deadlock', lab: 'l', name: 'Deadlock', year: 2024.65, y: Y.dl, s: 'dl', kind: 'studio', maker: 'Valve',
    text: 'Dota\'s map, Team Fortress\'s cast, a shooter\'s aim and movement. Still invite-only; 303,347 players at once.', key: 1,
    parents: ['citadel', 'dota2', 'tf2', 'gears', 'smite', 'mnc'] },
];
const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
const MAIN_Y = new Set([Y.moba, Y.rts, Y.shoot, Y.fps]);

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
  paths.push(P([[1996.9, Y.shoot], [T1, Y.shoot]], { c: 'shoot', w: 1.3, main: 1 }));
  paths.push(P([[1973.3, Y.fps], [T1, Y.fps]], { c: 'fps', w: 1.3, main: 1 }));
  // Aeon of Strife leaves StarCraft; Team Fortress leaves Quake
  paths.push(P([[1998.25, Y.rts], [2000, Y.moba]], { c: 'rts', w: 0.45 }));
  paths.push(P([[1996.5, Y.fps], [1996.9, Y.shoot]], { c: 'fps', w: 0.55, thread: 1 }));
  // branches: leave the parent line ~1.3 years before the node, then run to death / fade / edge
  for (const n of NODES) {
    if (n.s === 'dl' || (MAIN_Y.has(n.y) && n.s !== 'hybrid')) continue;
    if (n.id === 'herzog' || n.id === 'futurecop') continue;
    const par = n.parents ? byId[n.parents[0]] : null;
    const py = par ? par.y : n.s === 'fps' ? Y.fps : n.s === 'shoot' || n.s === 'hybrid' ? Y.shoot : Y.moba;
    const t0 = Math.max(par ? par.year : (n.s === 'fps' ? 1973.3 : T0), n.year - 1.3);
    const end = n.dead ?? n.faded ?? T1;
    const c = n.s;
    paths.push(P([[t0, py], [n.year, n.y], [end, n.y]], { c, w: 0.55, node: n, fade: !!n.faded, dead: !!n.dead, alive: !n.dead && !n.faded }));
    if (n.revive) paths.push(P([[n.revive, n.y], [T1, n.y]], { c, w: 0.4, node: n, alive: 1 }));
    // second parent thread (braids across streams)
    if (n.parents && n.parents[1]) {
      const p2 = byId[n.parents[1]];
      if (p2 && p2.year < n.year && p2.y !== n.y) paths.push(P([[Math.max(p2.year, n.year - 1.6), p2.y], [n.year, n.y]], { c: p2.s, w: 0.3, thread: 1 }));
    }
  }
  // Paragon's free art → Predecessor (dotted inheritance)
  paths.push(P([[2018.3, -0.1], [2024.1, -0.1]], { c: 'moba', w: 0.3, dotted: 1 }));
  // Deadlock: threads from Dota 2, TF2 and the over-the-shoulder shooters, then the bright line
  paths.push(P([[2013.5, Y.moba], [2018.5, Y.dl]], { c: 'moba', w: 0.55, thread: 1, toDl: 1 }));
  paths.push(P([[2007.8, Y.shoot], [2018.5, Y.dl]], { c: 'shoot', w: 0.55, thread: 1, toDl: 1 }));
  paths.push(P([[2006.85, 0.63], [2018.5, Y.dl]], { c: 'fps', w: 0.55, thread: 1, toDl: 1 }));
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
  cv.setAttribute('aria-label', 'A timeline from 1973 to 2026 showing three families of games, strategy games and MOBAs, team shooters, and first-person shooters, flowing into Deadlock. Each game is described in the card below the figure.');
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
  function pad() { return vertical ? { a: 40, b: 26, l: 30, r: 30 } : { a: 54, b: 36, l: 34, r: 52 }; }
  const FR = 0.13; // share of the axis given to 1972–1988
  const U = (t) => (t < TB ? FR * (t - T0) / (TB - T0) : FR + (1 - FR) * (t - TB) / (T1 - TB));
  function S(t, y) {
    const p = pad();
    const u = U(t);
    if (!vertical) return [p.a + u * (W - p.a - p.b), p.l + (y + 1) / 2 * (H - p.l - p.r)];
    return [p.l + (y + 1) / 2 * (W - p.l - p.r), p.a + u * (H - p.a - p.b)];
  }
  const ppy = () => (vertical ? H : W) * 0.87 / (T1 - TB); // pixels per year (after the break)

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
    {
      const [bx, by] = S(TB, 1);
      ctx.strokeStyle = 'rgba(232,226,212,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath();
      if (!vertical) { for (const o of [-3, 3]) { ctx.moveTo(bx + o - 4, H - 22); ctx.lineTo(bx + o + 4, H - 6); } }
      else { for (const o of [-3, 3]) { ctx.moveTo(4, by + o + 4); ctx.lineTo(20, by + o - 4); } }
      ctx.stroke();
    }
    for (const yr of [1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025]) {
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
      lab('TEAM SHOOTERS · PICK A ROLE', 1989.1, Y.shoot, COL.shoot);
      lab('FIRST-PERSON SHOOTERS', 1974.6, Y.fps + 0.07, COL.fps);
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

  window.__famDraw = (yr) => { if (yr) setCursor(yr); draw(performance.now()); }; // debug: draw without rAF
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible) {
      if (playing) {
        const nc = cursor + dt * (cursor < TB ? 7 : 1.9);
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
