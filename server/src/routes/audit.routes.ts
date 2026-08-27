import { Router } from 'express';
import { getAuditLog, listAllAuditLogs } from '../controllers/audit.controller';

const router = Router();

router.get('/', listAllAuditLogs);
router.get('/:loanId', getAuditLog);

export default router;
