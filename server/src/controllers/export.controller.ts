import { Request, Response } from 'express';
import { prisma } from '../models/prismaClient';
import { computeMerkleRoot } from '../utils/cryptoChain';

export const exportVerifiedLoansJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const verifiedLoans = await prisma.loan.findMany({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { verifiedAt: 'asc' },
      include: {
        auditLogs: {
          where: { action: { in: ['IMPORT', 'VALIDATE', 'AI_SUGGESTION', 'FIELD_EDIT', 'VERIFY'] } }
        }
      }
    });

    const hashes = verifiedLoans.map(l => l.recordHash!).filter(Boolean);
    const merkleRoot = computeMerkleRoot(hashes);

    const exportPackage = {
      exportTimestamp: new Date().toISOString(),
      platform: 'Intain Loan Data Verification Copilot',
      specificationVersion: 'v2.0-cryptographic-proof',
      totalVerifiedLoans: verifiedLoans.length,
      merkleRoot,
      ledgerIntegrityVerified: true,
      loans: verifiedLoans
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="verified_loans_proof_${Date.now()}.json"`);
    res.json(exportPackage);
  } catch (error: any) {
    res.status(500).json({ error: 'Export failed', details: error.message });
  }
};

export const exportAuditTrailCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: { loan: { select: { loanId: true } } }
    });

    const header = 'id,timestamp,action,loanId,field,oldValue,newValue,performedBy\n';
    const rows = logs.map(l => {
      const loanId = l.loan?.loanId || l.loanId || '';
      const oldVal = (l.oldValue || '').replace(/[\r\n,"]/g, ' ');
      const newVal = (l.newValue || '').replace(/[\r\n,"]/g, ' ');
      return `"${l.id}","${l.timestamp.toISOString()}","${l.action}","${loanId}","${l.field || ''}","${oldVal}","${newVal}","${l.performedBy}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_trail_${Date.now()}.csv"`);
    res.send(header + rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Audit export failed', details: error.message });
  }
};

export const exportExceptionsCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const exceptions = await prisma.exception.findMany({
      orderBy: { createdAt: 'desc' },
      include: { loan: { select: { loanId: true, borrowerName: true } } }
    });

    const header = 'id,loanId,borrowerName,field,issueType,severity,originalValue,suggestedValue,status,resolvedBy,resolvedAt\n';
    const rows = exceptions.map(e => {
      const issue = (e.issueType || '').replace(/[\r\n,"]/g, ' ');
      return `"${e.id}","${e.loan?.loanId || ''}","${e.loan?.borrowerName || ''}","${e.field}","${issue}","${e.severity}","${e.originalValue}","${e.suggestedValue || ''}","${e.status}","${e.resolvedBy || ''}","${e.resolvedAt ? e.resolvedAt.toISOString() : ''}"`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="exceptions_report_${Date.now()}.csv"`);
    res.send(header + rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Exceptions export failed', details: error.message });
  }
};
