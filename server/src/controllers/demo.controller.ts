import { Request, Response } from 'express';
import { prisma } from '../models/prismaClient';

export const resetDemoData = async (req: Request, res: Response): Promise<void> => {
  try {
    // Delete transactional entities in proper foreign key order
    await prisma.auditLog.deleteMany({});
    await prisma.exception.deleteMany({});
    await prisma.loan.deleteMany({});
    await prisma.upload.deleteMany({});

    // Reset Ledger State
    await prisma.ledgerState.upsert({
      where: { id: 'LEDGER_HEAD' },
      create: {
        id: 'LEDGER_HEAD',
        lastRecordHash: null,
        merkleRoot: null,
        totalVerified: 0,
        integrityStatus: 'VALID'
      },
      update: {
        lastRecordHash: null,
        merkleRoot: null,
        totalVerified: 0,
        lastVerifiedAt: null,
        integrityStatus: 'VALID'
      }
    });

    // Create fresh initial system audit log
    await prisma.auditLog.create({
      data: {
        action: 'RULE_CREATED',
        field: 'SYSTEM',
        newValue: 'Demo state initialized to clean genesis ledger',
        performedBy: req.body.reviewer || 'System Administrator',
        metadata: JSON.stringify({ action: 'DEMO_RESET_CLEAN_STATE', timestamp: new Date().toISOString() })
      }
    });

    res.json({
      success: true,
      message: 'Demo dataset reset successfully. All loan tapes, exceptions, and uploads cleared to pristine state.'
    });
  } catch (error: any) {
    console.error('Demo reset error:', error);
    res.status(500).json({ error: 'Failed to reset demo data', details: error.message });
  }
};
