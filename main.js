/* Southpaw Boxing Club — main.js
   Header state, mobile nav, scroll reveal, active link,
   contact form demo. */

(function () {
  "use strict";

  /* ---------------- helpers ---------------- */

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var body = document.body;

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
      return;
    }
    /* focus trap: mientras el menú móvil está abierto, Tab circula solo por sus enlaces */
    if (e.key === "Tab" && menu.classList.contains("is-open") &&
        getComputedStyle(burger).display !== "none") {
      var items = $$("a[href], button:not([disabled])", menu);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || !menu.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !menu.contains(active))) {
        e.preventDefault();
        first.focus();
      }
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
    if (prefersReduced || !("IntersectionObserver" in window)) {
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
})();
