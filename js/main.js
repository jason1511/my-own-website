// js/main.js
(() => {
  /* ---------------- CONTACT FORM (Netlify) ---------------- */

  function encode(data) {
    return Object.keys(data)
      .map(
        (key) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
      )
      .join("&");
  }

  const form = document.getElementById("contactForm");
  if (form) {
    const statusEl = document.getElementById("formStatus");
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = form.elements["name"].value.trim();
      const email = form.elements["email"].value.trim();
      const message = form.elements["message"].value.trim();

      if (!name || !email || !message) {
        statusEl.textContent = "Please fill in all fields.";
        return;
      }

      submitBtn.disabled = true;
      statusEl.textContent = "Sending…";

      try {
        const data = {
          "form-name": form.getAttribute("name"),
          name,
          email,
          message,
          "bot-field": form.elements["bot-field"].value,
        };

        const res = await fetch(window.location.pathname, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: encode(data),
        });

        if (!res.ok) throw new Error(`Request failed: ${res.status}`);

        statusEl.textContent = "Thanks — your message has been sent.";
        form.reset();
      } catch (err) {
        console.error(err);
        statusEl.textContent =
          "Sorry — something went wrong. Please email me instead.";
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  /* ---------------- STEAM WORKSHOP STATS ---------------- */

  (async () => {
    const cards = document.querySelectorAll(".workshop-card[data-workshop-id]");
    if (cards.length === 0) return;

    const ids = Array.from(cards)
      .map((c) => c.getAttribute("data-workshop-id"))
      .filter(Boolean);

    const url =
      "/.netlify/functions/workshop-stats?ids=" +
      encodeURIComponent(ids.join(","));

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
      const stats = await res.json();

      cards.forEach((card) => {
        const id = card.getAttribute("data-workshop-id");
        const s = stats[id];
        if (!s) return;

        const views = card.querySelector('[data-stat="views"]');
        const subs = card.querySelector('[data-stat="subs"]');
        const favs = card.querySelector('[data-stat="favs"]');

        if (views) views.textContent = format(s.views) + " views";
        if (subs) subs.textContent = format(s.subscriptions) + " subscribers";
        if (favs) favs.textContent = format(s.favorited) + " favorites";
      });
    } catch (err) {
      console.warn("Workshop stats unavailable:", err);
    }

    function format(n) {
      return Number.isFinite(n) ? n.toLocaleString() : "—";
    }
  })();
})();
  /* ---------------- GITHUB REPO STATS ---------------- */

  (async () => {
    const cards = document.querySelectorAll(".repo-card[data-gh-repo]");
    if (cards.length === 0) return;

    const repos = Array.from(cards)
      .map((c) => c.getAttribute("data-gh-repo"))
      .filter(Boolean);

    const url =
      "/.netlify/functions/github-repo-stats?repos=" +
      encodeURIComponent(repos.join(","));

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GitHub stats fetch failed: ${res.status}`);
      const byRepo = await res.json();

      cards.forEach((card) => {
        const repo = card.getAttribute("data-gh-repo");
        const data = byRepo[repo];
        if (!data || data.error) return;

        const starsEl = card.querySelector('[data-gh="stars"]');
        const forksEl = card.querySelector('[data-gh="forks"]');
        const updatedEl = card.querySelector('[data-gh="updated"]');

        if (starsEl) starsEl.textContent = `${fmt(data.stargazers_count)} stars`;
        if (forksEl) forksEl.textContent = `${fmt(data.forks_count)} forks`;
        if (updatedEl) updatedEl.textContent = `${fmtDate(data.updated_at)} updated`;
      });
    } catch (err) {
      console.warn("GitHub repo stats unavailable:", err);
    }

    function fmt(n) {
      return Number.isFinite(n) ? n.toLocaleString() : "—";
    }

    function fmtDate(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
    }
  })();
