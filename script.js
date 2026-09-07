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

// Hero "particle drift" text — ported from an Originkit/Framer React
// component to plain canvas + rAF (no build step here, so the React/Framer
// bits are gone; the particle sampling, formation and cursor-repulsion
// physics are kept as-is). Renders "Spatial" / "Design" as two centered
// lines of colored particles that assemble once the hero scrolls into view,
// then drift away from the cursor like a void carved out of a star field.
(function () {
  const container = document.getElementById("heroParticleText");
  if (!container) return;
  const canvas = container.querySelector("canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const LINES = ["Spatial", "Design"];
  const PALETTE = ["#8830E0", "#FF8D28", "#B1B1B1"];
  const PARTICLE_SIZE = 64; // 1-100 (rendered at size/4, matching the source component)
  const PARTICLE_COUNT = 50; // 1-50, higher = denser
  const MOUSE_RADIUS = 45;
  const MOUSE_FORCE = 25;
  const FONT_SIZE_CAP = 250;
  const FONT_WEIGHT = 600; // Medium
  const FONT_FAMILY = '"Bricolage Grotesque", Arial, sans-serif';
  const FORM_MS = 900; // formation duration in ms
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Evaluate a CSS cubic-bezier [x1,y1,x2,y2] as an (x in 0..1) => eased fn.
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t) => ((ay * t + by) * t + cy) * t;
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        const sx = sampleX(mid);
        if (Math.abs(sx - x) < 1e-6) { t = mid; break; }
        if (sx < x) lo = mid; else hi = mid;
        t = mid;
      }
      return sampleY(t);
    };
  }
  const easeFn = cubicBezier(0.16, 1, 0.3, 1); // easeOutExpo-ish

  let count = 0;
  let ox = new Float32Array(0), oy = new Float32Array(0);
  let sx = new Float32Array(0), sy = new Float32Array(0);
  let px = new Float32Array(0), py = new Float32Array(0);
  let repX = new Float32Array(0), repY = new Float32Array(0);
  let cIdx = new Uint8Array(0);

  let cssW = 0, cssH = 0, dpr = 1;
  let prevMx = -99999, prevMy = -99999, mouseSpeed = 0;
  let smoothX = -99999, smoothY = -99999;

  const pointer = { x: -99999, y: -99999, active: false };
  let formVal = 0;
  let lastFrame = null;
  let hidden = true;
  let reverse = false;

  // Largest font size where every line's width fits maxW and its height
  // (approximated as the font size itself) fits maxLineH.
  function fitFontSize(measureCtx, lines, maxW, maxLineH, cap) {
    let lo = 8, hi = cap, best = lo;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      measureCtx.font = `${FONT_WEIGHT} ${mid}px ${FONT_FAMILY}`;
      let widest = 0;
      lines.forEach(function (line) {
        const w = measureCtx.measureText(line).width;
        if (w > widest) widest = w;
      });
      if (widest <= maxW && mid <= maxLineH) { best = mid; lo = mid; }
      else { hi = mid; }
    }
    return Math.max(8, Math.floor(best));
  }

  function sampleText() {
    const W = cssW, H = cssH;
    if (W <= 0 || H <= 0) return;
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.floor(W * dpr));
    off.height = Math.max(1, Math.floor(H * dpr));
    const offCtx = off.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;
    offCtx.scale(dpr, dpr);

    const maxW = W * 0.92;
    const maxLineH = (H * 0.92) / LINES.length;
    const size = fitFontSize(offCtx, LINES, maxW, maxLineH, FONT_SIZE_CAP);

    offCtx.clearRect(0, 0, W, H);
    offCtx.fillStyle = "#fff";
    offCtx.font = `${FONT_WEIGHT} ${size}px ${FONT_FAMILY}`;
    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";
    const lineGap = size * 1.05;
    const totalH = lineGap * (LINES.length - 1);
    const startY = H / 2 - totalH / 2;
    LINES.forEach(function (line, i) {
      offCtx.fillText(line, W / 2, startY + i * lineGap);
    });

    const img = offCtx.getImageData(0, 0, Math.floor(W * dpr), Math.floor(H * dpr));
    const data = img.data;

    const pCount = Math.max(1, Math.min(50, PARTICLE_COUNT));
    const stride = Math.max(2, Math.round(150 / pCount));

    let candidates = 0;
    for (let y = 0; y < H; y += stride) {
      for (let x = 0; x < W; x += stride) {
        const ix = Math.floor(x * dpr), iy = Math.floor(y * dpr);
        const idx = (iy * img.width + ix) * 4 + 3;
        if (data[idx] > 128) candidates++;
      }
    }
    const downsample = candidates > 30000 ? Math.ceil(candidates / 30000) : 1;
    const allocCount = Math.min(candidates, 30000);

    const newOx = new Float32Array(allocCount);
    const newOy = new Float32Array(allocCount);
    const newSx = new Float32Array(allocCount);
    const newSy = new Float32Array(allocCount);
    const newPx = new Float32Array(allocCount);
    const newPy = new Float32Array(allocCount);
    const newC = new Uint8Array(allocCount);

    let i = 0, seen = 0;
    for (let y = 0; y < H && i < allocCount; y += stride) {
      for (let x = 0; x < W && i < allocCount; x += stride) {
        const ix = Math.floor(x * dpr), iy = Math.floor(y * dpr);
        const idx = (iy * img.width + ix) * 4 + 3;
        if (data[idx] > 128) {
          if (seen % downsample === 0) {
            newOx[i] = x; newOy[i] = y;
            const ang = Math.random() * Math.PI * 2;
            const rad = Math.max(W, H) * (0.6 + Math.random() * 0.5);
            const rx = W / 2 + Math.cos(ang) * rad;
            const ry = H / 2 + Math.sin(ang) * rad;
            newSx[i] = rx; newSy[i] = ry;
            newPx[i] = rx; newPy[i] = ry;
            newC[i] = Math.floor(Math.random() * PALETTE.length);
            i++;
          }
          seen++;
        }
      }
    }

    count = i;
    ox = newOx; oy = newOy; sx = newSx; sy = newSy; px = newPx; py = newPy;
    repX = new Float32Array(allocCount);
    repY = new Float32Array(allocCount);
    cIdx = newC;
    formVal = 0;
    lastFrame = null;
  }

  function resize() {
    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width), h = Math.floor(rect.height);
    if (w <= 0 || h <= 0) return;
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    cssW = w; cssH = h;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sampleText();
  }

  const buckets = PALETTE.map(function () { return []; });

  function drawFrame() {
    ctx.clearRect(0, 0, cssW, cssH);
    const drawSize = Math.max(1, PARTICLE_SIZE / 4);
    const half = drawSize / 2;

    const now = performance.now();
    const last = lastFrame == null ? now : lastFrame;
    const dt = Math.min(64, Math.max(0, now - last));
    lastFrame = now;

    const target = reverse ? 0 : 1;
    let v = formVal;
    if (FORM_MS <= 0) { v = target; }
    else {
      const step = dt / FORM_MS;
      if (v < target) v = Math.min(target, v + step);
      else if (v > target) v = Math.max(target, v - step);
    }
    formVal = v;
    if (reverse && v <= 0) hidden = true;
    if (hidden) return;
    const forming = v < 1;
    const factor = easeFn(v);

    const hitSpeed = mouseSpeed;
    mouseSpeed *= 0.88;
    const active = !forming && pointer.active;
    if (active) {
      const lerpFactor = Math.max(0.08, 0.3 - hitSpeed * 0.006);
      if (smoothX < -9000) { smoothX = pointer.x; smoothY = pointer.y; }
      else {
        smoothX += (pointer.x - smoothX) * lerpFactor;
        smoothY += (pointer.y - smoothY) * lerpFactor;
      }
    } else {
      smoothX = -99999; smoothY = -99999;
    }
    const mx = smoothX, my = smoothY;
    const repCutoff = Math.max(1, MOUSE_RADIUS);
    const repCutoffSq = repCutoff * repCutoff;

    for (let b = 0; b < buckets.length; b++) buckets[b].length = 0;

    for (let i = 0; i < count; i++) {
      const oxi = ox[i], oyi = oy[i];
      if (forming) {
        px[i] = sx[i] + (oxi - sx[i]) * factor;
        py[i] = sy[i] + (oyi - sy[i]) * factor;
        buckets[cIdx[i]].push(i);
        continue;
      }
      let inZone = false;
      if (active) {
        const dx = oxi - mx, dy = oyi - my;
        const distSq = dx * dx + dy * dy;
        if (distSq > 0 && distSq < repCutoffSq) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist, ny = dy / dist;
          const falloff = 1 - dist / repCutoff;
          const push = falloff * hitSpeed * MOUSE_FORCE * 0.05;
          repX[i] += nx * push;
          repY[i] += ny * push;
          const targetRepX = nx * (repCutoff - dist);
          const targetRepY = ny * (repCutoff - dist);
          repX[i] += (targetRepX - repX[i]) * 0.06;
          repY[i] += (targetRepY - repY[i]) * 0.06;
          inZone = true;
        }
      }
      if (!inZone) { repX[i] *= 0.97; repY[i] *= 0.97; }
      px[i] = oxi + repX[i];
      py[i] = oyi + repY[i];
      buckets[cIdx[i]].push(i);
    }

    ctx.globalAlpha = forming ? Math.min(1, Math.max(0, factor)) : 1;
    for (let b = 0; b < buckets.length; b++) {
      const bucket = buckets[b];
      if (!bucket.length) continue;
      ctx.fillStyle = PALETTE[b];
      for (let k = 0; k < bucket.length; k++) {
        const i = bucket[k];
        ctx.fillRect(px[i] - half, py[i] - half, drawSize, drawSize);
      }
    }
    ctx.globalAlpha = 1;
  }

  function staticDraw() {
    hidden = false; reverse = false;
    for (let i = 0; i < count; i++) { px[i] = ox[i]; py[i] = oy[i]; }
    drawFrame();
  }

  const ro = new ResizeObserver(function () {
    resize();
    if (reduceMotion) staticDraw();
  });
  ro.observe(container);

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? cssW / rect.width : 1;
    const scaleY = rect.height > 0 ? cssH / rect.height : 1;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    if (prevMx > -9000) {
      const ddx = mx - prevMx, ddy = my - prevMy;
      mouseSpeed = Math.sqrt(ddx * ddx + ddy * ddy);
    }
    prevMx = mx; prevMy = my;
    pointer.x = mx; pointer.y = my; pointer.active = true;
  }
  function onLeave() {
    pointer.x = -99999; pointer.y = -99999; pointer.active = false;
    prevMx = -99999; prevMy = -99999;
  }
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointercancel", onLeave);

  // Formation trigger: assemble once the hero scrolls into view (it's above
  // the fold, so in practice this fires almost immediately on load).
  let entered = false;
  const io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !entered) {
      entered = true;
      reverse = false;
      hidden = false;
      io.disconnect();
    }
  }, { threshold: 0 });
  io.observe(container);

  resize();

  // Canvas text draws in whatever font is ready *at that instant* — if the
  // Bricolage Grotesque file is still loading, the first sample would
  // silently fall back to Arial. Re-sample once it's actually available.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      sampleText();
    });
  }

  if (reduceMotion) {
    staticDraw();
  } else {
    (function loop() {
      drawFrame();
      requestAnimationFrame(loop);
    })();
  }
})();
