// js/main.js
(() => {
  // Helper: encode form data for x-www-form-urlencoded (Netlify expects this for AJAX)
  function encode(data) {
    return Object.keys(data)
      .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&");
  }

  const form = document.getElementById("contactForm");
  if (!form) return; // Only run on pages that have the form

  const statusEl = document.getElementById("formStatus");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Basic client-side validation (browser handles required, but we add UX)
    const name = form.elements["name"].value.trim();
    const email = form.elements["email"].value.trim();
    const message = form.elements["message"].value.trim();

    if (!name || !email || !message) {
      if (statusEl) statusEl.textContent = "Please fill in all fields.";
      return;
    }

    // Disable button to avoid duplicate submits
    if (submitBtn) submitBtn.disabled = true;
    if (statusEl) statusEl.textContent = "Sending…";

    try {
      // Send to current page path (Netlify intercepts because of data-netlify="true")
      const formData = {
        "form-name": form.getAttribute("name") || "contact",
        name,
        email,
        message,
        "bot-field": form.elements["bot-field"] ? form.elements["bot-field"].value : "",
      };

      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode(formData),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      if (statusEl) statusEl.textContent = "Thanks — your message has been sent.";
      form.reset();
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = "Sorry — something went wrong. Please email me instead.";
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
})();
