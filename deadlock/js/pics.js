// Pictograms: small deco-style SVG drawings that replace paragraphs.
// <figure class="pic" data-pic="towers"></figure> → filled on load.
const A = 'var(--amber)', S = 'var(--sapphire)', B = 'var(--brass)', P = 'var(--paper)', D = 'var(--dim)', F = 'var(--faint)', O = 'var(--soul)', R = 'var(--rule)';
const ORB_MINE = '#9cffb0', ORB_THEIRS = '#ff9a4a';
const W_ = '#dc7428', V_ = '#2fa58c', SP_ = '#a070e8';

const t = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || D}" font-family="var(--f-${o.f || 'mono'})" font-size="${o.size || 11}" text-anchor="${o.a || 'middle'}" letter-spacing="${o.ls ?? 0.8}" font-weight="${o.w || 400}">${s}</text>`;
const big = (x, y, s, c = P, size = 22, a = 'middle') => t(x, y, s, { c, f: 'display', size, w: 800, a, ls: 0.5 });
const person = (x, y, c, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-17" r="5.5" fill="${c}"/><rect x="-6.5" y="-10" width="13" height="17" rx="5" fill="${c}"/><rect x="-5" y="5" width="4" height="10" rx="2" fill="${c}"/><rect x="1" y="5" width="4" height="10" rx="2" fill="${c}"/></g>`;
const trooper = (x, y, c, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-12" width="8" height="12" rx="4" fill="${c}"/><circle cx="0" cy="-15" r="3.4" fill="${c}"/></g>`;
const svg = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
const arrow = (x1, y1, x2, y2, c = B, dash = '') => {
  const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1.5" ${dash ? `stroke-dasharray="${dash}"` : ''}/><path d="M${x2} ${y2} L${x2 - h * Math.cos(a - 0.45)} ${y2 - h * Math.sin(a - 0.45)} L${x2 - h * Math.cos(a + 0.45)} ${y2 - h * Math.sin(a + 0.45)}Z" fill="${c}"/>`;
};
const glow = (id, c) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="0.9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;

// ---------------------------------------------------------------- drawings
const PICS = {
  // Valve's games on one line; hollow = began as someone else's fan project
  valve() {
    const G = [[1998, 'Half-Life', 0], [1999, 'Team Fortress', 1], [2000, 'Counter-Strike', 1], [2004, 'Half-Life 2', 0], [2007, 'Portal', 1], [2007.4, 'Team Fortress 2', 0], [2008, 'Left 4 Dead', 1], [2011, 'Portal 2', 0], [2013, 'Dota 2', 1], [2018, 'Artifact', 0], [2020, 'Half-Life: Alyx', 0], [2024, 'Deadlock', 0]];
    const X = (y) => 30 + ((y - 1996) / 30) * 540;
    let b = `<line x1="20" y1="120" x2="580" y2="120" stroke="${B}" stroke-width="1.5"/>`;
    for (let y = 2000; y <= 2025; y += 5) b += `<line x1="${X(y)}" y1="116" x2="${X(y)}" y2="124" stroke="${F}"/>` + t(X(y), 142, y, { size: 10, c: F });
    b += `<rect x="${X(2003)}" y="126" width="${X(2026) - X(2003)}" height="4" fill="${O}" opacity="0.5"/>` + t(X(2003) + 4, 160, 'STEAM, 2003 →', { a: 'start', size: 9, c: O });
    G.forEach(([y, n, mod], i) => {
      const x = X(y), up = i % 2 === 0, ly = up ? 42 : 80, c = n === 'Deadlock' ? A : n === 'Artifact' ? 'var(--blood)' : P;
      b += `<line x1="${x}" y1="${up ? 52 : 90}" x2="${x}" y2="114" stroke="${R}"/>`;
      b += `<circle cx="${x}" cy="120" r="6" fill="${mod ? 'var(--ink)' : c}" stroke="${c}" stroke-width="2"/>`;
      b += t(x, ly, n.toUpperCase(), { c, size: 10 });
    });
    b += `<circle cx="30" cy="12" r="5" fill="var(--ink)" stroke="${P}" stroke-width="2"/>` + t(42, 16, 'BEGAN AS SOMEONE ELSE’S FAN PROJECT', { a: 'start', size: 9 });
    return svg(600, 168, b, 'Valve games from 1998 to 2024; several began as fan projects');
  },

  // two gods, six heroes each
  teams() {
    let b = `<defs>${glow('gA', '#f0a43a')}${glow('gS', '#6b97ff')}</defs>`;
    b += `<circle cx="80" cy="78" r="64" fill="url(#gA)" opacity="0.5"/><circle cx="520" cy="78" r="64" fill="url(#gS)" opacity="0.5"/>`;
    // Hidden King: antlered shadow
    b += `<g transform="translate(80 84)"><circle r="24" fill="#120f0b" stroke="${A}" stroke-width="2"/><circle cx="-8" cy="-3" r="3.2" fill="${A}"/><circle cx="8" cy="-3" r="3.2" fill="${A}"/>
      <path d="M-14 -20 L-26 -46 M-20 -34 L-34 -38 M-24 -42 L-20 -54 M14 -20 L26 -46 M20 -34 L34 -38 M24 -42 L20 -54" stroke="${A}" stroke-width="2.4" stroke-linecap="round" fill="none"/></g>`;
    // Archmother: cracked crowned mask
    b += `<g transform="translate(520 84)"><ellipse rx="22" ry="27" fill="#0d1220" stroke="${S}" stroke-width="2"/><path d="M-9 -4 h6 M3 -4 h6 M-4 10 q4 3 8 0" stroke="${S}" stroke-width="2" fill="none"/><path d="M4 -27 l-3 12 l5 6 l-4 12" stroke="${S}" stroke-width="1.4" fill="none"/>
      ${[-60, -35, -12, 12, 35, 60].map((d) => `<line x1="0" y1="-30" x2="${Math.sin((d * Math.PI) / 180) * 18}" y2="${-30 - Math.cos((d * Math.PI) / 180) * 18}" stroke="${S}" stroke-width="2.4" stroke-linecap="round" transform="translate(${Math.sin((d * Math.PI) / 180) * 8} 0)"/>`).join('')}</g>`;
    for (let i = 0; i < 6; i++) b += person(170 + i * 24, 112, A);
    for (let i = 0; i < 6; i++) b += person(310 + i * 24, 112, S);
    b += big(300, 70, 'VS', B, 26);
    b += t(80, 150, 'THE HIDDEN KING', { c: A }) + t(520, 150, 'THE ARCHMOTHER', { c: S });
    b += t(230, 150, '6 PLAYERS') + t(370, 150, '6 PLAYERS');
    return svg(600, 162, b, 'Six heroes serve the Hidden King, six serve the Archmother');
  },
  // the 4 rules as pictures
  rules() {
    const cell = (x, inner, cap, sub) => `<g transform="translate(${x} 0)"><rect x="4" y="4" width="142" height="128" fill="none" stroke="${R}"/>${inner}${t(75, 150, cap, { c: P, size: 12 })}${t(75, 166, sub, { size: 10 })}</g>`;
    let lanes = '';
    for (const [i, c] of [[-1, '#e6c24a'], [0, '#6b97ff'], [1, '#6fbf73']]) lanes += `<path d="M75 116 C ${75 + i * 70} 90, ${75 + i * 70} 50, 75 22" stroke="${c}" stroke-width="3" fill="none"/>`;
    lanes += `<circle cx="75" cy="116" r="9" fill="${A}"/><circle cx="75" cy="22" r="9" fill="${S}"/>`;
    let wave = '';
    for (let i = 0; i < 4; i++) wave += trooper(36 + i * 13, 90, A, 1.4);
    for (let i = 0; i < 4; i++) wave += trooper(78 + i * 13, 90, S, 1.4);
    wave += `<circle cx="75" cy="46" r="18" fill="none" stroke="${B}" stroke-width="1.5"/><path d="M75 46 V33 M75 46 L84 50" stroke="${B}" stroke-width="1.6"/>` + t(75, 118, '30 s', { c: B });
    let ppl = '';
    for (let i = 0; i < 6; i++) ppl += person(32 + (i % 3) * 18, 62 + Math.floor(i / 3) * 40, A, 0.8);
    for (let i = 0; i < 6; i++) ppl += person(84 + (i % 3) * 18, 62 + Math.floor(i / 3) * 40, S, 0.8);
    const god = `<circle cx="75" cy="68" r="34" fill="none" stroke="${S}" stroke-width="2"/><circle cx="75" cy="68" r="18" fill="${S}" opacity="0.8"/><path d="M58 40 L76 66 L68 72 L92 98" stroke="${P}" stroke-width="2.5" fill="none"/>`;
    return svg(600, 176, cell(0, ppl, '6 AGAINST 6', 'each plays one hero') + cell(150, lanes, '3 STREETS', 'York · Broadway · Greenwich') + cell(300, wave, 'SOLDIERS MARCH', 'four per lane, every 30 s') + cell(450, god, 'KILL THEIR GOD', 'about 35 minutes'), 'The rules: six against six, three lanes, troopers every thirty seconds, destroy the enemy god');
  },
  // stalemate vs push
  push() {
    const lane = (y, front, lbl, heroesA, heroesS) => {
      let b = `<line x1="40" y1="${y}" x2="560" y2="${y}" stroke="${R}" stroke-width="10" stroke-linecap="round"/>`;
      b += `<rect x="22" y="${y - 16}" width="22" height="32" fill="${A}"/><rect x="556" y="${y - 16}" width="22" height="32" fill="${S}"/>`;
      const fx = 40 + front * 520;
      for (let i = 0; i < 4; i++) b += trooper(fx - 14 - i * 11, y + 4, A, 1.3);
      for (let i = 0; i < 4; i++) b += trooper(fx + 14 + i * 11, y + 4, S, 1.3);
      b += `<circle cx="${fx}" cy="${y}" r="16" fill="none" stroke="${front > 0.52 ? A : P}" stroke-width="2"/>`;
      for (let i = 0; i < heroesA; i++) b += person(fx - 70 - i * 18, y + 2, A, 0.9);
      for (let i = 0; i < heroesS; i++) b += person(fx + 70 + i * 18, y + 2, S, 0.9);
      b += t(300, y - 26, lbl, { c: P, size: 11 });
      return b;
    };
    let b = lane(50, 0.5, 'NOBODY HELPS: THE WAVES MEET IN THE MIDDLE, FOREVER', 0, 0);
    b += lane(140, 0.72, '2 HEROES AGAINST 0: THE FRONT SLIDES TOWARD THEIR BASE', 2, 0);
    b += arrow(340, 160, 420, 160, A);
    return svg(600, 176, b, 'An unattended lane is a stalemate; heroes tip it');
  },
  // tower order
  towers() {
    const items = [
      ['GUARDIAN', '5,500 HP', 'weakens with time'], ['WALKER', '6,000 HP', '+1 item slot'], ['BASE GUARDS', '2 × 4,000', 'opens the base'],
      ['2 SHRINES', '5,000 each', 'super troopers'], ['PATRON', '12,000 × 2', 'you win'],
    ];
    const icon = (k, x) => {
      const y = 70;
      if (k === 0) return `<g transform="translate(${x} ${y})"><rect x="-6" y="-20" width="12" height="38" fill="${S}"/><rect x="-12" y="18" width="24" height="7" fill="${S}"/><path d="M-11 -22 h22 l-5 -8 h-12z" fill="${S}"/><circle cx="0" cy="-36" r="8" fill="url(#gfire)"/></g>`;
      if (k === 1) return `<g transform="translate(${x} ${y})"><rect x="-20" y="-24" width="40" height="22" fill="${S}"/><rect x="-9" y="-36" width="18" height="12" fill="${S}"/><circle cx="0" cy="-30" r="3" fill="${P}"/>${[-16, -6, 6, 16].map((lx) => `<line x1="${lx}" y1="-2" x2="${lx * 1.3}" y2="25" stroke="${S}" stroke-width="4"/>`).join('')}</g>`;
      if (k === 2) return `<g transform="translate(${x} ${y})">${[-12, 12].map((o) => `<rect x="${o - 4}" y="-14" width="8" height="30" fill="${S}"/><circle cx="${o}" cy="-20" r="5" fill="url(#gfire)"/>`).join('')}<rect x="-22" y="16" width="44" height="6" fill="${S}"/></g>`;
      if (k === 3) return `<g transform="translate(${x} ${y})">${[-13, 13].map((o) => `<path d="M${o} -26 l9 40 h-18z" fill="${S}"/><circle cx="${o}" cy="-30" r="7" fill="url(#gS2)"/>`).join('')}</g>`;
      return `<g transform="translate(${x} ${y})"><circle cx="0" cy="-8" r="34" fill="url(#gS2)"/><circle cx="0" cy="-8" r="14" fill="${S}"/><path d="M-24 22 h48 l-6 -10 h-36z" fill="${S}"/></g>`;
    };
    let b = `<defs>${glow('gfire', '#6b97ff')}${glow('gS2', '#6b97ff')}</defs>`;
    items.forEach(([n, hp, note], i) => {
      const x = 60 + i * 120;
      b += icon(i, x) + t(x, 128, n, { c: P, size: 11 }) + t(x, 144, hp, { c: B, size: 10 }) + t(x, 159, note, { size: 10 });
      if (i < 4) b += arrow(x + 40, 62, x + 78, 62, F);
    });
    return svg(600, 168, b, 'Destroy in order: Guardian, Walker, Base Guardians, Shrines, Patron');
  },
  // a trooper's bounty splits in two
  orb() {
    let b = `<defs>${glow('gOm', ORB_MINE)}${glow('gOt', ORB_THEIRS)}</defs>`;
    b += trooper(110, 120, S, 3) + `<path d="M92 66 l36 36 M128 66 l-36 36" stroke="${P}" stroke-width="3"/>` + t(110, 150, 'A TROOPER DIES', { c: P }) + t(110, 166, 'worth ~100 souls');
    b += arrow(160, 96, 250, 132, F) + arrow(160, 80, 250, 44, F);
    b += `<ellipse cx="300" cy="140" rx="34" ry="8" fill="${ORB_MINE}" opacity="0.35"/><circle cx="300" cy="136" r="6" fill="${ORB_MINE}"/>` + t(300, 166, 'HALF DROPS TO THE GROUND', { c: P, size: 10 }) + t(420, 140, 'the killing team walks over it', { a: 'start', size: 10 });
    b += `<circle cx="300" cy="40" r="26" fill="url(#gOm)"/><circle cx="300" cy="40" r="8" fill="${ORB_MINE}"/>` + t(300, 84, 'HALF FLOATS UP AS AN ORB', { c: P, size: 10 });
    b += arrow(338, 34, 420, 22, ORB_MINE) + t(428, 26, 'YOUR TEAM SHOOTS IT: CONFIRMED', { c: ORB_MINE, a: 'start', size: 10 });
    b += arrow(338, 48, 420, 60, ORB_THEIRS) + t(428, 64, 'ENEMY SHOOTS IT FIRST: DENIED', { c: ORB_THEIRS, a: 'start', size: 10 }) + t(428, 78, 'and the souls are theirs', { a: 'start', size: 10 });
    return svg(600, 176, b, 'A dead trooper drops half its souls on the ground and half as a floating orb that either team can shoot');
  },
  // ability unlocks along the souls line
  unlocks() {
    const pts = [[600, '1st ability'], [1100, '2nd ability'], [2000, '3rd ability'], [3800, 'ULTIMATE']];
    const X = (v) => 40 + (v / 4200) * 520;
    let b = `<line x1="40" y1="90" x2="560" y2="90" stroke="${B}" stroke-width="1.5"/>`;
    for (let v = 0; v <= 4000; v += 500) b += `<line x1="${X(v)}" y1="86" x2="${X(v)}" y2="94" stroke="${F}"/>` + t(X(v), 112, v.toLocaleString(), { size: 9, c: F });
    pts.forEach(([v, n], i) => {
      const x = X(v), r = i === 3 ? 22 : 15;
      b += `<line x1="${x}" y1="90" x2="${x}" y2="${60 - r}" stroke="${O}" stroke-dasharray="2 3"/>`;
      b += `<g transform="translate(${x} ${48 - r / 2})"><rect x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" transform="rotate(45)" fill="none" stroke="${i === 3 ? A : O}" stroke-width="2"/>${big(0, 7, String(i + 1), i === 3 ? A : O, i === 3 ? 22 : 16)}</g>`;
      b += t(x, 140, n.toUpperCase(), { c: P, size: 10 }) + t(x, 154, `${v.toLocaleString()} souls`, { size: 10 });
    });
    return svg(600, 164, b, 'Abilities unlock at 600, 1,100 and 2,000 souls; the ultimate at 3,800');
  },
  // three item colors
  items() {
    const col = (x, c, n, ex) => `<g transform="translate(${x} 0)"><rect x="10" y="14" width="170" height="104" fill="none" stroke="${c}" stroke-width="1.5"/>${[0, 1, 2, 3].map((i) => `<rect x="${24 + i * 38}" y="34" width="30" height="30" fill="${c}" opacity="${0.35 + i * 0.2}"/>${t(39 + i * 38, 80, ['800', '1.6k', '3.2k', '6.4k'][i], { size: 9 })}`).join('')}${big(95, 108, n, c, 18)}${t(95, 140, ex, { size: 10 })}</g>`;
    return svg(600, 152, col(0, W_, 'WEAPON', 'your gun hits harder') + col(205, V_, 'VITALITY', 'you are harder to kill') + col(410, SP_, 'SPIRIT', 'your abilities hit harder'), 'Items come in three colors and four price tiers');
  },
  // movement costs
  moves() {
    const pip = (x, y, n) => [0, 1, 2].map((i) => `<rect x="${x + i * 12}" y="${y}" width="9" height="5" fill="${i < n ? O : 'none'}" stroke="${O}"/>`).join('');
    const cell = (x, draw, n, cost, note) => `<g transform="translate(${x} 0)">${draw}${t(70, 128, n, { c: P, size: 11 })}${pip(52, 136, cost)}${t(70, 158, note, { size: 9 })}</g>`;
    const fig = (x, y) => person(x, y, P, 0.75);
    const dash = fig(28, 96) + `<path d="M40 88 h70" stroke="${O}" stroke-width="3" stroke-dasharray="4 4"/>` + arrow(100, 88, 116, 88, O);
    const dj = fig(20, 96) + `<path d="M30 86 Q 70 0 120 90" stroke="${O}" stroke-width="3" fill="none" stroke-dasharray="4 4"/>`;
    const wj = `<rect x="104" y="20" width="10" height="90" fill="${R}"/>` + fig(40, 104) + `<path d="M48 90 L100 60 L70 40 L100 18" stroke="${O}" stroke-width="3" fill="none" stroke-dasharray="4 4"/>`;
    const sl = `<path d="M10 70 L130 104" stroke="${R}" stroke-width="4"/>` + `<g transform="translate(60 80) rotate(-60)">${person(0, 0, P, 0.7)}</g>` + arrow(76, 94, 126, 108, O);
    return svg(600, 168, cell(0, dash, 'DASH', 1, 'about 10 meters') + cell(150, dj, 'DASH-JUMP', 2, 'the long leap') + cell(300, wj, 'WALL JUMP', 0, 'first one free') + cell(450, sl, 'SLIDE', 0, 'keep your speed'), 'Movement costs stamina: dash 1, dash-jump 2, first wall jump free, slide free');
  },
};

export function drawPics(root = document) {
  root.querySelectorAll('[data-pic]').forEach((el) => {
    const f = PICS[el.dataset.pic];
    if (f && !el.dataset.drawn) { el.insertAdjacentHTML('afterbegin', f()); el.dataset.drawn = '1'; }
  });
}
