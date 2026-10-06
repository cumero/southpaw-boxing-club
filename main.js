/* Southpaw Boxing Club — main.js
   Header state, mobile nav, scroll reveal, active link,
   contact form demo, Tweaks panel (persisted). */

(function () {
  "use strict";

  /* ---------------- helpers ---------------- */

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var body = document.body;
  var storageOK = true;
  try {
    var probe = "__spc__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch (e) { storageOK = false; }

  function store(key, value) {
    if (!storageOK) return;
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch (e) { /* ignore */ }
  }
  function recall(key) {
    if (!storageOK) return null;
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  /* ---------------- header scroll state ---------------- */

  var header = $("#site-header");
  var lastState = false;

  function onScroll() {
    var scrolled = window.scrollY > 12;
    if (scrolled !== lastState) {
      header.classList.toggle("is-scrolled", scrolled);
      lastState = scrolled;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- mobile nav ---------------- */

  var burger = $("#nav-burger");
  var menu = $("#nav-menu");

  function focusMenuFirst() {
    var first = menu.querySelector("a, button");
    if (!first) return;
    (function retry(left) {
      var cs = getComputedStyle(first);
      if (cs.visibility !== "hidden" && cs.display !== "none") {
        first.focus();
        return;
      }
      if (left > 0) setTimeout(function () { retry(left - 1); }, 40);
    })(5);
  }

  function setMenu(open) {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    menu.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
    if (open) focusMenuFirst();
  }

  burger.addEventListener("click", function () {
    setMenu(burger.getAttribute("aria-expanded") !== "true");
  });

  $$("a", menu).forEach(function (link) {
    link.addEventListener("click", function () { setMenu(false); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu.classList.contains("is-open")) {
      setMenu(false);
      burger.focus();
    }
  });

  /* ---------------- scroll reveal ---------------- */

  var reveals = $$(".reveal");

  function showAll() {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  var prefersReduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var observer = null;

  function startReveal() {
    if (prefersReduced || body.classList.contains("no-motion") ||
        !("IntersectionObserver" in window)) {
      showAll();
      return;
    }
    if (observer) return;
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) {
      if (!el.classList.contains("is-visible")) observer.observe(el);
    });
  }

  startReveal();

  /* ---------------- active nav link ---------------- */

  var sections = $$("main section[id]");
  var navLinks = $$(".nav__link");

  function setActive(id) {
    navLinks.forEach(function (link) {
      var match = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", match);
      if (match) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    sections.forEach(function (sec) { spy.observe(sec); });
  }

  /* ---------------- contact form (demo) ---------------- */

  var form = $("#contact-form");
  var status = $("#form-status");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    status.hidden = false;
    status.textContent =
      "Mensaje simulado — este formulario todavía no está conectado a ningún correo.";
    form.reset();
  });

  /* ---------------- Tweaks panel ---------------- */

  var tweaks = $("#tweaks");
  var twToggle = $("#tweaks-toggle");
  var twPanel = $("#tweaks-panel");
  var twClose = $("#tweaks-close");
  var twTexture = $("#tw-texture");
  var twMotion = $("#tw-motion");
  var twAccents = $$("input[name='tw-accent']");

  var KEY = "spc-tweaks";

  function setPanel(open) {
    twPanel.hidden = !open;
    twToggle.setAttribute("aria-expanded", String(open));
  }

  twToggle.addEventListener("click", function () {
    setPanel(twPanel.hidden);
  });
  twClose.addEventListener("click", function () {
    setPanel(false);
    twToggle.focus();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !twPanel.hidden) {
      setPanel(false);
      twToggle.focus();
    }
  });

  function applyTexture(on) {
    body.classList.toggle("no-texture", !on);
    twTexture.checked = on;
  }

  function applyMotion(on) {
    body.classList.toggle("no-motion", !on);
    twMotion.checked = on;
    if (!on) {
      if (observer) {
        reveals.forEach(function (el) { observer.unobserve(el); });
      }
      showAll();
    } else {
      observer = null;
      startReveal();
    }
  }

  function applyAccent(value) {
    document.documentElement.setAttribute("data-accent", value);
    twAccents.forEach(function (r) { r.checked = r.value === value; });
  }

  function persist() {
    store(KEY, JSON.stringify({
      texture: twTexture.checked,
      motion: twMotion.checked,
      accent: (document.documentElement.getAttribute("data-accent") || "mostaza")
    }));
  }

  twTexture.addEventListener("change", function () {
    applyTexture(twTexture.checked);
    persist();
  });

  twMotion.addEventListener("change", function () {
    applyMotion(twMotion.checked);
    persist();
  });

  twAccents.forEach(function (r) {
    r.addEventListener("change", function () {
      if (r.checked) {
        applyAccent(r.value);
        persist();
      }
    });
  });

  /* restore saved tweaks */
  (function restore() {
    var saved = null;
    try { saved = JSON.parse(recall(KEY) || "null"); } catch (e) { saved = null; }
    if (!saved) return;
    if (typeof saved.texture === "boolean") applyTexture(saved.texture);
    if (typeof saved.motion === "boolean") applyMotion(saved.motion);
    if (saved.accent) applyAccent(saved.accent);
  })();

  /* avoid unused-var lint on tweaks root */
  void tweaks;
})();
