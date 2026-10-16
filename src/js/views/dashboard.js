/**
 * Pluxee Enterprise - Dashboard View Controller (US-FE-02.5)
 * Coordinates KPI metrics, Budget Semaphore widget animations, category progress meters,
 * recent employees table, AI insights, and real-time state & currency event subscriptions.
 */

(function (window) {
  'use strict';

  let unsubscribeStore = null;
  let listenersAttached = false;

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
   * Main render function that populates all reactive components on the Dashboard
   */
  function renderDashboard() {
    const store = window.PluxeeStore;
    if (!store || typeof store.getGlobalBudgetMetrics !== 'function') {
      return;
    }

    const m = store.getGlobalBudgetMetrics();

    // 1. KPI Card 1: Total Asignado (#kpi-total-assigned)
    const cardAssigned = document.getElementById('kpi-total-assigned');
    if (cardAssigned) {
      const limitEl = cardAssigned.querySelector('[data-budget="limit"]') || cardAssigned.querySelector('.kpi-amount');
      if (limitEl) {
        limitEl.dataset.eur = m.globalBudgetCap;
        limitEl.textContent = formatAmount(m.globalBudgetCap);
      }
      const employeesStat = cardAssigned.querySelector('.kpi-footer-stats .stat-subtle');
      if (employeesStat) {
        employeesStat.textContent = `${m.totalEmployees || 124} Empleados Activos`;
      }
    }

    // 2. KPI Card 2: Control Presupuestario (#budget-monitor-card)
    const monitorCard = document.getElementById('budget-monitor-card');
    if (monitorCard && window.BudgetWidget) {
      window.BudgetWidget.updateBudgetCard(
        monitorCard,
        m.totalSpent,
        m.globalBudgetCap,
        formatAmount,
        { animate: true, lang: 'es' }
      );
    }

    // 3. KPI Card 3: Saldo Disponible Restante (#kpi-total-available)
    const cardAvailable = document.getElementById('kpi-total-available');
    if (cardAvailable) {
      const availEl = cardAvailable.querySelector('.kpi-amount');
      if (availEl) {
        availEl.dataset.eur = m.totalAvailable;
        availEl.textContent = formatAmount(m.totalAvailable);
      }
      const meterAvailable = cardAvailable.querySelector('.dash-meter-available');
      if (meterAvailable) {
        meterAvailable.style.width = `${Math.min(100, Math.max(0, m.remainingPercentage))}%`;
      }
      const badgeStatus = cardAvailable.querySelector('.badge-status');
      if (badgeStatus) {
        badgeStatus.textContent = `${m.remainingPercentage}% restante`;
      }
      const highlight = cardAvailable.querySelector('.stat-highlight');
      if (highlight) {
        if (m.remainingPercentage >= 30) {
          highlight.textContent = 'Solvencia Completa';
          highlight.className = 'stat-highlight green';
        } else if (m.remainingPercentage >= 10) {
          highlight.textContent = 'Margen Moderado';
          highlight.className = 'stat-highlight amber';
        } else {
          highlight.textContent = 'Límite Crítico';
          highlight.className = 'stat-highlight red';
        }
      }
    }

    // 4. Actualizar Desglose de Categorías (.dash-category-grid)
    if (Array.isArray(m.categoryBreakdown)) {
      m.categoryBreakdown.forEach((cat) => {
        const catCard = document.querySelector(`.dash-category-card .cat-icon.${cat.id}`)?.closest('.dash-category-card');
        if (catCard) {
          const currentAmount = catCard.querySelector('.cat-current-amount');
          if (currentAmount) {
            currentAmount.dataset.eur = cat.spent;
            currentAmount.textContent = formatAmount(cat.spent);
          }
          const targetAmount = catCard.querySelector('.cat-target-amount');
          if (targetAmount) {
            targetAmount.dataset.eur = cat.assigned;
            targetAmount.textContent = `de ${formatAmount(cat.assigned)}`;
          }
          const availableAmount = catCard.querySelector('.cat-footer-row strong');
          if (availableAmount) {
            availableAmount.dataset.eur = cat.available;
            availableAmount.textContent = formatAmount(cat.available);
          }
          const percentBadge = catCard.querySelector('.cat-percent-badge');
          if (percentBadge) {
            percentBadge.textContent = `${cat.pct}%`;
            percentBadge.className = `cat-percent-badge ${cat.pct >= 90 ? 'danger' : cat.pct >= 70 ? 'warning' : 'success'}`;
          }
          const meterFill = catCard.querySelector('.cat-meter-fill');
          if (meterFill) {
            meterFill.style.width = `${Math.min(100, cat.pct)}%`;
          }
        }
      });
    }

    // 5. Tabla de Empleados Recientes (.pluxee-table tbody)
    const tableBody = document.querySelector('.dash-table-card .pluxee-table tbody');
    if (tableBody && Array.isArray(m.topConsumingEmployees) && m.topConsumingEmployees.length > 0) {
      const top4 = m.topConsumingEmployees.slice(0, 4);
      tableBody.innerHTML = top4
        .map((emp) => {
          const initials = emp.name
            ? emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
            : 'EM';
          const avatarColors = ['bg-blue-avatar', 'bg-amber-avatar', 'bg-purple-avatar', 'bg-emerald-avatar'];
          const avatarClass = avatarColors[Math.abs(emp.name.length) % avatarColors.length];

          const semBadge = (window.BudgetWidget && typeof window.BudgetWidget.renderSemaphoreBadge === 'function')
            ? window.BudgetWidget.renderSemaphoreBadge(emp.spent, emp.assigned)
            : `<span class="semaphore-badge ${emp.semaphore?.cssClass || 'semaphore-green'}"><span>${emp.pct}%</span></span>`;

          return `
            <tr>
              <td>
                <div class="emp-cell">
                  <div class="dash-table-avatar ${avatarClass}">${initials}</div>
                  <div class="emp-cell-info">
                    <span class="emp-cell-name">${emp.name}</span>
                    <span class="emp-cell-role">${emp.role || emp.department || 'Colaborador'}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge-category ${emp.topCategoryId || 'salud'}">${emp.topCategory || 'General'}</span>
              </td>
              <td class="text-right font-bold" data-eur="${emp.spent}">${formatAmount(emp.spent)}</td>
              <td class="text-right text-muted" data-eur="${emp.available}">${formatAmount(emp.available)}</td>
              <td>${semBadge}</td>
              <td class="text-right">
                <a href="#empleados" class="dash-table-view-btn">Ver Ficha</a>
              </td>
            </tr>
          `;
        })
        .join('');
    }

    // 6. Resumen de IA (.ai-description)
    const aiDesc = document.querySelector('.ai-description');
    if (aiDesc && typeof store.getAISummary === 'function') {
      const ai = store.getAISummary();
      if (ai && ai.summary) {
        aiDesc.innerHTML = `
          ${ai.summary}
          <br><span class="text-highlight-amber">Recomendación:</span> ${ai.recommendation}
        `;
      }
    }
  }

  /**
   * Action handler for editing the global budget cap (Total Asignado)
   */
  function handleEditGlobalBudget() {
    const store = window.PluxeeStore;
    if (!store) return;
    const current = store.getGlobalBudgetCap();
    const input = window.prompt(
      'Modificar Presupuesto Global Asignado (EUR):\nIntroduce el nuevo límite total para la organización:',
      current
    );
    if (input !== null && input.trim() !== '') {
      const val = parseFloat(input.trim());
      const res = store.setGlobalBudgetCap(val);
      if (res && !res.success) {
        alert(res.error || 'Importe no válido.');
      }
    }
  }

  /**
   * Initializes the Dashboard view controller (US-FE-02.5)
   */
  function initDashboardView() {
    // Renderizado inicial con métricas del Store
    renderDashboard();

    // Evento botón editar presupuesto global
    const editBtn = document.getElementById('btn-edit-global-budget');
    if (editBtn) {
      editBtn.onclick = handleEditGlobalBudget;
    }

    // Evento botón actualizar análisis IA
    const aiBtn = document.querySelector('.ai-refresh-btn');
    if (aiBtn) {
      aiBtn.onclick = () => {
        aiBtn.classList.add('rotating');
        setTimeout(() => {
          renderDashboard();
          aiBtn.classList.remove('rotating');
        }, 300);
      };
    }

    // Suscripción al store reactivo (evita fugas y duplicados)
    if (unsubscribeStore) {
      unsubscribeStore();
      unsubscribeStore = null;
    }
    if (window.PluxeeStore && typeof window.PluxeeStore.subscribe === 'function') {
      unsubscribeStore = window.PluxeeStore.subscribe(renderDashboard);
    }

    // Event listeners globales (adjuntar una sola vez)
    if (!listenersAttached) {
      listenersAttached = true;
      document.addEventListener('currencychange', () => {
        renderDashboard();
      });
      window.addEventListener('budget:updated', () => {
        renderDashboard();
      });
    }

    // Transición suave para los medidores de categorías
    const catMeters = document.querySelectorAll('.cat-meter-fill');
    catMeters.forEach((meter) => {
      meter.style.transition = 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    });
  }

  window.initDashboardView = initDashboardView;
  window.renderDashboard = renderDashboard;

})(window);