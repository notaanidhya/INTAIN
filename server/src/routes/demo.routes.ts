import { Router } from 'express';
import { resetDemoData } from '../controllers/demo.controller';

const router = Router();

router.post('/reset', resetDemoData);

export default router;
