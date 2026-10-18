/**
 * Pluxee Enterprise - Centralized Axios HTTP Client (US-INT-10.1 / CA-INT-10.1)
 * 
 * Provides a configured Axios client pointing to the FastAPI backend (http://localhost:8000/api/v1),
 * with centralized response interceptors, comprehensive HTTP error handling, and uniform helper methods.
 */

(function (window) {
  'use strict';

  // Base API endpoint for FastAPI backend
  const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api/v1';

  /**
   * Formats API error messages uniformly.
   * Handles FastAPI/Pydantic 422 validation arrays, standard HTTP status codes,
   * network connection drops, and generic client errors.
   * 
   * @param {Error|Object} error - Axios error object or caught exception
   * @returns {string} Human-readable error message
   */
  function getErrorMessage(error) {
    if (!error) return 'Ha ocurrido un error inesperado.';

    // 1. Error with HTTP Response from FastAPI server
    if (error.response) {
      const { status, data } = error.response;
      const detail = data?.detail;

      // FastAPI / Pydantic validation error array (status 422)
      if (Array.isArray(detail)) {
        return detail
          .map((err) => {
            const field = Array.isArray(err.loc) ? err.loc.slice(1).join('.') : '';
            return field ? `${field}: ${err.msg}` : err.msg;
          })
          .join('; ');
      }

      // Plain string detail returned by FastAPI HTTPException
      if (typeof detail === 'string') {
        return detail;
      }

      // Fallback messages by HTTP status code
      switch (status) {
        case 400:
          return 'Solicitud incorrecta (Bad Request). Verifica los datos enviados.';
        case 401:
          return 'No autorizado. Se requiere autenticación.';
        case 403:
          return 'Acceso denegado (Forbidden). No tienes permisos para esta acción.';
        case 404:
          return 'El recurso solicitado no fue encontrado en el servidor.';
        case 409:
          return 'Conflicto de concurrencia o estado con el recurso solicitado.';
        case 422:
          return 'Los datos enviados no son válidos para el esquema esperado.';
        case 500:
          return 'Error interno del servidor FastAPI. Revisa los logs de Uvicorn.';
        default:
          return `Error del servidor (${status}): ${error.response.statusText || 'Error desconocido'}`;
      }
    }

    // 2. Request was made but no response was received (Server offline / CORS / Network drop)
    if (error.request) {
      return `No hay conexión con el servidor backend (${API_BASE_URL}). Verifica que FastAPI (Uvicorn) esté en ejecución en el puerto 8000.`;
    }

    // 3. Error during request setup or JavaScript runtime error
    return error.message || 'Error desconocido al procesar la solicitud.';
  }

  // Create Axios instance if axios is available
  const axiosInstance = (typeof window.axios !== 'undefined')
    ? window.axios.create({
        baseURL: API_BASE_URL,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
    : null;

  // Configure response interceptor for centralized error enrichment
  if (axiosInstance) {
    axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Attach friendly parsed error message to error object
        error.userMessage = getErrorMessage(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * High-level API wrapper methods returning unwrapped response.data
   */
  const api = {
    client: axiosInstance,
    baseURL: API_BASE_URL,
    getErrorMessage,

    async get(endpoint, config) {
      if (!axiosInstance) throw new Error('Axios no está disponible.');
      const res = await axiosInstance.get(endpoint, config);
      return res.data;
    },

    async post(endpoint, data, config) {
      if (!axiosInstance) throw new Error('Axios no está disponible.');
      const res = await axiosInstance.post(endpoint, data, config);
      return res.data;
    },

    async put(endpoint, data, config) {
      if (!axiosInstance) throw new Error('Axios no está disponible.');
      const res = await axiosInstance.put(endpoint, data, config);
      return res.data;
    },

    async patch(endpoint, data, config) {
      if (!axiosInstance) throw new Error('Axios no está disponible.');
      const res = await axiosInstance.patch(endpoint, data, config);
      return res.data;
    },

    async delete(endpoint, config) {
      if (!axiosInstance) throw new Error('Axios no está disponible.');
      const res = await axiosInstance.delete(endpoint, config);
      return res.data;
    }
  };

  // Expose globally to window
  window.API_BASE_URL = API_BASE_URL;
  window.API_URL = API_BASE_URL; // Backwards compatibility
  window.apiClient = axiosInstance;
  window.api = api;
  window.getErrorMessage = getErrorMessage;

})(window);