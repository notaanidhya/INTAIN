import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import uploadRoutes from './routes/upload.routes';
import exceptionRoutes from './routes/exception.routes';
import loanRoutes from './routes/loan.routes';
import auditRoutes from './routes/audit.routes';
import summaryRoutes from './routes/summary.routes';
import ruleRoutes from './routes/rule.routes';
import demoRoutes from './routes/demo.routes';
import exportRoutes from './routes/export.routes';
import { prisma } from './models/prismaClient';

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// API Routes
app.use('/api/uploads', uploadRoutes);
app.use('/api/exceptions', exceptionRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/export', exportRoutes);

// Module H Canonical Endpoint Aliases (directly on root for automated testing parity)
app.use('/loans', loanRoutes);
app.use('/exceptions', exceptionRoutes);
app.use('/audit', auditRoutes);
app.use('/summary', summaryRoutes);
app.use('/demo', demoRoutes);
app.use('/export', exportRoutes);

// Module H specific /verified-loans endpoints
app.get('/verified-loans', async (req: Request, res: Response) => {
  try {
    const verified = await prisma.loan.findMany({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { verifiedAt: 'desc' }
    });
    res.json(verified);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch verified loans', details: error.message });
  }
});

app.get('/api/verified-loans', async (req: Request, res: Response) => {
  try {
    const verified = await prisma.loan.findMany({
      where: { verificationStatus: 'VERIFIED' },
      orderBy: { verifiedAt: 'desc' }
    });
    res.json(verified);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch verified loans', details: error.message });
  }
});

app.get('/verified-loans/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const loanId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const loan = await prisma.loan.findFirst({
      where: { id: loanId, verificationStatus: 'VERIFIED' },
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
});

// Root & Health check routes for UptimeRobot / uptime monitors
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CredoraTech Loan Verification API',
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CredoraTech Loan Verification API',
    uptimeSeconds: Math.floor(process.uptime())
  });
});

export default app;
