/**
 * Pluxee Enterprise - AI Budget Insights Service (US-FE-09.3 / Google Genkit Integration)
 * Generates context-aware executive financial diagnostics, limit alerts (>85% cap),
 * and optimization recommendations based on real-time PluxeeStore metrics.
 * 
 * Prepares the exact contract for Sprint 2 Genkit backend integration (AC-09.4).
 */

(function (window) {
  'use strict';

  /**
   * Helper to format numbers into active currency (EUR / MXN)
   * @param {number} eurAmount
   * @returns {string}
   */
  function format(eurAmount) {
    if (typeof window.formatMoney === 'function') {
      return window.formatMoney(Number(eurAmount) || 0);
    }
    return `€${(Number(eurAmount) || 0).toLocaleString('es-ES')}`;
  }

  /**
   * Genkit AI Service Object
   */
  const PluxeeGenkitService = {
    /**
     * Endpoint configuration for Sprint 2 Genkit Backend
     */
    apiEndpoint: '/api/v1/genkit/insights',
    isBackendAvailable: false,

    /**
     * Generates a context-aware budget diagnosis based on store metrics.
     * Simulates async processing latency (shimmer state) during Sprint 1.
     * 
     * @param {Object} [options]
     * @param {number} [options.delayMs=900] - Artificial latency to display skeleton animation
     * @param {boolean} [options.forceRefresh=false]
     * @returns {Promise<Object>} Structured 3-part diagnostic output (AC-09.3)
     */
    async generateBudgetDiagnosis(options = {}) {
      const delay = typeof options.delayMs === 'number' ? options.delayMs : 900;

      // Sprint 2 hook: If backend endpoint is live, query the real Genkit agent
      if (this.isBackendAvailable) {
        try {
          const res = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metrics: window.PluxeeStore?.getGlobalBudgetMetrics?.() || {}
            })
          });
          if (res.ok) {
            const data = await res.json();
            return data;
          }
        } catch (err) {
          console.warn('[GenkitService] Backend unreachable, falling back to local reasoning engine:', err.message);
        }
      }

      // Simulate async processing delay so the user experiences the shimmering skeleton loader (AC-09.2)
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Read real-time metrics directly from store
      const store = window.PluxeeStore;
      const metrics = (store && typeof store.getGlobalBudgetMetrics === 'function')
        ? store.getGlobalBudgetMetrics()
        : {
            globalBudgetCap: 45000,
            totalSpent: 28500,
            totalAvailable: 16500,
            percentageConsumed: 63.3,
            remainingPercentage: 36.7,
            categoryBreakdown: [],
            topConsumingEmployees: []
          };

      return this.computeDiagnosticOutput(metrics);
    },

    /**
     * Internal reasoning engine that structures the 3 analytical blocks from raw metrics
     * @param {Object} m - Metrics object from PluxeeStore
     * @returns {Object} Structured diagnosis
     */
    computeDiagnosticOutput(m) {
      const limit = Number(m.globalBudgetCap) || 45000;
      const spent = Number(m.totalSpent) || 0;
      const available = Number(m.totalAvailable) || (limit - spent);
      const ratio = limit > 0 ? Number(((spent / limit) * 100).toFixed(1)) : 0;

      // -------------------------------------------------------------
      // 1. Overall Budget Health (AC-09.3.1)
      // -------------------------------------------------------------
      let healthStatus = 'optimal';
      let healthTone = 'óptimo para el período en curso';
      if (ratio >= 90) {
        healthStatus = 'critical';
        healthTone = 'crítico; se aconseja congelar peticiones extraordinarias de inmediato';
      } else if (ratio >= 75) {
        healthStatus = 'warning';
        healthTone = 'moderado con atención requerida en partidas próximas a saturación';
      }

      const healthSummary = `El gasto acumulado (<strong>${format(spent)}</strong>) representa el <strong>${ratio}%</strong> del presupuesto global asignado (<strong>${format(limit)}</strong>). Quedan <strong class="text-highlight-green">${format(available)} disponibles</strong> en total, manteniendo un margen de solvencia ${healthTone}.`;

      // -------------------------------------------------------------
      // 2. Limit & Semaphore Alerts (>85% Cap) (AC-09.3.2)
      // -------------------------------------------------------------
      const alerts = [];

      // Check employees nearing their individual caps
      if (Array.isArray(m.topConsumingEmployees)) {
        m.topConsumingEmployees.forEach((emp) => {
          const empPct = Number(emp.pct) || 0;
          if (empPct >= 85) {
            alerts.push({
              id: `emp-${emp.id || emp.name}`,
              type: 'employee',
              name: emp.name,
              percentage: empPct,
              metric: `${empPct}% del tope asignado`,
              severity: empPct >= 90 ? 'critical' : 'warning'
            });
          }
        });
      }

      // Check benefit categories nearing saturation
      if (Array.isArray(m.categoryBreakdown)) {
        m.categoryBreakdown.forEach((cat) => {
          const catPct = Number(cat.pct) || 0;
          if (catPct >= 75) {
            alerts.push({
              id: `cat-${cat.id}`,
              type: 'category',
              name: `Categoría ${cat.name}`,
              percentage: catPct,
              metric: `${catPct}% de partida consumida`,
              severity: catPct >= 85 ? 'critical' : 'warning'
            });
          }
        });
      }

      // If no critical alerts found, add an optimal indicator
      if (alerts.length === 0) {
        alerts.push({
          id: 'alert-all-optimal',
          type: 'optimal',
          name: 'Partidas bajo control',
          percentage: ratio,
          metric: 'Todos los cupos < 75% del límite acordado',
          severity: 'optimal'
        });
      }

      // -------------------------------------------------------------
      // 3. Optimization Recommendations (AC-09.3.3)
      // -------------------------------------------------------------
      const underutilized = [];
      const saturated = [];

      if (Array.isArray(m.categoryBreakdown)) {
        m.categoryBreakdown.forEach((cat) => {
          if (cat.pct <= 55) {
            underutilized.push(cat.name);
          } else if (cat.pct >= 75) {
            saturated.push(cat.name);
          }
        });
      }

      let recommendationText = '';
      if (underutilized.length > 0 && saturated.length > 0) {
        const underList = underutilized.map((c) => `<em class="highlight-cat">${c}</em>`).join(' y ');
        const satList = saturated.map((c) => `<em class="highlight-cat">${c}</em>`).join(' y ');
        recommendationText = `Las categorías ${underList} mantienen más del 45% de remanente disponible. Se sugiere transferir un remanente acordado de partida hacia ${satList} para evitar la saturación de los topes antes del cierre de mes.`;
      } else if (saturated.length > 0) {
        const satList = saturated.map((c) => `<em class="highlight-cat">${c}</em>`).join(', ');
        recommendationText = `Las partidas de ${satList} muestran una tasa de consumo acelerada. Se recomienda habilitar un incremento temporal en los topes de asignación mediante el botón de edición directa.`;
      } else {
        recommendationText = `La distribución presupuestaria actual es equilibrada y sostenible. Todos los departamentos mantienen margen operativo sin necesidad de reasignación inmediata.`;
      }

      return {
        success: true,
        source: 'google-genkit-advisor-v1',
        timestamp: new Date().toISOString(),
        health: {
          status: healthStatus,
          spent,
          limit,
          available,
          ratio,
          summaryText: healthSummary
        },
        alerts,
        recommendations: {
          summaryText: recommendationText,
          underutilized,
          saturated
        }
      };
    }
  };

  // Expose globally to window
  window.PluxeeGenkitService = PluxeeGenkitService;

})(window);
