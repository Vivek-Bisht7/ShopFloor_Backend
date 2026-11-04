import express from 'express';
import authenticate from '../../middleware/authenticate.js';
import authorize from '../../middleware/authorize.js';
import { validateReceiptInput } from './receipt.validation.js';
import { recordReceipt } from './receipt.controller.js';

const router = express.Router();

router.post(
    ['/:id/receipts', '/materials/:id/receipts'],
    authenticate,
    authorize(['admin', 'planner']),
    validateReceiptInput,
    recordReceipt
);

export default router;
