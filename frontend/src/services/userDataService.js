import api from './api';

const userDataService = {
  /**
   * Download a JSON file with everything we hold about the caller —
   * profile, transactions, budgets, insights, login history. The
   * backend sets Content-Disposition so the browser saves it
   * directly when this is invoked from a link.
   */
  exportMyData: async () => {
    const res = await api.get('/users/me/export', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    // Pull the suggested filename out of the Content-Disposition header,
    // fallback to a sensible default.
    const cd = res.headers?.['content-disposition'] || '';
    const match = cd.match(/filename="?([^";]+)"?/);
    a.download = match ? match[1] : `finora-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /**
   * Hard-delete the caller's account and all owned data. Returns the
   * server payload; the caller should clear local auth and redirect.
   */
  deleteMyAccount: async () => {
    const res = await api.delete('/users/me');
    return res.data;
  },
};

export default userDataService;
