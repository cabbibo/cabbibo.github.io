// Chapter IV: heroes & items.
//  roster(el) – the 44-hero cast as filterable typographic cards (DOM)
//  shop(el)   – a build toy: 9+3 slots, three item colors, and a triangle
//               that shows where your spending is taking the hero (SVG)

// [name, Valve's three tags, arrival, one-liner]
// arrival: o = original roster, a = Aug 2025, j = Jan–Feb 2026, t = Oct 2026
const HEROES = [
  ['Abrams', ['Tank', 'Brawler', 'Bull-Headed'], 'o', 'A burly occult detective. Shotgun brawler who charges in and drains life.'],
  ['Apollo', ['Finesse', 'Mobility', 'A Cut Above'], 'j', 'Heir to the throne of the other-dimension Ixia. A fencer who parries, lunges and duels lone targets.'],
  ['Baba', ['Cackling', 'Beady', 'Hexing'], 't', 'Baba Yaga as Central Park’s pigeon lady. Rides a long-legged bench, steals spirit with yarn, calls pigeon strikes.'],
  ['Bebop', ['Hook', 'Bomb', 'Punch'], 'o', 'A scrappy robot. Hooks enemies toward him, sticks bombs on things, fires a giant laser.'],
  ['Billy', ['Punk', 'Chaotic', 'G.O.A.T.'], 'a', 'A goat-headed punk with a spiked bat and a submachine gun who yanks enemies in with a chain.'],
  ['Calico', ['Tricksy', 'Slippery', 'Burst Damage'], 'o', 'A former monster hunter with cat spirits. Slashes in, then slips away as a shadow cat.'],
  ['Celeste', ['Performer', 'Disruptive', 'Dazzling'], 'j', 'A unicorn hiding among Coney Island carnies. Dazzling light attacks, silences and homing shots.'],
  ['Deadman Danny', ['Reckless', 'High-flying', 'Explosive'], 't', 'A jetpack-wearing Fairfax Industries salesman with a rocket launcher who grabs foes and crash-lands with them.'],
  ['The Doorman', ['Disorienting', 'Map Control', 'Mind Games'], 'a', 'A polite, godlike hotel doorman. Opens linked portal doors and checks a victim into a pocket-dimension hotel.'],
  ['Drifter', ['Stalker', 'Bloodthirsty', 'Cruel'], 'a', 'An ancient vampire who hunts lone victims, appears behind marked targets and casts isolating darkness.'],
  ['Dynamo', ['Teamplay', 'Initiator', 'Clutch'], 'o', 'A cosmic scientist. Pulls the whole enemy team into a singularity and heals allies.'],
  ['Graves', ['Morbid', 'Area Denial', 'Necromancer'], 'j', 'A teenage necromancer with a lich’s hand who raises ghouls and gravestones.'],
  ['Grey Talon', ['Precision', 'Hunter', 'Area Denial'], 'o', 'A bow-wielding hunter with an owl. Long-range shots and a rain of arrows across the whole map.'],
  ['Haze', ['Assassin', 'Stealthy', 'Lethal'], 'o', 'A government assassin. Turns invisible, puts targets to sleep with a dagger, then unloads a storm of bullets.'],
  ['Holliday', ['Crackshot', 'Explosive', 'Apprehender'], 'o', 'A cowgirl lawwoman with powder kegs, bounce pads and a lasso.'],
  ['Infernus', ['Arsonist', 'Explosive', 'Burn Rubber'], 'o', 'A demonic bartender. Everything he touches burns, and then he explodes.'],
  ['Ivy', ['Team-up', 'Disruptor', 'Rock Solid'], 'o', 'A gargoyle who carries allies through the air and turns to stone.'],
  ['Kelvin', ['Protector', 'Explorer', 'Ice Cold'], 'o', 'A polar explorer. Lays ice paths, heals with a beam, and drops a freezing dome.'],
  ['Lady Geist', ['Lifesteal', 'Self Damage', 'Fatale'], 'o', 'A glamorous ghost who spends her own health for damage and can swap health with an enemy.'],
  ['Lash', ['Initiator', 'High-Flying', 'Arrogant'], 'o', 'An arrogant whip fighter who grapples around, slams down from the sky, and flings the enemy team.'],
  ['McGinnis', ['Inventor', 'Support', 'Disruption'], 'o', 'An engineer who builds turrets and walls and heals her allies.'],
  ['Mina', ['Harasser', 'Nimble', 'Vexing'], 'a', 'A newly turned vampire who wants to be Viscount of New York. Umbrella slashes and an escape in bat form.'],
  ['Mirage', ['Bodyguard', 'Traveller', 'Focused'], 'o', 'A desert traveller with scarab beetles, a tornado, and a teleport across the whole map.'],
  ['Mo & Krill', ['Tag-Team', 'Initiator', 'Burrower'], 'o', 'A man and his giant armadillo. They burrow underground, pop up, and hold an enemy in place.'],
  ['Nurse Harrow', ['Strict', 'Terrifying', 'Savior'], 't', 'A nurse at a possession ward. Fires healing needles at allies, sets draining leeches on enemies, and terrifies.'],
  ['Paige', ['Helpful', 'Protector', 'Booksmart'], 'a', 'A bibliomancer who summons storybook spirits: a book dragon, an ally shield, a charge of spectral knights.'],
  ['Paradox', ['Calculated', 'Disruptor', 'Tactician'], 'o', 'A time thief. Builds walls that stun, fires a charged rifle, and swaps places with enemies.'],
  ['Pocket', ['Trickster', 'Burst Damage', 'Frogs'], 'o', 'A small cloaked figure who travels in a suitcase and bursts enemies with frog-themed tricks.'],
  ['Rat King', ['Scrappy', 'Regal', 'Tenacious'], 't', 'Sewer royalty planning a rat nation. Rat swarms and a banner that buffs allies. Born from a fan forum joke.'],
  ['Rem', ['Helpful', 'Tiny', 'zZzzZ'], 'j', 'A sleepy child from the dream world who summons little helpers, rides on allies, and puts enemies to sleep.'],
  ['Seven', ['High Voltage', 'Merciless', 'Area Denial'], 'o', 'A lightning wizard who escaped an oubliette. His ultimate is an electric storm.'],
  ['Shiv', ['Rage', 'Bleed', 'Repeat'], 'o', 'A knife-throwing monster hunter who builds rage and finishes off weakened enemies.'],
  ['Silver', ['Feral', 'Hot Mess', 'Transformation'], 'j', 'A werewolf bounty hunter: bola and boot kick as a human, mauling leaps as a wolf.'],
  ['Sinclair', ['Trickster', 'Copycat', 'Versatile'], 'o', 'A stage magician who turns enemies into rabbits and copies their ultimates.'],
  ['Solomon', ['Strategist', 'Focused', 'Checkmate'], 't', 'A Central Park chess master who places bishops, rooks and a queen, and promotes allies to knights.'],
  ['Venator', ['Devout', 'Arms Expert', 'Tactical'], 'j', 'A Vatican-sanctioned monster hunter with traps, a holy grenade that blocks healing, and a crossbow.'],
  ['Victor', ['You Can’t Kill Me'], 'a', 'A reanimated man who turns damage taken into attacks and revives himself when killed.'],
  ['Vindicta', ['Sniper', 'Soaring', 'One Shot Kill'], 'o', 'A witch who flies and snipes from the sky.'],
  ['Violet', ['Ambitious', 'Nimble', 'Creative'], 't', 'An art student whose paint gun makes walls, speed brushes, stuns and a silencing dome.'],
  ['Viscous', ['Evasive', 'Disruptor', 'Gooey'], 'o', 'A creature of living goo from the Deep. Throws goo cubes and rolls into fights as a giant ball.'],
  ['Vyper', ['Gunner', 'Slippery', 'Rat-a-Tat'], 'o', 'A snake-woman who slithers, petrifies with venom, and shoots a lot.'],
  ['Warden', ['Initiator', 'Fearless', 'One Man Army'], 'o', 'A prison warden who traps enemies in a cage for a last stand.'],
  ['Wraith', ['Duelist', 'Isolator', 'Telekinetic'], 'o', 'A card-dealing gambler who teleports and lifts a target into the air with her mind.'],
  ['Yamato', ['Relentless', 'Acrobatics', 'Pursuer'], 'o', 'A crime boss with a katana and a grapple who can briefly refuse to die.'],
];
const WAVES = { o: 'Original roster', a: 'Aug 2025', j: 'Jan–Feb 2026', t: 'Oct 2026' };
const LENSES = {
  all: { label: 'Any style', tags: null },
  start: { label: 'Start fights', tags: ['Initiator', 'Teamplay', 'Tag-Team', 'Fearless'] },
  zone: { label: 'Control ground', tags: ['Area Denial', 'Map Control', 'Disruptor', 'Disruption', 'Disruptive', 'Strategist'] },
  help: { label: 'Help allies', tags: ['Protector', 'Support', 'Helpful', 'Savior', 'Team-up', 'Bodyguard'] },
  hunt: { label: 'Hunt alone', tags: ['Assassin', 'Stalker', 'Isolator', 'Burst Damage', 'One Shot Kill', 'Lethal', 'Duelist', 'Pursuer'] },
  move: { label: 'Fly & dash', tags: ['Mobility', 'High-Flying', 'High-flying', 'Soaring', 'Slippery', 'Nimble', 'Acrobatics', 'Traveller', 'Burrower', 'Evasive'] },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const PORTRAIT = {"Infernus": "inferno", "Seven": "gigawatt", "Vindicta": "hornet", "Lady Geist": "spectre", "Abrams": "bull", "Wraith": "wraith", "McGinnis": "engineer", "Paradox": "chrono", "Dynamo": "sumo", "Kelvin": "kelvin", "Haze": "haze", "Holliday": "astro", "Bebop": "bebop", "Calico": "nano", "Grey Talon": "archer", "Mo & Krill": "digger", "Shiv": "shiv", "Ivy": "tengu", "Warden": "warden", "Yamato": "yamato", "Lash": "lash", "Viscous": "viscous", "Pocket": "synth", "Mirage": "mirage", "Vyper": "kali", "Sinclair": "magician", "Mina": "vampirebat", "Drifter": "drifter", "Venator": "priest", "Victor": "frank", "Paige": "bookworm", "The Doorman": "doorman", "Billy": "punkgoat", "Graves": "necro", "Apollo": "fencer", "Deadman Danny": "deadpack", "Rem": "familiar", "Silver": "werewolf", "Celeste": "unicorn", "Rat King": "ratking", "Solomon": "chessmaster", "Violet": "artist", "Nurse Harrow": "nurse", "Baba": "baba"};
export function roster(el) {
  const grid = el.querySelector('[data-grid]');
  const count = el.querySelector('[data-count]');
  let wave = 'all', lens = 'all';
  grid.innerHTML = HEROES.map(([name, tags, w, line], i) => `
    <button class="hcard" data-i="${i}" data-w="${w}" aria-expanded="false">
      ${PORTRAIT[name] ? `<img class="hpic" src="assets/heroes/${PORTRAIT[name]}.webp" alt="" loading="lazy" width="280" height="380">` : ''}
      <span class="hname">${esc(name)}</span>
      <span class="hwave">${WAVES[w]}</span>
      <span class="htags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</span>
      <span class="hline">${esc(line)}</span>
    </button>`).join('');
  const cards = [...grid.children];
  function apply() {
    let n = 0;
    cards.forEach((c, i) => {
      const [, tags, w] = HEROES[i];
      const L = LENSES[lens].tags;
      const show = (wave === 'all' || w === wave) && (!L || tags.some((t) => L.includes(t)));
      c.hidden = !show; if (show) n++;
    });
    count.textContent = `${n} of ${HEROES.length} heroes`;
    el.querySelectorAll('[data-wave]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wave === wave)));
    el.querySelectorAll('[data-lens]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lens === lens)));
  }
  el.querySelectorAll('[data-wave]').forEach((b) => b.addEventListener('click', () => { wave = b.dataset.wave; apply(); }));
  el.querySelectorAll('[data-lens]').forEach((b) => b.addEventListener('click', () => { lens = b.dataset.lens; apply(); }));
  // tap / Enter toggles the one-liner (hover and focus also reveal it via CSS)
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.hcard'); if (!c) return;
    const open = c.getAttribute('aria-expanded') !== 'true';
    cards.forEach((x) => x.setAttribute('aria-expanded', 'false'));
    c.setAttribute('aria-expanded', String(open));
  });
  cards[22].setAttribute('aria-expanded', 'true'); // start with one card open (Mirage) so the reveal is discoverable
  apply();
}

// ------------------------------------------------------------------ shop
const COLORS = { weapon: 'Weapon', vitality: 'Vitality', spirit: 'Spirit' };
const TIER = [800, 1600, 3200, 6400];
const RN = ['I', 'II', 'III', 'IV'];
// Real names only where the research gives a confident tier and price.
const CATALOG = [
  { id: 'w1', c: 'weapon', t: 0, name: 'Extended Magazine', unique: true, desc: 'More bullets before you reload.' },
  { id: 'w2', c: 'weapon', t: 1, name: 'Stalker', unique: true, desc: 'A mid-priced gun item.' },
  { id: 'w3', c: 'weapon', t: 2, name: 'Headhunter', unique: true, desc: 'Rewards hitting heads.' },
  { id: 'w4', c: 'weapon', t: 3, name: 'Weapon · Tier IV', desc: 'A top-tier gun item: bigger damage, faster fire.' },
  { id: 'v1', c: 'vitality', t: 0, name: 'Extra Health', unique: true, desc: 'More health.' },
  { id: 'v2', c: 'vitality', t: 1, name: 'Vitality · Tier II', desc: 'Regeneration, resistances or speed.' },
  { id: 'v3', c: 'vitality', t: 2, name: 'Vitality · Tier III', desc: 'A strong defensive item.' },
  { id: 'v4', c: 'vitality', t: 3, name: 'Vitality · Tier IV', desc: 'A top-tier survival item.' },
  { id: 's1', c: 'spirit', t: 0, name: 'Extra Spirit', unique: true, desc: 'More Spirit Power, so abilities hit harder.' },
  { id: 's2', c: 'spirit', t: 1, name: 'Spirit · Tier II', desc: 'Shorter cooldowns or longer reach.' },
  { id: 's3', c: 'spirit', t: 2, name: 'Spirit · Tier III', desc: 'A strong ability item.' },
  { id: 's4', c: 'spirit', t: 3, name: 'Refresher', unique: true, desc: 'Resets all of your ability cooldowns at once.' },
];
const PRESETS = {
  gun: ['w1', 'w2', 'w3', 'w4', 'w4', 'v1', 'v2'],
  tank: ['v1', 'v2', 'v3', 'v4', 'v4', 'w1', 'v3', 'v2'],
  caster: ['s1', 's2', 's3', 's4', 's3', 'v1', 's2'],
  mix: ['w1', 'v1', 's1', 'w3', 'v3', 's3', 'w2'],
};

export function shop(el) {
  const earned = el.querySelector('#bud');
  const wallet = el.querySelector('[data-wallet]');
  const shelf = el.querySelector('[data-shelf]');
  const slotsEl = el.querySelector('[data-slots]');
  const tri = el.querySelector('[data-tri]');
  const readout = el.querySelector('[data-mix]');
  const msg = el.querySelector('[data-msg]');
  const inShopBtn = el.querySelector('[data-leave]');
  let owned = []; // {id, inShop}
  let walkers = 0, inShop = true;
  let credit = 0; // refunds − costs
  const trail = [];

  shelf.innerHTML = Object.keys(COLORS).map((c) => `
    <div class="col" style="--ic:var(--it-${c})">
      <div class="colhead"><i></i>${COLORS[c]}</div>
      ${CATALOG.filter((it) => it.c === c).map((it) => `
        <button class="item" data-buy="${it.id}" title="${esc(it.desc)}">
          <span class="tier">${RN[it.t]}</span><span class="nm">${esc(it.name)}</span><span class="pr">${TIER[it.t].toLocaleString()}</span>
        </button>`).join('')}
    </div>`).join('');

  const cap = () => 9 + walkers;
  const avail = () => +earned.value + credit;
  const spend = () => {
    const s = { weapon: 0, vitality: 0, spirit: 0 };
    owned.forEach((o) => { const it = CATALOG.find((x) => x.id === o.id); s[it.c] += TIER[it.t]; });
    return s;
  };
  function say(t) { msg.textContent = t; }
  function buy(id, quiet) {
    const it = CATALOG.find((x) => x.id === id);
    if (it.unique && owned.some((o) => o.id === id)) { if (!quiet) say(`You already own ${it.name}.`); return false; }
    if (owned.length >= cap()) { if (!quiet) say(`All ${cap()} slots are full. Sell something, or destroy a Walker for another slot.`); return false; }
    if (avail() < TIER[it.t]) { if (!quiet) say(`${it.name} costs ${TIER[it.t].toLocaleString()} souls. You have ${Math.max(0, avail()).toLocaleString()}.`); return false; }
    credit -= TIER[it.t]; owned.push({ id, inShop });
    if (!quiet) say(`Bought ${it.name}.`);
    pushTrail(); return true;
  }
  function sell(i) {
    const o = owned[i]; const it = CATALOG.find((x) => x.id === o.id);
    const back = o.inShop ? TIER[it.t] : TIER[it.t] / 2;
    credit += back; owned.splice(i, 1);
    say(`Sold ${it.name} for ${back.toLocaleString()}${o.inShop ? ', a full refund because you never left the shop' : ', half what you paid'}.`);
    pushTrail(); render();
  }
  function pushTrail() { const s = spend(); const t = s.weapon + s.vitality + s.spirit; if (t) trail.push([s.weapon / t, s.vitality / t, s.spirit / t]); if (trail.length > 24) trail.shift(); }

  shelf.addEventListener('click', (e) => { const b = e.target.closest('[data-buy]'); if (b) { buy(b.dataset.buy); render(); } });
  slotsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-sell]'); if (b) sell(+b.dataset.sell); });
  earned.addEventListener('input', render);
  el.querySelector('[data-walker]').addEventListener('click', (e) => {
    if (walkers < 3) { walkers++; say(`Your team destroyed an enemy Walker. Everyone gets item slot ${9 + walkers}.`); }
    if (walkers >= 3) e.currentTarget.disabled = true;
    render();
  });
  inShopBtn.addEventListener('click', () => {
    inShop = !inShop;
    if (!inShop) owned.forEach((o) => { o.inShop = false; });
    inShopBtn.setAttribute('aria-pressed', String(!inShop));
    inShopBtn.textContent = inShop ? 'Leave the shop' : 'Back in a shop';
    say(inShop ? 'You are standing in a shop again. New purchases can be returned for full price until you leave.' : 'You walked away. Anything you sell now refunds half.');
    render();
  });
  el.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
    owned = []; credit = 0; trail.length = 0;
    if (+earned.value < 24000) earned.value = 24000;
    PRESETS[b.dataset.preset].forEach((id) => buy(id, true));
    say(`${b.textContent} build: ${owned.length} items.`);
    render();
  }));
  el.querySelector('[data-clear]').addEventListener('click', () => { owned = []; credit = 0; trail.length = 0; say('Inventory cleared.'); render(); });

  // ---- triangle (ternary plot): Spirit top, Weapon bottom-left, Vitality bottom-right
  const W = 340, H = 300, pad = 34;
  const A = [W / 2, pad], B = [pad, H - pad], Cc = [W - pad, H - pad]; // spirit, weapon, vitality
  const pt = (w, v, s) => [w * B[0] + v * Cc[0] + s * A[0], w * B[1] + v * Cc[1] + s * A[1]];
  function drawTri(sp) {
    const t = sp.weapon + sp.vitality + sp.spirit;
    const [w, v, s] = t ? [sp.weapon / t, sp.vitality / t, sp.spirit / t] : [1 / 3, 1 / 3, 1 / 3];
    const grid = [];
    for (const f of [1 / 3, 2 / 3]) {
      // lines of constant share for each color
      const l1 = [pt(f, 1 - f, 0), pt(f, 0, 1 - f)], l2 = [pt(1 - f, f, 0), pt(0, f, 1 - f)], l3 = [pt(1 - f, 0, f), pt(0, 1 - f, f)];
      for (const [a, b] of [l1, l2, l3]) grid.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`);
    }
    const tr = trail.map(([a, b, c]) => pt(a, b, c));
    const [px, py] = pt(w, v, s);
    tri.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Build triangle. Weapon ${Math.round(w * 100)}%, Vitality ${Math.round(v * 100)}%, Spirit ${Math.round(s * 100)}%.">
        <polygon points="${A} ${B} ${Cc}" class="tri-bg"/>
        <g class="tri-grid">${grid.join('')}</g>
        <polygon points="${A} ${B} ${Cc}" class="tri-edge"/>
        ${tr.length > 1 ? `<polyline class="tri-trail" points="${tr.map((p) => p.join(',')).join(' ')}"/>` : ''}
        ${tr.slice(0, -1).map(([x, y]) => `<circle class="tri-step" cx="${x}" cy="${y}" r="2.5"/>`).join('')}
        <circle cx="${px}" cy="${py}" r="${t ? 9 : 7}" class="tri-dot${t ? '' : ' idle'}"><title>Weapon ${Math.round(w * 100)}% · Vitality ${Math.round(v * 100)}% · Spirit ${Math.round(s * 100)}%</title></circle>
        <g class="tri-lab">
          <circle cx="${A[0]}" cy="${A[1] - 18}" r="4" fill="var(--it-spirit)"/><text x="${A[0] + 9}" y="${A[1] - 14}">Spellcaster</text>
          <circle cx="${B[0] + 4}" cy="${B[1] + 20}" r="4" fill="var(--it-weapon)"/><text x="${B[0] + 13}" y="${B[1] + 24}">Gunslinger</text>
          <circle cx="${Cc[0] - 84}" cy="${Cc[1] + 20}" r="4" fill="var(--it-vitality)"/><text x="${Cc[0] - 75}" y="${Cc[1] + 24}">Unkillable</text>
        </g>
      </svg>`;
    const lead = t ? Object.entries(sp).sort((a, b) => b[1] - a[1])[0] : null;
    const share = lead ? lead[1] / t : 0;
    const name = !t ? 'No items yet' : share < 0.45 ? 'A hybrid' : { weapon: 'A gunslinger', vitality: 'Hard to kill', spirit: 'A spellcaster' }[lead[0]];
    readout.innerHTML = `<b>${name}</b>` + Object.keys(COLORS).map((c) => `
      <div class="mixrow" style="--ic:var(--it-${c})"><span class="lbl">${COLORS[c]}</span><span class="mixbar"><i style="width:${t ? (100 * sp[c]) / Math.max(...Object.values(sp)) : 0}%"></i></span><span class="mixv">${sp[c].toLocaleString()}</span></div>`).join('') +
      (sp.weapon >= 4800 ? '<p class="small">At 4,800 souls in Weapon items, the community wiki reports a hidden bonus of about +46% weapon damage.</p>'
        : '<p class="small">Every soul spent in one color also adds a hidden bonus to that color’s core stat, so committing pays.</p>');
  }

  function render() {
    const sp = spend();
    const a = avail();
    wallet.innerHTML = `<b>${Math.max(0, a).toLocaleString()}</b> souls to spend · ${owned.length}/${cap()} slots`;
    shelf.querySelectorAll('[data-buy]').forEach((b) => {
      const it = CATALOG.find((x) => x.id === b.dataset.buy);
      b.disabled = a < TIER[it.t] || owned.length >= cap() || (it.unique && owned.some((o) => o.id === it.id));
    });
    const cells = [];
    for (let i = 0; i < 12; i++) {
      const o = owned[i];
      if (o) {
        const it = CATALOG.find((x) => x.id === o.id);
        cells.push(`<button class="slot full" style="--ic:var(--it-${it.c})" data-sell="${i}" aria-label="Sell ${esc(it.name)}" title="${esc(it.name)}: click to sell"><span>${RN[it.t]}</span><em>${esc(it.name)}</em></button>`);
      } else if (i < cap()) cells.push(`<span class="slot" aria-hidden="true"></span>`);
      else cells.push(`<span class="slot locked" aria-hidden="true" title="Unlocked by destroying an enemy Walker">${i + 1}</span>`);
    }
    slotsEl.innerHTML = cells.join('');
    drawTri(sp);
  }
  render();
}
