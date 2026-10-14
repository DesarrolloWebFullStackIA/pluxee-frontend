const API_URL = "http://localhost:8000/api";


function getErrorMessage(error) {

  if (error.response) {
    const detail = error.response.data.detail;
    return typeof detail === "string" ? detail : "Los datos no son válidos.";
  }

  return "No hay conexión con el servidor.";
}