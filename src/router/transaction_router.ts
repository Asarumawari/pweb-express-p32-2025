import express from 'express';
import { createTransaction, getAllTransactions, getTransactionDetail, getTransactionStatistics } from '../controller/transaction_controller';
import { authenticateJWT } from '../middlewares/auth';

const router = express.Router();

router.post('/', authenticateJWT, createTransaction);
router.get('/', authenticateJWT, getAllTransactions);
router.get('/statistics', getTransactionStatistics);
router.get('/:transaction_id', authenticateJWT, getTransactionDetail);

export default router;
