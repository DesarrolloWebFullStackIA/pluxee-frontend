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
  element.dataset.eur = amount;
  element.textContent = formatEuros(amount);
}


function getVisibleExpenses() {
  const text = gastosSearch.toLowerCase();
  const result = [];

  for (const expense of gastosList) {

    if (gastosFilter !== "all" && expense.status !== gastosFilter) {
      continue;
    }

   
    const name = expense.employee.name.toLowerCase();
    const concept = expense.concept.toLowerCase();

    if (text !== "" && !name.includes(text) && !concept.includes(text)) {
      continue;
    }

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

  if (!receiptUrl.startsWith("http")) {
    receiptUrl = "#";
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
      <td class="gastos-amount is-right">
        <span data-eur="${expense.amount}" data-decimals="2">${formatEuros(expense.amount)}</span>
      </td>
      <td class="is-center">
        <a class="gastos-receipt" href="${receiptUrl}" target="_blank" rel="noopener noreferrer">
          <span class="material-symbols-outlined">${receiptIcon}</span>
          <span>${receiptText}</span>
        </a>
      </td>
      <td class="is-center">
        <span class="gastos-badge gastos-badge--${expense.status}">${GASTOS_STATUS_TEXT[expense.status]}</span>
      </td>
      <td class="is-right">${actions}</td>
    </tr>`;
}


function updateSummary() {
  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let totalAmount = 0;
  let pendingAmount = 0;

  for (const expense of gastosList) {
    totalAmount += Number(expense.amount);

    if (expense.status === "pending") {
      pending++;
      pendingAmount += Number(expense.amount);
    } else if (expense.status === "approved") {
      approved++;
    } else if (expense.status === "rejected") {
      rejected++;
    }
  }

  const counts = {
    all: gastosList.length,
    pending: pending,
    approved: approved,
    rejected: rejected
  };

  // En el HTML hay elementos con data-count="pending", data-count="all"...
  document.querySelectorAll("[data-count]").forEach((element) => {
    element.textContent = counts[element.dataset.count];
  });

  setAmount("kpi-total-amount", totalAmount);
  setAmount("kpi-pending-amount", pendingAmount);
}


function renderExpensesTable() {
  const visible = getVisibleExpenses();


  const totalPages = Math.max(1, Math.ceil(visible.length / GASTOS_PER_PAGE));

  if (gastosPage > totalPages) {
    gastosPage = totalPages;
  }

  const start = (gastosPage - 1) * GASTOS_PER_PAGE;
  const pageItems = visible.slice(start, start + GASTOS_PER_PAGE);


  let html = "";

  for (const expense of pageItems) {
    html += buildExpenseRow(expense);
  }

  if (html === "") {
    html = `<tr><td colspan="8" class="gastos-state">No hay gastos que mostrar.</td></tr>`;
  }

  gastosBody.innerHTML = html;

 
  if (visible.length > 0) {
    gastosInfo.textContent = "Mostrando " + (start + 1) + "-" + (start + pageItems.length) + " de " + visible.length + " transacciones";
  } else {
    gastosInfo.textContent = "Sin transacciones";
  }

  gastosPrevBtn.disabled = gastosPage <= 1;
  gastosNextBtn.disabled = gastosPage >= totalPages;

  
  document.querySelectorAll("[data-filter]").forEach((tab) => {
    const isActive = tab.dataset.filter === gastosFilter;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-pressed", isActive);
  });

  updateSummary();


  if (typeof renderMoney === "function") {
    renderMoney();
  }
}




async function loadExpenses() {
  gastosBody.innerHTML = `<tr><td colspan="8" class="gastos-state">Cargando gastos…</td></tr>`;

  try {
    gastosList = await getExpenses();


    if (!document.getElementById("expenses-body")) {
      return;
    }

    renderExpensesTable();
  } catch (error) {
    console.error(error);
    gastosBody.innerHTML = `
      <tr>
        <td colspan="8" class="gastos-state">
          No se pudieron cargar los gastos.
          <button type="button" class="gastos-link" data-action="retry">Reintentar</button>
        </td>
      </tr>`;
  }
}



async function openNewExpenseModal() {
  const today = new Date().toISOString().slice(0, 10);


  let employeeOptions = `<option value="">Selecciona un empleado</option>`;

  for (const employee of expenseEmployees) {
    employeeOptions += `<option value="${employee.id}">${escapeHTML(employee.name)}</option>`;
  }

  let categoryOptions = `<option value="">Selecciona una categoría</option>`;

  for (const category of expenseCategories) {
    categoryOptions += `<option value="${category.id}">${escapeHTML(category.name)}</option>`;
  }


  const form = document.createElement("form");
  form.innerHTML = `
    <div class="form-row">
      <div class="form-field">
        <label for="gasto-employee">Empleado</label>
        <select id="gasto-employee" name="employeeId" required>${employeeOptions}</select>
      </div>
      <div class="form-field">
        <label for="gasto-category">Categoría</label>
        <select id="gasto-category" name="categoryId" required>${categoryOptions}</select>
      </div>
    </div>

    <div class="form-field">
      <label for="gasto-concept">Concepto del gasto</label>
      <input id="gasto-concept" name="concept" type="text" required placeholder="Ej. Abono tren o almuerzo de trabajo" />
    </div>

    <div class="form-row">
      <div class="form-field">
        <label for="gasto-amount">Importe (€)</label>
        <input id="gasto-amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" />
        <small class="gastos-hint" id="gasto-amount-mxn"></small>
      </div>
      <div class="form-field">
        <label for="gasto-date">Fecha del comprobante</label>
        <input id="gasto-date" name="date" type="date" value="${today}" required />
      </div>
    </div>

    <div class="form-field">
      <label for="gasto-receipt">Justificante adjunto</label>
      <input id="gasto-receipt" name="receipt" type="file" accept=".pdf,image/*" />
    </div>
  `;

  
  if (typeof bindConversionPreview === "function") {
    bindConversionPreview(
      form.querySelector("#gasto-amount"),
      form.querySelector("#gasto-amount-mxn")
    );
  }

 
  const result = await openDynamicModal({
    title: "Registrar nuevo gasto",
    subtitle: "Imputa un recibo fiscal al saldo disponible del empleado.",
    icon: "receipt_long",
    content: form,
    confirmText: "Registrar gasto"
  });


  if (!result.confirmed) {
    return;
  }

  try {
    await createExpense(result.data);

   
    gastosFilter = "all";
    gastosPage = 1;
    await loadExpenses();
  } catch (error) {
    console.error(error);
    alert("No se pudo registrar el gasto. Inténtalo de nuevo.");
  }
}


async function handleReject(expense) {
  const form = document.createElement("form");
  form.innerHTML = `
    <div class="form-field">
      <label for="gasto-reason">Motivo del rechazo</label>
      <textarea id="gasto-reason" name="reason" required placeholder="Ej. Excede el cupo mensual"></textarea>
    </div>
  `;

  const result = await openDynamicModal({
    title: "Rechazar gasto",
    subtitle: expense.employee.name + " · " + expense.concept,
    icon: "block",
    content: form,
    confirmText: "Rechazar gasto"
  });

  if (!result.confirmed) {
    return;
  }

  await rejectExpense(expense.id, result.data.reason);
  await loadExpenses();
}


async function handleTableClick(event) {

  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "retry") {
    loadExpenses();
    return;
  }

 
  const expense = gastosList.find((item) => String(item.id) === button.dataset.id);

  if (!expense) {
    return;
  }

  try {
    if (action === "approve") {
      button.disabled = true;
      await approveExpense(expense.id);
      await loadExpenses();
    } else if (action === "reject") {
      await handleReject(expense);
    }
  } catch (error) {
    console.error(error);
    button.disabled = false;
    alert("No se pudo completar la acción. Inténtalo de nuevo.");
  }
}



function initGastosView() {

  gastosList = [];
  gastosFilter = "all";
  gastosSearch = "";
  gastosPage = 1;

  // Guardamos los elementos del HTML
  gastosBody = document.getElementById("expenses-body");
  gastosInfo = document.getElementById("expenses-info");
  gastosPrevBtn = document.getElementById("page-prev");
  gastosNextBtn = document.getElementById("page-next");

  
  document.getElementById("btn-nuevo-gasto").addEventListener("click", openNewExpenseModal);


  gastosBody.addEventListener("click", handleTableClick);

  // Pestañas de filtro
  document.querySelectorAll("[data-filter]").forEach((tab) => {
    tab.addEventListener("click", () => {
      gastosFilter = tab.dataset.filter;
      gastosPage = 1;
      renderExpensesTable();
    });
  });

  // Buscador
  document.getElementById("expenses-search").addEventListener("input", (event) => {
    gastosSearch = event.target.value;
    gastosPage = 1;
    renderExpensesTable();
  });

  // Paginación
  gastosPrevBtn.addEventListener("click", () => {
    gastosPage--;
    renderExpensesTable();
  });

  gastosNextBtn.addEventListener("click", () => {
    gastosPage++;
    renderExpensesTable();
  });

 
  loadExpenses();
}