import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "https://finora-backend-rnd0.onrender.com/api";

const api = axios.create({
  baseURL: BASE,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 from any /api/** route, the token is missing or expired —
// purge local auth state and bounce to /login. This used to silently
// follow the 302 → /login HTML redirect, leaving the UI in a stuck
// "trying to save" state. With the backend now returning 401 JSON for
// /api/** (SecurityConfig.exceptionHandling), this branch fires and
// the user gets a clean session reset.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const path = window.location.pathname;
      // Don't loop on already-public routes
      const isPublic =
        path.startsWith("/login") ||
        path.startsWith("/signup") ||
        path.startsWith("/forgot-password") ||
        path.startsWith("/reset-password") ||
        path.startsWith("/oauth-success") ||
        path.startsWith("/set-password") ||
        path.startsWith("/create-password");

      if (!isPublic) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Use replace so back-button doesn't return to the broken page
        window.location.replace("/login?session=expired");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
