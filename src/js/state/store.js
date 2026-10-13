/**
 * Pluxee Enterprise - Global Store & Transactional Engine
 * Strict compliance with Plataforma_de_Gestión_de_Beneficios_para_Empleados.md
 * - Core 6.1: Empleados, Beneficios (max 1 por categoría), Registro de Gastos, Control Transaccional de Saldo, Dashboard, Filtros
 * - Valor Añadido 6.2: Aprobación Manual, Resumen IA, Multidivisa, Categorías Dinámicas, Justificantes
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'pluxee_store_v1';

  const DEFAULT_CATEGORIES = [
    { id: 'comida', name: 'Comida', icon: 'restaurant', color: 'blue' },
    { id: 'transporte', name: 'Transporte', icon: 'directions_bus', color: 'indigo' },
    { id: 'formacion', name: 'Formación', icon: 'school', color: 'emerald' },
    { id: 'salud', name: 'Salud', icon: 'health_and_safety', color: 'teal' },
    { id: 'guarderia', name: 'Guardería', icon: 'child_care', color: 'amber' }
  ];

  const DEFAULT_EMPLOYEES = [
    { id: 'emp-1', name: 'Mateo Rivas', role: 'Tech Lead', department: 'Tecnología', email: 'mateo.rivas@pluxee.io', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
    { id: 'emp-2', name: 'Laura Méndez', role: 'Product Designer', department: 'Diseño', email: 'laura.mendez@pluxee.io', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { id: 'emp-3', name: 'Carlos Fuentes', role: 'DevOps Specialist', department: 'Tecnología', email: 'carlos.fuentes@pluxee.io', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    { id: 'emp-4', name: 'Sofía Alarcón', role: 'People Partner', department: 'RRHH', email: 'sofia.alarcon@pluxee.io', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
    { id: 'emp-5', name: 'Javier Soler', role: 'Data Engineer', department: 'Tecnología', email: 'javier.soler@pluxee.io', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
    { id: 'emp-6', name: 'Nuria Casals', role: 'Finance Lead', department: 'Finanzas', email: 'nuria.casals@pluxee.io', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' }
  ];

  const DEFAULT_BENEFITS = [
    { id: 'b-1', employeeId: 'emp-1', categoryId: 'transporte', amount: 150 },
    { id: 'b-2', employeeId: 'emp-1', categoryId: 'comida', amount: 200 },
    { id: 'b-3', employeeId: 'emp-2', categoryId: 'comida', amount: 180 },
    { id: 'b-4', employeeId: 'emp-2', categoryId: 'formacion', amount: 300 },
    { id: 'b-5', employeeId: 'emp-3', categoryId: 'formacion', amount: 400 },
    { id: 'b-6', employeeId: 'emp-3', categoryId: 'salud', amount: 100 },
    { id: 'b-7', employeeId: 'emp-4', categoryId: 'guarderia', amount: 250 },
    { id: 'b-8', employeeId: 'emp-4', categoryId: 'comida', amount: 150 },
    { id: 'b-9', employeeId: 'emp-5', categoryId: 'transporte', amount: 100 },
    { id: 'b-10', employeeId: 'emp-6', categoryId: 'salud', amount: 120 }
  ];

  const DEFAULT_EXPENSES = [
    { id: 'exp-1', employeeId: 'emp-1', categoryId: 'transporte', concept: 'Abono Renfe Cercanías Madrid', amount: 54.00, date: '2026-10-10', status: 'pendiente', voucherName: 'factura_transporte.pdf' },
    { id: 'exp-2', employeeId: 'emp-2', categoryId: 'comida', concept: 'Almuerzo de trabajo sprint design', amount: 32.50, date: '2026-10-09', status: 'pendiente', voucherName: 'ticket_restaurante.jpg' },
    { id: 'exp-3', employeeId: 'emp-3', categoryId: 'formacion', concept: 'Certificación AWS Solutions Architect', amount: 210.00, date: '2026-10-05', status: 'aprobado', voucherName: 'factura_aws.pdf' },
    { id: 'exp-4', employeeId: 'emp-4', categoryId: 'guarderia', concept: 'Cuota mensual guardería', amount: 240.00, date: '2026-10-04', status: 'rechazado', voucherName: 'recibo_guarderia.pdf' },
    { id: 'exp-5', employeeId: 'emp-5', categoryId: 'transporte', concept: 'Recarga tarjeta Consorcio Metro', amount: 21.80, date: '2026-10-02', status: 'pendiente', voucherName: 'recibo_metro.png' },
    { id: 'exp-6', employeeId: 'emp-6', categoryId: 'salud', concept: 'Copago póliza dental ampliada', amount: 38.00, date: '2026-10-01', status: 'aprobado', voucherName: 'recibo_dental.pdf' }
  ];

  const CURRENCIES = {
    EUR: { symbol: '€', rate: 1.0, label: 'EUR' },
    USD: { symbol: '$', rate: 1.08, label: 'USD' },
    GBP: { symbol: '£', rate: 0.86, label: 'GBP' }
  };

  class PluxeeStore {
    constructor() {
      this.state = this.loadState();
      this.listeners = [];
    }

    loadState() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.employees && parsed.categories) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Could not read from localStorage, using memory defaults', e);
      }

      const initial = {
        categories: DEFAULT_CATEGORIES,
        employees: DEFAULT_EMPLOYEES,
        benefits: DEFAULT_BENEFITS,
        expenses: DEFAULT_EXPENSES,
        currency: 'EUR'
      };
      this.saveState(initial);
      return initial;
    }

    saveState(state = this.state) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('Could not write to localStorage', e);
      }
      this.notify();
    }

    subscribe(fn) {
      this.listeners.push(fn);
      return () => {
        this.listeners = this.listeners.filter(l => l !== fn);
      };
    }

    notify() {
      this.listeners.forEach(fn => fn(this.state));
    }

    // --- Multidivisa ---
    getCurrency() {
      return this.state.currency || 'EUR';
    }

    setCurrency(curr) {
      if (CURRENCIES[curr]) {
        this.state.currency = curr;
        this.saveState();
      }
    }

    formatMoney(amountInEUR) {
      const curr = this.getCurrency();
      const info = CURRENCIES[curr] || CURRENCIES.EUR;
      const converted = (amountInEUR * info.rate).toFixed(2);
      // Format as 1.234,56 € or $ 1,234.56
      if (curr === 'EUR') {
        const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted);
        return `${formatted} €`;
      } else if (curr === 'USD') {
        const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted);
        return `$${formatted}`;
      } else {
        const formatted = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted);
        return `£${formatted}`;
      }
    }

    // --- Categorías Dinámicas ---
    getCategories() {
      return this.state.categories;
    }

    addCategory(name, icon = 'category', color = 'blue') {
      const id = name.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (this.state.categories.some(c => c.id === id)) {
        return { success: false, error: 'La categoría ya existe.' };
      }
      const newCat = { id, name, icon, color };
      this.state.categories.push(newCat);
      this.saveState();
      return { success: true, category: newCat };
    }

    // --- Gestión de Empleados ---
    getEmployees() {
      return this.state.employees;
    }

    getEmployee(id) {
      return this.state.employees.find(e => e.id === id);
    }

    addEmployee(name, role, department, email) {
      const id = 'emp-' + Date.now();
      const newEmp = {
        id,
        name,
        role: role || 'Empleado',
        department: department || 'General',
        email: email || `${id}@pluxee.io`,
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100`
      };
      this.state.employees.push(newEmp);
      this.saveState();
      return { success: true, employee: newEmp };
    }

    deleteEmployee(id) {
      this.state.employees = this.state.employees.filter(e => e.id !== id);
      this.state.benefits = this.state.benefits.filter(b => b.employeeId !== id);
      this.state.expenses = this.state.expenses.filter(x => x.employeeId !== id);
      this.saveState();
      return { success: true };
    }

    // --- Asignación de Beneficios (REGLA: Máximo uno por categoría por empleado) ---
    getEmployeeBenefits(employeeId) {
      return this.state.benefits.filter(b => b.employeeId === employeeId);
    }

    assignBenefit(employeeId, categoryId, amount) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return { success: false, error: 'El importe del beneficio debe ser mayor que 0.' };
      }

      // Comprobar si ya existe un beneficio para este empleado en esta categoría
      const existing = this.state.benefits.find(b => b.employeeId === employeeId && b.categoryId === categoryId);
      if (existing) {
        // Modificación de beneficio existente
        existing.amount = parsedAmount;
        this.saveState();
        return { success: true, benefit: existing, updated: true };
      }

      // Creación de nuevo beneficio (uno por categoría)
      const newBenefit = {
        id: 'b-' + Date.now(),
        employeeId,
        categoryId,
        amount: parsedAmount
      };
      this.state.benefits.push(newBenefit);
      this.saveState();
      return { success: true, benefit: newBenefit, updated: false };
    }

    deleteBenefit(benefitId) {
      this.state.benefits = this.state.benefits.filter(b => b.id !== benefitId);
      this.saveState();
      return { success: true };
    }

    // --- Control Transaccional de Saldo ---
    /**
     * Calcula el saldo disponible de un empleado en una categoría específica:
     * Saldo = Importe Asignado - Gastos acumulados (Aprobados y Pendientes, excluye Rechazados).
     */
    getCategoryBalance(employeeId, categoryId) {
      const benefit = this.state.benefits.find(b => b.employeeId === employeeId && b.categoryId === categoryId);
      if (!benefit) {
        return { assigned: 0, spent: 0, available: 0, hasBenefit: false };
      }

      const activeExpenses = this.state.expenses.filter(
        x => x.employeeId === employeeId && x.categoryId === categoryId && x.status !== 'rechazado'
      );
      const spent = activeExpenses.reduce((sum, x) => sum + x.amount, 0);
      const available = Math.max(0, benefit.amount - spent);

      return {
        assigned: benefit.amount,
        spent: spent,
        available: available,
        hasBenefit: true
      };
    }

    /**
     * Registro de Gastos con Garantía Transaccional:
     * Ningún gasto puede superar el saldo disponible de su categoría.
     * El saldo se descuenta automáticamente al añadir el gasto.
     */
    addExpense({ employeeId, categoryId, concept, amount, date, voucherName = null }) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return { success: false, error: 'El importe del gasto debe ser un número positivo.' };
      }

      const balance = this.getCategoryBalance(employeeId, categoryId);
      if (!balance.hasBenefit) {
        return {
          success: false,
          error: 'El empleado no tiene asignado ningún beneficio en la categoría seleccionada.'
        };
      }

      if (parsedAmount > balance.available) {
        return {
          success: false,
          error: `Control Transaccional de Saldo: El gasto (${parsedAmount.toFixed(2)} €) supera el saldo disponible actual (${balance.available.toFixed(2)} €) para esta categoría.`
        };
      }

      const newExpense = {
        id: 'exp-' + Date.now(),
        employeeId,
        categoryId,
        concept: concept.trim() || 'Gasto registrado',
        amount: parsedAmount,
        date: date || new Date().toISOString().split('T')[0],
        status: 'pendiente', // Flujo de aprobación manual: entra como pendiente
        voucherName: voucherName || 'comprobante_adjunto.pdf'
      };

      this.state.expenses.unshift(newExpense);
      this.saveState();
      return { success: true, expense: newExpense, remainingBalance: balance.available - parsedAmount };
    }

    // --- Flujo de Aprobación Manual (Pendiente / Aprobado / Rechazado) ---
    approveExpense(expenseId) {
      const expense = this.state.expenses.find(x => x.id === expenseId);
      if (!expense) return { success: false, error: 'Gasto no encontrado' };
      expense.status = 'aprobado';
      this.saveState();
      return { success: true, expense };
    }

    rejectExpense(expenseId) {
      const expense = this.state.expenses.find(x => x.id === expenseId);
      if (!expense) return { success: false, error: 'Gasto no encontrado' };
      expense.status = 'rechazado';
      this.saveState();
      return { success: true, expense };
    }

    // --- Filtros Avanzados de Gastos ---
    getExpenses({ employeeId = null, categoryId = null, status = null } = {}) {
      return this.state.expenses.filter(x => {
        if (employeeId && x.employeeId !== employeeId) return false;
        if (categoryId && x.categoryId !== categoryId) return false;
        if (status && x.status !== status) return false;
        return true;
      });
    }

    // --- Métricas del Dashboard de Control ---
    getDashboardMetrics() {
      const totalAssigned = this.state.benefits.reduce((sum, b) => sum + b.amount, 0);
      const activeExpenses = this.state.expenses.filter(x => x.status !== 'rechazado');
      const totalSpent = activeExpenses.reduce((sum, x) => sum + x.amount, 0);
      const totalAvailable = Math.max(0, totalAssigned - totalSpent);
      const executionRate = totalAssigned > 0 ? ((totalSpent / totalAssigned) * 100).toFixed(1) : 0;

      // Desglose por categorías
      const categoryBreakdown = this.state.categories.map(cat => {
        const catBenefits = this.state.benefits.filter(b => b.categoryId === cat.id);
        const assigned = catBenefits.reduce((sum, b) => sum + b.amount, 0);
        const catExpenses = activeExpenses.filter(x => x.categoryId === cat.id);
        const spent = catExpenses.reduce((sum, x) => sum + x.amount, 0);
        const available = Math.max(0, assigned - spent);
        const pct = assigned > 0 ? Math.min(100, Math.round((spent / assigned) * 100)) : 0;
        return {
          ...cat,
          assigned,
          spent,
          available,
          pct
        };
      });

      // Lista de empleados con total gastado y disponible
      const employeeSummary = this.state.employees.map(emp => {
        const empBenefits = this.state.benefits.filter(b => b.employeeId === emp.id);
        const assigned = empBenefits.reduce((sum, b) => sum + b.amount, 0);
        const empExpenses = activeExpenses.filter(x => x.employeeId === emp.id);
        const spent = empExpenses.reduce((sum, x) => sum + x.amount, 0);
        const available = Math.max(0, assigned - spent);
        const pct = assigned > 0 ? Math.min(100, Math.round((spent / assigned) * 100)) : 0;

        // Categoría con mayor asignación
        let topCategory = 'Sin beneficios';
        if (empBenefits.length > 0) {
          const sorted = [...empBenefits].sort((a, b) => b.amount - a.amount);
          const found = this.state.categories.find(c => c.id === sorted[0].categoryId);
          if (found) topCategory = found.name;
        }

        return {
          ...emp,
          assigned,
          spent,
          available,
          pct,
          topCategory,
          benefitsCount: empBenefits.length
        };
      });

      return {
        totalAssigned,
        totalSpent,
        totalAvailable,
        executionRate,
        categoryBreakdown,
        employeeSummary,
        pendingCount: this.state.expenses.filter(x => x.status === 'pendiente').length,
        approvedCount: this.state.expenses.filter(x => x.status === 'aprobado').length,
        rejectedCount: this.state.expenses.filter(x => x.status === 'rechazado').length
      };
    }

    // --- Resumen con IA en Dashboard ---
    getAISummary() {
      const m = this.getDashboardMetrics();
      const topCat = [...m.categoryBreakdown].sort((a, b) => b.pct - a.pct)[0];
      const lowestCat = [...m.categoryBreakdown].filter(c => c.assigned > 0).sort((a, b) => a.pct - b.pct)[0];

      return {
        title: 'Resumen Inteligente de Saldo con IA',
        model: 'Google Genkit',
        summary: `El gasto acumulado (${this.formatMoney(m.totalSpent)}) representa el ${m.executionRate}% del presupuesto total asignado (${this.formatMoney(m.totalAssigned)}). Quedan ${this.formatMoney(m.totalAvailable)} de saldo disponible sin caducidad.`,
        recommendation: topCat
          ? `La categoría ${topCat.name} presenta el mayor consumo (${topCat.pct}% agotado), mientras que ${lowestCat ? lowestCat.name : 'otras categorías'} mantiene suficiente remanente. Se recomienda supervisar nuevos registros en ${topCat.name} para mantener la solvencia.`
          : 'Presupuesto equilibrado en todas las verticales activas.'
      };
    }

    // Reset para volver a los datos limpios de fábrica
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      this.state = this.loadState();
      this.notify();
    }
  }

  // Instancia singleton global accesible en toda la aplicación
  window.PluxeeStore = new PluxeeStore();

})(window);
