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
// purge local auth state and bounce to /login. Two guards prevent
// false-positive bounces:
//   1) skipAuthRedirect — set on the AuthContext cold-start /auth/me
//      restoration call. That call is exploratory (do we have a valid
//      session?) and 401 there is normal; AuthContext clears state
//      itself and the user lands on /login without an alarmist banner.
//   2) wasAuthenticated — we only treat the 401 as a session-expiry
//      event if there's a `user` in localStorage. Without that, a 401
//      means we never had auth in the first place and there's nothing
//      to "expire."
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const skip = error?.config?.skipAuthRedirect;
      const path = window.location.pathname;
      const isPublic =
        path.startsWith("/login") ||
        path.startsWith("/signup") ||
        path.startsWith("/forgot-password") ||
        path.startsWith("/reset-password") ||
        path.startsWith("/oauth-success") ||
        path.startsWith("/set-password") ||
        path.startsWith("/create-password");

      const wasAuthenticated = !!localStorage.getItem("user");

      if (!skip && !isPublic && wasAuthenticated) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.replace("/login?session=expired");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
