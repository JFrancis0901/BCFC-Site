// Removes ".html" from links (including the menu/footer built by script.js)
// and from the address bar. Skipped when opening files straight from disk (file://).
(function () {
  if (location.protocol === 'file:') return;

  function clean(p) {
    return p.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
  }

  // Address bar: /support-leader.html -> /support-leader, /index.html -> /
  if (/\.html$/.test(location.pathname)) {
    history.replaceState(null, '', clean(location.pathname) + location.search + location.hash);
  }

  // Links: href="support-leader.html" -> href="support-leader"
  function fix(a) {
    var h = a.getAttribute('href');
    if (!h || /^([a-z]+:|#|\/\/)/i.test(h)) return;
    var m = h.match(/^([^?#]*)(.*)$/);
    if (/\.html$/.test(m[1])) {
      var p = clean(m[1]);
      a.setAttribute('href', (p === '' ? './' : p) + m[2]);
    }
  }
  function fixAll() { document.querySelectorAll('a[href]').forEach(fix); }

  document.addEventListener('DOMContentLoaded', fixAll);
  new MutationObserver(fixAll).observe(document.documentElement, { childList: true, subtree: true });
})();
