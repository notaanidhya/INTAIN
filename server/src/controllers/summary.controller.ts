import { Request, Response } from 'express';
import { prisma } from '../models/prismaClient';

export const getSummary = async (req: Request, res: Response) => {
  try {
    const totalLoans = await prisma.loan.count();
    const verifiedLoans = await prisma.loan.count({ where: { verificationStatus: 'VERIFIED' } });
    const pendingLoans = await prisma.loan.count({ where: { verificationStatus: 'PENDING' } });
    const exceptionLoans = await prisma.loan.count({ where: { verificationStatus: 'EXCEPTIONS_FOUND' } });
    const conflictedLoans = await prisma.loan.count({ where: { hasConflicts: true } });

    const openExceptions = await prisma.exception.count({ where: { status: 'OPEN' } });
    const criticalExceptions = await prisma.exception.count({ where: { status: 'OPEN', severity: 'CRITICAL' } });
    const errorExceptions = await prisma.exception.count({ where: { status: 'OPEN', severity: 'ERROR' } });
    const warningExceptions = await prisma.exception.count({ where: { status: 'OPEN', severity: 'WARNING' } });

    const resolvedExceptions = await prisma.exception.count({
      where: { status: { in: ['RESOLVED_ACCEPTED', 'RESOLVED_REJECTED', 'RESOLVED_MANUAL'] } }
    });

    // Calculate Composite Data-Quality Score (0 to 100)
    let dataQualityScore = 100;
    if (totalLoans > 0) {
      const penalty = (criticalExceptions * 25 + errorExceptions * 10 + warningExceptions * 3) / totalLoans;
      dataQualityScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));
    }

    const ledgerHead = await prisma.ledgerState.findUnique({
      where: { id: 'LEDGER_HEAD' }
    });

    res.json({
      totalLoans,
      verifiedLoans,
      pendingLoans,
      exceptionLoans,
      conflictedLoans,
      openExceptions,
      criticalExceptions,
      errorExceptions,
      warningExceptions,
      resolvedExceptions,
      dataQualityScore,
      ledgerHead: ledgerHead || {
        merkleRoot: 'N/A',
        totalVerified: verifiedLoans,
        integrityStatus: 'VALID'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
};
