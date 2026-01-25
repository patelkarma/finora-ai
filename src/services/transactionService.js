import api from './api';

const transactionService = {

  getRecentTransactions: async (userId) => {
    const response = await api.get(`/transactions/user/${userId}`);
    return response.data.slice(0, 5); // Limit to recent
  },

  getAllTransactions: async (userId) => {
    const response = await api.get(`/transactions/user/${userId}`);
    return response.data;
  },

  addTransaction: async (transaction) => {
    const response = await api.post(`/transactions/user/${transaction.userId}`, transaction);
    return response.data;
  },

  updateTransaction: async (id, transaction) => {
    const response = await api.put(`/transactions/${id}`, transaction);
    return response.data;
  },

  deleteTransaction: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
};

export default transactionService;