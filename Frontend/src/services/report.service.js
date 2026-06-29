import { apiGet } from '../lib/api';

/** Admin analytics. Single aggregated payload for the Reports dashboard. */
export const ReportService = {
  overview: () => apiGet('/reports/overview'),
};

export default ReportService;
