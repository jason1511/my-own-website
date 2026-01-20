(() => {
  function encode(data) {
    return Object.keys(data)
      .map(
        (key) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
      )
      .join("&");
  }

  const form = document.getElementById("contactForm");
  if (!form) return;

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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encode(data),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

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
})();
