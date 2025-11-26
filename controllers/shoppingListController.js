import ShoppingList from "../models/shoppingList.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import Expense from "../models/expenseModel.js";

export const createShoppingList = async (req, res) => {
  try {
    let { items, market } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    // Agar items string hai, to parse karo
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch (err) {
        return res.status(400).json({ message: "Invalid items format" });
      }
    }

    let receiptUrl = null;
    if (req.file?.buffer) {
      const stream = Readable.from(req.file.buffer);
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "LifeSync/shopping", resource_type: "auto" },
          (error, result) => error ? reject(error) : resolve(result)
        ).end(req.file.buffer);
      });

      receiptUrl = uploadResult.secure_url;
    }

    const shoppingList = await ShoppingList.create({
      user: req.user.id,
      items,
      market,
      receipt: receiptUrl,
    });

    res.status(201).json({ message: "Shopping list created", shoppingList });

  } catch (error) {
    console.error("Create shopping list error", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getShoppingLists = async (req, res) => {
  try {
    const { search, category, market } = req.query;
    let query = { user: req.user.id };

    if (search) query["items.description"] = { $regex: search, $options: "i" };
    if (category) query["items.category"] = category;
    if (market) query.market = market;

    const lists = await ShoppingList.find(query).sort({ createdAt: -1 });
    res.status(200).json({ lists });

  } catch (error) {
    console.error("Get shopping lists error", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getShoppingListById = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ _id: req.params.id, user: req.user.id });
    if (!list) return res.status(404).json({ message: "List not found" });

    res.status(200).json({ list });

  } catch (error) {
    console.error("Single list error", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateShoppingList = async (req, res) => {
  try {
    const { items, ...rest } = req.body;

    // Remove _id from items to avoid Mongoose conflicts
    const cleanedItems = items.map(({ _id, ...i }) => ({
      ...i,
      quantity: parseFloat(i.quantity) || 0,
      price: parseFloat(i.price) || 0
    }));

    const list = await ShoppingList.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { ...rest, items: cleanedItems },
      { new: true }
    );

    if (!list) return res.status(404).json({ message: "List not found" });

    res.status(200).json({ message: "List updated", list });
  } catch (error) {
    console.error("Update list error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const deleteShoppingList = async (req, res) => {
  try {
    const list = await ShoppingList.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!list) return res.status(404).json({ message: "List not found" });

    res.status(200).json({ message: "List deleted" });

  } catch (error) {
    console.error("Delete list error", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markListCompleted = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!list) return res.status(404).json({ message: "List not found" });

    list.completed = true;
    await list.save();

    res.status(200).json({ message: "Marked as completed", list });

  } catch (error) {
    console.error("Complete list error", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const linkToExpense = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!list) return res.status(404).json({ message: "List not found" });
    if (list.linkedExpense) return res.status(400).json({ message: "Already linked to an expense" });

    // Convert all item prices to numbers
    list.items = list.items.map(i => ({
      ...i.toObject ? i.toObject() : i,
      price: Number(i.price) || 0
    }));

    const amount = list.items.reduce((acc, item) => acc + item.price, 0);

    const expense = await Expense.create({
      user: req.user.id,
      title: list.market || "Shopping",
      category: "shopping",
      amount,
      linkedList: list._id
    });

    list.linkedExpense = expense._id;
    await list.save();

    const populatedExpense = await Expense.findById(expense._id).populate({
      path: "linkedList",
      select: "market items status createdAt"
    });

    res.status(201).json({
      message: "Linked to expense",
      expense: populatedExpense
    });

  } catch (error) {
    console.error("Link to expense error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



export const reuseShoppingList = async (req, res) => {
  try {
    const prev = await ShoppingList.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!prev) return res.status(404).json({ message: "List not found" });

    const reused = await ShoppingList.create({
      user: prev.user,
      items: prev.items.map(i => ({ ...i.toObject(), price: 0 })),
      market: prev.market,
    });

    res.status(201).json({ message: "List reused", reused });

  } catch (error) {
    console.error("Reuse list error", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateWhatsAppLink = async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ message: "Shopping list not found" });
    }

    // Calculate totalPrice properly
    let totalPrice = 0;
    list.items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      totalPrice += qty * price;
    });

    // Construct WhatsApp-friendly message
    let message = `🛒 LifeSync Shopping List\n`;
    message += `Date: ${new Date(list.createdAt).toDateString()}\n`;
    message += `Market: ${list.market || "Not specified"}\n\n`;
    message += `| Description | Quantity | Unit Price | Total |\n`;

    list.items.forEach((item, index) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const itemTotal = qty * price;
      message += `${index + 1}. ${item.description} | ${qty} | ${price} | ${itemTotal}\n`;
    });

    message += `\nTotal: ${totalPrice} PKR\n`;
    message += `Status: ${list.completed ? "✅ Completed" : "🕓 Pending"}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/?text=${encodedMessage}`;

    res.status(200).json({ success: true, whatsappLink });
  } catch (error) {
    console.error("Error generating WhatsApp link:", error);
    res.status(500).json({ message: "Error generating WhatsApp link", error: error.message });
  }
};


import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";

export const generateWhatsAppImage = async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id);
    if (!list) return res.status(404).json({ message: "Shopping list not found" });

    const width = 900;
    const lineHeight = 45;
    const cardPadding = 40;
    const canvasHeight = 300 + list.items.length * lineHeight;

    const canvas = createCanvas(width, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background full
    ctx.fillStyle = "#e9eef5";
    ctx.fillRect(0, 0, width, canvasHeight);

    // Main Card
    const cardX = 40;
    const cardY = 40;
    const cardWidth = width - 80;
    const cardHeight = canvasHeight - 80;

    ctx.fillStyle = "#fff";
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
    ctx.fill();

    // Header Gradient
    const gradient = ctx.createLinearGradient(cardX, cardY, cardX, cardY + 120);
    gradient.addColorStop(0, "#2b5876");
    gradient.addColorStop(1, "#4e4376");

    ctx.fillStyle = gradient;
    ctx.roundRect(cardX, cardY, cardWidth, 120, { tl: 20, tr: 20, br: 0, bl: 0 });
    ctx.fill();

    // Header Text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px Arial";
    ctx.fillText("LifeSync Shopping List", cardX + 30, cardY + 55);

    ctx.font = "20px Arial";
    ctx.fillText(`Date: ${new Date(list.createdAt).toDateString()}`, cardX + 30, cardY + 90);
    ctx.fillText(`Market: ${list.market || "N/A"}`, cardX + 320, cardY + 90);

    // Table Header
    let y = cardY + 160;
    ctx.fillStyle = "#2d2d2d";
    ctx.font = "bold 22px Arial";

    ctx.fillText("Item", cardX + 30, y);
    ctx.fillText("Qty", cardX + 350, y);
    ctx.fillText("Price", cardX + 450, y);
    ctx.fillText("Total", cardX + 580, y);

    // Divider Line
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 20, y + 10);
    ctx.lineTo(cardX + cardWidth - 20, y + 10);
    ctx.stroke();

    // Table Rows
    ctx.font = "18px Arial";
    y += 40;
    let totalPrice = 0;

    list.items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const itemTotal = qty * price;
      totalPrice += itemTotal;

      ctx.fillStyle = "#333";

      ctx.fillText(item.description, cardX + 30, y);
      ctx.fillText(qty.toString(), cardX + 350, y);
      ctx.fillText(price.toString(), cardX + 450, y);
      ctx.fillText(itemTotal.toString(), cardX + 580, y);

      y += lineHeight;
    });

    // Bottom Summary Box
    ctx.fillStyle = "#f7f7f7";
    ctx.roundRect(cardX + 20, y + 10, cardWidth - 40, 90, 12);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "bold 22px Arial";
    ctx.fillText(`Total: ${totalPrice} PKR`, cardX + 40, y + 55);

    ctx.font = "bold 20px Arial";
    ctx.fillStyle = list.completed ? "#0a7d28" : "#b35a00";
    ctx.fillText(
      `Status: ${list.completed ? "Completed" : "Pending"}`,
      cardX + 350,
      y + 55
    );

    // Return Base64
    const buffer = canvas.toBuffer("image/png");
    const base64Image = buffer.toString("base64");

    res.status(200).json({
      success: true,
      base64Image: `data:image/png;base64,${base64Image}`,
    });

  } catch (error) {
    console.error("Error generating shopping list image:", error);
    res.status(500).json({ message: "Error generating image", error: error.message });
  }
};

