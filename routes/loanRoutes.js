import express from 'express';
import {
  createContact,
  getAllContacts,
  getContactById,
  addTransaction,
  updateContact,
  deleteContact,
  settleContact,
  generateWhatsAppLink,
  getContactStats
} from '../controllers/contactController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🔐 All routes are protected
router.use(protect);

// 📊 Statistics
router.get('/stats', getContactStats);

// 👥 Contacts Management
router.route('/')
  .post(createContact)   // POST /api/contacts
  .get(getAllContacts);  // GET /api/contacts

// 🔍 Specific Contact
router.route('/:id')
  .get(getContactById)    // GET /api/contacts/:id
  .put(updateContact)     // PUT /api/contacts/:id
  .delete(deleteContact); // DELETE /api/contacts/:id

// 💰 Transactions
router.post('/:id/transactions', addTransaction); // POST /api/contacts/:id/transactions

// ✅ Settlement
router.post('/:id/settle', settleContact);        // POST /api/contacts/:id/settle

// 📱 WhatsApp Sharing
router.get('/:id/whatsapp', generateWhatsAppLink); // GET /api/contacts/:id/whatsapp

export default router;
