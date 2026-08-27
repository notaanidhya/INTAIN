import { prisma } from '../models/prismaClient';

export interface FieldConflict {
  field: string;
  tapeValue: any;
  servicerValue: any;
  discrepancyType: string;
  recommendedValue: any;
  reasoning: string;
  confidence: number;
}

export interface ReconcileResult {
  matchedCount: number;
  unmatchedCount: number;
  conflictsFound: number;
  conflictedLoanIds: string[];
}

export class ReconciliationService {
  /**
   * Reconciles a second-source servicer update against existing loans in the database.
   */
  static async reconcileServicerUpdates(
    updates: any[],
    uploader: string = 'Servicer Feed'
  ): Promise<ReconcileResult> {
    let matchedCount = 0;
    let unmatchedCount = 0;
    let conflictsFound = 0;
    const conflictedLoanIds: string[] = [];

    for (const updateRow of updates) {
      const loanId = String(updateRow.loan_id ?? updateRow.loanId ?? '').trim();
      if (!loanId) {
        unmatchedCount++;
        continue;
      }

      const existingLoan = await prisma.loan.findFirst({
        where: { loanId }
      });

      if (!existingLoan) {
        unmatchedCount++;
        continue;
      }

      matchedCount++;
      const conflicts: FieldConflict[] = [];

      // Check current balance conflict
      if (updateRow.current_balance !== undefined && updateRow.current_balance !== '') {
        const servicerBal = Number(updateRow.current_balance);
        const tapeBal = existingLoan.currentBalance;
        if (!isNaN(servicerBal) && Math.abs(servicerBal - tapeBal) > 0.01) {
          conflicts.push({
            field: 'currentBalance',
            tapeValue: tapeBal,
            servicerValue: servicerBal,
            discrepancyType: 'BALANCE_MISMATCH',
            recommendedValue: servicerBal,
            reasoning: 'Servicer feed represents real-time cash payment collection. Servicer balance takes priority over static origination tape.',
            confidence: 0.94
          });
        }
      }

      // Check payment status conflict
      if (updateRow.payment_status && String(updateRow.payment_status).toUpperCase() !== String(existingLoan.paymentStatus).toUpperCase()) {
        conflicts.push({
          field: 'paymentStatus',
          tapeValue: existingLoan.paymentStatus,
          servicerValue: String(updateRow.payment_status).toUpperCase(),
          discrepancyType: 'PAYMENT_STATUS_MISMATCH',
          recommendedValue: String(updateRow.payment_status).toUpperCase(),
          reasoning: 'Servicer real-time delinquency tracking reflects latest borrower payment event.',
          confidence: 0.91
        });
      }

      // Check days past due conflict
      if (updateRow.days_past_due !== undefined && updateRow.days_past_due !== '') {
        const servicerDpd = Number(updateRow.days_past_due);
        if (!isNaN(servicerDpd) && servicerDpd !== existingLoan.daysPastDue) {
          conflicts.push({
            field: 'daysPastDue',
            tapeValue: existingLoan.daysPastDue,
            servicerValue: servicerDpd,
            discrepancyType: 'DPD_MISMATCH',
            recommendedValue: servicerDpd,
            reasoning: 'Servicing ledger days-past-due counter is more up-to-date.',
            confidence: 0.92
          });
        }
      }

      // Check interest rate mismatch
      if (updateRow.interest_rate !== undefined && updateRow.interest_rate !== '') {
        const servicerRate = Number(updateRow.interest_rate);
        if (!isNaN(servicerRate) && Math.abs(servicerRate - existingLoan.interestRate) > 0.001) {
          conflicts.push({
            field: 'interestRate',
            tapeValue: existingLoan.interestRate,
            servicerValue: servicerRate,
            discrepancyType: 'RATE_MISMATCH',
            recommendedValue: existingLoan.interestRate,
            reasoning: 'Original note rate on loan tape typically governs contract terms unless a formal loan modification is documented.',
            confidence: 0.85
          });
        }
      }

      if (conflicts.length > 0) {
        conflictsFound++;
        conflictedLoanIds.push(existingLoan.id);

        await prisma.loan.update({
          where: { id: existingLoan.id },
          data: {
            hasConflicts: true,
            conflictDetails: JSON.stringify(conflicts),
            verificationStatus: 'EXCEPTIONS_FOUND'
          }
        });

        for (const conflict of conflicts) {
          await prisma.exception.create({
            data: {
              loanId: existingLoan.id,
              field: conflict.field,
              issueType: `[Source Conflict] ${conflict.discrepancyType}: Tape has "${conflict.tapeValue}", Servicer Update reports "${conflict.servicerValue}"`,
              severity: 'WARNING',
              originalValue: String(conflict.tapeValue),
              suggestedValue: String(conflict.recommendedValue),
              aiExplanation: conflict.reasoning,
              aiConfidence: conflict.confidence,
              aiModel: 'Reconciliation-Heuristics-v1'
            }
          });
        }

        await prisma.auditLog.create({
          data: {
            loanId: existingLoan.id,
            action: 'CONFLICT_DETECTED',
            field: 'MULTIPLE',
            oldValue: JSON.stringify({ currentBalance: existingLoan.currentBalance, paymentStatus: existingLoan.paymentStatus }),
            newValue: JSON.stringify(conflicts),
            performedBy: uploader,
            metadata: JSON.stringify({ source: 'servicer_update.csv', conflictCount: conflicts.length })
          }
        });
      }
    }

    return {
      matchedCount,
      unmatchedCount,
      conflictsFound,
      conflictedLoanIds
    };
  }

  /**
   * Reconciles document manifest status by loanId.
   */
  static async reconcileDocumentManifest(
    manifestRows: any[],
    uploader: string = 'Document Custodian'
  ): Promise<{ updatedCount: number; missingCount: number }> {
    let updatedCount = 0;
    let missingCount = 0;

    for (const row of manifestRows) {
      const loanId = String(row.loan_id ?? row.loanId ?? '').trim();
      const status = String(row.document_status ?? row.status ?? 'COMPLETE').toUpperCase().trim();

      if (!loanId) continue;

      const existingLoan = await prisma.loan.findFirst({ where: { loanId } });
      if (!existingLoan) {
        missingCount++;
        continue;
      }

      await prisma.loan.update({
        where: { id: existingLoan.id },
        data: { documentStatus: status }
      });

      if (['MISSING', 'INCOMPLETE', 'MISSING_NOTE'].includes(status)) {
        await prisma.exception.create({
          data: {
            loanId: existingLoan.id,
            field: 'documentStatus',
            issueType: `Custodian Document Defect: ${status}`,
            severity: 'WARNING',
            originalValue: status,
            suggestedValue: 'PENDING_CUSTODIAL_RECEIPT',
            aiExplanation: 'Loan file missing critical promissory note or title documentation from custodian vault.',
            aiConfidence: 0.98
          }
        });
      }

      await prisma.auditLog.create({
        data: {
          loanId: existingLoan.id,
          action: 'FIELD_EDIT',
          field: 'documentStatus',
          oldValue: existingLoan.documentStatus,
          newValue: status,
          performedBy: uploader,
          metadata: JSON.stringify({ source: 'document_manifest.csv' })
        }
      });

      updatedCount++;
    }

    return { updatedCount, missingCount };
  }
}
