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

    // Treat each direct child of the track (a slide, a pair, whatever it is)
    // as one "stop" — this is what makes prev/next move one card at a time
    // instead of jumping by a fixed fraction of the viewport.
    function cards() {
      return Array.from(track.children);
    }

    // getBoundingClientRect (not offsetLeft) because offsetLeft is relative to
    // the nearest positioned ancestor, which isn't reliably the track itself.
    function cardLeft(card) {
      return card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    }

    function closestCardIndex() {
      const kids = cards();
      let closestIdx = 0;
      let closestDist = Infinity;
      kids.forEach(function (card, i) {
        const dist = Math.abs(cardLeft(card) - track.scrollLeft);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      });
      return closestIdx;
    }

    function scrollToCard(idx) {
      const kids = cards();
      if (!kids.length) return;
      const clamped = Math.max(0, Math.min(kids.length - 1, idx));
      track.scrollTo({ left: cardLeft(kids[clamped]), behavior: "smooth" });
    }

    function updateArrows() {
      const max = track.scrollWidth - track.clientWidth - 1;
      prevBtn.disabled = track.scrollLeft <= 0;
      nextBtn.disabled = track.scrollLeft >= max;

      if (segs.length) {
        const ratio = max > 0 ? Math.min(Math.max(track.scrollLeft / max, 0), 1) : 0;
        // Always keep at least the first segment filled, even at scrollLeft 0.
        const filledCount = Math.max(1, Math.round(ratio * segs.length));
        segs.forEach(function (seg, i) {
          seg.classList.toggle("filled", i < filledCount);
        });
      }
    }

    prevBtn.addEventListener("click", function () {
      scrollToCard(closestCardIndex() - 1);
    });
    nextBtn.addEventListener("click", function () {
      scrollToCard(closestCardIndex() + 1);
    });
    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();
  });
})();

// Brand link (top-left "SRIRAJ RAJKUMAR") scrolls to the very top of the
// page. A plain #top anchor doesn't work here because it points at the
// sticky nav bar itself, and browsers won't scroll to a position:sticky
// element that's already pinned at the viewport top.
(function () {
  const brand = document.querySelector("a.brand");
  if (!brand) return;
  brand.addEventListener("click", function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
