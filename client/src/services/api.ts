import axios from 'axios';
import type {
  Loan,
  Exception,
  AuditLog,
  DashboardSummary,
  Upload,
  ValidationRule,
  IntegrityCheckResult
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

export const apiService = {
  // Uploads
  uploadCsv: async (file: File, fileType: string = 'LOAN_TAPE', uploader: string = 'Data Operator'): Promise<Upload> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    formData.append('uploader', uploader);
    const { data } = await api.post('/api/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  getUploads: async (): Promise<Upload[]> => {
    const { data } = await api.get('/api/uploads');
    return data;
  },

  // Loans
  getLoans: async (params?: { status?: string; verificationStatus?: string; search?: string }): Promise<Loan[]> => {
    const { data } = await api.get('/api/loans', { params });
    return data;
  },

  searchLoansNaturalLanguage: async (query: string): Promise<{ query: string; filter: any; totalMatches: number; loans: Loan[] }> => {
    const { data } = await api.post('/api/loans/search-nl', { query });
    return data;
  },
  
  getLoanById: async (id: string): Promise<Loan> => {
    const { data } = await api.get(`/api/loans/${id}`);
    return data;
  },

  updateLoan: async (id: string, updates: Partial<Loan>, reviewer?: string, reviewerComment?: string): Promise<Loan> => {
    const { data } = await api.patch(`/api/loans/${id}`, { ...updates, reviewer, reviewerComment });
    return data;
  },

  verifyLoan: async (id: string, reviewer?: string): Promise<{ loan: Loan; merkleRoot: string }> => {
    const { data } = await api.post(`/api/loans/${id}/verify`, { reviewer });
    return data;
  },

  // Cryptographic Ledger & Tamper Detection
  verifyLedgerIntegrity: async (): Promise<IntegrityCheckResult> => {
    const { data } = await api.get('/api/loans/integrity/verify');
    return data;
  },

  tamperTest: async (): Promise<{ success: boolean; message: string; loanId: string }> => {
    const { data } = await api.post('/api/loans/tamper-test');
    return data;
  },

  // Exceptions
  getExceptions: async (params?: { severity?: string; field?: string; status?: string }): Promise<Exception[]> => {
    const { data } = await api.get('/api/exceptions', { params });
    return data;
  },

  getExceptionById: async (id: string): Promise<Exception> => {
    const { data } = await api.get(`/api/exceptions/${id}`);
    return data;
  },

  generateAiAssist: async (id: string): Promise<any> => {
    const { data } = await api.post(`/api/exceptions/${id}/ai-assist`);
    return data;
  },

  resolveException: async (
    id: string,
    action: 'ACCEPT_AI' | 'REJECT_AI' | 'MANUAL_EDIT',
    newValue?: string,
    reviewer?: string,
    reviewerComment?: string
  ): Promise<{ success: boolean; remainingOpenExceptions: number }> => {
    const { data } = await api.post(`/api/exceptions/${id}/resolve`, {
      action,
      newValue,
      reviewer,
      reviewerComment
    });
    return data;
  },

  getBatchSummary: async (): Promise<{ summary: string; totalOpenExceptions: number }> => {
    const { data } = await api.get('/api/exceptions/batch-summary');
    return data;
  },

  bulkResolveExceptions: async (
    exceptionIds: string[],
    action: 'ACCEPT_ALL_AI' | 'REJECT_ALL',
    reviewer?: string
  ): Promise<{ success: boolean; resolvedCount: number }> => {
    const { data } = await api.post('/api/exceptions/bulk-resolve', {
      exceptionIds,
      action,
      reviewer
    });
    return data;
  },

  // Demo Reset
  resetDemoData: async (reviewer?: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post('/api/demo/reset', { reviewer });
    return data;
  },

  // Export URLs
  getExportVerifiedLoansUrl: () => `${API_URL}/api/export/verified-loans`,
  getExportAuditTrailUrl: () => `${API_URL}/api/export/audit-trail`,
  getExportExceptionsUrl: () => `${API_URL}/api/export/exceptions`,

  // Dynamic Validation Rules
  getRules: async (): Promise<ValidationRule[]> => {
    const { data } = await api.get('/api/rules');
    return data;
  },

  toggleRule: async (id: string): Promise<ValidationRule> => {
    const { data } = await api.patch(`/api/rules/${id}/toggle`);
    return data;
  },

  generateRuleFromNl: async (prompt: string): Promise<ValidationRule> => {
    const { data } = await api.post('/api/rules/generate-from-nl', { prompt });
    return data;
  },

  // Dashboard & Audit
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await api.get('/api/summary');
    return data;
  },

  getAuditLogs: async (loanId: string): Promise<AuditLog[]> => {
    const { data } = await api.get(`/api/audit/${loanId}`);
    return data;
  },

  getAllAuditLogs: async (limit: number = 50): Promise<AuditLog[]> => {
    const { data } = await api.get('/api/audit', { params: { limit } });
    return data;
  }
};
