import api from "./api";

// Same shape compatibility layer as transactionService — handle both
// Page<Insight> (Phase 2.3+) and bare array (older backend builds).
const unwrap = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
};

const generateInsight = async (userId) => {
    try {
        const response = await api.post(`/ai/insights/generate?userId=${userId}`, {});
        return response.data;
    } catch (error) {
        console.error("Error generating insight:", error);
        throw error;
    }
};

const fetchInsights = async (userId, { page = 0, size = 20 } = {}) => {
    try {
        const response = await api.get(`/ai/insights/user/${userId}`, {
            params: { page, size, sort: 'createdAt,desc' }
        });
        return unwrap(response.data);
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
