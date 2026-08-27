export type UserRole = 'DATA_OPERATOR' | 'REVIEWER' | 'DATA_CONSUMER';

export interface Loan {
  id: string;
  loanId: string;
  borrowerId?: string | null;
  borrowerName?: string | null;
  loanType?: string | null;
  originationDate?: string | null;
  maturityDate?: string | null;
  originalPrincipal: number;
  currentBalance: number;
  interestRate: number;
  termMonths: number;
  borrowerState?: string | null;
  loanPurpose?: string | null;
  creditGrade?: string | null;
  employmentLength?: string | null;
  incomeBand?: string | null;
  paymentStatus: string;
  daysPastDue: number;
  servicerName?: string | null;
  lastPaymentDate?: string | null;
  lastUpdatedAt?: string | null;
  documentStatus?: string | null;
  sourceSystem?: string | null;
  
  verificationStatus: 'PENDING' | 'EXCEPTIONS_FOUND' | 'VERIFIED' | 'REJECTED';
  recordHash?: string | null;
  previousRecordHash?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  
  hasConflicts?: boolean;
  conflictDetails?: string | null;
  rawJson?: string | null;
  uploadId?: string | null;
  createdAt: string;
  updatedAt: string;
  
  exceptions?: Exception[];
  auditLogs?: AuditLog[];
}

export interface Exception {
  id: string;
  loanId: string;
  field: string;
  issueType: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  originalValue: string;
  suggestedValue?: string | null;
  aiExplanation?: string | null;
  aiConfidence?: number | null;
  aiModel?: string | null;
  aiPromptVersion?: string | null;
  status: 'OPEN' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED' | 'RESOLVED_MANUAL';
  reviewerComment?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  loan?: Loan;
}

export interface AuditLog {
  id: string;
  loanId?: string | null;
  action: 'IMPORT' | 'VALIDATE' | 'AI_SUGGESTION' | 'FIELD_EDIT' | 'VERIFY' | 'REJECT' | 'CONFLICT_DETECTED' | 'CONFLICT_RESOLVED' | 'RULE_CREATED';
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  performedBy: string;
  metadata?: string | null;
  timestamp: string;
  loan?: Loan;
}

export interface Upload {
  id: string;
  filename: string;
  fileType: 'LOAN_TAPE' | 'SERVICER_UPDATE' | 'DOCUMENT_MANIFEST';
  totalRecords: number;
  validRecords: number;
  exceptionRecords: number;
  conflictRecords: number;
  uploadedBy: string;
  status: string;
  createdAt: string;
}

export interface ValidationRule {
  id: string;
  ruleCode: string;
  name: string;
  description: string;
  field: string;
  ruleType: string;
  parameters: string;
  severity: 'ERROR' | 'WARNING' | 'CRITICAL';
  errorMessage: string;
  isActive: boolean;
  isCustom: boolean;
  generatedPrompt?: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  totalLoans: number;
  verifiedLoans: number;
  pendingLoans: number;
  exceptionLoans: number;
  conflictedLoans: number;
  openExceptions: number;
  criticalExceptions: number;
  errorExceptions: number;
  warningExceptions: number;
  resolvedExceptions: number;
  dataQualityScore: number;
  ledgerHead: {
    merkleRoot: string;
    totalVerified: number;
    integrityStatus: 'VALID' | 'COMPROMISED';
  };
}

export interface IntegrityCheckResult {
  isValid: boolean;
  totalRecordsChecked: number;
  brokenRecordId?: string;
  brokenLoanId?: string;
  expectedHash?: string;
  storedHash?: string;
  merkleRoot: string;
  checkedAt: string;
  message: string;
}

export interface AiSuggestion {
  explanation: string;
  suggested_value: string;
  confidence: number;
  reasoning_steps: string[];
  recommended_action: 'ACCEPT' | 'REJECT' | 'MANUAL_REVIEW';
  model_name: string;
  prompt_version: string;
  grounding_prompt?: string;
  timestamp: string;
  latency_ms: number;
}
