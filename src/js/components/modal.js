let modalResolve = null;
let modalContentElement = null;

function initModal() {
  const modal = document.getElementById("app-modal");

  if (!modal || modal.dataset.initialized === "true") return;

  modal.dataset.initialized = "true";

  modalContentElement = modal.querySelector("#modal-content");

  // Cancelar (botón "Cancelar" y la X del header).
  modal.querySelectorAll('[data-action="cancel"]').forEach((button) => {
    button.addEventListener("click", () => closeDynamicModal());
  });

  // Confirmar.
  modal.querySelector('[data-action="confirm"]').addEventListener("click", () => {
    const form = modalContentElement.querySelector("form");

    // Si hay formulario, comprobar sus campos obligatorios.
    if (form && !form.reportValidity()) return;

    const data = form
      ? Object.fromEntries(new FormData(form).entries())
      : null;

    closeDynamicModal({
      confirmed: true,
      data
    });
  });

  // Cerrar con Escape.
  modal.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDynamicModal();
  });

  // Cerrar al pulsar en el fondo.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeDynamicModal();
  });
}

function openDynamicModal({
  title = "Formulario",
  subtitle = "",
  content,
  confirmText = "Guardar",
  cancelText = "Cancelar",
  showCancel = true,
  size = "medium",
  icon = ""
} = {}) {
  const modal = document.getElementById("app-modal");

  if (!modal || !modalContentElement) {
    throw new Error(
      "El modal no está inicializado. Comprueba que modal.html y modal.js se hayan cargado."
    );
  }

  if (modal.open) {
    throw new Error("El modal ya está abierto.");
  }

  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-subtitle").textContent = subtitle;
  document.getElementById("modal-subtitle").hidden = !subtitle;

  // Icono opcional (nombre de Material Symbols, ej. "person_add").
  const iconBox = document.getElementById("modal-icon");
  iconBox.hidden = !icon;
  iconBox.querySelector(".material-symbols-outlined").textContent = icon;

  modal.querySelector('[data-action="confirm"]').textContent = confirmText;

  modal.querySelectorAll('[data-action="cancel"]').forEach((button) => {
    // No machacar la ✕ del header con el texto de cancelar.
    if (!button.classList.contains("modal-close")) {
      button.textContent = cancelText;
      button.hidden = !showCancel;
    }
  });

  modal.classList.remove("modal-small", "modal-large");
  if (size === "small") modal.classList.add("modal-small");
  if (size === "large") modal.classList.add("modal-large");

  modalContentElement.replaceChildren();

  if (content instanceof Node) {
    modalContentElement.append(content);
  } else if (content != null) {
    throw new TypeError("content debe ser un elemento HTML (Node).");
  }

  // Enter dentro del formulario = confirmar.
  const form = modalContentElement.querySelector("form");

  if (form) {
    const hiddenSubmit = document.createElement("button");
    hiddenSubmit.type = "submit";
    hiddenSubmit.hidden = true;
    form.append(hiddenSubmit);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      modal.querySelector('[data-action="confirm"]').click();
    });
  }

  modal.showModal();

  const firstInput = modalContentElement.querySelector(
    "input, select, textarea, button"
  );

  if (firstInput) firstInput.focus();
  else modal.querySelector('[data-action="confirm"]').focus();

  return new Promise((resolve) => {
    modalResolve = resolve;
  });
}

function closeDynamicModal(result = { confirmed: false, data: null }) {
  const modal = document.getElementById("app-modal");

  if (modal?.open) modal.close();

  if (modalResolve) {
    const resolve = modalResolve;
    modalResolve = null;
    resolve(result);
  }
}

window.openDynamicModal = openDynamicModal;
window.closeDynamicModal = closeDynamicModal;

// Si cargas modal.html con fetch, llama a initModal() después de insertarlo.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initModal);
} else {
  initModal();
}