import fs from 'fs';
import csv from 'csv-parser';
import { prisma } from '../models/prismaClient';
import { ValidationService } from './validation.service';
import { ReconciliationService } from './reconciliation.service';
import { DEFAULT_VALIDATION_RULES } from '../config/defaultRules';

export class IngestionService {
  /**
   * Initializes default validation rules in the DB if empty.
   */
  static async ensureDefaultRules(): Promise<void> {
    const count = await prisma.validationRule.count();
    if (count === 0) {
      for (const rule of DEFAULT_VALIDATION_RULES) {
        await prisma.validationRule.create({
          data: {
            ruleCode: rule.ruleCode,
            name: rule.name,
            description: rule.description,
            field: rule.field,
            ruleType: rule.ruleType,
            severity: rule.severity,
            errorMessage: rule.errorMessage,
            parameters: rule.parameters ? JSON.stringify(rule.parameters) : '{}',
            isActive: rule.isActive
          }
        });
      }
    }
  }

  /**
   * Smart Header Auto-Mapper: Normalizes non-standard, uppercase, snake_case, camelCase,
   * and common banking alias headers to the canonical 21-field schema.
   */
  static normalizeRowHeaders(rawRow: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = {};

    const aliasMap: Record<string, string> = {
      // Loan ID
      'loan_id': 'loan_id', 'loanid': 'loan_id', 'id': 'loan_id', 'account_number': 'loan_id', 'acct_no': 'loan_id', 'loan_number': 'loan_id',
      // Borrower ID
      'borrower_id': 'borrower_id', 'borrowerid': 'borrower_id', 'cust_id': 'borrower_id', 'customer_id': 'borrower_id', 'ssn_hash': 'borrower_id',
      // Borrower Name
      'borrower_name': 'borrower_name', 'borrowername': 'borrower_name', 'name': 'borrower_name', 'borrower': 'borrower_name', 'full_name': 'borrower_name', 'borrower_full_name': 'borrower_name',
      // Loan Type
      'loan_type': 'loan_type', 'loantype': 'loan_type', 'type': 'loan_type', 'product_type': 'loan_type', 'program': 'loan_type',
      // Origination Date
      'origination_date': 'origination_date', 'originationdate': 'origination_date', 'orig_date': 'origination_date', 'start_date': 'origination_date', 'close_date': 'origination_date',
      // Maturity Date
      'maturity_date': 'maturity_date', 'maturitydate': 'maturity_date', 'mat_date': 'maturity_date', 'end_date': 'maturity_date', 'due_date': 'maturity_date',
      // Original Principal
      'original_principal': 'original_principal', 'originalprincipal': 'original_principal', 'orig_principal': 'original_principal', 'loan_amount': 'original_principal', 'loanamount': 'original_principal', 'loan_amt': 'original_principal', 'loanamt': 'original_principal', 'orig_amt': 'original_principal', 'orig_bal': 'original_principal', 'original_balance': 'original_principal', 'principal': 'original_principal',
      // Current Balance
      'current_balance': 'current_balance', 'currentbalance': 'current_balance', 'curr_bal': 'current_balance', 'unpaid_balance': 'current_balance', 'upb': 'current_balance', 'balance': 'current_balance',
      // Interest Rate
      'interest_rate': 'interest_rate', 'interestrate': 'interest_rate', 'int_rate': 'interest_rate', 'rate': 'interest_rate', 'coupon': 'interest_rate', 'note_rate': 'interest_rate',
      // Term Months
      'term_months': 'term_months', 'termmonths': 'term_months', 'term': 'term_months', 'original_term': 'term_months', 'loan_term': 'term_months', 'months': 'term_months',
      // Borrower State
      'borrower_state': 'borrower_state', 'borrowerstate': 'borrower_state', 'state': 'borrower_state', 'prop_state': 'borrower_state', 'property_state': 'borrower_state', 'borrower_st': 'borrower_state',
      // Loan Purpose
      'loan_purpose': 'loan_purpose', 'loanpurpose': 'loan_purpose', 'purpose': 'loan_purpose', 'use_of_funds': 'loan_purpose',
      // Credit Grade
      'credit_grade': 'credit_grade', 'creditgrade': 'credit_grade', 'grade': 'credit_grade', 'risk_grade': 'credit_grade', 'credit_rating': 'credit_grade',
      // Employment Length
      'employment_length': 'employment_length', 'employmentlength': 'employment_length', 'emp_length': 'employment_length', 'years_employed': 'employment_length',
      // Income Band
      'income_band': 'income_band', 'incomeband': 'income_band', 'income_range': 'income_band', 'annual_income': 'income_band', 'income': 'income_band',
      // Payment Status
      'payment_status': 'payment_status', 'paymentstatus': 'payment_status', 'status': 'payment_status', 'pmt_status': 'payment_status', 'delinquency_status': 'payment_status',
      // Days Past Due
      'days_past_due': 'days_past_due', 'dayspastdue': 'days_past_due', 'dpd': 'days_past_due', 'days_delinquent': 'days_past_due', 'delinquent_days': 'days_past_due',
      // Servicer Name
      'servicer_name': 'servicer_name', 'servicername': 'servicer_name', 'servicer': 'servicer_name', 'master_servicer': 'servicer_name',
      // Last Payment Date
      'last_payment_date': 'last_payment_date', 'lastpaymentdate': 'last_payment_date', 'last_pmt_date': 'last_payment_date', 'last_paid_date': 'last_payment_date',
      // Last Updated At
      'last_updated_at': 'last_updated_at', 'lastupdatedat': 'last_updated_at', 'as_of_date': 'last_updated_at', 'update_date': 'last_updated_at',
      // Document Status
      'document_status': 'document_status', 'documentstatus': 'document_status', 'doc_status': 'document_status', 'vault_status': 'document_status',
      // Source System
      'source_system': 'source_system', 'sourcesystem': 'source_system', 'source': 'source_system', 'originating_system': 'source_system'
    };

    for (const [key, value] of Object.entries(rawRow)) {
      const cleanKey = key.trim().toLowerCase().replace(/[\s-]+/g, '_');
      const canonicalKey = aliasMap[cleanKey] || cleanKey;
      normalized[canonicalKey] = typeof value === 'string' ? value.trim() : value;
    }

    return normalized;
  }

  /**
   * Universal CSV processor handling Primary Loan Tapes, Servicer Updates, and Document Manifests.
   */
  static async processCsv(
    filePath: string,
    fileType: 'LOAN_TAPE' | 'SERVICER_UPDATE' | 'DOCUMENT_MANIFEST' = 'LOAN_TAPE',
    uploader: string = 'Data Operator'
  ) {
    await this.ensureDefaultRules();
    const rawRows: any[] = [];

    const filename = filePath.split(/[/\\]/).pop() || 'upload.csv';

    const upload = await prisma.upload.create({
      data: {
        filename,
        fileType,
        uploadedBy: uploader,
        status: 'PROCESSING'
      }
    });

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => rawRows.push(data))
        .on('end', async () => {
          try {
            const rows = rawRows.map(r => this.normalizeRowHeaders(r));

            if (fileType === 'SERVICER_UPDATE') {
              const reconcileResult = await ReconciliationService.reconcileServicerUpdates(rows, uploader);
              const updatedUpload = await prisma.upload.update({
                where: { id: upload.id },
                data: {
                  totalRecords: rows.length,
                  validRecords: reconcileResult.matchedCount - reconcileResult.conflictsFound,
                  exceptionRecords: reconcileResult.unmatchedCount,
                  conflictRecords: reconcileResult.conflictsFound,
                  status: 'COMPLETED'
                }
              });
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              return resolve(updatedUpload);
            }

            if (fileType === 'DOCUMENT_MANIFEST') {
              const manifestResult = await ReconciliationService.reconcileDocumentManifest(rows, uploader);
              const updatedUpload = await prisma.upload.update({
                where: { id: upload.id },
                data: {
                  totalRecords: rows.length,
                  validRecords: manifestResult.updatedCount,
                  exceptionRecords: manifestResult.missingCount,
                  status: 'COMPLETED'
                }
              });
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
              return resolve(updatedUpload);
            }

            // Default: LOAN_TAPE ingestion
            let validCount = 0;
            let exceptionCount = 0;

            const activeDbRules = await prisma.validationRule.findMany({ where: { isActive: true } });
            const ruleDefs = activeDbRules.map(r => ({
              ruleCode: r.ruleCode,
              name: r.name,
              description: r.description,
              field: r.field,
              ruleType: r.ruleType as any,
              severity: r.severity as any,
              errorMessage: r.errorMessage,
              parameters: r.parameters ? JSON.parse(r.parameters) : {},
              isActive: r.isActive
            }));

            // Fetch existing loans for duplicate checks
            const existingLoans = await prisma.loan.findMany({
              select: {
                id: true,
                loanId: true,
                borrowerName: true,
                originalPrincipal: true,
                originationDate: true
              }
            });

            for (const row of rows) {
              const rawLoanId = (row.loan_id || row.loanId || '').trim();
              const loanId = rawLoanId || `MISSING-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

              // Parse dates safely
              const origDateStr = row.origination_date || row.start_date || row.originationDate || row.startDate;
              const matDateStr = row.maturity_date || row.maturityDate;
              const lastPmtDateStr = row.last_payment_date || row.lastPaymentDate;
              const lastUpdatedStr = row.last_updated_at || row.lastUpdatedAt;

              const origDate = origDateStr ? new Date(origDateStr) : null;
              const matDate = matDateStr ? new Date(matDateStr) : null;
              const lastPmtDate = lastPmtDateStr ? new Date(lastPmtDateStr) : null;
              const lastUpdated = lastUpdatedStr ? new Date(lastUpdatedStr) : new Date();

              const origPrincipal = Number(row.original_principal || row.loan_amount || row.loanAmount || 0);
              const currBalance = Number(row.current_balance !== undefined && row.current_balance !== '' ? row.current_balance : origPrincipal);
              const interestRate = Number(row.interest_rate || row.interestRate || 0);
              const termMonths = Number(row.term_months || row.termMonths || 360);
              const daysPastDue = Number(row.days_past_due || row.daysPastDue || 0);

              // Normalize payload
              const normalizedLoan = {
                loanId,
                borrowerId: row.borrower_id || row.borrowerId || null,
                borrowerName: row.borrower_name || row.borrowerName || null,
                loanType: row.loan_type || row.loanType || 'CONVENTIONAL',
                originationDate: origDate && !isNaN(origDate.getTime()) ? origDate : null,
                maturityDate: matDate && !isNaN(matDate.getTime()) ? matDate : null,
                originalPrincipal: isNaN(origPrincipal) ? 0 : origPrincipal,
                currentBalance: isNaN(currBalance) ? 0 : currBalance,
                interestRate: isNaN(interestRate) ? 0 : interestRate,
                termMonths: isNaN(termMonths) ? 360 : termMonths,
                borrowerState: (row.borrower_state || row.borrowerState || '').toUpperCase() || null,
                loanPurpose: row.loan_purpose || row.loanPurpose || 'PURCHASE',
                creditGrade: row.credit_grade || row.creditGrade || 'A',
                employmentLength: row.employment_length || row.employmentLength || null,
                incomeBand: row.income_band || row.incomeBand || null,
                paymentStatus: (row.payment_status || row.paymentStatus || row.status || 'CURRENT').toUpperCase(),
                daysPastDue: isNaN(daysPastDue) ? 0 : daysPastDue,
                servicerName: row.servicer_name || row.servicerName || null,
                lastPaymentDate: lastPmtDate && !isNaN(lastPmtDate.getTime()) ? lastPmtDate : null,
                lastUpdatedAt: lastUpdated && !isNaN(lastUpdated.getTime()) ? lastUpdated : new Date(),
                documentStatus: (row.document_status || row.documentStatus || 'COMPLETE').toUpperCase(),
                sourceSystem: row.source_system || row.sourceSystem || 'ORIGINATION_TAPE',
                rawJson: JSON.stringify(row),
                uploadId: upload.id
              };

              // Validate
              const issues = ValidationService.validateLoanRecord(normalizedLoan, existingLoans, ruleDefs);

              const loan = await prisma.loan.create({
                data: {
                  ...normalizedLoan,
                  verificationStatus: issues.length > 0 ? 'EXCEPTIONS_FOUND' : 'PENDING'
                }
              });

              // Add to in-memory list for intra-batch duplicate detection
              existingLoans.push({
                id: loan.id,
                loanId: loan.loanId,
                borrowerName: loan.borrowerName,
                originalPrincipal: loan.originalPrincipal,
                originationDate: loan.originationDate
              });

              await prisma.auditLog.create({
                data: {
                  loanId: loan.id,
                  action: 'IMPORT',
                  performedBy: uploader,
                  metadata: JSON.stringify({ file: filename, fieldsCount: Object.keys(row).length })
                }
              });

              if (issues.length > 0) {
                exceptionCount++;
                for (const issue of issues) {
                  await prisma.exception.create({
                    data: {
                      loanId: loan.id,
                      field: issue.field,
                      issueType: issue.issueType,
                      severity: issue.severity,
                      originalValue: issue.originalValue,
                      status: 'OPEN'
                    }
                  });
                }
              } else {
                validCount++;
              }

              await prisma.auditLog.create({
                data: {
                  loanId: loan.id,
                  action: 'VALIDATE',
                  performedBy: 'Intain Rule Engine',
                  field: issues.length > 0 ? issues.map(i => i.field).join(', ') : 'ALL_FIELDS',
                  oldValue: null,
                  newValue: issues.length > 0 ? `FAILED (${issues.length} exceptions)` : 'PASSED (0 exceptions)',
                  metadata: JSON.stringify({
                    rulesEvaluated: ruleDefs.length,
                    exceptionCount: issues.length,
                    status: issues.length > 0 ? 'EXCEPTIONS_FOUND' : 'PENDING'
                  })
                }
              });
            }

            const updatedUpload = await prisma.upload.update({
              where: { id: upload.id },
              data: {
                totalRecords: rows.length,
                validRecords: validCount,
                exceptionRecords: exceptionCount,
                status: 'COMPLETED'
              }
            });

            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            resolve(updatedUpload);
          } catch (err) {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            reject(err);
          }
        })
        .on('error', (err) => {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          reject(err);
        });
    });
  }
}
