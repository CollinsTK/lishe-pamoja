export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

export const apiClient = {
  get: async (endpoint: string) => {
    return request(endpoint, { method: 'GET' });
  },
  post: async (endpoint: string, body: any) => {
    return request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  put: async (endpoint: string, body: any) => {
    return request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },
  delete: async (endpoint: string) => {
    return request(endpoint, { method: 'DELETE' });
  }
};

async function request(endpoint: string, options: RequestInit) {
  const token = localStorage.getItem('lisheToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      signal: options.signal ?? controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'An error occurred during the request');
  }

  // Handle empty responses (like 204 No Content)
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
