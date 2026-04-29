import api from './api';

// Backend now returns Spring Page<Transaction>:
//   { content: [...], totalElements, totalPages, number, size, ... }
// We unwrap .content for callers that just want the array.
// size is capped at 100 server-side.

const transactionService = {

  getRecentTransactions: async (userId) => {
    const response = await api.get(`/transactions/user/${userId}`, {
      params: { page: 0, size: 5, sort: 'transactionDate,desc' }
    });
    return response.data.content || [];
  },

  getAllTransactions: async (userId) => {
    const response = await api.get(`/transactions/user/${userId}`, {
      params: { page: 0, size: 100, sort: 'transactionDate,desc' }
    });
    return response.data.content || [];
  },

  // Paginated reader for the upcoming Transactions page UI. Returns the full
  // Page envelope so the UI can render page controls / totals.
  getTransactionsPage: async (userId, page = 0, size = 20, sort = 'transactionDate,desc') => {
    const response = await api.get(`/transactions/user/${userId}`, {
      params: { page, size, sort }
    });
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
