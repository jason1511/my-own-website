// js/main.js
(() => {
  /* ---------------- GLOBAL SITE BEHAVIOUR ---------------- */

  updateFooterYear();

  function updateFooterYear() {
    const yearEl = document.getElementById("year");
    if (!yearEl) return;

    yearEl.textContent = new Date().getFullYear();
  }
})();