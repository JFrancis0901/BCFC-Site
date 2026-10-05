// script.js = runs on EVERY page (photo list is in photos.js).
// Keep the dynamic header hidden until it is fully built so the logo/menu never flashes.
const __siteHeader = document.getElementById('site-header');
if (__siteHeader) __siteHeader.setAttribute('aria-busy', 'true');
// It builds the menu, the footer, the site search, the back-to-top button, the mobile button, and random photos.

// ---------- 1. THE MENU: edit once, it changes on every page ----------
// label   = menu title            href  = page opened when clicking the title
// color   = color of the right-hand panel
// items   = [ [footer/label text, page, big text shown in the menu], ... ]
// moreTitle + more = the small links in the right-hand panel
const MENU = [
  { label: 'About Us', href: null, color: 'var(--purple)',
    items: [['Our Mission', 'about-mission.html', 'Our Mission'], ['Our Vision', 'about-vision.html', 'Our Vision'], ['Our history', 'about-history.html', 'Our history'], ['Organizational Chart', 'about-organization.html', 'Organizational Chart'], ['Visit Us', 'find-church.html', 'Visit Us']],
    moreTitle: 'More about BCFC', more: [['Contact us', 'contact.html']] },
  { label: 'Workers', href: 'workers.html', color: 'var(--blue)',
    items: [['Children’s Church', 'workers.html#childrens', 'Children’s Church'], ['UFY', 'workers.html#ufy', 'United Foursquare Youth'], ['UFW', 'workers.html#ufw', 'United Foursquare Women'], ['UFM', 'workers.html#ufm', 'United Foursquare Men'], ['Praise & Worship', 'workers.html#worship', 'Praise & Worship'], ['Production', 'workers.html#production', 'Production'], ['Creatives', 'workers.html#creatives', 'Creatives']],
    moreTitle: 'BCFC Workers', more: [['View all ministries', 'workers.html'], ['Worker Login', '../workers/login.html']] },
  { label: 'Partnership + Upcoming Events', href: 'support.html', color: 'var(--scarlet)',
    items: [['Community Partnership', 'support.html', 'Let us serve together for the glory of the Lord.'], ['Events', 'events.html', 'See what is coming up.']],
    moreTitle: 'Work with BCFC', more: [['Partner With Us', 'support.html'], ['Contact us', 'contact.html']] },
  { label: 'Other Churches', href: 'other-churches.html', color: 'var(--navy)',
    items: [['Foursquare Family in Baguio', 'other-churches.html', 'Find a Foursquare church near you in Baguio City.']],
    moreTitle: 'More', more: [['Contact us', 'contact.html']] }
];

// ---------- 2. SEARCH: list every page here (add a line when you add a page) ----------
// title = shown in results | url = page | desc = short summary | keys = extra words people might type
// The search ALSO reads the real text of each page, so results stay accurate when you edit a page.
const PAGES = [
  { title: 'Home', url: 'index.html', desc: 'Welcome to BCFC.', keys: 'home welcome church family newcomers' },
  { title: 'About Us', url: 'about.html', desc: 'Who we are.', keys: 'about who we are' },
  { title: 'Mission and Vision', url: 'about.html#mission-vision', desc: 'Our mission and vision.', keys: 'mission vision purpose evangelism discipleship church planting leadership development social engagement transformation empowered missional healthy holistic harvesting churches' },
  { title: 'Our History', url: 'about-history.html', desc: 'How we got here.', keys: 'history timeline story founded years Foursquare BCFC' },
  { title: 'Organizational Chart', url: 'about-organization.html', desc: 'Current ministry structure.', keys: 'organization organizational chart hierarchy workers staff pastor ministry structure' },
  { title: 'Visit Us', url: 'about.html#visit', desc: 'Service times, address, and map to BCFC.', keys: 'visit address map directions pastor location service times' },
  { title: 'Workers', url: 'workers.html', desc: 'Explore BCFC ministry workers.', keys: 'workers ministries members leaders' },
  { title: 'Become a Minister', url: 'minister.html', desc: 'Answer the call to ministry.', keys: 'minister ministry calling ordination credential apply train commissioned' },
  { title: 'Plant a Church', url: 'plant-church.html', desc: 'Start something new in your city.', keys: 'plant church planting start new coaching funding' },
  { title: 'Water Baptism', url: 'water-baptism.html', desc: 'Information and registration for water baptism.', keys: 'water baptism baptize baptized baptised immersion register registration form sign up' },
  { title: 'Partnership', url: 'support.html', desc: 'Partner with BCFC in community service.', keys: 'partnership community support event' },
  { title: 'Leader Support', url: 'support-leader.html', desc: 'Help for pastors and administrators.', keys: 'leader support pastors administrators help' },
  { title: 'Pastoral Care', url: 'support-care.html', desc: 'How we care for our leaders.', keys: 'pastoral care counseling wellbeing' },
  { title: 'Leader Development', url: 'support-growth.html', desc: 'Training and growth for leaders.', keys: 'leader development growth training mentoring' },
  { title: 'Mission + Ministry', url: 'ministries.html', desc: 'Beyond the walls of the church.', keys: 'mission ministry outreach' },
  { title: 'Missions', url: 'missions.html', desc: 'Taking the message further.', keys: 'missions missionary overseas' },
  { title: 'Disaster Relief', url: 'relief.html', desc: 'Help when it is needed most.', keys: 'disaster relief emergency typhoon flood aid' },
  { title: 'Chaplains', url: 'chaplains.html', desc: 'Care where people are.', keys: 'chaplain chaplains hospital police military' },
  { title: 'Upcoming Events', url: 'events.html', desc: 'What is coming up.', keys: 'events calendar schedule dates upcoming' },
  { title: 'Training', url: 'training.html', desc: 'Courses to help you grow.', keys: 'training courses classes learn' },
  { title: 'Find a Church', url: 'find-church.html', desc: 'Service times and where we meet.', keys: 'find church service times sunday wednesday location visit address' },
  { title: 'Contact Us', url: 'contact.html', desc: 'Address, phone and email.', keys: 'contact address phone email location reach message' },
  { title: 'Other Churches', url: 'other-churches.html', desc: 'Foursquare family in Baguio City.', keys: 'other churches foursquare family baguio agape aurora hill city central quirino peza marcos highway' }
];

// ---------- 3. BUILD THE HEADER ----------
const SEARCH_BOX = `<form class="search" role="search" autocomplete="off">
  <input type="search" placeholder="Search the site..." aria-label="Search the site">
  <button type="submit" aria-label="Search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg></button>
  <div class="results" hidden></div></form>`;

// Big dark panel on the left, colored panel with more links on the right
const navHtml = MENU.map(m => {
  if (m.label === 'About Us') return `<div class="dropdown about-nav"><span class="nav-category about-nav-label" aria-label="About Us">${m.label}</span><div class="about-links">${m.items.map(i => `<a href="${i[1]}">${i[2] || i[0]}</a>`).join('')}</div></div>`;
  return `<div class="dropdown"><span class="nav-category" aria-label="${m.label}">${m.label}</span>
    <div class="mega" style="--mc:${m.color}">
      <div class="mega-main"><p class="mega-label">${m.label}</p>` +
        m.items.map(i => `<a href="${i[1]}">${i[2] || i[0]}</a>`).join('') + `</div>
      <div class="mega-side"><h4>${m.moreTitle}</h4>` +
        m.more.map(i => `<a href="${i[1]}">${i[0]}</a>`).join('') + `<hr><p class="mega-note">Looking for something?</p>${SEARCH_BOX}</div>
    </div></div>`;
}).join('');

document.getElementById('site-header').innerHTML = `
  <div class="topbar">${SEARCH_BOX}<span class="toplinks"><a href="contact.html">Contact</a><a href="../workers/login.html">Worker Login</a></span></div>
  <header class="site-header">
    <a href="index.html" class="logo" aria-label="Baguio City Foursquare Church - Home"><img src="assets/bcfc-logo.png" alt="BCFC logo" onerror="this.replaceWith(document.createTextNode('BCFC'))"></a> <!-- EDIT: logo file is public/assets/bcfc-logo.png -->
    <button class="menu-toggle" aria-expanded="false">Menu</button>
    <nav class="site-nav" id="nav"><div class="nav-search">${SEARCH_BOX}</div>${navHtml}</nav>
  </header>`;
if (__siteHeader) {
  __siteHeader.removeAttribute('aria-busy');
  requestAnimationFrame(() => __siteHeader.classList.add('ready'));
}

// ---------- 4. BUILD THE FOOTER ----------
document.getElementById('site-footer').innerHTML = `
  <footer class="site-footer">
    <div class="footer-cols">${MENU.map(m => `<div><h4>${m.label}</h4>` +
      m.items.map(i => `<a href="${i[1]}">${i[0]}</a>`).join('') + `</div>`).join('')}</div>
    <p class="copyright">&copy; 2026 BCFC</p> <!-- EDIT: year and name -->
  </footer>`;

// ---------- 5. MOBILE MENU BUTTON ----------
const btn = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');
btn.addEventListener('click', () => {
  btn.setAttribute('aria-expanded', nav.classList.toggle('open'));
});

// ---------- 6. NAVIGATION ----------
// Navigate immediately. The tiny page-turn movement is handled by CSS;
// do not delay clicks or fade the current page out.
(function () {
  window.addEventListener('pageshow', () => document.body.classList.remove('page-leaving'));
})();

// ---------- 7. SEARCH ENGINE ----------
const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const escHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'to', 'for', 'in', 'on', 'is', 'are', 'how', 'do', 'i', 'we', 'my', 'what', 'does', 'can']);

// Loads each page once, and reads its real text (falls back to title/keywords if the browser blocks reading files)
let indexPromise;
function loadIndex() {
  if (!indexPromise) indexPromise = Promise.all(PAGES.map(async p => {
    const rec = { ...p, heads: '', body: '' };
    try {
      const res = await fetch(p.url);
      if (!res.ok) throw new Error(res.status);
      const main = new DOMParser().parseFromString(await res.text(), 'text/html').querySelector('main');
      if (main) {
        rec.heads = [...main.querySelectorAll('h1,h2,h3')].map(h => h.textContent).join(' ');
        rec.body = main.textContent.replace(/\s+/g, ' ').trim();
      }
    } catch (e) { /* offline or file:// - the title, description and keywords still work */ }
    return rec;
  }));
  return indexPromise;
}

const wordStart = (text, q) => (' ' + text).includes(' ' + q);
function scoreTerm(rec, q) {
  const t = norm(rec.title), k = norm(rec.keys), h = norm(rec.heads), b = norm(rec.desc + ' ' + rec.body);
  let s = 0;
  if (wordStart(t, q)) s += 12; else if (t.includes(q)) s += 5;
  if (wordStart(k, q)) s += 8; else if (k.includes(q)) s += 3;
  if (wordStart(h, q)) s += 6; else if (h.includes(q)) s += 2;
  const hits = (' ' + b).split(' ' + q).length - 1;
  s += hits ? Math.min(hits, 5) : (b.includes(q) ? 0.5 : 0);
  return s;
}
// Every word must match (accurate). If nothing matches all words, show the closest partial matches.
function searchPages(index, query) {
  const all = norm(query).split(' ').filter(Boolean);
  const terms = all.filter(w => !STOP.has(w)).length ? all.filter(w => !STOP.has(w)) : all;
  const rank = requireAll => index.map(rec => {
    const scores = terms.map(q => scoreTerm(rec, q));
    if (requireAll && scores.some(s => s === 0)) return null;
    const total = scores.reduce((a, b) => a + b, 0);
    if (!total) return null;
    const title = norm(rec.title);
    return { rec, score: total + (title === norm(query) ? 30 : 0) + (title.includes(norm(query)) ? 10 : 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  let list = rank(true), partial = false;
  if (!list.length) { list = rank(false); partial = list.length > 0; }
  return { terms, partial, hits: list.slice(0, 6).map(x => x.rec) };
}
function snippet(rec, terms) {
  const text = rec.body || rec.desc, low = text.toLowerCase();
  let at = -1;
  for (const q of terms) { const i = low.indexOf(q); if (i >= 0 && (at < 0 || i < at)) at = i; }
  const from = Math.max(0, at - 45);
  const part = text.slice(from, from + 130).trim();
  const out = escHtml((from > 0 ? '... ' : '') + part + (from + 130 < text.length ? ' ...' : ''));
  return terms.length ? out.replace(new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi'), '<mark>$1</mark>') : out;
}

document.querySelectorAll('.search').forEach(form => {
  const input = form.querySelector('input'), box = form.querySelector('.results');
  let hits = [], active = -1;
  const show = () => box.querySelectorAll('.hit').forEach((a, n) => a.classList.toggle('active', n === active));
  async function run() {
    const q = input.value.trim();
    if (q.length < 2) { box.hidden = true; hits = []; return hits; }
    const index = await loadIndex();
    if (q !== input.value.trim()) return hits;              // ignore an old search
    const r = searchPages(index, q);
    hits = r.hits; active = -1;
    box.innerHTML = hits.length
      ? (r.partial ? '<p class="res-note">No exact match. Closest pages:</p>' : '') +
        hits.map(p => `<a class="hit" href="${p.url}"><strong>${escHtml(p.title)}</strong><span>${snippet(p, r.terms)}</span></a>`).join('')
      : `<p class="res-note">No pages found for "${escHtml(q)}". Try a different word.</p>`;
    box.hidden = false;
    return hits;
  }
  input.addEventListener('focus', loadIndex);
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { box.hidden = true; input.blur(); }
    else if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); active = (active + 1) % hits.length; show(); }
    else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); active = (active - 1 + hits.length) % hits.length; show(); }
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const list = hits.length ? hits : await run();
    const target = list[active >= 0 ? active : 0];
    if (target) location.href = target.url;
  });
});
document.addEventListener('click', e => {
  document.querySelectorAll('.search .results').forEach(b => { if (!b.parentElement.contains(e.target)) b.hidden = true; });
});

// ---------- 8. BACK TO TOP BUTTON (lower right) ----------
const toTop = document.createElement('button');
toTop.className = 'to-top';
toTop.setAttribute('aria-label', 'Back to top');
toTop.innerHTML = '&#8593;';
document.body.appendChild(toTop);
window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 300), { passive: true });
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ---------- 9. RANDOM PHOTOS ----------
// Shuffles the list so photos don't repeat until all have been used.
let pool = [];
function nextPhoto() {
  if (!pool.length) pool = [...PHOTOS].sort(() => Math.random() - 0.5);
  return 'Photos/' + encodeURI(pool.pop());
}
if (PHOTOS.length) {
  // <img data-random> gets a random photo
  document.querySelectorAll('img[data-random]').forEach(img => {
    img.src = nextPhoto();
    img.onerror = () => img.classList.add('missing'); // hides broken image, colorful box shows instead
  });
  // Any element with data-random-bg gets a random photo (style.css adds the color tint)
  document.querySelectorAll('[data-random-bg]').forEach(el => {
    el.classList.add('has-photo');
    el.style.setProperty('--photo', `url("${nextPhoto()}")`);
  });
}

// ---------- 10. EXTRA FEATURES: language picker + chat assistant ----------
// language.js = "Change language" menu (top bar).  assistant.js/.css = chat assistant (lower right).
(function () {
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = 'assistant.css';
  document.head.appendChild(css);
  ['language.js', 'assistant.js'].forEach(src => {
    const el = document.createElement('script');
    el.src = src; el.defer = true;
    document.body.appendChild(el);
  });
})();
