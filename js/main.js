// js/main.js
(() => {
  /* ---------------- GLOBAL SITE BEHAVIOUR ---------------- */

  updateFooterYear();
  showAdminReturnLink();

  function updateFooterYear() {
    const yearEl = document.getElementById("year");
    if (!yearEl) return;

    yearEl.textContent = new Date().getFullYear();
  }

  function showAdminReturnLink() {
    if (isAdminPage()) return;

    let hasAdminSession = false;

    try {
      hasAdminSession = Boolean(
        sessionStorage.getItem("portfolioAdminPassword")
      );
    } catch {
      return;
    }

    if (!hasAdminSession) return;

    document.querySelectorAll(".site-nav").forEach((navigation) => {
      if (navigation.querySelector("[data-admin-return]")) return;

      const link = document.createElement("a");
      link.href = "admin.html";
      link.className = "site-nav__admin-return";
      link.dataset.adminReturn = "";
      link.textContent = "Admin Dashboard";
      link.setAttribute("aria-label", "Return to the admin dashboard");

      navigation.append(link);
    });
  }

  function isAdminPage() {
    const page = window.location.pathname.split("/").pop();
    return page === "admin.html";
  }
})();
