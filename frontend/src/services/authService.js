import api from "./api";

const login = async (email, password) => {
  const response = await api.post("/auth/login", { email, password });

  // save token + user
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }
  return response.data;
};

const signup = async (name, email, password) => {
  return api.post("/auth/signup", { name, email, password });
};

const forgotPassword = async (email) => {
  return api.post("/auth/forgot-password", { email });
};

const resetPassword = async (token, password) => {
  return api.post("/auth/reset-password", { token, password });
};

const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const getCurrentUser = () => {
  try {
    const userString = localStorage.getItem("user");
    if (!userString) return null;
    return JSON.parse(userString);
  } catch (e) {
    console.error("Error parsing user:", e);
    return null;
  }
};

const authService = {
  login,
  signup,
  forgotPassword,
  resetPassword,
  logout,
  getCurrentUser,
};

export default authService;
