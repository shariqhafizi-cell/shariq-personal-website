/* =========================================================
   Shariq Hafizi — personal site
   Three small things: theme toggle, scroll reveal, sticky-nav border.
   No dependencies.
   ========================================================= */

(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- 1. theme toggle ---------- */

  var toggle = document.getElementById("themeToggle");

  function currentTheme() {
    var forced = root.getAttribute("data-theme");
    if (forced) return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* Storage can be blocked (private window, cleared site data).
           The toggle still works for this visit; it just won't be remembered. */
      }
    });
  }

  /* ---------- 2. scroll reveal ---------- */

  var reveals = document.querySelectorAll(".reveal");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || !("IntersectionObserver" in window)) {
    // Show everything at once rather than risk hidden content.
    for (var i = 0; i < reveals.length; i++) reveals[i].classList.add("is-in");
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    reveals.forEach(function (el, index) {
      // Stagger siblings slightly so a row of cards cascades in.
      el.style.transitionDelay = (index % 4) * 70 + "ms";
      observer.observe(el);
    });
  }

  /* ---------- 3. nav border once scrolled ---------- */

  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-stuck", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 4. footer year ---------- */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
