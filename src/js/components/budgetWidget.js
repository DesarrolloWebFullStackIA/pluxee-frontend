/**
 * Pluxee Enterprise - Budget Semaphore Widget (US-FE-02.2)
 * Computes (totalSpent / totalLimit) * 100 and controls the 3-tier traffic light semaphore:
 * - 🟢 Green: < 70% consumed (Safe, healthy spending level)
 * - 🟡 Amber: 70% - 90% consumed (Warning threshold, approaching budget cap)
 * - 🔴 Red: > 90% or limit reached (Critical alert, limit exceeded or imminent breach)
 */

(function (window) {
  'use strict';

  const SEMAPHORE_CONFIG = {
    GREEN: {
      max: 70,
      tier: 'green',
      cssClass: 'semaphore-green',
      label: 'Nivel Óptimo',
      description: 'Presupuesto saludable y dentro de los parámetros previstos'
    },
    AMBER: {
      max: 90,
      tier: 'amber',
      cssClass: 'semaphore-amber',
      label: 'Tope Próximo',
      description: 'Atención: consumo acercándose al techo presupuestario'
    },
    RED: {
      tier: 'red',
      cssClass: 'semaphore-red',
      label: 'Alerta Crítica',
      description: 'Riesgo de sobrecoste o límite presupuestario excedido'
    }
  };

  /**
   * Calculates execution percentage and traffic light tier
   * @param {number} spent - Total amount spent
   * @param {number} limit - Total agreed limit / cap
   * @returns {Object} status details
   */
  function calculateBudgetStatus(spent, limit) {
    const totalSpent = Number(spent) || 0;
    const totalLimit = Number(limit) || 0;
    const percentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
    const remaining = Math.max(0, totalLimit - totalSpent);
    const roundedPct = Math.round(percentage * 10) / 10;

    let tierConfig;
    if (roundedPct < SEMAPHORE_CONFIG.GREEN.max) {
      tierConfig = SEMAPHORE_CONFIG.GREEN;
    } else if (roundedPct <= SEMAPHORE_CONFIG.AMBER.max) {
      tierConfig = SEMAPHORE_CONFIG.AMBER;
    } else {
      tierConfig = SEMAPHORE_CONFIG.RED;
    }

    return {
      spent: totalSpent,
      limit: totalLimit,
      remaining,
      percentage: roundedPct,
      tier: tierConfig.tier,
      cssClass: tierConfig.cssClass,
      label: tierConfig.label,
      description: tierConfig.description
    };
  }

  /**
   * Generates HTML for an inline semaphore badge (for tables or cards)
   * @param {number} spent
   * @param {number} limit
   * @returns {string} HTML string
   */
  function renderSemaphoreBadge(spent, limit) {
    const status = calculateBudgetStatus(spent, limit);
    return `
      <span class="semaphore-badge ${status.cssClass}" title="${status.description}">
        <span class="semaphore-dot"></span>
        <span>${status.percentage}% ${status.label}</span>
      </span>
    `;
  }

  /**
   * Updates a visual budget card element in the DOM
   * @param {HTMLElement} cardEl - The container element
   * @param {number} spent
   * @param {number} limit
   * @param {Function} formatFn - Optional formatter for currency
   */
  function updateBudgetCard(cardEl, spent, limit, formatFn) {
    if (!cardEl) return;
    const status = calculateBudgetStatus(spent, limit);
    const format = formatFn || ((val) => `€${Number(val).toLocaleString('es-ES')}`);

    // Update meter fill width and class
    const meterFill = cardEl.querySelector('.dash-meter-spent, .cat-meter-fill');
    if (meterFill) {
      meterFill.style.width = `${Math.min(100, status.percentage)}%`;
      meterFill.classList.remove('semaphore-green', 'semaphore-amber', 'semaphore-red');
      meterFill.classList.add(status.cssClass);
    }

    // Update semaphore badge if present
    const badgeEl = cardEl.querySelector('.semaphore-badge');
    if (badgeEl) {
      badgeEl.className = `semaphore-badge ${status.cssClass}`;
      badgeEl.innerHTML = `<span class="semaphore-dot"></span><span>${status.percentage}% ${status.label}</span>`;
      badgeEl.title = status.description;
    }

    // Update remaining or spent amount labels if targets exist
    const spentLabel = cardEl.querySelector('[data-budget="spent"]');
    if (spentLabel) spentLabel.textContent = format(status.spent);

    const limitLabel = cardEl.querySelector('[data-budget="limit"]');
    if (limitLabel) limitLabel.textContent = format(status.limit);

    const remainingLabel = cardEl.querySelector('[data-budget="remaining"]');
    if (remainingLabel) remainingLabel.textContent = format(status.remaining);
  }

  window.BudgetWidget = {
    calculateBudgetStatus,
    renderSemaphoreBadge,
    updateBudgetCard,
    CONFIG: SEMAPHORE_CONFIG
  };

})(window);
