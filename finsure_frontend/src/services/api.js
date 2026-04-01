const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

/**
 * Enhanced fetch wrapper that handles:
 * 1. Attaching `Authorization` headers mapping to localStorage.
 * 2. Intercepting 401s to refresh token invisibly.
 */
export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  let token = localStorage.getItem('accessToken');

  const headers = {
    ...options.headers,
  };

  // Skip JSON content-type if user is sending FormData (for analyze & upload endpoints)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  let response = await fetch(url, config);

  // Handle 401 Intercept -> Try Refresh
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const { token: newToken } = await refreshRes.json();
          localStorage.setItem('accessToken', newToken);
          token = newToken; // Update in scope
          
          // Retry original request
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, { ...config, headers });
        } else {
          // Refresh failed -> Logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } catch (e) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    } else {
       // If no refresh token or already trying to login/refresh
       if (endpoint !== '/auth/login' && endpoint !== '/auth/signup') {
         localStorage.removeItem('accessToken');
         localStorage.removeItem('refreshToken');
         window.location.href = '/login';
       }
    }
  }

  // Handle API Payload
  if (!response.ok) {
    let errData;
    try {
      errData = await response.json();
    } catch {
      errData = { error: response.statusText };
    }
    throw new Error(errData.error || 'Request failed');
  }

  // Not all responses have JSON (e.g. logout)
  try {
    return await response.json();
  } catch {
    return null;
  }
}
