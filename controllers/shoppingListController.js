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



// Assume you have a ShoppingList model defined (e.g., Mongoose model)
// For demonstration, I'm creating a dummy ShoppingList model structure
const ShoppingList = {
    findById: async (id) => {
        // This would fetch data from your database
        // For now, returning dummy data that matches the image
        if (id === "some-list-id") { // Replace "some-list-id" with an actual ID for testing
            return {
                _id: "some-list-id",
                createdAt: new Date(), // Current date or a specific date for consistent output
                market: "Imtiaz Super Market",
                completed: true, // Set to false for "Pending" badge
                items: [
                    { description: "Step Buckle", quantity: 150, price: 28 },
                    { description: "275 black", quantity: 1.75, price: 1050 }, // Corrected total based on the image provided
                    { description: "Gucci Small", quantity: 85, price: 100 },
                    { description: "Gucci Big", quantity: 2, price: 800 }, // Corrected total based on the image provided
                    // Add other items from your previous image if needed
                    // { description: "V Buckle", quantity: 100, price: 110 },
                    // { description: "275 Fone", quantity: 2, price: 1050 },
                    // { description: "LV Brown Ragzine", quantity: 2, price: 800 },
                ],
            };
        }
        return null; // List not found
    }
};

// Add roundRect to CanvasRenderingContext2D prototype if not already available
// This is typically needed for custom roundRect functionality with node-canvas
if (!('roundRect' in createCanvas(1, 1).getContext('2d').__proto__)) {
    (function () {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
            if (width < 2 * radius) radius = width / 2;
            if (height < 2 * radius) radius = height / 2;
            this.beginPath();
            this.moveTo(x + radius, y);
            this.arcTo(x + width, y, x + width, y + height, radius);
            this.arcTo(x + width, y + height, x, y + height, radius);
            this.arcTo(x, y + height, x, y, radius);
            this.arcTo(x, y, x + width, y, radius);
            this.closePath();
            return this;
        };
    })();
}


export const generateWhatsAppImage = async (req, res) => {
    try {
        // Assuming req.params.id is passed, e.g., from a URL like /api/whatsapp-image/some-list-id
        const list = await ShoppingList.findById(req.params.id);
        if (!list) return res.status(404).json({ message: "Shopping list not found" });

        const width = 850;
        const itemHeight = 70;
        const canvasHeight = 400 + list.items.length * itemHeight;

        const canvas = createCanvas(width, canvasHeight);
        const ctx = canvas.getContext("2d");

        // Background black
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, canvasHeight);

        // Card
        const cardX = 35;
        const cardWidth = width - 70;
        const cardHeight = canvasHeight - 70;

        ctx.fillStyle = "#111"; 
        ctx.roundRect(cardX, 35, cardWidth, cardHeight, 20);
        ctx.fill();

        // Main Header Title
        ctx.fillStyle = "#fff";
        ctx.font = "bold 34px Arial";
        ctx.fillText("LifeSync Shopping List", cardX + 30, 90);

        // Header Details
        ctx.font = "18px Arial";
        ctx.fillStyle = "#ffffffff";

        const dateString = new Date(list.createdAt).toDateString();

        ctx.fillText(`Date: ${dateString}`, cardX + 30, 130);
        ctx.fillText(`Market: ${list.market || "Not Provided"}`, cardX + 30, 160);

        // Status Badge
        const badgeColor = list.completed ? "#2ecc71" : "#f5ebc4ff";
        const badgeText = list.completed ? "Completed" : "Pending";

        ctx.fillStyle = badgeColor;
        ctx.roundRect(cardWidth - 170, 110, 130, 40, 12);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.font = "bold 18px Arial";
        // Adjust badge text position based on text width for better centering
        const badgeTextWidth = ctx.measureText(badgeText).width;
        ctx.fillText(badgeText, cardWidth - 170 + (130 - badgeTextWidth) / 2, 135);


        // Items Header Separator
        ctx.fillStyle = "#d8d3d3ff";
        ctx.fillRect(cardX + 20, 185, cardWidth - 40, 2);

        // Items List
        let y = 220;

        list.items.forEach((item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const total = qty * price;

            // Item container
            ctx.fillStyle = "#1c1c1c";
            ctx.roundRect(cardX + 20, y, cardWidth - 40, 55, 14);
            ctx.fill();

            // Title
            ctx.fillStyle = "#fff";
            ctx.font = "18px Arial";
            ctx.fillText(item.description, cardX + 60, y + 35);

            // Dot
            ctx.fillStyle = "#888";
            ctx.beginPath();
            ctx.arc(cardX + 35, y + 30, 6, 0, Math.PI * 2);
            ctx.fill();

            // Price and Qty
            ctx.fillStyle = "#6ab4ff";
            ctx.font = "16px Arial";
            ctx.textAlign = 'right'; // Align right for price and total
            ctx.fillText(`Rs ${price} x ${qty}`, cardWidth - 120, y + 25); // Adjusted X position
            ctx.fillText(`= Rs ${total}`, cardWidth - 120, y + 45); // Adjusted X position

            ctx.textAlign = 'left'; // Reset text alignment for next elements

            y += itemHeight;
        });

        // Total bill
        const totalPrice = list.items.reduce((a, b) => a + b.quantity * b.price, 0);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 24px Arial";
        ctx.fillText(`Total: Rs ${totalPrice.toFixed(1)}`, cardX + 30, y + 45); // .toFixed(1) for consistent decimal places

        // Footer
        ctx.fillStyle = "#6ab4ff";
        ctx.font = "15px Arial";
        ctx.textAlign = 'right'; // Align right for footer text
        ctx.fillText(
            "Created with LifeSync Contact: +923138624722",
            cardX + cardWidth - 30, // Adjusted X position to be truly right-aligned with the card
            y + 45
        );
        ctx.textAlign = 'left'; // Reset text alignment

        // Return the image as a base64 string
        const buffer = canvas.toBuffer("image/png");
        res.status(200).json({
            success: true,
            base64Image: `data:image/png;base64,${buffer.toString("base64")}`,
        });
    } catch (error) {
        console.error("Error generating shopping list image:", error);
        res.status(500).json({ message: "Error generating image", error: error.message });
    }
};


