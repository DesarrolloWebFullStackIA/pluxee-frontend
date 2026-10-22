(() => {
	"use strict";

	let activeCatalog = null;
	let currencyListenerAttached = false;
	const GLOBAL_STORE_STORAGE_KEY = "pluxee_store_v2";
	const MOCK_EXPENSES_STORAGE_KEY = "pluxee_mock_expenses_v1";

	const ICON_OPTIONS = [
		{ icon: "restaurant", label: "Comida", color: "comida" },
		{ icon: "directions_bus", label: "Transporte", color: "transporte" },
		{ icon: "school", label: "Formación", color: "formacion" },
		{ icon: "health_and_safety", label: "Salud", color: "salud" },
		{ icon: "child_care", label: "Guardería", color: "guarderia" },
		{ icon: "laptop_mac", label: "Tecnología", color: "comida" },
		{ icon: "fitness_center", label: "Gimnasio", color: "formacion" },
		{ icon: "translate", label: "Idiomas", color: "transporte" },
		{ icon: "home_work", label: "Hogar", color: "guarderia" },
		{ icon: "category", label: "General", color: "salud" }
	];

	const ICON_ALIAS_MAP = {
		utensils: "restaurant",
		restaurant: "restaurant",
		bus: "directions_bus",
		directions_bus: "directions_bus",
		"book-open": "school",
		school: "school",
		"heart-pulse": "health_and_safety",
		health_and_safety: "health_and_safety",
		baby: "child_care",
		child_care: "child_care",
		dumbbell: "fitness_center",
		fitness_center: "fitness_center"
	};

	function formatMoney(value) {
		const amount = Number(value) || 0;
		return typeof window.formatMoney === "function"
			? window.formatMoney(amount)
			: new Intl.NumberFormat("es-ES", {
				style: "currency",
				currency: "EUR",
				maximumFractionDigits: 2
			}).format(amount);
	}

	function getIconOption(icon, name) {
		const resolvedIcon = (ICON_ALIAS_MAP[icon] || icon || "").trim().toLowerCase();
		const directMatch = ICON_OPTIONS.find((option) => option.icon === resolvedIcon);
		if (directMatch) return directMatch;

		if (name) {
			const n = String(name).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
			if (n.includes("comida") || n.includes("restauran") || n.includes("aliment")) return ICON_OPTIONS[0];
			if (n.includes("transporte") || n.includes("movilidad") || n.includes("bus") || n.includes("tren")) return ICON_OPTIONS[1];
			if (n.includes("formacion") || n.includes("curso") || n.includes("estudio")) return ICON_OPTIONS[2];
			if (n.includes("salud") || n.includes("medic") || n.includes("bienestar")) return ICON_OPTIONS[3];
			if (n.includes("guarderia") || n.includes("infantil") || n.includes("hijos")) return ICON_OPTIONS[4];
			if (n.includes("tecnolog") || n.includes("laptop") || n.includes("equipo")) return ICON_OPTIONS[5];
			if (n.includes("gimnas") || n.includes("gym") || n.includes("fit") || n.includes("deport")) return ICON_OPTIONS[6];
			if (n.includes("idioma") || n.includes("ingles")) return ICON_OPTIONS[7];
			if (n.includes("hogar") || n.includes("casa")) return ICON_OPTIONS[8];
		}

		return ICON_OPTIONS[ICON_OPTIONS.length - 1];
	}

	function getCategoryData(card) {
		return JSON.parse(card.dataset.category);
	}

	function showMessage(message, isError = false) {
		const feedback = document.getElementById("category-feedback");
		if (!feedback) return;
		feedback.textContent = message;
		feedback.hidden = !message;
		feedback.classList.toggle("is-error", isError);
	}

	function getDashboardBudget() {
		try {
			const stored = window.localStorage?.getItem(GLOBAL_STORE_STORAGE_KEY);
			if (stored) {
				const globalBudgetCap = Number(JSON.parse(stored).globalBudgetCap);
				if (Number.isFinite(globalBudgetCap) && globalBudgetCap > 0) {
					return globalBudgetCap;
				}
			}
		} catch (error) {
			console.error("No se pudo leer el presupuesto global guardado.", error);
		}

		const store = window.PluxeeStore;
		return store && typeof store.getGlobalBudgetCap === "function"
			? Number(store.getGlobalBudgetCap()) || 45000
			: 45000;
	}

	function normalizeCategoryName(value) {
		return String(value || "")
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLocaleLowerCase("es")
			.replace(/[^a-z0-9]+/g, " ")
			.trim();
	}

	function getApprovedMockExpenseAmount(categoryName) {
		try {
			const stored = window.localStorage?.getItem(MOCK_EXPENSES_STORAGE_KEY);
			if (!stored) return 0;
			const expenses = JSON.parse(stored);
			if (!Array.isArray(expenses)) {
				throw new TypeError("El almacenamiento de gastos no contiene una lista.");
			}

			const normalizedCategory = normalizeCategoryName(categoryName);
			return expenses.reduce((total, expense) => {
				if (!["approved", "aprobado"].includes(String(expense.status).toLowerCase())) {
					return total;
				}
				const expenseCategory = typeof expense.category === "string"
					? expense.category
					: expense.category?.name;
				const normalizedExpenseCategory = normalizeCategoryName(expenseCategory);
				const amount = Number(expense.amount);
				if (!normalizedCategory || !normalizedExpenseCategory || !Number.isFinite(amount) || amount <= 0) {
					return total;
				}
				const matches = normalizedExpenseCategory === normalizedCategory
					|| normalizedCategory.includes(normalizedExpenseCategory);
				return matches ? total + amount : total;
			}, 0);
		} catch (error) {
			console.error("No se pudieron leer los gastos aprobados guardados.", error);
			return 0;
		}
	}

	function renderCategory(category, catalog) {
		const card = document.createElement("article");
		const iconOption = getIconOption(category.icon, category.name);
		card.className = "category-card category-card--custom";
		card.dataset.categoryCard = "true";
		card.innerHTML = `
			<div class="flex flex-col gap-3.5">
				<div class="category-card__header">
					<div class="category-card__identity">
						<div class="category-icon-box ${iconOption.color}">
							<span class="material-symbols-outlined">${iconOption.icon}</span>
						</div>
						<div class="min-w-0">
							<h3 class="category-card__title"></h3>
							<span class="category-card__type text-xs text-slate-500 font-medium">${iconOption.label}</span>
						</div>
					</div>
				</div>
				<p class="category-card__description"></p>
			</div>
			<div class="category-card__budget">
				<div class="flex items-center justify-between text-xs">
					<span class="text-slate-500">Presupuesto asignado:</span>
					<strong class="category-budget-assigned text-slate-900"></strong>
				</div>
				<div class="flex items-center justify-between text-xs mt-3">
					<span class="text-slate-500">Gasto ejecutado:</span>
					<span class="category-budget-spent font-semibold"></span>
				</div>
				<div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-3">
					<div class="category-progress h-2 rounded-full"></div>
				</div>
				<div class="flex items-center justify-between text-xs text-slate-500 pt-2">
					<span>Restante: <strong class="category-budget-available text-slate-900"></strong></span>
					<span class="category-benefits-count"></span>
				</div>
			</div>
			<div class="category-card__actions">
				<button data-category-action="edit" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 transition-colors" type="button">Editar</button>
				<button data-category-action="delete" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors" type="button">Eliminar</button>
			</div>
		`;
		catalog.insertBefore(card, document.getElementById("btn-nueva-categoria-placeholder"));
		applyCategoryToCard(card, category);
	}

	function applyCategoryToCard(card, category) {
		const budget = Number(category.budget) || 0;
		const databaseSpent = Number(category.database_spent_amount ?? category.spent_amount) || 0;
		category.database_spent_amount = databaseSpent;
		const spent = databaseSpent + getApprovedMockExpenseAmount(category.name);
		category.spent_amount = spent;
		const percent = budget > 0 ? (spent / budget) * 100 : 0;
		const boundedPercent = Math.min(100, Math.max(0, percent));
		const iconOption = getIconOption(category.icon);

		card.dataset.categoryId = category.id;
		card.dataset.category = JSON.stringify(category);
		card.hidden = false;
		card.querySelector("h3").textContent = category.name;
		card.querySelector(".category-card__type").textContent = iconOption.label;
		card.querySelector(".category-card__description").textContent =
			category.description || "Categoría de beneficios de la empresa.";
		card.querySelector(".category-icon-box").className = `category-icon-box ${iconOption.color}`;
		card.querySelector(".category-icon-box .material-symbols-outlined").textContent = iconOption.icon;

		card.querySelector(".category-budget-assigned").textContent = formatMoney(budget);
		const spentText = `${formatMoney(spent)} (${percent.toFixed(1)}%)`;
		const spentElement = card.querySelector(".category-budget-spent");
		spentElement.textContent = spentText;
		const progress = card.querySelector(".category-progress");
		progress.style.width = `${boundedPercent}%`;
		progress.className = `category-progress h-2 rounded-full ${getSemaphoreClass(percent)}`;
		card.querySelector(".category-budget-available").textContent = formatMoney(Math.max(0, budget - spent));
		card.querySelector(".category-benefits-count").textContent =
			`${Number(category.benefits_count) || 0} asignaciones`;
	}

	function getSemaphoreClass(percent) {
		const roundedPercent = Math.round(percent * 10) / 10;
		if (roundedPercent < 70) return "semaphore-green";
		if (roundedPercent <= 90) return "semaphore-amber";
		return "semaphore-red";
	}

	function updateCategoryMetrics(catalog) {
		const categories = [...catalog.querySelectorAll(":scope > [data-category-card]")];
		const categoryData = categories.map(getCategoryData);
		const totalBudget = categoryData.reduce((sum, category) => sum + (Number(category.budget) || 0), 0);
		const totalSpent = categoryData.reduce((sum, category) => sum + (Number(category.spent_amount) || 0), 0);
		const remaining = Math.max(0, totalBudget - totalSpent);
		const executionPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

		const count = document.getElementById("categorias-kpi-count");
		const total = document.getElementById("categorias-kpi-budget");
		const totalDetail = document.getElementById("categorias-kpi-budget-detail");
		const remainingElement = document.getElementById("categorias-kpi-remaining");
		const spentElement = document.getElementById("categorias-kpi-spent");
		const semaphore = document.getElementById("categorias-kpi-semaphore");
		const semaphoreBar = document.getElementById("categorias-semaphore-bar");
		const semaphoreFill = document.getElementById("categorias-semaphore-fill");
		const catalogCount = document.getElementById("categorias-count");
		const boundedExecutionPercent = Math.min(100, Math.max(0, executionPercent));
		const roundedExecutionPercent = Math.round(executionPercent * 10) / 10;
		const semaphoreColor = roundedExecutionPercent < 70
			? "text-emerald-700"
			: roundedExecutionPercent <= 90
				? "text-amber-700"
				: "text-rose-700";
		const semaphoreStatus = roundedExecutionPercent < 70
			? "verde"
			: roundedExecutionPercent <= 90
				? "amarillo"
				: "rojo";

		if (count) count.textContent = `${categories.length} categorías`;
		if (total) total.textContent = formatMoney(totalBudget);
		if (totalDetail) totalDetail.textContent = "Suma del presupuesto asignado a categorías";
		if (remainingElement) remainingElement.textContent = formatMoney(remaining);
		if (spentElement) spentElement.textContent = `Gastado: ${formatMoney(totalSpent)} · ${executionPercent.toFixed(1)}% ejecutado`;
		if (semaphore) {
			semaphore.textContent = `${executionPercent.toFixed(1)}% ejecutado · ${semaphoreStatus}`;
			semaphore.className = `text-xs font-semibold ${semaphoreColor}`;
		}
		if (semaphoreBar) {
			semaphoreBar.setAttribute("aria-valuenow", boundedExecutionPercent.toFixed(1));
			semaphoreBar.setAttribute("aria-valuetext", `${executionPercent.toFixed(1)}% ejecutado, ${semaphoreStatus}`);
		}
		if (semaphoreFill) {
			semaphoreFill.style.width = `${boundedExecutionPercent}%`;
			semaphoreFill.className = `category-semaphore__fill ${getSemaphoreClass(executionPercent)}`;
		}
		if (catalogCount) catalogCount.textContent = `${categories.length} categorías`;

		if (typeof window.renderMoney === "function") window.renderMoney(catalog);
	}

	function createCategoryForm(category, currentCategories, remaining) {
		const form = document.createElement("form");
		const assigned = currentCategories.reduce((sum, item) => sum + (Number(item.budget) || 0), 0);
		const spent = currentCategories.reduce((sum, item) => sum + (Number(item.spent_amount) || 0), 0);
		const currentBudget = Number(category?.budget) || 0;
		const globalBudget = getDashboardBudget();
		const maximumBudget = remaining + currentBudget;

		form.innerHTML = `
			<div id="category-form-alert" class="modal-form-alert" hidden role="alert">
				<span class="material-symbols-outlined" style="font-size: 18px;" aria-hidden="true">error</span>
				<span>Por favor, completa todos los campos obligatorios marcados con asterisco (*).</span>
			</div>
			<div class="form-field">
				<label for="category-name">Nombre de la categoría <span class="required-asterisk">*</span></label>
				<input id="category-name" name="name" type="text" required maxlength="100" placeholder="Ej. Bienestar y gimnasio" />
			</div>
			<div class="form-row">
				<div class="form-field">
					<label for="category-icon">Icono identificador <span class="required-asterisk">*</span></label>
					<select id="category-icon" name="icon" required>
						${ICON_OPTIONS.map((option) => `<option value="${option.icon}">${option.label}</option>`).join("")}
					</select>
				</div>
				<div class="form-field">
					<label for="category-budget">Presupuesto asignado (EUR) <span class="required-asterisk">*</span></label>
					<input id="category-budget" name="budget" type="number" min="0.01" max="${maximumBudget}" step="0.01" required placeholder="150" />
				</div>
			</div>
			<div class="form-field">
				<label for="category-description">Descripción</label>
				<textarea id="category-description" name="description" rows="3" maxlength="255" placeholder="Describe qué incluye este beneficio."></textarea>
			</div>
			<div class="category-form-summary">
				<p><span>Límite global del Dashboard</span><strong>${formatMoney(globalBudget)}</strong></p>
				<p><span>Presupuesto asignado en categorías</span><strong>${formatMoney(assigned)}</strong></p>
				<p><span>Gasto ejecutado</span><strong data-category-form-spent>${formatMoney(spent)}</strong></p>
				<p><span>Dinero restante disponible para asignar</span><strong>${formatMoney(remaining)}</strong></p>
				${remaining > 0 || category ? "" : '<p class="text-rose-700">No queda dinero disponible para crear otra categoría.</p>'}
				<small>El importe introducido se guarda en euros; se muestra en la moneda seleccionada con el botón global.</small>
			</div>
		`;

		form.elements.namedItem("name").value = category?.name || "";
		form.elements.namedItem("icon").value = (ICON_ALIAS_MAP[category?.icon] || category?.icon) || ICON_OPTIONS[0].icon;
		form.elements.namedItem("budget").value = category ? currentBudget : "";
		form.elements.namedItem("description").value = category?.description || "";

		const budgetInput = form.elements.namedItem("budget");
		budgetInput.addEventListener("input", () => {
			const proposed = Number(budgetInput.value) || 0;
			budgetInput.setCustomValidity(
				proposed > maximumBudget
					? `El presupuesto no puede superar el importe disponible (${formatMoney(maximumBudget)}).`
					: ""
			);
		});
		return form;
	}

	function getErrorMessage(error) {
		return error.userMessage
			|| (window.api && window.api.getErrorMessage(error))
			|| error.message
			|| "No se pudo completar la operación.";
	}

	async function openCategoryForm(catalog, category = null) {
		if (typeof window.openDynamicModal !== "function") {
			showMessage("No está disponible el formulario de categorías.", true);
			return;
		}

		const currentCategories = [...catalog.querySelectorAll(":scope > [data-category-card]")].map(getCategoryData);
		const totalBudget = currentCategories.reduce((sum, item) => sum + (Number(item.budget) || 0), 0);
		const remaining = Math.max(0, getDashboardBudget() - totalBudget);
		if (!category && remaining <= 0) {
			showMessage("No queda dinero disponible para crear otra categoría.", true);
			return;
		}
		const form = createCategoryForm(category, currentCategories, remaining);
		const mode = category ? "edit" : "create";
		const resultPromise = window.openDynamicModal({
			title: category ? "Editar categoría" : "Nueva categoría",
			subtitle: category
				? "Modifica los datos sin superar el presupuesto restante disponible."
				: "El presupuesto solicitado no puede superar el dinero restante.",
			content: form,
			confirmText: category ? "Guardar cambios" : "Crear categoría",
			cancelText: "Cancelar",
			size: "medium",
			icon: "category"
		});

		const nameInput = form.elements.namedItem("name");
		nameInput.addEventListener("input", () => {
			const normalizedName = nameInput.value.trim().toLocaleLowerCase("es");
			const duplicate = currentCategories.some((item) =>
				item.id !== category?.id && item.name.trim().toLocaleLowerCase("es") === normalizedName
			);
			nameInput.setCustomValidity(duplicate ? "Ya existe una categoría con ese nombre." : "");
		});

		const result = await resultPromise;
		if (!result.confirmed) return;

		const iconOption = getIconOption(result.data.icon, result.data.name);
		const payload = {
			name: result.data.name.trim(),
			description: result.data.description.trim() || null,
			icon: result.data.icon,
			color: iconOption.color,
			budget: Number(result.data.budget),
			active: category ? category.active : true
		};

		try {
			const requestConfig = {
				headers: { "X-Global-Budget-Cap": String(getDashboardBudget()) }
			};
			const saved = category
				? await window.api.put(`/categories/${category.id}`, payload, requestConfig)
				: await window.api.post("/categories", payload, requestConfig);
			const oldCard = category && catalog.querySelector(`[data-category-id="${category.id}"]`);
			if (oldCard) oldCard.remove();
			renderCategory(saved, catalog);
			updateCategoryMetrics(catalog);
			showMessage(category ? "Categoría actualizada correctamente." : "Categoría creada correctamente.");
		} catch (error) {
			console.error("No se pudo guardar la categoría.", error);
			showMessage(getErrorMessage(error), true);
		}
	}

	async function deleteCategory(catalog, card) {
		if (typeof window.openDynamicModal !== "function") {
			showMessage("No está disponible el formulario de confirmación.", true);
			return;
		}

		const category = getCategoryData(card);
		const content = document.createElement("div");
		content.className = "category-delete-confirmation";
		const warning = document.createElement("span");
		warning.className = "material-symbols-outlined";
		warning.setAttribute("aria-hidden", "true");
		warning.textContent = "warning";
		const message = document.createElement("p");
		message.append("¿Seguro que quieres eliminar ");
		const name = document.createElement("strong");
		name.textContent = category.name;
		message.append(name, "? Esta acción no se puede deshacer.");
		content.append(warning, message);

		const result = await window.openDynamicModal({
			title: "Eliminar categoría",
			subtitle: "Confirma si deseas continuar.",
			content,
			confirmText: "Sí, eliminar",
			cancelText: "Cancelar",
			size: "small",
			icon: "delete"
		});
		if (!result.confirmed) return;

		try {
			await window.api.delete(`/categories/${category.id}`);
			card.remove();
			updateCategoryMetrics(catalog);
			showMessage("Categoría eliminada correctamente.");
		} catch (error) {
			console.error("No se pudo eliminar la categoría.", error);
			showMessage(getErrorMessage(error), true);
		}
	}

	async function loadCategories(catalog) {
		const addCard = document.getElementById("btn-nueva-categoria-placeholder");
		catalog.replaceChildren(addCard);
		try {
			const categories = await window.api.get("/categories?include_inactive=true");
			categories.forEach((category) => renderCategory(category, catalog));
			updateCategoryMetrics(catalog);
		} catch (error) {
			console.error("No se pudieron cargar las categorías.", error);
			showMessage(getErrorMessage(error), true);
		}
	}

	function initCategoriasView() {
		const catalog = document.getElementById("catalogo-categorias");
		const addButton = document.getElementById("btn-nueva-categoria");
		const addCard = document.getElementById("btn-nueva-categoria-placeholder");

		if (!catalog || !addButton || !addCard || !window.api) {
			console.error("No se encontraron los controles o el servicio API de categorías.");
			return;
		}

		activeCatalog = catalog;
		addButton.addEventListener("click", () => openCategoryForm(catalog));
		addCard.addEventListener("click", () => openCategoryForm(catalog));
		addCard.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				openCategoryForm(catalog);
			}
		});
		catalog.addEventListener("click", (event) => {
			const action = event.target.closest("[data-category-action]");
			if (!action || !catalog.contains(action)) return;
			const card = action.closest("[data-category-card]");
			if (!card) return;
			if (action.dataset.categoryAction === "delete") {
				deleteCategory(catalog, card);
			} else {
				openCategoryForm(catalog, getCategoryData(card));
			}
		});
		if (!currencyListenerAttached) {
			document.addEventListener("currencychange", () => {
				if (!activeCatalog?.isConnected) return;
				activeCatalog.querySelectorAll(":scope > [data-category-card]").forEach((card) => {
					applyCategoryToCard(card, getCategoryData(card));
				});
				updateCategoryMetrics(activeCatalog);
			});
			window.addEventListener("storage", (event) => {
				if (event.key !== MOCK_EXPENSES_STORAGE_KEY || !activeCatalog?.isConnected) return;
				activeCatalog.querySelectorAll(":scope > [data-category-card]").forEach((card) => {
					applyCategoryToCard(card, getCategoryData(card));
				});
				updateCategoryMetrics(activeCatalog);
			});
			currencyListenerAttached = true;
		}

		loadCategories(catalog);
	}

	window.initCategoriasView = initCategoriasView;
})();
