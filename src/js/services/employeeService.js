(() => {
  "use strict";

  // CONFIGURACIÓN: mientras useBackend sea false, se utiliza el HTML actual.
  // Cuando haya  backend, cambiar useBackend a true y configurar las rutas.
  const DATA_CONFIG = {
    useBackend: false,
    baseUrl: "/api/empleados",
    endpoints: {
      list: "",
      create: "",
      update: (id) => `/${encodeURIComponent(id)}`,
      delete: (id) => `/${encodeURIComponent(id)}`
    },
    headers: {
      "Accept": "application/json"
    }
  };

  const VIEW_SELECTOR = ".employees-page";
  const AVATAR_COLORS = ["blue", "slate", "purple", "amber", "rose", "green"];
  const DEPARTMENTS = ["Tecnología", "Marketing", "RRHH", "Ventas"];

  const CATEGORIES = {
    food: {
      chipLabel: "Comida",
      label: "Comida & Restauración",
      icon: "restaurant",
      color: "blue"
    },
    transport: {
      chipLabel: "Transporte",
      label: "Transporte Sostenible",
      icon: "directions_bus",
      color: "indigo"
    },
    training: {
      chipLabel: "Formación",
      label: "Formación Continua",
      icon: "school",
      color: "emerald"
    },
    health: {
      chipLabel: "Seguro",
      label: "Salud & Bienestar",
      icon: "health_and_safety",
      color: "teal"
    },
    nursery: {
      chipLabel: "Guardería",
      label: "Guardería Infantil",
      icon: "child_care",
      color: "purple"
    }
  };

  const FALLBACK_CATEGORY = {
    chipLabel: "",
    label: "",
    icon: "category",
    color: "blue"
  };

  const PERCENT_FORMAT = new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 1
  });

  let root;
  let tableBody;
  let searchInput;
  let activeDepartment = "all";

  const byId = (id) => document.getElementById(id);
  const rows = () => [...tableBody.querySelectorAll("tr[data-employee-id]")];

  const amount = (row, field) =>
    Number(row.querySelector(`[data-field="${field}"]`)?.dataset.eur || 0);

  function money(value) {
    const number = Number(value) || 0;

    return typeof window.formatMoney === "function"
      ? window.formatMoney(number)
      : new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 2
        }).format(number);
  }

  function setMessage(element, message) {
    if (!element) return;
    element.textContent = message;
    element.hidden = !message;
  }

  function createTextElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    element.textContent = text ?? "";

    return element;
  }

  function getEmployeeName(row) {
    return row.querySelector(".employee-info__name")?.textContent.trim()
      || "Empleado";
  }

  function getEmployeeEmail(row) {
    return row.querySelector(".employee-info__email")?.textContent.trim()
      || "";
  }

  function getDepartment(row) {
    return row.dataset.department
      || row.querySelector(".department-badge")?.textContent.trim()
      || "";
  }

  function getInitials(name) {
    return String(name || "").trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase();
  }

  function getCategory(key) {
    return CATEGORIES[key] || FALLBACK_CATEGORY;
  }

  function getCategoryKey(chip) {
    const modifier = [...chip.classList].find((className) =>
      className.startsWith("benefit-chip--")
    );

    return modifier ? modifier.replace("benefit-chip--", "") : "";
  }

  // -------------------- CONEXIÓN CON EL BACKEND --------------------

  function getApiUrl(endpoint = "") {
    const base = DATA_CONFIG.baseUrl.replace(/\/+$/, "");
    const path = String(endpoint || "").replace(/^\/+/, "");

    return path ? `${base}/${path}` : base;
  }

  async function apiRequest(endpoint, options = {}) {
    const headers = {
      ...DATA_CONFIG.headers,
      ...(options.headers || {})
    };

    const requestOptions = {
      ...options,
      headers
    };

    if (
      requestOptions.body &&
      typeof requestOptions.body !== "string"
    ) {
      requestOptions.body = JSON.stringify(requestOptions.body);
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(getApiUrl(endpoint), requestOptions);

    if (!response.ok) {
      let details = "";

      try {
        const errorData = await response.json();
        details = errorData.message || errorData.error || "";
      } catch (_) {
        try {
          details = await response.text();
        } catch (_) {
          details = "";
        }
      }

      throw new Error(
        details || `Error de API: ${response.status} ${response.statusText}`
      );
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();

    if (!text.trim()) return null;

    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }

  function unwrapEmployeeList(response) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.employees)) return response.employees;
    if (Array.isArray(response?.items)) return response.items;

    throw new Error(
      "La API debe devolver una lista de empleados o un objeto con data, employees o items."
    );
  }

  function unwrapEmployee(response) {
    if (!response) return null;
    if (response.employee) return response.employee;
    if (response.data && !Array.isArray(response.data)) return response.data;
    return response;
  }

  function normalizeEmployee(employee) {
    const source = employee || {};

    const allocationsSource =
      source.allocations ??
      source.benefits ??
      source.beneficios ??
      [];

    const allocations = Array.isArray(allocationsSource)
      ? allocationsSource.map((item) => {
          const rawKey = item.key ?? item.categoryKey ?? item.category ?? item.categoria ?? "";
          const categoryKey = normalizeCategoryKey(rawKey);

          return {
            key: categoryKey,
            label: item.label ?? item.name ?? item.nombre ?? getCategory(categoryKey).label,
            amount: toNumber(
              item.amount ??
              item.allocated ??
              item.assigned ??
              item.asignado ??
              item.budget ??
              0
            ),
            consumed: item.consumed == null && item.gastado == null
              ? null
              : toNumber(item.consumed ?? item.gastado)
          };
        })
      : [];

    return {
      id: source.id ?? source.employeeId ?? source.employee_id,
      name: String(source.name ?? source.nombre ?? ""),
      email: String(source.email ?? source.correo ?? ""),
      department: String(source.department ?? source.departamento ?? ""),
      role: String(source.role ?? source.position ?? source.cargo ?? ""),
      budget: toNumber(
        source.max_budget ??
        source.maxBudget ??
        source.budget ??
        source.presupuesto ??
        0
      ),
      consumed: toNumber(
        source.total_consumed ??
        source.totalConsumed ??
        source.consumed ??
        source.gastado_total ??
        source.gastado ??
        0
      ),
      allocations
    };
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizeCategoryKey(value) {
    const key = String(value ?? "").trim().toLowerCase();

    const aliases = {
      food: "food",
      comida: "food",
      restaurant: "food",
      restauracion: "food",
      "restauración": "food",
      transport: "transport",
      transporte: "transport",
      training: "training",
      formacion: "training",
      "formación": "training",
      health: "health",
      salud: "health",
      seguro: "health",
      nursery: "nursery",
      guarderia: "nursery",
      "guardería": "nursery"
    };

    return aliases[key] || key;
  }

  function employeeToApiPayload(employee) {
    return {
      name: employee.name,
      email: employee.email,
      department: employee.department,
      role: employee.role,
      max_budget: employee.budget,
      allocations: employee.allocations.map((allocation) => ({
        category: allocation.key,
        amount: allocation.amount
      }))
    };
  }

  async function apiListEmployees() {
    const endpoint = DATA_CONFIG.endpoints.list;
    const response = await apiRequest(endpoint, {
      method: "GET"
    });

    return unwrapEmployeeList(response).map(normalizeEmployee);
  }

  async function apiCreateEmployee(employee) {
    const response = await apiRequest(DATA_CONFIG.endpoints.create, {
      method: "POST",
      body: employeeToApiPayload(employee)
    });

    return response ? normalizeEmployee(unwrapEmployee(response)) : null;
  }

  async function apiUpdateEmployee(id, employee) {
    const response = await apiRequest(
      DATA_CONFIG.endpoints.update(id),
      {
        method: "PUT",
        body: employeeToApiPayload(employee)
      }
    );

    return response ? normalizeEmployee(unwrapEmployee(response)) : null;
  }

  async function apiDeleteEmployee(id) {
    return apiRequest(DATA_CONFIG.endpoints.delete(id), {
      method: "DELETE"
    });
  }

  async function loadEmployeesFromBackend() {
    const status = byId("employees-status");

    setMessage(status, "Cargando empleados…");

    try {
      const employees = await apiListEmployees();

      tableBody.replaceChildren();

      employees.forEach((employee) => {
        const row = makeEmployeeRow({
          id: employee.id ?? createTemporaryId(),
          name: employee.name,
          email: employee.email,
          department: employee.department,
          role: employee.role,
          budget: employee.budget
        });

        setRowConsumed(row, employee.consumed);
        setRowAllocations(row, employee.allocations);

        tableBody.append(row);
      });

      updateSummary();
      applyFilters();
      setMessage(status, "");
    } catch (error) {
      console.error("No se pudieron cargar los empleados:", error);
      setMessage(
        status,
        `No se pudieron cargar los empleados desde el servidor. ${error.message}`
      );
    }
  }

  function createTemporaryId() {
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // -------------------- DATOS Y BENEFICIOS --------------------

  function setRowConsumed(row, totalConsumed) {
    const consumedCell = row.querySelector('[data-field="total-consumed"]');
    const budgetCell = row.querySelector('[data-field="max-budget"]');
    const balanceCell = row.querySelector('[data-field="available-balance"]');

    if (consumedCell) consumedCell.dataset.eur = String(toNumber(totalConsumed));

    const budget = toNumber(budgetCell?.dataset.eur);
    const consumed = toNumber(totalConsumed);

    if (balanceCell) {
      balanceCell.dataset.eur = String(Math.max(0, budget - consumed));
    }
  }

  function setRowAllocations(row, allocations = []) {
    const benefitsCell = row.cells[2];
    if (!benefitsCell) return;

    if (!allocations.length) {
      benefitsCell.replaceChildren(
        createTextElement(
          "span",
          "employee-info__email",
          "Sin beneficios asignados"
        )
      );
      return;
    }

    const list = createTextElement("div", "benefit-list", "");

    allocations.forEach((allocation) => {
      const chip = makeBenefitChip({
        key: allocation.key,
        label: allocation.label,
        amount: allocation.amount
      });

      if (allocation.consumed !== null) {
        chip.dataset.consumed = String(allocation.consumed);
      } else {
        delete chip.dataset.consumed;
      }

      list.append(chip);
    });

    benefitsCell.replaceChildren(list);
  }

  function distributeConsumed(allocations, totalConsumed) {
    if (!allocations.length) return;

    if (allocations.every((allocation) => allocation.consumed !== null)) return;

    const totalCents = Math.round(totalConsumed * 100);
    const totalAmount = allocations.reduce(
      (sum, allocation) => sum + allocation.amount,
      0
    );

    let remainingCents = totalCents;

    allocations.forEach((allocation, position) => {
      if (allocation.consumed !== null) {
        remainingCents -= Math.round(allocation.consumed * 100);
        return;
      }

      const remainingAllocations = allocations
        .slice(position)
        .filter((item) => item.consumed === null);

      const isLast = remainingAllocations.length === 1;

      const share = totalAmount > 0
        ? allocation.amount / totalAmount
        : 1 / remainingAllocations.length;

      const cents = isLast
        ? remainingCents
        : Math.round(totalCents * share);

      allocation.consumed = cents / 100;
      remainingCents -= cents;
    });
  }

  function getAllocations(row) {
    const allocations = [...row.querySelectorAll(".benefit-chip")].map(
      (chip, index) => {
        const amountElement = chip.querySelector("[data-eur]");
        const labelClone = chip.cloneNode(true);

        labelClone.querySelectorAll("[data-eur]").forEach((element) => {
          element.remove();
        });

        const label = labelClone.textContent
          .replace(/\s+/g, " ")
          .trim()
          .replace(/[€\s]+$/, "");

        const key = getCategoryKey(chip);

        return {
          index,
          key,
          label: getCategory(key).label || label || `Beneficio ${index + 1}`,
          amount: Number(amountElement?.dataset.eur || 0),
          consumed: chip.dataset.consumed !== undefined
            ? Number(chip.dataset.consumed)
            : null,
          amountElement,
          chip
        };
      }
    );

    distributeConsumed(allocations, amount(row, "total-consumed"));

    return allocations;
  }

  function makeBenefitChip({ key, label, amount }) {
    const chip = createTextElement(
      "span",
      `benefit-chip benefit-chip--${key}`,
      ""
    );

    const amountElement = document.createElement("span");
    amountElement.dataset.eur = String(amount);

    chip.dataset.consumed = "0";
    chip.append(
      document.createTextNode(`${getCategory(key).chipLabel || label} \u00a0`),
      amountElement
    );

    return chip;
  }

  function appendBenefitChip(row, allocation) {
    const benefitsCell = row.cells[2];

    if (!benefitsCell) {
      console.error("No se encontró la celda de beneficios del empleado.");
      return;
    }

    let list = row.querySelector(".benefit-list");

    if (!list) {
      list = createTextElement("div", "benefit-list", "");
      benefitsCell.replaceChildren(list);
    }

    list.append(makeBenefitChip(allocation));
  }

  function applyFilters() {
    const query = searchInput.value.trim().toLocaleLowerCase("es");
    let visible = 0;

    rows().forEach((row) => {
      const department = getDepartment(row);
      const matchesDepartment =
        activeDepartment === "all" || department === activeDepartment;
      const matchesQuery =
        row.textContent.toLocaleLowerCase("es").includes(query);
      const show = matchesDepartment && matchesQuery;

      row.hidden = !show;
      if (show) visible += 1;
    });

    root.querySelectorAll(".filter-button[data-department]").forEach((button) => {
      const active = button.dataset.department === activeDepartment;

      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const count = byId("employees-results-count");
    if (count) {
      count.textContent =
        `${visible} ${visible === 1 ? "empleado" : "empleados"}`;
    }

    const empty = byId("employees-empty-state");
    if (empty) empty.hidden = visible !== 0;

    const paginationInfo = byId("employees-pagination-info");
    if (paginationInfo) {
      paginationInfo.textContent =
        `Mostrando ${visible} de ${rows().length} empleados`;
    }
  }

  function updateSummary() {
    const allRows = rows();

    const totalBudget = allRows.reduce(
      (sum, row) => sum + amount(row, "max-budget"),
      0
    );

    const totalConsumed = allRows.reduce(
      (sum, row) => sum + amount(row, "total-consumed"),
      0
    );

    const activeCount = byId("employees-active-count");
    if (activeCount) activeCount.textContent = String(allRows.length);

    const budget = byId("employees-total-budget");
    if (budget) budget.dataset.eur = String(totalBudget);

    const consumed = byId("employees-total-consumed");
    if (consumed) consumed.dataset.eur = String(totalConsumed);

    if (typeof window.renderMoney === "function") {
      window.renderMoney(root);
    }
  }

  function makeEmployeeRow({ id, name, email, department, role, budget }) {
    const row = document.createElement("tr");

    row.dataset.employeeId = String(id);
    row.dataset.department = department;
    row.dataset.role = role || "";

    const employeeCell = createTextElement("th", "employee-cell", "");
    employeeCell.scope = "row";

    const initials = getInitials(name);

    const numericId = Number(id);
    const colorIndex = Number.isFinite(numericId)
      ? Math.abs(numericId - 1) % AVATAR_COLORS.length
      : 0;

    const color = AVATAR_COLORS[colorIndex];

    const avatar = createTextElement(
      "span",
      `employee-avatar employee-avatar--${color}`,
      initials
    );

    avatar.setAttribute("aria-hidden", "true");

    const info = createTextElement("span", "employee-info", "");

    info.append(
      createTextElement("span", "employee-info__name", name),
      createTextElement("span", "employee-info__email", email)
    );

    employeeCell.append(avatar, info);

    const departmentCell = document.createElement("td");
    departmentCell.append(
      createTextElement("span", "department-badge", department)
    );

    const benefitsCell = document.createElement("td");
    benefitsCell.append(
      createTextElement(
        "span",
        "employee-info__email",
        "Sin beneficios asignados"
      )
    );

    const budgetCell = createTextElement("td", "money-cell", "");
    budgetCell.dataset.field = "max-budget";
    budgetCell.dataset.eur = String(budget);

    const consumedCell = createTextElement("td", "money-cell", "");
    consumedCell.dataset.field = "total-consumed";
    consumedCell.dataset.eur = "0";

    const availableCell = createTextElement(
      "td",
      "money-cell money-cell--available",
      ""
    );

    availableCell.dataset.field = "available-balance";
    availableCell.dataset.eur = String(budget);

    const actionsCell = createTextElement("td", "actions-cell", "");
    const editButton = document.createElement("button");

    editButton.type = "button";
    editButton.className = "button button--secondary button--small";
    editButton.dataset.action = "edit-allocation";
    editButton.dataset.employeeId = String(id);
    editButton.setAttribute("aria-label", `Editar límite de ${name}`);

    const editIcon = createTextElement(
      "span",
      "material-symbols-outlined",
      "edit"
    );

    editIcon.setAttribute("aria-hidden", "true");
    editButton.append(editIcon, document.createTextNode(" Editar límite"));
    actionsCell.append(editButton);

    row.append(
      employeeCell,
      departmentCell,
      benefitsCell,
      budgetCell,
      consumedCell,
      availableCell,
      actionsCell
    );

    return row;
  }

  // -------------------- ALTA DE EMPLEADOS --------------------

  function createEmployeeForm() {
    const form = document.createElement("form");
    form.id = "employee-create-form";

    form.innerHTML = `
      <div class="form-row">
        <div class="form-field">
          <label for="new-employee-name">Nombre completo</label>
          <input id="new-employee-name" name="name" type="text"
            autocomplete="name" required maxlength="120"
            placeholder="Nombre y apellidos">
        </div>

        <div class="form-field">
          <label for="new-employee-email">Correo electrónico</label>
          <input id="new-employee-email" name="email" type="email"
            autocomplete="email" required maxlength="254"
            placeholder="nombre@empresa.com">
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="new-employee-department">Departamento</label>
          <select id="new-employee-department" name="department" required>
            <option value="">Selecciona un departamento</option>
            ${DEPARTMENTS.map((department) =>
              `<option value="${department}">${department}</option>`
            ).join("")}
          </select>
        </div>

        <div class="form-field">
          <label for="new-employee-role">Cargo</label>
          <input id="new-employee-role" name="role" type="text"
            required maxlength="120" placeholder="Cargo del empleado">
        </div>
      </div>

      <div class="form-field">
        <label for="new-employee-budget">Límite global (€)</label>
        <input id="new-employee-budget" name="max_budget" type="number"
          min="0" step="0.01" required placeholder="0,00">
      </div>
      <p class="modal-info">
      Saldo total disponible: <strong data-create-balance data-eur='20000'></strong>
      </p>
      <p class="modal-info">
        El límite global define el presupuesto máximo disponible para este empleado.
      </p>
    `;

    const emailInput = form.elements.email;

    emailInput.addEventListener("input", () => {
      const email = emailInput.value.trim().toLocaleLowerCase("es");

      const duplicate = rows().some((row) =>
        getEmployeeEmail(row).toLocaleLowerCase("es") === email
      );

      emailInput.setCustomValidity(
        email && duplicate
          ? "Ya existe un empleado con ese correo electrónico."
          : ""
      );
    });
    const availableBalance = 20000;
    form.querySelector("[data-create-balance]").textContent=money(availableBalance);

    return form;
  }

  async function showCreateEmployeeModal() {
    const form = createEmployeeForm();

    const result = await window.openDynamicModal({
      title: "Nuevo empleado",
      subtitle: "Completa los datos del empleado y su presupuesto.",
      content: form,
      confirmText: "Crear empleado",
      cancelText: "Cancelar",
      size: "medium",
      icon: "person_add"
    });

    if (!result?.confirmed) return;

    const data = result.data || {};
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const normalizedEmail = email.toLocaleLowerCase("es");
    const department = String(data.department || "");
    const role = String(data.role || "").trim();
    const budget = Number(data.max_budget);

    if (
      !name ||
      !normalizedEmail ||
      !department ||
      !role ||
      !Number.isFinite(budget) ||
      budget < 0
    ) {
      window.alert("Revisa los datos del empleado antes de continuar.");
      return;
    }

    if (rows().some((row) =>
      getEmployeeEmail(row).toLocaleLowerCase("es") === normalizedEmail
    )) {
      window.alert("Ya existe un empleado con ese correo electrónico.");
      return;
    }

    const employeeData = {
      name,
      email,
      department,
      role,
      budget,
      allocations: []
    };

    try {
      let savedEmployee = null;

      if (DATA_CONFIG.useBackend) {
        savedEmployee = await apiCreateEmployee(employeeData);
      }

      const id = savedEmployee?.id ?? (
        Math.max(
          0,
          ...rows().map((row) => Number(row.dataset.employeeId) || 0)
        ) + 1
      );

      const row = makeEmployeeRow({
        id,
        name: savedEmployee?.name || name,
        email: savedEmployee?.email || email,
        department: savedEmployee?.department || department,
        role: savedEmployee?.role || role,
        budget: savedEmployee?.budget ?? budget
      });

      if (savedEmployee) {
        setRowConsumed(row, savedEmployee.consumed);
        setRowAllocations(row, savedEmployee.allocations);
      }

      tableBody.append(row);

      searchInput.value = "";
      activeDepartment = "all";

      updateSummary();
      applyFilters();
    } catch (error) {
      console.error("No se pudo crear el empleado:", error);
      window.alert(`No se pudo crear el empleado. ${error.message}`);
    }
  }

  // -------------------- EDICIÓN DE EMPLEADOS --------------------

  function createEmployeeHeader(row) {
    const name = getEmployeeName(row);
    const email = getEmployeeEmail(row);
    const department = getDepartment(row);
    const role = row.dataset.role || "";

    const header = document.createElement("div");
    header.className = "employee-detail-form__employee";

    header.innerHTML = `
      <span class="employee-detail-form__avatar" aria-hidden="true"></span>

      <div class="employee-detail-form__identity">
        <div class="employee-detail-form__title-line">
          <h3 class="employee-detail-form__name"></h3>

          <span class="employee-detail-form__status">
            <span aria-hidden="true"></span> Activo en nómina
          </span>
        </div>

        <p class="employee-detail-form__meta"></p>
      </div>
    `;

    header.querySelector(".employee-detail-form__avatar").textContent =
      getInitials(name);

    header.querySelector(".employee-detail-form__name").textContent = name;

    header.querySelector(".employee-detail-form__meta").textContent =
      [role, department, email].filter(Boolean).join(" • ");

    return header;
  }

  function createDeleteButton() {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "btn-danger-ghost";
    button.dataset.action = "delete-employee";

    button.innerHTML = `
      <span class="material-symbols-outlined" aria-hidden="true">delete</span>
      <span>Eliminar Empleado</span>
    `;

    return button;
  }

  function createAllocationCard(allocation) {
    const category = getCategory(allocation.key);

    const card = document.createElement("article");
    card.className =
      "employee-detail-form__allocation-card " +
      `employee-detail-form__allocation-card--${category.color}`;

    card.innerHTML = `
      <div class="employee-detail-form__allocation-top">
        <span class="employee-detail-form__allocation-title">
          <span class="material-symbols-outlined" aria-hidden="true"></span>
          <strong></strong>
        </span>

        <span class="employee-detail-form__allocation-percent"
          data-card="percent"></span>
      </div>

      <div class="employee-detail-form__allocation-values">
        <div class="employee-detail-form__allocation-value">
          <span>Asignado:</span>
          <input class="employee-detail-form__allocation-input"
            type="number" min="0" step="0.01" required>
        </div>

        <div class="employee-detail-form__allocation-value">
          <span>Gastado:</span>
          <strong data-card="consumed"></strong>
        </div>

        <div class="employee-detail-form__allocation-value
          employee-detail-form__allocation-value--available">
          <span>Disponible:</span>
          <strong data-card="available"></strong>
        </div>
      </div>

      <div class="employee-detail-form__progress" aria-hidden="true">
        <div class="employee-detail-form__progress-bar"
          data-card="bar"></div>
      </div>
    `;

    card.querySelector(".material-symbols-outlined").textContent =
      category.icon;

    card.querySelector("strong").textContent = allocation.label;

    card.querySelector('[data-card="consumed"]').textContent =
      money(allocation.consumed);

    const input = card.querySelector("input");

    input.name = `allocation_${allocation.index}`;
    input.id = `edit-allocation-${allocation.index}`;
    input.value = String(allocation.amount);
    input.dataset.allocationIndex = String(allocation.index);
    input.setAttribute("aria-label", `Asignación de ${allocation.label}`);

    allocation.card = card;
    allocation.input = input;

    return card;
  }

  function updateAllocationCard(allocation) {
    const amountValue = Number(allocation.input.value);
    const validAmount =
      allocation.input.value.trim() !== "" && Number.isFinite(amountValue);

    const available = validAmount
      ? Math.max(0, amountValue - allocation.consumed)
      : 0;

    const percentage = validAmount && amountValue > 0
      ? Math.round((allocation.consumed / amountValue) * 100)
      : 0;

    allocation.card.querySelector('[data-card="percent"]').textContent =
      `${percentage}% consumido`;

    allocation.card.querySelector('[data-card="available"]').textContent =
      money(available);

    allocation.card.querySelector('[data-card="bar"]').style.width =
      `${Math.min(100, percentage)}%`;
  }

  function createEditEmployeeForm(row) {
    const name = getEmployeeName(row);
    const budget = amount(row, "max-budget");
    const consumed = amount(row, "total-consumed");
    const allocations = getAllocations(row);

    let nextIndex = allocations.length;

    const form = document.createElement("form");
    form.id = "employee-edit-form";
    form.className = "employee-detail-form";

    form.innerHTML = `
      <section class="employee-detail-form__metrics"
        aria-label="Resumen presupuestario">

        <article class="employee-detail-form__metric">
          <span>Asignado Total</span>
          <strong data-summary="allocated">0 €</strong>
          <small data-summary="allocated-count"></small>
        </article>

        <article class="employee-detail-form__metric">
          <span>Gastado Total</span>
          <strong class="employee-detail-form__metric--blue"
            data-summary="consumed">0 €</strong>
          <small class="employee-detail-form__metric--blue"
            data-summary="consumed-percent"></small>
        </article>

        <article class="employee-detail-form__metric
          employee-detail-form__metric--green">
          <span>Saldo Disponible Restante</span>
          <strong data-summary="available">0 €</strong>
          <small>Según el límite global</small>
        </article>
      </section>

      <p class="employee-detail-form__rule">
        <span class="material-symbols-outlined" aria-hidden="true">info</span>
        <span>
          <strong>Regla de Negocio:</strong>
          Un empleado puede tener varios beneficios, pero máximo uno por cada
          categoría. Puedes ajustar el importe asignado a continuación.
        </span>
      </p>

      <section class="employee-detail-form__allocations"
        aria-labelledby="employee-allocations-title">

        <div class="employee-detail-form__section-heading">
          <h4 id="employee-allocations-title"></h4>
          <span data-summary="category-count"></span>
        </div>

        <div class="employee-detail-form__allocation-grid"
          data-allocation-list></div>

        <p class="employee-detail-form__no-benefits" data-no-benefits hidden>
          Este empleado todavía no tiene beneficios asignados.
        </p>
      </section>

      <section class="employee-detail-form__panel"
        aria-label="Asignar nueva categoría">

        <div class="employee-detail-form__panel-text">
          <strong data-assign="title"></strong>
          <span data-assign="help"></span>
        </div>

        <div class="employee-detail-form__panel-controls">
          <select class="employee-detail-form__control"
            data-assign="category" aria-label="Categoría a asignar"></select>

          <input class="employee-detail-form__control
            employee-detail-form__control--amount"
            type="number" min="0" step="0.01" placeholder="Importe (€)"
            data-assign="amount" aria-label="Importe a asignar">

          <button type="button" class="employee-detail-form__assign-button"
            data-action="assign-category">Asignar</button>
        </div>
      </section>

      <section class="employee-detail-form__panel">
        <div class="employee-detail-form__panel-text">
          <label for="edit-max-budget">Límite Global del Empleado (€)</label>
          <span data-budget-help></span>
        </div>
        <p class="modal-info">
         Saldo total disponible:
        <strong data-total-balance data-eur='20000'></strong>
          </p>
        <div class="employee-detail-form__panel-controls">
          <input id="edit-max-budget" name="max_budget"
            class="employee-detail-form__control
            employee-detail-form__control--limit"
            type="number" min="0" step="0.01" required>
        </div>
      </section>
    `;

    form.querySelector("#employee-allocations-title").textContent =
      `Beneficios Asignados a ${name.split(/\s+/)[0]} (por Categoría)`;

    form.querySelector('[data-assign="title"]').textContent =
      `+ Asignar Nueva Categoría a ${name.split(/\s+/)[0]}`;

    const budgetInput = form.elements.max_budget;
    budgetInput.value = String(budget);
    budgetInput.min = String(consumed);

    const allocationList = form.querySelector("[data-allocation-list]");
    const categorySelect = form.querySelector('[data-assign="category"]');
    const amountInput = form.querySelector('[data-assign="amount"]');
    const assignButton = form.querySelector('[data-action="assign-category"]');
    const assignHelp = form.querySelector('[data-assign="help"]');

    allocations.forEach((allocation) => {
      allocationList.append(createAllocationCard(allocation));
    });

    function setAssignHelp(message, invalid = false) {
      assignHelp.textContent = message;
      assignHelp.classList.toggle("is-invalid", invalid);
    }

    function refreshAssignPanel() {
      const assignedKeys = new Set(allocations.map((item) => item.key));

      const available = Object.entries(CATEGORIES)
        .filter(([key]) => !assignedKeys.has(key));

      const others = Object.keys(CATEGORIES).length - available.length;

      categorySelect.replaceChildren(...available.map(([key, category]) => {
        const option = document.createElement("option");

        option.value = key;
        option.textContent = category.label;

        return option;
      }));

      const hasAvailable = available.length > 0;

      categorySelect.disabled = !hasAvailable;
      amountInput.disabled = !hasAvailable;
      assignButton.disabled = !hasAvailable;

      if (!hasAvailable) {
        setAssignHelp("Todas las categorías ya están asignadas.");
        return;
      }

      const names = available.map(([, category]) => category.label).join(", ");
      const label = available.length === 1 ? "Disponible" : "Disponibles";

      let suffix = "";

      if (others === 1) suffix = " (la otra ya está asignada)";
      else if (others > 1) suffix = ` (las otras ${others} ya están asignadas)`;

      setAssignHelp(`${label}: ${names}${suffix}`);
    }

    function assignCategory() {
      const key = categorySelect.value;
      const newAmount = Number(amountInput.value);

      if (
        !CATEGORIES[key] ||
        amountInput.value.trim() === "" ||
        !Number.isFinite(newAmount) ||
        newAmount < 0
      ) {
        setAssignHelp(
          "Selecciona una categoría e introduce un importe válido.",
          true
        );
        amountInput.focus();
        return;
      }

      const allocation = {
        index: nextIndex,
        key,
        label: CATEGORIES[key].label,
        amount: newAmount,
        consumed: 0,
        isNew: true
      };

      nextIndex += 1;
      allocations.push(allocation);
      allocationList.append(createAllocationCard(allocation));

      amountInput.value = "";

      refreshAssignPanel();
      updatePreview();
    }

    function updatePreview() {
      const newBudget = Number(budgetInput.value);

      const values = allocations.map((allocation) =>
        allocation.input.value.trim() === ""
          ? NaN
          : Number(allocation.input.value)
      );

      const validValues = values.every(
        (value) => Number.isFinite(value) && value >= 0
      );

      const assigned = validValues
        ? values.reduce((sum, value) => sum + value, 0)
        : 0;

      const validBudget =
        budgetInput.value.trim() !== "" &&
        Number.isFinite(newBudget) &&
        newBudget >= consumed;

      const exceedsBudget = assigned > newBudget;

      allocations.forEach(updateAllocationCard);

      form.querySelector('[data-summary="allocated"]').textContent =
        money(assigned);

      form.querySelector('[data-summary="allocated-count"]').textContent =
        `Suma de ${allocations.length} ` +
        `${allocations.length === 1 ? "categoría activa" : "categorías activas"}`;

      form.querySelector('[data-summary="consumed"]').textContent =
        money(consumed);

      const executed = assigned > 0 ? (consumed / assigned) * 100 : 0;

      form.querySelector('[data-summary="consumed-percent"]').textContent =
        `${PERCENT_FORMAT.format(executed)}% ejecutado`;

      form.querySelector('[data-summary="available"]').textContent =
        money(Math.max(0, newBudget - consumed));

      form.querySelector('[data-summary="category-count"]').textContent =
        `${allocations.length} ${
          allocations.length === 1 ? "categoría asignada" : "categorías asignadas"
        }`;

      form.querySelector("[data-no-benefits]").hidden = allocations.length > 0;

      const help = form.querySelector("[data-budget-help]");
      let error = "";

      if (!validBudget) {
        error =
          `El límite no puede ser inferior al consumo actual (${money(consumed)}).`;
      } else if (!validValues) {
        error = "Todos los importes deben ser números válidos y no negativos.";
      } else if (exceedsBudget) {
        error =
          `Las asignaciones (${money(assigned)}) superan el límite global ` +
          `(${money(newBudget)}).`;
      }

      budgetInput.setCustomValidity(error);
      help.textContent = error ||
        `Consumo actual: ${money(consumed)}. Asignaciones: ${money(assigned)}.`;

      help.classList.toggle("is-invalid", Boolean(error));

      form.querySelector('[data-summary="allocated"]').classList.toggle(
        "is-invalid",
        !validValues || exceedsBudget
      );
    }

    assignButton.addEventListener("click", assignCategory);

    amountInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      event.stopPropagation();
      assignCategory();
    });

    form.addEventListener("input", updatePreview);
    const availableBalance = 20000;
    form.querySelector("[data-total-balance]").textContent =
    money(availableBalance);
    
    refreshAssignPanel();
    updatePreview();
    
    return {
      form,
      header: createEmployeeHeader(row),
      deleteButton: createDeleteButton(),
      allocations,
      consumed
    };
  }

  async function showEditEmployeeModal(row) {
    const employeeId = row.dataset.employeeId;
    const name = getEmployeeName(row);

    const {
      form,
      header,
      deleteButton,
      allocations,
      consumed
    } = createEditEmployeeForm(row);

    deleteButton.addEventListener("click", () => {
      if (!window.confirm(
        `¿Quieres eliminar a ${name}? Esta acción quitará al empleado del directorio.`
      )) {
        return;
      }

      window.closeDynamicModal({
        confirmed: true,
        data: { action: "delete" }
      });
    });

    const result = await window.openDynamicModal({
      title: `Modificar empleado: ${name}`,
      content: form,
      headerContent: header,
      footerStart: deleteButton,
      confirmText: "Guardar Cambios",
      confirmIcon: "save",
      cancelText: "Cerrar",
      size: "large",
      variant: "detail"
    });

    if (!result?.confirmed) return;

    if (result.data?.action === "delete") {
      try {
        if (DATA_CONFIG.useBackend) {
          await apiDeleteEmployee(employeeId);
        }

        row.remove();
        updateSummary();
        applyFilters();
      } catch (error) {
        console.error("No se pudo eliminar el empleado:", error);
        window.alert(`No se pudo eliminar el empleado. ${error.message}`);
      }

      return;
    }

    const newBudget = Number(result.data?.max_budget);

    const allocationValues = allocations.map((allocation) => ({
      ...allocation,
      newAmount: Number(result.data?.[`allocation_${allocation.index}`])
    }));

    const totalAllocated = allocationValues.reduce(
      (sum, allocation) => sum + allocation.newAmount,
      0
    );

    const invalidAllocations = allocationValues.some((allocation) =>
      !Number.isFinite(allocation.newAmount) || allocation.newAmount < 0
    );

    if (
      !Number.isFinite(newBudget) ||
      newBudget < consumed ||
      newBudget < 0 ||
      invalidAllocations ||
      totalAllocated > newBudget
    ) {
      window.alert(
        "No se han podido guardar los cambios. Revisa el límite global y las asignaciones."
      );
      return;
    }

    const employeeData = {
      name: getEmployeeName(row),
      email: getEmployeeEmail(row),
      department: getDepartment(row),
      role: row.dataset.role || "",
      budget: newBudget,
      allocations: allocationValues.map((allocation) => ({
        key: allocation.key,
        label: allocation.label,
        amount: allocation.newAmount,
        consumed: allocation.consumed
      }))
    };

    try {
      let savedEmployee = null;

      if (DATA_CONFIG.useBackend) {
        savedEmployee = await apiUpdateEmployee(employeeId, employeeData);
      }

      const finalEmployee = savedEmployee || {
        id: employeeId,
        ...employeeData,
        consumed
      };

      const budgetCell = row.querySelector('[data-field="max-budget"]');
      const balanceCell = row.querySelector('[data-field="available-balance"]');

      if (!budgetCell || !balanceCell) {
        console.error("No se encontraron las celdas presupuestarias del empleado.");
        return;
      }

      budgetCell.dataset.eur = String(finalEmployee.budget);
      setRowConsumed(row, finalEmployee.consumed ?? consumed);
      row.dataset.department = finalEmployee.department;
      row.dataset.role = finalEmployee.role;

      if (savedEmployee) {
        setRowAllocations(row, savedEmployee.allocations);
      } else {
        allocationValues.forEach((allocation) => {
          if (allocation.isNew) {
            appendBenefitChip(row, {
              key: allocation.key,
              label: allocation.label,
              amount: allocation.newAmount
            });
            return;
          }

          if (allocation.amountElement) {
            allocation.amountElement.dataset.eur = String(allocation.newAmount);
          }
        });
      }

      updateSummary();
      applyFilters();

      if (typeof window.renderMoney === "function") {
        window.renderMoney(row.closest(VIEW_SELECTOR) || root);
      }
    } catch (error) {
      console.error("No se pudieron guardar los cambios:", error);
      window.alert(`No se pudieron guardar los cambios. ${error.message}`);
    }
  }

  // -------------------- EVENTOS E INICIALIZACIÓN --------------------

  function bindViewEvents() {
    searchInput.addEventListener("input", applyFilters);

    root.querySelectorAll(".filter-button[data-department]").forEach((button) => {
      button.addEventListener("click", () => {
        activeDepartment = button.dataset.department;
        applyFilters();
      });
    });

    root.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const createButton = target.closest('[data-action="create-employee"]');

      if (createButton) {
        void showCreateEmployeeModal().catch((error) => {
          console.error("No se pudo abrir el formulario de alta:", error);
          window.alert("No se ha podido abrir el formulario de alta.");
        });
        return;
      }

      const editButton = target.closest('[data-action="edit-allocation"]');

      if (!editButton) return;

      const row = rows().find(
        (item) => item.dataset.employeeId === editButton.dataset.employeeId
      );

      if (row) {
        void showEditEmployeeModal(row).catch((error) => {
          console.error("No se pudo abrir el modal del empleado:", error);
          window.alert("No se ha podido abrir el detalle del empleado.");
        });
      }
    });
  }

  function initEmpleadosView() {
    root = document.querySelector(VIEW_SELECTOR);

    if (!root || root.dataset.initialized === "true") return;

    tableBody = byId("employees-table-body");
    searchInput = byId("employee-search");

    if (!tableBody || !searchInput) return;

    if (typeof window.openDynamicModal !== "function") {
      console.error(
        "No está disponible openDynamicModal(). Comprueba que el componente global modal se carga antes de la vista."
      );

      setMessage(
        byId("employees-status"),
        "No se pudo inicializar el sistema de modales compartido."
      );
      return;
    }

    root.dataset.initialized = "true";

    rows().forEach((row) => {
      if (!row.dataset.department) {
        row.dataset.department =
          row.querySelector(".department-badge")?.textContent.trim() || "";
      }
    });

    bindViewEvents();
    updateSummary();
    applyFilters();

    if (DATA_CONFIG.useBackend) {
      void loadEmployeesFromBackend();
    } else {
      setMessage(byId("employees-status"), "");
    }
  }

  window.initEmpleadosView = initEmpleadosView;
})();