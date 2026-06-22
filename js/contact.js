// js/contact.js
(() => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const statusEl = document.getElementById("formStatus");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = form.elements["name"].value.trim();
    const email = form.elements["email"].value.trim();
    const message = form.elements["message"].value.trim();
    const botField = form.elements["bot-field"]?.value || "";

    if (!name || !email || !message) {
      setStatus("Please fill in all fields.");
      return;
    }

    submitBtn.disabled = true;
    setStatus("Sending…");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: encode({
          name,
          email,
          message,
          "bot-field": botField,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      setStatus("Thanks — your message has been sent.");
      form.reset();
    } catch (error) {
      console.error(error);
      setStatus("Sorry — something went wrong. Please email me instead.");
    } finally {
      submitBtn.disabled = false;
    }
  });

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function encode(data) {
    return Object.keys(data)
      .map(
        (key) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(data[key])
      )
      .join("&");
  }
})();