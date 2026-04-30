import api from './api';

const forecastService = {
  /**
   * Day-by-day cash-flow projection. Each point:
   *   { date, income, subscription, discretionary, netDelta, cumulative }
   * The series can be plotted directly as `cumulative` against `date`.
   */
  getUserForecast: async (userId, days = 30) => {
    const res = await api.get(`/forecast/user/${userId}`, { params: { days } });
    return res.data;
  },
};

export default forecastService;
