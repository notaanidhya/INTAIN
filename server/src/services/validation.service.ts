import { DEFAULT_VALIDATION_RULES, US_STATES, RuleDefinition } from '../config/defaultRules';
import { checkFuzzyDuplicate } from '../utils/fuzzyMatch';

export interface ValidationIssue {
  field: string;
  issueType: string;
  severity: 'ERROR' | 'WARNING' | 'CRITICAL';
  originalValue: string;
}

export class ValidationService {
  /**
   * Validates a normalized loan record against configurable validation rules.
   */
  static validateLoanRecord(
    loan: any,
    existingLoans: any[] = [],
    customRules: RuleDefinition[] = []
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const activeRules = customRules.length > 0 ? customRules : DEFAULT_VALIDATION_RULES;

    for (const rule of activeRules) {
      if (!rule.isActive) continue;

      switch (rule.ruleType) {
        case 'REQUIRED': {
          const val = loan[rule.field] ?? loan[this.toCamelCase(rule.field)];
          const invalidVals: string[] = rule.parameters?.invalidValues || [];
          if (val === undefined || val === null || String(val).trim() === '') {
            issues.push({
              field: rule.field,
              issueType: rule.errorMessage,
              severity: rule.severity,
              originalValue: String(val ?? '')
            });
          } else if (invalidVals.length > 0 && invalidVals.includes(String(val).trim().toUpperCase())) {
            issues.push({
              field: rule.field,
              issueType: rule.errorMessage || `Field '${rule.field}' has invalid non-compliant status '${val}'`,
              severity: rule.severity,
              originalValue: String(val)
            });
          }
          break;
        }

        case 'RANGE': {
          const rawVal = loan[rule.field] ?? loan[this.toCamelCase(rule.field)];
          const numVal = Number(rawVal);
          if (isNaN(numVal)) {
            issues.push({
              field: rule.field,
              issueType: `Invalid numeric value for ${rule.field}`,
              severity: rule.severity,
              originalValue: String(rawVal ?? '')
            });
          } else {
            const min = rule.parameters?.min;
            const max = rule.parameters?.max;
            if ((min !== undefined && numVal < min) || (max !== undefined && numVal > max)) {
              issues.push({
                field: rule.field,
                issueType: rule.errorMessage,
                severity: rule.severity,
                originalValue: String(rawVal)
              });
            }
          }
          break;
        }

        case 'BALANCE_INTEGRITY': {
          const currentBal = Number(loan.current_balance ?? loan.currentBalance ?? 0);
          const origPrincipal = Number(loan.original_principal ?? loan.originalPrincipal ?? 0);

          if (origPrincipal > 0 && currentBal > origPrincipal) {
            issues.push({
              field: 'current_balance',
              issueType: `Current balance ($${currentBal.toLocaleString()}) cannot exceed original principal ($${origPrincipal.toLocaleString()})`,
              severity: rule.severity,
              originalValue: String(currentBal)
            });
          }
          break;
        }

        case 'DATE_COMPARISON': {
          const origDateStr = loan.origination_date ?? loan.originationDate ?? loan.start_date ?? loan.startDate;
          const matDateStr = loan.maturity_date ?? loan.maturityDate;

          const origDate = origDateStr ? new Date(origDateStr) : null;
          const matDate = matDateStr ? new Date(matDateStr) : null;

          if (!origDate || isNaN(origDate.getTime())) {
            issues.push({
              field: 'origination_date',
              issueType: 'Invalid origination date format',
              severity: 'ERROR',
              originalValue: String(origDateStr ?? '')
            });
          }
          if (!matDate || isNaN(matDate.getTime())) {
            issues.push({
              field: 'maturity_date',
              issueType: 'Invalid maturity date format',
              severity: 'ERROR',
              originalValue: String(matDateStr ?? '')
            });
          }

          if (origDate && matDate && !isNaN(origDate.getTime()) && !isNaN(matDate.getTime())) {
            if (matDate <= origDate) {
              issues.push({
                field: 'maturity_date',
                issueType: `Maturity date (${matDate.toISOString().split('T')[0]}) is before or equal to origination date (${origDate.toISOString().split('T')[0]})`,
                severity: rule.severity,
                originalValue: String(matDateStr)
              });
            }
          }
          break;
        }

        case 'STATE_CODE': {
          const state = String(loan.borrower_state ?? loan.borrowerState ?? '').toUpperCase().trim();
          if (state && !US_STATES.has(state)) {
            issues.push({
              field: 'borrower_state',
              issueType: `Invalid US State abbreviation "${state}". Expected 2-letter postal code.`,
              severity: rule.severity,
              originalValue: state
            });
          }
          break;
        }

        case 'STATUS_CONSISTENCY': {
          const status = String(loan.payment_status ?? loan.paymentStatus ?? loan.status ?? '').toUpperCase().trim();
          const dpd = Number(loan.days_past_due ?? loan.daysPastDue ?? 0);
          const currentBal = Number(loan.current_balance ?? loan.currentBalance ?? 0);

          if (rule.ruleCode === 'STAT_DPD_CONSISTENCY') {
            if (status === 'CURRENT' && dpd >= 30) {
              issues.push({
                field: 'payment_status',
                issueType: `Status is 'CURRENT' but record shows ${dpd} days past due (exceeds 30-day delinquency threshold)`,
                severity: rule.severity,
                originalValue: `status=${status}, dpd=${dpd}`
              });
            } else if (status === '30_DAYS_LATE' && (dpd < 30 || dpd >= 60)) {
              issues.push({
                field: 'payment_status',
                issueType: `Status marked as '30_DAYS_LATE' but days_past_due is ${dpd} (expected 30–59 DPD)`,
                severity: rule.severity,
                originalValue: `status=${status}, dpd=${dpd}`
              });
            } else if (status === '60_DAYS_LATE' && (dpd < 60 || dpd >= 90)) {
              issues.push({
                field: 'payment_status',
                issueType: `Status marked as '60_DAYS_LATE' but days_past_due is ${dpd} (expected 60–89 DPD)`,
                severity: rule.severity,
                originalValue: `status=${status}, dpd=${dpd}`
              });
            } else if (status === '90_PLUS_DAYS_LATE' && dpd < 90) {
              issues.push({
                field: 'payment_status',
                issueType: `Status marked as '90_PLUS_DAYS_LATE' but days_past_due is ${dpd} (expected 90+ DPD)`,
                severity: rule.severity,
                originalValue: `status=${status}, dpd=${dpd}`
              });
            }
          }

          if (rule.ruleCode === 'STAT_CLOSED_ZERO_BALANCE') {
            if (['CLOSED', 'PAID_OFF', 'LIQUIDATED'].includes(status) && currentBal > 0) {
              issues.push({
                field: 'current_balance',
                issueType: `Loan marked as '${status}' but still holds positive balance of $${currentBal.toLocaleString()}`,
                severity: rule.severity,
                originalValue: String(currentBal)
              });
            }
          }
          break;
        }

        case 'STALENESS': {
          const lastUpdatedStr = loan.last_updated_at ?? loan.lastUpdatedAt;
          if (lastUpdatedStr) {
            const lastUpdated = new Date(lastUpdatedStr);
            if (!isNaN(lastUpdated.getTime())) {
              const maxDays = rule.parameters?.maxDaysOld || 180;
              const daysDiff = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
              if (daysDiff > maxDays) {
                issues.push({
                  field: 'last_updated_at',
                  issueType: `Servicing record is stale (${Math.round(daysDiff)} days since last update; limit is ${maxDays} days)`,
                  severity: rule.severity,
                  originalValue: String(lastUpdatedStr)
                });
              }
            }
          }
          break;
        }

        case 'AMORTIZATION_INTEGRITY': {
          const principal = Number(loan.original_principal ?? loan.originalPrincipal ?? 0);
          const currentBal = Number(loan.current_balance ?? loan.currentBalance ?? 0);
          const ratePercent = Number(loan.interest_rate ?? loan.interestRate ?? 0);
          const termMonths = Number(loan.term_months ?? loan.termMonths ?? 360);
          const origDateStr = loan.origination_date ?? loan.originationDate;
          const lastUpdatedStr = loan.last_updated_at ?? loan.lastUpdatedAt;

          if (principal > 0 && currentBal > 0 && termMonths > 0) {
            // Immediate check: current balance should not exceed original principal
            if (currentBal > principal) {
              issues.push({
                field: 'current_balance',
                issueType: `Current balance ($${currentBal.toLocaleString()}) exceeds original principal ($${principal.toLocaleString()})`,
                severity: rule.severity,
                originalValue: String(currentBal)
              });
            } else if (origDateStr) {
              const origDate = new Date(origDateStr);
              const asOfDate = lastUpdatedStr ? new Date(lastUpdatedStr) : new Date();
              if (!isNaN(origDate.getTime()) && !isNaN(asOfDate.getTime())) {
                const monthsElapsed = Math.max(0, Math.min(termMonths,
                  (asOfDate.getFullYear() - origDate.getFullYear()) * 12 + (asOfDate.getMonth() - origDate.getMonth())
                ));

                if (monthsElapsed > 0) {
                  const monthlyRate = (ratePercent / 100) / 12;
                  let expectedBalance = principal;
                  if (monthlyRate > 0) {
                    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
                    expectedBalance = principal * Math.pow(1 + monthlyRate, monthsElapsed) - monthlyPayment * (Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate;
                  } else {
                    expectedBalance = principal - (principal / termMonths) * monthsElapsed;
                  }

                  const maxTolerancePercent = rule.parameters?.maxVariancePercent || 5;
                  const maxAllowedBalance = expectedBalance * (1 + maxTolerancePercent / 100);
                  if (currentBal > maxAllowedBalance && currentBal > expectedBalance + 5000) {
                    issues.push({
                      field: 'current_balance',
                      issueType: `Balance deviation: actual balance ($${currentBal.toLocaleString()}) exceeds expected amortized balance ($${Math.round(expectedBalance).toLocaleString()}) after ${monthsElapsed} months by >${maxTolerancePercent}%`,
                      severity: rule.severity,
                      originalValue: String(currentBal)
                    });
                  }
                }
              }
            }
          }
          break;
        }

        default:
          break;
      }
    }

    // Fuzzy Duplicate & Repeat Borrower Detection across existing loans
    const borrowerName = loan.borrower_name ?? loan.borrowerName;
    const loanAmount = Number(loan.original_principal ?? loan.originalPrincipal ?? loan.loan_amount ?? loan.loanAmount ?? 0);
    const origDate = loan.origination_date ?? loan.originationDate ?? loan.start_date ?? loan.startDate;
    const currentLoanId = String(loan.loan_id ?? loan.loanId ?? '');

    for (const existing of existingLoans) {
      if (String(existing.loanId) === currentLoanId) {
        issues.push({
          field: 'loan_id',
          issueType: `Duplicate Loan ID "${currentLoanId}" already exists in tape`,
          severity: 'CRITICAL',
          originalValue: currentLoanId
        });
        break;
      }

      if (borrowerName) {
        const fuzzyResult = checkFuzzyDuplicate(
          borrowerName,
          loanAmount,
          origDate,
          existing.borrowerName,
          existing.originalPrincipal || existing.loanAmount,
          existing.originationDate || existing.startDate
        );

        if (fuzzyResult.isMatch) {
          issues.push({
            field: 'borrower_name',
            issueType: `[Fuzzy Match] ${fuzzyResult.reason} (Matches Loan: ${existing.loanId})`,
            severity: 'WARNING',
            originalValue: borrowerName
          });
          break;
        }
      }
    }

    return issues;
  }

  private static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
