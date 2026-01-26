import React, { createContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

export const AuthContext = createContext({
  user: null,
  login: () => { },
  loginWithToken: () => { },
  logout: () => { },
  updateUser: () => { },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Save updated user
  const updateUser = (updatedUser) => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Regular login (email/password)
  const login = (userObj, token) => {
    if (token) localStorage.setItem("token", token);

    if (userObj) {
      localStorage.setItem("user", JSON.stringify(userObj));
      setUser(userObj);
    }
  };

  // OAuth login (token only)
  const loginWithToken = useCallback(async (token) => {
    if (!token) throw new Error("No token provided");

    try {
      localStorage.setItem("token", token);

      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data;

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      return userData;
    } catch (err) {
      console.error("Failed to load user profile:", err);
      logout();
      throw err;
    }
  }, []);

  // Logout
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("oauth_email");
    setUser(null);
    window.location.href = "/login";
  };

  // Restore login session on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userJson = localStorage.getItem("user");

    if (userJson) {
      try {
        setUser(JSON.parse(userJson));
        return;
      } catch {
        localStorage.removeItem("user");
      }
    }

    if (token && !userJson) {
      loginWithToken(token).catch((e) => {
        console.warn("Failed to restore session from token:", e);
      });
    }
  }, [loginWithToken]);

  return (
    <AuthContext.Provider value={{ user, login, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
