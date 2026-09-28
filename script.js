// script.js = runs on EVERY page (photo list is in photos.js). It builds the menu/footer, the mobile button, and random photos.

// ---------- 2. THE MENU: edit once, it changes on every page ----------
// Format: { label, href (page opened when clicking the title), items: [[text, page], ...] }
const MENU = [
  { label: 'About Us', href: 'about.html', items: [['Our mission', 'about.html#mission'], ['Our history', 'about.html#history'], ['What we believe', 'about.html#beliefs'], ['Our leadership', 'about.html#leadership']] },
  { label: 'Get Involved', href: 'get-involved.html', items: [['Find your place', 'get-involved.html'], ['Become a minister', 'minister.html'], ['Plant a church', 'plant-church.html']] },
  { label: 'Support', href: 'support.html', items: [['Leader support', 'support.html#leader'], ['Pastoral care', 'support.html#care'], ['Leader development', 'support.html#growth']] },
  { label: 'Mission + Ministry', href: 'ministries.html', items: [['Missions', 'ministries.html#missions'], ['Disaster relief', 'ministries.html#relief'], ['Chaplains', 'ministries.html#chaplains']] },
  { label: 'Events + Training', href: 'events.html', items: [['Upcoming events', 'events.html#events'], ['Training', 'events.html#training']] }
];

// ---------- 3. BUILD THE HEADER ----------
const navHtml = MENU.map(m =>
  `<div class="dropdown"><a href="${m.href}">${m.label}</a><div class="dropdown-menu">` +
  m.items.map(i => `<a href="${i[1]}">${i[0]}</a>`).join('') + `</div></div>`).join('');

document.getElementById('site-header').innerHTML = `
  <div class="topbar"><a href="find-church.html">Find a church</a><a href="contact.html">Contact</a></div>
  <header class="site-header">
    <a href="index.html" class="logo">BCFC</a> <!-- EDIT: your church name -->
    <button class="menu-toggle" aria-expanded="false">Menu</button>
    <nav class="site-nav" id="nav">${navHtml}</nav>
  </header>`;

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

// ---------- 6. RANDOM PHOTOS ----------
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
