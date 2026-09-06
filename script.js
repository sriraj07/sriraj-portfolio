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

  // Figma-style horizontal project carousels: arrows scroll the track left/right.
  document.querySelectorAll("[data-fig-carousel]").forEach(function (carouselRoot) {
    const track = carouselRoot.querySelector(".fig-carousel-track");
    const prevBtn = carouselRoot.querySelector(".fc-arrow.prev");
    const nextBtn = carouselRoot.querySelector(".fc-arrow.next");
    const segs = Array.from(carouselRoot.querySelectorAll(".fc-divider span"));
    if (!track || !prevBtn || !nextBtn) return;

    function step() {
      return Math.max(track.clientWidth * 0.85, 280);
    }

    function updateArrows() {
      const max = track.scrollWidth - track.clientWidth - 1;
      prevBtn.disabled = track.scrollLeft <= 0;
      nextBtn.disabled = track.scrollLeft >= max;

      if (segs.length) {
        const ratio = max > 0 ? Math.min(Math.max(track.scrollLeft / max, 0), 1) : 0;
        const filledCount = Math.round(ratio * segs.length);
        segs.forEach(function (seg, i) {
          seg.classList.toggle("filled", i < filledCount);
        });
      }
    }

    prevBtn.addEventListener("click", function () {
      track.scrollBy({ left: -step(), behavior: "smooth" });
    });
    nextBtn.addEventListener("click", function () {
      track.scrollBy({ left: step(), behavior: "smooth" });
    });
    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();
  });
})();
