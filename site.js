// Collapsible top menu on small screens.
(function () {
  var nav = document.querySelector('.topnav');
  var btn = nav && nav.querySelector('.nav-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

// Light/dark button. The head of every page has already set data-theme from
// the stored choice or, without one, from the system setting.
(function () {
  var root = document.documentElement;
  var system = window.matchMedia('(prefers-color-scheme: dark)');
  var buttons = document.querySelectorAll('.theme-toggle');

  function stored() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }
  function label() {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    buttons.forEach(function (b) { b.setAttribute('aria-label', 'Switch to ' + next + ' theme'); });
  }
  function apply(theme) {
    root.classList.add('theme-switching');
    root.dataset.theme = theme;
    label();
    setTimeout(function () { root.classList.remove('theme-switching'); }, 350);
  }
  // 'light', 'dark', or 'auto' (follow the system again).
  function set(choice) {
    try {
      if (choice === 'auto') localStorage.removeItem('theme');
      else localStorage.setItem('theme', choice);
    } catch (e) {}
    apply(choice === 'auto' ? (system.matches ? 'dark' : 'light') : choice);
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      set(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
  system.addEventListener('change', function (e) {
    if (stored() !== 'light' && stored() !== 'dark') apply(e.matches ? 'dark' : 'light');
  });
  label();
  window.siteTheme = { set: set, stored: stored };
})();
