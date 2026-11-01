/* =========================================================
   MICROVERSE ESCAPE — boot
   ========================================================= */
(function () {
  'use strict';
  function boot() {
    if (!window.CV || !window.CV.App) {
      const fatal = document.getElementById('fatal');
      const msg = document.getElementById('fatal-msg');
      if (fatal) fatal.hidden = false;
      if (msg) msg.textContent = 'تعذّر تحميل ملفات اللعبة. تأكدوا من وجود مجلد js كاملًا.';
      return;
    }
    window.CV.App.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
