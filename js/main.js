// js/main.js
(() => {
  updateFooterYear();
  setupPortfolioNavigation();
  showAdminReturnLink();

  function updateFooterYear() {
    const yearEl = document.getElementById("year");
    if (!yearEl) return;
    yearEl.textContent = new Date().getFullYear();
  }

  function setupPortfolioNavigation() {
    const navigation = document.querySelector(".portfolio-nav");
    if (!navigation) return;

    const links = Array.from(
      navigation.querySelectorAll('a[href^="#"]')
    );
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!links.length || !sections.length) return;

    const setCurrent = (id) => {
      for (const link of links) {
        const active = link.getAttribute("href") === "#" + id;
        if (active) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    };

    for (const link of links) {
      link.addEventListener("click", (event) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;

        event.preventDefault();
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        target.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });

        window.history.replaceState(null, "", link.getAttribute("href"));
        setCurrent(target.id);
      });
    }

    if (!("IntersectionObserver" in window)) return;

    const visibleSections = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibleSections.set(entry.target.id, entry);
        }

        const current = Array.from(visibleSections.values())
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (current) setCurrent(current.target.id);
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0, 0.15, 0.35, 0.6],
      }
    );

    for (const section of sections) observer.observe(section);
  }

  async function showAdminReturnLink() {
    if (isAdminPage()) return;

    try {
      const response = await fetch("/api/admin/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (!data.ok || !data.authenticated) return;

      document
        .querySelectorAll(".site-nav, [data-admin-links]")
        .forEach((navigation) => {
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
    const page = window.location.pathname.split("/").filter(Boolean).pop() || "";
    return page === "admin" || page === "admin.html";
  }
})();
