// Page chrome: chapter nav highlighting, reading progress, glossary tooltips,
// and lazy boot of each chapter's explorable when it nears the viewport.
import { GLOSSARY } from './glossary.js';
import { drawPics } from './pics.js';
drawPics();

// ---- lazy boot: <div data-boot="module#export"> gets booted once near view
const booted = new WeakSet();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting || booted.has(e.target)) continue;
    booted.add(e.target);
    const [mod, fn] = e.target.dataset.boot.split('#');
    import(`./${mod}.js`).then((m) => m[fn](e.target)).catch((err) => {
      console.error(err);
      e.target.insertAdjacentHTML('beforeend', `<p class="hud tl">This figure could not start: ${err.message}</p>`);
    });
  }
}, { rootMargin: '600px 0px' });
document.querySelectorAll('[data-boot]').forEach((el) => io.observe(el));

// ---- nav + progress
const nav = document.querySelector('.bar nav');
const pairs = [...document.querySelectorAll('.bar nav a')]
  .map((a) => ({ a, c: document.querySelector(a.getAttribute('href')) })).filter((p) => p.c);
const prog = document.querySelector('.progress');
let lastCur = -2;
function onScroll() {
  let cur = -1;
  pairs.forEach((p, i) => { if (p.c.getBoundingClientRect().top <= innerHeight * 0.35) cur = i; });
  if (cur !== lastCur) {
    lastCur = cur;
    pairs.forEach((p, i) => p.a.classList.toggle('on', i === cur));
    if (cur >= 0 && nav) { const a = pairs[cur].a; nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2, behavior: 'smooth' }); }
  }
  const max = document.documentElement.scrollHeight - innerHeight;
  if (prog) prog.style.width = `${(100 * scrollY) / Math.max(1, max)}%`;
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---- glossary tooltips: <span class="term" data-t="lane">lanes</span>
const tip = document.createElement('div');
tip.className = 'tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip');
document.body.appendChild(tip);
function show(el) {
  const g = GLOSSARY[el.dataset.t];
  if (!g) return;
  tip.innerHTML = `<b>${g[0]}</b>${g[1]}`;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const w = Math.min(320, innerWidth - 24);
  tip.style.maxWidth = w + 'px';
  let x = Math.min(innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
  tip.style.left = x + 'px';
  const below = r.bottom + 10;
  tip.style.top = below + 'px';
  requestAnimationFrame(() => {
    if (below + tip.offsetHeight > innerHeight - 8) tip.style.top = (r.top - tip.offsetHeight - 10) + 'px';
  });
}
document.querySelectorAll('.term').forEach((el) => {
  el.tabIndex = 0;
  el.addEventListener('pointerenter', () => show(el));
  el.addEventListener('pointerleave', () => { tip.hidden = true; });
  el.addEventListener('focus', () => show(el));
  el.addEventListener('blur', () => { tip.hidden = true; });
  el.addEventListener('click', () => show(el));
});
addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
