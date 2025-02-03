const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");

// @route   POST /category
// @desc    Create a new Category
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name field is required" });
    }

    const newCategory = new Category({ name });
    await newCategory.save();

    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   GET /category
// @desc    Get all Categories
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// @route   DELETE /category/:id
// @desc    Delete a Category by ID
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
