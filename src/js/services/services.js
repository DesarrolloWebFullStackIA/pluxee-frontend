/**
 * Pluxee Enterprise - Services Layer
 * Clean interface separating HTTP/Data concerns from UI components.
 */

(function (window) {
  'use strict';

  const store = window.PluxeeStore;

  const services = {
    // --- Gestión de Empleados ---
    employees: {
      getAll: () => store.getEmployees(),
      getById: (id) => store.getEmployee(id),
      create: (data) => store.addEmployee(data.name, data.role, data.department, data.email),
      delete: (id) => store.deleteEmployee(id),
      getSummaryList: () => store.getDashboardMetrics().employeeSummary
    },

    // --- Asignación de Beneficios ---
    benefits: {
      getByEmployee: (employeeId) => store.getEmployeeBenefits(employeeId),
      assign: (employeeId, categoryId, amount) => store.assignBenefit(employeeId, categoryId, amount),
      delete: (benefitId) => store.deleteBenefit(benefitId),
      getCategoryBalance: (employeeId, categoryId) => store.getCategoryBalance(employeeId, categoryId)
    },

    // --- Registro y Control Transaccional de Gastos ---
    expenses: {
      getAll: (filters) => store.getExpenses(filters),
      create: (data) => store.addExpense(data), // Control transaccional garantizado
      approve: (id) => store.approveExpense(id),
      reject: (id) => store.rejectExpense(id)
    },

    // --- Categorías Dinámicas ---
    categories: {
      getAll: () => store.getCategories(),
      create: (name, icon, color) => store.addCategory(name, icon, color)
    },

    // --- Inteligencia Artificial ---
    ai: {
      getSummary: () => store.getAISummary()
    },

    // --- Métricas Globales (US-FE-02.4) ---
    dashboard: {
      getMetrics: () => (window.PluxeeStore ? window.PluxeeStore.getDashboardMetrics() : {}),
      getGlobalBudgetMetrics: () => (window.PluxeeStore ? window.PluxeeStore.getGlobalBudgetMetrics() : {}),
      getGlobalBudgetCap: () => (window.PluxeeStore ? window.PluxeeStore.getGlobalBudgetCap() : 45000),
      setGlobalBudgetCap: (amount) => (window.PluxeeStore ? window.PluxeeStore.setGlobalBudgetCap(amount) : { success: false })
    },

    // --- Divisas ---
    currency: {
      get: () => store.getCurrency(),
      set: (curr) => store.setCurrency(curr),
      format: (amount) => store.formatMoney(amount)
    }
  };

  window.PluxeeServices = services;

})(window);
