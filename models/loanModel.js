// ============================================
// MODELS - models/Contact.js
// ============================================
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['credit', 'return'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  note: {
    type: String,
    default: ''
  },
  direction: {
    type: String,
    enum: ['borrowed', 'lent'], // borrowed = maine liya, lent = maine diya
    required: true
  }
});

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  transactions: [transactionSchema],
  currentBalance: {
    type: Number,
    default: 0
  },
  balanceType: {
    type: String,
    enum: ['owe', 'owed', 'settled'], // owe = main dena hun, owed = mujhe milna hai
    default: 'settled'
  }
}, {
  timestamps: true
});

// Calculate balance before saving
contactSchema.pre('save', function(next) {
  let balance = 0;
  
  this.transactions.forEach(txn => {
    if (txn.direction === 'borrowed') {
      // Maine liya
      if (txn.type === 'credit') {
        balance += txn.amount; // Debt increase
      } else {
        balance -= txn.amount; // Return
      }
    } else {
      // Maine diya
      if (txn.type === 'credit') {
        balance -= txn.amount; // They owe me
      } else {
        balance += txn.amount; // They returned
      }
    }
  });
  
  this.currentBalance = Math.abs(balance);
  
  if (balance > 0) {
    this.balanceType = 'owe'; // Main dena hun
  } else if (balance < 0) {
    this.balanceType = 'owed'; // Mujhe milna hai
  } else {
    this.balanceType = 'settled';
  }
  
  next();
});

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
