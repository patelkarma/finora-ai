import api from "./api";

const generateInsight = async (userId) => {
    try {
        const response = await api.post(`/ai/insights/generate?userId=${userId}`, {});
        return response.data;
    } catch (error) {
        console.error("Error generating insight:", error);
        throw error;
    }
};

// Backend now returns Spring Page<Insight>; we unwrap .content for the UI.
const fetchInsights = async (userId, { page = 0, size = 20 } = {}) => {
    try {
        const response = await api.get(`/ai/insights/user/${userId}`, {
            params: { page, size, sort: 'createdAt,desc' }
        });
        return response.data.content || [];
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
