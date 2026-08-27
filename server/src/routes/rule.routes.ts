import { Router } from 'express';
import { listRules, toggleRule, generateRuleFromNl } from '../controllers/rule.controller';

const router = Router();

router.get('/', listRules);
router.patch('/:id/toggle', toggleRule);
router.post('/generate-from-nl', generateRuleFromNl);

export default router;
