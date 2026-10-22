/**
 * Pluxee Enterprise - Dashboard View Controller (US-FE-02.5 / US-INT-10)
 * Coordinates live FastAPI backend integration for:
 * - Global Allocated Budget & Approved Spent Stats (/dashboard/stats)
 * - Category Distribution & Progress Breakdown (/dashboard/categories)
 * - Recent Active Employees Table (/dashboard/recent-employees)
 * - Company Budget Update (/company/budget)
 * - AI Insights integration & multi-currency reactive recalculations.
 */

(function (window) {
  'use strict';

  let unsubscribeStore = null;
  let listenersAttached = false;

  // Live Dashboard State loaded from FastAPI Backend
  const dashboardData = {
    stats: null,
    categories: [],
    recentEmployees: [],
    isLoading: false,
    error: null
  };

  /**
   * Formats an amount using active currency formatter or fallback to EUR
   * @param {number} eurAmount
   * @returns {string}
   */
  function formatAmount(eurAmount) {
    if (typeof window.formatMoney === 'function') {
      return window.formatMoney(Number(eurAmount) || 0);
    }
    return `€${(Number(eurAmount) || 0).toLocaleString('es-ES')}`;
  }

  /**
   * Maps category names to semantic Material Symbol icons
   * @param {string} name
   * @returns {string} Material Symbols icon ligature
   */
  function getCategoryIcon(name) {
    const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n.includes('comida') || n.includes('restaur') || n.includes('gourmet') || n.includes('aliment')) return 'restaurant';
    if (n.includes('transporte') || n.includes('abono') || n.includes('movilidad') || n.includes('tren') || n.includes('bus')) return 'directions_bus';
    if (n.includes('formacion') || n.includes('curso') || n.includes('educacion') || n.includes('estudio')) return 'school';
    if (n.includes('salud') || n.includes('bienestar') || n.includes('medico') || n.includes('dental') || n.includes('sanidad')) return 'health_and_safety';
    if (n.includes('guarderia') || n.includes('infantil') || n.includes('hijos')) return 'child_care';
    if (n.includes('seguro') || n.includes('vida') || n.includes('poliza')) return 'security';
    if (n.includes('tecnologia') || n.includes('equipo') || n.includes('ordenador') || n.includes('laptop')) return 'devices';
    if (n.includes('gimnas') || n.includes('gym') || n.includes('fitness') || n.includes('deport')) return 'fitness_center';
    return 'category';
  }

  /**
   * Maps category names to predefined CSS theme classes
   * @param {string} name
   * @returns {string} CSS class
   */
  function getCategoryClass(name) {
    const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (n.includes('comida')) return 'comida';
    if (n.includes('transporte')) return 'transporte';
    if (n.includes('formacion')) return 'formacion';
    if (n.includes('salud')) return 'salud';
    if (n.includes('guarderia')) return 'guarderia';
    if (n.includes('gimnas') || n.includes('gym')) return 'formacion';
    return 'comida';
  }

  /**
   * Fetches real-time dashboard data from FastAPI backend endpoints
   */
  async function fetchDashboardData() {
    dashboardData.isLoading = true;

    try {
      const api = window.api;
      if (!api || typeof api.get !== 'function') {
        throw new Error('El cliente HTTP api.js no está disponible.');
      }

      // Consultas paralelas a los endpoints oficiales de FastAPI
      const [statsRes, categoriesRes, recentEmployeesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/categories'),
        api.get('/dashboard/recent-employees')
      ]);

      dashboardData.stats = statsRes;
      dashboardData.categories = Array.isArray(categoriesRes) ? categoriesRes : [];
      dashboardData.recentEmployees = Array.isArray(recentEmployeesRes) ? recentEmployeesRes : [];
      dashboardData.error = null;

      // Sincronizar PluxeeStore si está activo en memoria
      if (window.PluxeeStore) {
        if (statsRes && statsRes.total_allocated != null) {
          window.PluxeeStore.state.globalBudgetCap = Number(statsRes.total_allocated);
        }
      }
    } catch (err) {
      console.warn('[DashboardView] No se pudo conectar con el backend FastAPI, utilizando fallback local:', err);
      dashboardData.error = err.userMessage || err.message || 'Error de conexión con el backend.';

      // Fallback seguro a PluxeeStore en caso de desconexión momentánea
      const store = window.PluxeeStore;
      if (store && typeof store.getGlobalBudgetMetrics === 'function') {
        const m = store.getGlobalBudgetMetrics();
        dashboardData.stats = {
          total_allocated: m.globalBudgetCap,
          total_spent: m.totalSpent
        };
        dashboardData.categories = (m.categoryBreakdown || []).map((c) => ({
          category_id: c.id,
          category_name: c.name,
          total_allocated: c.assigned,
          total_spent: c.spent
        }));
        dashboardData.recentEmployees = (m.topConsumingEmployees || []).map((e) => ({
          id: e.id,
          first_name: (e.name || '').split(' ')[0] || 'Empleado',
          last_name: (e.name || '').split(' ').slice(1).join(' ') || '',
          email: e.email || '',
          department: e.department || e.role || '',
          max_budget: e.assigned || 1500,
          top_category: e.topCategory,
          top_category_spent: e.spent,
          top_category_allocated: e.assigned,
          top_category_remaining: e.available
        }));
      }
    } finally {
      dashboardData.isLoading = false;
      renderDashboard();
    }
  }

  /**
   * Main render function that populates all reactive components on the Dashboard
   */
  function renderDashboard() {
    // 1. Extraer métricas consolidadas
    let totalAllocated = 45000;
    let totalSpent = 0;

    if (dashboardData.stats) {
      totalAllocated = Number(dashboardData.stats.total_allocated) || 0;
      totalSpent = Number(dashboardData.stats.total_spent) || 0;
    } else if (window.PluxeeStore && typeof window.PluxeeStore.getGlobalBudgetMetrics === 'function') {
      const m = window.PluxeeStore.getGlobalBudgetMetrics();
      totalAllocated = m.globalBudgetCap;
      totalSpent = m.totalSpent;
    }

    const totalAvailable = Math.max(0, totalAllocated - totalSpent);
    const executionRate = totalAllocated > 0 ? Number(((totalSpent / totalAllocated) * 100).toFixed(1)) : 0;
    const remainingPercentage = totalAllocated > 0 ? Math.max(0, Number((100 - (totalSpent / totalAllocated) * 100).toFixed(1))) : 100;

    // 2. KPI Card 1: Total Asignado (#kpi-total-assigned)
    const cardAssigned = document.getElementById('kpi-total-assigned');
    if (cardAssigned) {
      const limitEl = cardAssigned.querySelector('[data-budget="limit"]') || cardAssigned.querySelector('.kpi-amount');
      if (limitEl) {
        limitEl.dataset.eur = totalAllocated;
        limitEl.textContent = formatAmount(totalAllocated);
      }
      const employeesStat = cardAssigned.querySelector('.kpi-footer-stats .stat-subtle');
      if (employeesStat) {
        const empCount = dashboardData.recentEmployees.length > 0 ? dashboardData.recentEmployees.length : 124;
        employeesStat.textContent = `${empCount} Empleados Activos`;
      }
    }

    // 3. KPI Card 2: Control Presupuestario (#budget-monitor-card)
    const monitorCard = document.getElementById('budget-monitor-card');
    if (monitorCard && window.BudgetWidget) {
      window.BudgetWidget.updateBudgetCard(
        monitorCard,
        totalSpent,
        totalAllocated,
        formatAmount,
        { animate: true, lang: 'es' }
      );
    }

    // 4. KPI Card 3: Saldo Disponible Restante (#kpi-total-available)
    const cardAvailable = document.getElementById('kpi-total-available');
    if (cardAvailable) {
      const availEl = cardAvailable.querySelector('.kpi-amount');
      if (availEl) {
        availEl.dataset.eur = totalAvailable;
        availEl.textContent = formatAmount(totalAvailable);
      }
      const meterAvailable = cardAvailable.querySelector('.dash-meter-available');
      if (meterAvailable) {
        meterAvailable.style.width = `${Math.min(100, Math.max(0, remainingPercentage))}%`;
      }
      const badgeStatus = cardAvailable.querySelector('.badge-status');
      if (badgeStatus) {
        badgeStatus.textContent = `${remainingPercentage}% restante`;
      }
      const highlight = cardAvailable.querySelector('.stat-highlight');
      if (highlight) {
        if (remainingPercentage > 66) {
          highlight.textContent = 'Solvencia Completa';
          highlight.className = 'stat-highlight green';
        } else if (remainingPercentage >= 34) {
          highlight.textContent = 'Margen Moderado';
          highlight.className = 'stat-highlight amber';
        } else {
          highlight.textContent = 'Límite Crítico';
          highlight.className = 'stat-highlight red';
        }
      }
    }

    // 5. Categorías dinámicas desde el backend (#dash-category-grid)
    // Se filtran y ordenan para mostrar exactamente 4 categorías: aquellas con menor saldo disponible (las más al límite)
    const categoryGrid = document.getElementById('dash-category-grid') || document.querySelector('.dash-category-grid');
    const categoryBadge = document.getElementById('categories-count-badge');

    // Mapear saldo disponible y ordenar de menor a mayor disponibilidad
    const prioritizedCategories = [...dashboardData.categories]
      .map((cat) => {
        const allocated = Number(cat.total_allocated) || 0;
        const spent = Number(cat.total_spent) || 0;
        const available = Math.max(0, allocated - spent);
        const pct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;
        return { ...cat, allocated, spent, available, pct };
      })
      .sort((a, b) => a.available - b.available)
      .slice(0, 4);

    if (categoryBadge) {
      categoryBadge.textContent = `4 categorías con menor saldo disponible`;
    }

    if (categoryGrid) {
      if (prioritizedCategories.length === 0) {
        categoryGrid.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--pluxee-text-muted);">
            No se encontraron categorías de beneficios registradas en el backend.
          </div>
        `;
      } else {
        categoryGrid.innerHTML = prioritizedCategories
          .map((cat) => {
            const icon = getCategoryIcon(cat.category_name);
            const catClass = getCategoryClass(cat.category_name);
            const badgeClass = cat.pct > 66 ? 'warning' : cat.pct > 33 ? 'neutral' : 'success';

            return `
              <div class="dash-category-card">
                <div class="cat-header-row">
                  <div class="cat-title-wrap">
                    <span class="material-symbols-outlined cat-icon ${catClass}">${icon}</span>
                    <span class="cat-name">${cat.category_name}</span>
                  </div>
                  <span class="cat-percent-badge ${badgeClass}">${cat.pct}%</span>
                </div>
                <div class="cat-amounts-row">
                  <span class="cat-current-amount" data-eur="${cat.spent}">${formatAmount(cat.spent)}</span>
                  <span class="cat-target-amount" data-eur="${cat.allocated}">de ${formatAmount(cat.allocated)}</span>
                </div>
                <div class="cat-meter-track">
                  <div class="cat-meter-fill ${catClass}" style="width: ${cat.pct}%;"></div>
                </div>
                <div class="cat-footer-row">
                  <span>Disponible:</span>
                  <strong data-eur="${cat.available}">${formatAmount(cat.available)}</strong>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // 6. Tabla de Empleados Recientes dinámica (#dash-recent-employees-tbody)
    const tableBody = document.getElementById('dash-recent-employees-tbody') || document.querySelector('.dash-table-card .pluxee-table tbody');
    if (tableBody) {
      if (dashboardData.recentEmployees.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--pluxee-text-muted);">
              No hay empleados recientes registrados en el sistema.
            </td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = dashboardData.recentEmployees
          .map((emp) => {
            const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Empleado';
            const fn = (emp.first_name || 'E').trim();
            const ln = (emp.last_name || 'M').trim();
            const initials = `${fn[0] || 'E'}${ln[0] || 'M'}`.toUpperCase();
            const avatarColors = ['bg-blue-avatar', 'bg-amber-avatar', 'bg-purple-avatar', 'bg-emerald-avatar'];
            const avatarClass = avatarColors[Math.abs(fullName.length) % avatarColors.length];

            const topCatName = emp.top_category || 'Sin beneficios';
            const topCatClass = getCategoryClass(topCatName);
            const spent = Number(emp.top_category_spent) || 0;
            const remaining = Number(emp.top_category_remaining) || 0;
            const allocated = Number(emp.top_category_allocated) || 0;

            const pct = allocated > 0
              ? Math.round((spent / allocated) * 100)
              : (Number(emp.max_budget) > 0 ? Math.round((spent / Number(emp.max_budget)) * 100) : 0);

            const semBadge = (window.BudgetWidget && typeof window.BudgetWidget.renderSemaphoreBadge === 'function')
              ? window.BudgetWidget.renderSemaphoreBadge(spent, allocated || Number(emp.max_budget) || 1)
              : `<span class="semaphore-badge ${pct > 66 ? 'semaphore-red' : pct >= 34 ? 'semaphore-amber' : 'semaphore-green'}"><span>${pct}% Consumido</span></span>`;

            return `
              <tr>
                <td>
                  <div class="emp-cell">
                    <div class="dash-table-avatar ${avatarClass}">${initials}</div>
                    <div class="emp-cell-info">
                      <span class="emp-cell-name">${fullName}</span>
                      <span class="emp-cell-role">${emp.department || 'Colaborador'}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="badge-category ${topCatClass}">${topCatName}</span>
                </td>
                <td class="text-right font-bold" data-eur="${spent}">${formatAmount(spent)}</td>
                <td class="text-right text-muted" data-eur="${remaining}">${formatAmount(remaining)}</td>
                <td>${semBadge}</td>
                <td class="text-right">
                  <a href="#empleados" class="dash-table-view-btn">Ver Ficha</a>
                </td>
              </tr>
            `;
          })
          .join('');
      }
    }

    // 7. Resumen Inteligente de IA (Google Genkit - US-FE-09.4)
    updateAIAdvisor();
  }

  /**
   * Cached diagnosis to avoid redundant fetches on fast re-renders
   */
  let cachedDiagnosis = null;
  let isAIGenerating = false;

  /**
   * Renders the structured 3-part AI diagnosis into the DOM (AC-09.3 / AC-09.4)
   * @param {Object} diag
   */
  function renderAIAdvisor(diag) {
    if (!diag) return;

    // Bloque 1: Salud Presupuestaria Global
    const healthSummaryEl = document.getElementById('ai-health-summary');
    if (healthSummaryEl && diag.health && diag.health.summaryText) {
      healthSummaryEl.innerHTML = diag.health.summaryText;
    }

    // Bloque 2: Alertas de Límite y Semáforo (>85%)
    const alertsListEl = document.getElementById('ai-alerts-list');
    if (alertsListEl && Array.isArray(diag.alerts)) {
      alertsListEl.innerHTML = diag.alerts
        .map((alert) => `
          <div class="ai-alert-chip ${alert.severity || 'warning'}">
            <span class="ai-chip-dot"></span>
            <span class="ai-chip-name">${alert.name}</span>
            <span class="ai-chip-metric">${alert.metric}</span>
          </div>
        `)
        .join('');
    }

    // Bloque 3: Recomendaciones de Optimización Estratégica
    const recSummaryEl = document.getElementById('ai-recommendation-summary');
    if (recSummaryEl && diag.recommendations && diag.recommendations.summaryText) {
      recSummaryEl.innerHTML = diag.recommendations.summaryText;
    }
  }

  /**
   * Synchronizes AI Advisor with current currency and store metrics without animation delay
   */
  function updateAIAdvisor() {
    if (isAIGenerating) return;
    if (window.PluxeeGenkitService && typeof window.PluxeeGenkitService.computeDiagnosticOutput === 'function') {
      const store = window.PluxeeStore;
      const metrics = store?.getGlobalBudgetMetrics?.();
      if (metrics) {
        cachedDiagnosis = window.PluxeeGenkitService.computeDiagnosticOutput(metrics);
        renderAIAdvisor(cachedDiagnosis);
      }
    }
  }

  /**
   * Generates or refreshes the AI Budget Diagnosis with Skeleton Loader animation (AC-09.2)
   * @param {boolean} isManual
   */
  async function generateAIInsights(isManual = false) {
    const aiBtn = document.getElementById('btn-generate-ai-insights') || document.querySelector('.ai-refresh-btn');
    const skeletonEl = document.getElementById('ai-skeleton-loader');
    const resultsEl = document.getElementById('ai-results-content');

    if (!window.PluxeeGenkitService) {
      console.warn('[DashboardView] PluxeeGenkitService is not loaded.');
      return;
    }

    isAIGenerating = true;

    // Activar estado de carga y skeleton con shimmer
    if (skeletonEl && resultsEl) {
      skeletonEl.hidden = false;
      resultsEl.hidden = true;
    }
    if (aiBtn) {
      aiBtn.classList.add('rotating');
      aiBtn.setAttribute('disabled', 'true');
    }

    try {
      const diag = await window.PluxeeGenkitService.generateBudgetDiagnosis({
        delayMs: isManual ? 1100 : 300,
        forceRefresh: true
      });
      cachedDiagnosis = diag;
      renderAIAdvisor(diag);
    } catch (err) {
      console.error('[DashboardView] Error generating AI insights:', err);
    } finally {
      // Restaurar estado visual tras el procesamiento
      if (skeletonEl && resultsEl) {
        skeletonEl.hidden = true;
        resultsEl.hidden = false;
      }
      if (aiBtn) {
        aiBtn.classList.remove('rotating');
        aiBtn.removeAttribute('disabled');
      }
      isAIGenerating = false;
    }
  }

  /**
   * Action handler for editing the global budget cap (Total Asignado)
   * Sends PUT /company/budget to FastAPI backend and applies client-side restriction
   */
  async function handleEditGlobalBudget() {
    const store = window.PluxeeStore;
    if (typeof window.openDynamicModal !== 'function') return;

    let currentCap = 45000;
    let currentSpent = 0;

    if (dashboardData.stats) {
      currentCap = Number(dashboardData.stats.total_allocated) || 45000;
      currentSpent = Number(dashboardData.stats.total_spent) || 0;
    } else if (store) {
      currentCap = store.getGlobalBudgetCap();
      const metrics = typeof store.getGlobalBudgetMetrics === 'function' ? store.getGlobalBudgetMetrics() : null;
      currentSpent = metrics ? metrics.totalSpent : 0;
    }

    const minBudget = currentSpent > 0 ? currentSpent : 1;

    const form = document.createElement('form');
    form.innerHTML = `
      <div class="form-field">
        <label for="budget-amount">Nuevo Total Asignado (€ EUR)</label>
        <input
          id="budget-amount"
          name="amount"
          type="number"
          min="${minBudget}"
          step="any"
          required
          value="${currentCap}"
          placeholder="Mínimo ${minBudget}"
        />
        <span id="budget-error-msg" style="color: #dc2626; font-size: 11px; font-weight: 500; display: none; margin-top: 4px;"></span>
      </div>

      <div class="modal-info" style="background-color: #f8fafc; border-color: #cbd5e1;">
        <div style="display: flex; gap: 8px; align-items: flex-start;">
          <span class="material-symbols-outlined" style="font-size: 18px; color: #d97706; flex-shrink: 0; margin-top: 1px;">lock</span>
          <div>
            <div style="font-weight: 600; color: #0f172a; margin-bottom: 2px;">Restricción Contable: Mínimo ${formatAmount(currentSpent)}</div>
            <div style="color: #64748b; font-size: 12px; line-height: 1.4;">
              La organización ya ha ejecutado <strong>${formatAmount(currentSpent)}</strong> en beneficios durante este ciclo. No se permite fijar un presupuesto inferior al gasto consolidado.
            </div>
          </div>
        </div>
      </div>
    `;

    // Validación interactiva en tiempo real sobre el input
    const inputEl = form.querySelector('#budget-amount');
    const errorSpan = form.querySelector('#budget-error-msg');
    if (inputEl) {
      const validateInput = () => {
        const val = parseFloat(inputEl.value);
        if (!isNaN(val) && val < currentSpent) {
          inputEl.setCustomValidity(`El presupuesto no puede ser inferior al gasto acumulado (${formatAmount(currentSpent)}).`);
          if (errorSpan) {
            errorSpan.textContent = `⚠️ No puedes asignar menos de ${formatAmount(currentSpent)} (gasto ya ejecutado).`;
            errorSpan.style.display = 'block';
          }
        } else {
          inputEl.setCustomValidity('');
          if (errorSpan) {
            errorSpan.style.display = 'none';
          }
        }
      };
      inputEl.addEventListener('input', validateInput);
      inputEl.addEventListener('change', validateInput);
    }

    const result = await window.openDynamicModal({
      title: 'Modificar Presupuesto Global',
      subtitle: 'Ajusta el límite total asignado a la organización para este ciclo.',
      icon: 'account_balance_wallet',
      content: form,
      confirmText: 'Guardar Presupuesto',
      cancelText: 'Cancelar',
      size: 'medium'
    });

    if (!result.confirmed || !result.data) {
      return;
    }

    const newAmount = parseFloat(result.data.amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      return;
    }

    // Doble validación en cliente
    if (newAmount < currentSpent) {
      const errorContent = document.createElement('div');
      errorContent.className = 'modal-info';
      errorContent.style.borderColor = 'rgb(254 202 202)';
      errorContent.style.background = 'rgb(254 242 242)';
      errorContent.style.color = '#991b1b';
      errorContent.textContent = `Operación bloqueada: El presupuesto asignado (${formatAmount(newAmount)}) no puede ser inferior al gasto ya ejecutado (${formatAmount(currentSpent)}).`;
      await window.openDynamicModal({
        title: 'Presupuesto no permitido',
        subtitle: 'El importe introducido generaría déficit presupuestario.',
        icon: 'warning',
        content: errorContent,
        confirmText: 'Entendido',
        showCancel: false,
        size: 'small'
      });
      return;
    }

    // Guardar presupuesto en el backend de FastAPI (PUT /api/v1/company/budget)
    try {
      const api = window.api;
      if (api && typeof api.put === 'function') {
        await api.put('/company/budget', { global_budget: newAmount });
      }

      if (dashboardData.stats) {
        dashboardData.stats.total_allocated = newAmount;
      }

      if (store) {
        store.setGlobalBudgetCap(newAmount);
      }

      renderDashboard();
      generateAIInsights(false);
    } catch (err) {
      console.error('[DashboardView] Error actualizando presupuesto en el backend:', err);
      const errorMsg = window.api?.getErrorMessage?.(err) || err.message || 'No se pudo actualizar el presupuesto en el servidor.';
      const errorContent = document.createElement('div');
      errorContent.className = 'modal-info';
      errorContent.style.borderColor = 'rgb(254 202 202)';
      errorContent.style.background = 'rgb(254 242 242)';
      errorContent.style.color = '#991b1b';
      errorContent.textContent = errorMsg;
      await window.openDynamicModal({
        title: 'Error al actualizar',
        subtitle: 'El servidor no pudo procesar la actualización del presupuesto.',
        icon: 'error',
        content: errorContent,
        confirmText: 'Entendido',
        showCancel: false,
        size: 'small'
      });
    }
  }

  /**
   * Initializes the Dashboard view controller (US-FE-02.5 / US-INT-10)
   */
  function initDashboardView() {
    // 1. Cargar datos en vivo desde los endpoints de FastAPI
    fetchDashboardData();

    // 2. Evento botón editar presupuesto global
    const editBtn = document.getElementById('btn-edit-global-budget');
    if (editBtn) {
      editBtn.onclick = handleEditGlobalBudget;
    }

    // 3. Evento botón generar/actualizar análisis IA con Skeleton Loader (AC-09.2)
    const aiBtn = document.getElementById('btn-generate-ai-insights') || document.querySelector('.ai-refresh-btn');
    if (aiBtn) {
      aiBtn.onclick = (e) => {
        e.preventDefault();
        generateAIInsights(true);
      };
    }

    // 4. Suscripción al store reactivo (evita fugas y duplicados)
    if (unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
    if (window.PluxeeStore && typeof window.PluxeeStore.subscribe === 'function') {
      unsubscribeStore = window.PluxeeStore.subscribe(renderDashboard);
    }

    // 5. Event listeners globales (adjuntar una sola vez)
    if (!listenersAttached) {
      listenersAttached = true;
      document.addEventListener('currencychange', () => {
        renderDashboard();
      });
      window.addEventListener('budget:updated', () => {
        renderDashboard();
      });
    }

    // 6. Transición suave para los medidores de categorías
    const catMeters = document.querySelectorAll('.cat-meter-fill');
    catMeters.forEach((meter) => {
      meter.style.transition = 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    });
  }

  window.initDashboardView = initDashboardView;
  window.renderDashboard = renderDashboard;
  window.fetchDashboardData = fetchDashboardData;

})(window);