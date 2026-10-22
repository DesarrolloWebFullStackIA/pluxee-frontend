(() => {
  "use strict";
  const API_BASE = "http://127.0.0.1:8000/api/v1";
  const DATA_CONFIG = { 
    useBackend: true, 
    baseUrl: `${API_BASE}/employees`, 
    categoriesUrl: `${API_BASE}/categories`, 
    companyBudgetUrl: `${API_BASE}/company/budget`, 
    benefitsUrl: `${API_BASE}/benefits`, 
    headers: { Accept: "application/json" } 
  };
  const VIEW_SELECTOR = ".employees-page";
  const AVATAR_COLORS = ["blue", "slate", "purple", "amber", "rose", "green"];
  const DEPARTMENTS = ["Tecnología", "Marketing", "RRHH", "Ventas"];
  const CATEGORY_STYLES = {food: { chipLabel: "Comida", icon: "restaurant", color: "blue" },transport: { chipLabel: "Transporte", icon: "directions_bus", color: "indigo" },training: { chipLabel: "Formación", icon: "school", color: "emerald" },health: { chipLabel: "Seguro", icon: "health_and_safety", color: "teal" },nursery: { chipLabel: "Guardería", icon: "child_care", color: "purple" },gimnasio: { chipLabel: "Gimnasio", icon: "fitness_center" },gym: { chipLabel: "Gimnasio", icon: "fitness_center" }};
  const CATEGORIES = Object.create(null);
  const FALLBACK_CATEGORY = { id: null, name: "", chipLabel: "", label: "", icon: "category", color: "blue", description: "" };
  const PERCENT_FORMAT = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
  let root, tableBody, searchInput, activeDepartment = "all", globalBudget = 20000;
  const EMPLOYEES_PER_PAGE = 10;
  let employeesCurrentPage = 1;

  function getPageRange(currentPage, totalPages, maxButtons = 5) {
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let end = start + maxButtons - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxButtons + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  function renderEmployeesPagination(totalPages) {
    const prevBtn = root.querySelector('[data-page-action="previous"]');
    const nextBtn = root.querySelector('[data-page-action="next"]');
    const pagesContainer = byId("employees-pagination-pages");

    if (prevBtn) prevBtn.disabled = employeesCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = employeesCurrentPage >= totalPages;

    if (pagesContainer) {
      pagesContainer.innerHTML = "";
      const pageNumbers = getPageRange(employeesCurrentPage, totalPages, 5);
      pageNumbers.forEach(p => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pagination-button" + (p === employeesCurrentPage ? " is-current" : "");
        btn.textContent = String(p);
        if (p === employeesCurrentPage) btn.setAttribute("aria-current", "page");
        btn.addEventListener("click", () => {
          employeesCurrentPage = p;
          applyFilters();
        });
        pagesContainer.append(btn);
      });
    }
  }

  const byId = id => document.getElementById(id);
  const rows = () => tableBody ? [...tableBody.querySelectorAll("tr[data-employee-id]")] : [];
  const amount = (row, field) => Number(row.querySelector(`[data-field="${field}"]`)?.dataset.eur || 0);
  const getEmployeeName = row => row.querySelector(".employee-info__name")?.textContent.trim() || "Empleado";
  const getEmployeeEmail = row => row.querySelector(".employee-info__email")?.textContent.trim() || "";
  const getDepartment = row => row.dataset.department || row.querySelector(".department-badge")?.textContent.trim() || "";
  const createTemporaryId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const getCategoryId = key => getCategory(key).id ?? null;
  const getCompanyRemainingBudget = (excludeRow = null) => Math.max(0,globalBudget - getTotalEmployeeBudgets(excludeRow));
  const benefitsUrl = id => `${employeeUrl(id)}/benefits`;
  const budgetUrl = id => `${employeeUrl(id)}/budget`;
  const benefitUrl = id => `${DATA_CONFIG.benefitsUrl.replace(/\/+$/, "")}/${encodeURIComponent(id)}`;
  const apiDeleteEmployee = id => requestUrl(employeeUrl(id), { method: "DELETE" });
  const apiUpdateBenefit = (id, allocation) => requestUrl(benefitUrl(id), { method: "PUT", body: { allocated_amount: Number(allocation.newAmount ?? allocation.amount) } });

  function money(value) {
    const number = Number(value) || 0;
    return typeof window.formatMoney === "function" ? window.formatMoney(number) : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(number);
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function setMessage(element, message) {
    if (!element) return;
    element.textContent = message || "";
    element.hidden = !message;
  }

  function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text ?? "";
    return element;
  }

  function getInitials(name) {
    return String(name || "").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  }

  function normalizeText(value) {
    return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  }

  const slugify = value => normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "categoria";

  function normalizeCategoryKey(value) {
    const name = typeof value === "object" && value !== null ? value.name ?? value.label ?? value.category_name ?? value.categoryName ?? "" : value;
    const normalized = normalizeText(name), slug = slugify(name);
    const aliases = {
      food: "food", comida: "food", restaurante: "food", restauracion: "food", "comida-restauracion": "food", "comida-restaurante": "food",
      transport: "transport", transporte: "transport", "transporte-sostenible": "transport",
      training: "training", formacion: "training", "formacion-continua": "training",
      health: "health", salud: "health", seguro: "health", bienestar: "health", "salud-bienestar": "health",
      nursery: "nursery", guarderia: "nursery", "guarderia-infantil": "nursery"
    };
    return aliases[slug] || aliases[normalized] || slug;
  }

  function getCategory(key) {
    if (key && typeof key === "object") key = key.category_key ?? key.categoryKey ?? key.name ?? key.label ?? key.category_name ?? key.category;
    return CATEGORIES[normalizeCategoryKey(key)] || FALLBACK_CATEGORY;
  }

  function getCategoryKey(chip) {
    if (!chip?.classList) return "";
    const modifier = [...chip.classList].find(name => name.startsWith("benefit-chip--"));
    return modifier ? modifier.replace("benefit-chip--", "") : "";
  }

  function findCategoryKeyById(categoryId) {
    if (categoryId == null) return null;
    return Object.entries(CATEGORIES).find(([, category]) => category.id != null && String(category.id) === String(categoryId))?.[0] || null;
  }

  function findCategoryKeyByName(name) {
    if (!name) return null;
    const normalizedName = normalizeText(name);
    return Object.entries(CATEGORIES).find(([, category]) => [category.label, category.name, category.chipLabel].some(value => normalizeText(value) === normalizedName))?.[0] || null;
  }

  const resolveCategoryKey = (id, name, fallback) => findCategoryKeyById(id) || findCategoryKeyByName(name) || normalizeCategoryKey(fallback || name);

  function getTotalEmployeeBudgets(excludeRow = null) {
    return rows().reduce((sum, row) => sum + (row === excludeRow ? 0 : amount(row, "max-budget")), 0);
  }

  function getFormAllocatedTotal(form) {
    if (!form) return 0;
    return [...form.querySelectorAll(".employee-detail-form__allocation-input")].reduce((sum, input) => {
      const value = input.value.trim() === "" ? 0 : Number(input.value);
      return sum + (Number.isFinite(value) && value >= 0 ? value : 0);
    }, 0);
  }

  function findModalContainer(form) {
    let current = form, candidate = null;
    while (current && current !== document.body) {
      const className = typeof current.className === "string" ? current.className : "";
      if (current.getAttribute?.("role") === "dialog" || /modal|dialog/i.test(className)) candidate = current;
      current = current.parentElement;
    }
    return candidate;
  }

  function syncModalConfirmButton(form, confirmText) {
    if (!form?.isConnected) return;
    const invalid = form.dataset.budgetInvalid === "true", container = findModalContainer(form), buttons = container ? [...container.querySelectorAll("button")] : [], normalizedText = normalizeText(confirmText);
    let button = buttons.find(item => normalizeText(item.textContent) === normalizedText);
    if (!button) button = buttons.find(item => item.matches('[data-modal-confirm], [data-action="confirm"], [data-confirm]'));
    if (!button && container) button = buttons.find(item => item.type === "submit" && !item.closest("#employee-create-form, #employee-edit-form"));
    if (!button) button = [...document.querySelectorAll("button")].find(item => normalizeText(item.textContent) === normalizedText);
    if (button) {
      button.disabled = invalid;
      button.setAttribute("aria-disabled", String(invalid));
      button.classList.toggle("is-disabled", invalid);
      button.title = invalid ? "Corrige el presupuesto antes de guardar." : "";
    }
  }

  function watchModalValidation(form, confirmText) {
    const sync = () => syncModalConfirmButton(form, confirmText), observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    sync();
    return () => {
      observer.disconnect();
      form.removeEventListener("input", sync);
      form.removeEventListener("change", sync);
    };
  }

  function setBudgetError(form, message) {
    const error = form.querySelector("[data-budget-error]");
    form.dataset.budgetInvalid = message ? "true" : "false";
    if (error) { error.textContent = message || ""; error.hidden = !message; }
    form.querySelector("[data-budget-help]")?.classList.toggle("is-invalid", Boolean(message));
    syncModalConfirmButton(form, "Guardar Cambios");
  }

  async function requestUrl(url, options = {}) {
    const headers = { ...DATA_CONFIG.headers, ...(options.headers || {}) }, requestOptions = { ...options, headers };
    if (requestOptions.body && typeof requestOptions.body !== "string") {
      requestOptions.body = JSON.stringify(requestOptions.body);
      headers["Content-Type"] = "application/json";
    }
    let response;
    try { response = await fetch(url, requestOptions); }
    catch (_) { throw new Error(`No se ha podido conectar con el backend (${API_BASE}). Comprueba que FastAPI está arrancado y que CORS permite el origen del frontend.`); }
    if (!response.ok) {
      let details = "";
      try {
        const data = await response.json(), detail = data.detail;
        details = Array.isArray(detail) ? detail.map(item => item.msg || JSON.stringify(item)).join("; ") : typeof detail === "string" ? detail : data.message || data.error || "";
      } catch (_) {}
      throw new Error(details || `Error de API: ${response.status} ${response.statusText}`);
    }
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    const text = await response.text();
    if (!text.trim()) return null;
    try { return JSON.parse(text); } catch (_) { return text; }
  }

  function employeeUrl(id = "") {
    const base = DATA_CONFIG.baseUrl.replace(/\/+$/, "");
    return id === "" ? `${base}/` : `${base}/${encodeURIComponent(id)}`;
  }

  function unwrapList(response, keys = []) {
    if (Array.isArray(response)) return response;
    for (const key of keys) {
      if (Array.isArray(response?.[key])) return response[key];
      if (Array.isArray(response?.data?.[key])) return response.data[key];
    }
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.items)) return response.items;
    throw new Error("La API no ha devuelto una lista con el formato esperado.");
  }

  function unwrapEmployee(response) {
    if (!response) return null;
    if (response.employee) return response.employee;
    if (response.data && !Array.isArray(response.data) && typeof response.data === "object") return response.data;
    return response;
  }

  async function loadCategories() {
    const categories = unwrapList(await requestUrl(DATA_CONFIG.categoriesUrl), ["categories"]);
    Object.keys(CATEGORIES).forEach(key => delete CATEGORIES[key]);
    categories.forEach(item => {
      const name = String(item.name ?? item.label ?? item.category_name ?? item.categoryName ?? "").trim();
      if (!name || item.id == null) { console.warn("Categoría ignorada por falta de nombre o ID:", item); return; }
      const key = normalizeCategoryKey(name), style = CATEGORY_STYLES[key] || {};
      CATEGORIES[key] = { id: item.id, name, label: name, chipLabel: style.chipLabel || name, icon: style.icon || item.icon || "category", color: style.color || item.color || "blue", description: item.description || "" };
    });
    if (!Object.keys(CATEGORIES).length) throw new Error("El backend no ha devuelto ninguna categoría válida.");
    return categories;
  }

  async function loadGlobalBudget() {
    try {
      const response = await requestUrl(DATA_CONFIG.companyBudgetUrl), value = response?.global_budget ?? response?.globalBudget ?? response?.budget;
      if (value != null && Number.isFinite(Number(value))) globalBudget = Number(value);
    } catch (error) { console.warn("No se pudo consultar el presupuesto global:", error.message); }
  }

  function normalizeBenefit(item) {
    const source = item || {}, categoryId = source.category_id ?? source.categoryId ?? source.category?.id ?? null, categoryName = source.category_name ?? source.categoryName ?? source.category?.name ?? "";
    const key = resolveCategoryKey(categoryId, categoryName, source.category_key ?? source.categoryKey ?? categoryName), category = getCategory(key);
    return {
      id: source.id ?? source.benefit_id ?? source.benefitId ?? null,
      employeeId: source.employee_id ?? source.employeeId ?? null,
      categoryId: categoryId ?? category.id, key, label: category.label || categoryName || "Beneficio",
      amount: toNumber(source.allocated_amount ?? source.amount ?? source.allocated ?? source.assigned ?? source.budget ?? 0),
      consumed: toNumber(source.spent_amount ?? source.consumed_amount ?? source.amount_consumed ?? source.total_consumed ?? source.consumed ?? 0)
    };
  }

  function normalizeEmployee(employee) {
    const source = employee || {}, fullName = source.name ?? source.full_name ?? source.fullName ?? source.nombre ?? [source.first_name ?? source.firstName ?? "", source.last_name ?? source.lastName ?? ""].filter(Boolean).join(" "), benefits = source.benefits ?? source.beneficios ?? source.allocations ?? [];
    return {
      id: source.id ?? source.employeeId ?? source.employee_id, name: String(fullName || "Empleado"), email: String(source.email ?? source.correo ?? ""),
      department: String(source.department ?? source.departamento ?? ""), role: String(source.role ?? source.position ?? source.cargo ?? ""),
      budget: toNumber(source.max_budget ?? source.maxBudget ?? source.budget ?? source.presupuesto ?? 0),
      consumed: toNumber(source.total_consumed ?? source.totalConsumed ?? source.consumed ?? source.gastado_total ?? source.gastado ?? 0),
      allocations: Array.isArray(benefits) ? benefits.map(normalizeBenefit) : []
    };
  }

  async function apiListEmployees() {
    return unwrapList(await requestUrl(employeeUrl()), ["employees"]).map(normalizeEmployee);
  }

  async function apiListEmployeeBenefits(id) {
    return unwrapList(await requestUrl(benefitsUrl(id)), ["benefits"]).map(normalizeBenefit);
  }

  async function apiCreateEmployee(employee) {
    const response = await requestUrl(employeeUrl(), { method: "POST", body: { first_name: employee.first_name, last_name: employee.last_name, email: employee.email, department: employee.department, position: employee.position, max_budget: employee.budget } });
    const saved = normalizeEmployee(unwrapEmployee(response));
    if (saved.id == null) throw new Error("El backend no ha devuelto el ID del empleado creado.");
    await requestUrl(budgetUrl(saved.id), { method: "PATCH", body: { max_budget: employee.budget } });
    return { ...saved, first_name: employee.first_name, last_name: employee.last_name, name: `${employee.first_name} ${employee.last_name}`.trim(), email: employee.email, department: employee.department, position: employee.position, role: employee.position, budget: employee.budget, consumed: 0, allocations: [] };
  }

  async function apiUpdateEmployee(id, employee) {
    const response = await requestUrl(employeeUrl(id), { method: "PUT", body: { name: employee.name, email: employee.email, department: employee.department, role: employee.role } });
    await requestUrl(budgetUrl(id), { method: "PATCH", body: { max_budget: employee.budget } });
    const saved = response ? normalizeEmployee(unwrapEmployee(response)) : {};
    return { ...saved, id, name: saved.name || employee.name, email: saved.email || employee.email, department: saved.department || employee.department, role: saved.role || employee.role, budget: employee.budget };
  }

  async function apiCreateBenefit(employeeId, allocation) {
    const categoryId = allocation.categoryId ?? getCategoryId(allocation.key);
    if (categoryId == null) throw new Error(`No se ha encontrado el ID del backend para la categoría "${allocation.label}".`);
    return requestUrl(benefitsUrl(employeeId), { method: "POST", body: { category_id: Number(categoryId), allocated_amount: Number(allocation.newAmount ?? allocation.amount) } });
  }

  async function loadEmployeesFromBackend() {
    const status = byId("employees-status");
    setMessage(status, "Cargando categorías y empleados…");
    try {
      await loadCategories();
      await loadGlobalBudget();
      const employees = await apiListEmployees();
      const employeesWithBenefits = await Promise.all(employees.map(async employee => {
        if (employee.id == null) return employee;
        try {
          const benefits = await apiListEmployeeBenefits(employee.id);
          return { ...employee, allocations: benefits, consumed: benefits.reduce((sum, benefit) => sum + benefit.consumed, 0) };
        } catch (error) {
          console.error(`No se pudieron cargar los beneficios del empleado ${employee.id}:`, error);
          return { ...employee, consumed: employee.allocations.reduce((sum, benefit) => sum + benefit.consumed, employee.consumed) };
        }
      }));
      tableBody.replaceChildren();
      employeesWithBenefits.forEach(employee => {
        const row = makeEmployeeRow({ id: employee.id ?? createTemporaryId(), name: employee.name, email: employee.email, department: employee.department, role: employee.role, budget: employee.budget });
        setRowConsumed(row, employee.consumed);
        setRowAllocations(row, employee.allocations.map(item => ({ ...item, key: item.key || normalizeCategoryKey(item.label), consumed: item.consumed ?? 0 })));
        tableBody.append(row);
      });
      updateSummary();
      applyFilters();
      setMessage(status, "");
    } catch (error) {
      console.error("No se pudieron cargar los datos:", error);
      setMessage(status, `No se pudieron cargar los datos desde el servidor. ${error.message}`);
    }
  }

  function setRowConsumed(row, totalConsumed) {
    const consumedCell = row.querySelector('[data-field="total-consumed"]'), budgetCell = row.querySelector('[data-field="max-budget"]'), balanceCell = row.querySelector('[data-field="available-balance"]'), consumed = toNumber(totalConsumed), budget = toNumber(budgetCell?.dataset.eur);
    if (consumedCell) consumedCell.dataset.eur = String(consumed);
    if (balanceCell) balanceCell.dataset.eur = String(Math.max(0, budget - consumed));
  }

  function setRowAllocations(row, allocations = []) {
    const cell = row.cells[2];
    if (!cell) return;
    if (!allocations.length) { cell.replaceChildren(createTextElement("span", "employee-info__email", "Sin beneficios asignados")); return; }
    const list = createTextElement("div", "benefit-list", "");
    allocations.forEach(item => list.append(makeBenefitChip(item)));
    cell.replaceChildren(list);
  }

  function distributeConsumed(allocations, totalConsumed) {
    if (!allocations.length || allocations.every(item => item.consumed !== null)) return;
    const totalCents = Math.round(toNumber(totalConsumed) * 100), totalAmount = allocations.reduce((sum, item) => sum + item.amount, 0);
    let remainingCents = totalCents;
    allocations.forEach((allocation, position) => {
      if (allocation.consumed !== null) { remainingCents -= Math.round(allocation.consumed * 100); return; }
      const remaining = allocations.slice(position).filter(item => item.consumed === null), isLast = remaining.length === 1, share = totalAmount > 0 ? allocation.amount / totalAmount : 1 / Math.max(1, remaining.length), cents = isLast ? remainingCents : Math.round(totalCents * share);
      allocation.consumed = Math.max(0, cents / 100);
      remainingCents -= cents;
    });
  }

  function getAllocations(row) {
    const allocations = [...row.querySelectorAll(".benefit-chip")].map((chip, index) => {
      const amountElement = chip.querySelector("[data-eur]"), labelClone = chip.cloneNode(true);
      labelClone.querySelectorAll("[data-eur]").forEach(element => element.remove());
      const key = getCategoryKey(chip), category = getCategory(key);
      return { index, id: chip.dataset.benefitId || null, categoryId: chip.dataset.categoryId || category.id || null, key, label: category.label || labelClone.textContent.trim() || `Beneficio ${index + 1}`, amount: toNumber(amountElement?.dataset.eur), consumed: chip.dataset.consumed !== undefined ? toNumber(chip.dataset.consumed) : null, amountElement, chip };
    });
    distributeConsumed(allocations, amount(row, "total-consumed"));
    return allocations;
  }

  function makeBenefitChip({ id, benefitId, categoryId, key, label, amount, consumed }) {
    const normalizedKey = normalizeCategoryKey(key), category = getCategory(normalizedKey), chip = createTextElement("span", `benefit-chip benefit-chip--${normalizedKey}`, ""), amountElement = document.createElement("span");
    amountElement.dataset.eur = String(toNumber(amount));
    const identifier = id ?? benefitId;
    if (identifier != null) chip.dataset.benefitId = String(identifier);
    const resolvedCategoryId = categoryId ?? category.id;
    if (resolvedCategoryId != null) chip.dataset.categoryId = String(resolvedCategoryId);
    chip.dataset.consumed = String(toNumber(consumed));
    chip.append(document.createTextNode(`${category.chipLabel || label || category.label} \u00a0`), amountElement);
    return chip;
  }

  function applyFilters() {
    if (!root || !searchInput) return;
    const query = searchInput.value.trim().toLocaleLowerCase("es");
    const matchingRows = [];
    rows().forEach(row => {
      const department = getDepartment(row), show = (activeDepartment === "all" || department === activeDepartment) && row.textContent.toLocaleLowerCase("es").includes(query);
      if (show) matchingRows.push(row);
      else row.hidden = true;
    });

    const totalPages = Math.max(1, Math.ceil(matchingRows.length / EMPLOYEES_PER_PAGE));
    if (employeesCurrentPage > totalPages) employeesCurrentPage = totalPages;
    if (employeesCurrentPage < 1) employeesCurrentPage = 1;

    const start = (employeesCurrentPage - 1) * EMPLOYEES_PER_PAGE;
    const end = start + EMPLOYEES_PER_PAGE;

    matchingRows.forEach((row, idx) => {
      row.hidden = !(idx >= start && idx < end);
    });

    root.querySelectorAll(".filter-button[data-department]").forEach(button => {
      const active = button.dataset.department === activeDepartment;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const count = byId("employees-results-count");
    if (count) count.textContent = `${matchingRows.length} ${matchingRows.length === 1 ? "empleado" : "empleados"}`;

    const empty = byId("employees-empty-state");
    if (empty) empty.hidden = matchingRows.length !== 0;

    const info = byId("employees-pagination-info");
    if (info) {
      if (matchingRows.length > 0) {
        info.textContent = `Mostrando ${start + 1}-${Math.min(end, matchingRows.length)} de ${matchingRows.length} empleados`;
      } else {
        info.textContent = "Sin empleados";
      }
    }

    renderEmployeesPagination(totalPages);
  }

  function updateSummary() {
    const allRows = rows(), totalBudget = allRows.reduce((sum, row) => sum + amount(row, "max-budget"), 0), totalConsumed = allRows.reduce((sum, row) => sum + amount(row, "total-consumed"), 0);
    const active = byId("employees-active-count");
    if (active) active.textContent = String(allRows.length);
    const budget = byId("employees-total-budget");
    if (budget) budget.dataset.eur = String(totalBudget);
    const consumed = byId("employees-total-consumed");
    if (consumed) consumed.dataset.eur = String(totalConsumed);
    if (typeof window.renderMoney === "function") window.renderMoney(root);
  }

  function makeEmployeeRow({ id, name, email, department, role, budget }) {
    const row = document.createElement("tr");
    row.dataset.employeeId = String(id);
    row.dataset.department = department || "";
    row.dataset.role = role || "";
    const employeeCell = createTextElement("th", "employee-cell", "");
    employeeCell.scope = "row";
    const numericId = Number(id), colorIndex = Number.isFinite(numericId) ? Math.abs(numericId - 1) % AVATAR_COLORS.length : 0, avatar = createTextElement("span", `employee-avatar employee-avatar--${AVATAR_COLORS[colorIndex]}`, getInitials(name));
    avatar.setAttribute("aria-hidden", "true");
    const info = createTextElement("span", "employee-info", "");
    info.append(createTextElement("span", "employee-info__name", name), createTextElement("span", "employee-info__email", email));
    const cellWrapper = createTextElement("div", "employee-cell__wrapper", "");
    cellWrapper.append(avatar, info);
    employeeCell.append(cellWrapper);
    const departmentCell = document.createElement("td");
    departmentCell.append(createTextElement("span", "department-badge", department));
    const benefitsCell = document.createElement("td");
    benefitsCell.append(createTextElement("span", "employee-info__email", "Sin beneficios asignados"));
    const budgetCell = createTextElement("td", "money-cell", "");
    budgetCell.dataset.field = "max-budget";
    budgetCell.dataset.eur = String(toNumber(budget));
    const consumedCell = createTextElement("td", "money-cell", "");
    consumedCell.dataset.field = "total-consumed";
    consumedCell.dataset.eur = "0";
    const availableCell = createTextElement("td", "money-cell money-cell--available", "");
    availableCell.dataset.field = "available-balance";
    availableCell.dataset.eur = String(toNumber(budget));
    const actionsCell = createTextElement("td", "actions-cell", ""), editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button--secondary button--small";
    editButton.dataset.action = "edit-allocation";
    editButton.dataset.employeeId = String(id);
    editButton.setAttribute("aria-label", `Editar límite de ${name}`);
    const editIcon = createTextElement("span", "material-symbols-outlined", "edit");
    editIcon.setAttribute("aria-hidden", "true");
    editButton.append(editIcon, document.createTextNode(" Editar límite"));
    actionsCell.append(editButton);
    row.append(employeeCell, departmentCell, benefitsCell, budgetCell, consumedCell, availableCell, actionsCell);
    return row;
  }

  function createEmployeeForm() {
    const form = document.createElement("form");
    form.id = "employee-create-form";
    form.dataset.budgetInvalid = "false";
    form.innerHTML = `
      <div id="create-employee-alert" class="modal-form-alert" hidden role="alert">
        <span class="material-symbols-outlined" style="font-size: 18px;" aria-hidden="true">error</span>
        <span>Por favor, completa todos los campos obligatorios marcados con asterisco (*).</span>
      </div>
      <div class="form-row">
        <div class="form-field"><label for="new-employee-name">Nombre <span class="required-asterisk">*</span></label><input id="new-employee-name" name="name" type="text" autocomplete="given-name" required maxlength="120" placeholder="Nombre del empleado"></div>
        <div class="form-field"><label for="new-employee-last-name">Apellido <span class="required-asterisk">*</span></label><input id="new-employee-last-name" name="last_name" type="text" autocomplete="family-name" maxlength="120" placeholder="Apellido del empleado" required></div>
      </div>
      <div class="form-row">
        <div class="form-field"><label for="new-employee-department">Departamento <span class="required-asterisk">*</span></label><select id="new-employee-department" name="department" required><option value="">Selecciona un departamento</option>${DEPARTMENTS.map(department => `<option value="${department}">${department}</option>`).join("")}</select></div>
        <div class="form-field"><label for="new-employee-email">Correo electrónico <span class="required-asterisk">*</span></label><input id="new-employee-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="nombre@empresa.com"></div>
      </div>
      <div class="form-field"><label for="new-employee-budget">Límite global (€) <span class="required-asterisk">*</span></label><input id="new-employee-budget" name="max_budget" type="number" min="0" step="0.01" required placeholder="0,00"></div>
      <p class="modal-info">Saldo total disponible: <strong data-create-balance></strong></p>
      <p class="modal-info is-invalid" data-create-budget-error hidden role="alert" aria-live="polite"></p>`;
    const emailInput = form.elements.email, budgetInput = form.elements.max_budget, errorElement = form.querySelector("[data-create-budget-error]"), balanceElement = form.querySelector("[data-create-balance]");
    emailInput.addEventListener("input", () => {
      const email = emailInput.value.trim().toLocaleLowerCase("es"), duplicate = rows().some(row => getEmployeeEmail(row).toLocaleLowerCase("es") === email);
      emailInput.setCustomValidity(email && duplicate ? "Ya existe un empleado con ese correo electrónico." : "");
    });
    function validateCreateBudget() {
      const remaining = getCompanyRemainingBudget(), value = budgetInput.value.trim() === "" ? NaN : Number(budgetInput.value);
      balanceElement.textContent = money(remaining);
      const hasValue = Number.isFinite(value), invalid = hasValue && (value < 0 || value > remaining);
      let message = "";
      if (hasValue && value < 0) message = "El límite del empleado no puede ser negativo.";
      else if (hasValue && value > remaining) message = `El límite introducido (${money(value)}) supera el saldo disponible de la empresa (${money(remaining)}). Reduce el importe para continuar.`;
      form.dataset.budgetInvalid = invalid ? "true" : "false";
      errorElement.textContent = message;
      errorElement.hidden = !message;
      budgetInput.setCustomValidity(message);
      syncModalConfirmButton(form, "Crear empleado");
    }
    budgetInput.addEventListener("input", validateCreateBudget);
    budgetInput.addEventListener("change", validateCreateBudget);
    form.addEventListener("submit", event => {
      if (form.dataset.budgetInvalid === "true") { event.preventDefault(); event.stopPropagation(); }
    });
    validateCreateBudget();
    return form;
  }

  async function showCreateEmployeeModal() {
    const form = createEmployeeForm(), stopWatching = watchModalValidation(form, "Crear empleado");
    let result;
    try {
      result = await window.openDynamicModal({ title: "Nuevo empleado", subtitle: "Completa los datos del empleado y su presupuesto.", content: form, confirmText: "Crear empleado", cancelText: "Cancelar", size: "medium", icon: "person_add" });
    } finally { stopWatching(); }
    if (!result?.confirmed) return;
    const data = result.data || {}, name = String(data.name || "").trim(), lastNameInput = String(data.last_name || "").trim(), email = String(data.email || "").trim(), normalizedEmail = email.toLocaleLowerCase("es"), department = String(data.department || ""), budget = Number(data.max_budget), remaining = getCompanyRemainingBudget();
    if (!name || !lastNameInput || !normalizedEmail || !department || !Number.isFinite(budget) || budget < 0 || budget > remaining) {
      window.alert(`Revisa los datos. El límite del empleado no puede superar el saldo disponible de la empresa (${money(remaining)}).`);
      return;
    }
    if (rows().some(row => getEmployeeEmail(row).toLocaleLowerCase("es") === normalizedEmail)) {
      window.alert("Ya existe un empleado con ese correo electrónico.");
      return;
    }
    try {
      if (!DATA_CONFIG.useBackend) { window.alert("El modo local no está habilitado en esta versión."); return; }
      const lastName = lastNameInput || ".", employee = await apiCreateEmployee({ first_name: name, last_name: lastName, name: [name, lastNameInput].filter(Boolean).join(" "), email, department, position: "Trabajador", budget }), displayName = [name, lastNameInput].filter(Boolean).join(" ");
      const row = makeEmployeeRow({ id: employee.id, name: displayName, email: employee.email, department: employee.department, role: employee.role, budget: employee.budget });
      setRowConsumed(row, 0);
      setRowAllocations(row, []);
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

  function createEmployeeHeader(row) {
    const name = getEmployeeName(row), header = document.createElement("div");
    header.className = "employee-detail-form__employee";
    header.innerHTML = `<span class="employee-detail-form__avatar" aria-hidden="true"></span><div class="employee-detail-form__identity"><div class="employee-detail-form__title-line"><h3 class="employee-detail-form__name"></h3><span class="employee-detail-form__status"><span aria-hidden="true"></span> Activo en nómina</span></div><p class="employee-detail-form__meta"></p></div>`;
    header.querySelector(".employee-detail-form__avatar").textContent = getInitials(name);
    header.querySelector(".employee-detail-form__name").textContent = name;
    header.querySelector(".employee-detail-form__meta").textContent = [row.dataset.role || "", getDepartment(row), getEmployeeEmail(row)].filter(Boolean).join(" • ");
    return header;
  }

  function createDeleteButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-danger-ghost";
    button.dataset.action = "delete-employee";
    button.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">delete</span><span>Eliminar Empleado</span>`;
    return button;
  }

  function createAllocationCard(allocation) {
    const category = getCategory(allocation.key), card = document.createElement("article");
    card.className = `employee-detail-form__allocation-card employee-detail-form__allocation-card--${category.color}`;
    card.innerHTML = `
      <div class="employee-detail-form__allocation-top"><span class="employee-detail-form__allocation-title"><span class="material-symbols-outlined" aria-hidden="true"></span><strong></strong></span><span class="employee-detail-form__allocation-percent" data-card="percent"></span></div>
      <div class="employee-detail-form__allocation-values">
        <div class="employee-detail-form__allocation-value"><span>Asignado:</span><input class="employee-detail-form__allocation-input" type="number" min="0" step="0.01" required></div>
        <div class="employee-detail-form__allocation-value"><span>Gastado:</span><strong data-card="consumed"></strong></div>
        <div class="employee-detail-form__allocation-value employee-detail-form__allocation-value--available"><span>Disponible:</span><strong data-card="available"></strong></div>
      </div>
      <div class="employee-detail-form__progress" aria-hidden="true"><div class="employee-detail-form__progress-bar" data-card="bar"></div></div>`;
    card.querySelector(".material-symbols-outlined").textContent = category.icon;
    card.querySelector("strong").textContent = allocation.label;
    card.querySelector('[data-card="consumed"]').textContent = money(allocation.consumed);
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
  const value = Number(allocation.input.value);
  const valid = allocation.input.value.trim() !== "" && Number.isFinite(value) && value >= 0;
  const available = valid ? Math.max(0, value - allocation.consumed) : 0;
  const rawPercentage = valid && value > 0 ? (allocation.consumed / value) * 100 : 0;
  const percentage = Math.round(rawPercentage);
  const bar = allocation.card.querySelector('[data-card="bar"]');
  allocation.card.querySelector('[data-card="percent"]').textContent = `${percentage}% consumido`;
  allocation.card.querySelector('[data-card="available"]').textContent = money(available);
  bar.style.width = `${Math.min(100, rawPercentage)}%`;
  bar.classList.remove("progress--green", "progress--orange", "progress--red");
  if (rawPercentage <= 33) {
    bar.classList.add("progress--green");
  } else if (rawPercentage <= 66) {
    bar.classList.add("progress--orange");
  } else {
    bar.classList.add("progress--red");
  }
}


function createEditEmployeeForm(row) {
  const name = getEmployeeName(row);
  const budget = amount(row, "max-budget");
  const consumed = amount(row, "total-consumed");
  const allocations = getAllocations(row);
  const companyRemaining = getCompanyRemainingBudget(row);
  let nextIndex = allocations.length;

  const form = document.createElement("form");
  form.id = "employee-edit-form";
  form.className = "employee-detail-form";
  form.dataset.budgetInvalid = "false";

  form.innerHTML = `
    <section class="employee-detail-form__metrics" aria-label="Resumen presupuestario">
      <article class="employee-detail-form__metric">
        <span>Asignado Total</span>
        <strong data-summary="allocated">0 €</strong>
        <small data-summary="allocated-count"></small>
      </article>
      <article class="employee-detail-form__metric">
        <span>Gastado Total</span>
        <strong class="employee-detail-form__metric--blue" data-summary="consumed">0 €</strong>
        <small class="employee-detail-form__metric--blue" data-summary="consumed-percent"></small>
      </article>
      <article class="employee-detail-form__metric employee-detail-form__metric--green">
        <span>Saldo Disponible Restante</span>
        <strong data-summary="available">0 €</strong>
        <small>Límite del empleado menos total asignado</small>
      </article>
    </section>

    <section class="employee-detail-form__allocations" aria-labelledby="employee-allocations-title">
      <div class="employee-detail-form__section-heading">
        <h4 id="employee-allocations-title"></h4>
        <span data-summary="category-count"></span>
      </div>
      <div class="employee-detail-form__allocation-grid" data-allocation-list></div>
      <p class="employee-detail-form__no-benefits" data-no-benefits hidden>
        Este empleado todavía no tiene beneficios asignados.
      </p>
    </section>

    <section class="employee-detail-form__panel" aria-label="Asignar nueva categoría">
      <div class="employee-detail-form__panel-text">
        <strong data-assign="title"></strong>
        <span data-assign="help"></span>
      </div>
      <div class="employee-detail-form__panel-controls">
        <select class="employee-detail-form__control" data-assign="category" aria-label="Categoría a asignar"></select>
        <input class="employee-detail-form__control employee-detail-form__control--amount" type="number" min="0" step="0.01" placeholder="Importe (€)" data-assign="amount" aria-label="Importe a asignar">
        <button type="button" class="employee-detail-form__assign-button" data-action="assign-category">Asignar</button>
      </div>
      <p class="modal-info is-invalid" data-assign-error hidden role="alert" aria-live="polite"></p>
    </section>

    <section class="employee-detail-form__panel">
      <div class="employee-detail-form__panel-text">
        <label for="edit-max-budget">Límite Global del Empleado (€) <span class="required-asterisk">*</span></label>
        <span data-budget-help></span>
      </div>
      <p class="modal-info">
        Saldo total disponible: <strong data-total-balance></strong>
      </p>
      <div class="employee-detail-form__panel-controls">
        <input id="edit-max-budget" name="max_budget" class="employee-detail-form__control employee-detail-form__control--limit" type="number" min="0" step="0.01" required>
      </div>
      <p class="modal-info is-invalid" data-budget-error hidden role="alert" aria-live="polite"></p>
    </section>
  `;

  const firstName = name.split(/\s+/)[0];

  form.querySelector("#employee-allocations-title").textContent =
    `Beneficios Asignados a ${firstName} (por Categoría)`;

  form.querySelector('[data-assign="title"]').textContent =
    `+ Asignar Nueva Categoría a ${firstName}`;

  const budgetInput = form.elements.max_budget;
  budgetInput.value = String(budget);
  budgetInput.min = String(consumed);

  const allocationList = form.querySelector("[data-allocation-list]");
  const categorySelect = form.querySelector('[data-assign="category"]');
  const amountInput = form.querySelector('[data-assign="amount"]');
  const assignButton = form.querySelector('[data-action="assign-category"]');
  const assignHelp = form.querySelector('[data-assign="help"]');
  const assignError = form.querySelector("[data-assign-error]");
  const totalBalance = form.querySelector("[data-total-balance]");

  allocations.forEach(item => allocationList.append(createAllocationCard(item)));

  function setAssignHelp(message, invalid = false) {
    assignHelp.textContent = message;
    assignHelp.classList.toggle("is-invalid", invalid);
  }

  function setAssignError(message) {
    assignError.textContent = message || "";
    assignError.hidden = !message;
  }

  function refreshAssignPanel() {
    const assignedKeys = new Set(allocations.map(item => item.key));
    const available = Object.entries(CATEGORIES).filter(([key]) => !assignedKeys.has(key));

    categorySelect.replaceChildren();

    available.forEach(([key, category]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = category.label;
      categorySelect.append(option);
    });

    const hasAvailable = available.length > 0;
    categorySelect.disabled = amountInput.disabled = assignButton.disabled = !hasAvailable;

    if (!hasAvailable) {
      setAssignHelp("Todas las categorías ya están asignadas.");
      return;
    }

    setAssignHelp(
      `${available.length === 1 ? "Disponible" : "Disponibles"}: ${available.map(([, category]) => category.label).join(", ")}`
    );
  }

  function assignCategory() {
    const key = categorySelect.value;
    const newAmount = amountInput.value.trim() === "" ? NaN : Number(amountInput.value);

    if (!CATEGORIES[key] || !Number.isFinite(newAmount) || newAmount < 0) {
      setAssignError("Selecciona una categoría e introduce un importe válido.");
      setAssignHelp("Introduce un importe válido para continuar.", true);
      amountInput.focus();
      return;
    }

    if (allocations.some(item => item.key === key)) {
      setAssignError("Esta categoría ya está asignada al empleado.");
      return;
    }

    const currentAssigned = allocations.reduce((sum, item) => {
      const value = item.input.value.trim() === "" ? NaN : Number(item.input.value);
      return sum + (Number.isFinite(value) && value >= 0 ? value : 0);
    }, 0);

    const newTotal = currentAssigned + newAmount;
    const employeeLimit = budgetInput.value.trim() === "" ? NaN : Number(budgetInput.value);

    if (!Number.isFinite(employeeLimit) || employeeLimit < 0) {
      setAssignError("Introduce primero un límite válido para el empleado.");
      budgetInput.focus();
      return;
    }

    if (newTotal > employeeLimit) {
      setAssignError(
        `No se puede añadir esta categoría porque las asignaciones sumarían ${money(newTotal)} y el límite de este empleado es ${money(employeeLimit)}. Reduce el importe o aumenta el límite antes de asignarla.`
      );
      setAssignHelp(
        `Te quedan ${money(Math.max(0, employeeLimit - currentAssigned))} disponibles para asignar.`,
        true
      );
      amountInput.focus();
      return;
    }

    setAssignError("");

    const category = CATEGORIES[key];
    const allocation = {
      index: nextIndex++,
      id: null,
      categoryId: category.id,
      key,
      label: category.label,
      amount: newAmount,
      consumed: 0,
      isNew: true
    };

    allocations.push(allocation);
    allocationList.append(createAllocationCard(allocation));
    amountInput.value = "";

    refreshAssignPanel();
    updatePreview();
  }

  function updatePreview() {
    const newBudget = budgetInput.value.trim() === "" ? NaN : Number(budgetInput.value);
    const values = allocations.map(item =>
      item.input.value.trim() === "" ? NaN : Number(item.input.value)
    );

    const validValues = values.every(value => Number.isFinite(value) && value >= 0);
    const assigned = validValues
      ? values.reduce((sum, value) => sum + value, 0)
      : 0;

    const validBudget = Number.isFinite(newBudget) && newBudget >= 0;
    const exceedsCompanyBudget = validBudget && newBudget > companyRemaining;
    const belowConsumed = validBudget && newBudget < consumed;
    const exceedsEmployeeBudget = validValues && validBudget && assigned > newBudget;

    allocations.forEach(updateAllocationCard);

    form.querySelector('[data-summary="allocated"]').textContent = money(assigned);
    form.querySelector('[data-summary="allocated-count"]').textContent =
      `Suma de ${allocations.length} ${allocations.length === 1 ? "categoría activa" : "categorías activas"}`;

    form.querySelector('[data-summary="consumed"]').textContent = money(consumed);

    const executed = assigned > 0 ? consumed / assigned * 100 : 0;
    form.querySelector('[data-summary="consumed-percent"]').textContent =
      `${PERCENT_FORMAT.format(executed)}% ejecutado`;

    form.querySelector('[data-summary="available"]').textContent =
      money(Number.isFinite(newBudget) ? Math.max(0, newBudget - assigned) : 0);

    totalBalance.textContent = money(companyRemaining);

    form.querySelector('[data-summary="category-count"]').textContent =
      `${allocations.length} ${allocations.length === 1 ? "categoría asignada" : "categorías asignadas"}`;

    form.querySelector("[data-no-benefits]").hidden = allocations.length > 0;

    let error = "";

    if (!validBudget) {
      error = "Introduce un límite válido y no negativo.";
    } else if (exceedsCompanyBudget) {
      error = `El límite introducido (${money(newBudget)}) supera el saldo disponible de la empresa (${money(companyRemaining)}). Reduce el importe para continuar.`;
    } else if (belowConsumed) {
      error = `El límite no puede ser inferior al importe ya gastado (${money(consumed)}).`;
    } else if (!validValues) {
      error = "Todas las asignaciones deben tener un importe válido y no negativo.";
    } else if (exceedsEmployeeBudget) {
      error = `Las asignaciones (${money(assigned)}) superan el límite del empleado (${money(newBudget)}).`;
    }

    budgetInput.setCustomValidity(error);
    setBudgetError(form, error);

    form.querySelector('[data-summary="allocated"]')
      .classList.toggle("is-invalid", !validValues || exceedsEmployeeBudget);

    form.dataset.budgetInvalid = error ? "true" : "false";
    syncModalConfirmButton(form, "Guardar Cambios");

    if (!error) setAssignError("");
  }

  assignButton.addEventListener("click", assignCategory);

  amountInput.addEventListener("input", () => {
    setAssignError("");
    const limit = Number(budgetInput.value);
    const assigned = getFormAllocatedTotal(form);

    if (Number.isFinite(limit)) {
      setAssignHelp(`Saldo para nuevas asignaciones: ${money(Math.max(0, limit - assigned))}`);
    }
  });

  amountInput.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    assignCategory();
  });

  form.addEventListener("input", updatePreview);
  form.addEventListener("change", updatePreview);

  form.addEventListener("submit", event => {
    if (form.dataset.budgetInvalid === "true") {
      event.preventDefault();
      event.stopPropagation();
    }
  });

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

  async function saveEmployeeAllocations(employeeId, allocations) {
    for (const allocation of allocations) {
      if (allocation.isNew) await apiCreateBenefit(employeeId, allocation);
      else if (allocation.id != null) await apiUpdateBenefit(allocation.id, allocation);
    }
  }

async function showEditEmployeeModal(row) {
  const employeeId = row.dataset.employeeId;
  const name = getEmployeeName(row);
  const { form, header, deleteButton, allocations, consumed } = createEditEmployeeForm(row);

  deleteButton.addEventListener("click", () => {
    if (!window.confirm(`¿Quieres eliminar a ${name}? Esta acción quitará al empleado del directorio.`)) return;
    window.closeDynamicModal({ confirmed: true, data: { action: "delete" } });
  });

  const stopWatching = watchModalValidation(form, "Guardar Cambios");
  let result;

  try {
    result = await window.openDynamicModal({
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
  } finally {
    stopWatching();
  }

  if (!result?.confirmed) return;

  if (result.data?.action === "delete") {
    try {
      if (DATA_CONFIG.useBackend) await apiDeleteEmployee(employeeId);
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
  const companyRemaining = getCompanyRemainingBudget(row);

  const allocationValues = allocations.map(item => ({
    ...item,
    newAmount: Number(result.data?.[`allocation_${item.index}`])
  }));

  const totalAllocated = allocationValues.reduce(
    (sum, item) => sum + (Number.isFinite(item.newAmount) ? item.newAmount : 0),
    0
  );

  const invalidAllocations = allocationValues.some(
    item => !Number.isFinite(item.newAmount) || item.newAmount < 0
  );

  if (!Number.isFinite(newBudget) || newBudget < 0 || newBudget < consumed) {
    window.alert(
      `El límite del empleado debe ser válido, no negativo y no inferior al gasto acumulado (${money(consumed)}).`
    );
    return;
  }

  if (newBudget > companyRemaining) {
    window.alert(
      `No se pueden guardar los cambios. El límite introducido (${money(newBudget)}) supera el saldo disponible de la empresa (${money(companyRemaining)}). Reduce el importe para continuar.`
    );
    return;
  }

  if (invalidAllocations || totalAllocated > newBudget) {
    window.alert(
      `No se han podido guardar los cambios. Las asignaciones suman ${money(totalAllocated)} y el límite del empleado es ${money(newBudget)}. Revisa los importes.`
    );
    return;
  }

  const employeeData = {
    name: getEmployeeName(row),
    email: getEmployeeEmail(row),
    department: getDepartment(row),
    role: row.dataset.role || "",
    budget: newBudget
  };

  try {
    if (DATA_CONFIG.useBackend) {
      await apiUpdateEmployee(employeeId, employeeData);
      await saveEmployeeAllocations(employeeId, allocationValues);
    }

    const savedBenefits = DATA_CONFIG.useBackend
      ? await apiListEmployeeBenefits(employeeId)
      : allocationValues.map(item => ({ ...item, amount: item.newAmount }));

    const budgetCell = row.querySelector('[data-field="max-budget"]');

    if (!budgetCell) {
      throw new Error("No se encontró la celda del límite presupuestario.");
    }

    budgetCell.dataset.eur = String(newBudget);
    row.dataset.department = employeeData.department;
    row.dataset.role = employeeData.role;

    setRowConsumed(
      row,
      savedBenefits.reduce((sum, item) => sum + item.consumed, 0)
    );

    setRowAllocations(row, savedBenefits);
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
  function bindViewEvents() {
    searchInput.addEventListener("input", () => {
      employeesCurrentPage = 1;
      applyFilters();
    });
    root.querySelectorAll(".filter-button[data-department]").forEach(button => button.addEventListener("click", () => {
      activeDepartment = button.dataset.department;
      employeesCurrentPage = 1;
      applyFilters();
    }));
    const prevBtn = root.querySelector('[data-page-action="previous"]');
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (employeesCurrentPage > 1) {
          employeesCurrentPage--;
          applyFilters();
        }
      });
    }
    const nextBtn = root.querySelector('[data-page-action="next"]');
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        employeesCurrentPage++;
        applyFilters();
      });
    }
    root.addEventListener("click", event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('[data-action="create-employee"]')) {
        void showCreateEmployeeModal().catch(error => {
          console.error("No se pudo abrir el formulario de alta:", error);
          window.alert(`No se ha podido abrir el formulario de alta. ${error.message}`);
        });
        return;
      }
      const editButton = target.closest('[data-action="edit-allocation"]');
      if (!editButton) return;
      const row = rows().find(item => item.dataset.employeeId === editButton.dataset.employeeId);
      if (row) void showEditEmployeeModal(row).catch(error => {
        console.error("No se pudo abrir el modal del empleado:", error);
        window.alert(`No se ha podido abrir el detalle del empleado. ${error.message}`);
      });
    });
  }

  async function initEmpleadosView() {
    root = document.querySelector(VIEW_SELECTOR);
    if (!root || root.dataset.initialized === "true") return;
    tableBody = byId("employees-table-body");
    searchInput = byId("employee-search");
    if (!tableBody || !searchInput) return;
    if (typeof window.openDynamicModal !== "function") {
      console.error("No está disponible openDynamicModal(). Comprueba que el componente global modal se carga antes de la vista.");
      setMessage(byId("employees-status"), "No se pudo inicializar el sistema de modales compartido.");
      return;
    }
    root.dataset.initialized = "true";
    rows().forEach(row => {
      if (!row.dataset.department) row.dataset.department = row.querySelector(".department-badge")?.textContent.trim() || "";
    });
    bindViewEvents();
    updateSummary();
    applyFilters();
    if (DATA_CONFIG.useBackend) await loadEmployeesFromBackend();
    else setMessage(byId("employees-status"), "");
  }

  window.initEmpleadosView = initEmpleadosView;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initEmpleadosView, { once: true });
  else initEmpleadosView();
})();