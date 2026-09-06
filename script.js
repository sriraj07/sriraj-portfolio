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

  // Stacked project carousels (main image + 2 vertically-scrolling thumbnails).
  document.querySelectorAll("[data-stack-carousel]").forEach(function (carouselRoot) {
    let images;
    try {
      images = JSON.parse(carouselRoot.dataset.images);
    } catch (e) {
      return;
    }
    if (!images || !images.length) return;

    const stage = carouselRoot.querySelector(".carousel-stage");
    const mainImg = carouselRoot.querySelector(".carousel-main img");
    const caption = carouselRoot.querySelector(".carousel-caption");
    const thumbEls = Array.from(carouselRoot.querySelectorAll(".carousel-thumbs .thumb"));
    const prevBtn = carouselRoot.querySelector(".car-arrow.prev");
    const nextBtn = carouselRoot.querySelector(".car-arrow.next");
    const progress = carouselRoot.querySelector(".carousel-progress");

    let index = 0;
    let animating = false;

    images.forEach(function () {
      const seg = document.createElement("span");
      seg.className = "seg";
      progress.appendChild(seg);
    });
    const segs = Array.from(progress.querySelectorAll(".seg"));

    function render() {
      mainImg.src = images[index].src;
      mainImg.alt = images[index].alt || "";
      caption.textContent = images[index].caption || "";

      thumbEls.forEach(function (el, i) {
        const data = images[index + i + 1];
        const img = el.querySelector("img");
        if (data) {
          el.style.visibility = "visible";
          img.src = data.src;
          img.alt = data.alt || "";
          el.dataset.targetIndex = String(index + i + 1);
        } else {
          el.style.visibility = "hidden";
          el.removeAttribute("data-target-index");
        }
      });

      segs.forEach(function (seg, i) {
        seg.classList.toggle("active", i === index);
      });

      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === images.length - 1;
      carouselRoot.classList.toggle("at-start", index === 0);
      carouselRoot.classList.toggle("at-end", index === images.length - 1);
    }

    function goTo(newIndex, dir) {
      if (animating || newIndex < 0 || newIndex > images.length - 1 || newIndex === index) return;
      animating = true;
      stage.classList.add(dir > 0 ? "anim-next" : "anim-prev");
      window.setTimeout(function () {
        index = newIndex;
        render();
        stage.classList.remove("anim-next", "anim-prev");
        animating = false;
      }, 280);
    }

    prevBtn.addEventListener("click", function () { goTo(index - 1, -1); });
    nextBtn.addEventListener("click", function () { goTo(index + 1, 1); });
    thumbEls.forEach(function (el) {
      el.addEventListener("click", function () {
        const target = parseInt(el.dataset.targetIndex, 10);
        if (!isNaN(target)) goTo(target, target > index ? 1 : -1);
      });
    });

    render();
  });
})();
