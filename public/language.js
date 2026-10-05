// language.js = "Change language" menu in the top bar (works on every public page).
// Uses Google Website Translator behind the scenes; the visitor's choice is remembered on all pages.
// EDIT: add or remove languages in LANGS  [ code, name shown in the menu ]
(function () {
  const LANGS = [
    ['en', 'English'], ['tl', 'Filipino'], ['ilo', 'Ilokano'], ['ceb', 'Cebuano'],
    ['ko', '한국어 (Korean)'], ['ja', '日本語 (Japanese)'], ['zh-CN', '中文 (Chinese)'],
    ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'],
    ['id', 'Bahasa Indonesia'], ['vi', 'Tiếng Việt'], ['hi', 'हिन्दी (Hindi)'], ['ar', 'العربية (Arabic)']
  ];

  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]+\/([^;]+)/);
  const current = m ? decodeURIComponent(m[1]) : 'en';

  function setCookie(value) {
    const host = location.hostname;
    const exp = value ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    const val = value ? '/en/' + value : '';
    document.cookie = 'googtrans=' + val + '; path=/' + exp;
    if (host.includes('.')) document.cookie = 'googtrans=' + val + '; path=/; domain=' + host + exp;
  }

  // The menu itself (left of Contact / Worker Login)
  const links = document.querySelector('.topbar .toplinks');
  if (links) {
    const wrap = document.createElement('label');
    wrap.className = 'lang-switch notranslate';
    wrap.setAttribute('translate', 'no');
    wrap.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>' +
      '<span class="lang-label">Change language</span>' +
      '<select aria-label="Change language">' +
      LANGS.map(l => `<option value="${l[0]}"${l[0] === current ? ' selected' : ''}>${l[1]}</option>`).join('') +
      '</select>';
    links.prepend(wrap);
    wrap.querySelector('select').addEventListener('change', e => {
      const code = e.target.value;
      setCookie(code === 'en' ? '' : code);
      location.reload();
    });
  }

  // Load Google Translate only when a non-English language is chosen
  if (current !== 'en') {
    const holder = document.createElement('div');
    holder.id = 'google_translate_element';
    holder.style.display = 'none';
    document.body.appendChild(holder);
    window.bcfcTranslateInit = function () {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: LANGS.map(l => l[0]).join(','),
        autoDisplay: false
      }, 'google_translate_element');
    };
    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=bcfcTranslateInit';
    document.body.appendChild(s);
  }
})();
