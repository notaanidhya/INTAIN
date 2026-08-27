import { Router } from 'express';
import { getSummary } from '../controllers/summary.controller';

const router = Router();

router.get('/', getSummary);

export default router;
