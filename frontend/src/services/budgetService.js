import api from './api';
import transactionService from './transactionService';

const budgetService = {
  getAllBudgets: async (userId) => {
    try {
      // Fetch budgets and transactions in parallel
      const [budgetsRes, transactionsRes] = await Promise.all([
        api.get(`/budgets/user/${userId}`),
        api.get(`/transactions/user/${userId}`)
      ]);

      const budgets = budgetsRes.data;
      const transactions = transactionsRes.data;

      // Create a map to track total spent per category (case-insensitive)
      const spentMap = {};
      transactions.forEach(tx => {
        const category = tx.category?.toLowerCase().trim();
        if (!category) return;

        if (!spentMap[category]) spentMap[category] = 0;
        spentMap[category] += parseFloat(tx.amount || 0);
      });

      // Attach spent value to each budget
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

