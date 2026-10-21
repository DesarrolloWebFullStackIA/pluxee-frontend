const EXPENSES_API_URL = "http://localhost:8000/api/v1/expenses";
const EXPENSE_EMPLOYEES_API_URL = "http://localhost:8000/api/v1/employees";
const CATEGORIES_API_URL = "http://localhost:8000/api/v1/expenses/categories";

async function getExpenses() {
  const response = await axios.get(EXPENSES_API_URL);
  return response.data;
}

async function createExpense(values) {
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

async function updateExpense(id, values) {
  const formData = new FormData();
  formData.append("employeeId", values.employeeId);
  formData.append("categoryId", values.categoryId);
  formData.append("concept", values.concept);
  formData.append("amount", values.amount);
  formData.append("date", values.date);
  const response = await axios.put(EXPENSES_API_URL + "/" + id, formData);
  return response.data;
}

async function approveExpense(id) {
  const response = await axios.patch(EXPENSES_API_URL + "/" + id + "/approve");
  return response.data;
}

async function rejectExpense(id, reason) {
  const response = await axios.patch(EXPENSES_API_URL + "/" + id + "/reject", { reason: reason });
  return response.data;
}

async function getAvailableBalance(employeeId, categoryId) {

  const response = await axios.get(EXPENSES_API_URL + "/employees/" + employeeId + "/balance", {
    params: { categoryId: categoryId }
  });
  return response.data.available;
}

async function fetchEmployees() {
  const response = await axios.get(EXPENSE_EMPLOYEES_API_URL);
  return response.data;
}

async function fetchCategories() {
  const response = await axios.get(CATEGORIES_API_URL);
  return response.data;
}

async function deleteExpense(id) {
  const response = await axios.delete(EXPENSES_API_URL + "/" + id);
  return response.data;
}