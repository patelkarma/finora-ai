import api from './api';

const anomalyService = {
  /**
   * Returns transactions flagged as anomalous (z-score > 2 vs the
   * user's per-category 90-day baseline). Each entry:
   *   { transactionId, description, amount, category, transactionDate,
   *     zScore, categoryMean, severity: "MODERATE"|"SEVERE" }
   */
  getUserAnomalies: async (userId) => {
    const res = await api.get(`/anomalies/user/${userId}`);
    return res.data;
  },
};

export default anomalyService;
