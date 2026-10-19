(() => {
	"use strict";

	const STORAGE_KEY = "pluxee.categories.custom";
	const OVERRIDES_KEY = "pluxee.categories.overrides";
	const DELETED_KEY = "pluxee.categories.deleted";
	const DEFAULT_BUDGETS = [15000, 12000, 10000, 8000, 5500];
	const DEFAULT_SPENDING = [11700, 7800, 5200, 3800, 2250];
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

	function getSavedCategories() {
		try {
			const categories = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
			return Array.isArray(categories) ? categories : [];
		} catch (error) {
			console.error("No se pudieron cargar las categorías guardadas.", error);
			return [];
		}
	}

	function saveCategories(categories) {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
			return true;
		} catch (error) {
			console.error("No se pudieron guardar las categorías.", error);
			return false;
		}
	}

	function getSavedOverrides() {
		try {
			return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}");
		} catch (error) {
			console.error("No se pudieron cargar los ajustes de categorías.", error);
			return {};
		}
	}

	function getDeletedCategoryIds() {
		try {
			const ids = JSON.parse(localStorage.getItem(DELETED_KEY) || "[]");
			return Array.isArray(ids) ? ids : [];
		} catch (error) {
			console.error("No se pudieron cargar las categorías eliminadas.", error);
			return [];
		}
	}

	function escapeHtml(value) {
		return String(value).replace(/[&<>"']/g, (character) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;"
		})[character]);
	}

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

	function renderCategory(category, catalog) {
		const card = document.createElement("article");
		const iconOption = ICON_OPTIONS.find((option) => option.icon === category.icon)
			|| ICON_OPTIONS[ICON_OPTIONS.length - 1];
		const budget = Number(category.budget) || 0;

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
							<h3 class="category-card__title">${escapeHtml(category.name)}</h3>
							<span class="text-xs text-slate-500 font-medium">${iconOption.label}</span>
						</div>
					</div>
					<span class="category-status">Activa</span>
				</div>
				<p class="category-card__description">${escapeHtml(category.description || "Categoría de beneficios creada por la empresa.")}</p>
			</div>
			<div class="category-card__budget">
				<div class="flex items-center justify-between text-xs">
					<span class="text-slate-500">Presupuesto Asignado:</span>
					<span class="category-budget-assigned font-bold text-slate-900">${formatMoney(budget)}</span>
				</div>
				<div class="flex items-center justify-between text-xs mt-3">
					<span class="text-slate-500">Gasto Ejecutado:</span>
					<span class="category-budget-spent font-semibold text-blue-700">${formatMoney(0)} (0%)</span>
				</div>
				<div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-3">
					<div class="category-progress bg-blue-600 h-2 rounded-full" style="width: 0%;"></div>
				</div>
				<div class="flex items-center justify-between text-xs text-slate-500 pt-2">
					<span>Disponible: <strong class="category-budget-available text-slate-900">${formatMoney(budget)}</strong></span>
					<span>0 empleados</span>
				</div>
			</div>
			<div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
				<button data-category-action="edit" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/70 transition-colors" type="button">Editar</button>
				<button data-category-action="delete" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors" type="button">Eliminar</button>
			</div>
		`;

		catalog.insertBefore(card, document.getElementById("btn-nueva-categoria-placeholder"));
		applyCategoryToCard(card, category);
	}

	function updateCategoryCounts(catalog) {
		const categories = [...catalog.querySelectorAll(":scope > [data-category-card]")];
		const activeCount = categories.filter((card) => JSON.parse(card.dataset.category).active).length;
		const kpiCount = document.getElementById("categorias-kpi-count");
		const catalogCount = document.getElementById("categorias-count");

		if (kpiCount) kpiCount.textContent = `${activeCount} categorías activas`;
		if (catalogCount) catalogCount.textContent = `${activeCount} de ${categories.length} categorías activas`;
	}

	function createCategoryForm(category, mode) {
		const form = document.createElement("form");

		form.innerHTML = `
			<div class="form-field" data-category-field="details">
				<label for="category-name">Nombre de la categoría</label>
				<input id="category-name" name="name" type="text" required maxlength="60" placeholder="Ej. Bienestar y gimnasio" />
			</div>
			<div class="form-row">
				<div class="form-field" data-category-field="icon">
					<label for="category-icon">Icono identificador</label>
					<select id="category-icon" name="icon" required>
						${ICON_OPTIONS.map((option) => `<option value="${option.icon}">${option.label}</option>`).join("")}
					</select>
				</div>
				<div class="form-field">
					<label for="category-budget">Límite sugerido (€)</label>
					<input id="category-budget" name="budget" type="number" min="0.01" step="0.01" required placeholder="150" />
				</div>
			</div>
			<div class="form-field" data-category-field="description">
				<label for="category-description">Descripción</label>
				<textarea id="category-description" name="description" rows="3" maxlength="240" placeholder="Describe qué incluye este beneficio."></textarea>
			</div>
			<div class="form-field" data-category-field="status">
				<label for="category-status">Estado</label>
				<select id="category-status" name="status">
					<option value="active">Activa</option>
					<option value="inactive">Inactiva</option>
				</select>
			</div>
			<div class="modal-info">${mode === "create" ? "La categoría se añadirá al catálogo y quedará guardada en este navegador." : "Los cambios se guardarán en este navegador."}</div>
		`;

		form.elements.namedItem("name").value = category?.name || "";
		form.elements.namedItem("icon").value = category?.icon || ICON_OPTIONS[0].icon;
		form.elements.namedItem("budget").value = category ? category.budget : "";
		form.elements.namedItem("description").value = category?.description || "";
		form.elements.namedItem("status").value = category?.active === false ? "inactive" : "active";

		if (mode === "create") {
			form.querySelector('[data-category-field="status"]').hidden = true;
		}

		return form;
	}

	function applyCategoryToCard(card, category) {
		const iconOption = ICON_OPTIONS.find((option) => option.icon === category.icon)
			|| ICON_OPTIONS[ICON_OPTIONS.length - 1];
		const budget = Number(category.budget) || 0;
		const spent = Number(category.spent) || 0;
		const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
		const title = card.querySelector("h3");
		const icon = card.querySelector(".material-symbols-outlined");
		const description = card.querySelector(".category-card__description")
			|| card.querySelector(":scope > div:first-child p");
		const status = card.querySelector(".category-status")
			|| card.querySelector("div.flex.items-start.justify-between > span");
		const assigned = card.querySelector(".category-budget-assigned")
			|| card.querySelector(".space-y-3 > div:first-child span:last-child");
		const executed = card.querySelector(".category-budget-spent")
			|| card.querySelector(".space-y-3 > div:nth-child(2) span:last-child");
		const progress = card.querySelector(".category-progress")
			|| card.querySelector(".space-y-3 > div:nth-child(3) > div");
		const available = card.querySelector(".category-budget-available")
			|| card.querySelector(".space-y-3 > div:nth-child(4) strong");

		card.dataset.categoryCard = "true";
		card.dataset.categoryId = category.id;
		if (title) title.textContent = category.name;
		if (icon) {
			icon.textContent = iconOption.icon;
			icon.parentElement.className = `category-icon-box ${iconOption.color}`;
		}
		if (description) description.textContent = category.description;
		if (status) {
			status.className = category.active
				? "category-status px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200/60"
				: "category-status px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200";
			status.textContent = category.active ? "Activa" : "Inactiva";
		}
		if (assigned) assigned.textContent = formatMoney(budget);
		if (executed) executed.textContent = `${formatMoney(spent)} (${percent}%)`;
		if (progress) progress.style.width = `${percent}%`;
		if (available) available.textContent = formatMoney(Math.max(0, budget - spent));
		card.dataset.category = JSON.stringify(category);
	}

	function saveCategory(category) {
		if (category.isCustom) {
			const categories = getSavedCategories();
			const existingIndex = categories.findIndex((item) => item.id === category.id);
			if (existingIndex === -1) categories.push(category);
			else categories[existingIndex] = category;
			return saveCategories(categories);
		}

		const overrides = getSavedOverrides();
		overrides[category.id] = category;
		try {
			localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
			return true;
		} catch (error) {
			console.error("No se pudieron guardar los ajustes de categorías.", error);
			return false;
		}
	}

	async function openCategoryForm(catalog, card = null, mode = "create") {
		if (typeof window.openDynamicModal !== "function") {
			console.error("No está disponible openDynamicModal().");
			return;
		}

		const category = card ? JSON.parse(card.dataset.category) : null;
		const form = createCategoryForm(category, mode);
		const nameInput = form.elements.namedItem("name");
		const resultPromise = window.openDynamicModal({
			title: mode === "create" ? "Nueva categoría" : "Editar categoría",
			subtitle: mode === "create"
				? "Completa los datos de la nueva categoría de beneficios."
				: "Modifica los datos, el presupuesto y el estado de esta categoría.",
			content: form,
			confirmText: mode === "create" ? "Crear categoría" : "Guardar cambios",
			cancelText: "Cancelar",
			size: "medium",
			icon: "category"
		});

		if (mode === "create" || mode === "edit") {
			nameInput.addEventListener("input", () => {
				const normalizedName = nameInput.value.trim().toLocaleLowerCase("es");
				const duplicate = [...catalog.querySelectorAll("[data-category-card]")].some((item) => {
					if (item === card) return false;
					const currentName = item.querySelector("h3")?.textContent.trim().toLocaleLowerCase("es");
					return currentName === normalizedName;
				});
				nameInput.setCustomValidity(duplicate ? "Ya existe una categoría con ese nombre." : "");
			});
		}

		const result = await resultPromise;
		if (!result.confirmed) return;

		let updatedCategory;
		if (mode === "create") {
			updatedCategory = {
				id: `custom-${typeof crypto.randomUUID === "function" ? crypto.randomUUID() : Date.now()}`,
				name: result.data.name.trim(),
				icon: result.data.icon,
				budget: Number(result.data.budget),
				spent: 0,
				description: result.data.description.trim(),
				active: true,
				isCustom: true
			};
			renderCategory(updatedCategory, catalog);
		} else {
			updatedCategory = {
				...category,
				name: result.data.name.trim(),
				icon: result.data.icon,
				budget: Number(result.data.budget),
				description: result.data.description.trim(),
				active: result.data.status === "active"
			};
		}

		if (card) applyCategoryToCard(card, updatedCategory);
		saveCategory(updatedCategory);
		updateCategoryCounts(catalog);
	}

	async function deleteCategory(catalog, card) {
		if (typeof window.openDynamicModal !== "function") {
			console.error("No está disponible openDynamicModal().");
			return;
		}

		const category = JSON.parse(card.dataset.category);
		const content = document.createElement("div");
		content.className = "category-delete-confirmation";
		content.innerHTML = `
			<span class="material-symbols-outlined" aria-hidden="true">warning</span>
			<p>¿Seguro que quieres eliminar <strong>${escapeHtml(category.name)}</strong>? Esta acción no se puede deshacer.</p>
		`;

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
			if (category.isCustom) {
				const categories = getSavedCategories().filter((item) => item.id !== category.id);
				if (!saveCategories(categories)) return;
			} else {
				const deletedIds = new Set(getDeletedCategoryIds());
				deletedIds.add(category.id);
				localStorage.setItem(DELETED_KEY, JSON.stringify([...deletedIds]));

				const overrides = getSavedOverrides();
				delete overrides[category.id];
				localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
			}
		} catch (error) {
			console.error("No se pudo eliminar la categoría.", error);
			return;
		}

		card.remove();
		updateCategoryCounts(catalog);
	}

	function initializeDefaultCategories(catalog) {
		const overrides = getSavedOverrides();
		const deletedIds = new Set(getDeletedCategoryIds());
		const placeholder = document.getElementById("btn-nueva-categoria-placeholder");
		const cards = [...catalog.children].filter((card) => card !== placeholder);

		cards.forEach((card, index) => {
			const categoryId = `default-${index + 1}`;
			if (deletedIds.has(categoryId)) {
				card.remove();
				return;
			}

			const category = {
				id: categoryId,
				name: card.querySelector("h3")?.textContent.trim() || "Categoría",
				icon: card.querySelector(".material-symbols-outlined")?.textContent.trim() || "category",
				budget: DEFAULT_BUDGETS[index] || 0,
				spent: DEFAULT_SPENDING[index] || 0,
				description: card.querySelector(":scope > div:first-child p")?.textContent.trim() || "",
				active: true,
				isCustom: false,
				...overrides[categoryId]
			};
			applyCategoryToCard(card, category);
		});
	}

	function initCategoriasView() {
		const catalog = document.getElementById("catalogo-categorias");
		const addButton = document.getElementById("btn-nueva-categoria");
		const addCard = document.getElementById("btn-nueva-categoria-placeholder");

		if (!catalog || !addButton || !addCard) {
			console.error("No se encontraron los controles del catálogo de categorías.");
			return;
		}

		initializeDefaultCategories(catalog);
		getSavedCategories().forEach((category) => renderCategory({
			spent: 0,
			active: true,
			isCustom: true,
			...category
		}, catalog));
		updateCategoryCounts(catalog);

		const openForm = () => openCategoryForm(catalog);
		addButton.addEventListener("click", openForm);
		catalog.addEventListener("click", (event) => {
			const action = event.target.closest("[data-category-action]");
			if (!action || !catalog.contains(action)) return;
			const card = action.closest("[data-category-card]");
			if (!card) return;
			if (action.dataset.categoryAction === "delete") {
				deleteCategory(catalog, card);
			} else {
				openCategoryForm(catalog, card, action.dataset.categoryAction);
			}
		});
		addCard.addEventListener("click", openForm);
		addCard.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				openForm();
			}
		});
	}

	window.initCategoriasView = initCategoriasView;
})();
