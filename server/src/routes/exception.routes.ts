import { Router } from 'express';
import {
  listExceptions,
  getException,
  generateAiSuggestion,
  resolveException,
  bulkResolveExceptions,
  getBatchSummary
} from '../controllers/exception.controller';

const router = Router();

router.get('/', listExceptions);
router.get('/batch-summary', getBatchSummary);
router.post('/bulk-resolve', bulkResolveExceptions);
router.get('/:id', getException);
router.post('/:id/ai-assist', generateAiSuggestion);
router.post('/:id/resolve', resolveException);

export default router;
