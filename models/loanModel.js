import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'bank', 'easypaisa', 'jazzcash', 'other'],
    default: 'cash' 
  }
});

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  personName: { type: String, required: true, trim: true },
  phoneNumber: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  relationship: {
    type: String,
    enum: ['family', 'friend', 'colleague', 'relative', 'other'],
    default: 'friend'
  },
  transactions: [transactionSchema],
  
  // Auto-calculated fields
  totalCredit: { type: Number, default: 0 },
  totalDebit: { type: Number, default: 0 },
  netBalance: { type: Number, default: 0 },
  
  // Status
  isSettled: { type: Boolean, default: false },
  // ❌ linkedExpense field REMOVED
  
  lastTransactionDate: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// ✅ Same auto-calculation middleware
loanSchema.pre('save', function(next) {
  this.totalCredit = this.transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
    
  this.totalDebit = this.transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
    
  this.netBalance = this.totalCredit - this.totalDebit;
  this.isSettled = this.netBalance === 0;
  
  if (this.transactions.length > 0) {
    this.lastTransactionDate = this.transactions[this.transactions.length - 1].date;
  }
  
  next();
});

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;