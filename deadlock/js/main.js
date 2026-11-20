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

// ---- tabs: each themed section is its own page, addressed by #id
const tabs = [...document.querySelectorAll('[data-tab]')];
const tabLinks = [...document.querySelectorAll('[data-tablink]')];
const nav = document.querySelector('.bar nav');
const prog = document.querySelector('.progress');
tabs.forEach((t, i) => { // a "next" link at the end of each tab
  const n = tabs[i + 1]; if (!n) return;
  t.insertAdjacentHTML('beforeend', `<div class="tab-next wrap"><a href="#${n.id}">Next: ${n.dataset.label} →</a></div>`);
});
function route() {
  const id = decodeURIComponent(location.hash.slice(1));
  let tab = tabs.find((t) => t.id === id);
  let inner = null;
  if (!tab && id) { inner = document.getElementById(id); tab = inner && inner.closest('[data-tab]'); }
  tabs.forEach((t) => { t.hidden = t !== tab; });
  document.body.classList.toggle('in-tab', !!tab);
  tabLinks.forEach((a) => a.classList.toggle('on', tab && a.dataset.tablink === tab.id));
  const on = tabLinks.find((a) => a.classList.contains('on'));
  if (on && nav) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.clientWidth / 2, behavior: 'smooth' });
  if (tab) {
    document.title = `${tab.dataset.label} · Deadlock, Explained`;
    requestAnimationFrame(() => (inner || document.body).scrollIntoView({ block: 'start' }));
    if (!inner) scrollTo(0, 0);
  } else document.title = 'Deadlock, Explained';
}
addEventListener('hashchange', route);
route();
function onScroll() {
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
