// 404 · la cuenta del árbitro: 1… 10 y K.O.
(function () {
  "use strict";
  var el = document.getElementById("count");
  if (!el) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) { el.textContent = "K.O."; el.classList.add("is-ko"); return; }
  var n = 1;
  var tick = setInterval(function () {
    n += 1;
    if (n <= 10) {
      el.textContent = String(n);
      el.classList.remove("is-beat");
      void el.offsetWidth; // reinicia la animación
      el.classList.add("is-beat");
    } else {
      clearInterval(tick);
      el.textContent = "K.O.";
      el.classList.add("is-ko");
    }
  }, 800);
})();
