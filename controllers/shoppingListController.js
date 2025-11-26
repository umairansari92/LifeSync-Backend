import ShoppingList from "../models/shoppingList.js";
import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";
import Expense from "../models/expenseModel.js";
import { createCanvas } from "canvas";


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



export const generateWhatsAppImage = async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id);
    if (!list) {
      return res.status(404).json({ message: "Shopping list not found" });
    }

    const width = 900;
    const cardPadding = 40;
    const lineHeight = 55;
    const itemHeight = list.items.length * lineHeight;

    const canvasHeight = 500 + itemHeight;
    const canvas = createCanvas(width, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, width, canvasHeight);

    // Card Background
    const cardWidth = width - 80;
    const cardHeight = canvasHeight - 80;
    const cardX = 40;
    const cardY = 40;

    ctx.fillStyle = "#1F2937";
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 25);
    ctx.fill();

    // Header
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 30px Arial";
    ctx.fillText(`🛒 ${list.market}`, cardX + 30, cardY + 60);

    ctx.font = "20px Arial";
    ctx.fillStyle = "#D1D5DB";
    ctx.fillText(
      new Date(list.createdAt).toLocaleDateString(),
      cardX + 30,
      cardY + 100
    );

    // Status badge
    ctx.fillStyle = list.completed ? "#10B981" : "#FBBF24";
    ctx.roundRect(cardX + cardWidth - 150, cardY + 40, 120, 35, 15);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "bold 18px Arial";
    ctx.fillText(
      list.completed ? "Completed" : "Pending",
      cardX + cardWidth - 130,
      cardY + 65
    );

    // Item List
    let y = cardY + 160;

    ctx.font = "18px Arial";
    ctx.fillStyle = "#FFF";

    let totalPrice = 0;

    list.items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      const itemTotal = qty * price;
      totalPrice += itemTotal;

      // Item background container
      ctx.fillStyle = "#374151";
      ctx.roundRect(cardX + 20, y, cardWidth - 40, 50, 12);
      ctx.fill();

      // Dot icon
      ctx.beginPath();
      ctx.fillStyle = "#60A5FA";
      ctx.arc(cardX + 45, y + 25, 6, 0, Math.PI * 2);
      ctx.fill();

      // Item text
      ctx.fillStyle = "#FFF";
      ctx.font = "18px Arial";
      ctx.fillText(item.description, cardX + 70, y + 32);

      // Price info
      ctx.fillStyle = "#93C5FD";
      ctx.font = "16px Arial";
      ctx.fillText(
        `Rs ${price} x ${qty}`,
        cardX + cardWidth - 260,
        y + 22
      );
      ctx.fillText(`= Rs ${itemTotal}`, cardX + cardWidth - 260, y + 42);

      y += 60;
    });

    // Total line
    ctx.strokeStyle = "#1E40AF";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cardX + 20, y + 10);
    ctx.lineTo(cardX + cardWidth - 20, y + 10);
    ctx.stroke();

    // Total price
    ctx.fillStyle = "#60A5FA";
    ctx.font = "bold 26px Arial";
    ctx.fillText(`Total: Rs ${totalPrice}`, cardX + 30, y + 60);

    // Footer branding
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "16px Arial";
    ctx.fillText(
      "Made with love by Umair Ahmed | LifeSync",
      cardX + 30,
      cardY + cardHeight - 40
    );

    ctx.fillStyle = "#60A5FA";
    ctx.font = "18px Arial";
    ctx.fillText(`Contact: +923138624722`, cardX + 30, cardY + cardHeight - 20);

    // Convert to Base64
    const buffer = canvas.toBuffer("image/png");
    const base64Image = buffer.toString("base64");

    res.status(200).json({
      success: true,
      base64Image: `data:image/png;base64,${base64Image}`,
    });
  } catch (error) {
    console.error("Error generating shopping list image:", error);
    res.status(500).json({ message: "Error generating image" });
  }
};

// Helper for rounded shapes
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
  return this;
};


