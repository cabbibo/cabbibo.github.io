// Credited community and official media.
// <figure class="clip" data-yt="VIDEOID" data-t="start seconds" data-title="..." data-credit="..."></figure>
// renders a poster with a play button; the YouTube player loads only when clicked.
export function drawClips(root = document) {
  root.querySelectorAll('.clip[data-yt]').forEach((el) => {
    if (el.dataset.ready) return; el.dataset.ready = '1';
    const id = el.dataset.yt, t = +(el.dataset.t || 0);
    const url = `https://www.youtube.com/watch?v=${id}${t ? `&t=${t}s` : ''}`;
    el.innerHTML = `
      <button class="clip-poster" type="button" aria-label="Play: ${el.dataset.title}">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer">
        <span class="clip-play" aria-hidden="true"></span>
      </button>
      <figcaption><b>${el.dataset.title}</b><span>${el.dataset.credit || ''} · <a href="${url}">YouTube ↗</a></span></figcaption>`;
    el.querySelector('.clip-poster').addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${t ? `&start=${t}` : ''}`;
      f.title = el.dataset.title; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
      f.className = 'clip-frame';
      const p = el.querySelector('.clip-poster'); p.replaceWith(f);
    });
    // if the poster can't load (e.g. a locked-down viewer), keep a readable link
    el.querySelector('img').addEventListener('error', () => { el.classList.add('noimg'); });
  });
}
