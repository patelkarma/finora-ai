// src/services/aiService.js
import axios from "axios";

const API_URL = "http://localhost:8081/api/ai"; // Backend base route

const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ✅ Generate a new AI insight
const generateInsight = async (userId) => {
    try {
        const response = await axios.post(
            `${API_URL}/insights/generate?userId=${userId}`,
            {}, // empty body
            { headers: getAuthHeader() }
        );
        return response.data;
    } catch (error) {
        console.error("Error generating insight:", error);
        throw error;
    }
};

// ✅ Fetch all insights
const fetchInsights = async (userId) => {
    try {
        const response = await axios.get(`${API_URL}/insights/user/${userId}`, {
            headers: getAuthHeader(),
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching insights:", error);
        throw error;
    }
};

const aiService = {
    fetchInsights,
    generateInsight,
};

export default aiService;
