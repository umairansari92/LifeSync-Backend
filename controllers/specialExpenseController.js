import SpecialExpenseCard from "../models/SpecialExpenseCard.js";
import SpecialExpenseEntry from "../models/SpecialExpenseEntry.js";

// ----------------------
// CARD CONTROLLERS
// ----------------------

// Create a new card
export const createCard = async (req, res) => {
  try {
    const { title, startDate, description } = req.body;
    const card = await SpecialExpenseCard.create({ title, startDate, description });
    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create card" });
  }
};

// Get all cards
export const getCards = async (req, res) => {
  try {
    const cards = await SpecialExpenseCard.find().sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch cards" });
  }
};

// Get single card by id
export const getCard = async (req, res) => {
  try {
    const card = await SpecialExpenseCard.findById(req.params.id);
    if (!card) return res.status(404).json({ message: "Card not found" });
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch card" });
  }
};

// Update card (title or description)
export const updateCard = async (req, res) => {
  try {
    const { title, description } = req.body;
    const card = await SpecialExpenseCard.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true }
    );
    if (!card) return res.status(404).json({ message: "Card not found" });
    res.json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update card" });
  }
};

// Delete card & all entries
export const deleteCard = async (req, res) => {
  try {
    const card = await SpecialExpenseCard.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ message: "Card not found" });

    // Delete all entries under this card
    await SpecialExpenseEntry.deleteMany({ cardId: card._id });

    res.json({ message: "Card and its entries deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete card" });
  }
};

// ----------------------
// ENTRY CONTROLLERS
// ----------------------

// Add entry
export const addEntry = async (req, res) => {
  try {
    const { cardId, date, item, amount, note } = req.body;
    const entry = await SpecialExpenseEntry.create({ cardId, date, item, amount, note });

    // Update total on card
    await SpecialExpenseCard.findByIdAndUpdate(cardId, {
      $inc: { total: Number(amount) },
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add entry" });
  }
};

// Get entries for a card
export const getEntries = async (req, res) => {
  try {
    const { cardId } = req.params;
    const entries = await SpecialExpenseEntry.find({ cardId }).sort({ date: -1 });
    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch entries" });
  }
};

// Update entry
export const updateEntry = async (req, res) => {
  try {
    const { item, amount, note } = req.body;
    const entry = await SpecialExpenseEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    const oldAmount = entry.amount;

    entry.item = item;
    entry.amount = amount;
    entry.note = note;
    await entry.save();

    // Update total on card
    const diff = amount - oldAmount;
    await SpecialExpenseCard.findByIdAndUpdate(entry.cardId, { $inc: { total: diff } });

    res.json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update entry" });
  }
};

// Delete entry
export const deleteEntry = async (req, res) => {
  try {
    const entry = await SpecialExpenseEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    // Subtract from total
    await SpecialExpenseCard.findByIdAndUpdate(entry.cardId, { $inc: { total: -entry.amount } });

    res.json({ message: "Entry deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete entry" });
  }
};
