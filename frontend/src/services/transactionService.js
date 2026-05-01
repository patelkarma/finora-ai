import api from './api';

// The transactions endpoint is paginated as of backend Phase 2.3 — it
// returns Spring Page<Transaction>: { content: [...], totalElements, ... }.
// Older backend builds return a bare array. unwrap() handles both so the
// frontend doesn't break when running against either revision.
const unwrap = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
};

const transactionService = {

  getRecentTransactions: async (userId) => {
    const response = await api.get(`/transactions/user/${userId}`, {
      params: { page: 0, size: 5, sort: 'transactionDate,desc' }
    });
    return unwrap(response.data);
  },

  getAllTransactions: async (userId) => {
    const response = await api.get(`/transactions/user/${userId}`, {
      params: { page: 0, size: 100, sort: 'transactionDate,desc' }
    });
    return unwrap(response.data);
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

  // Bulk-create from a parsed CSV. Rows must already match the
  // ImportRow contract (see backend/dto/ImportRow.java).
  bulkImport: async (userId, rows) => {
    const response = await api.post(`/transactions/user/${userId}/import`, { rows });
    return response.data;
  },

  // Bulk delete by ids. Returns { deleted: N }.
  bulkDelete: async (userId, ids) => {
    const response = await api.post(`/transactions/user/${userId}/bulk-delete`, { ids });
    return response.data;
  },
};

export default transactionService;
