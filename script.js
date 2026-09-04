// Theme toggle (persisted) + copy-to-clipboard email.

(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");

  // Default to dark (the design's primary). Only override if the visitor
  // has explicitly chosen a theme before.
  const saved = localStorage.getItem("theme");
  if (saved) root.setAttribute("data-theme", saved);

  toggle.addEventListener("click", function () {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  // Copy email to clipboard.
  const emailBtn = document.getElementById("copyEmail");
  const hint = document.getElementById("copyHint");
  if (emailBtn) {
    emailBtn.addEventListener("click", async function () {
      const email = emailBtn.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
        hint.textContent = "COPIED ✓";
      } catch (e) {
        // Fallback for browsers without clipboard API / non-secure contexts.
        const t = document.createElement("textarea");
        t.value = email;
        document.body.appendChild(t);
        t.select();
        try { document.execCommand("copy"); hint.textContent = "COPIED ✓"; }
        catch (_) { hint.textContent = "COPY FAILED"; }
        document.body.removeChild(t);
      }
      setTimeout(() => (hint.textContent = "CLICK TO COPY"), 2000);
    });
  }
})();
