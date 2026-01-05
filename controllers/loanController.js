import Contact from "../models/Contact.js";
import mongoose from "mongoose";

// ======================
// 1. Create New Contact
// ======================
export const createContact = async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required" });
    }

    const contact = new Contact({
      userId: req.user.id,
      name: name.trim(),
      phone: phone?.trim() || "",
      transactions: [],
    });

    await contact.save();

    res.status(201).json({ message: "Contact created", contact });
  } catch (error) {
    console.error("Create contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// 2. Get All Contacts
// ======================
export const getAllContacts = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = { userId: req.user.id };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (status) {
      query.balanceType = status; // 'owe', 'owed', 'settled'
    }

    const contacts = await Contact.find(query).sort({ updatedAt: -1 });

    res.status(200).json({ success: true, count: contacts.length, contacts });
  } catch (error) {
    console.error("Get all contacts error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// 3. Get Contact By ID
// ======================
export const getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid contact ID" });
    }

    const contact = await Contact.findOne({ _id: id, userId: req.user.id });

    if (!contact) return res.status(404).json({ message: "Contact not found" });

    res.status(200).json({ success: true, contact });
  } catch (error) {
    console.error("Get contact by ID error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// 4. Add Transaction
// ======================
export const addTransaction = async (req, res) => {
  try {
    const { type, amount, direction, note, date } = req.body;
    const { id } = req.params;

    if (!type || !["credit", "return"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Transaction type must be 'credit' or 'return'" });
    }

    if (!direction || !["borrowed", "lent"].includes(direction)) {
      return res
        .status(400)
        .json({
          message: "Transaction direction must be 'borrowed' or 'lent'",
        });
    }

    if (!amount || isNaN(amount) || Number(amount) < 0) {
      return res.status(400).json({ message: "Amount must be non-negative" });
    }

    const contact = await Contact.findOne({ _id: id, userId: req.user.id });
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    contact.transactions.push({
      type,
      amount: parseFloat(amount),
      direction,
      note: note?.trim() || "",
      date: date ? new Date(date) : new Date(),
    });

    await contact.save();

    res
      .status(200)
      .json({ message: "Transaction added successfully", contact });
  } catch (error) {
    console.error("Add transaction error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// 5. Update Contact
// ======================
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    const contact = await Contact.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { name, phone, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!contact) return res.status(404).json({ message: "Contact not found" });

    res.status(200).json({ message: "Contact updated", contact });
  } catch (error) {
    console.error("Update contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// 6. Delete Contact
// ======================
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });
    if (!contact) return res.status(404).json({ message: "Contact not found" });

    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// 7. Settle Contact (Balance = 0)
// ======================
export const settleContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findOne({ _id: id, userId: req.user.id });

    if (!contact) return res.status(404).json({ message: "Contact not found" });
    if (contact.balanceType === "settled") {
      return res.status(400).json({ message: "Already settled" });
    }

    // Create full settlement transaction
    const settlementAmount = contact.currentBalance;
    let settlementDirection =
      contact.balanceType === "owe" ? "borrowed" : "lent";
    let settlementType = "return";

    contact.transactions.push({
      type: settlementType,
      direction: settlementDirection,
      amount: settlementAmount,
      note: "Full settlement",
      date: new Date(),
    });

    await contact.save();

    res.status(200).json({ message: "Contact settled successfully", contact });
  } catch (error) {
    console.error("Settle contact error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// 8. Generate WhatsApp Link
// ======================
export const generateWhatsAppLink = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findOne({ _id: id, userId: req.user.id });

    if (!contact) return res.status(404).json({ message: "Contact not found" });

    let balanceTypeText = "⚖️ SETTLED";
    let balanceEmoji = "✅";

    if (contact.balanceType === "owe") {
      balanceTypeText = `⚠️ YOU OWE: ₹${contact.currentBalance}`;
      balanceEmoji = "⚠️";
    } else if (contact.balanceType === "owed") {
      balanceTypeText = `💰 OWES YOU: ₹${contact.currentBalance}`;
      balanceEmoji = "💰";
    }

    let message = `${balanceEmoji} *LifeSync - Udhaar Summary*\n\n`;
    message += `👤 *Person:* ${contact.name}\n`;
    if (contact.phone) message += `📱 *Contact:* ${contact.phone}\n`;
    message += `📊 *Status:* ${contact.balanceType.toUpperCase()}\n\n`;
    message += `💎 *CURRENT BALANCE:*\n${balanceTypeText}\n\n`;
    message += `📜 *Transaction History:*\n--------------------------------\n`;

    const recentTransactions = contact.transactions
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    recentTransactions.forEach((t) => {
      const dateStr = new Date(t.date).toLocaleDateString("en-PK");
      const typeText =
        t.direction === "borrowed"
          ? t.type === "credit"
            ? "YOU BORROWED"
            : "YOU RETURNED"
          : t.type === "credit"
          ? "YOU LENT"
          : "YOU RECEIVED";

      const emoji =
        t.direction === "borrowed"
          ? t.type === "credit"
            ? "📥"
            : "📤"
          : t.type === "credit"
          ? "📤"
          : "📥";

      message += `${emoji} *${dateStr}*\n   ${typeText}: ₹${t.amount}\n`;
      if (t.note) message += `   (${t.note})\n`;
      message += "\n";
    });

    message += `--------------------------------\n`;
    message += `📅 *Last Updated:* ${new Date(
      contact.updatedAt
    ).toLocaleDateString()}\n\n`;
    message += `📱 *Generated via LifeSync App*\n✅ Keep your finances in sync!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/?text=${encodedMessage}`;

    res
      .status(200)
      .json({
        success: true,
        whatsappLink,
        messagePreview: message.substring(0, 150) + "...",
      });
  } catch (error) {
    console.error("Generate WhatsApp link error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// 9. Get Stats
// ======================
export const getContactStats = async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: null,
          totalContacts: { $sum: 1 },
          totalOwe: {
            $sum: {
              $cond: [{ $eq: ["$balanceType", "owe"] }, "$currentBalance", 0],
            },
          },
          totalOwed: {
            $sum: {
              $cond: [{ $eq: ["$balanceType", "owed"] }, "$currentBalance", 0],
            },
          },
          totalSettled: {
            $sum: { $cond: [{ $eq: ["$balanceType", "settled"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalContacts: 0,
      totalOwe: 0,
      totalOwed: 0,
      totalSettled: 0,
    };

    res.status(200).json({ success: true, stats: result });
  } catch (error) {
    console.error("Get contact stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
