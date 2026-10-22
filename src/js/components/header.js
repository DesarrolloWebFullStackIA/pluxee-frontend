function initHeader() {
  const header = document.querySelector(".header");

  if (!header || header.dataset.initialized === "true") return;

  header.dataset.initialized = "true";

  const toggle = header.querySelector(".header__toggle");
  const nav = header.querySelector("#header-nav");
  const icon = header.querySelector(".header__toggle-icon");
  const desktop = window.matchMedia("(min-width: 1100px)");

  if (!toggle || !nav || !icon) return;

  function setOpen(open) {
    header.classList.toggle("header--open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute(
      "aria-label",
      open ? "Cerrar menú de navegación" : "Abrir menú de navegación"
    );
    icon.textContent = open ? "close" : "menu";
  }

  const isOpen = () => header.classList.contains("header--open");

  // Abrir / cerrar con la hamburguesa.
  toggle.addEventListener("click", () => setOpen(!isOpen()));

  // Al navegar (enlaces con #hash), cerrar el menú.
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  // Escape cierra y devuelve el foco al botón.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Clic fuera del header cierra el menú.
  document.addEventListener("click", (event) => {
    if (isOpen() && !header.contains(event.target)) setOpen(false);
  });

  // Al pasar a escritorio, dejar el estado limpio.
  desktop.addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

// Si insertas el header con fetch/render, llama a initHeader() justo después.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeader);
} else {
  initHeader();
}