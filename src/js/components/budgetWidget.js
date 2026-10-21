/**
 * Pluxee Enterprise - Budget Semaphore Widget (US-FE-02.2 & US-FE-02.3)
 * - Computes (totalSpent / totalLimit) * 100 and controls the 3-tier traffic light semaphore
 * - Animates progress bar with dynamic label: "Budget Consumed: X€ of Y€ (Z%)"
 * - 🟢 Green: <= 33% consumed (Safe, healthy spending level)
 * - 🟡 Amber: 33% - 66% consumed (Warning threshold, approaching budget cap)
 * - 🔴 Red: > 66% or limit reached (Critical alert, limit exceeded or imminent breach)
 */

(function (window) {
  'use strict';

  const SEMAPHORE_CONFIG = {
    GREEN: {
      max: 33,
      tier: 'green',
      cssClass: 'semaphore-green',
      label: 'Nivel Óptimo',
      description: 'Presupuesto saludable y dentro de los parámetros previstos'
    },
    AMBER: {
      max: 66,
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
    if (roundedPct <= SEMAPHORE_CONFIG.GREEN.max) {
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
   * Generates dynamic label formatted: "Budget Consumed: X€ of Y€ (Z%)" / "Presupuesto consumido: X€ de Y€ (Z%)"
   * @param {number} spent
   * @param {number} limit
   * @param {number} percentage
   * @param {Function} formatFn
   * @param {string} lang - 'es' or 'en'
   * @returns {string} Formatted label
   */
  function generateConsumedLabel(spent, limit, percentage, formatFn, lang = 'es') {
    const format = formatFn || ((val) => `€${Number(val).toLocaleString('es-ES')}`);
    const pct = percentage !== undefined ? percentage : (limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0);
    if (lang === 'en') {
      return `Budget Consumed: ${format(spent)} of ${format(limit)} (${pct}%)`;
    }
    return `Presupuesto consumido: ${format(spent)} de ${format(limit)} (${pct}%)`;
  }

  /**
   * Animates the progress bar width smoothly from 0% or previous value to target percentage
   * @param {HTMLElement} meterFillEl
   * @param {number} targetPercentage
   */
  function animateProgressBar(meterFillEl, targetPercentage) {
    if (!meterFillEl) return;
    const clamped = Math.min(100, Math.max(0, Number(targetPercentage) || 0));
    meterFillEl.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        meterFillEl.style.width = `${clamped}%`;
      });
    });
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
   * Updates a visual budget card element in the DOM with animated meter and dynamic label (US-FE-02.3)
   * @param {HTMLElement} cardEl - The container element
   * @param {number} spent
   * @param {number} limit
   * @param {Function} formatFn - Optional formatter for currency
   * @param {Object} options - { lang: 'es'|'en', animate: true }
   */
  function updateBudgetCard(cardEl, spent, limit, formatFn, options = {}) {
    if (!cardEl) return;
    const status = calculateBudgetStatus(spent, limit);
    const format = formatFn || ((val) => `€${Number(val).toLocaleString('es-ES')}`);
    const lang = options.lang || 'es';

    // 1. Update dynamic label "Budget Consumed: X€ of Y€ (Z%)"
    const dynamicLabelEl = cardEl.querySelector('[data-budget="consumed-label"]');
    if (dynamicLabelEl) {
      dynamicLabelEl.textContent = generateConsumedLabel(status.spent, status.limit, status.percentage, format, lang);
    }

    // 2. Animate or update progress meter fill
    const meterFill = cardEl.querySelector('[data-budget="meter-fill"], .dash-meter-spent, .cat-meter-fill');
    if (meterFill) {
      meterFill.classList.remove('semaphore-green', 'semaphore-amber', 'semaphore-red');
      meterFill.classList.add(status.cssClass);
      if (options.animate !== false) {
        animateProgressBar(meterFill, status.percentage);
      } else {
        meterFill.style.width = `${Math.min(100, status.percentage)}%`;
      }
    }

    // 3. Update semaphore badge
    const badgeEl = cardEl.querySelector('.semaphore-badge');
    if (badgeEl) {
      badgeEl.className = `semaphore-badge ${status.cssClass}`;
      const textEl = badgeEl.querySelector('[data-budget="semaphore-text"]') || badgeEl.lastElementChild;
      if (textEl && textEl.tagName !== 'SPAN' || textEl === badgeEl.querySelector('.semaphore-dot')) {
        badgeEl.innerHTML = `<span class="semaphore-dot"></span><span data-budget="semaphore-text">${status.percentage}% ${status.label}</span>`;
      } else if (textEl) {
        textEl.textContent = `${status.percentage}% ${status.label}`;
      }
      badgeEl.title = status.description;
    }

    // 4. Update data labels if present
    const spentLabel = cardEl.querySelector('[data-budget="spent"]');
    if (spentLabel) spentLabel.textContent = format(status.spent);

    const limitLabel = cardEl.querySelector('[data-budget="limit"]');
    if (limitLabel) limitLabel.textContent = format(status.limit);

    const remainingLabel = cardEl.querySelector('[data-budget="remaining"]');
    if (remainingLabel) remainingLabel.textContent = format(status.remaining);
  }

  window.BudgetWidget = {
    calculateBudgetStatus,
    generateConsumedLabel,
    animateProgressBar,
    renderSemaphoreBadge,
    updateBudgetCard,
    CONFIG: SEMAPHORE_CONFIG
  };

})(window);
