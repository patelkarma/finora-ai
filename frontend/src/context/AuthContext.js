import React, { createContext, useState, useEffect } from "react";
import api from "../services/api";

export const AuthContext = createContext({
  user: null,
  login: () => { },
  loginWithToken: () => { },
  logout: () => { },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load saved login on mount; if token exists but no user, try to load user
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userJson = localStorage.getItem("user");

    if (userJson) {
      try {
        setUser(JSON.parse(userJson));
        return;
      } catch {
        // fallthrough
      }
    }

    // if token exists but no user stored, try to load user from backend
    if (token && !userJson) {
      loginWithToken(token).catch((e) => {
        console.warn("Failed to restore session from token:", e);
      });
    }
  }, []); // run once

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
  // returns a promise so callers can await it
  const loginWithToken = async (token) => {
    if (!token) throw new Error("No token provided");

    try {
      // persist token first
      localStorage.setItem("token", token);

      // api baseURL already includes "/api"
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data;

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      return userData;

    } catch (err) {
      console.error("Failed to load user profile:", err);
      logout(); // ⬅️ IMPORTANT
      throw err;
    }
  };


  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("oauth_email");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithToken, logout , updateUser}}>
      {children}
    </AuthContext.Provider>
    
  );
};
