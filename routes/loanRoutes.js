import express from 'express';
import {
  createLoanContact,
  getAllLoanContacts,
  getLoanContactById,
  addTransaction,
  updateLoanContact,
  deleteLoanContact,
  settleLoan,
  generateWhatsAppLink,
  getLoanStats
} from '../controllers/loanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔐 Sab routes protected hain
router.use(protect);

// 📊 Statistics
router.get('/stats', getLoanStats);

// 👥 Loan Contacts Management
router.route('/')
  .post(createLoanContact)    // POST /api/loans
  .get(getAllLoanContacts);   // GET /api/loans

// 🔍 Specific Loan Contact
router.route('/:id')
  .get(getLoanContactById)    // GET /api/loans/:id
  .put(updateLoanContact)     // PUT /api/loans/:id
  .delete(deleteLoanContact); // DELETE /api/loans/:id

// 💰 Transactions
router.post('/:id/transactions', addTransaction);

// ✅ Settlement
router.post('/:id/settle', settleLoan);

// 📱 WhatsApp Sharing (NO expense linking)
router.get('/:id/whatsapp', generateWhatsAppLink);

export default router;