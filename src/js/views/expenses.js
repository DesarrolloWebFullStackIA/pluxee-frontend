const USE_MOCK_EXPENSES = false;

const GASTOS_PER_PAGE = 6;
let gastosList = [];        
let gastosFilter = "all";  
let gastosSearch = "";      
let gastosPage = 1;       

let gastosBody;
let gastosInfo;
let gastosPrevBtn;
let gastosNextBtn;

const GASTOS_CATEGORY_CLASSES = {
  "Transporte": "transporte",
  "Restauración": "restauracion",
  "Formación": "formacion",
  "Guardería": "guarderia",
  "Salud": "salud"
};

const GASTOS_STATUS_TEXT = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado"
};

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(isoDate) {
  const parts = isoDate.split("-");
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function formatEuros(amount) {
  return Number(amount).toFixed(2).replace(".", ",") + " €";
}

function getInitials(name) {
  const words = name.split(" ");
  let initials = words[0][0];
  if (words[1]) {
    initials += words[1][0];
  }
  return initials.toUpperCase();
}

function setAmount(elementId, amount) {
  const element = document.getElementById(elementId);
  if(element) {
    element.dataset.eur = amount;
    element.textContent = formatEuros(amount);
  }
}

function getVisibleExpenses() {
  const text = gastosSearch.toLowerCase();
  const result = [];

  for (const expense of gastosList) {
    if (gastosFilter !== "all" && expense.status !== gastosFilter) continue;
    const name = expense.employee.name.toLowerCase();
    const concept = expense.concept.toLowerCase();
    if (text !== "" && !name.includes(text) && !concept.includes(text)) continue;
    result.push(expense);
  }
  return result;
}

function buildExpenseRow(expense) {
  const name = escapeHTML(expense.employee.name);
  const role = escapeHTML(expense.employee.role || "");
  const categoryClass = GASTOS_CATEGORY_CLASSES[expense.category] || "";

  let actions = "";
  if (expense.status === "pending") {
    actions = `
      <div class="gastos-row-actions">
        <button type="button" class="gastos-action" data-action="edit" data-id="${expense.id}" style="color: #007bff; border-color: #007bff;" title="Editar">
          <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
        </button>
        <button type="button" class="gastos-action" data-action="delete" data-id="${expense.id}" style="color: #dc3545; border-color: #dc3545;" title="Eliminar">
          <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
        </button>
        <button type="button" class="gastos-action gastos-action--approve" data-action="approve" data-id="${expense.id}">
          <span class="material-symbols-outlined">check</span>Aprobar
        </button>
        <button type="button" class="gastos-action gastos-action--reject" data-action="reject" data-id="${expense.id}">
          <span class="material-symbols-outlined">close</span>Rechazar
        </button>
      </div>`;
  } else if (expense.status === "rejected") {
    actions = `<span class="gastos-note gastos-note--rejected">${escapeHTML(expense.rejectionReason || "Rechazado")}</span>`;
  } else {
    actions = `<span class="gastos-note">Procesado</span>`;
  }

  let receiptIcon = "picture_as_pdf";
  let receiptText = "PDF";
  if (expense.receiptType === "image") {
    receiptIcon = "image";
    receiptText = "IMG";
  }
  
  let receiptUrl = expense.receiptUrl || "#";
  if (receiptUrl !== "#" && !receiptUrl.startsWith("http")) {
    receiptUrl = "http://" + receiptUrl; 
  }

  return `
    <tr>
      <td class="gastos-date">${formatDate(expense.date)}</td>
      <td>
        <div class="gastos-employee">
          <div class="gastos-avatar gastos-avatar--${Number(expense.id) % 4}">${getInitials(expense.employee.name)}</div>
          <div>
            <span class="gastos-employee__name">${name}</span>
            <span class="gastos-employee__role">${role}</span>
          </div>
        </div>
      </td>
      <td><span class="gastos-category gastos-category--${categoryClass}">${escapeHTML(expense.category)}</span></td>
      <td class="gastos-concept">${escapeHTML(expense.concept)}</td>
      <td class="gastos-amount is-right"><span data-eur="${expense.amount}" data-decimals="2">${formatEuros(expense.amount)}</span></td>
      <td class="is-center">
        <a class="gastos-receipt" href="${receiptUrl}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined">${receiptIcon}</span>
          <span>${receiptText}</span>
        </a>
      </td>
      <td class="is-center"><span class="gastos-badge gastos-badge--${expense.status}">${GASTOS_STATUS_TEXT[expense.status]}</span></td>
      <td class="is-right">${actions}</td>
    </tr>`;
}

function updateSummary() {
  let pending = 0, approved = 0, rejected = 0, totalAmount = 0, pendingAmount = 0;
  for (const expense of gastosList) {
    totalAmount += Number(expense.amount);
    if (expense.status === "pending") { pending++; pendingAmount += Number(expense.amount); }
    else if (expense.status === "approved") { approved++; }
    else if (expense.status === "rejected") { rejected++; }
  }
  const counts = { all: gastosList.length, pending: pending, approved: approved, rejected: rejected };
  document.querySelectorAll("[data-count]").forEach((element) => { element.textContent = counts[element.dataset.count]; });
  setAmount("kpi-total-amount", totalAmount);
  setAmount("kpi-pending-amount", pendingAmount);
}

function renderExpensesTable() {
  const visible = getVisibleExpenses();
  const totalPages = Math.max(1, Math.ceil(visible.length / GASTOS_PER_PAGE));
  if (gastosPage > totalPages) gastosPage = totalPages;
  const start = (gastosPage - 1) * GASTOS_PER_PAGE;
  const pageItems = visible.slice(start, start + GASTOS_PER_PAGE);

  let html = "";
  for (const expense of pageItems) html += buildExpenseRow(expense);
  if (html === "") html = `<tr><td colspan="8" class="gastos-state">No hay gastos que mostrar.</td></tr>`;
  gastosBody.innerHTML = html;

  if (visible.length > 0) gastosInfo.textContent = "Mostrando " + (start + 1) + "-" + (start + pageItems.length) + " de " + visible.length + " transacciones";
  else gastosInfo.textContent = "Sin transacciones";

  gastosPrevBtn.disabled = gastosPage <= 1;
  gastosNextBtn.disabled = gastosPage >= totalPages;
  document.querySelectorAll("[data-filter]").forEach((tab) => {
    const isActive = tab.dataset.filter === gastosFilter;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-pressed", isActive);
  });
  updateSummary();
  if (typeof renderMoney === "function") renderMoney();
}

async function loadExpenses() {
  gastosBody.innerHTML = `<tr><td colspan="8" class="gastos-state">Cargando gastos…</td></tr>`;
  try {
    gastosList = await getExpenses();
    if (!document.getElementById("expenses-body")) return;
    renderExpensesTable();
  } catch (error) {
    console.error(error);
    gastosBody.innerHTML = `<tr><td colspan="8" class="gastos-state">No se pudieron cargar los gastos.<button type="button" class="gastos-link" data-action="retry">Reintentar</button></td></tr>`;
  }
}

async function updateExpenseBalanceBox(form) {
  const employeeId = form.elements.employeeId.value;
  const categoryId = form.elements.categoryId.value;
  const amountInput = form.elements.amount;
  const amount = Number(amountInput.value);
  const box = form.querySelector("#gasto-balance");
  const icon = box.querySelector(".gastos-balance__icon");
  const title = form.querySelector("#gasto-balance-title");
  const detail = form.querySelector("#gasto-balance-detail");
  const badge = form.querySelector("#gasto-balance-badge");

  const setBtnState = (disabled, btnText) => {
    document.querySelectorAll("button").forEach(btn => {
      if (btn.textContent.trim() === btnText) {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? "0.5" : "1";
        btn.style.cursor = disabled ? "not-allowed" : "pointer";
        btn.style.pointerEvents = disabled ? "none" : "auto";
      }
    });
  };

  const expectedBtnText = document.body.innerHTML.includes("Guardar cambios") ? "Guardar cambios" : "Registrar gasto";

  if (employeeId === "" || categoryId === "") {
    box.className = "gastos-balance";
    icon.textContent = "info";
    title.textContent = "Control transaccional de saldo";
    detail.textContent = "Selecciona un empleado y una categoría para ver el saldo disponible.";
    badge.textContent = "";
    amountInput.setCustomValidity("Selecciona empleado y categoría.");
    setBtnState(true, expectedBtnText);
    return;
  }

  try {
    const balance = await getAvailableBalance(employeeId, categoryId);
    const select = form.elements.categoryId;
    const categoryName = select.options[select.selectedIndex].text;
    const balanceText = "Saldo disponible en " + categoryName + ": " + formatEuros(balance);

    if (amount > balance) {
      box.className = "gastos-balance gastos-balance--error";
      icon.textContent = "error";
      title.textContent = "Saldo insuficiente";
      detail.textContent = balanceText + " • El importe supera el límite.";
      badge.textContent = "Sin saldo";
      amountInput.setCustomValidity("El importe supera el saldo disponible.");
      setBtnState(true, expectedBtnText);
    } else if (amount > 0) {
      box.className = "gastos-balance gastos-balance--ok";
      icon.textContent = "check_circle";
      title.textContent = "Control transaccional de saldo garantizado";
      detail.textContent = balanceText + " • Gasto validado dentro del límite.";
      badge.textContent = "Saldo OK";
      amountInput.setCustomValidity("");
      setBtnState(false, expectedBtnText);
    } else {
      box.className = "gastos-balance";
      icon.textContent = "info";
      title.textContent = "Control transaccional de saldo";
      detail.textContent = balanceText;
      badge.textContent = "";
      amountInput.setCustomValidity("El importe debe ser mayor que 0.");
      setBtnState(true, expectedBtnText);
    }
  } catch (error) {
    console.error(error);
    box.className = "gastos-balance";
    icon.textContent = "info";
    detail.textContent = "No se pudo comprobar el saldo.";
    badge.textContent = "";
    amountInput.setCustomValidity("Error al comprobar saldo.");
    setBtnState(true, expectedBtnText);
  }
}

async function openNewExpenseModal() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const employees = await fetchEmployees();
    const categories = await fetchCategories();

    let employeeOptions = `<option value="">Selecciona un empleado</option>`;
    for (const employee of employees) {
      const fullName = employee.name || `${employee.first_name} ${employee.last_name}`;
      employeeOptions += `<option value="${employee.id}">${escapeHTML(fullName)}</option>`;
    }
    let categoryOptions = `<option value="">Selecciona una categoría</option>`;
    for (const category of categories) {
      categoryOptions += `<option value="${category.id}">${escapeHTML(category.name)}</option>`;
    }

    const form = document.createElement("form");
    form.innerHTML = `
      <div class="form-row">
        <div class="form-field"><label>Empleado</label><select name="employeeId" required>${employeeOptions}</select></div>
        <div class="form-field"><label>Categoría</label><select name="categoryId" required>${categoryOptions}</select></div>
      </div>
      <div class="form-field"><label>Concepto</label><input name="concept" type="text" required placeholder="Ej. Abono tren" /></div>
      <div class="form-row">
        <div class="form-field"><label>Importe (€)</label><input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" /></div>
        <div class="form-field"><label>Fecha</label><input name="date" type="date" value="${today}" required /></div>
      </div>
      <div class="form-field"><label>Justificante</label><input name="receipt" type="file" accept=".pdf,image/*" /></div>
      <div class="gastos-balance" id="gasto-balance">
        <span class="material-symbols-outlined gastos-balance__icon">info</span>
        <div class="gastos-balance__text"><strong id="gasto-balance-title">Control transaccional de saldo</strong><span id="gasto-balance-detail">Selecciona un empleado y una categoría.</span></div>
        <span class="gastos-balance__badge" id="gasto-balance-badge"></span>
      </div>
    `;
    
    form.elements.employeeId.addEventListener("change", () => updateExpenseBalanceBox(form));
    form.elements.categoryId.addEventListener("change", () => updateExpenseBalanceBox(form));
    form.elements.amount.addEventListener("input", () => updateExpenseBalanceBox(form));

    const observer = new MutationObserver(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Registrar gasto");
      if (btn && !btn.dataset.bloqueado) {
        btn.disabled = true; 
        btn.style.opacity = "0.5"; 
        btn.style.pointerEvents = "none"; 
        btn.dataset.bloqueado = "true";
        observer.disconnect(); 
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const result = await openDynamicModal({ title: "Registrar nuevo gasto", subtitle: "Imputa un recibo fiscal.", icon: "receipt_long", content: form, confirmText: "Registrar gasto" });
    observer.disconnect();
    
 
    setTimeout(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === "Registrar gasto");
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
            btn.style.cursor = "pointer";
            delete btn.dataset.bloqueado;
        }
    }, 50);

    if (!result.confirmed) return;

    await createExpense(result.data);
    gastosFilter = "all"; gastosPage = 1;
    await loadExpenses();
  } catch (error) {
    console.error(error);
    alert("No se pudieron cargar los datos. Revisa la consola.");
  }
}

async function openEditExpenseModal(expense) {
  try {
    const employees = await fetchEmployees();
    const categories = await fetchCategories();

    let employeeOptions = `<option value="">Selecciona un empleado</option>`;
    for (const e of employees) {
      const fullName = e.name || `${e.first_name} ${e.last_name}`;
      const selected = e.id === expense.employee.id ? "selected" : "";
      employeeOptions += `<option value="${e.id}" ${selected}>${escapeHTML(fullName)}</option>`;
    }
    let categoryOptions = `<option value="">Selecciona una categoría</option>`;
    for (const c of categories) {
      const selected = c.name === expense.category ? "selected" : "";
      categoryOptions += `<option value="${c.id}" ${selected}>${escapeHTML(c.name)}</option>`;
    }

    // LÓGICA PARA MOSTRAR EL ARCHIVO ACTUAL
    let receiptHtml = "";
    if (expense.receiptUrl && expense.receiptUrl !== "#" && expense.receiptUrl.trim() !== "") {
        let urlSegura = expense.receiptUrl;
        if (!urlSegura.startsWith("http")) {
            urlSegura = "http://" + urlSegura;
        }
        
        receiptHtml = `
            <div style="margin-bottom: 15px; padding: 10px; background-color: #e3f2fd; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
                <span class="material-symbols-outlined" style="color: #007bff;">description</span>
                <span style="font-size: 14px; color: #333;">Este gasto ya tiene un justificante adjunto.</span>
                <a href="${urlSegura}" target="_blank" style="color: #007bff; font-weight: bold; text-decoration: underline;">Ver archivo</a>
            </div>
        `;
    } else {
        receiptHtml = `<div style="margin-bottom: 15px; font-size: 14px; color: #666;">Este gasto no tiene ningún justificante subido.</div>`;
    }

    const form = document.createElement("form");
    form.innerHTML = `
      <div class="form-row">
        <div class="form-field"><label>Empleado</label><select name="employeeId" required>${employeeOptions}</select></div>
        <div class="form-field"><label>Categoría</label><select name="categoryId" required>${categoryOptions}</select></div>
      </div>
      <div class="form-field"><label>Concepto</label><input name="concept" type="text" required value="${escapeHTML(expense.concept)}" /></div>
      <div class="form-row">
        <div class="form-field"><label>Importe (€)</label><input name="amount" type="number" min="0.01" step="0.01" required value="${expense.amount}" /></div>
        <div class="form-field"><label>Fecha</label><input name="date" type="date" value="${expense.date}" required /></div>
      </div>

      <!-- AQUÍ ESTÁ EL BLOQUE NUEVO CON EL ARCHIVO ACTUAL -->
      <div class="form-field">
        ${receiptHtml}
        <label style="margin-top: 5px; display: block;">Subir nuevo justificante (opcional)</label>
        <input name="receipt" type="file" accept=".pdf,image/*" style="margin-top: 5px;" />
      </div>

      <div class="gastos-balance" id="gasto-balance">
        <span class="material-symbols-outlined gastos-balance__icon">info</span>
        <div class="gastos-balance__text"><strong id="gasto-balance-title">Control transaccional de saldo</strong><span id="gasto-balance-detail">Comprobando saldo...</span></div>
        <span class="gastos-balance__badge" id="gasto-balance-badge"></span>
      </div>
    `;
    
    form.elements.employeeId.addEventListener("change", () => updateExpenseBalanceBox(form));
    form.elements.categoryId.addEventListener("change", () => updateExpenseBalanceBox(form));
    form.elements.amount.addEventListener("input", () => updateExpenseBalanceBox(form));

    const observer = new MutationObserver(() => {
      document.querySelectorAll("button").forEach(btn => {
        if (btn.textContent.trim() === "Guardar cambios" && !btn.dataset.bloqueado) {
          btn.disabled = true; btn.style.opacity = "0.5"; btn.style.pointerEvents = "none"; btn.dataset.bloqueado = "true";
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => updateExpenseBalanceBox(form), 200);

    const result = await openDynamicModal({ title: "Editar gasto", subtitle: "Modifica los datos.", icon: "edit", content: form, confirmText: "Guardar cambios" });
    observer.disconnect();
    if (!result.confirmed) return;

    await updateExpense(expense.id, result.data);
    await loadExpenses();
  } catch (error) {
    console.error(error);
    alert("No se pudo editar el gasto.");
  }
}

async function handleReject(expense) {
  const form = document.createElement("form");
  form.innerHTML = `<div class="form-field"><label>Motivo del rechazo</label><textarea name="reason" required placeholder="Ej. Excede el cupo"></textarea></div>`;
  const result = await openDynamicModal({ title: "Rechazar gasto", subtitle: expense.employee.name + " · " + expense.concept, icon: "block", content: form, confirmText: "Rechazar gasto" });
  if (!result.confirmed) return;
  await rejectExpense(expense.id, result.data.reason);
  await loadExpenses();
}

async function handleTableClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "retry") { loadExpenses(); return; }
  const expense = gastosList.find((item) => String(item.id) === button.dataset.id);
  if (!expense) return;

  try {
    if (action === "approve") { 
      button.disabled = true; await approveExpense(expense.id); await loadExpenses(); 
    }
    else if (action === "reject") {
       await handleReject(expense); 
    }
    else if (action === "edit") { 
      await openEditExpenseModal(expense); 
    } else if (action === "delete") {
        // Creamos el elemento HTML que espera el modal
        const deleteContent = document.createElement("div");
        deleteContent.style.padding = "10px 0";
        deleteContent.style.fontSize = "15px";
        deleteContent.innerHTML = `¿Estás seguro de que quieres eliminar el gasto <strong>${escapeHTML(expense.concept)}</strong> de <strong>${formatEuros(expense.amount)}</strong>?`;

        const result = await openDynamicModal({
            title: "Eliminar gasto",
            subtitle: "Esta acción no se puede deshacer.",
            icon: "delete",
            content: deleteContent,
            confirmText: "Sí, eliminar gasto"
        });

        if (result.confirmed) {
            button.disabled = true;
            await deleteExpense(expense.id);
            await loadExpenses();
        }
    }
  } catch (error) {
    console.error(error);
    button.disabled = false;
    alert("No se pudo completar la acción.");
  }
}

function initExpensesView() {
  gastosList = []; gastosFilter = "all"; gastosSearch = ""; gastosPage = 1;
  gastosBody = document.getElementById("expenses-body");
  gastosInfo = document.getElementById("expenses-info");
  gastosPrevBtn = document.getElementById("page-prev");
  gastosNextBtn = document.getElementById("page-next");

  document.getElementById("btn-nuevo-gasto").addEventListener("click", openNewExpenseModal);
  gastosBody.addEventListener("click", handleTableClick);

  document.querySelectorAll("[data-filter]").forEach((tab) => {
    tab.addEventListener("click", () => { gastosFilter = tab.dataset.filter; gastosPage = 1; renderExpensesTable(); });
  });
  document.getElementById("expenses-search").addEventListener("input", (event) => { gastosSearch = event.target.value; gastosPage = 1; renderExpensesTable(); });
  gastosPrevBtn.addEventListener("click", () => { gastosPage--; renderExpensesTable(); });
  gastosNextBtn.addEventListener("click", () => { gastosPage++; renderExpensesTable(); });

  loadExpenses();
}