import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL + "/auth";

const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });

  // save token + user
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
  }
  return response.data;
};

const signup = async (name, email, password) => {
  return axios.post(`${API_URL}/signup`, { name, email, password });
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

export default {
  login,
  signup,
  logout,
  getCurrentUser,
};

