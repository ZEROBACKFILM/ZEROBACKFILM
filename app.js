const films = JSON.parse(document.querySelector('#film-data').textContent);
const bySlug = new Map(films.map(film => [film.slug, film]));
const dialog = document.querySelector('#film-player');
const frame = document.querySelector('#player-frame');
const closeButton = document.querySelector('#close-player');
let returnFocus;

function openFilm(film, trigger) {
  returnFocus = trigger;
  document.querySelector('#player-title').textContent = film.title;
  document.querySelector('#player-artist').textContent = film.artist;
  document.querySelector('#youtube-link').href = film.url;
  const iframe = document.createElement('iframe');
  iframe.title = `${film.title} — ${film.artist}`;
  iframe.src = `https://www.youtube-nocookie.com/embed/${film.video}?autoplay=1&rel=0&playsinline=1`;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;
  frame.replaceChildren(iframe);
  dialog.showModal();
  document.body.classList.add('player-open');
  closeButton.focus();
}

document.addEventListener('click', event => {
  const link = event.target.closest('[data-film]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (location.protocol === 'file:') return;
  const film = bySlug.get(link.dataset.film);
  if (!film || typeof dialog.showModal !== 'function') return;
  event.preventDefault();
  openFilm(film, link);
});
closeButton.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  frame.replaceChildren();
  document.body.classList.remove('player-open');
  returnFocus?.focus({preventScroll:true});
});
