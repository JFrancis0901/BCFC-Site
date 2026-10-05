// assistant.js = the "BCFC Assistant" chat bubble in the lower right of every public page.
// It answers common questions from the info below and falls back to the site search.
// EDIT: change answers / add topics in TOPICS. Each topic: keywords (regex), reply text, and optional link buttons.
(function () {
  const MAP = 'https://www.google.com/maps/search/?api=1&query=392+Lt.+Tacay+Rd%2C+Pinsao+Proper%2C+Baguio+City';
  const FB = 'https://www.facebook.com/BaguioCityFoursquareChurch/';

  const TOPICS = [
    { re: /service|time|schedule|sunday|worship|when|tuesday|friday|nurture|prayer/i,
      text: 'Here are our weekly gatherings:\n• Sunday Service – 9:00 AM to 11:00 AM\n• Family Nurture (Tuesday) – 7:00 PM to 9:00 PM\n• Abound in Prayer (Friday) – 7:30 PM to 9:30 PM',
      links: [['Find a Church', 'find-church.html'], ['Watch Online', FB]] },
    { re: /where|location|address|direction|map|visit|find us|how to get/i,
      text: 'We meet at 392 Lt. Tacay Rd, Pinsao Proper, Baguio City. We would love to see you!',
      links: [['Open in Maps', MAP], ['Visit Us', 'find-church.html']] },
    { re: /contact|email|phone|call|reach|message/i,
      text: 'You can reach the church by email at JFrancis0901@gmail.com, or send us a message through the Contact page.',
      links: [['Contact Us', 'contact.html']] },
    { re: /baptis|baptiz/i,
      text: 'Water baptism is a public step of faith. You can read the details and register on the Water Baptism page.',
      links: [['Water Baptism', 'water-baptism.html']] },
    { re: /event|calendar|upcoming|activity/i,
      text: 'See what is coming up on our Upcoming Events page.',
      links: [['Upcoming Events', 'events.html']] },
    { re: /online|live|stream|facebook|watch/i,
      text: 'You can watch our services online through our Facebook page.',
      links: [['Watch Online', FB]] },
    { re: /worker|ministr|youth|ufy|ufw|ufm|children|volunteer|serve|join/i,
      text: 'Our ministries include Children’s Church, UFY, UFW, UFM, Praise & Worship, Production and Creatives. Visit the Workers page to learn more.',
      links: [['Workers', 'workers.html'], ['Worker Login', '../workers/login.html']] },
    { re: /minister|pastor|calling|ordain|credential/i,
      text: 'If you sense a call to ministry, read about becoming a minister here.',
      links: [['Become a Minister', 'minister.html'], ['Training', 'training.html']] },
    { re: /plant|new church|start a church/i,
      text: 'Interested in starting something new in your city? Learn about church planting.',
      links: [['Plant a Church', 'plant-church.html']] },
    { re: /partner|support|donat|give|help|sponsor/i,
      text: 'We would love to serve together with you. Learn about community partnership here.',
      links: [['Partnership', 'support.html']] },
    { re: /mission|vision|history|belief|about|who are/i,
      text: 'Learn who we are, what we believe and where we came from.',
      links: [['Our Mission', 'about-mission.html'], ['Our Vision', 'about-vision.html'], ['Our History', 'about-history.html']] },
    { re: /other church|foursquare|branch/i,
      text: 'Find other Foursquare churches in Baguio City on this page.',
      links: [['Other Churches', 'other-churches.html']] },
    { re: /language|translate|tagalog|filipino|ilokano|ilocano/i,
      text: 'Use the “Change language” menu at the top of the page to read the site in another language.' },
    { re: /^(hi|hello|hey|good (morning|afternoon|evening)|kumusta|kamusta|god bless)\b/i,
      text: 'Hello, and God bless! How can I help you today?' },
    { re: /thank|salamat/i, text: 'You are welcome! God bless you. 🙏' }
  ];

  const CHIPS = ['Service times', 'Where are you located?', 'Water baptism', 'Upcoming events', 'Contact the church'];

  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // ----- build the widget -----
  const root = el('div', 'bca');
  root.innerHTML = `
    <section class="bca-panel" id="bca-panel" role="dialog" aria-label="BCFC Assistant" hidden>
      <header class="bca-head">
        <img src="assets/bcfc-logo.png" alt="" class="bca-avatar">
        <div class="bca-title"><strong>BCFC Assistant</strong><small>Ask about our church</small></div>
        <button type="button" class="bca-min" aria-label="Minimize chat">&minus;</button>
        <button type="button" class="bca-x" aria-label="Close chat">&times;</button>
      </header>
      <div class="bca-log" aria-live="polite"></div>
      <div class="bca-chips"></div>
      <form class="bca-form" autocomplete="off">
        <input type="text" placeholder="Type your question..." aria-label="Type your question" maxlength="200">
        <button type="submit" aria-label="Send"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 20.5 21 12 3 3.5l.01 6.6L15 12 3.01 13.9z"/></svg></button>
      </form>
    </section>
    <button type="button" class="bca-fab" aria-label="Chat with BCFC Assistant" aria-expanded="false" aria-controls="bca-panel">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>
    </button>`;
  document.body.appendChild(root);

  const panel = root.querySelector('.bca-panel'), fab = root.querySelector('.bca-fab');
  const log = root.querySelector('.bca-log'), chips = root.querySelector('.bca-chips');
  const form = root.querySelector('.bca-form'), input = form.querySelector('input');

  function say(who, html) {
    const b = el('div', 'bca-msg ' + who, html);
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }
  const linkBtns = links => links && links.length
    ? '<div class="bca-links">' + links.map(l => `<a href="${l[1]}"${/^https?:/.test(l[1]) ? ' target="_blank" rel="noopener"' : ''}>${esc(l[0])}</a>`).join('') + '</div>' : '';
  const textHtml = t => esc(t).replace(/\n/g, '<br>');

  function greet() {
    say('bot', 'Hi, I’m the BCFC Assistant. I can help you find service times, our location, events, water baptism, ministries and more.');
    say('bot', 'I’m an automated guide, not a person. For prayer or pastoral needs, please contact the church directly.');
    CHIPS.forEach(c => { const b = el('button', null, esc(c)); b.type = 'button'; b.addEventListener('click', () => ask(c)); chips.appendChild(b); });
  }

  async function answer(q) {
    const t = TOPICS.find(x => x.re.test(q));
    if (t) return textHtml(t.text) + linkBtns(t.links);
    if (typeof loadIndex === 'function' && typeof searchPages === 'function') {
      try {
        const hits = searchPages(await loadIndex(), q).hits.slice(0, 3);
        if (hits.length) return 'I’m not sure about that, but these pages may help:' + linkBtns(hits.map(h => [h.title, h.url]));
      } catch (e) { /* fall through */ }
    }
    return 'Sorry, I couldn’t find that. Please try different words, or reach out through our Contact page.' + linkBtns([['Contact Us', 'contact.html']]);
  }

  async function ask(q) {
    q = q.trim(); if (!q) return;
    chips.hidden = true;
    say('me', esc(q));
    const typing = say('bot typing', '<span></span><span></span><span></span>');
    const html = await answer(q);
    setTimeout(() => { typing.className = 'bca-msg bot'; typing.innerHTML = html; log.scrollTop = log.scrollHeight; }, 350);
  }

  function toggle(open) {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', String(open));
    root.classList.toggle('open', open);
    if (open) { if (!log.children.length) greet(); input.focus(); }
  }
  fab.addEventListener('click', () => toggle(panel.hidden));
  root.querySelector('.bca-min').addEventListener('click', () => toggle(false));
  root.querySelector('.bca-x').addEventListener('click', () => { log.innerHTML = ''; chips.innerHTML = ''; chips.hidden = false; toggle(false); });
  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; ask(v); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) toggle(false); });
})();
