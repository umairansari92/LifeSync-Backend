import Loan from "../models/loanModel.js";
import mongoose from "mongoose";

// ✅ 1. Naya Loan Contact banaye
export const createLoanContact = async (req, res) => {
  try {
    const { personName, phoneNumber, email, relationship, transactions } = req.body;

    if (!personName) {
      return res.status(400).json({ message: "Person name is required" });
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ message: "At least one transaction is required" });
    }

    const newLoan = await Loan.create({
      user: req.user.id,
      personName,
      phoneNumber,
      email,
      relationship,
      transactions: transactions.map(t => ({
        ...t,
        date: t.date || new Date()
      }))
    });

    res.status(201).json({ 
      message: "Loan contact created successfully", 
      loan: newLoan 
    });

  } catch (error) {
    console.error("Create loan contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ 2. Saare Loan Contacts laaye
export const getAllLoanContacts = async (req, res) => {
  try {
    const { search, status, relationship } = req.query;
    let query = { user: req.user.id };

    if (search) {
      query.$or = [
        { personName: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } }
      ];
    }

    if (status === 'settled') {
      query.isSettled = true;
    } else if (status === 'pending') {
      query.isSettled = false;
      query.netBalance = { $ne: 0 };
    }

    if (relationship) {
      query.relationship = relationship;
    }

    const loans = await Loan.find(query).sort({ lastTransactionDate: -1 });

    res.status(200).json({ 
      success: true, 
      count: loans.length, 
      loans 
    });

  } catch (error) {
    console.error("Get all loans error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ 3. Single Loan Contact ki details laaye
export const getLoanContactById = async (req, res) => {
  try {
    const loan = await Loan.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan contact not found" });
    }

    res.status(200).json({ success: true, loan });

  } catch (error) {
    console.error("Get loan by ID error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ 4. Naya Transaction add kare
export const addTransaction = async (req, res) => {
  try {
    const { type, amount, description, paymentMethod, date } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ message: "Type and amount are required" });
    }

    const loan = await Loan.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan contact not found" });
    }

    loan.transactions.push({
      type,
      amount: parseFloat(amount),
      description: description || '',
      paymentMethod: paymentMethod || 'cash',
      date: date ? new Date(date) : new Date()
    });

    await loan.save();

    res.status(200).json({ 
      message: "Transaction added successfully", 
      loan 
    });

  } catch (error) {
    console.error("Add transaction error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ 5. Loan Contact update kare
export const updateLoanContact = async (req, res) => {
  try {
    const { personName, phoneNumber, email, relationship } = req.body;

    const loan = await Loan.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { 
        personName, 
        phoneNumber, 
        email, 
        relationship,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!loan) {
      return res.status(404).json({ message: "Loan contact not found" });
    }

    res.status(200).json({ 
      message: "Contact updated successfully", 
      loan 
    });

  } catch (error) {
    console.error("Update loan contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ 6. Loan Contact delete kare
export const deleteLoanContact = async (req, res) => {
  try {
    const loan = await Loan.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan contact not found" });
    }

    res.status(200).json({ 
      message: "Loan contact deleted successfully" 
    });

  } catch (error) {
    console.error("Delete loan contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ 7. Settle kare (poore balance ko zero kare)
export const settleLoan = async (req, res) => {
  try {
    const loan = await Loan.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan contact not found" });
    }

    if (loan.netBalance === 0) {
      return res.status(400).json({ message: "Already settled" });
    }

    const settlementType = loan.netBalance > 0 ? 'debit' : 'credit';
    const settlementAmount = Math.abs(loan.netBalance);

    loan.transactions.push({
      type: settlementType,
      amount: settlementAmount,
      description: 'Full settlement',
      paymentMethod: 'cash',
      date: new Date()
    });

    await loan.save();

    res.status(200).json({ 
      message: "Loan settled successfully", 
      loan 
    });

  } catch (error) {
    console.error("Settle loan error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ✅ 8. WhatsApp Link Generate kare (Aap ka favorite feature!)
export const generateWhatsAppLink = async (req, res) => {
  try {
    const loan = await Loan.findOne({ 
      _id: req.params.id, 
      user: req.user.id 
    });

    if (!loan) {
      return res.status(404).json({ message: "Loan contact not found" });
    }

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
    
    message += `🤝 *Relationship:* ${loan.relationship}\n`;
    message += `📊 *Status:* ${loan.isSettled ? '✅ SETTLED' : '⏳ PENDING'}\n\n`;
    
    message += `💎 *CURRENT BALANCE:*\n${balanceType}\n\n`;
    
    message += `📜 *Transaction History:*\n`;
    message += `--------------------------------\n`;
    
    const recentTransactions = loan.transactions
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
    
    recentTransactions.forEach((t, index) => {
      const dateStr = new Date(t.date).toLocaleDateString('en-PK');
      const typeText = t.type === 'credit' ? 'YOU BORROWED' : 'YOU RETURNED/GAVE';
      const emoji = t.type === 'credit' ? '📥' : '📤';
      
      message += `${emoji} *${dateStr}*\n`;
      message += `   ${typeText}: ₹${t.amount}\n`;
      if (t.description) {
        message += `   (${t.description})\n`;
      }
      message += `\n`;
    });
    
    if (loan.transactions.length > 5) {
      message += `... and ${loan.transactions.length - 5} more transactions\n\n`;
    }
    
    message += `--------------------------------\n`;
    message += `📅 *Last Updated:* ${new Date(loan.updatedAt).toLocaleDateString()}\n\n`;
    message += `📱 *Generated via LifeSync App*\n`;
    message += `✅ Keep your finances in sync!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/?text=${encodedMessage}`;

    res.status(200).json({ 
      success: true, 
      whatsappLink,
      messagePreview: message.substring(0, 150) + "..." 
    });

  } catch (error) {
    console.error("Generate WhatsApp link error:", error);
    res.status(500).json({ 
      message: "Error generating WhatsApp link", 
      error: error.message 
    });
  }
};

// ✅ 9. Statistics/Dashboard ke liye data laaye
export const getLoanStats = async (req, res) => {
  try {
    const stats = await Loan.aggregate([
      { $match: { user: mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          totalPending: {
            $sum: { $cond: [{ $eq: ["$isSettled", false] }, 1, 0] }
          },
          totalSettled: {
            $sum: { $cond: [{ $eq: ["$isSettled", true] }, 1, 0] }
          },
          totalYouOwe: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$netBalance", 0] }, { $eq: ["$isSettled", false] }] },
                "$netBalance",
                0
              ]
            }
          },
          totalOwesYou: {
            $sum: {
              $cond: [
                { $and: [{ $lt: ["$netBalance", 0] }, { $eq: ["$isSettled", false] }] },
                { $abs: "$netBalance" },
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalContacts: 0,
      totalPending: 0,
      totalSettled: 0,
      totalYouOwe: 0,
      totalOwesYou: 0
    };

    res.status(200).json({
      success: true,
      stats: result
    });

  } catch (error) {
    console.error("Get loan stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};