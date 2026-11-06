(() => {
  'use strict';
  const defaults = {...window.JWCoverConfig};
  const key = 'jw-cover:' + defaults.revision;
  const limits = {titleSize:[40,420],roleSize:[12,200],left:[0,50],top:[15,85],gap:[0,160],opacity:[0,100]};
  function normalize(input = {}) {
    const result = {...defaults};
    for (const name of ['role','title','name','explore','page']) {
      if (typeof input[name] === 'string') result[name] = input[name].slice(0,80);
    }
    for (const [name,[min,max]] of Object.entries(limits)) {
      const number = Number(input[name]);
      if (input[name] !== undefined && Number.isFinite(number)) result[name] = Math.min(max,Math.max(min,number));
    }
    for (const name of ['background','color']) if (/^#[0-9a-f]{6}$/i.test(input[name])) result[name] = input[name];
    if (typeof input.arrow === 'boolean') result.arrow = input.arrow;
    return result;
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(key) || 'null') || defaults); }
    catch { return {...defaults}; }
  }
  function save(config) { localStorage.setItem(key,JSON.stringify(normalize(config))); }
  function apply(config,doc = document) {
    const c = normalize(config), cover = doc.querySelector('#home');
    if (!cover) return;
    cover.style.background = c.background;
    cover.style.color = c.color;
    cover.style.setProperty('--cover-title-size',`${c.titleSize / 19.2}vw`);
    const title = cover.querySelector('h1'), group = cover.querySelector('.cover-title-link');
    title.textContent = c.title;
    group.style.left = `${c.left}%`;
    group.style.right = '0';
    group.style.top = `${c.top}%`;
    const role = cover.querySelector('.cover-role');
    role.textContent = c.role;
    role.style.fontFamily = 'inherit';
    role.style.fontWeight = '800';
    role.style.letterSpacing = '-.065em';
    role.style.fontSize = `${c.roleSize / 19.2}vw`;
    role.style.bottom = `calc(100% + ${c.gap / 19.2}vw)`;
    role.style.color = 'inherit';
    role.style.opacity = c.opacity / 100;
    const footer = cover.querySelector('.cover-bottom');
    footer.children[0].textContent = c.name;
    footer.children[2].textContent = c.page;
    const explore = footer.querySelector('.explore-link');
    explore.replaceChildren(doc.createTextNode(c.explore));
    if (c.arrow) {
      const arrow = doc.createElement('span');
      arrow.setAttribute('aria-hidden','true'); arrow.textContent = '↓';
      explore.append(doc.createTextNode(' '),arrow);
    }
  }
  window.CoverDesign = {defaults,normalize,load,save,apply};
  if (document.querySelector('#home')) apply(load());
  window.addEventListener('storage', event => { if (event.key === key) apply(load()); });
})();
