/* Southpaw Boxing Club — main.js
   Header state, mobile nav, scroll reveal, active link. */

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
})();

/* ---------------- abierto ahora (hora de Madrid) ---------------- */
(function () {
  "use strict";
  // 0 = domingo … 6 = sábado · minutos desde medianoche
  var HOURS = {
    0: [],
    1: [[660, 900], [1080, 1260]],
    2: [[660, 900], [1080, 1260]],
    3: [[660, 900], [1080, 1260]],
    4: [[660, 900], [1080, 1260]],
    5: [[660, 900], [1080, 1260]],
    6: [[720, 780]]
  };
  var NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  function fmt(m) { return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + (m % 60)).slice(-2); }
  function now() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; };
      return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), mins: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
    } catch (e) { var d = new Date(); return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() }; }
  }
  function status() {
    var n = now(), today = HOURS[n.day], i;
    for (i = 0; i < today.length; i++) if (n.mins >= today[i][0] && n.mins < today[i][1]) return { open: true, day: n.day, text: "Abierto ahora · hasta las " + fmt(today[i][1]) };
    for (i = 0; i < today.length; i++) if (n.mins < today[i][0]) return { open: false, day: n.day, text: "Cerrado ahora · abrimos a las " + fmt(today[i][0]) };
    var next = (n.day + 1) % 7;
    while (!HOURS[next].length) next = (next + 1) % 7;
    var when = next === (n.day + 1) % 7 ? "mañana " : "el ";
    return { open: false, day: n.day, text: "Cerrado ahora · abrimos " + when + NAMES[next] + " a las " + fmt(HOURS[next][0][0]) };
  }
  function paint() {
    var s = status();
    Array.prototype.forEach.call(document.querySelectorAll("[data-open-now]"), function (el) {
      el.textContent = s.text;
      var p = el.closest(".hero__open"); if (p) p.setAttribute("data-state", s.open ? "open" : "closed");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-open-badge]"), function (el) {
      el.textContent = s.open ? "Abierto ahora" : "Cerrado ahora";
      el.setAttribute("data-state", s.open ? "open" : "closed");
      el.hidden = false;
    });
    Array.prototype.forEach.call(document.querySelectorAll(".schedule li[data-days]"), function (li) {
      li.classList.toggle("is-today", li.getAttribute("data-days").split(",").map(Number).indexOf(s.day) !== -1);
    });
  }
  paint();
  setInterval(paint, 60000);
})();
