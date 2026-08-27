import { Router } from 'express';
import {
  exportVerifiedLoansJson,
  exportAuditTrailCsv,
  exportExceptionsCsv
} from '../controllers/export.controller';

const router = Router();

router.get('/verified-loans', exportVerifiedLoansJson);
router.get('/audit-trail', exportAuditTrailCsv);
router.get('/exceptions', exportExceptionsCsv);

export default router;
