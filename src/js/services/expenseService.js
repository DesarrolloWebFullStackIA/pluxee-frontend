const USE_MOCK_EXPENSES = true;

const EXPENSES_API_URL = "http://localhost:3000/api/expenses";


const expenseEmployees = [
  { id: 1, name: "Mateo Rivas", role: "Tech Lead" },
  { id: 2, name: "Laura Méndez", role: "Product Designer" },
  { id: 3, name: "Carlos Fuentes", role: "DevOps Specialist" },
  { id: 4, name: "Sofía Alarcón", role: "People Partner" },
  { id: 5, name: "Javier Soler", role: "Data Engineer" },
  { id: 6, name: "Nuria Casals", role: "Finance Lead" }
];

const expenseCategories = [
  { id: 1, name: "Transporte" },
  { id: 2, name: "Restauración" },
  { id: 3, name: "Formación" },
  { id: 4, name: "Guardería" },
  { id: 5, name: "Salud" }
];

let mockExpenses = [
  { id: 1, date: "2024-10-24", employee: expenseEmployees[0], category: "Transporte", concept: "Abono mensual tren cercanías Renfe", amount: 54, receiptType: "pdf", receiptUrl: "#", status: "pending" },
  { id: 2, date: "2024-10-23", employee: expenseEmployees[1], category: "Restauración", concept: "Almuerzo de trabajo sprint design", amount: 32.5, receiptType: "image", receiptUrl: "#", status: "pending" },
  { id: 3, date: "2024-10-21", employee: expenseEmployees[2], category: "Formación", concept: "Certificación AWS Solutions Architect", amount: 210, receiptType: "pdf", receiptUrl: "#", status: "approved" },
  { id: 4, date: "2024-10-19", employee: expenseEmployees[3], category: "Guardería", concept: "Cuota mensual guardería infantil", amount: 240, receiptType: "pdf", receiptUrl: "#", status: "rejected", rejectionReason: "Exceso cupo" },
  { id: 5, date: "2024-10-18", employee: expenseEmployees[4], category: "Transporte", concept: "Recarga tarjeta Consorcio Metro", amount: 21.8, receiptType: "image", receiptUrl: "#", status: "pending" },
  { id: 6, date: "2024-10-15", employee: expenseEmployees[5], category: "Salud", concept: "Copago póliza dental ampliada", amount: 38, receiptType: "pdf", receiptUrl: "#", status: "approved" }
];

async function getExpenses() {
  if (USE_MOCK_EXPENSES) {
    return mockExpenses;
  }

  const response = await axios.get(EXPENSES_API_URL);
  return response.data;
}

async function createExpense(values) {
  if (USE_MOCK_EXPENSES) {
    // Buscamos el empleado y la categoría por su id
    const employee = expenseEmployees.find((item) => item.id == values.employeeId);
    const category = expenseCategories.find((item) => item.id == values.categoryId);

    const newExpense = {
      id: Date.now(),
      date: values.date,
      employee: employee,
      category: category.name,
      concept: values.concept,
      amount: Number(values.amount),
      receiptType: "pdf",
      receiptUrl: "#",
      status: "pending"
    };


    mockExpenses.unshift(newExpense);
    return newExpense;
  }

 
  const formData = new FormData();
  formData.append("employeeId", values.employeeId);
  formData.append("categoryId", values.categoryId);
  formData.append("concept", values.concept);
  formData.append("amount", values.amount);
  formData.append("date", values.date);


  if (values.receipt && values.receipt.size > 0) {
    formData.append("receipt", values.receipt);
  }

  const response = await axios.post(EXPENSES_API_URL, formData);
  return response.data;
}


async function approveExpense(id) {
  if (USE_MOCK_EXPENSES) {
    const expense = mockExpenses.find((item) => item.id == id);
    expense.status = "approved";
    return expense;
  }

  const response = await axios.patch(EXPENSES_API_URL + "/" + id + "/approve");
  return response.data;
}

async function rejectExpense(id, reason) {
  if (USE_MOCK_EXPENSES) {
    const expense = mockExpenses.find((item) => item.id == id);
    expense.status = "rejected";
    expense.rejectionReason = reason;
    return expense;
  }

  const response = await axios.patch(EXPENSES_API_URL + "/" + id + "/reject", { reason: reason });
  return response.data;
}