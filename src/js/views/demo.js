function initDemoView() {
  const button = document.getElementById("btn-nuevo-usuario");

  if (!button) {
    console.error("No se encuentra el botón btn-nuevo-usuario");
    return;
  }

  button.addEventListener("click", () => {
    mostrarFormularioUsuario();
  });
}

async function mostrarFormularioUsuario() {
  const form = document.createElement("form");

  form.innerHTML = `
    <div class="form-field">
      <label for="user-name">Nombre</label>
      <input
        id="user-name"
        name="nombre"
        type="text"
        required
        placeholder="Introduce el nombre"
      />
    </div>

    <div class="form-field">
      <label for="user-email">Correo electrónico</label>
      <input
        id="user-email"
        name="email"
        type="email"
        required
        placeholder="nombre@ejemplo.com"
      />
    </div>

    <div class="form-field">
      <label for="user-role">Rol</label>
      <select id="user-role" name="rol" required>
        <option value="">Selecciona un rol</option>
        <option value="admin">Administrador</option>
        <option value="user">Usuario</option>
      </select>
    </div>
  `;

  const result = await window.openDynamicModal({
    title: "Nuevo usuario",
    subtitle: "Completa los datos del usuario.",
    content: form,
    confirmText: "Crear usuario",
    cancelText: "Cancelar",
    size: "medium"
  });

  const output = document.getElementById("modal-demo-result");

  if (!result.confirmed) {
    if (output) output.textContent = "Operación cancelada.";
    return;
  }

  console.log("Datos del formulario:", result.data);

  if (output) {
    output.textContent =
      `Usuario creado: ${result.data.nombre} (${result.data.email}) - ${result.data.rol}`;
  }
}