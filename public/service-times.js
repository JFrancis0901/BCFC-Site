/* ==========================================================
   service-times.js = powers the "Service Times" popup slideshow on the
   homepage. Clicking the Service Times button opens a modal with one
   slide per service, auto-advancing like a presentation, using the
   BCFC logo as the image for every slide since there are no event
   photos yet. Swap SERVICES below to add/remove/edit a service, or
   replace the logo image used per slide (see the "image" field).
   ========================================================== */

// EDIT: add, remove, or edit a service here. Each needs a day, title, time,
// a one-line blurb, and an image (defaults to the BCFC logo for all of them).
const SERVICES = [
  { day: 'Sunday', title: 'Sunday Service', time: '9:00 AM – 11:00 AM', blurb: 'Our main weekly gathering — worship, the Word, and fellowship as one church family.', image: 'assets/bcfc-logo.png' },
  { day: 'Tuesday', title: 'Family Nurture', time: '7:00 PM – 9:00 PM', blurb: 'Small-group style discipleship to grow together in faith.', image: 'assets/bcfc-logo.png' },
  { day: 'Friday', title: 'Abound in Prayer', time: '7:30 PM – 9:30 PM', blurb: 'A dedicated evening of corporate prayer for our church and city.', image: 'assets/bcfc-logo.png' }
];

const AUTO_ADVANCE_MS = 4500; // EDIT: how long each slide stays up before auto-advancing

const modal   = document.getElementById('st-modal');
const overlay = document.getElementById('st-overlay');
const closeBtn = document.getElementById('st-close');
const openBtn  = document.getElementById('open-service-times');
const slidesEl = document.getElementById('st-slides');
const dotsEl   = document.getElementById('st-dots');
const prevBtn  = document.getElementById('st-prev');
const nextBtn  = document.getElementById('st-next');

let current = 0;
let timer = null;

function buildSlides() {
  slidesEl.innerHTML = SERVICES.map((s, i) => `
    <article class="st-slide${i === 0 ? ' active' : ''}" data-index="${i}">
      <img src="${s.image}" alt="" class="st-slide-img">
      <div class="st-slide-text">
        <span class="st-slide-day">${s.day}</span>
        <h3>${s.title}</h3>
        <p class="st-slide-time">${s.time}</p>
        <p class="st-slide-blurb">${s.blurb}</p>
      </div>
    </article>`).join('');

  dotsEl.innerHTML = SERVICES.map((_, i) =>
    `<button type="button" class="st-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`).join('');

  dotsEl.querySelectorAll('.st-dot').forEach(dot => {
    dot.addEventListener('click', () => goTo(Number(dot.dataset.index)));
  });
}

function goTo(index) {
  current = (index + SERVICES.length) % SERVICES.length;
  slidesEl.querySelectorAll('.st-slide').forEach((el, i) => el.classList.toggle('active', i === current));
  dotsEl.querySelectorAll('.st-dot').forEach((el, i) => el.classList.toggle('active', i === current));
  restartTimer();
}

function restartTimer() {
  clearInterval(timer);
  timer = setInterval(() => goTo(current + 1), AUTO_ADVANCE_MS);
}

function openModal() {
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  goTo(0);
}

function closeModal() {
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  clearInterval(timer);
}

buildSlides();
openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);
prevBtn.addEventListener('click', () => goTo(current - 1));
nextBtn.addEventListener('click', () => goTo(current + 1));
document.addEventListener('keydown', (e) => {
  if (modal.hidden) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft') goTo(current - 1);
  if (e.key === 'ArrowRight') goTo(current + 1);
});
