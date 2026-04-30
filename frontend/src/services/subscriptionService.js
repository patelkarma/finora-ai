import api from './api';

const subscriptionService = {
  /**
   * Returns auto-detected recurring expenses for the user.
   * Backend recomputes on each call (cached 5min server-side).
   *
   * Each entry: { name, amount, category, period, occurrences,
   *               firstSeen, lastSeen, nextExpected, confidence }
   */
  getUserSubscriptions: async (userId) => {
    const res = await api.get(`/subscriptions/user/${userId}`);
    return res.data;
  },
};

export default subscriptionService;
