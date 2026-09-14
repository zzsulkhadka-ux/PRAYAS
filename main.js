/* =========================================================
   Prayas Studio — interaction layer
   (header state, mobile nav, staggered scroll reveal)
========================================================= */
(function () {
  "use strict";

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Header background on scroll
  var header = document.getElementById("site-header");
  function updateHeader() {
    if (window.scrollY > 24) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  // Mobile nav toggle
  var toggle = document.getElementById("nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Staggered "one by one" scroll reveal.
  // Items are grouped by their nearest section so each section's
  // children reveal in sequence as it enters the viewport, rather
  // than every item on the page firing independently.
  var sections = document.querySelectorAll("section, .hero");
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  sections.forEach(function (section) {
    var items = section.querySelectorAll(".reveal-item");
    if (!items.length) return;

    if (prefersReduced) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          items.forEach(function (el, i) {
            setTimeout(function () {
              el.classList.add("is-visible");
            }, i * 110); // one-by-one cadence
          });
          obs.disconnect();
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(section);
  });
})();
