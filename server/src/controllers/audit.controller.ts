import { Request, Response } from 'express';
import { prisma } from '../models/prismaClient';

export const getAuditLog = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { loanId: String(req.params.loanId) },
      orderBy: { timestamp: 'desc' },
      include: { loan: true }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message });
  }
};

export const listAllAuditLogs = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit || '50'), 10));
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        loan: {
          select: { loanId: true, borrowerName: true, verificationStatus: true }
        }
      }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message });
  }
};
