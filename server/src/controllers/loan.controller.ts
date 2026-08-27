import { Request, Response } from 'express';
import { prisma } from '../models/prismaClient';
import { AIService } from '../services/ai.service';
import { ValidationService } from '../services/validation.service';
import {
  extractCanonicalLoanPayload,
  computeChainedRecordHash,
  verifyChainIntegrity,
  computeMerkleRoot,
  GENESIS_HASH
} from '../utils/cryptoChain';

export const listLoans = async (req: Request, res: Response) => {
  try {
    const { status, verificationStatus, search } = req.query;

    const where: any = {};
    if (verificationStatus && verificationStatus !== 'ALL') {
      where.verificationStatus = String(verificationStatus);
    }
    if (status && status !== 'ALL') {
      where.paymentStatus = String(status);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { loanId: { contains: q } },
        { borrowerName: { contains: q } },
        { borrowerId: { contains: q } }
      ];
    }

    const loans = await prisma.loan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        exceptions: {
          where: { status: 'OPEN' }
        }
      }
    });

    res.json(loans);
  } catch (error: any) {
    console.error('List loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans', details: error.message });
  }
};

export const getLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: String(req.params.id) },
      include: {
        exceptions: true,
        auditLogs: {
          orderBy: { timestamp: 'desc' }
        },
        upload: true
      }
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    res.json(loan);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch loan', details: error.message });
  }
};

export const updateLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reviewer, reviewerComment, ...updateData } = req.body;
    const loanId = String(req.params.id);

    const oldLoan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!oldLoan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    const updatedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: updateData
    });

    // Determine edited fields summary for audit
    const changedFields = Object.keys(updateData).filter(k => (oldLoan as any)[k] !== (updateData as any)[k]);

    await prisma.auditLog.create({
      data: {
        loanId,
        action: 'FIELD_EDIT',
        field: changedFields.length > 0 ? changedFields.join(', ') : 'MULTIPLE',
        oldValue: JSON.stringify(Object.fromEntries(changedFields.map(k => [k, (oldLoan as any)[k]])) ),
        newValue: reviewerComment ? `${JSON.stringify(updateData)} [Note: ${reviewerComment}]` : JSON.stringify(updateData),
        performedBy: reviewer || 'Human Reviewer'
      }
    });

    // Re-validate against active validation rules
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

    const remainingIssues = ValidationService.validateLoanRecord(updatedLoan, [], ruleDefs);
    const activeIssueFields = new Set(remainingIssues.map(i => i.field));

    // Clear open exceptions for fields that are now valid
    const openExceptions = await prisma.exception.findMany({
      where: { loanId, status: 'OPEN' }
    });

    for (const ex of openExceptions) {
      if (!activeIssueFields.has(ex.field)) {
        await prisma.exception.update({
          where: { id: ex.id },
          data: {
            status: 'RESOLVED_MANUAL',
            resolvedBy: reviewer || 'Human Reviewer',
            resolvedAt: new Date(),
            suggestedValue: String((updatedLoan as any)[ex.field] ?? ex.suggestedValue ?? '')
          }
        });
      }
    }

    const currentOpenCount = await prisma.exception.count({
      where: { loanId, status: 'OPEN' }
    });

    const finalStatus = currentOpenCount === 0 ? 'PENDING' : 'EXCEPTIONS_FOUND';
    const finalizedLoan = await prisma.loan.update({
      where: { id: loanId },
      data: { verificationStatus: finalStatus },
      include: {
        exceptions: true,
        auditLogs: { orderBy: { timestamp: 'desc' } }
      }
    });

    res.json(finalizedLoan);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update loan', details: error.message });
  }
};

export const verifyLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const loanId = String(req.params.id);
    const { reviewer } = req.body;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { exceptions: { where: { status: 'OPEN' } } }
    });

    if (!loan) {
      res.status(404).json({ error: 'Loan not found' });
      return;
    }

    if (loan.verificationStatus === 'VERIFIED') {
      res.status(400).json({
        error: 'Loan is already verified and cryptographically chained into the ledger.',
        recordHash: loan.recordHash
      });
      return;
    }

    if (loan.exceptions.length > 0) {
      res.status(400).json({
        error: 'Cannot verify loan with open exceptions. Resolve all exceptions first.',
        openExceptionsCount: loan.exceptions.length
      });
      return;
    }

    // Find the latest verified loan to chain hashes
    const lastVerified = await prisma.loan.findFirst({
      where: {
        verificationStatus: 'VERIFIED',
        recordHash: { not: null },
        id: { not: loanId }
      },
      orderBy: { verifiedAt: 'desc' }
    });

    const previousHash = lastVerified?.recordHash || GENESIS_HASH;
    const canonicalPayload = extractCanonicalLoanPayload(loan);
    const recordHash = computeChainedRecordHash(canonicalPayload, previousHash);
    const verifiedAt = new Date();
    const verifiedBy = reviewer || 'Certified Custodian';

    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: {
        verificationStatus: 'VERIFIED',
        recordHash,
        previousRecordHash: previousHash,
        verifiedAt,
        verifiedBy
      }
    });

    // Update Ledger State head
    const allVerified = await prisma.loan.findMany({
      where: { verificationStatus: 'VERIFIED', recordHash: { not: null } },
      select: { recordHash: true }
    });
    const hashes = allVerified.map(l => l.recordHash!).filter(Boolean);
    const merkleRoot = computeMerkleRoot(hashes);

    await prisma.ledgerState.upsert({
      where: { id: 'LEDGER_HEAD' },
      create: {
        id: 'LEDGER_HEAD',
        lastRecordHash: recordHash,
        merkleRoot,
        totalVerified: hashes.length,
        lastVerifiedAt: verifiedAt,
        integrityStatus: 'VALID'
      },
      update: {
        lastRecordHash: recordHash,
        merkleRoot,
        totalVerified: hashes.length,
        lastVerifiedAt: verifiedAt,
        integrityStatus: 'VALID'
      }
    });

    await prisma.auditLog.create({
      data: {
        loanId,
        action: 'VERIFY',
        performedBy: verifiedBy,
        newValue: recordHash,
        metadata: JSON.stringify({
          previousRecordHash: previousHash,
          merkleRoot,
          chainIndex: hashes.length
        })
      }
    });

    res.json({ loan: updated, merkleRoot });
  } catch (error: any) {
    console.error('Verify loan error:', error);
    res.status(500).json({ error: 'Failed to verify loan', details: error.message });
  }
};

/**
 * Validates cryptographic chain integrity across all verified records.
 */
export const checkLedgerIntegrity = async (req: Request, res: Response) => {
  try {
    const verifiedLoans = await prisma.loan.findMany({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { verifiedAt: 'asc' }
    });

    const result = verifyChainIntegrity(verifiedLoans);

    // Update ledger state status
    await prisma.ledgerState.upsert({
      where: { id: 'LEDGER_HEAD' },
      create: {
        id: 'LEDGER_HEAD',
        merkleRoot: result.merkleRoot,
        totalVerified: result.totalRecordsChecked,
        lastVerifiedAt: new Date(),
        integrityStatus: result.isValid ? 'VALID' : 'COMPROMISED'
      },
      update: {
        merkleRoot: result.merkleRoot,
        totalVerified: result.totalRecordsChecked,
        lastVerifiedAt: new Date(),
        integrityStatus: result.isValid ? 'VALID' : 'COMPROMISED'
      }
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Integrity check failed', details: error.message });
  }
};

/**
 * DEMO FEATURE: Simulates database tampering by altering a verified record directly,
 * allowing live demonstration of tamper-evident break in the cryptographic hash chain.
 */
export const tamperTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const targetLoan = await prisma.loan.findFirst({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { verifiedAt: 'desc' }
    });

    if (!targetLoan) {
      res.status(400).json({ error: 'No verified loan found to tamper with. Verify at least one loan first.' });
      return;
    }

    // Tamper with loan amount or balance directly in DB without updating recordHash
    const tamperedAmount = targetLoan.originalPrincipal + 50000;
    await prisma.loan.update({
      where: { id: targetLoan.id },
      data: { originalPrincipal: tamperedAmount }
    });

    await prisma.auditLog.create({
      data: {
        loanId: targetLoan.id,
        action: 'FIELD_EDIT',
        field: 'originalPrincipal',
        oldValue: String(targetLoan.originalPrincipal),
        newValue: `${tamperedAmount} [SIMULATED DB TAMPERING]`,
        performedBy: 'External / Unauthorized DB Access'
      }
    });

    res.json({
      success: true,
      message: `Simulated unauthorized DB tamper on Loan ${targetLoan.loanId}: changed principal from $${targetLoan.originalPrincipal} to $${tamperedAmount}. Run Integrity Check now to observe cryptographic break!`,
      loanId: targetLoan.loanId
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Tamper test failed', details: error.message });
  }
};

export const listVerifiedLoans = async (req: Request, res: Response) => {
  try {
    const verified = await prisma.loan.findMany({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { verifiedAt: 'desc' }
    });
    res.json(verified);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch verified loans', details: error.message });
  }
};

export const getVerifiedLoan = async (req: Request, res: Response): Promise<void> => {
  try {
    const loan = await prisma.loan.findFirst({
      where: { id: String(req.params.id), verificationStatus: 'VERIFIED' },
      include: { auditLogs: true }
    });
    if (!loan) {
      res.status(404).json({ error: 'Verified loan not found' });
      return;
    }
    res.json(loan);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch verified loan', details: error.message });
  }
};

export const searchLoansNaturalLanguage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    const filter = await AIService.parseNaturalLanguageSearch(String(query || ''));

    const where: any = {};
    if (filter.borrowerState) {
      where.borrowerState = filter.borrowerState.toUpperCase();
    }
    if (filter.paymentStatus) {
      where.paymentStatus = filter.paymentStatus;
    }
    if (filter.verificationStatus) {
      where.verificationStatus = filter.verificationStatus;
    }
    if (filter.hasConflicts !== undefined) {
      where.hasConflicts = filter.hasConflicts;
    }
    if (filter.creditGrade) {
      where.creditGrade = filter.creditGrade.toUpperCase();
    }
    if (filter.minInterestRate != null || filter.maxInterestRate != null) {
      where.interestRate = {};
      if (filter.minInterestRate != null) where.interestRate.gte = filter.minInterestRate;
      if (filter.maxInterestRate != null) where.interestRate.lte = filter.maxInterestRate;
    }
    if (filter.minBalance != null || filter.maxBalance != null) {
      where.currentBalance = {};
      if (filter.minBalance != null) where.currentBalance.gte = filter.minBalance;
      if (filter.maxBalance != null) where.currentBalance.lte = filter.maxBalance;
    }
    if (filter.minDaysPastDue != null || filter.maxDaysPastDue != null) {
      where.daysPastDue = {};
      if (filter.minDaysPastDue != null) where.daysPastDue.gte = filter.minDaysPastDue;
      if (filter.maxDaysPastDue != null) where.daysPastDue.lte = filter.maxDaysPastDue;
    }

    const loans = await prisma.loan.findMany({
      where,
      orderBy: { originationDate: 'desc' },
      include: {
        exceptions: {
          where: { status: 'OPEN' }
        }
      }
    });

    res.json({
      query: String(query || ''),
      filter,
      totalMatches: loans.length,
      loans
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to execute natural language search', details: error.message });
  }
};
