import api from "./api";

// ✅ Generate a new AI insight
const generateInsight = async (userId) => {
    try {
        const response = await api.post(`/ai/insights/generate?userId=${userId}`, {});
        return response.data;
    } catch (error) {
        console.error("Error generating insight:", error);
        throw error;
    }
};

// ✅ Fetch all insights
const fetchInsights = async (userId) => {
    try {
        const response = await api.get(`/ai/insights/user/${userId}`);
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
