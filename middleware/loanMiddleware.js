import mongoose from "mongoose";
import Loan from "../models/loanModel.js";

/**
 * ✅ 1. LOAN VALIDATION MIDDLEWARE
 * Request body ke data ko validate kare
 */
export const validateLoanData = (req, res, next) => {
  const { personName, transactions } = req.body;

  // Required fields check
  if (!personName || personName.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Person name is required",
    });
  }

  // Transactions validation
  if (transactions && Array.isArray(transactions)) {
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      if (!tx.type || !["credit", "debit"].includes(tx.type)) {
        return res.status(400).json({
          success: false,
          message: `Transaction ${i + 1}: Type must be 'credit' or 'debit'`,
        });
      }

      if (!tx.amount || isNaN(tx.amount) || tx.amount <= 0) {
        return res.status(400).json({
          success: false,
          message: `Transaction ${i + 1}: Valid amount is required`,
        });
      }
    }
  }

  next();
};

/**
 * ✅ 2. LOAN AUTHORIZATION MIDDLEWARE
 * Check kare ke user is loan ko access kar sakta hai ya nahi
 */
export const authorizeLoanAccess = async (req, res, next) => {
  try {
    const loanId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan ID format",
      });
    }

    const loan = await Loan.findOne({
      _id: loanId,
      user: req.user.id,
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: "Loan contact not found or access denied",
      });
    }

    // Loan object ko request mein attach kar do
    req.loan = loan;
    next();
  } catch (error) {
    console.error("Loan authorization error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during authorization",
    });
  }
};

/**
 * ✅ 3. AUTO-CALCULATION MIDDLEWARE
 * Transactions se totals automatically calculate kare
 */
export const calculateLoanTotals = (req, res, next) => {
  try {
    // Agar transactions request body mein hain
    if (req.body.transactions && Array.isArray(req.body.transactions)) {
      const transactions = req.body.transactions;

      const totalCredit = transactions
        .filter((t) => t.type === "credit")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const totalDebit = transactions
        .filter((t) => t.type === "debit")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      const netBalance = totalCredit - totalDebit;

      // Calculated values ko request body mein add kar do
      req.body.totalCredit = totalCredit;
      req.body.totalDebit = totalDebit;
      req.body.netBalance = netBalance;
      req.body.isSettled = netBalance === 0;

      // Last transaction date
      if (transactions.length > 0) {
        const dates = transactions
          .map((t) => new Date(t.date || new Date()))
          .filter((d) => !isNaN(d.getTime()));

        if (dates.length > 0) {
          const latestDate = new Date(Math.max(...dates));
          req.body.lastTransactionDate = latestDate;
        }
      }
    }

    next();
  } catch (error) {
    console.error("Calculation middleware error:", error);
    next(); // Error hone par bhi next() call karo, taki server na ruke
  }
};

/**
 * ✅ 4. TRANSACTION VALIDATION MIDDLEWARE
 * New transaction ke liye validation
 */
export const validateTransaction = (req, res, next) => {
  const { type, amount } = req.body;

  if (!type || !["credit", "debit"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Transaction type must be 'credit' or 'debit'",
    });
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid amount is required",
    });
  }

  // Optional: Payment method validation
  if (
    req.body.paymentMethod &&
    !["cash", "bank", "easypaisa", "jazzcash", "other"].includes(
      req.body.paymentMethod
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment method",
    });
  }

  next();
};

/**
 * ✅ 5. SETTLEMENT CHECK MIDDLEWARE
 * Check kare ke loan already settled to nahi hai
 */
export const checkSettlementStatus = (req, res, next) => {
  // Agar loan object already attached hai (authorizeLoanAccess ke baad)
  if (req.loan && req.loan.isSettled) {
    return res.status(400).json({
      success: false,
      message: "Cannot modify a settled loan",
    });
  }
  next();
};

/**
 * ✅ 6. WHATSAPP MESSAGE FORMATTER
 * Loan data ko WhatsApp message format mein convert kare
 */
export const formatWhatsAppMessage = (req, res, next) => {
  if (req.loan) {
    const loan = req.loan;

    let balanceType = "⚖️ SETTLED";
    let balanceEmoji = "✅";

    if (loan.netBalance > 0) {
      balanceType = `⚠️ YOU OWE: ₹${loan.netBalance}`;
      balanceEmoji = "⚠️";
    } else if (loan.netBalance < 0) {
      balanceType = `💰 OWES YOU: ₹${Math.abs(loan.netBalance)}`;
      balanceEmoji = "💰";
    }

    let message = `${balanceEmoji} *LifeSync - Udhaar Summary*\n\n`;
    message += `👤 *Person:* ${loan.personName}\n`;

    if (loan.phoneNumber) {
      message += `📱 *Contact:* ${loan.phoneNumber}\n`;
    }

    message += `🤝 *Relationship:* ${loan.relationship || "Not specified"}\n`;
    message += `📊 *Status:* ${
      loan.isSettled ? "✅ SETTLED" : "⏳ PENDING"
    }\n\n`;
    message += `💎 *CURRENT BALANCE:*\n${balanceType}\n\n`;

    // Request object mein formatted message attach kar do
    req.formattedMessage = message;
  }

  next();
};
