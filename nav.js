// Accessible mobile-nav disclosure. The burger is a real <button> with
// aria-expanded + aria-controls; this handler keeps the state honest so the menu
// is operable by keyboard and exposed to assistive tech. No state = no JS needed
// on desktop, where the links are always shown by CSS. Progressive enhancement:
// if this script never runs the button is inert, but the links collapse only at
// narrow widths, so nothing is permanently hidden.
(() => {
  const close = (btn) => btn && btn.setAttribute("aria-expanded", "false");
  const openBurger = () => document.querySelector('.nav__burger[aria-expanded="true"]');

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav__burger");
    if (btn) {
      btn.setAttribute("aria-expanded", btn.getAttribute("aria-expanded") === "true" ? "false" : "true");
      return;
    }
    // a click outside an open menu dismisses it
    if (!e.target.closest(".nav__links")) close(openBurger());
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const btn = openBurger();
    if (btn) { close(btn); btn.focus(); }
  });
})();
