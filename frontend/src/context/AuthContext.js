import { createContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

export const AuthContext = createContext({
  user: null,
  loading: true,
  login: () => { },
  loginWithToken: () => { },
  logout: () => { },
  updateUser: () => { },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Update user manually
  const updateUser = (updatedUser) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // ✅ Normal login (email/password)
  const login = (userObj, token) => {
    if (token) localStorage.setItem("token", token);

    if (userObj) {
      localStorage.setItem("user", JSON.stringify(userObj));
      setUser(userObj);
    }
  };

  // ✅ OAuth login using token
  const loginWithToken = useCallback(async (token) => {
    if (!token) throw new Error("No token provided");

    try {
      localStorage.setItem("token", token);

      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data;

      // 🚨 Google user without password → DO NOT LOGIN YET
      if (userData.oauthUser === true && userData.passwordSet === false) {
        setUser(null);
        localStorage.removeItem("user");
        return userData;
      }

      // normal login
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return userData;

    } catch (err) {
      console.error("Failed to load user:", err);
      logout();
      throw err;
    }
  }, []);

  // ✅ Logout
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("oauth_email");
    setUser(null);
    window.location.href = "/login";
  };

  // ✅ Restore session on reload
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    loginWithToken(token)
      .catch(() => { localStorage.removeItem("token"); })
      .finally(() => setLoading(false));
  }, [loginWithToken]);

  // ⭐ IMPORTANT: return provider
  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
