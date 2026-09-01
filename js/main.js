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

  async function showAdminReturnLink() {
    if (isAdminPage()) return;

    try {
      const response = await fetch("/api/admin/session", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.ok || !data.authenticated) return;

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
    } catch {
      // Keep public navigation unchanged if session checks are unavailable.
    }
  }

  function isAdminPage() {
    const page = window.location.pathname.split("/").pop();
    return page === "admin.html";
  }
})();
