import { Router } from 'express';
import {
  listLoans,
  getLoan,
  updateLoan,
  verifyLoan,
  checkLedgerIntegrity,
  tamperTest,
  searchLoansNaturalLanguage,
  listVerifiedLoans,
  getVerifiedLoan
} from '../controllers/loan.controller';

const router = Router();

router.get('/', listLoans);
router.post('/search-nl', searchLoansNaturalLanguage);
router.get('/verified', listVerifiedLoans);
router.get('/verified/:id', getVerifiedLoan);
router.get('/integrity/verify', checkLedgerIntegrity);
router.post('/tamper-test', tamperTest);
router.get('/:id', getLoan);
router.patch('/:id', updateLoan);
router.post('/:id/verify', verifyLoan);

export default router;
