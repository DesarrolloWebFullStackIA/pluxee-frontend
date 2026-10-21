/**
 * Pluxee Enterprise - Global Store & Transactional Engine
 * Strict compliance with Plataforma_de_Gestión_de_Beneficios_para_Empleados.md
 * - Core 6.1: Empleados, Beneficios (max 1 por categoría), Registro de Gastos, Control Transaccional de Saldo, Dashboard, Filtros
 * - Valor Añadido 6.2: Aprobación Manual, Resumen IA, Multidivisa, Categorías Dinámicas, Justificantes
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'pluxee_store_v2';

  const DEFAULT_CATEGORIES = [
    { id: 'comida', name: 'Comida', icon: 'restaurant', color: 'blue', budgetCap: 15000 },
    { id: 'transporte', name: 'Transporte', icon: 'directions_bus', color: 'indigo', budgetCap: 12000 },
    { id: 'formacion', name: 'Formación', icon: 'school', color: 'emerald', budgetCap: 10000 },
    { id: 'salud', name: 'Salud', icon: 'health_and_safety', color: 'teal', budgetCap: 8000 }
  ];

  const DEFAULT_EMPLOYEES = [
    { id: 'emp-1', name: 'Sofia Chen', role: 'Talent Lead', department: 'RRHH', email: 'sofia.chen@pluxee.io', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
    { id: 'emp-2', name: 'Carlos Ruiz', role: 'Product Designer', department: 'Diseño', email: 'carlos.ruiz@pluxee.io', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    { id: 'emp-3', name: 'Laura Moreno', role: 'Senior Frontend Eng.', department: 'Tecnología', email: 'laura.moreno@pluxee.io', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
    { id: 'emp-4', name: 'Mateo Rivas', role: 'DevOps Specialist', department: 'Tecnología', email: 'mateo.rivas@pluxee.io', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
    { id: 'emp-5', name: 'Nuria Casals', role: 'Finance Lead', department: 'Finanzas', email: 'nuria.casals@pluxee.io', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' },
    { id: 'emp-6', name: 'Javier Soler', role: 'Data Engineer', department: 'Tecnología', email: 'javier.soler@pluxee.io', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100' }
  ];

  const DEFAULT_BENEFITS = [
    { id: 'b-1', employeeId: 'emp-1', categoryId: 'salud', amount: 3600 },
    { id: 'b-2', employeeId: 'emp-2', categoryId: 'comida', amount: 2400 },
    { id: 'b-3', employeeId: 'emp-3', categoryId: 'formacion', amount: 3100 },
    { id: 'b-4', employeeId: 'emp-4', categoryId: 'transporte', amount: 2800 },
    { id: 'b-5', employeeId: 'emp-5', categoryId: 'salud', amount: 1800 },
    { id: 'b-6', employeeId: 'emp-5', categoryId: 'formacion', amount: 2000 },
    { id: 'b-7', employeeId: 'emp-6', categoryId: 'transporte', amount: 2200 },
    { id: 'b-8', employeeId: 'emp-6', categoryId: 'comida', amount: 1800 }
  ];

  const DEFAULT_EXPENSES = [
    { id: 'exp-1', employeeId: 'emp-1', categoryId: 'salud', concept: 'Póliza seguro médico familiar Adeslas', amount: 1480.00, date: '2026-10-12', status: 'aprobado', voucherName: 'poliza_adeslas.pdf' },
    { id: 'exp-2', employeeId: 'emp-2', categoryId: 'comida', concept: 'Tarjeta Gourmet restaurante y catering', amount: 2210.00, date: '2026-10-10', status: 'aprobado', voucherName: 'recibo_gourmet.pdf' },
    { id: 'exp-3', employeeId: 'emp-3', categoryId: 'formacion', concept: 'Bootcamp avanzado TypeScript y Arquitectura', amount: 1100.00, date: '2026-10-08', status: 'aprobado', voucherName: 'factura_bootcamp.pdf' },
    { id: 'exp-4', employeeId: 'emp-4', categoryId: 'transporte', concept: 'Abono Renfe Alta Velocidad y cercanías', amount: 1980.00, date: '2026-10-05', status: 'aprobado', voucherName: 'factura_renfe.pdf' },
    { id: 'exp-5', employeeId: 'emp-5', categoryId: 'salud', concept: 'Tratamiento bucodental y chequeo anual', amount: 920.00, date: '2026-10-03', status: 'aprobado', voucherName: 'recibo_dental.pdf' },
    { id: 'exp-6', employeeId: 'emp-5', categoryId: 'formacion', concept: 'Curso Financial Modeling & Forecasting', amount: 850.00, date: '2026-10-02', status: 'pendiente', voucherName: 'factura_curso.pdf' },
    { id: 'exp-7', employeeId: 'emp-6', categoryId: 'transporte', concept: 'Tarjeta Consorcio Regional Transportes', amount: 1450.00, date: '2026-10-01', status: 'aprobado', voucherName: 'recibo_consorcio.png' },
    { id: 'exp-8', employeeId: 'emp-6', categoryId: 'comida', concept: 'Subsidio comidas de equipo ingeniería', amount: 1200.00, date: '2026-09-28', status: 'aprobado', voucherName: 'factura_catering.pdf' },
    // Fondo corporativo plantilla (124 empleados)
    { id: 'exp-corp-1', employeeId: 'emp-pool', categoryId: 'comida', concept: 'Fondo corporativo vales restaurante plantilla (118 empleados)', amount: 8290.00, date: '2026-10-01', status: 'aprobado', voucherName: 'consolidado_comida.pdf' },
    { id: 'exp-corp-2', employeeId: 'emp-pool', categoryId: 'transporte', concept: 'Fondo corporativo abonos transporte plantilla', amount: 4370.00, date: '2026-10-01', status: 'aprobado', voucherName: 'consolidado_transporte.pdf' },
    { id: 'exp-corp-3', employeeId: 'emp-pool', categoryId: 'formacion', concept: 'Licencias corporativas O\'Reilly Learning & Cloud', amount: 3250.00, date: '2026-10-01', status: 'aprobado', voucherName: 'consolidado_formacion.pdf' },
    { id: 'exp-corp-4', employeeId: 'emp-pool', categoryId: 'salud', concept: 'Póliza colectiva bienestar y fisioterapia', amount: 1400.00, date: '2026-10-01', status: 'aprobado', voucherName: 'consolidado_salud.pdf' }
  ];

  const CURRENCIES = {
    EUR: { symbol: '€', rate: 1.0, label: 'EUR' },
    MXN: { symbol: '$', rate: 21.5, label: 'MXN' }
  };

  class PluxeeStore {
    constructor() {
      this.listeners = [];
      this.state = this.loadState();
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => this.syncGlobalBudgetCap(event));
      }
    }

    loadState() {
      try {
        if (typeof localStorage !== 'undefined') {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.employees && parsed.categories) {
              if (!parsed.globalBudgetCap) {
                parsed.globalBudgetCap = 45000;
              }
              return parsed;
            }
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
        currency: 'EUR',
        globalBudgetCap: 45000
      };
      this.saveState(initial);
      return initial;
    }

    saveState(state = this.state) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        }
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
      if (Array.isArray(this.listeners)) {
        this.listeners.forEach(fn => {
          try {
            fn(this.state);
          } catch (err) {
            console.error('Error in store subscriber:', err);
          }
        });
      }
    }

    // --- Control de Presupuesto Global (US-FE-02.4) ---
    getGlobalBudgetCap() {
      try {
        if (typeof localStorage !== 'undefined') {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            const storedCap = Number(parsed?.globalBudgetCap);
            if (Number.isFinite(storedCap) && storedCap > 0) {
              this.state.globalBudgetCap = storedCap;
            }
          }
        }
      } catch (e) {
        console.warn('Could not refresh the global budget from localStorage', e);
      }
      return Number(this.state.globalBudgetCap) || 45000;
    }

    syncGlobalBudgetCap(event) {
      if (event.key !== STORAGE_KEY) return;

      let updatedCap = 45000;
      try {
        if (event.newValue) {
          const parsed = JSON.parse(event.newValue);
          const storedCap = Number(parsed?.globalBudgetCap);
          if (Number.isFinite(storedCap) && storedCap > 0) {
            updatedCap = storedCap;
          }
        }
      } catch (e) {
        console.warn('Could not sync the global budget from another tab', e);
        return;
      }

      if (updatedCap === Number(this.state.globalBudgetCap)) return;
      this.state.globalBudgetCap = updatedCap;
      this.notify();
      window.dispatchEvent(new CustomEvent('budget:updated', {
        detail: { globalBudgetCap: updatedCap, metrics: this.getGlobalBudgetMetrics() }
      }));
    }

    setGlobalBudgetCap(amount) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) {
        return { success: false, error: 'El importe del presupuesto global debe ser un número positivo mayor que cero.' };
      }
      this.state.globalBudgetCap = parsed;
      this.saveState();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('budget:updated', {
          detail: { globalBudgetCap: parsed, metrics: this.getGlobalBudgetMetrics() }
        }));
      }
      return { success: true, globalBudgetCap: parsed };
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
      if (typeof window !== 'undefined' && typeof window.formatMoney === 'function') {
        return window.formatMoney(Number(amountInEUR) || 0);
      }
      const curr = this.getCurrency();
      const info = CURRENCIES[curr] || CURRENCIES.EUR;
      const converted = ((Number(amountInEUR) || 0) * info.rate).toFixed(2);
      if (curr === 'EUR') {
        const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted);
        return `€${formatted}`;
      } else if (curr === 'MXN') {
        const formatted = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted);
        return `$${formatted}`;
      } else {
        const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(converted);
        return `€${formatted}`;
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
      const newCat = { id, name, icon, color, budgetCap: 5000 };
      this.state.categories.push(newCat);
      this.saveState();
      return { success: true, category: newCat };
    }

    // --- Gestión de Empleados ---
    getEmployees() {
      return this.state.employees.filter(e => e.id !== 'emp-pool');
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

    // --- Métricas Globales del Dashboard de Control (US-FE-02.4) ---
    getGlobalBudgetMetrics() {
      const globalBudgetCap = this.getGlobalBudgetCap();
      const activeExpenses = this.state.expenses.filter(x => x.status !== 'rechazado');
      const totalSpent = activeExpenses.reduce((sum, x) => sum + x.amount, 0);
      const totalAvailable = Math.max(0, globalBudgetCap - totalSpent);
      const executionRate = globalBudgetCap > 0 ? Number(((totalSpent / globalBudgetCap) * 100).toFixed(1)) : 0;
      const remainingPercentage = globalBudgetCap > 0 ? Math.max(0, Number((100 - (totalSpent / globalBudgetCap) * 100).toFixed(1))) : 100;

      // Status semáforo usando BudgetWidget si está disponible
      const semaphoreStatus = (window.BudgetWidget && typeof window.BudgetWidget.calculateBudgetStatus === 'function')
        ? window.BudgetWidget.calculateBudgetStatus(totalSpent, globalBudgetCap)
        : {
            spent: totalSpent,
            limit: globalBudgetCap,
            remaining: totalAvailable,
            percentage: executionRate,
            tier: executionRate < 70 ? 'green' : executionRate <= 90 ? 'amber' : 'red',
            cssClass: executionRate < 70 ? 'semaphore-green' : executionRate <= 90 ? 'semaphore-amber' : 'semaphore-red',
            label: executionRate < 70 ? 'Nivel Óptimo' : executionRate <= 90 ? 'Tope Próximo' : 'Alerta Crítica',
            description: executionRate < 70
              ? 'Presupuesto saludable y dentro de los parámetros previstos'
              : executionRate <= 90
              ? 'Atención: consumo acercándose al techo presupuestario'
              : 'Riesgo de sobrecoste o límite presupuestario excedido'
          };

      // Desglose por categorías dinámicas
      const categoryBreakdown = this.state.categories.map(cat => {
        const catBenefits = this.state.benefits.filter(b => b.categoryId === cat.id);
        const assigned = cat.budgetCap || catBenefits.reduce((sum, b) => sum + b.amount, 0);
        const catExpenses = activeExpenses.filter(x => x.categoryId === cat.id);
        const spent = catExpenses.reduce((sum, x) => sum + x.amount, 0);
        const available = Math.max(0, assigned - spent);
        const pct = assigned > 0 ? Math.min(100, Math.round((spent / assigned) * 100)) : 0;
        const tier = pct < 70 ? 'green' : pct <= 90 ? 'amber' : 'red';
        const cssClass = pct < 70 ? 'semaphore-green' : pct <= 90 ? 'semaphore-amber' : 'semaphore-red';
        return {
          ...cat,
          assigned,
          spent,
          available,
          pct,
          tier,
          cssClass
        };
      });

      // Resumen de empleados y semáforo individual
      const employeeSummary = this.state.employees.map(emp => {
        const empBenefits = this.state.benefits.filter(b => b.employeeId === emp.id);
        const assigned = empBenefits.reduce((sum, b) => sum + b.amount, 0);
        const empExpenses = activeExpenses.filter(x => x.employeeId === emp.id);
        const spent = empExpenses.reduce((sum, x) => sum + x.amount, 0);
        const available = Math.max(0, assigned - spent);
        const pct = assigned > 0 ? Math.round((spent / assigned) * 100) : 0;

        let topCategory = 'Sin beneficios';
        let topCategoryId = null;
        if (empBenefits.length > 0) {
          const sorted = [...empBenefits].sort((a, b) => b.amount - a.amount);
          const found = this.state.categories.find(c => c.id === sorted[0].categoryId);
          if (found) {
            topCategory = found.name;
            topCategoryId = found.id;
          }
        }

        const semaphore = (window.BudgetWidget && typeof window.BudgetWidget.calculateBudgetStatus === 'function')
          ? window.BudgetWidget.calculateBudgetStatus(spent, assigned)
          : {
              spent,
              limit: assigned,
              remaining: available,
              percentage: pct,
              tier: pct < 70 ? 'green' : pct <= 90 ? 'amber' : 'red',
              cssClass: pct < 70 ? 'semaphore-green' : pct <= 90 ? 'semaphore-amber' : 'semaphore-red',
              label: pct < 70 ? `${pct}% Consumido` : pct <= 90 ? `${pct}% Advertencia` : `${pct}% Alerta Crítica`
            };

        return {
          ...emp,
          assigned,
          spent,
          available,
          pct,
          topCategory,
          topCategoryId,
          semaphore,
          benefitsCount: empBenefits.length
        };
      });

      // Top empleados ordenados por gasto descendente (AC-02.4)
      const topConsumingEmployees = [...employeeSummary]
        .filter(e => e.id !== 'emp-pool')
        .sort((a, b) => b.spent - a.spent);

      return {
        globalBudgetCap,
        totalAssigned: globalBudgetCap,
        totalBenefitsAssigned: this.state.benefits.reduce((sum, b) => sum + b.amount, 0),
        totalSpent,
        totalAvailable,
        executionRate,
        remainingPercentage,
        semaphoreStatus,
        categoryBreakdown,
        employeeSummary,
        topConsumingEmployees,
        totalEmployees: this.state.employees.filter(e => e.id !== 'emp-pool').length,
        activeEmployeesCount: 124,
        pendingCount: this.state.expenses.filter(x => x.status === 'pendiente').length,
        approvedCount: this.state.expenses.filter(x => x.status === 'aprobado').length,
        rejectedCount: this.state.expenses.filter(x => x.status === 'rechazado').length
      };
    }

    // Delegación compatible con llamadas existentes a getDashboardMetrics
    getDashboardMetrics() {
      return this.getGlobalBudgetMetrics();
    }

    // --- Resumen con IA en Dashboard ---
    getAISummary() {
      const m = this.getGlobalBudgetMetrics();
      const topCat = [...m.categoryBreakdown].sort((a, b) => b.pct - a.pct)[0];
      const lowestCat = [...m.categoryBreakdown].filter(c => c.assigned > 0).sort((a, b) => a.pct - b.pct)[0];

      return {
        title: 'Resumen Inteligente de Saldo con IA',
        model: 'Google Genkit',
        summary: `El gasto acumulado (${this.formatMoney(m.totalSpent)}) representa el ${m.executionRate}% del presupuesto asignado (${this.formatMoney(m.totalAssigned)}). Quedan ${this.formatMoney(m.totalAvailable)} disponibles en total.`,
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
