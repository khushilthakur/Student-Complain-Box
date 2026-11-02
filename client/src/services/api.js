/**
 * Centralized API Client for Student Complaint Box
 * Supports production Vercel serverless deployment and external backend hosts via VITE_API_URL.
 */

const RAW_BASE_URL = import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

export const getApiUrl = (endpoint = '') => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export const getAuthHeaders = (customHeaders = {}) => {
  const token = localStorage.getItem('scb_token');
  let userId = '';
  try {
    const userStr = localStorage.getItem('scb_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      userId = user.id || '';
    }
  } catch (e) {
    userId = '';
  }

  const headers = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
};

export const apiFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  const isFormData = options.body instanceof FormData;
  const headers = getAuthHeaders(options.headers || {});

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  return res;
};

export const api = {
  get: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    return apiFetch(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body)
    });
  },
  patch: (endpoint, body, options = {}) => {
    const isFormData = body instanceof FormData;
    return apiFetch(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : JSON.stringify(body)
    });
  },
  delete: (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: 'DELETE' })
};

export default api;

