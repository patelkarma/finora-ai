import api from './api';

// Handle both Page<Transaction> (Phase 2.3+) and bare array.
const unwrap = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
};

const budgetService = {
  getAllBudgets: async (userId) => {
    try {
      const [budgetsRes, transactionsRes] = await Promise.all([
        api.get(`/budgets/user/${userId}`),
        // Cap at 100 (server max) for the budget-vs-spent calculation.
        // TODO: move per-category sum to the backend so we don't depend
        // on the client iterating all transactions.
        api.get(`/transactions/user/${userId}`, {
          params: { page: 0, size: 100, sort: 'transactionDate,desc' }
        })
      ]);

      const budgets = budgetsRes.data;
      const transactions = unwrap(transactionsRes.data);

      const spentMap = {};
      transactions.forEach(tx => {
        const category = tx.category?.toLowerCase().trim();
        if (!category) return;
        if (!spentMap[category]) spentMap[category] = 0;
        spentMap[category] += parseFloat(tx.amount || 0);
      });

      const updatedBudgets = budgets.map(budget => {
        const budgetCategory = budget.category?.toLowerCase().trim();
        const spent = spentMap[budgetCategory] || 0;
        return { ...budget, spent };
      });

      return updatedBudgets;
    } catch (error) {
      console.error('Error fetching budgets with spent data:', error);
      throw error;
    }
  },

  addBudget: async (budget) => {
    const response = await api.post(`/budgets/user/${budget.userId}`, budget);
    return response.data;
  },

  updateBudget: async (id, budget) => {
    const response = await api.put(`/budgets/${id}`, budget);
    return response.data;
  },

  deleteBudget: async (id) => {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  },
};

export default budgetService;
