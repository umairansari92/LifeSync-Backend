import Task from "../models/taskModel.js";

// Create Task
export const createTask = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      title,
      content,
      location,
      date,
      time,
      day,
      repeat,
      category,
      priority,
    } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required" });
    }

    // Category Mapping Logic
    const categoryBooleans = {
      work: false,
      study: false,
      personal: false,
      event: false,
    };

    if (category && categoryBooleans.hasOwnProperty(category)) {
      categoryBooleans[category] = true;
    }

    const task = await Task.create({
      title,
      content,
      location: location || "",
      date: date || null,
      time: time || "",
      day: day || "",
      repeat: repeat || "none",
      category: categoryBooleans,
      priority: priority || "medium",
      user: userId,
    });

    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

// Get All Tasks for Logged in User
export const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({
      updatedAt: -1,
    });
    res.status(200).json(tasks);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

// Update Task
export const updateTask = async (req, res) => {
  try {
    console.log("BODY RECEIVED IN UPDATE:", req.body);

    if (!req.body) {
      return res.status(400).json({ message: "No body received" });
    }

    const {
      title,
      content,
      location,
      date,
      time,
      day,
      repeat,
      category,
      priority,
    } = req.body;
    const { id } = req.params;

    const task = await Task.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!task) {
      return res
        .status(404)
        .json({ message: "Task not found or unauthorized" });
    }

    if (title) task.title = title;
    if (content) task.content = content;
    if (location) task.location = location;

    if (date !== undefined) task.date = date || null;
    if (time !== undefined) task.time = time || "";
    if (day !== undefined) task.day = day || "";

    if (repeat) task.repeat = repeat;

    if (priority) task.priority = priority;

    // Convert category text to boolean object
    if (category) {
      task.category = {
        work: category === "work",
        study: category === "study",
        personal: category === "personal",
        event: category === "event",
      };
    }

    task.updatedAt = new Date();

    await task.save();

    res.status(200).json({ message: "Task updated", task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Task
export const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;

    const task = await Task.findOneAndDelete({
      _id: taskId,
      user: req.user.id,
    });

    if (!task) {
      return res
        .status(404)
        .json({ message: "Task not found or unauthorized" });
    }

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

// Mark Completed
export const markCompleted = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!task) {
      return res
        .status(404)
        .json({ message: "Task not found or unauthorized" });
    }

    // Toggle logic
    if (task.status === "completed") {
      task.status = "pending";
    } else {
      task.status = "completed";
    }

    await task.save();

    res.json({
      message: `Task marked as ${task.status}`,
      task,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get tasks by category
export const getTasksByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    if (!["work", "study", "personal", "event"].includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const tasks = await Task.find({
      user: req.user.id,
      [`category.${category}`]: true,
    }).sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
