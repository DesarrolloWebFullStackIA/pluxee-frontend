/**
 * Pluxee Enterprise - Dashboard View Controller
 * Coordinates KPI metrics, Budget Semaphore widget animations, and real-time state updates.
 */

function initDashboardView() {
  const monitorCard = document.getElementById('budget-monitor-card');
  if (monitorCard && window.BudgetWidget) {
    // Budget metrics (spent: 28500, limit: 45000 -> 63.3%)
    const spent = 28500;
    const limit = 45000;
    window.BudgetWidget.updateBudgetCard(monitorCard, spent, limit, null, {
      animate: true,
      lang: 'es'
    });
  }

  // Smoothly animate category progress meters on entry
  const catMeters = document.querySelectorAll('.cat-meter-fill');
  catMeters.forEach((meter) => {
    meter.style.transition = 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
  });
}